import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';
// Removed static chart arrays, now fetched from getSystemAnalytics
import {
  Users, CheckCircle2, XCircle, UserPlus, ShieldCheck, Activity,
  Lock, ArrowUpRight, Eye, EyeOff, Plus, AlertCircle, Settings, Edit,
  Coffee, TrendingUp, Loader2, ChevronDown, Link2, QrCode, Sprout, Unlock, Trash2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
// notifications fetched live via API
import { ReportBuilder } from '../../components/ReportBuilder';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-600', aggregator: 'bg-amber-500', processor: 'bg-orange-500',
  quality: 'bg-violet-500', quality_controller: 'bg-violet-500', logistics: 'bg-sky-500', exporter: 'bg-rose-500', farmer: 'bg-emerald-500',
};

const DEFAULT_ADMIN_MARKET_PRICES = {
  currency: 'RWF',
  updatedAt: '2026-05-15',
  baselineRatePerKg: 2600,
  previousBaselineRatePerKg: 2500,
  grades: [
    { key: 'a1', grade: 'Grade A1 export reference', pricePerKg: 3200, previousPricePerKg: 3000 },
    { key: 'a2', grade: 'Grade A2 export reference', pricePerKg: 2950, previousPricePerKg: 2800 },
    { key: 'a3', grade: 'Grade A3 export reference', pricePerKg: 2700, previousPricePerKg: 2600 },
  ],
};

const chartSortClass = "px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600";
const sortRowsByNumber = (rows: any[], key: string, direction: 'asc' | 'desc') =>
  [...rows].sort((a, b) => direction === 'asc'
    ? Number(a?.[key] || 0) - Number(b?.[key] || 0)
    : Number(b?.[key] || 0) - Number(a?.[key] || 0));
const monthYearValue = (row: any) => {
  const value = String(row?.month || row?.date || row?.year || '');
  const parsed = Date.parse(`1 ${value}`);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const monthOnlyValue = (row: any) => {
  const value = String(row?.month || row?.date || row?.year || '');
  const parsed = Date.parse(`1 ${value}`);
  return Number.isNaN(parsed) ? 0 : new Date(parsed).getMonth();
};
const sortRowsByMonthYear = (rows: any[], direction: 'asc' | 'desc') =>
  [...rows].sort((a, b) => direction === 'asc' ? monthYearValue(a) - monthYearValue(b) : monthYearValue(b) - monthYearValue(a));
const sortRowsByMonthOnly = (rows: any[]) =>
  [...rows].sort((a, b) => monthOnlyValue(a) - monthOnlyValue(b));

const KPICard = ({ label, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <ArrowUpRight className="w-4 h-4 text-stone-300" />
    </div>
    <p className="text-2xl font-bold text-stone-800">{value}</p>
    <p className="text-sm text-stone-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-emerald-600 mt-1 font-medium">{sub}</p>}
  </div>
);

function Overview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [adminOps, setAdminOps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [volumeSort, setVolumeSort] = useState('year');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [analyticsRes, operationsRes] = await Promise.all([
          apiService.getSystemAnalytics(),
          apiService.getAdminOperations(),
        ]);
        setStats(analyticsRes.data);
        setAdminOps(operationsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  const monthlyVolume = stats?.monthlyVolume || [];
  const sortedMonthlyVolume = volumeSort === 'month' ? sortRowsByMonthOnly(monthlyVolume) : sortRowsByMonthYear(monthlyVolume, 'asc');
  const batchStatusRows = stats?.batchesByStatus || [];
  const sortedBatchStatusRows = sortRowsByNumber(batchStatusRows, 'value', 'desc');

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-green-700 to-green-500 rounded-2xl p-5 text-white">
        <div>
          <p className="text-green-300 text-sm mb-1">{t('welcome')},</p>
          <h2 className="text-xl font-bold">{user?.name || 'Administrator'}</h2>
          <p className="text-green-200 text-sm mt-1">System Administrator • Rwanda Coffee Supply Chain</p>
        </div>
        <div className="mt-4 pt-4 border-t border-green-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Users', value: String(stats?.activeUsers || 0) },
            { label: 'Active Batches', value: String(stats?.totalBatches || 0) },
            { label: 'Assessments', value: String(stats?.totalAssessments || 0) },
            { label: 'System Status', value: 'Operational' },
          ].map(s => (
            <div key={s.label}>
              <p className="text-green-300 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {(stats?.pendingFarmerCount || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{stats.pendingFarmerCount} farmer registrations pending your approval</p>
            <p className="text-xs text-amber-700 mt-0.5">Review and approve or reject in the Farmer Approvals section.</p>
          </div>
          <button className="text-xs text-amber-700 font-semibold bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
            Review Now →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Active Users" value={String(stats?.activeUsers || 0)} sub="Active accounts" icon={Users} color="bg-emerald-600" />
        <KPICard label="Pending Approvals" value={String(stats?.pendingFarmerCount || 0)} sub="Farmer registrations" icon={AlertCircle} color="bg-amber-500" />
        <KPICard label={t('nav.batches')} value={String(stats?.totalBatches || 0)} sub="In supply chain" icon={Coffee} color="bg-amber-700" />
        <KPICard label={t('exporter.total_exported')} value={String(stats?.totalShipments || 0)} sub="Processed shipments" icon={TrendingUp} color="bg-violet-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-stone-800">Monthly Supply Chain Volume (kg)</h3>
            <select value={volumeSort} onChange={e => setVolumeSort(e.target.value)} className={chartSortClass}>
              <option value="year">Year</option>
              <option value="month">Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sortedMonthlyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="collected" stroke="#2D6A4F" strokeWidth={2.5} name="Collected" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="processed" stroke="#d97706" strokeWidth={2.5} name="Processed" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="exported" stroke="#7c3aed" strokeWidth={2.5} name="Exported" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Batch Status Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={sortedBatchStatusRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2D6A4F" strokeWidth={2.5} name="Batches" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {sortedBatchStatusRows.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-stone-600">{d.name}</span>
                </div>
                <span className="font-medium text-stone-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FarmerApprovals() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiService.getAllUsers(1, 100);
      setApprovals(res.data.filter((u: any) => u.status === 'pending' || u.status === 'inactive'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id: string, name: string) => {
    setProcessing(id);
    try {
      await apiService.updateUser(id, { status: 'active' });
      toast.success(`${name}'s registration has been approved!`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to approve user');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string, name: string) => {
    setProcessing(id);
    await new Promise(r => setTimeout(r, 600));
    setApprovals(prev => prev.filter(a => a.userId !== id));
    toast.error(`${name}'s registration has been rejected.`);
    setProcessing(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Farmer Registration Approvals</h2>
        <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">{approvals.length} pending</span>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="font-semibold text-stone-700">All registrations reviewed!</p>
          <p className="text-sm text-stone-400 mt-1">No pending farmer approvals at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map(a => (
            <div key={a.userId} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-semibold uppercase">
                    {a.fullName?.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-stone-800">{a.fullName}</h4>
                    <p className="text-xs text-stone-400">{a.email} • Registered: {new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium capitalize">{a.status}</span>
              </div>

              <div className="grid sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Role', value: a.role },
                  { label: 'Phone', value: a.phone || 'N/A' },
                  { label: 'User ID', value: a.userId.substring(0, 8) },
                  { label: 'Created At', value: new Date(a.createdAt).toLocaleDateString() },
                ].map(d => (
                  <div key={d.label} className="bg-stone-50 rounded-lg p-2.5">
                    <p className="text-xs text-stone-400">{d.label}</p>
                    <p className="text-xs font-semibold text-stone-700 mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApprove(a.userId, a.fullName)}
                  disabled={processing === a.userId}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors disabled:opacity-60"
                >
                  {processing === a.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve / Activate
                </button>
                <button
                  onClick={() => handleReject(a.userId, a.fullName)}
                  disabled={processing === a.userId}
                  className="flex items-center gap-2 px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-lg transition-colors border border-red-200 disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 ml-auto">
                  <Eye className="w-4 h-4" /> View Full Application
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', roleName: 'AGGREGATOR', phone: '' });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState('newest');

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await apiService.getAllUsers(1, 100);
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch users');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdatingUser(true);
    try {
      await apiService.updateUser(editingUser.userId, {
        roleName: editingUser.roleName,
        status: editingUser.status,
        mfaEnabled: editingUser.mfaEnabled,
      });
      toast.success(`User updated successfully!`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.createUser({
        fullName: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        roleName: newUser.roleName,
      });
      toast.success(`User ${newUser.name} created successfully!`);
      setNewUser({ name: '', email: '', roleName: 'AGGREGATOR', phone: '' });
      setShowCreateForm(false);
      fetchUsers(); // Refresh the list
    } catch (err: any) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleLockToggle = async (targetUser: any) => {
    const nextStatus = targetUser.status === 'locked' ? 'active' : 'locked';
    setActionUserId(targetUser.userId);
    try {
      await apiService.updateUser(targetUser.userId, { status: nextStatus });
      toast.success(nextStatus === 'locked' ? 'Account locked' : 'Account unlocked');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update account status');
    } finally {
      setActionUserId(null);
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    if (!window.confirm(`Delete ${targetUser.fullName || targetUser.email}? This will lock access and preserve traceability history.`)) return;
    setActionUserId(targetUser.userId);
    try {
      await apiService.deleteUser(targetUser.userId);
      toast.success('Account deleted');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setActionUserId(null);
    }
  };
  const visibleUsers = users
    .filter((u) => u.status !== 'deleted')
    .filter((u) => {
      const query = userSearch.trim().toLowerCase();
      if (!query) return true;
      return [
        u.fullName,
        u.email,
        u.phone,
        typeof u.role === 'string' ? u.role : u.role?.roleName,
        u.status,
        u.farmerProfile?.farmName,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    })
    .sort((a, b) => {
      switch (userSort) {
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'name':
          return String(a.fullName || '').localeCompare(String(b.fullName || ''));
        case 'role':
          return String(typeof a.role === 'string' ? a.role : a.role?.roleName || '').localeCompare(String(typeof b.role === 'string' ? b.role : b.role?.roleName || ''));
        case 'status':
          return String(a.status || '').localeCompare(String(b.status || ''));
        case 'mfa':
          return Number(Boolean(b.mfaEnabled)) - Number(Boolean(a.mfaEnabled));
        case 'newest':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">User Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40] transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Create User
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4 pb-3 border-b border-stone-100">Create New User Account</h3>
          <form onSubmit={handleCreate}>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                  placeholder="e.g. Kedir Seid"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                  placeholder="user@impexcor.et"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Role <span className="text-red-500">*</span></label>
                <select
                  value={newUser.roleName}
                  onChange={e => setNewUser(u => ({ ...u, roleName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                >
                  {['AGGREGATOR', 'PROCESSOR', 'QUALITY_CONTROLLER', 'LOGISTICS', 'EXPORTER', 'ADMIN'].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={e => setNewUser(u => ({ ...u, phone: e.target.value }))}
                  placeholder="+251 9XX XXX XXX"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">A temporary password (Password@123) will be auto-generated for the user. They will be prompted to change it on first login.</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40] transition-colors disabled:opacity-60">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create Account
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-5 py-2 border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 bg-white">
          <div className="grid md:grid-cols-[1fr_220px_auto] gap-3 items-center">
            <input
              type="search"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search user, email, phone, role, status..."
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <select
              value={userSort}
              onChange={e => setUserSort(e.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">Newest registered</option>
              <option value="oldest">Oldest registered</option>
              <option value="name">Name A-Z</option>
              <option value="role">Role A-Z</option>
              <option value="status">Status A-Z</option>
              <option value="mfa">MFA enabled first</option>
            </select>
            <span className="text-xs bg-stone-100 text-stone-600 px-3 py-2 rounded-lg font-medium whitespace-nowrap">
              {visibleUsers.length} active records
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {fetching ? (
            <div className="p-10 flex justify-center text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['User', 'Role', 'Status', 'Registered', 'MFA Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visibleUsers.map(u => (
                  <tr key={u.userId} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${ROLE_COLORS[typeof u.role === 'string' ? u.role.toLowerCase() : u.role?.roleName?.toLowerCase()] || 'bg-stone-400'} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
                          {u.fullName?.substring(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-stone-800 whitespace-nowrap">{u.fullName}</p>
                          <p className="text-xs text-stone-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize text-white ${ROLE_COLORS[typeof u.role === 'string' ? u.role.toLowerCase() : u.role?.roleName?.toLowerCase()] || 'bg-stone-400'}`}>
                        {(typeof u.role === 'string' ? u.role : u.role?.roleName)?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                        u.status === 'active' ? 'text-emerald-700' :
                        u.status === 'locked' || u.status === 'deleted' ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-500' :
                          u.status === 'locked' || u.status === 'deleted' ? 'bg-red-500' : 'bg-amber-500'
                        }`} /> {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap text-xs">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {u.mfaEnabled ? 'Enabled' : 'Disabled'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleLockToggle(u)}
                          disabled={actionUserId === u.userId || currentUser?.id === u.userId || u.status === 'deleted'}
                          title={u.status === 'locked' ? 'Unlock account' : 'Lock account'}
                          className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {u.status === 'locked' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => setEditingUser({ ...u, roleName: typeof u.role === 'string' ? u.role : u.role?.roleName })} 
                          disabled={u.status === 'deleted'}
                          className="p-1.5 hover:bg-stone-100 rounded text-blue-500 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={actionUserId === u.userId || currentUser?.id === u.userId || u.status === 'deleted'}
                          title="Delete account"
                          className="p-1.5 hover:bg-red-50 rounded text-red-400 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-stone-400">
                      No non-deleted users match this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-stone-100 bg-stone-50/50">
              <h3 className="font-semibold text-stone-800">Edit User</h3>
              <button onClick={() => setEditingUser(null)} className="text-stone-400 hover:text-stone-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Role</label>
                <select
                  value={editingUser.roleName}
                  onChange={e => setEditingUser({ ...editingUser, roleName: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                >
                  {['FARMER', 'AGGREGATOR', 'PROCESSOR', 'QUALITY_CONTROLLER', 'LOGISTICS', 'EXPORTER', 'ADMIN'].map(r => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Status</label>
                <select
                  value={editingUser.status}
                  onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                >
                  <option value="active">Active</option>
                  <option value="locked">Locked</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">MFA Status</label>
                <select
                  value={editingUser.mfaEnabled ? 'true' : 'false'}
                  onChange={e => setEditingUser({ ...editingUser, mfaEnabled: e.target.value === 'true' })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="submit" disabled={updatingUser} className="flex-1 flex justify-center items-center gap-2 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                  {updatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-2 border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CooperativeManagement() {
  const [cooperatives, setCooperatives] = useState<any[]>([]);
  const [aggregators, setAggregators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', district: '', zone: '', managerId: '', aggregatorIds: [] as string[], status: 'active' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [coopRes, aggRes] = await Promise.all([
        apiService.getCooperatives(),
        apiService.getAllUsers(1, 100, 'AGGREGATOR'),
      ]);
      setCooperatives(coopRes.data || []);
      setAggregators(aggRes.data || []);
    } catch (err) {
      toast.error('Failed to load cooperatives');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', district: '', zone: '', managerId: '', aggregatorIds: [], status: 'active' });
    setShowForm(false);
  };

  const toggleAggregator = (userId: string) => {
    setForm(f => ({
      ...f,
      aggregatorIds: f.aggregatorIds.includes(userId)
        ? f.aggregatorIds.filter(id => id !== userId)
        : [...f.aggregatorIds, userId],
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.district || !form.zone || !form.managerId) {
      toast.error('Fill cooperative name, district, zone, and primary aggregator');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, aggregatorIds: Array.from(new Set([form.managerId, ...form.aggregatorIds])) };
      if (editing) {
        await apiService.updateCooperative(editing.coopId, payload);
        toast.success('Cooperative updated');
      } else {
        await apiService.createCooperative(payload);
        toast.success('Cooperative created and aggregators assigned');
      }
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save cooperative');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Cooperative Management</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40]"
        >
          <Plus className="w-4 h-4" /> New Cooperative
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-stone-800">{editing ? 'Edit Cooperative' : 'Create Cooperative'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Cooperative Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">District</label>
              <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Zone / Collection Point</label>
              <input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Primary Aggregator</label>
              <select value={form.managerId} onChange={e => setForm(f => ({ ...f, managerId: e.target.value, aggregatorIds: Array.from(new Set([e.target.value, ...f.aggregatorIds].filter(Boolean))) }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                <option value="">Select primary aggregator...</option>
                {aggregators.map(a => <option key={a.userId} value={a.userId}>{a.fullName} - {a.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Assigned Aggregators / Collectors</label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {aggregators.map(a => {
                const checked = form.aggregatorIds.includes(a.userId) || form.managerId === a.userId;
                return (
                  <label key={a.userId} className={'flex items-start gap-2 rounded-lg border p-3 text-sm ' + (checked ? 'border-emerald-200 bg-emerald-50' : 'border-stone-200 bg-white')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={form.managerId === a.userId}
                      onChange={() => toggleAggregator(a.userId)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-semibold text-stone-800">{a.fullName || a.email}</span>
                      <span className="block text-xs text-stone-500">{a.email}</span>
                      {form.managerId === a.userId && <span className="block text-xs text-emerald-700 mt-1">Primary contact</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-700 text-white text-sm rounded-lg disabled:opacity-60">
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Cooperative'}
            </button>
            <button type="button" onClick={resetForm} className="px-5 py-2 border border-stone-200 text-stone-600 text-sm rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-stone-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Cooperative', 'District', 'Zone', 'Primary Aggregator', 'Assigned Aggregators', 'Farmers', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {cooperatives.map(coop => (
                  <tr key={coop.coopId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-semibold text-stone-800">{coop.name}</td>
                    <td className="px-4 py-3 text-stone-600">{coop.district}</td>
                    <td className="px-4 py-3 text-stone-600">{coop.zone}</td>
                    <td className="px-4 py-3 text-stone-600">{coop.manager?.fullName || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-stone-600">
                      <div className="flex flex-wrap gap-1">
                        {(coop.aggregatorAssignments || []).map((assignment: any) => (
                          <span key={assignment.userId || assignment.user?.userId} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">
                            {assignment.user?.fullName || assignment.user?.email}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{coop.farmerCount || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${coop.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>{coop.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setEditing(coop);
                          setForm({
                            name: coop.name,
                            district: coop.district,
                            zone: coop.zone,
                            managerId: coop.managerId,
                            aggregatorIds: (coop.aggregatorAssignments || []).map((assignment: any) => assignment.userId || assignment.user?.userId).filter(Boolean),
                            status: coop.status
                          });
                          setShowForm(true);
                        }}
                        className="p-1.5 hover:bg-stone-100 rounded text-blue-500 hover:text-blue-700"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkStationManagement() {
  const [stations, setStations] = useState<any[]>([]);
  const [processors, setProcessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', district: '', address: '', capacityKg: '', gpsLocation: '', processorId: '', status: 'active' });
  const [stationSearch, setStationSearch] = useState('');
  const [stationSort, setStationSort] = useState('name_asc');

  const load = useCallback(async () => {
    setLoading(true);
    const [stationRes, processorRes] = await Promise.allSettled([
      apiService.getWorkStations(),
      apiService.getAllUsers(1, 100, 'PROCESSOR'),
    ]);

    if (stationRes.status === 'fulfilled') {
      setStations(stationRes.value.data || []);
    } else {
      toast.error('Failed to load work stations');
    }

    if (processorRes.status === 'fulfilled') {
      setProcessors(processorRes.value.data || []);
    } else {
      toast.error('Failed to load processors');
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: '', district: '', address: '', capacityKg: '', gpsLocation: '', processorId: '', status: 'active' });
    setShowForm(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.district || !form.address) {
      toast.error('Fill work station name, district, and address');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiService.updateWorkStation(editing.locationId, form);
        toast.success('Work station updated');
      } else {
        await apiService.createWorkStation(form);
        toast.success('Work station created');
      }
      resetForm();
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save work station');
    } finally {
      setSaving(false);
    }
  };

  const visibleStations = stations
    .filter(station => {
      const text = [
        station.name,
        station.district,
        station.address,
        station.gpsLocation,
        station.processor?.fullName,
        station.status,
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(stationSearch.trim().toLowerCase());
    })
    .sort((a, b) => {
      switch (stationSort) {
        case 'name_desc':
          return String(b.name || '').localeCompare(String(a.name || ''));
        case 'district_asc':
          return String(a.district || '').localeCompare(String(b.district || ''));
        case 'district_desc':
          return String(b.district || '').localeCompare(String(a.district || ''));
        case 'capacity_desc':
          return Number(b.capacityKg || 0) - Number(a.capacityKg || 0);
        case 'capacity_asc':
          return Number(a.capacityKg || 0) - Number(b.capacityKg || 0);
        case 'processor_asc':
          return String(a.processor?.fullName || 'Unassigned').localeCompare(String(b.processor?.fullName || 'Unassigned'));
        case 'suppliers_desc':
          return Number(b.assignedSuppliers || 0) - Number(a.assignedSuppliers || 0);
        case 'pending_desc':
          return Number(b.pendingRequests || 0) - Number(a.pendingRequests || 0);
        case 'status_asc':
          return String(a.status || '').localeCompare(String(b.status || ''));
        default:
          return String(a.name || '').localeCompare(String(b.name || ''));
      }
    });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Work Station Management</h2>
          <p className="text-sm text-stone-500 mt-0.5">Create washing stations and assign the processor responsible for supplier requests.</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40]">
          <Plus className="w-4 h-4" /> New Work Station
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-stone-800">{editing ? 'Edit Work Station' : 'Create Work Station'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Work Station Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">District</label>
              <input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Address</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Capacity (kg)</label>
              <input type="number" value={form.capacityKg} onChange={e => setForm(f => ({ ...f, capacityKg: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Coordinates</label>
              <input value={form.gpsLocation} onChange={e => setForm(f => ({ ...f, gpsLocation: e.target.value }))} placeholder="-1.933775, 30.132433" className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Assigned Processor</label>
              <select value={form.processorId} onChange={e => setForm(f => ({ ...f, processorId: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                <option value="">Select processor...</option>
                {processors.map(p => <option key={p.userId} value={p.userId}>{p.fullName || p.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-700 text-white text-sm rounded-lg disabled:opacity-60">{saving ? 'Saving...' : 'Save Work Station'}</button>
            <button type="button" onClick={resetForm} className="px-5 py-2 border border-stone-200 text-stone-600 text-sm rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-800">Registered IMPEXCOR Work Stations</h3>
            <p className="text-sm text-stone-500 mt-0.5">{visibleStations.length} of {stations.length} stations shown</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={stationSearch}
              onChange={e => setStationSearch(e.target.value)}
              placeholder="Search station, district, processor..."
              className="w-72 max-w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
            />
            <select value={stationSort} onChange={e => setStationSort(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="district_asc">District A-Z</option>
              <option value="district_desc">District Z-A</option>
              <option value="capacity_desc">Capacity high-low</option>
              <option value="capacity_asc">Capacity low-high</option>
              <option value="processor_asc">Processor A-Z</option>
              <option value="suppliers_desc">Suppliers high-low</option>
              <option value="pending_desc">Pending requests high-low</option>
              <option value="status_asc">Status A-Z</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center text-stone-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Work Station', 'District', 'Address', 'Capacity', 'Processor', 'Suppliers', 'Pending Requests', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visibleStations.map(station => (
                  <tr key={station.locationId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-semibold text-stone-800">{station.name}<p className="text-xs text-stone-400">{station.gpsLocation || 'No coordinates'}</p></td>
                    <td className="px-4 py-3 text-stone-600">{station.district}</td>
                    <td className="px-4 py-3 text-stone-600">{station.address}</td>
                    <td className="px-4 py-3 text-stone-600">{Number(station.capacityKg || 0).toLocaleString()} kg</td>
                    <td className="px-4 py-3 text-stone-600">{station.processor?.fullName || 'Unassigned'}</td>
                    <td className="px-4 py-3 text-stone-600">{Number(station.assignedSuppliers || 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${Number(station.pendingRequests || 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'}`}>
                        {Number(station.pendingRequests || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${station.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>{station.status}</span></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setEditing(station);
                          setForm({
                            name: station.name,
                            district: station.district,
                            address: station.address,
                            capacityKg: String(station.capacityKg || ''),
                            gpsLocation: station.gpsLocation || '',
                            processorId: station.processorId || '',
                            status: station.status || 'active',
                          });
                          setShowForm(true);
                        }}
                        className="p-1.5 hover:bg-stone-100 rounded text-blue-500 hover:text-blue-700"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleStations.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-stone-400">No work stations match this search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function ExternalTransportCompanies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    licenseNo: '',
    operatingCorridors: 'Kigali - Mombasa Port',
    status: 'active',
    notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getAdminTruckCompanies();
      setCompanies(response.data || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load external transport companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      licenseNo: '',
      operatingCorridors: 'Kigali - Mombasa Port',
      status: 'active',
      notes: '',
    });
  };

  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error('External transport company name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiService.updateTruckCompany(editing.truckCompanyId, form);
        toast.success('External transport company updated');
      } else {
        await apiService.createTruckCompany(form);
        toast.success('External transport company registered');
      }
      resetForm();
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save external transport company');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">External Transport Companies</h2>
        <p className="text-sm text-stone-500 mt-0.5">Register contracted road transport companies used for Rwanda-to-port coffee export movements.</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <form onSubmit={saveCompany} className="p-5 border-b border-stone-100 bg-stone-50/50 space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="External transport company name" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            <input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Contact person" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            <input value={form.licenseNo} onChange={e => setForm(f => ({ ...f, licenseNo: e.target.value }))} placeholder="License / registration no." className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            <input value={form.operatingCorridors} onChange={e => setForm(f => ({ ...f, operatingCorridors: e.target.value }))} placeholder="Operating corridors" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white" />
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="flex gap-2">
              <button disabled={saving} className="flex-1 px-4 py-2 bg-sky-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? 'Saving...' : editing ? 'Update' : 'Register'}</button>
              {editing && <button type="button" onClick={resetForm} className="px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-600">Cancel</button>}
            </div>
          </div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes, insurance limits, route restrictions, or service terms" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white min-h-[70px]" />
        </form>

        {loading ? (
          <div className="p-10 flex justify-center text-stone-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  {['Company', 'Contact', 'License', 'Corridor', 'Active Jobs', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {companies.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">No external transport companies registered yet.</td></tr>
                ) : companies.map(company => (
                  <tr key={company.truckCompanyId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-semibold text-stone-800">{company.companyName}</td>
                    <td className="px-4 py-3 text-stone-600"><p>{company.contactPerson || '-'}</p><p className="text-xs text-stone-400">{company.phone || company.email || '-'}</p></td>
                    <td className="px-4 py-3 text-stone-600">{company.licenseNo || '-'}</td>
                    <td className="px-4 py-3 text-stone-600">{company.operatingCorridors || '-'}</td>
                    <td className="px-4 py-3 text-stone-600">{company.activeJobs || 0}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : company.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>{company.status}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => {
                        setEditing(company);
                        setForm({
                          companyName: company.companyName || '',
                          contactPerson: company.contactPerson || '',
                          phone: company.phone || '',
                          email: company.email || '',
                          licenseNo: company.licenseNo || '',
                          operatingCorridors: company.operatingCorridors || '',
                          status: company.status || 'active',
                          notes: company.notes || '',
                        });
                      }} className="p-1.5 hover:bg-stone-100 rounded text-blue-500 hover:text-blue-700">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RolePermissions() {
  const permissionModules = [
    { key: 'Farm Profile', label: 'Supplier Profile & Farms', group: 'Supplier Portal' },
    { key: 'Washing Station Connection', label: 'Washing Station Connection', group: 'Supplier Portal' },
    { key: 'Pickup Scheduling', label: 'Pickup Requests & Scheduling', group: 'Supplier Portal' },
    { key: 'Payments', label: 'Payment Receipt History', group: 'Supplier Portal' },
    { key: 'Input and Service Requests', label: 'Service Requests', group: 'Supplier Portal' },
    { key: 'Community Discussion', label: 'Community Discussion', group: 'Supplier Portal' },

    { key: 'Farmer Management', label: 'Assigned Supplier Management', group: 'Aggregator Portal' },
    { key: 'Pickup Schedule', label: 'Pickup Schedule Management', group: 'Aggregator Portal' },
    { key: 'Record Pickup', label: 'Complete Pickup & Upload Receipt', group: 'Aggregator Portal' },
    { key: 'Batch Creation', label: 'Create QR Batch', group: 'Aggregator Portal' },
    { key: 'Checkpoint & Transport Logging', label: 'Batch Transport & Checkpoint Logs', group: 'Aggregator Portal' },

    { key: 'Supplier Assignment', label: 'Supplier Assignment', group: 'Processor Portal' },
    { key: 'Incoming Batches', label: 'Station Incoming Batches', group: 'Processor Portal' },
    { key: 'Processing Queue', label: 'Processing Queue', group: 'Processor Portal' },
    { key: 'Batch Transformation Tracking', label: 'Processing & Transformation Logs', group: 'Processor Portal' },
    { key: 'Inventory Management', label: 'Station Inventory', group: 'Processor Portal' },

    { key: 'Quality Management', label: 'Quality Assessment & Cupping', group: 'Quality Controller Portal' },
    { key: 'Certification & Grading', label: 'Quality Certificates & Grading', group: 'Quality Controller Portal' },
    { key: 'Defect Tracking', label: 'Defect Management', group: 'Quality Controller Portal' },
    { key: 'Corrective Actions', label: 'Corrective Actions', group: 'Quality Controller Portal' },
    { key: 'Lab & Buyer Requirements', label: 'Samples & Buyer Requirements', group: 'Quality Controller Portal' },

    { key: 'Batch Traceability', label: 'QR Traceability & Batch Journey', group: 'Shared Operations' },
    { key: 'Order Management', label: 'Customer Orders, Matching & Authorization', group: 'Shared Operations' },
    { key: 'Logistics & Shipping', label: 'Authorized Orders & Shipment Management', group: 'Shared Operations' },
    { key: 'Transit Checkpoints', label: 'Road Transport, Checkpoints & Completed Journeys', group: 'Shared Operations' },
    { key: 'Proof of Delivery', label: 'Proof of Delivery', group: 'Shared Operations' },
    { key: 'Analytics & Reporting', label: 'Reports & Analytics', group: 'Shared Operations' },
    { key: 'Help & Support', label: 'Support Tickets', group: 'Shared Operations' },

    { key: 'System Configuration', label: 'Users, Work Stations & System Configuration', group: 'System Administration' },
    { key: 'Security & Audit', label: 'Role Permissions, Security & Audit', group: 'System Administration' },
    { key: 'Database & Backup', label: 'Database & Backup Management', group: 'System Administration' },
    { key: 'API Integrations', label: 'Integration Configuration', group: 'System Administration' },
    { key: 'Support Administration', label: 'Support Ticket Administration', group: 'System Administration' },
  ] as const;
  const moduleKeys = permissionModules.map(module => module.key);
  const relevantModules: Record<string, string[]> = {
    ADMIN: ['System Configuration', 'Security & Audit', 'Database & Backup', 'API Integrations', 'Support Administration', 'Analytics & Reporting'],
    FARMER: ['Farm Profile', 'Washing Station Connection', 'Pickup Scheduling', 'Payments', 'Batch Traceability', 'Input and Service Requests', 'Community Discussion', 'Analytics & Reporting'],
    AGGREGATOR: ['Farmer Management', 'Pickup Schedule', 'Record Pickup', 'Batch Creation', 'Batch Traceability', 'Checkpoint & Transport Logging', 'Analytics & Reporting', 'Help & Support'],
    PROCESSOR: ['Supplier Assignment', 'Incoming Batches', 'Processing Queue', 'Batch Transformation Tracking', 'Corrective Actions', 'Inventory Management', 'Batch Traceability', 'Analytics & Reporting', 'Help & Support'],
    QUALITY_CONTROLLER: ['Quality Management', 'Certification & Grading', 'Defect Tracking', 'Corrective Actions', 'Lab & Buyer Requirements', 'Batch Traceability', 'Analytics & Reporting', 'Help & Support'],
    EXPORTER: ['Order Management', 'Batch Traceability', 'Logistics & Shipping', 'Analytics & Reporting', 'Help & Support'],
    LOGISTICS: ['Logistics & Shipping', 'Transit Checkpoints', 'Proof of Delivery', 'Analytics & Reporting', 'Help & Support'],
  };
  const roleDescriptions: Record<string, string> = {
    ADMIN: 'Platform configuration, security, reporting, integrations and support administration.',
    FARMER: 'Supplier profile, washing-station connection, pickups, receipts and traceability.',
    AGGREGATOR: 'Assigned suppliers, pickup completion, receipt upload and QR batch creation.',
    PROCESSOR: 'Station assignments, incoming batches, processing, corrective work and inventory.',
    QUALITY_CONTROLLER: 'Assessments, defects, certificates, corrective actions and buyer requirements.',
    EXPORTER: 'Customer orders, certified batch matching, authorization and export reporting.',
    LOGISTICS: 'Authorized orders, shipments, road checkpoints and proof of delivery.',
  };
  const [roles, setRoles] = useState<any[]>([]);
  const [draft, setDraft] = useState<Record<string, Record<string, boolean>>>({});
  const [baseline, setBaseline] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [resettingRole, setResettingRole] = useState(false);

  const permissionMapFor = (permissions: any) => {
    const enabled = Array.isArray(permissions?.modules)
      ? permissions.modules
      : Array.isArray(permissions)
        ? permissions
        : Object.entries(permissions || {}).filter(([, value]) => Boolean(value)).map(([key]) => key);
    return moduleKeys.reduce<Record<string, boolean>>((acc, module) => {
      acc[module] = enabled.includes(module) || enabled.includes('*');
      return acc;
    }, {});
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getAdminRoles();
      const loadedRoles = response.data || [];
      const loadedPermissions = loadedRoles.reduce<Record<string, Record<string, boolean>>>((acc, role) => {
        acc[role.roleName] = permissionMapFor(role.permissions);
        return acc;
      }, {});
      setRoles(loadedRoles);
      setDraft(loadedPermissions);
      setBaseline(loadedPermissions);
      setSelectedRole(current => loadedRoles.some((role: any) => role.roleName === current)
        ? current
        : (loadedRoles[0]?.roleName || 'ADMIN'));
    } catch {
      toast.error('Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePermission = (roleName: string, module: string) => {
    if (roleName === 'ADMIN' && module === 'Security & Audit') return;
    setDraft(prev => ({
      ...prev,
      [roleName]: {
        ...(prev[roleName] || {}),
        [module]: !(prev[roleName]?.[module]),
      }
    }));
  };

  const saveRole = async (roleName: string) => {
    setSavingRole(roleName);
    try {
      const enabledModules = moduleKeys.filter(module => draft[roleName]?.[module]);
      await apiService.updateRolePermissions(roleName, { modules: enabledModules });
      localStorage.setItem('role_permissions_updated_at', String(Date.now()));
      window.dispatchEvent(new Event('role-permissions-updated'));
      toast.success(roleName.replace(/_/g, ' ') + ' permissions updated');
      setBaseline(prev => ({ ...prev, [roleName]: { ...draft[roleName] } }));
    } catch {
      toast.error('Failed to update permissions');
    } finally {
      setSavingRole(null);
    }
  };

  const resetToDefault = async () => {
    if (!window.confirm(`Restore the original permissions for ${selectedRole.replace(/_/g, ' ')}?`)) return;
    setResettingRole(true);
    try {
      await apiService.resetRolePermissionsToDefault(selectedRole);
      localStorage.setItem('role_permissions_updated_at', String(Date.now()));
      window.dispatchEvent(new Event('role-permissions-updated'));
      toast.success(`${selectedRole.replace(/_/g, ' ')} restored to default permissions`);
      await load();
    } catch {
      toast.error('Failed to restore role permissions');
    } finally {
      setResettingRole(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  const relevantKeys = relevantModules[selectedRole] || [];
  const visibleModules = permissionModules.filter(module => relevantKeys.includes(module.key));
  const enabledModules = visibleModules.filter(module => draft[selectedRole]?.[module.key]);
  const addedModules = visibleModules.filter(module => draft[selectedRole]?.[module.key] && !baseline[selectedRole]?.[module.key]);
  const removedModules = visibleModules.filter(module => !draft[selectedRole]?.[module.key] && baseline[selectedRole]?.[module.key]);
  const hasChanges = addedModules.length > 0 || removedModules.length > 0;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Role Permissions</h2>
        <p className="text-sm text-stone-500 mt-0.5">Select one role, configure only its relevant modules, and preview the resulting portal access.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="System roles">
        {roles.map(role => {
          const active = selectedRole === role.roleName;
          return (
            <button key={role.roleName} type="button" onClick={() => setSelectedRole(role.roleName)}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap transition-colors ${active ? `${ROLE_COLORS[role.roleName.toLowerCase()] || 'bg-stone-700'} text-white border-transparent` : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}>
              {role.roleName.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] gap-5 items-start">
        <div className="bg-white rounded-lg border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-white text-xs font-semibold ${ROLE_COLORS[selectedRole.toLowerCase()] || 'bg-stone-600'}`}>{selectedRole.replace(/_/g, ' ')}</span>
                <span className="text-xs text-stone-500">{enabledModules.length} of {visibleModules.length} modules enabled</span>
              </div>
              <p className="text-sm text-stone-600 mt-2">{roleDescriptions[selectedRole]}</p>
            </div>
            <button type="button" onClick={resetToDefault} disabled={resettingRole}
              className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 disabled:opacity-60">
              {resettingRole ? 'Restoring...' : 'Restore Role Default'}
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {visibleModules.map(module => {
              const enabled = Boolean(draft[selectedRole]?.[module.key]);
              const required = selectedRole === 'ADMIN' && module.key === 'Security & Audit';
              return (
                <div key={module.key} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800">{module.label}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{module.group}{required ? ' - required to prevent administrator lockout' : ''}</p>
                  </div>
                  <button type="button" role="switch" aria-checked={enabled} disabled={required}
                    onClick={() => togglePermission(selectedRole, module.key)}
                    aria-label={`${enabled ? 'Disable' : 'Enable'} ${module.label} for ${selectedRole.replace(/_/g, ' ')}`}
                    className={`relative inline-flex w-11 h-6 min-w-11 items-center rounded-full border border-transparent p-0 flex-shrink-0 overflow-hidden transition-colors ${enabled ? 'bg-emerald-600' : 'bg-stone-300'} ${required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <span className={`pointer-events-none absolute left-0.5 top-0.5 block w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-stone-100 flex items-center justify-between gap-3 bg-stone-50">
            <p className={`text-xs font-medium ${hasChanges ? 'text-amber-700' : 'text-stone-500'}`}>
              {hasChanges ? `${addedModules.length + removedModules.length} unsaved change${addedModules.length + removedModules.length === 1 ? '' : 's'}` : 'All changes saved'}
            </p>
            <button type="button" onClick={() => saveRole(selectedRole)} disabled={!hasChanges || savingRole === selectedRole}
              className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40">
              {savingRole === selectedRole ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-800">Portal Access Preview</h3>
            <p className="text-xs text-stone-500 mt-1">Enabled pages and capabilities for this role.</p>
            <div className="mt-3 space-y-2">
              {enabledModules.length ? enabledModules.map(module => (
                <div key={module.key} className="flex items-center gap-2 text-xs text-stone-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{module.label}</span>
                </div>
              )) : <p className="text-xs text-amber-700">No operational modules are enabled.</p>}
            </div>
          </div>

          {hasChanges && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">Change Impact</h3>
                  {addedModules.map(module => <p key={`add-${module.key}`} className="text-xs text-emerald-700 mt-1">Grant access: {module.label}</p>)}
                  {removedModules.map(module => <p key={`remove-${module.key}`} className="text-xs text-red-700 mt-1">Remove access: {module.label}</p>)}
                  <p className="text-xs text-amber-800 mt-2">Saving updates active users and protected APIs for this role.</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-emerald-800">Every saved change is stored in the role record and written to the audit log.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
function SystemAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [volumeSort, setVolumeSort] = useState('year');

  useEffect(() => {
    apiService.getSystemAnalytics()
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  const monthlyVolume = stats?.monthlyVolume || [];
  const sortedMonthlyVolume = volumeSort === 'month' ? sortRowsByMonthOnly(monthlyVolume) : sortRowsByMonthYear(monthlyVolume, 'asc');

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">System Analytics</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Coffee Batches', value: String(stats?.totalBatches || 0), sub: 'Active in system', color: 'bg-emerald-600' },
          { label: 'Active Users', value: String(stats?.activeUsers || 0), sub: 'Across all roles', color: 'bg-amber-600' },
          { label: 'Total Shipments', value: String(stats?.totalShipments || 0), sub: 'Current season', color: 'bg-violet-600' },
          { label: 'Quality Assessments', value: String(stats?.totalAssessments || 0), sub: 'Conducted', color: 'bg-sky-600' },
        ].map((s, i) => (
          <div key={i} className={`${s.color} text-white rounded-xl p-4 shadow-sm`}>
            <p className="text-xs text-white/70 mb-1">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-white/70 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-stone-800">Supply Chain Volume Trend (kg)</h3>
          <select value={volumeSort} onChange={e => setVolumeSort(e.target.value)} className={chartSortClass}>
            <option value="year">Year</option>
            <option value="month">Month</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={sortedMonthlyVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="collected" stroke="#1C3829" strokeWidth={2.5} name="Collected" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="processed" stroke="#d97706" strokeWidth={2.5} name="Processed" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="exported" stroke="#7c3aed" strokeWidth={2.5} name="Exported" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending Registrations', value: String(stats?.pendingFarmerCount || 0), sub: 'Waiting for approval' },
          { label: 'Compliance Rate', value: '100%', sub: 'Based on recorded audits' },
          { label: 'Active Zones', value: '4', sub: 'Operational regions' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-400">{s.label}</p>
            <p className="text-xl font-bold text-stone-800 mt-1">{s.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Security() {
  const [security, setSecurity] = useState<any>({});
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [eventSort, setEventSort] = useState('timestamp_desc');

  const loadSecurity = useCallback(() => {
    setLoading(true);
    Promise.all([apiService.getAdminSettings(), apiService.getAuditLogs(1, 20)])
      .then(([settings, logs]) => {
        setSecurity(settings.data.securityControls || {});
        setEvents(logs.data || []);
      })
      .catch(() => toast.error('Failed to load security controls'))
      .finally(() => setLoading(false));
  }, []);

  const updateSecurity = async (key: string, value: any) => {
    setSecurity((current: any) => ({ ...current, [key]: value }));
  };

  const saveSecuritySettings = async () => {
    setSaving(true);
    try {
      await apiService.updateAdminSetting('securityControls', security);
      toast.success('Security settings saved and audit logged');
      const [settings, logs] = await Promise.all([apiService.getAdminSettings(), apiService.getAuditLogs(1, 20)]);
      setSecurity(settings.data.securityControls || {});
      setEvents(logs.data || []);
    } catch {
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const visibleEvents = events
    .filter((event) => {
      const query = eventSearch.trim().toLowerCase();
      if (!query) return true;
      return [
        event.action,
        event.entityType,
        event.entityId,
        event.user?.fullName,
        event.user?.email,
        event.ipAddress,
        JSON.stringify(event.details || {}),
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
    })
    .sort((a, b) => {
      switch (eventSort) {
        case 'timestamp_asc': return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
        case 'action': return String(a.action || '').localeCompare(String(b.action || ''));
        case 'entity': return String(a.entityType || '').localeCompare(String(b.entityType || ''));
        case 'actor': return String(a.user?.fullName || a.user?.email || 'System').localeCompare(String(b.user?.fullName || b.user?.email || 'System'));
        case 'timestamp_desc':
        default: return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      }
    });

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Security Settings</h2>
          <p className="text-sm text-stone-500 mt-0.5">Persisted controls from admin_settings.securityControls</p>
        </div>
        <button
          onClick={saveSecuritySettings}
          disabled={saving}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Security Settings'}
        </button>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-5">
        {[
          { key: 'requireMfa', label: 'Multi-Factor Authentication', desc: 'Require MFA for sensitive operations and admin actions' },
          { key: 'auditLogEnabled', label: 'Immutable Audit Log', desc: 'Log all user actions, data modifications, and access events' },
        ].map(item => (
          <div key={item.key} className="flex items-start justify-between pb-4 border-b border-stone-100 last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-medium text-stone-800">{item.label}</p>
              <p className="text-xs text-stone-400 mt-0.5 max-w-sm">{item.desc}</p>
            </div>
            <button
              onClick={() => updateSecurity(item.key, !security[item.key])}
              className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ' + (security[item.key] ? 'bg-emerald-600' : 'bg-stone-300')}
            >
              <span className={'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' + (security[item.key] ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        ))}
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-xs text-stone-500">Session timeout minutes<input min={5} max={240} type="number" value={security.sessionTimeoutMinutes || 30} onChange={e => updateSecurity('sessionTimeoutMinutes', Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" /></label>
          <label className="text-xs text-stone-500">Retention years<input min={1} max={10} type="number" value={security.retentionYears || 5} onChange={e => updateSecurity('retentionYears', Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" /></label>
          <label className="text-xs text-stone-500">Breach notice hours<input min={1} max={72} type="number" value={security.breachNotificationHours || 72} onChange={e => updateSecurity('breachNotificationHours', Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" /></label>
          <label className="text-xs text-stone-500 sm:col-span-3">Encryption standard
            <select value={security.encryptionStandard || 'TLS 1.3 / AES-256'} onChange={e => updateSecurity('encryptionStandard', e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm bg-white">
              <option value="TLS 1.3 / AES-256">TLS 1.3 / AES-256</option>
              <option value="TLS 1.2+ / AES-256">TLS 1.2+ / AES-256</option>
              <option value="TLS 1.3 / AES-256 / Key Rotation">TLS 1.3 / AES-256 / Key Rotation</option>
            </select>
          </label>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <p className="text-xs font-semibold text-emerald-800">Settings are live-backed</p>
          <p className="text-xs text-emerald-700 mt-0.5">Saving writes to the database through the Admin settings API and creates a real audit log event.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-semibold text-stone-800">Recent Security & Audit Events</h3>
            <p className="text-xs text-stone-500 mt-0.5">Live records from the audit_logs table</p>
          </div>
          <button onClick={loadSecurity} className="px-3 py-2 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50">Refresh Events</button>
        </div>
        <div className="grid sm:grid-cols-[1fr_180px] gap-3 mb-4">
          <input
            type="search"
            value={eventSearch}
            onChange={e => setEventSearch(e.target.value)}
            placeholder="Search action, entity, actor, IP, details..."
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={eventSort}
            onChange={e => setEventSort(e.target.value)}
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="timestamp_desc">Newest first</option>
            <option value="timestamp_asc">Oldest first</option>
            <option value="action">Action A-Z</option>
            <option value="entity">Entity A-Z</option>
            <option value="actor">Actor A-Z</option>
          </select>
        </div>
        <p className="text-xs text-stone-500 mb-3">{visibleEvents.length} of {events.length} events shown</p>
        <div className="space-y-3">
          {events.length === 0 ? <p className="text-sm text-stone-500">No audit events recorded yet.</p> : visibleEvents.length === 0 ? <p className="text-sm text-stone-500">No audit events match the current search.</p> : visibleEvents.map((event) => (
            <div key={event.logId} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div>
                  <p className="font-medium text-stone-700">{event.action}</p>
                  <p className="text-stone-400">{event.entityType} {event.entityId ? `- ${String(event.entityId).slice(0, 18)}` : ''} by {event.user?.fullName || event.user?.email || 'System'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-stone-400">{new Date(event.timestamp).toLocaleString()}</span>
                <span className="text-stone-300 ml-2">{event.ipAddress || 'local'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function Compliance() {
  const items = [
    { id: 1, requirement: 'ECTA Export License Valid', status: 'compliant', expiry: '2025-06-30', notes: 'ETH-EXP-2024-089' },
    { id: 2, requirement: 'Organic Certification (IFOAM)', status: 'compliant', expiry: '2024-11-15', notes: 'Covers 3 farmers' },
    { id: 3, requirement: 'Fairtrade FLO Certification', status: 'compliant', expiry: '2025-02-28', notes: 'Annual audit completed' },
    { id: 4, requirement: 'Rainforest Alliance (SAN)', status: 'expiring-soon', expiry: '2024-04-30', notes: 'Renewal in progress' },
    { id: 5, requirement: 'UTZ Certified (Rainforest Alliance)', status: 'compliant', expiry: '2024-12-31', notes: '2 farmers covered' },
    { id: 6, requirement: 'EU Regulation (EUDR) Compliance', status: 'action-required', expiry: '2025-01-01', notes: 'Traceability data submission pending' },
    { id: 7, requirement: 'FSSC 22000 Food Safety', status: 'compliant', expiry: '2025-03-15', notes: 'Last audit: Sep 2023' },
    { id: 8, requirement: 'AML/KYC Due Diligence', status: 'compliant', expiry: null, notes: 'Annual review completed' },
  ];
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Compliance Monitoring</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Compliant', count: items.filter(i => i.status === 'compliant').length, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Expiring Soon', count: items.filter(i => i.status === 'expiring-soon').length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
          { label: 'Action Required', count: items.filter(i => i.status === 'action-required').length, color: 'text-red-700 bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 ${s.color} p-4`}>
            <p className="text-xs font-semibold uppercase">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.count}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Requirement', 'Status', 'Expiry Date', 'Notes', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{item.requirement}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      item.status === 'compliant' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'expiring-soon' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{item.expiry ? new Date(item.expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">{item.notes}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toast.info(`Opening compliance details for: ${item.requirement}`)}
                      className="text-xs text-emerald-700 hover:underline font-medium"
                    >
                      {item.status === 'action-required' ? 'Take Action' : item.status === 'expiring-soon' ? 'Renew' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Notifs() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getNotifications()
      .then(r => setNotifs(r.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Notifications</h2>
      {loading ? (
        <div className="p-10 flex justify-center text-stone-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-stone-200">
          <p className="text-stone-500">No notifications yet.</p>
        </div>
      ) : (
        notifs.map(n => (
          <div key={n.notificationId} className={`bg-white rounded-xl border p-4 shadow-sm flex gap-3 ${!n.read ? 'border-emerald-200' : 'border-stone-200'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100' : n.type === 'warning' ? 'bg-amber-100' : n.type === 'error' ? 'bg-red-100' : 'bg-blue-100'}`}>
              {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
               n.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
               n.type === 'error' ? <XCircle className="w-5 h-5 text-red-600" /> :
               <Activity className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-800">{n.title}</p>
                {!n.read && <span className="w-2 h-2 rounded-full bg-red-500" />}
              </div>
              <p className="text-sm text-stone-600 mt-0.5">{n.message}</p>
              <p className="text-xs text-stone-400 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function BlockchainAudit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    apiService.getAuditLogs(1, 100).then(r => setLogs(r.data || [])).catch(() => toast.error('Failed to load audit logs')).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const downloadCsv = async () => {
    try {
      const response = await apiService.exportAuditLogs();
      const blob = new Blob([response.data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Audit trail exported');
      load();
    } catch {
      toast.error('Failed to export audit logs');
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Immutable Audit Trail</h2>
          <p className="text-sm text-stone-500 mt-0.5">Real admin and operational audit events with export support</p>
        </div>
        <button onClick={downloadCsv} className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">Export CSV</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Audit Events', value: String(logs.length), color: 'bg-blue-600' },
          { label: 'Append Only', value: 'Enabled', color: 'bg-emerald-600' },
          { label: 'Export Ready', value: 'CSV', color: 'bg-violet-600' },
        ].map(item => (
          <div key={item.label} className={item.color + ' text-white rounded-xl p-4 shadow-sm'}>
            <p className="text-sm opacity-90">{item.label}</p>
            <p className="text-2xl font-bold mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Action', 'Entity', 'Actor', 'IP Address', 'Timestamp', 'Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {logs.map(log => (
                  <tr key={log.logId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{log.action}</td>
                    <td className="px-4 py-3 text-stone-600">{log.entityType}<p className="text-xs text-stone-400">{log.entityId || 'N/A'}</p></td>
                    <td className="px-4 py-3 text-stone-600">{log.user?.fullName || log.user?.email || 'System'}</td>
                    <td className="px-4 py-3 text-stone-500">{log.ipAddress || 'local'}</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-stone-500 max-w-xs truncate">{JSON.stringify(log.details || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <Link2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Audit Transparency</p>
          <p className="text-xs text-blue-700 mt-0.5">Critical admin actions, support updates, cooperative assignments, export events, and security changes are append-only and exportable for review.</p>
        </div>
      </div>
    </div>
  );
}
function SustainabilityReport() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getRequirementCompletion()
      .then(r => setRows(r.data?.sustainability || []))
      .catch(() => toast.error('Failed to load sustainability metrics'))
      .finally(() => setLoading(false));
  }, []);

  const totals = rows.reduce((acc, row) => {
    acc.carbonKg += Number(row.carbonKg || row.carbon_kg || 0);
    acc.waterLiters += Number(row.waterLiters || row.water_liters || 0);
    acc.socialScore += Number(row.socialScore || row.social_score || 0);
    acc.biodiversityScore += Number(row.biodiversityScore || row.biodiversity_score || 0);
    acc.soilHealthScore += Number(row.soilHealthScore || row.soil_health_score || 0);
    acc.genderInclusionScore += Number(row.genderInclusionScore || row.gender_inclusion_score || 0);
    return acc;
  }, { carbonKg: 0, waterLiters: 0, socialScore: 0, biodiversityScore: 0, soilHealthScore: 0, genderInclusionScore: 0 });
  const count = Math.max(rows.length, 1);
  const averageSocial = Math.round(totals.socialScore / count);
  const averageBiodiversity = Math.round(totals.biodiversityScore / count);
  const averageSoil = Math.round(totals.soilHealthScore / count);
  const averageGender = Math.round(totals.genderInclusionScore / count);
  const overallScore = Math.round((averageSocial + averageBiodiversity + averageSoil + averageGender) / 4);
  const sustainabilityMetrics = [
    { category: 'Carbon Recorded', value: `${Math.round(totals.carbonKg).toLocaleString()} kg`, target: 'Tracked', progress: rows.length ? 100 : 0, status: rows.length ? 'good' : 'warning' },
    { category: 'Water Usage Recorded', value: `${Math.round(totals.waterLiters).toLocaleString()} L`, target: 'Tracked', progress: rows.length ? 100 : 0, status: rows.length ? 'good' : 'warning' },
    { category: 'Social Impact Score', value: `${averageSocial}%`, target: '80%', progress: Math.min(100, averageSocial), status: averageSocial >= 80 ? 'excellent' : 'warning' },
    { category: 'Biodiversity Score', value: `${averageBiodiversity}%`, target: '75%', progress: Math.min(100, averageBiodiversity), status: averageBiodiversity >= 75 ? 'good' : 'warning' },
    { category: 'Soil Health Score', value: `${averageSoil}%`, target: '75%', progress: Math.min(100, averageSoil), status: averageSoil >= 75 ? 'good' : 'warning' },
    { category: 'Gender Inclusion Score', value: `${averageGender}%`, target: '75%', progress: Math.min(100, averageGender), status: averageGender >= 75 ? 'good' : 'warning' },
  ];

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Sustainability Report</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sustainabilityMetrics.map(m => (
          <div key={m.category} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-stone-800">{m.category}</p>
                <p className="text-xs text-stone-500 mt-0.5">Target: {m.target}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${m.status === 'excellent' ? 'bg-emerald-500' : m.status === 'good' ? 'bg-green-500' : 'bg-amber-500'}`} />
            </div>
            <p className="text-2xl font-bold text-stone-800 mb-2">{m.value}</p>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${m.status === 'excellent' ? 'bg-emerald-600' : m.status === 'good' ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${m.progress}%` }} />
            </div>
            <p className="text-xs text-stone-500 mt-1">{m.progress}% of target</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Environmental Impact</h3>
          <div className="space-y-3">
            {[
              ['Carbon Footprint', `${Math.round(totals.carbonKg).toLocaleString()} kg`, `${rows.length} metric records`],
              ['Water Usage', `${Math.round(totals.waterLiters).toLocaleString()} L`, 'Captured from sustainability forms'],
              ['Soil Health', `${averageSoil}%`, 'Average recorded score'],
              ['Biodiversity', `${averageBiodiversity}%`, 'Average recorded score'],
            ].map(([label, value, trend]) => (
              <div key={label} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{label}</p>
                  <p className="text-xs text-emerald-600">{trend}</p>
                </div>
                <span className="text-xl font-bold text-emerald-700">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Recent Sustainability Records</h3>
          <div className="space-y-3">
            {rows.slice(0, 6).map((metric: any) => (
              <div key={metric.metricId || metric.metric_id} className="p-3 border border-stone-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-stone-800">{metric.cooperative?.name || metric.farm_id || 'Cooperative'}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Recorded</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Social: {Number(metric.socialScore || metric.social_score || 0)}%</span>
                  <span className="text-stone-500">{new Date(metric.reportingPeriod || metric.reporting_period).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-stone-400">No sustainability records have been saved yet.</p>}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Overall Sustainability Score</h3>
            <p className="text-emerald-100 text-sm">Based on recorded database metrics</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{overallScore}%</p>
            <p className="text-emerald-100 text-xs mt-1">Database-backed score</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-emerald-400">
          {[
            { label: 'Environmental', value: `${Math.round((averageBiodiversity + averageSoil) / 2)}%` },
            { label: 'Social', value: `${averageSocial}%` },
            { label: 'Inclusion', value: `${averageGender}%` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-emerald-200 text-xs">{s.label}</p>
              <p className="text-white font-bold text-lg mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminOperations() {
  const [ops, setOps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [priceBaselines, setPriceBaselines] = useState<Record<string, number>>({});
  const load = useCallback(() => {
    setLoading(true);
    apiService.getAdminOperations().then(r => setOps(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const saveConfig = async () => {
    setSaving('systemConfiguration');
    try {
      await apiService.updateAdminSetting('systemConfiguration', ops?.systemConfiguration || {});
      toast.success('System configuration saved and audit logged');
      setPriceBaselines({});
      load();
    } catch {
      toast.error('Failed to save system configuration');
    } finally {
      setSaving(null);
    }
  };
  const saveIntegration = async (integration: any) => {
    setSaving(integration.name);
    try {
      await apiService.updateAdminIntegration(integration.name, integration);
      toast.success('Integration settings saved');
      load();
    } catch {
      toast.error('Failed to save integration');
    } finally {
      setSaving(null);
    }
  };
  const verifyBackup = async (target: string) => {
    setSaving(target);
    try {
      await apiService.runAdminBackup(target);
      toast.success('Backup verified and audit logged');
      load();
    } catch {
      toast.error('Failed to verify backup');
    } finally {
      setSaving(null);
    }
  };
  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  const config = ops?.systemConfiguration || {};
  const kpis = ops?.adminKpis || {};
  const marketPrices = { ...DEFAULT_ADMIN_MARKET_PRICES, ...(config.marketPrices || {}) };
  const marketGrades = DEFAULT_ADMIN_MARKET_PRICES.grades.map((fallback) => {
    const configured = (marketPrices.grades || []).find((grade: any) => grade.key === fallback.key) || {};
    return { ...fallback, ...configured };
  });
  const updateBaselinePrice = (value: string) => {
    const nextPrice = Number(value || 0);
    const currentPrice = Number(marketPrices.baselineRatePerKg || 0);
    const previousPrice = priceBaselines.baseline ?? currentPrice;
    setOps((prev: any) => ({
      ...prev,
      systemConfiguration: {
        ...prev.systemConfiguration,
        marketPrices: {
          ...marketPrices,
          updatedAt: new Date().toISOString(),
          baselineRatePerKg: nextPrice,
          previousBaselineRatePerKg: currentPrice === nextPrice ? Number(marketPrices.previousBaselineRatePerKg || previousPrice) : previousPrice,
        },
      },
    }));
  };
  const updateMarketPrice = (key: string, value: string) => {
    const nextPrice = Number(value || 0);
    const nextGrades = marketGrades.map((grade: any) => {
      if (grade.key !== key) return grade;
      const currentPrice = Number(grade.pricePerKg || 0);
      const baselinePrice = priceBaselines[key] ?? currentPrice;
      const previousPrice = currentPrice === nextPrice ? Number(grade.previousPricePerKg || baselinePrice) : baselinePrice;
      return { ...grade, pricePerKg: nextPrice, previousPricePerKg: previousPrice };
    });
    setOps((prev: any) => ({
      ...prev,
      systemConfiguration: {
        ...prev.systemConfiguration,
        marketPrices: {
          ...marketPrices,
          updatedAt: new Date().toISOString(),
          grades: nextGrades,
        },
      },
    }));
  };
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">System Configuration & Operations</h2>
        <button onClick={load} className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50">Refresh</button>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-3">What Admin Controls</h3>
          <div className="grid gap-2">
            {(ops?.adminControl?.responsibilities || []).map((item: string) => (
              <div key={item} className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-950">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-3">Admin Restrictions</h3>
          <div className="grid gap-2">
            {(ops?.adminControl?.restrictions || []).map((item: string) => (
              <div key={item} className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-900">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Uptime', kpis.uptimeAvailability],
          ['API response', kpis.apiResponseTime],
          ['Onboarding', kpis.userOnboardingTurnaround],
          ['Backup success', kpis.backupSuccessRate],
          ['Incident response', kpis.securityIncidentResponse],
          ['Audit completeness', kpis.auditLogCompleteness],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-400">{label}</p>
            <p className="text-lg font-bold text-stone-800 mt-1">{value || 'N/A'}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-stone-800">Market Price Settings</h3>
            <p className="text-xs text-stone-500 mt-0.5">Baseline rate pays farmers at intake. Grade prices are export premium references after quality assessment.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">{marketPrices.currency}/kg</span>
            <button onClick={saveConfig} disabled={saving === 'systemConfiguration'} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-60">
              {saving === 'systemConfiguration' ? 'Saving...' : 'Save Prices'}
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 mb-4">
          <p className="text-sm font-semibold text-emerald-950">Farmer baseline intake rate</p>
          <div className="mt-3 grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <label className="text-xs text-emerald-800">
              Current baseline rate
              <input
                type="number"
                min="0"
                value={marketPrices.baselineRatePerKg}
                onFocus={() => setPriceBaselines(prev => ({ ...prev, baseline: prev.baseline ?? Number(marketPrices.baselineRatePerKg || 0) }))}
                onChange={(e) => updateBaselinePrice(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-emerald-100 text-sm text-stone-800 bg-white"
              />
            </label>
            <p className="text-xs text-emerald-800">Previous baseline updates automatically: RWF {Number(marketPrices.previousBaselineRatePerKg || 0).toLocaleString()}/kg</p>
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(config).filter(([key]) => key !== 'marketPrices').map(([key, value]) => (
          <div key={key} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-400 uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
            {typeof value === 'boolean' ? (
              <select
                value={value ? 'true' : 'false'}
                onChange={e => setOps((prev: any) => ({ ...prev, systemConfiguration: { ...prev.systemConfiguration, [key]: e.target.value === 'true' } }))}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            ) : typeof value === 'number' ? (
              <input
                type="number"
                value={value}
                onChange={e => setOps((prev: any) => ({ ...prev, systemConfiguration: { ...prev.systemConfiguration, [key]: Number(e.target.value) } }))}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800"
              />
            ) : Array.isArray(value) ? (
              <input
                value={value.join(', ')}
                onChange={e => setOps((prev: any) => ({ ...prev, systemConfiguration: { ...prev.systemConfiguration, [key]: e.target.value.split(',').map(v => v.trim()).filter(Boolean) } }))}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800"
              />
            ) : (
              <input
                value={String(value)}
                onChange={e => setOps((prev: any) => ({ ...prev, systemConfiguration: { ...prev.systemConfiguration, [key]: e.target.value } }))}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-800"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={saveConfig} disabled={saving === 'systemConfiguration'} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
          {saving === 'systemConfiguration' ? 'Saving...' : 'Save System Configuration & Prices'}
        </button>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100"><h3 className="font-semibold text-stone-800">API & Integration Management</h3></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-stone-50">{['Connector','Status','Rate Limit','API Key','Action'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-stone-50">
              {(ops?.integrations || []).map((i: any) => (
                <tr key={i.name}>
                  <td className="px-4 py-3 font-medium text-stone-800">{i.name}<p className="text-xs text-stone-400">Last sync: {new Date(i.lastSync).toLocaleString()}</p></td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">{i.status}</span></td>
                  <td className="px-4 py-3 text-stone-600">{i.rateLimit}</td>
                  <td className="px-4 py-3 text-stone-500">{i.apiKeyMasked || 'Not configured'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => saveIntegration(i)} disabled={saving === i.name} className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs disabled:opacity-60">
                      {saving === i.name ? 'Saving...' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Performance Monitoring</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['CPU', `${ops?.performance?.cpu}%`],
              ['Memory', `${ops?.performance?.memory}%`],
              ['Response time', `${ops?.performance?.responseMs} ms`],
              ['Active users', ops?.performance?.activeUsers],
              ['Audit events', ops?.performance?.auditEvents],
              ['Scale mode', ops?.performance?.scaleMode],
            ].map(([label, value]) => (
              <div key={label} className="bg-stone-50 rounded-lg p-3">
                <p className="text-xs text-stone-400">{label}</p>
                <p className="font-semibold text-stone-800 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Database & Backup Management</h3>
          <div className="space-y-3">
            {(ops?.backups || []).map((b: any) => (
              <div key={b.target} className="p-3 border border-stone-100 rounded-lg">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-stone-800">{b.target}</p><span className="text-xs text-emerald-700">{b.status}</span></div>
                <p className="text-xs text-stone-500 mt-1">{b.frequency} - retention {b.retention}</p>
                <p className="text-xs text-stone-400 mt-1">Last verified: {b.lastVerified ? new Date(b.lastVerified).toLocaleString() : 'Not verified'}</p>
                <button onClick={() => verifyBackup(b.target)} disabled={saving === b.target} className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60">
                  {saving === b.target ? 'Verifying...' : 'Run / Verify Backup'}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Security & Audit Controls</h3>
          <div className="space-y-3">
            {Object.entries(ops?.security || {}).map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div><p className="text-xs font-semibold text-emerald-800">{key.replace(/([A-Z])/g, ' $1')}</p><p className="text-xs text-emerald-700">{String(value)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportAdministration() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sort, setSort] = useState('updated_desc');
  const load = useCallback(() => {
    setLoading(true);
    apiService.getAdminOperations().then(r => setTickets(r.data.supportTickets || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const update = async (ticketId: string, status: string) => {
    try {
      await apiService.updateAdminSupportTicket(ticketId, { status });
      toast.success('Ticket updated');
      load();
    } catch {
      toast.error('Could not update ticket');
    }
  };
  const matches = (ticket: any) => {
    const query = search.trim().toLowerCase();
    const role = ticket.farmer?.role?.roleName || 'User';
    const text = [
      ticket.subject,
      ticket.description,
      ticket.category,
      ticket.status,
      role,
      ticket.farmer?.fullName,
      ticket.farmer?.email,
    ].filter(Boolean).join(' ').toLowerCase();
    const statusMatches = statusFilter === 'All' || ticket.status === statusFilter;
    return statusMatches && (!query || text.includes(query));
  };
  const sortedTickets = tickets.filter(matches).sort((a, b) => {
    switch (sort) {
      case 'updated_asc': return new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime();
      case 'created_desc': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      case 'created_asc': return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case 'role': return String(a.farmer?.role?.roleName || '').localeCompare(String(b.farmer?.role?.roleName || ''));
      case 'status': return String(a.status || '').localeCompare(String(b.status || ''));
      case 'updated_desc':
      default: return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    }
  });
  const openCount = tickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length;
  const qualityCount = tickets.filter(t => String(t.farmer?.role?.roleName || '').toLowerCase().includes('quality')).length;
  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Support Ticket Inbox</h2>
          <p className="text-sm text-stone-500 mt-0.5">Receive and manage support requests from Farmers, Aggregators, Processors, Quality, Logistics, and Exporters</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-semibold">{openCount} open</span>
          <span className="text-xs bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-semibold">{qualityCount} quality requests</span>
        </div>
      </div>
      {loading ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div> : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-500">No support tickets yet.</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="grid lg:grid-cols-[1fr_180px_180px] gap-3">
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search subject, category, requester, role..."
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
                {['All','Open','In Progress','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
                <option value="updated_desc">Recently updated</option>
                <option value="updated_asc">Oldest updated</option>
                <option value="created_desc">Newest created</option>
                <option value="created_asc">Oldest created</option>
                <option value="role">Role A-Z</option>
                <option value="status">Status A-Z</option>
              </select>
            </div>
            <p className="text-xs text-stone-500 mt-3">{sortedTickets.length} of {tickets.length} tickets shown</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Subject', 'Requester', 'Role', 'Category', 'Description', 'Created', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {sortedTickets.map(t => (
                    <tr key={t.ticketId} className="hover:bg-stone-50 align-top">
                      <td className="px-4 py-3 min-w-[220px]">
                        <p className="font-semibold text-stone-800">{t.subject}</p>
                        <p className="text-xs text-stone-400 font-mono mt-1">{t.ticketId?.substring(0, 12)}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[190px]">
                        <p className="font-medium text-stone-700">{t.farmer?.fullName || 'Requester'}</p>
                        <p className="text-xs text-stone-500">{t.farmer?.email || 'No email'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold whitespace-nowrap">
                          {t.farmer?.role?.roleName || 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{t.category || 'General'}</td>
                      <td className="px-4 py-3 text-stone-600 min-w-[320px]">{t.description}</td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(t.createdAt || t.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <select value={t.status} onChange={e => update(t.ticketId, e.target.value)} className="px-3 py-2 rounded-lg border border-stone-200 text-sm bg-white">
                          {['Open','In Progress','Resolved','Closed'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedTickets.length === 0 && <p className="text-center text-stone-400 py-8">No tickets match the current filters.</p>}
          </div>
        </>
      )}
    </div>
  );
}

function RequirementCompletion() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bulkJson, setBulkJson] = useState('[{\"fullName\":\"Example Farmer\",\"email\":\"farmer@example.com\",\"phone\":\"+2507...\",\"farmName\":\"Example Farm\",\"farmSizeHa\":1.5,\"gpsLocation\":\"Kigali City, Gasabo\",\"coordinates\":\"-1.933775, 30.132433\"}]');
  const [bulkForm, setBulkForm] = useState({ cooperativeId: '', aggregatorId: '', defaultPassword: 'Coffee@123' });
  const [auditForm, setAuditForm] = useState({ title: '', auditType: 'Traceability', scheduledDate: '', ownerRole: 'ADMIN', riskScore: 20 });
  const [sustainForm, setSustainForm] = useState({
    coopId: '', carbonKg: '', waterLiters: '', socialScore: '', reportingPeriod: '',
    biodiversityScore: '', soilHealthScore: '', genderInclusionScore: '', improvementGoals: ''
  });
  const [directoryForm, setDirectoryForm] = useState({
    sourceName: 'IMPEXCOR Local Directory',
    records: '[{\"recordType\":\"USER\",\"roleName\":\"AGGREGATOR\",\"fullName\":\"Directory User\",\"email\":\"directory.user@example.com\",\"phone\":\"+2507...\",\"status\":\"active\"}]'
  });
  const [rfidForm, setRfidForm] = useState({
    rfidTag: '',
    qrCode: '',
    batchId: '',
    readerId: 'admin-test-reader',
    checkpointType: 'RFID Scan',
    locationName: ''
  });
  const [binForm, setBinForm] = useState({ warehouseId: '', binCode: '', capacityKg: '', status: 'Available', notes: '' });
  const [mobileScanForm, setMobileScanForm] = useState({ scanCode: '', movementType: 'QR Inventory Scan', quantityKg: '', locationName: '' });
  const [complianceForm, setComplianceForm] = useState({ batchId: '', shipmentId: '' });
  const [auditPackageForm, setAuditPackageForm] = useState({ scopeType: 'Batch', scopeId: '' });
  const [feedbackForm, setFeedbackForm] = useState({ referenceCode: '', buyer: '', qualityScore: '5', deliveryScore: '5', documentationScore: '5', communicationScore: '5', comments: '' });
  const [financeForm, setFinanceForm] = useState({ referenceCode: '', financeType: 'Commercial Invoice', provider: '', referenceNo: '', amount: '', currency: 'USD', status: 'Pending', dueDate: '', notes: '' });
  const [sustainCalcForm, setSustainCalcForm] = useState({ scope: 'Cooperative', scopeId: '' });
  const [biForm, setBiForm] = useState({ toolName: 'Power BI', datasetName: 'traceability', format: 'JSON' });
  const [ledgerForm, setLedgerForm] = useState({ entityType: 'CoffeeBatch', entityId: '' });
  const [predictForm, setPredictForm] = useState({ modelType: 'SupplyQualityForecast', trainingWindow: '12 months' });
  const [jitForm, setJitForm] = useState({ planType: 'ProcessingAndExport', dailyCapacityKg: '1000', vesselCutoffDate: '' });
  const [verifyForm, setVerifyForm] = useState({ scopeId: '', minimumScore: '75' });
  const [retentionForm, setRetentionForm] = useState({ dataType: 'AuditLog', cutoffDate: '', action: 'Preview', confirmExecution: false });

  const parseBulkFarmers = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) return JSON.parse(trimmed);
    const [headerLine, ...lines] = trimmed.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map(h => h.trim());
    return lines.map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.reduce<Record<string, any>>((row, header, index) => {
        row[header] = values[index] || '';
        return row;
      }, {});
    });
  };

  const load = useCallback(() => {
    setLoading(true);
    apiService.getRequirementCompletion()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load requirement completion data'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitBulk = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const farmers = parseBulkFarmers(bulkJson);
      await apiService.bulkImportFarmers({ ...bulkForm, farmers });
      toast.success('Bulk farmer import completed');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Invalid CSV/JSON or import failed');
    }
  };

  const loadBulkFile = async (file?: File) => {
    if (!file) return;
    setBulkJson(await file.text());
  };

  const submitAudit = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiService.createAuditSchedule({ ...auditForm, checklist: ['Traceability complete', 'Quality certificate present', 'Audit logs reviewed'] });
    toast.success('Audit schedule created');
    setAuditForm({ title: '', auditType: 'Traceability', scheduledDate: '', ownerRole: 'ADMIN', riskScore: 20 });
    load();
  };

  const submitSustainability = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiService.createSustainabilityMetric(sustainForm);
    toast.success('Sustainability metric saved');
    setSustainForm({ coopId: '', carbonKg: '', waterLiters: '', socialScore: '', reportingPeriod: '', biodiversityScore: '', soilHealthScore: '', genderInclusionScore: '', improvementGoals: '' });
    load();
  };

  const submitDirectorySync = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const records = parseBulkFarmers(directoryForm.records);
      await apiService.syncBusinessDirectory({ sourceName: directoryForm.sourceName, records });
      toast.success('Business directory records synced');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Invalid directory JSON/CSV or sync failed');
    }
  };

  const loadDirectoryFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setDirectoryForm(f => ({ ...f, records: text }));
  };

  const submitRfidScan = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiService.createRfidScanEvent({
        ...rfidForm,
        batchId: rfidForm.batchId || undefined,
        qrCode: rfidForm.qrCode || undefined,
        locationName: rfidForm.locationName || undefined,
      });
      toast.success('RFID scan event recorded');
      setRfidForm({ rfidTag: '', qrCode: '', batchId: '', readerId: 'admin-test-reader', checkpointType: 'RFID Scan', locationName: '' });
      load();
    } catch (error: any) {
      toast.error(error?.message || 'RFID scan failed');
    }
  };

  const runAdminAction = async (event: React.FormEvent, action: () => Promise<any>, success: string) => {
    event.preventDefault();
    try {
      await action();
      toast.success(success);
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Action failed');
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Requirement Completion Workbench</h2>
        <p className="text-sm text-stone-500 mt-0.5">Business directory sync, RFID scan events, bulk import, certification sandbox integrations, inventory alerts, predictive analytics, audit schedules, access requests, farmer services, lab sync, buyer quality requirements, and sustainability tracking.</p>
      </div>

      {loading ? <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div> : (
        <>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {(data?.completionStatus || []).map((item: any) => (
              <div key={item.item} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <p className="font-semibold text-stone-800 text-sm">{item.item}</p>
                <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${item.status === 'Implemented' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span>
                <p className="text-xs text-stone-500 mt-2">{item.evidence}</p>
              </div>
            ))}
          </div>

          <div className="grid xl:grid-cols-3 gap-5">
            <form onSubmit={submitDirectorySync} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Business Directory Sync</h3>
              <input required value={directoryForm.sourceName} onChange={e => setDirectoryForm(f => ({ ...f, sourceName: e.target.value }))} placeholder="Directory source name" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="file" accept=".csv,.txt,.json" onChange={e => loadDirectoryFile(e.target.files?.[0])} className="w-full text-xs text-stone-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 file:font-semibold" />
              <p className="text-xs text-stone-500">User CSV headers: recordType,roleName,fullName,email,phone,status. Cooperative records use recordType=COOPERATIVE,name,district,zone,managerId.</p>
              <textarea value={directoryForm.records} onChange={e => setDirectoryForm(f => ({ ...f, records: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-xs min-h-[130px] font-mono" />
              <button className="px-4 py-2 bg-sky-700 text-white rounded-lg text-sm font-semibold">Sync Directory</button>
            </form>

            <form onSubmit={submitRfidScan} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">RFID Scan Event</h3>
              <input required value={rfidForm.rfidTag} onChange={e => setRfidForm(f => ({ ...f, rfidTag: e.target.value }))} placeholder="RFID tag" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={rfidForm.qrCode} onChange={e => setRfidForm(f => ({ ...f, qrCode: e.target.value }))} placeholder="Batch QR code (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={rfidForm.batchId} onChange={e => setRfidForm(f => ({ ...f, batchId: e.target.value }))} placeholder="Batch ID (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={rfidForm.readerId} onChange={e => setRfidForm(f => ({ ...f, readerId: e.target.value }))} placeholder="Reader ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <select value={rfidForm.checkpointType} onChange={e => setRfidForm(f => ({ ...f, checkpointType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                {['RFID Scan','Collection Intake','Washing Station Arrival','Processing Checkpoint','Warehouse Movement','Export Handoff'].map(v => <option key={v}>{v}</option>)}
              </select>
              <input value={rfidForm.locationName} onChange={e => setRfidForm(f => ({ ...f, locationName: e.target.value }))} placeholder="Checkpoint location" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-amber-700 text-white rounded-lg text-sm font-semibold">Record RFID Scan</button>
            </form>

            <form onSubmit={submitBulk} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Bulk Farmer Cooperative Import</h3>
              <input required value={bulkForm.cooperativeId} onChange={e => setBulkForm(f => ({ ...f, cooperativeId: e.target.value }))} placeholder="Cooperative ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={bulkForm.aggregatorId} onChange={e => setBulkForm(f => ({ ...f, aggregatorId: e.target.value }))} placeholder="Aggregator ID (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="file" accept=".csv,.txt,.json" onChange={e => loadBulkFile(e.target.files?.[0])} className="w-full text-xs text-stone-600 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-semibold" />
              <p className="text-xs text-stone-500">CSV headers: fullName,email,phone,farmName,farmSizeHa,gpsLocation,coordinates</p>
              <textarea value={bulkJson} onChange={e => setBulkJson(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-xs min-h-[140px] font-mono" />
              <button className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold">Import Farmers</button>
            </form>

            <form onSubmit={submitAudit} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Compliance & Audit Schedule</h3>
              <input required value={auditForm.title} onChange={e => setAuditForm(f => ({ ...f, title: e.target.value }))} placeholder="Audit title" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <select value={auditForm.auditType} onChange={e => setAuditForm(f => ({ ...f, auditType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                {['Traceability','Inventory','Quality','Security','Export Compliance'].map(v => <option key={v}>{v}</option>)}
              </select>
              <input required type="date" value={auditForm.scheduledDate} onChange={e => setAuditForm(f => ({ ...f, scheduledDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={auditForm.riskScore} onChange={e => setAuditForm(f => ({ ...f, riskScore: Number(e.target.value) }))} placeholder="Risk score" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-semibold">Schedule Audit</button>
            </form>

            <form onSubmit={submitSustainability} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Sustainability Metric</h3>
              <input required value={sustainForm.coopId} onChange={e => setSustainForm(f => ({ ...f, coopId: e.target.value }))} placeholder="Cooperative ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input required type="number" value={sustainForm.carbonKg} onChange={e => setSustainForm(f => ({ ...f, carbonKg: e.target.value }))} placeholder="Carbon kg" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input required type="number" value={sustainForm.waterLiters} onChange={e => setSustainForm(f => ({ ...f, waterLiters: e.target.value }))} placeholder="Water liters" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input required type="number" value={sustainForm.socialScore} onChange={e => setSustainForm(f => ({ ...f, socialScore: e.target.value }))} placeholder="Social score" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={sustainForm.biodiversityScore} onChange={e => setSustainForm(f => ({ ...f, biodiversityScore: e.target.value }))} placeholder="Biodiversity score" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={sustainForm.soilHealthScore} onChange={e => setSustainForm(f => ({ ...f, soilHealthScore: e.target.value }))} placeholder="Soil health score" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={sustainForm.genderInclusionScore} onChange={e => setSustainForm(f => ({ ...f, genderInclusionScore: e.target.value }))} placeholder="Gender inclusion score" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={sustainForm.improvementGoals} onChange={e => setSustainForm(f => ({ ...f, improvementGoals: e.target.value }))} placeholder="Improvement goals, comma separated" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input required type="date" value={sustainForm.reportingPeriod} onChange={e => setSustainForm(f => ({ ...f, reportingPeriod: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold">Save Metric</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.createWarehouseBin(binForm), 'Warehouse bin saved')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Warehouse / Bin Management</h3>
              <input required value={binForm.warehouseId} onChange={e => setBinForm(f => ({ ...f, warehouseId: e.target.value }))} placeholder="Warehouse ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input required value={binForm.binCode} onChange={e => setBinForm(f => ({ ...f, binCode: e.target.value }))} placeholder="Bin code" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={binForm.capacityKg} onChange={e => setBinForm(f => ({ ...f, capacityKg: e.target.value }))} placeholder="Capacity kg" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <select value={binForm.status} onChange={e => setBinForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['Available','Occupied','Full','Maintenance'].map(v => <option key={v}>{v}</option>)}</select>
              <input value={binForm.notes} onChange={e => setBinForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-semibold">Save Bin</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.createMobileInventoryScan(mobileScanForm), 'Mobile inventory scan recorded')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Mobile Inventory Scanning</h3>
              <input required value={mobileScanForm.scanCode} onChange={e => setMobileScanForm(f => ({ ...f, scanCode: e.target.value }))} placeholder="QR code, RFID tag, or batch ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <select value={mobileScanForm.movementType} onChange={e => setMobileScanForm(f => ({ ...f, movementType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['QR Inventory Scan','Inbound','Transfer','Outbound','Adjustment'].map(v => <option key={v}>{v}</option>)}</select>
              <input type="number" value={mobileScanForm.quantityKg} onChange={e => setMobileScanForm(f => ({ ...f, quantityKg: e.target.value }))} placeholder="Quantity kg" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={mobileScanForm.locationName} onChange={e => setMobileScanForm(f => ({ ...f, locationName: e.target.value }))} placeholder="Location name" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-cyan-700 text-white rounded-lg text-sm font-semibold">Record Scan</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.runComplianceEvaluation(complianceForm), 'Compliance evaluation saved')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Compliance Rule Engine</h3>
              <input value={complianceForm.batchId} onChange={e => setComplianceForm(f => ({ ...f, batchId: e.target.value }))} placeholder="Batch ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={complianceForm.shipmentId} onChange={e => setComplianceForm(f => ({ ...f, shipmentId: e.target.value }))} placeholder="Shipment ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-semibold">Evaluate Compliance</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.generateAuditPackage(auditPackageForm), 'Audit package generated')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Audit Package Generation</h3>
              <select value={auditPackageForm.scopeType} onChange={e => setAuditPackageForm(f => ({ ...f, scopeType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['Batch','Shipment'].map(v => <option key={v}>{v}</option>)}</select>
              <input required value={auditPackageForm.scopeId} onChange={e => setAuditPackageForm(f => ({ ...f, scopeId: e.target.value }))} placeholder="Batch ID or Shipment ID" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-indigo-700 text-white rounded-lg text-sm font-semibold">Generate Package</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.runSecurityMonitoring(), 'Security monitoring completed')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Advanced Security Monitoring</h3>
              <p className="text-xs text-stone-500">Checks failed login bursts, role/permission changes, and unusual export activity in the last 24 hours.</p>
              <button className="px-4 py-2 bg-rose-700 text-white rounded-lg text-sm font-semibold">Run Security Monitor</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.createBuyerFeedback(feedbackForm), 'Buyer feedback saved')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Buyer Feedback</h3>
              <input value={feedbackForm.referenceCode} onChange={e => setFeedbackForm(f => ({ ...f, referenceCode: e.target.value }))} placeholder="Order reference code" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={feedbackForm.buyer} onChange={e => setFeedbackForm(f => ({ ...f, buyer: e.target.value }))} placeholder="Buyer name" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-2">
                {(['qualityScore','deliveryScore','documentationScore','communicationScore'] as const).map(key => <input key={key} type="number" min="0" max="5" value={feedbackForm[key]} onChange={e => setFeedbackForm(f => ({ ...f, [key]: e.target.value }))} placeholder={key} className="px-3 py-2 border rounded-lg text-sm" />)}
              </div>
              <textarea value={feedbackForm.comments} onChange={e => setFeedbackForm(f => ({ ...f, comments: e.target.value }))} placeholder="Comments" className="w-full px-3 py-2 border rounded-lg text-sm min-h-[70px]" />
              <button className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold">Save Feedback</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.createTradeFinanceRecord(financeForm), 'Trade finance record saved')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Trade Finance Tracking</h3>
              <input value={financeForm.referenceCode} onChange={e => setFinanceForm(f => ({ ...f, referenceCode: e.target.value }))} placeholder="Order reference code" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <select value={financeForm.financeType} onChange={e => setFinanceForm(f => ({ ...f, financeType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['Commercial Invoice','Letter of Credit','Bank Transfer','Documentary Collection'].map(v => <option key={v}>{v}</option>)}</select>
              <input value={financeForm.provider} onChange={e => setFinanceForm(f => ({ ...f, provider: e.target.value }))} placeholder="Bank/provider" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={financeForm.referenceNo} onChange={e => setFinanceForm(f => ({ ...f, referenceNo: e.target.value }))} placeholder="Reference no" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-2"><input type="number" value={financeForm.amount} onChange={e => setFinanceForm(f => ({ ...f, amount: e.target.value }))} placeholder="Amount" className="px-3 py-2 border rounded-lg text-sm" /><input value={financeForm.currency} onChange={e => setFinanceForm(f => ({ ...f, currency: e.target.value }))} placeholder="Currency" className="px-3 py-2 border rounded-lg text-sm" /></div>
              <select value={financeForm.status} onChange={e => setFinanceForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['Pending','Submitted','Approved','Settled','Rejected'].map(v => <option key={v}>{v}</option>)}</select>
              <input type="date" value={financeForm.dueDate} onChange={e => setFinanceForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input value={financeForm.notes} onChange={e => setFinanceForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-yellow-700 text-white rounded-lg text-sm font-semibold">Save Finance Record</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.runSustainabilityCalculation(sustainCalcForm), 'Sustainability calculation completed')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Sustainability Calculation Engine</h3>
              <select value={sustainCalcForm.scope} onChange={e => setSustainCalcForm(f => ({ ...f, scope: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['Cooperative','System'].map(v => <option key={v}>{v}</option>)}</select>
              <input value={sustainCalcForm.scopeId} onChange={e => setSustainCalcForm(f => ({ ...f, scopeId: e.target.value }))} placeholder="Cooperative ID optional" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-semibold">Run Calculation</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.createBiToolExport(biForm), 'BI export package generated')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">External BI Tool Export</h3>
              <select value={biForm.toolName} onChange={e => setBiForm(f => ({ ...f, toolName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['Power BI','Tableau','Metabase','Looker Studio'].map(v => <option key={v}>{v}</option>)}</select>
              <select value={biForm.datasetName} onChange={e => setBiForm(f => ({ ...f, datasetName: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['traceability','inventory','quality','logistics','sustainability'].map(v => <option key={v}>{v}</option>)}</select>
              <select value={biForm.format} onChange={e => setBiForm(f => ({ ...f, format: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['JSON','CSV'].map(v => <option key={v}>{v}</option>)}</select>
              <button className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">Generate BI Export</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.anchorBlockchainLedger(ledgerForm), 'Ledger entry anchored')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Blockchain Immutability Anchor</h3>
              <select value={ledgerForm.entityType} onChange={e => setLedgerForm(f => ({ ...f, entityType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['CoffeeBatch','QualityAssessment','ShippingRecord','PaymentTransaction','AuditLog'].map(v => <option key={v}>{v}</option>)}</select>
              <input required value={ledgerForm.entityId} onChange={e => setLedgerForm(f => ({ ...f, entityId: e.target.value }))} placeholder="Record ID to hash-anchor" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <p className="text-xs text-stone-500">Creates a hash-chain ledger entry from the selected record snapshot.</p>
              <button className="px-4 py-2 bg-purple-700 text-white rounded-lg text-sm font-semibold">Anchor Record</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.runPredictiveModel(predictForm), 'Predictive model run saved')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Predictive Analytics / ML</h3>
              <select value={predictForm.modelType} onChange={e => setPredictForm(f => ({ ...f, modelType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['SupplyQualityForecast','TransitDelayForecast','ExportReadinessForecast'].map(v => <option key={v}>{v}</option>)}</select>
              <select value={predictForm.trainingWindow} onChange={e => setPredictForm(f => ({ ...f, trainingWindow: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['3 months','6 months','12 months','All available data'].map(v => <option key={v}>{v}</option>)}</select>
              <button className="px-4 py-2 bg-fuchsia-700 text-white rounded-lg text-sm font-semibold">Run Forecast</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.generateJitPlan(jitForm), 'JIT optimization plan generated')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Just-in-Time Optimization</h3>
              <select value={jitForm.planType} onChange={e => setJitForm(f => ({ ...f, planType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['ProcessingAndExport','QualityHandoff','ShipmentReadiness'].map(v => <option key={v}>{v}</option>)}</select>
              <input type="number" value={jitForm.dailyCapacityKg} onChange={e => setJitForm(f => ({ ...f, dailyCapacityKg: e.target.value }))} placeholder="Daily capacity kg" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="date" value={jitForm.vesselCutoffDate} onChange={e => setJitForm(f => ({ ...f, vesselCutoffDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-semibold">Generate JIT Plan</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.verifySustainabilityMetrics(verifyForm), 'Sustainability verification completed')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Sustainability Verification</h3>
              <input value={verifyForm.scopeId} onChange={e => setVerifyForm(f => ({ ...f, scopeId: e.target.value }))} placeholder="Cooperative ID optional" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={verifyForm.minimumScore} onChange={e => setVerifyForm(f => ({ ...f, minimumScore: e.target.value }))} placeholder="Minimum verification score" className="w-full px-3 py-2 border rounded-lg text-sm" />
              <button className="px-4 py-2 bg-lime-700 text-white rounded-lg text-sm font-semibold">Verify Metrics</button>
            </form>

            <form onSubmit={e => runAdminAction(e, () => apiService.runRetentionArchive(retentionForm), 'Retention/archive job created')} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-stone-800">Data Retention / Archive</h3>
              <select value={retentionForm.dataType} onChange={e => setRetentionForm(f => ({ ...f, dataType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['AuditLog','Notification','SupportTicket'].map(v => <option key={v}>{v}</option>)}</select>
              <input type="date" value={retentionForm.cutoffDate} onChange={e => setRetentionForm(f => ({ ...f, cutoffDate: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <select value={retentionForm.action} onChange={e => setRetentionForm(f => ({ ...f, action: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{['Preview','Archive','Anonymize'].map(v => <option key={v}>{v}</option>)}</select>
              <label className="flex items-start gap-2 text-xs text-stone-600">
                <input type="checkbox" checked={retentionForm.confirmExecution} onChange={e => setRetentionForm(f => ({ ...f, confirmExecution: e.target.checked }))} className="mt-0.5" />
                Confirm execution for Archive/Anonymize. Preview never changes data.
              </label>
              <button className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-semibold">Create Job</button>
            </form>
          </div>

          <div className="grid xl:grid-cols-2 gap-5">
            {[
              ['Integration Connectors', data?.integrations || [], ['name','status','rate_limit','last_error']],
              ['Business Directory Syncs', data?.directorySyncs || [], ['source_name','record_type','external_id','matched_entity_type','status','error_message']],
              ['RFID Scan Events', data?.rfidScanEvents || [], ['rfid_tag','qr_code','farm_name','reader_id','checkpoint_type','status']],
              ['Mass Balance Report', data?.massBalance || [], ['qrCode','farmName','inputKg','outputKg','exportedKg','varianceKg','status']],
              ['Warehouse Bins', data?.warehouseBins || [], ['warehouse_name','bin_code','capacity_kg','status','notes']],
              ['Mobile Inventory Scans', data?.mobileInventoryScans || [], ['scan_code','qr_code','farm_name','movement_type','quantity_kg','status']],
              ['Compliance Evaluations', data?.complianceEvaluations || [], ['qr_code','farm_name','status','risk_score','missing_items']],
              ['Audit Packages', data?.auditPackages || [], ['scope_type','scope_id','status','file_url','generated_at']],
              ['Security Alerts', data?.securityAlerts || [], ['alert_type','severity','summary','status','created_at']],
              ['Buyer Feedback', data?.buyerFeedback || [], ['reference_code','buyer','quality_score','delivery_score','documentation_score','communication_score']],
              ['Trade Finance Records', data?.tradeFinance || [], ['reference_code','finance_type','provider','amount','currency','status']],
              ['Sustainability Calculation Runs', data?.sustainabilityRuns || [], ['scope','scope_id','formula_version','results','created_at']],
              ['BI Tool Exports', data?.biToolExports || [], ['tool_name','dataset_name','format','record_count','status','generated_at']],
              ['Blockchain Ledger Entries', data?.blockchainLedger || [], ['entity_type','entity_id','payload_hash','previous_hash','block_hash','anchored_at']],
              ['Predictive Model Runs', data?.predictiveRuns || [], ['model_type','training_window','predictions','accuracy_note','created_at']],
              ['JIT Optimization Plans', data?.jitPlans || [], ['plan_type','status','constraints','recommendations','created_at']],
              ['Sustainability Verifications', data?.sustainabilityVerifications || [], ['scope_id','status','score','findings','verified_at']],
              ['Retention Archive Jobs', data?.retentionJobs || [], ['data_type','cutoff_date','records_matched','action','status']],
              ['Retention Archive Snapshots', data?.archiveSnapshots || [], ['data_type','record_id','created_at']],
              ['Inventory Alerts', data?.inventoryAlerts || [], ['farm_name','warehouse_name','bin_code','quantity_kg','expiry_date']],
              ['Predictive Analytics', data?.predictiveAnalytics || [], ['month','supplyKg','predictedNextSupplyKg','avgQualityScore','predictedQualityScore']],
              ['Automated Compliance Monitoring', data?.complianceMonitoring || [], ['qrCode','farmName','status','missing','riskScore','monitoringStatus']],
              ['Access Requests', data?.accessRequests || [], ['full_name','requested_module','sensitivity','status','created_at']],
              ['Audit Schedules', data?.auditSchedules || [], ['title','audit_type','scheduled_date','risk_score','status']],
              ['Farmer Service Requests', data?.serviceRequests || [], ['full_name','request_type','quantity','status','created_at']],
              ['Lab Sync Records', data?.labSync || [], ['lab_name','sample_code','status','synced_at']],
              ['Buyer Quality Requirements', data?.buyerRequirements || [], ['buyer','grade','min_cupping_score','moisture_max','max_defects']],
            ].map(([title, rows, cols]: any) => (
              <div key={title} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-stone-100"><h3 className="font-bold text-stone-800">{title}</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-stone-50">{cols.map((c: string) => <th key={c} className="px-3 py-2 text-left uppercase text-stone-500">{c.replace(/_/g,' ')}</th>)}</tr></thead>
                    <tbody className="divide-y divide-stone-50">
                      {rows.slice(0, 8).map((row: any, idx: number) => <tr key={idx}>{cols.map((c: string) => <td key={c} className="px-3 py-2 whitespace-nowrap">{String(row[c] ?? '-')}</td>)}</tr>)}
                      {rows.length === 0 && <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-stone-400">No records yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EudrRiskManagement() {
  const [areas, setAreas] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOptions, setSupplierOptions] = useState<any[]>([]);
  const [supplierLookupLoading, setSupplierLookupLoading] = useState(false);
  const [showSupplierOptions, setShowSupplierOptions] = useState(false);
  const [manualForm, setManualForm] = useState({
    supplierId: '',
    supplierName: '',
    sourceType: 'manual',
    sourceId: '',
    farmName: '',
    farmLocation: '',
    coordinates: '',
  });
  const [areaForm, setAreaForm] = useState({ name: '', areaType: 'Protected Area', latitude: '', longitude: '', radiusKm: '5', riskLevel: 'HIGH', notes: '' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([apiService.getEudrProtectedAreas(), apiService.getEudrRiskAssessments()])
      .then(([areaRes, riskRes]) => {
        setAreas(areaRes.data || []);
        setAssessments(riskRes.data || []);
      })
      .catch(() => toast.error('Failed to load EUDR risk data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const query = supplierSearch.trim();
    const timer = window.setTimeout(() => {
      setSupplierLookupLoading(true);
      apiService.searchEudrSupplierLocations(query)
        .then(response => setSupplierOptions(response.data || []))
        .catch(() => setSupplierOptions([]))
        .finally(() => setSupplierLookupLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [supplierSearch]);

  const riskClass = (risk: string) => {
    if (risk === 'HIGH') return 'bg-red-100 text-red-700';
    if (risk === 'MEDIUM') return 'bg-amber-100 text-amber-700';
    if (risk === 'LOW') return 'bg-emerald-100 text-emerald-700';
    return 'bg-stone-100 text-stone-700';
  };

  const runAll = async () => {
    setRunning(true);
    try {
      const response = await apiService.runAllEudrRiskAssessments();
      toast.success(`${response.data.length} farm risk checks completed`);
      load();
    } catch {
      toast.error('Failed to run EUDR risk checks');
    } finally {
      setRunning(false);
    }
  };

  const submitManualCheck = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiService.assessEudrFarmRisk({
        ...manualForm,
        sourceType: manualForm.sourceType || 'manual',
      });
      toast.success('Farm risk check saved');
      setSupplierSearch('');
      setManualForm({ supplierId: '', supplierName: '', sourceType: 'manual', sourceId: '', farmName: '', farmLocation: '', coordinates: '' });
      load();
    } catch {
      toast.error('Failed to assess coordinates');
    }
  };

  const selectSupplierLocation = (row: any) => {
    const label = `${row.farm_name || row.supplier_name} - ${row.supplier_name}`;
    setSupplierSearch(label);
    setManualForm({
      supplierId: row.supplier_id || '',
      supplierName: row.supplier_name || '',
      sourceType: row.source_type || 'manual',
      sourceId: row.source_id || '',
      farmName: row.farm_name || row.supplier_name || '',
      farmLocation: row.farm_location || '',
      coordinates: row.coordinates || '',
    });
    setShowSupplierOptions(false);
  };

  const submitArea = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiService.createEudrProtectedArea(areaForm);
      toast.success('Protected area rule added');
      setAreaForm({ name: '', areaType: 'Protected Area', latitude: '', longitude: '', radiusKm: '5', riskLevel: 'HIGH', notes: '' });
      load();
    } catch {
      toast.error('Failed to add protected area');
    }
  };

  const filtered = assessments.filter((row) => {
    const query = search.trim().toLowerCase();
    const haystack = [row.supplier_name, row.farm_name, row.farm_location, row.coordinates, row.nearest_area_name, row.risk_level].filter(Boolean).join(' ').toLowerCase();
    return (riskFilter === 'All' || row.risk_level === riskFilter) && (!query || haystack.includes(query));
  });
  const summary = {
    total: assessments.length,
    high: assessments.filter(row => row.risk_level === 'HIGH').length,
    medium: assessments.filter(row => row.risk_level === 'MEDIUM').length,
    low: assessments.filter(row => row.risk_level === 'LOW').length,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">EUDR Deforestation Risk Checks</h2>
          <p className="text-sm text-stone-500 mt-0.5">Screen supplier farm coordinates against configured protected-area buffers for export readiness review.</p>
        </div>
        <button type="button" onClick={runAll} disabled={running} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
          {running ? 'Running...' : 'Run All Farm Checks'}
        </button>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          ['Total Checks', summary.total, 'bg-stone-700'],
          ['High Risk', summary.high, 'bg-red-600'],
          ['Medium Risk', summary.medium, 'bg-amber-500'],
          ['Low Risk', summary.low, 'bg-emerald-600'],
        ].map(([label, value, color]: any) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}><ShieldCheck className="w-4 h-4 text-white" /></div>
            <p className="text-2xl font-bold text-stone-800">{value}</p>
            <p className="text-sm text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <form onSubmit={submitManualCheck} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-stone-800">Manual Coordinate Check</h3>
          <div className="relative">
            <input
              required
              value={supplierSearch}
              onFocus={() => setShowSupplierOptions(true)}
              onChange={e => {
                const value = e.target.value;
                setSupplierSearch(value);
                setShowSupplierOptions(true);
                setManualForm({
                  supplierId: '',
                  supplierName: '',
                  sourceType: 'manual',
                  sourceId: '',
                  farmName: value,
                  farmLocation: '',
                  coordinates: '',
                });
              }}
              placeholder="Search farm or cooperative"
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
            />
            {showSupplierOptions && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg">
                {supplierLookupLoading && <div className="px-3 py-3 text-sm text-stone-400">Searching...</div>}
                {!supplierLookupLoading && supplierOptions.map(option => (
                  <button
                    key={`${option.source_type}-${option.source_id}`}
                    type="button"
                    onClick={() => selectSupplierLocation(option)}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 border-b border-stone-50 last:border-b-0"
                  >
                    <p className="text-sm font-semibold text-stone-800">{option.farm_name || option.supplier_name}</p>
                    <p className="text-xs text-stone-500">{option.supplier_name} • {option.supplier_type || option.source_type}</p>
                    <p className="text-xs text-stone-400">{option.farm_location || 'No location label'} • {option.coordinates}</p>
                  </button>
                ))}
                {!supplierLookupLoading && supplierOptions.length === 0 && (
                  <div className="px-3 py-3 text-sm text-stone-400">No registered farm coordinates found.</div>
                )}
              </div>
            )}
          </div>
          <input readOnly value={manualForm.farmLocation} placeholder="Location will be fetched from the selected farm/cooperative" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          <input readOnly required value={manualForm.coordinates} placeholder="Coordinates will be fetched from the selected farm/cooperative" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 font-mono" />
          <button className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold">Check Risk</button>
        </form>

        <form onSubmit={submitArea} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-stone-800">Protected Area Rule</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            <input required value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))} placeholder="Area name" className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <input value={areaForm.areaType} onChange={e => setAreaForm(f => ({ ...f, areaType: e.target.value }))} placeholder="Area type" className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <input required type="number" step="0.000001" value={areaForm.latitude} onChange={e => setAreaForm(f => ({ ...f, latitude: e.target.value }))} placeholder="Latitude" className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <input required type="number" step="0.000001" value={areaForm.longitude} onChange={e => setAreaForm(f => ({ ...f, longitude: e.target.value }))} placeholder="Longitude" className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <input required type="number" step="0.1" value={areaForm.radiusKm} onChange={e => setAreaForm(f => ({ ...f, radiusKm: e.target.value }))} placeholder="Radius km" className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <select value={areaForm.riskLevel} onChange={e => setAreaForm(f => ({ ...f, riskLevel: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
              {['HIGH', 'MEDIUM', 'LOW'].map(level => <option key={level}>{level}</option>)}
            </select>
          </div>
          <input value={areaForm.notes} onChange={e => setAreaForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm" />
          <button className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold">Add Rule</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-800">Recent Farm Risk Results</h3>
            <p className="text-xs text-stone-500 mt-0.5">High-risk rows should be reviewed before export authorization.</p>
          </div>
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier, farm, location..." className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
              {['All', 'HIGH', 'MEDIUM', 'LOW', 'NOT_VERIFIED'].map(level => <option key={level}>{level}</option>)}
            </select>
          </div>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-emerald-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>{['Supplier','Farm','Coordinates','Risk','Nearest Protected Area','Checked'].map(title => <th key={title} className="px-4 py-3 text-left">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(row => (
                  <tr key={row.assessment_id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-semibold text-stone-800">{row.supplier_name || 'Manual check'}<p className="text-xs text-stone-400">{row.source_type}</p></td>
                    <td className="px-4 py-3">{row.farm_name || '-'}<p className="text-xs text-stone-500">{row.farm_location || '-'}</p></td>
                    <td className="px-4 py-3 font-mono text-xs">{row.coordinates}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${riskClass(row.risk_level)}`}>{row.risk_level} • {row.risk_score}/100</span></td>
                    <td className="px-4 py-3">{row.nearest_area_name || '-'}<p className="text-xs text-stone-500">{row.nearest_distance_km ?? '-'} km</p></td>
                    <td className="px-4 py-3 text-xs text-stone-500">{row.checked_at ? new Date(row.checked_at).toLocaleString() : '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400">No EUDR risk checks match this view.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100"><h3 className="font-bold text-stone-800">Configured Protected Areas</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>{['Name','Type','Coordinates','Radius','Risk','Notes'].map(title => <th key={title} className="px-4 py-3 text-left">{title}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {areas.map(area => (
                <tr key={area.area_id}>
                  <td className="px-4 py-3 font-semibold text-stone-800">{area.name}</td>
                  <td className="px-4 py-3">{area.area_type}</td>
                  <td className="px-4 py-3 font-mono text-xs">{Number(area.latitude).toFixed(5)}, {Number(area.longitude).toFixed(5)}</td>
                  <td className="px-4 py-3">{area.radius_km} km</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${riskClass(area.risk_level)}`}>{area.risk_level}</span></td>
                  <td className="px-4 py-3 text-xs text-stone-500">{area.notes || '-'}</td>
                </tr>
              ))}
              {areas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-400">No protected-area rules configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ImpactMonitoring() {
  const [data, setData] = useState<any>({ rows: [], summary: {}, runs: [] });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [periodLabel, setPeriodLabel] = useState(new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }));
  const [drafts, setDrafts] = useState<Record<string, { baselineValue: string; targetValue: string; notes: string }>>({});

  const load = useCallback(() => {
    setLoading(true);
    apiService.getImpactMonitoring()
      .then(response => {
        const rows = response.data?.rows || [];
        setData(response.data || { rows: [], summary: {}, runs: [] });
        setDrafts(rows.reduce((acc: Record<string, any>, row: any) => {
          acc[row.indicatorKey] = {
            baselineValue: String(row.baselineValue ?? 0),
            targetValue: String(row.targetValue ?? 0),
            notes: row.notes || '',
          };
          return acc;
        }, {}));
      })
      .catch(() => toast.error('Failed to load impact monitoring'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusClass = (status: string) => {
    if (status === 'Achieved') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Improving') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  };

  const saveIndicator = async (row: any) => {
    const draft = drafts[row.indicatorKey];
    setSavingKey(row.indicatorKey);
    try {
      await apiService.updateImpactIndicator(row.indicatorKey, {
        baselineValue: Number(draft?.baselineValue || 0),
        targetValue: Number(draft?.targetValue || 0),
        notes: draft?.notes || row.notes || '',
      });
      toast.success('Indicator baseline and target updated');
      load();
    } catch {
      toast.error('Failed to update indicator');
    } finally {
      setSavingKey(null);
    }
  };

  const saveRun = async () => {
    try {
      await apiService.createImpactEvaluationRun({ periodLabel });
      toast.success('Impact evaluation run saved');
      load();
    } catch {
      toast.error('Failed to save evaluation run');
    }
  };

  const rows = data.rows || [];
  const summary = data.summary || {};

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Impact Monitoring & Evaluation</h2>
          <p className="text-sm text-stone-500 mt-0.5">Compare baseline targets with post-implementation performance from live pickup, traceability, quality, and logistics records.</p>
        </div>
        <div className="flex gap-2">
          <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
          <button type="button" onClick={saveRun} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold">Save Monthly Evaluation</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3">
        {[
          ['Indicators', summary.totalIndicators || 0, 'bg-stone-700'],
          ['Achieved', summary.achieved || 0, 'bg-emerald-600'],
          ['Improving', summary.improving || 0, 'bg-blue-600'],
          ['Needs Attention', summary.needsAttention || 0, 'bg-amber-500'],
        ].map(([label, value, color]: any) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}><Activity className="w-4 h-4 text-white" /></div>
            <p className="text-2xl font-bold text-stone-800">{value}</p>
            <p className="text-sm text-stone-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h3 className="font-bold text-stone-800">M&E Indicator Comparison</h3>
          <p className="text-xs text-stone-500 mt-0.5">Baseline and target are editable. Current values are calculated from system records.</p>
        </div>
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-emerald-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>{['Indicator','Baseline','Target','Current','Evidence','Improvement','Status','Action'].map(title => <th key={title} className="px-4 py-3 text-left">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((row: any) => {
                  const draft = drafts[row.indicatorKey] || { baselineValue: '', targetValue: '', notes: '' };
                  return (
                    <tr key={row.indicatorKey} className="align-top hover:bg-stone-50">
                      <td className="px-4 py-3 min-w-[230px]">
                        <p className="font-semibold text-stone-800">{row.indicatorName}</p>
                        <p className="text-xs text-stone-500 mt-1">{row.category}</p>
                      </td>
                      <td className="px-4 py-3"><input type="number" value={draft.baselineValue} onChange={e => setDrafts(d => ({ ...d, [row.indicatorKey]: { ...draft, baselineValue: e.target.value } }))} className="w-20 px-2 py-1.5 border border-stone-200 rounded-lg text-sm" /></td>
                      <td className="px-4 py-3"><input type="number" value={draft.targetValue} onChange={e => setDrafts(d => ({ ...d, [row.indicatorKey]: { ...draft, targetValue: e.target.value } }))} className="w-20 px-2 py-1.5 border border-stone-200 rounded-lg text-sm" /></td>
                      <td className="px-4 py-3 font-bold text-stone-800">{row.currentValue}{row.unit}</td>
                      <td className="px-4 py-3 text-xs text-stone-500">{row.numerator} of {row.denominator} records</td>
                      <td className={`px-4 py-3 font-semibold ${row.improvementPercent >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{row.improvementPercent}%</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(row.status)}`}>{row.status}</span></td>
                      <td className="px-4 py-3"><button type="button" onClick={() => saveIndicator(row)} disabled={savingKey === row.indicatorKey} className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold disabled:opacity-60">{savingKey === row.indicatorKey ? 'Saving...' : 'Save'}</button></td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-stone-400">No impact indicators configured.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100"><h3 className="font-bold text-stone-800">Saved Evaluation Runs</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>{['Period','Achieved','Improving','Needs Attention','Generated'].map(title => <th key={title} className="px-4 py-3 text-left">{title}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(data.runs || []).map((run: any) => (
                <tr key={run.run_id}>
                  <td className="px-4 py-3 font-semibold text-stone-800">{run.period_label}</td>
                  <td className="px-4 py-3 text-emerald-700 font-semibold">{run.summary?.achieved || 0}</td>
                  <td className="px-4 py-3 text-blue-700 font-semibold">{run.summary?.improving || 0}</td>
                  <td className="px-4 py-3 text-amber-700 font-semibold">{run.summary?.needsAttention || 0}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">{run.generated_at ? new Date(run.generated_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {(data.runs || []).length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">No saved evaluations yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SampleWorkflowMonitor() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const load = useCallback(() => {
    setLoading(true);
    apiService.getAdminSampleWorkflow()
      .then(response => setRows(response.data || []))
      .catch(() => toast.error('Failed to load sample workflow'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const statusClass = (value: string) => {
    const key = String(value || '').toLowerCase();
    if (key.includes('dispatch') || key.includes('delivered')) return 'bg-emerald-100 text-emerald-700';
    if (key.includes('verified')) return 'bg-violet-100 text-violet-700';
    if (key.includes('approved')) return 'bg-sky-100 text-sky-700';
    if (key.includes('reject')) return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };
  const filtered = rows.filter(row => {
    const query = search.trim().toLowerCase();
    const text = [row.referenceCode, row.buyer, row.customerEmail, row.country, row.grade, row.qrCode, row.farmName, row.washingStation, row.sampleStatus, row.orderStatus].filter(Boolean).join(' ').toLowerCase();
    const statusMatches = status === 'All' || row.sampleStatus === status || row.orderStatus === status;
    return statusMatches && (!query || text.includes(query));
  });
  const statuses = ['All', ...Array.from(new Set(rows.map(row => row.sampleStatus || row.orderStatus).filter(Boolean)))];

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Customer Sample Workflow</h2>
          <p className="text-sm text-stone-500 mt-0.5">Read-only monitor for Exporter approval, QC verification, and Logistics dispatch.</p>
        </div>
        <button type="button" onClick={load} className="px-3 py-2 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600">Refresh</button>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {[
          ['Total Samples', rows.length],
          ['Awaiting QC', rows.filter(row => row.sampleStatus === 'Awaiting QC Verification').length],
          ['Dispatched', rows.filter(row => String(row.sampleStatus || '').includes('Dispatched')).length],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
        <div className="grid md:grid-cols-[1fr_220px] gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search buyer, reference, batch, station..." className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
          <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
            {statuses.map(item => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-emerald-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
              <tr>{['Reference','Buyer','Sample','Batch / Station','Exporter Status','QC Verification','Logistics Dispatch'].map(title => <th key={title} className="px-4 py-3 text-left font-semibold">{title}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(row => (
                <tr key={row.sampleId || row.orderId} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono text-xs">{row.referenceCode || row.orderId?.slice(0, 8)}<p className="text-stone-400 mt-1">{new Date(row.orderDate).toLocaleDateString()}</p></td>
                  <td className="px-4 py-3"><p className="font-semibold text-stone-800">{row.buyer}</p><p className="text-xs text-stone-500">{row.customerEmail || row.country}</p></td>
                  <td className="px-4 py-3">{Number(row.sampleQuantityG || 0).toLocaleString()} g<p className="text-xs text-stone-500">{row.grade}</p></td>
                  <td className="px-4 py-3">{row.qrCode || 'Batch not selected'}<p className="text-xs text-stone-500">{row.farmName || '-'} / {row.washingStation || '-'}</p></td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass(row.orderStatus)}`}>{row.orderStatus}</span></td>
                  <td className="px-4 py-3"><p className="font-medium text-stone-700">{row.verifiedAt ? 'Verified' : 'Waiting'}</p><p className="text-xs text-stone-500">{row.verifiedByName || row.qcNotes || '-'}</p></td>
                  <td className="px-4 py-3"><p className="font-medium text-stone-700">{row.trackingNo ? row.trackingNo : 'Not dispatched'}</p><p className="text-xs text-stone-500">{row.dispatchCarrier || row.dispatchedByName || '-'}</p></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-stone-400">No sample requests match this view.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const SECTIONS: Record<string, React.ComponentType> = {
  overview: Overview,
  approvals: FarmerApprovals,
  users: UserManagement,
  cooperatives: WorkStationManagement,
  'transport-companies': ExternalTransportCompanies,
  'eudr-risk': EudrRiskManagement,
  'impact-monitoring': ImpactMonitoring,
  samples: SampleWorkflowMonitor,
  permissions: RolePermissions,
  analytics: SystemAnalytics,
  reports: ReportBuilder,
  operations: AdminOperations,
  support: SupportAdministration,
  security: Security,
  notifications: Notifs,
};

export default function AdminDashboard() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const Component = SECTIONS[section] || Overview;
  return <Component />;
}
