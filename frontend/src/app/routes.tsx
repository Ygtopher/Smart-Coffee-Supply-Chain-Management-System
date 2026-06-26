import { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useRouteError } from 'react-router';
import { useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import WaitingApproval from './pages/auth/WaitingApproval';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import MfaVerification from './pages/auth/MfaVerification';
import DriverTrip from './pages/DriverTrip';
import MainLayout from './layouts/MainLayout';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import AggregatorDashboard from './pages/aggregator/AggregatorDashboard';
import ProcessorDashboard from './pages/processor/ProcessorDashboard';
import QualityDashboard from './pages/quality/QualityDashboard';
import LogisticsDashboard from './pages/logistics/LogisticsDashboard';
import ExporterDashboard from './pages/exporter/ExporterDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

const rolePathMap: Record<string, string> = {
  farmer: '/dashboard/farmer',
  aggregator: '/dashboard/aggregator',
  processor: '/dashboard/processor',
  quality: '/dashboard/quality',
  logistics: '/dashboard/logistics',
  exporter: '/dashboard/exporter',
  admin: '/dashboard/admin',
};

function ErrorFallback() {
  const error = useRouteError() as any;
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-lg font-bold text-stone-800">Something went wrong</h1>
        <p className="text-sm text-stone-600 mt-2">
          This page failed to load. Please go back to your dashboard and try again.
        </p>
        {error?.message && <p className="text-xs text-red-600 mt-3 break-words">{error.message}</p>}
        <a href="/dashboard" className="inline-flex mt-5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm">
          Back to dashboard
        </a>
      </div>
    </div>
  );
}

function RequireRole({ allowed, children }: { allowed: string; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== allowed) return <Navigate to={rolePathMap[user.role] || '/dashboard'} replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/', Component: HomePage, errorElement: <ErrorFallback /> },
  { path: '/login', Component: Login, errorElement: <ErrorFallback /> },
  { path: '/register', Component: Register, errorElement: <ErrorFallback /> },
  { path: '/waiting-approval', Component: WaitingApproval, errorElement: <ErrorFallback /> },
  { path: '/forgot-password', Component: ForgotPassword, errorElement: <ErrorFallback /> },
  { path: '/reset-password', Component: ResetPassword, errorElement: <ErrorFallback /> },
  { path: '/mfa-verification', Component: MfaVerification, errorElement: <ErrorFallback /> },
  { path: '/driver-trip/:accessToken', Component: DriverTrip, errorElement: <ErrorFallback /> },
  {
    path: '/dashboard',
    Component: MainLayout,
    errorElement: <ErrorFallback />,
    children: [
      { 
        index: true, 
        Component: () => {
          const { user } = useAuth();
          if (!user) return <Navigate to="/login" replace />;
          return <Navigate to={rolePathMap[user.role] || '/dashboard/farmer'} replace />;
        } 
      },
      { path: 'farmer', Component: () => <RequireRole allowed="farmer"><FarmerDashboard /></RequireRole> },
      { path: 'aggregator', Component: () => <RequireRole allowed="aggregator"><AggregatorDashboard /></RequireRole> },
      { path: 'processor', Component: () => <RequireRole allowed="processor"><ProcessorDashboard /></RequireRole> },
      { path: 'quality', Component: () => <RequireRole allowed="quality"><QualityDashboard /></RequireRole> },
      { path: 'logistics', Component: () => <RequireRole allowed="logistics"><LogisticsDashboard /></RequireRole> },
      { path: 'exporter', Component: () => <RequireRole allowed="exporter"><ExporterDashboard /></RequireRole> },
      { path: 'admin', Component: () => <RequireRole allowed="admin"><AdminDashboard /></RequireRole> },
    ],
  },
  { path: '*', Component: () => <Navigate to="/" replace />, errorElement: <ErrorFallback /> },
]);
