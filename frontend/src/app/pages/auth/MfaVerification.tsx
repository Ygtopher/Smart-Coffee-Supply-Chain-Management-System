import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Coffee, Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import LanguageToggle from '../../components/LanguageToggle';
import apiService from '../../services/api';

export default function MfaVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyMfaAndCompleteLogin } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Get user data from navigation state
  const { tempUser } = location.state || { tempUser: null };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    if (!tempUser) {
      toast.error('Session expired. Please login again.');
      navigate('/login');
      return;
    }

    setLoading(true);
    
    // Complete login real API call
    const success = await verifyMfaAndCompleteLogin(tempUser, otp);
    
    if (success) {
      toast.success('MFA verified! Login successful.');
      navigate('/dashboard'); // Main layout routes based on actual logged in role
    } else {
      setOtp('');
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    if (!tempUser?.email) {
      toast.error('Session expired. Please login again.');
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.resendMfaCode(tempUser.email);
      toast.success(response.message);
    } catch (error: any) {
      toast.error(error.message || 'Unable to resend the verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    
    // Auto-verify when 6 digits are entered
    if (value.length === 6) {
      setTimeout(() => {
        handleVerify();
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C3829] via-[#1E3F2E] to-[#2D5A40] flex items-center justify-center p-4">
      <LanguageToggle variant="floating" />
      {/* Background pattern */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 25% 25%, #fff 1px, transparent 1px), radial-gradient(circle at 75% 75%, #fff 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#1C3829] px-6 py-5">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-green-200 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Login</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Multi-Factor Authentication</h1>
                <p className="text-green-300 text-xs">Additional security layer</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Branding reminder */}
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-stone-200">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                <Coffee className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-800">CoffeeSCM</p>
                <p className="text-xs text-stone-500">IMPEXCOR Ltd</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-800 mb-2">Enter Verification Code</h2>
              <p className="text-stone-600 text-sm">
                We sent a 6-digit verification code to{tempUser?.email ? ` ${tempUser.email}` : ' your email address'}.
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-3 text-center">
                Enter 6-digit code
              </label>
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={handleOtpChange}
                  className="w-48 h-14 text-lg font-bold border-2 border-stone-300 focus:border-emerald-500 text-center"
                />
              </div>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={otp.length !== 6 || loading}
              className="w-full bg-[#1C3829] hover:bg-[#2D5A40] text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Verify & Continue
                </>
              )}
            </button>

            {/* Resend Code */}
            <div className="text-center">
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm text-emerald-700 hover:text-emerald-800 font-medium hover:underline disabled:opacity-50"
              >
                Didn't receive code? Resend
              </button>
            </div>

            {/* Security Info */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-900 mb-1">
                      Why MFA?
                    </h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Multi-Factor Authentication adds an extra security layer to protect your account and sensitive supply chain data from unauthorized access.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
