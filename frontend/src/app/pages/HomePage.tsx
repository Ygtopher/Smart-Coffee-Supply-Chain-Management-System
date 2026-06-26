import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  ArrowRight,
  CheckCircle2,
  Coffee,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Send,
  ShieldCheck,
  Ship,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../services/api';

const fallbackCoffeeGrades = [
  { value: 'Premium', label: 'Premium', detail: 'High-scoring export lots that meet premium quality thresholds' },
  { value: 'Standard', label: 'Standard', detail: 'Approved export-grade coffee for reliable commercial orders' },
  { value: 'Low', label: 'Low', detail: 'Lower-tier coffee normally reviewed before commercial matching' },
];

const fallbackCoffeeVarieties = ['Red Bourbon', 'Bourbon', 'Jackson', 'Mibirizi', 'Typica', 'Gesha'];
const packagingOptions = ['60 kg jute bags', '30 kg bags', 'GrainPro lined bags', 'Sample pack', 'Custom packaging'];

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [orderStep, setOrderStep] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [coffeeVarieties, setCoffeeVarieties] = useState<string[]>(fallbackCoffeeVarieties);
  const [coffeeGrades, setCoffeeGrades] = useState(fallbackCoffeeGrades);
  const [trackingForm, setTrackingForm] = useState({ referenceCode: '', email: '', message: '' });
  const [form, setForm] = useState({
    customerName: '',
    companyName: '',
    email: '',
    phone: '',
    requestType: 'ORDER',
    coffeeType: fallbackCoffeeVarieties[0],
    grade: fallbackCoffeeGrades[0].value,
    weight: '1000',
    sampleQuantityGrams: '500',
    samplePurpose: 'Buyer cupping evaluation',
    minCuppingScore: '85',
    maxMoisture: '12',
    defectTolerance: '5 defects max',
    packaging: '60 kg jute bags',
    specialRequirements: '',
    message: '',
  });

  const selectedGrade = useMemo(
    () => coffeeGrades.find(grade => grade.value === form.grade) || coffeeGrades[0],
    [form.grade]
  );

  useEffect(() => {
    apiService.getCustomerCoffeeVarieties()
      .then(response => {
        const apiVarieties = Array.isArray(response.data) ? response.data : [];
        // Always keep the full fallback list; merge in any extra varieties from the API
        const varieties = [...new Set([...fallbackCoffeeVarieties, ...apiVarieties])];
        setCoffeeVarieties(varieties);
        setForm(current => varieties.includes(current.coffeeType) ? current : { ...current, coffeeType: varieties[0] });
      })
      .catch(() => setCoffeeVarieties(fallbackCoffeeVarieties));

    apiService.getCustomerCoffeeGrades()
      .then(response => {
        const grades = response.data?.length >= 2 ? response.data : fallbackCoffeeGrades;
        setCoffeeGrades(grades);
        setForm(current => grades.some((grade: any) => grade.value === current.grade) ? current : { ...current, grade: grades[0].value });
      })
      .catch(() => setCoffeeGrades(fallbackCoffeeGrades));
  }, []);

  const update = (field: string, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const defaultForm = {
    customerName: '',
    companyName: '',
    email: '',
    phone: '',
    requestType: 'ORDER',
    coffeeType: coffeeVarieties[0] || fallbackCoffeeVarieties[0],
    grade: coffeeGrades[0]?.value || fallbackCoffeeGrades[0].value,
    weight: '1000',
    sampleQuantityGrams: '500',
    samplePurpose: 'Buyer cupping evaluation',
    minCuppingScore: '85',
    maxMoisture: '12',
    defectTolerance: '5 defects max',
    packaging: '60 kg jute bags',
    specialRequirements: '',
    message: '',
  };

  const submitOrder = async () => {
    const weight = Number(form.weight);
    if (!form.customerName || !form.email || !form.grade || !weight) {
      toast.error('Please complete the required order fields');
      return;
    }
    if (weight < 100) {
      toast.error('Minimum export inquiry quantity is 100 kg');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.createCustomerOrder({
        customerName: form.customerName,
        companyName: form.companyName,
        email: form.email,
        phone: form.phone,
        requestType: 'ORDER',
        grade: form.grade,
        weight: weight,
        qualitySpecs: {
          coffeeType: form.coffeeType,
          minCuppingScore: Number(form.minCuppingScore || 0),
          maxMoisture: Number(form.maxMoisture || 0),
          defectTolerance: form.defectTolerance,
          requestType: 'ORDER',
        },
        shipmentRequirements: {
          packaging: form.packaging,
        },
        message: [form.message, form.specialRequirements ? `Special requirements: ${form.specialRequirements}` : null].filter(Boolean).join('\n'),
      });
      setSubmittedOrder(response.data);
      setTrackingForm(current => ({ ...current, referenceCode: response.data.referenceCode || '', email: form.email }));
      toast.success('Order request sent to IMPEXCOR export team');
      // Reset form and step after successful submission
      setForm(defaultForm);
      setOrderStep(1);
      setShowConfirm(false);
    } catch (error: any) {
      const cached = {
        ...form,
        weight,
        requestedAt: new Date().toISOString(),
        status: 'Saved locally',
      };
      const existing = JSON.parse(localStorage.getItem('customer_order_drafts') || '[]');
      localStorage.setItem('customer_order_drafts', JSON.stringify([cached, ...existing]));
      toast.error(error?.message || 'Could not reach the server. Order draft saved locally.');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClick = () => {
    const weight = Number(form.weight);
    if (!form.customerName || !form.email || !form.grade || !weight) {
      toast.error('Please complete the required order fields');
      return;
    }
    if (weight < 100) {
      toast.error('Minimum export inquiry quantity is 100 kg');
      return;
    }
    setShowConfirm(true);
  };

  const nextStep = () => {
    if (orderStep === 1 && (!form.customerName || !form.email)) {
      toast.error('Add your name and email first');
      return;
    }
    if (orderStep === 2 && (!form.weight || Number(form.weight) < 100)) {
      toast.error('Minimum export inquiry quantity is 100 kg');
      return;
    }
    setOrderStep(step => Math.min(3, step + 1));
  };

  const trackOrder = async () => {
    if (!trackingForm.referenceCode || !trackingForm.email) {
      toast.error('Enter your order reference and email');
      return;
    }
    setTrackingLoading(true);
    try {
      const response = await apiService.getCustomerOrder(trackingForm.referenceCode, trackingForm.email);
      setTrackedOrder(response.data);
    } catch (error: any) {
      toast.error(error?.message || 'Order not found');
      setTrackedOrder(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const sendCustomerMessage = async () => {
    if (!trackedOrder || !trackingForm.message) return;
    try {
      await apiService.createCustomerOrderMessage(trackedOrder.referenceCode, {
        email: trackingForm.email,
        senderName: form.customerName || trackedOrder.buyer,
        message: trackingForm.message,
      });
      toast.success('Message sent to IMPEXCOR export team');
      setTrackingForm(current => ({ ...current, message: '' }));
      const response = await apiService.getCustomerOrder(trackedOrder.referenceCode, trackingForm.email);
      setTrackedOrder(response.data);
    } catch (error: any) {
      toast.error(error?.message || 'Could not send message');
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f2ec] text-stone-900">
      <header className="fixed top-0 inset-x-0 z-30 border-b border-white/20 bg-[#102619]/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">CoffeeSCM</p>
              <p className="text-xs text-emerald-300">IMPEXCOR Ltd</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-emerald-50">
            <a href="#coffee" className="hover:text-amber-300">Coffee</a>
            <a href="#order" className="hover:text-amber-300">Order</a>
            <a href="#tracking" className="hover:text-amber-300">Track Order</a>
            <a href="#traceability" className="hover:text-amber-300">Traceability</a>
            <a href="#contact" className="hover:text-amber-300">Contact</a>
          </nav>
          <Link to="/login" className="px-4 py-2 rounded-lg bg-white text-[#102619] text-sm font-semibold hover:bg-amber-100">
            Staff Login
          </Link>
        </div>
      </header>

      <section
        className="min-h-screen pt-24 pb-10 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(16,38,25,0.92), rgba(16,38,25,0.68), rgba(16,38,25,0.28)), url('https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1800&q=80')",
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f6f2ec] to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-[1fr_480px] gap-10 items-center">
          <div className="text-white max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Rwandan traceable coffee for export buyers
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
              Order verified coffee directly from IMPEXCOR supply chain.
            </h1>
            <p className="mt-5 text-lg text-emerald-50 max-w-2xl">
              Request export lots, share buyer requirements, and let the IMPEXCOR team match your order with quality-assessed, traceable coffee batches.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#order" className="px-5 py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 inline-flex items-center gap-2">
                Make an Order <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#traceability" className="px-5 py-3 rounded-lg bg-white/10 border border-white/25 text-white font-semibold hover:bg-white/15">
                View Supply Chain
              </a>
            </div>
            <div className="mt-10 grid sm:grid-cols-3 gap-4 max-w-2xl">
              {[
                ['Verified Origin', 'Farm, cooperative, washing station, and QR traceability'],
                ['Quality Ready', 'Cupping, defects, moisture, and certificates tracked'],
                ['Export Workflow', 'Documents, shipment, customs, and POD coordination'],
              ].map(([title, copy]) => (
                <div key={title} className="border-l-2 border-amber-400 pl-4">
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-emerald-100 mt-1">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="order" className="bg-white rounded-xl border border-stone-200 shadow-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase text-amber-700">Customer Order Desk</p>
                <h2 className="text-2xl font-bold text-stone-900 mt-1">Request Coffee</h2>
                <p className="text-sm text-stone-500 mt-1">Step {orderStep} of 3. Ask for a full export order.</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Send className="w-5 h-5 text-emerald-700" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {['Buyer', 'Coffee', 'Requirements'].map((label, index) => (
                <button key={label} type="button" onClick={() => setOrderStep(index + 1)}
                  className={`py-2 rounded-lg text-xs font-semibold ${orderStep === index + 1 ? 'bg-[#102619] text-white' : 'bg-stone-100 text-stone-500'}`}>
                  {label}
                </button>
              ))}
            </div>

            {orderStep === 1 && (
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="font-medium text-stone-700">Contact Person *</span>
                  <input required value={form.customerName} onChange={e => update('customerName', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Buyer contact name" />
                </label>
                <label className="text-sm">
                  <span className="font-medium text-stone-700">Buyer / Company Name</span>
                  <input value={form.companyName} onChange={e => update('companyName', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Company name" />
                </label>
                <label className="text-sm">
                  <span className="font-medium text-stone-700">Email *</span>
                  <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="buyer@company.com" />
                </label>
                <label className="text-sm">
                  <span className="font-medium text-stone-700">Phone / WhatsApp</span>
                  <input value={form.phone} onChange={e => update('phone', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="+250 7XX XXX XXX" />
                </label>
              </div>
            )}

            {orderStep === 2 && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-sm">
                    <span className="font-medium text-stone-700">Coffee Variety</span>
                    <select value={form.coffeeType} onChange={e => update('coffeeType', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      {coffeeVarieties.map(type => <option key={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="font-medium text-stone-700">Quantity kg *</span>
                    <input required min={100} type="number" value={form.weight} onChange={e => update('weight', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-700 mb-2">Coffee grade *</p>
                  <div className="grid gap-2">
                    {coffeeGrades.map(grade => (
                      <label key={grade.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${form.grade === grade.value ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white hover:bg-stone-50'}`}>
                        <input type="radio" name="grade" value={grade.value} checked={form.grade === grade.value} onChange={e => update('grade', e.target.value)} className="mt-1 accent-emerald-700" />
                        <span>
                          <span className="block text-sm font-semibold text-stone-800">{grade.label}</span>
                          <span className="block text-xs text-stone-500">{grade.detail}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {orderStep === 3 && (
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="font-medium text-stone-700">Minimum cupping score</span>
                  <input type="number" value={form.minCuppingScore} onChange={e => update('minCuppingScore', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>
                <label className="text-sm">
                  <span className="font-medium text-stone-700">Max moisture %</span>
                  <input type="number" value={form.maxMoisture} onChange={e => update('maxMoisture', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="font-medium text-stone-700">Defect tolerance</span>
                  <input value={form.defectTolerance} onChange={e => update('defectTolerance', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Example: max 5 defects, no mold, no foreign matter" />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="font-medium text-stone-700">Packaging</span>
                  <select value={form.packaging} onChange={e => update('packaging', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {packagingOptions.map(option => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-stone-700">Special Requirements</span>
                  <textarea value={form.specialRequirements} onChange={e => update('specialRequirements', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 min-h-[82px] focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Roasting profile, contract terms, buyer-specific quality rules..." />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="font-medium text-stone-700">Order Notes</span>
                  <textarea value={form.message} onChange={e => update('message', e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-stone-50 min-h-[82px] focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Any extra message for the IMPEXCOR export team..." />
                </label>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-stone-50 border border-stone-200 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-stone-500">Selected request</p>
                <p className="text-sm font-semibold text-stone-800">
                  {`${Number(form.weight || 0).toLocaleString()} kg order`} - {selectedGrade.label}
                </p>
              </div>
              <Package className="w-5 h-5 text-amber-600" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" disabled={orderStep === 1} onClick={() => setOrderStep(step => Math.max(1, step - 1))} className="px-5 py-3 rounded-lg border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 disabled:opacity-40">
                Back
              </button>
              {orderStep < 3 ? (
                <button type="button" onClick={nextStep} className="px-5 py-3 rounded-lg bg-[#102619] text-white font-semibold hover:bg-[#1d3f2b] flex items-center justify-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmitClick}
                  className="px-5 py-3 rounded-lg bg-[#102619] text-white font-semibold hover:bg-[#1d3f2b] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Sending request...' : 'Submit Order Request'}
                </button>
              )}
            </div>
            {submittedOrder && (
              <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                <span>Order request received. Reference: {submittedOrder.referenceCode || submittedOrder.orderId?.slice(0, 8)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <main>
        <section id="coffee" className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
            <div>
              <p className="text-sm font-semibold uppercase text-amber-700">Export offer</p>
              <h2 className="text-3xl font-bold mt-2">Coffee matched to buyer requirements.</h2>
              <p className="text-stone-600 mt-4 leading-relaxed">
                Customers can request specialty and commercial lots, then the exporter team confirms availability from approved inventory, quality results, and shipment schedules.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {coffeeGrades.map(grade => (
                <div key={grade.value} className="bg-white rounded-lg border border-stone-200 p-4 shadow-sm">
                  <Coffee className="w-5 h-5 text-amber-600 mb-4" />
                  <p className="font-semibold text-stone-900">{grade.label}</p>
                  <p className="text-sm text-stone-500 mt-2">{grade.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tracking" className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="p-6 bg-[#102619] text-white">
                <p className="text-sm font-semibold uppercase text-amber-300">Order tracking</p>
                <h2 className="text-2xl font-bold mt-2">Track your request by reference.</h2>
                <p className="text-sm text-emerald-100 mt-3">
                  After submitting an order, use the reference code and email to see status updates and send messages to the export team.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  <input value={trackingForm.referenceCode} onChange={e => setTrackingForm(f => ({ ...f, referenceCode: e.target.value }))} placeholder="ORD-2026-123456" className="px-3 py-2.5 rounded-lg text-stone-900 text-sm" />
                  <input value={trackingForm.email} onChange={e => setTrackingForm(f => ({ ...f, email: e.target.value }))} placeholder="buyer@company.com" className="px-3 py-2.5 rounded-lg text-stone-900 text-sm" />
                </div>
                <button onClick={trackOrder} disabled={trackingLoading} className="mt-3 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-60 flex items-center gap-2">
                  {trackingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Track Order
                </button>
              </div>
              <div className="p-6">
                {!trackedOrder ? (
                  <div className="h-full min-h-[220px] flex items-center justify-center text-center text-stone-400 text-sm">
                    Submit or track an order to see status, quote notes, and messages here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-stone-500">Reference</p>
                        <p className="text-lg font-bold text-stone-900">{trackedOrder.referenceCode}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">{trackedOrder.status}</span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3 text-sm">
                      <div className="bg-stone-50 rounded-lg p-3"><p className="text-xs text-stone-500">Coffee</p><p className="font-semibold">{trackedOrder.grade}</p></div>
                      <div className="bg-stone-50 rounded-lg p-3"><p className="text-xs text-stone-500">Weight</p><p className="font-semibold">{Number(trackedOrder.weight).toLocaleString()} kg</p></div>
                      <div className="bg-stone-50 rounded-lg p-3"><p className="text-xs text-stone-500">Quote</p><p className="font-semibold">{Number(trackedOrder.pricePerKg) > 0 ? `USD ${trackedOrder.pricePerKg}/kg` : 'Under review'}</p></div>
                    </div>
                    {trackedOrder.quoteNotes && (
                      <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm text-amber-900">
                        {trackedOrder.quoteNotes}
                      </div>
                    )}
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(trackedOrder.messages || []).map((msg: any) => (
                        <div key={msg.messageId} className={`rounded-lg p-3 text-sm ${msg.senderType === 'EXPORTER' ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-50 text-stone-700'}`}>
                          <p className="font-semibold">{msg.senderName}</p>
                          <p className="mt-1">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={trackingForm.message} onChange={e => setTrackingForm(f => ({ ...f, message: e.target.value }))} placeholder="Write a message to the export team" className="flex-1 px-3 py-2.5 rounded-lg border border-stone-200 text-sm" />
                      <button onClick={sendCustomerMessage} className="px-4 py-2.5 rounded-lg bg-[#102619] text-white text-sm font-semibold">Send</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="traceability" className="bg-white border-y border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                [MapPin, 'Verified Origin', 'Farm and cooperative origin captured before batching.'],
                [ShieldCheck, 'Quality Evidence', 'Cupping scores, moisture, defects, and certificates support export decisions.'],
                [Ship, 'Shipment Ready', 'Logistics team manages containers, customs, documents, and POD.'],
                [Globe2, 'Buyer Visibility', 'Export orders stay connected to traceable supply-chain records.'],
              ].map(([Icon, title, copy]: any) => (
                <div key={title} className="p-4 border border-stone-200 rounded-lg">
                  <Icon className="w-6 h-6 text-emerald-700 mb-4" />
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-stone-500 mt-2">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              [Mail, 'Email', 'exports@impexcor.rw'],
              [Phone, 'Phone', '+250 788 000 000'],
              [MapPin, 'Office', 'Kigali, Rwanda'],
            ].map(([Icon, label, value]: any) => (
              <div key={label} className="bg-[#102619] text-white rounded-lg p-5">
                <Icon className="w-5 h-5 text-amber-300 mb-4" />
                <p className="text-sm text-emerald-200">{label}</p>
                <p className="font-semibold mt-1">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Order Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mx-auto mb-4">
              <Send className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 text-center">Confirm Order Request</h3>
            <p className="text-sm text-stone-500 text-center mt-2">
              You are about to submit an order request to the IMPEXCOR export team. Do you want to proceed?
            </p>

            <div className="mt-5 rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Buyer</span>
                <span className="font-semibold text-stone-800">{form.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Coffee</span>
                <span className="font-semibold text-stone-800">{form.coffeeType} — {selectedGrade.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Quantity</span>
                <span className="font-semibold text-stone-800">{Number(form.weight || 0).toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Packaging</span>
                <span className="font-semibold text-stone-800">{form.packaging}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-3 rounded-xl border border-stone-200 text-stone-700 font-semibold hover:bg-stone-50 transition-colors"
              >
                No, Go Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={submitOrder}
                className="px-4 py-3 rounded-xl bg-[#102619] text-white font-semibold hover:bg-[#1d3f2b] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {loading ? 'Sending...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
