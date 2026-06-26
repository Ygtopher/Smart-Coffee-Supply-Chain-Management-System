import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Coffee, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../../services/api';
import LanguageToggle from '../../components/LanguageToggle';

const CERTIFICATIONS = ['Organic', 'Fairtrade', 'Rainforest Alliance', 'UTZ', 'Café Practices', 'Rwanda Specialty Coffee'];
const COFFEE_VARIETIES = ['Red Bourbon', 'Bourbon', 'Jackson', 'Mibirizi', 'Typica', 'Gesha'];
const RWANDA_LOCATIONS: Record<string, Record<string, string[]>> = {
  'Kigali City': {
    Gasabo: ['Kacyiru', 'Kimihurura', 'Kimironko', 'Kinyinya', 'Ndera', 'Remera', 'Rusororo'],
    Kicukiro: ['Gahanga', 'Gatenga', 'Gikondo', 'Kagarama', 'Kanombe', 'Kicukiro', 'Nyarugunga'],
    Nyarugenge: ['Gitega', 'Kigali', 'Kimisagara', 'Muhima', 'Nyakabanda', 'Nyamirambo', 'Nyarugenge'],
  },
  'Eastern Province': {
    Bugesera: ['Gashora', 'Juru', 'Mayange', 'Ntarama', 'Nyamata', 'Ruhuha', 'Rweru'],
    Gatsibo: ['Gatsibo', 'Kabarore', 'Kiramuruzi', 'Kiziguro', 'Muhura', 'Ngarama', 'Rwimbogo'],
    Kayonza: ['Gahini', 'Kabarondo', 'Mukarange', 'Murama', 'Murundi', 'Rukara', 'Rwinkwavu'],
    Kirehe: ['Gatore', 'Kigarama', 'Kigina', 'Kirehe', 'Mahama', 'Nasho', 'Nyarubuye'],
    Ngoma: ['Gashanda', 'Kazo', 'Kibungo', 'Mugesera', 'Mutenderi', 'Rukumberi', 'Zaza'],
    Nyagatare: ['Karama', 'Karangazi', 'Matimba', 'Mukama', 'Nyagatare', 'Rukomo', 'Tabagwe'],
    Rwamagana: ['Fumbwe', 'Gahengeri', 'Kigabiro', 'Muhazi', 'Muyumbu', 'Mwulire', 'Rubona'],
  },
  'Northern Province': {
    Burera: ['Butaro', 'Cyanika', 'Gahunga', 'Kinoni', 'Kinyababa', 'Nemba', 'Rugarama'],
    Gakenke: ['Gakenke', 'Gashenyi', 'Janja', 'Kamubuga', 'Kivuruga', 'Muhondo', 'Ruli'],
    Gicumbi: ['Byumba', 'Cyumba', 'Giti', 'Kaniga', 'Miyove', 'Mukarange', 'Rukomo'],
    Musanze: ['Busogo', 'Cyuve', 'Gacaca', 'Kinigi', 'Muhoza', 'Musanze', 'Shingiro'],
    Rulindo: ['Base', 'Bushoki', 'Buyoga', 'Kinihira', 'Kisaro', 'Shyorongi', 'Tumba'],
  },
  'Southern Province': {
    Gisagara: ['Gikonko', 'Gishubi', 'Kansi', 'Kigembe', 'Mamba', 'Muganza', 'Save'],
    Huye: ['Huye', 'Karama', 'Kigoma', 'Kinazi', 'Maraba', 'Ngoma', 'Tumba'],
    Kamonyi: ['Gacurabwenge', 'Kayenzi', 'Mugina', 'Musambira', 'Rukoma', 'Runda'],
    Muhanga: ['Cyeza', 'Kabacuzi', 'Kibangu', 'Muhanga', 'Nyamabuye', 'Shyogwe'],
    Nyamagabe: ['Gasaka', 'Gatare', 'Kaduha', 'Kitabi', 'Mbazi', 'Mugano', 'Tare'],
    Nyanza: ['Busasamana', 'Busoro', 'Kibirizi', 'Kigoma', 'Mukingo', 'Ntyazo'],
    Nyaruguru: ['Busanze', 'Kibeho', 'Kivu', 'Mata', 'Munini', 'Ruheru', 'Rusenge'],
    Ruhango: ['Bweramana', 'Byimana', 'Kabagari', 'Kinazi', 'Mbuye', 'Ruhango'],
  },
  'Western Province': {
    Karongi: ['Bwishyura', 'Gashari', 'Gitesi', 'Mubuga', 'Rubengera', 'Rugabano', 'Twumba'],
    Ngororero: ['Gatumba', 'Kabaya', 'Kavumu', 'Muhanda', 'Ngororero', 'Nyange', 'Sovu'],
    Nyabihu: ['Bigogwe', 'Jenda', 'Karago', 'Mukamira', 'Rambura', 'Rugera', 'Shyira'],
    Nyamasheke: ['Bushekeri', 'Bushenge', 'Kagano', 'Kanjongo', 'Karambi', 'Rangiro', 'Shangi'],
    Rubavu: ['Busasamana', 'Gisenyi', 'Kanama', 'Kanzenze', 'Nyamyumba', 'Rubavu', 'Rugerero'],
    Rusizi: ['Bugarama', 'Giheke', 'Gihundwe', 'Kamembe', 'Muganza', 'Nkanka', 'Rwimbogo'],
    Rutsiro: ['Boneza', 'Gihango', 'Kigeyo', 'Kivumu', 'Mukura', 'Musasa', 'Rusebeya'],
  },
};

const InputField = ({ label, value, onChange, type = 'text', placeholder = '', required = false }: any) => (
  <div>
    <label className="block text-sm font-medium text-stone-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
    />
  </div>
);

export default function Register() {
  const { setPendingFarmer } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    supplierType: 'FARMER',
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
    region: '', zone: '', woreda: '', kebele: '',
    farmSize: '', numberOfFarms: '', variety: 'Red Bourbon', varieties: ['Red Bourbon'] as string[],
    certifications: [] as string[], notes: '',
    coordinates: '',
    cooperativeName: '',
    agreeTerms: false,
  });

  const update = (field: string, value: string | boolean | string[]) =>
    setForm(f => {
      if (field === 'region') return { ...f, region: String(value), zone: '', woreda: '', kebele: '' };
      if (field === 'zone') return { ...f, zone: String(value), woreda: '', kebele: '' };
      return { ...f, [field]: value };
    });

  const registrationDistricts = form.region ? Object.keys(RWANDA_LOCATIONS[form.region] || {}) : [];
  const registrationCells = form.region && form.zone ? (RWANDA_LOCATIONS[form.region]?.[form.zone] || []) : [];

  const toggleCert = (cert: string) => {
    const current = form.certifications;
    update('certifications', current.includes(cert) ? current.filter(c => c !== cert) : [...current, cert]);
  };

  const handleNext = () => {
    if (step === 1) {
      if (form.supplierType === 'COOPERATIVE' && !form.cooperativeName.trim()) {
        toast.error('Please enter the cooperative name');
        return;
      }
      if (form.supplierType === 'FARMER' && (!form.firstName || !form.lastName)) {
        toast.error('Please fill in the farmer name');
        return;
      }
      if (!form.email || !form.phone) {
        toast.error('Please fill in email and phone number');
        return;
      }
      if (!form.password || form.password !== form.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
    }
    if (step === 2) {
      if (!form.region || !form.zone || !form.kebele) {
        toast.error('Please select province, district, and cell');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    toast.loading('Capturing coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        update('coordinates', coords);
        toast.dismiss();
        toast.success(`Captured: ${coords}`);
      },
      (err) => {
        toast.dismiss();
        toast.error(`Geolocation error: ${err.message}`);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agreeTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }
    setLoading(true);
    try {
      await apiService.register({
        ...form,
        country: 'Rwanda',
        firstName: form.supplierType === 'COOPERATIVE' ? form.cooperativeName : form.firstName,
        lastName: form.supplierType === 'COOPERATIVE' ? '' : form.lastName,
        variety: form.supplierType === 'COOPERATIVE' ? '' : form.variety,
      });
      setPendingFarmer();
      toast.success('Registration submitted! Waiting for admin approval.');
      navigate('/waiting-approval');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C3829] to-[#2D5A40] flex items-center justify-center p-4">
      <LanguageToggle variant="floating" />
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#1C3829] px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Coffee className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Supplier Registration</p>
            <p className="text-green-300 text-xs">CoffeeSCM — IMPEXCOR Ltd</p>
          </div>
          <Link to="/login" className="text-green-300 hover:text-white flex items-center gap-1 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Login
          </Link>
        </div>

        {/* Progress */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-1">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  step > s ? 'bg-emerald-600 text-white' : step === s ? 'bg-[#1C3829] text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                <div className={`flex-1 h-1 rounded-full ${s < 3 ? (step > s ? 'bg-emerald-600' : 'bg-stone-100') : 'hidden'}`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-stone-400 mt-1">
            <span>Province</span>
            <span>District</span>
            <span>Sector / Cell</span>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-semibold text-stone-800">{form.supplierType === 'COOPERATIVE' ? 'Cooperative Account' : 'Personal Information'}</h3>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Account Type <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['FARMER', 'Farmer / Big Farm'],
                    ['COOPERATIVE', 'Cooperative Supplier'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update('supplierType', value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold ${form.supplierType === value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-stone-200 bg-stone-50 text-stone-600'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {form.supplierType === 'COOPERATIVE' ? (
                <InputField label="Cooperative Name" value={form.cooperativeName} onChange={(v: string) => update('cooperativeName', v)} required placeholder="e.g. Abahizi Coffee Cooperative" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="First Name" value={form.firstName} onChange={(v: string) => update('firstName', v)} required placeholder="Christophe" />
                  <InputField label="Last Name" value={form.lastName} onChange={(v: string) => update('lastName', v)} required placeholder="Nsengiyumva" />
                </div>
              )}
              <InputField label="Email Address" type="email" value={form.email} onChange={(v: string) => update('email', v)} required placeholder="abebe@gmail.com" />
              <InputField label="Phone Number" type="tel" value={form.phone} onChange={(v: string) => update('phone', v)} required placeholder="+250 788 XXX XXX" />
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    placeholder="Create a secure password"
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <InputField label="Confirm Password" type="password" value={form.confirmPassword} onChange={(v: string) => update('confirmPassword', v)} required placeholder="Repeat password" />
            </div>
          )}

          {/* Step 2: Farm Location */}
          {step === 2 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-semibold text-stone-800">Farm Location</h3>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Country</label>
                <input
                  value="Rwanda"
                  disabled
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-100 text-stone-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Province <span className="text-red-500">*</span></label>
                <select
                  value={form.region}
                  onChange={e => update('region', e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                >
                  <option value="">Select province...</option>
                  {Object.keys(RWANDA_LOCATIONS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">District <span className="text-red-500">*</span></label>
                <select
                  value={form.zone}
                  onChange={e => update('zone', e.target.value)}
                  disabled={!form.region}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 disabled:bg-stone-100 disabled:text-stone-400"
                >
                  <option value="">{form.region ? 'Select district...' : 'Choose province first'}</option>
                  {registrationDistricts.map(district => <option key={district} value={district}>{district}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Cell <span className="text-red-500">*</span></label>
                <select
                  value={form.kebele}
                  onChange={e => update('kebele', e.target.value)}
                  disabled={!form.zone}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 disabled:bg-stone-100 disabled:text-stone-400"
                >
                  <option value="">{form.zone ? 'Select cell...' : 'Choose district first'}</option>
                  {registrationCells.map(cell => <option key={cell} value={cell}>{cell}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">GPS Coordinates</label>
                <input
                  value={form.coordinates}
                  onChange={e => update('coordinates', e.target.value)}
                  placeholder="-1.933775, 30.132433"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 mb-2"
                />
                <button 
                  type="button" 
                  onClick={handleCaptureGps}
                  className="flex items-center gap-2 w-full px-4 py-2.5 border border-dashed border-stone-300 rounded-lg text-sm text-stone-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Capture GPS coordinates from this device
                </button>
                <p className="mt-1 text-xs text-stone-400">You can type the coordinates manually or capture them from GPS.</p>
              </div>
            </div>
          )}

          {/* Step 3: Farm Details */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 mt-4">
                <h3 className="font-semibold text-stone-800">{form.supplierType === 'COOPERATIVE' ? 'Cooperative Production Details' : 'Farm Details'}</h3>
                <InputField label={form.supplierType === 'COOPERATIVE' ? 'Total Production Area (ha)' : 'Farm Size (ha)'} type="number" value={form.farmSize} onChange={(v: string) => update('farmSize', v)} placeholder="e.g., 2.5" />
                {form.supplierType === 'COOPERATIVE' && (
                  <InputField label="Number of Farms in Cooperative" type="number" value={form.numberOfFarms} onChange={(v: string) => update('numberOfFarms', v)} placeholder="e.g., 45" />
                )}
                {form.supplierType === 'FARMER' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Coffee Variety</label>
                    <select
                      value={form.variety}
                      onChange={e => update('variety', e.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                    >
                      {COFFEE_VARIETIES.map(variety => <option key={variety}>{variety}</option>)}
                    </select>
                </div>
                )}
                {form.supplierType === 'FARMER' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Certifications (if any)</label>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATIONS.map(cert => (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => toggleCert(cert)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          form.certifications.includes(cert)
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-stone-200 text-stone-600 hover:border-emerald-300'
                        }`}
                      >
                        {cert}
                      </button>
                    ))}
                  </div>
                </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Additional Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => update('notes', e.target.value)}
                    placeholder="Any additional information about your farm..."
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50 h-20 resize-none"
                  />
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreeTerms}
                    onChange={e => update('agreeTerms', e.target.checked)}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <span className="text-sm text-stone-600">
                    I agree to the{' '}
                    <span className="text-emerald-700 font-medium cursor-pointer hover:underline">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-emerald-700 font-medium cursor-pointer hover:underline">Privacy Policy</span>
                    . I confirm all information provided is accurate.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1C3829] hover:bg-[#2D5A40] text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </form>
          )}

          {/* Navigation Buttons */}
          {step < 3 && (
            <div className="flex justify-between mt-6">
              {step > 1 ? (
                <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 px-4 py-2 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40] transition-colors"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
