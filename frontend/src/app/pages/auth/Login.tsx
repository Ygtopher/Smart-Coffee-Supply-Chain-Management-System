import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Coffee, Eye, EyeOff, ChevronRight, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import LanguageToggle from '../../components/LanguageToggle';

export default function Login() {
  const { loginWithCredentials, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const result = await loginWithCredentials(email, password);
    setLoading(false);

    if (result.success) {
      if (result.mfaRequired) {
        toast.info('MFA verification required for security.');
        // Navigate to MFA page with temp user data
        navigate('/mfa-verification', { state: { tempUser: result.tempUser } });
      } else {
        toast.success('Login successful!');
        navigate('/dashboard'); // App layout automatically directs by role
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C3829] via-[#1E3F2E] to-[#2D5A40] flex items-center justify-center p-4">
      <LanguageToggle variant="floating" />
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 75%, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-6 relative z-10">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col justify-center text-white p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center">
              <Coffee className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CoffeeSCM</h1>
              <p className="text-green-300 text-sm">IMPEXCOR Ltd</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">Smart Coffee<br />Supply Chain<br />Management</h2>
          <p className="text-green-200 text-sm leading-relaxed mb-8">
            Digitizing Rwanda's coffee supply chain — from farm to export. Track every bean, every payment, every shipment.
          </p>
          <div className="space-y-3">
            {['Complete farm-to-export traceability', 'Real-time payments for farmers', 'Quality certification management', 'Multi-role access control'].map(f => (
              <div key={f} className="flex items-center gap-2 text-green-200 text-sm">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3 h-3 text-amber-400" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1C3829] px-6 py-5 flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">CoffeeSCM</p>
              <p className="text-green-300 text-xs">IMPEXCOR Ltd</p>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-stone-800">Welcome back</h2>
              <p className="text-stone-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-stone-50 pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-stone-300 accent-emerald-600" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium">Forgot password?</Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1C3829] hover:bg-[#2D5A40] text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="text-center text-sm text-stone-500">
              New farmer?{' '}
              <Link to="/register" className="text-emerald-700 font-medium hover:underline">Register here</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
