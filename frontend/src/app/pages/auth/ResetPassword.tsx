import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Coffee, ArrowLeft, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import LanguageToggle from '../../components/LanguageToggle';
import apiService from '../../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !token) {
      toast.error('This reset link is invalid. Please request a new one.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiService.resetPassword({ email, token, newPassword });
      setCompleted(true);
      toast.success('Password reset successful');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C3829] to-[#2D5A40] flex items-center justify-center p-4">
      <LanguageToggle variant="floating" />
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#1C3829] px-6 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Coffee className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Create New Password</p>
              <p className="text-green-300 text-xs">CoffeeSCM - IMPEXCOR Ltd</p>
            </div>
            <Link to="/login" className="text-green-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          <div className="p-6">
            {completed ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-stone-800 mb-2">Password updated</h2>
                <p className="text-stone-500 text-sm mb-5">
                  You can now sign in with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#1C3829] hover:bg-[#2D5A40] text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h2 className="text-lg font-bold text-stone-800">Reset your password</h2>
                  <p className="text-stone-500 text-sm mt-1">
                    Enter a new password for {email || 'your account'}.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1C3829] hover:bg-[#2D5A40] text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </>
            )}

            <div className="text-center mt-5 pt-4 border-t border-stone-100">
              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
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
