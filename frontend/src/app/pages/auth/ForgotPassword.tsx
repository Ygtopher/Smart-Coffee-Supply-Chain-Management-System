import { useState } from 'react';
import { Link } from 'react-router';
import { Coffee, ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import LanguageToggle from '../../components/LanguageToggle';
import apiService from '../../services/api';

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email address'); return; }
    setLoading(true);
    try {
      await apiService.forgotPassword(email.trim().toLowerCase());
      setStep('sent');
      toast.success('Password reset request sent');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C3829] to-[#2D5A40] flex items-center justify-center p-4">
      <LanguageToggle variant="floating" />
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1C3829] px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Reset Password</p>
              <p className="text-green-300 text-xs">CoffeeSCM — IMPEXCOR Ltd</p>
            </div>
            <Link to="/" className="text-green-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <div className="p-6">
            {step === 'email' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-800">Forgot your password?</h2>
                  <p className="text-stone-500 text-sm mt-1">
                    Enter your registered email and we'll send you a reset link.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1C3829] hover:bg-[#2D5A40] text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-stone-800 mb-2">Check your email!</h2>
                <p className="text-stone-500 text-sm mb-1">We've sent a password reset link to:</p>
                <p className="text-emerald-700 font-medium text-sm mb-4">{email}</p>
                <div className="bg-stone-50 rounded-xl p-4 text-left mb-4">
                  <p className="text-xs font-medium text-stone-700 mb-1">Next steps:</p>
                  <ul className="text-xs text-stone-500 space-y-1">
                    <li>1. Open the email from Smart Coffee Support</li>
                    <li>2. Click the "Reset Password" button</li>
                    <li>3. Create a new secure password</li>
                    <li>4. Sign in with your new password</li>
                  </ul>
                </div>
                <p className="text-xs text-stone-400 mb-4">Link expires in 24 hours. Didn't receive it?</p>
                <button
                  onClick={() => setStep('email')}
                  className="text-sm text-emerald-700 font-medium hover:underline"
                >
                  Resend email
                </button>
              </div>
            )}

            <div className="text-center mt-5 pt-4 border-t border-stone-100">
              <Link to="/" className="flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
