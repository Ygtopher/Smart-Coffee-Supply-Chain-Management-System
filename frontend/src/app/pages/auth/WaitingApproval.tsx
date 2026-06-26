import { Link } from 'react-router';
import { Coffee, Clock, CheckCircle2, Mail, Phone, ArrowLeft } from 'lucide-react';
import LanguageToggle from '../../components/LanguageToggle';

export default function WaitingApproval() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1C3829] to-[#2D5A40] flex items-center justify-center p-4">
      <LanguageToggle variant="floating" />
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-amber-500 px-6 py-5 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold">Pending Approval</h1>
            <p className="text-amber-100 text-sm mt-1">Your registration is under review</p>
          </div>

          <div className="p-6">
            {/* Status Timeline */}
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Registration Submitted</p>
                  <p className="text-xs text-stone-500 mt-0.5">Your application has been received successfully</p>
                  <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ Completed</p>
                </div>
              </div>

              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-800">Admin Review</p>
                  <p className="text-xs text-stone-500 mt-0.5">Our admin team is reviewing your application and farm details</p>
                  <p className="text-xs text-amber-600 font-medium mt-0.5">⟳ In Progress — 1-3 business days</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Coffee className="w-5 h-5 text-stone-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-400">Account Activation</p>
                  <p className="text-xs text-stone-400 mt-0.5">Receive login credentials and begin using the platform</p>
                  <p className="text-xs text-stone-400 mt-0.5">Pending admin approval</p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <p className="text-sm font-medium text-blue-800 mb-1">What happens next?</p>
              <ul className="text-xs text-blue-700 space-y-1.5">
                <li>• Our admin will verify your farm details and location</li>
                <li>• You'll receive an SMS and email notification when approved</li>
                <li>• Once approved, you can log in with your registered credentials</li>
                <li>• An aggregator will be assigned to your farm area</li>
              </ul>
            </div>

            {/* Contact Info */}
            <div className="border border-stone-200 rounded-xl p-4 mb-5">
              <p className="text-sm font-medium text-stone-700 mb-3">Need assistance? Contact us:</p>
              <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>support@impexcor.et</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-600">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>+251 11 234 5678 (Mon-Fri, 8AM-5PM)</span>
              </div>
            </div>

            {/* Your Reference */}
            <div className="bg-stone-50 rounded-xl p-4 mb-5 text-center">
              <p className="text-xs text-stone-500 mb-1">Your Application Reference</p>
              <p className="text-lg font-bold text-stone-800 font-mono">REG-2024-0847</p>
              <p className="text-xs text-stone-400 mt-1">Keep this for your records</p>
            </div>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full py-2.5 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4">
          <div className="flex items-center justify-center gap-2 text-green-200 text-sm">
            <Coffee className="w-4 h-4 text-amber-400" />
            <span>CoffeeSCM — IMPEXCOR Ltd</span>
          </div>
        </div>
      </div>
    </div>
  );
}
