import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';
import apiService from '../services/api';
import { toast } from 'sonner';

import {
  LayoutDashboard, Leaf, CalendarClock, Bell,
  Users, Calendar, ClipboardList, Package, History,
  Inbox, Kanban, BarChart3, Archive,
  FlaskConical, Award, AlertTriangle, FileText,
  Boxes, Route, CheckCircle2,
  ShoppingCart, Layers, Truck,
  UserCog, ShieldCheck, Settings, Activity, Lock,
  Menu, X, ChevronRight, LogOut, Coffee, ChevronDown,
  Map, QrCode, Link2, Wrench, FileCheck, Thermometer, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

type NavItem = { id: string; labelKey: string; icon: React.ElementType; badge?: number };
type NavGroup = { group: string; items: NavItem[] };

const ROLE_NAV: Record<UserRole, (NavItem | NavGroup)[]> = {
  farmer: [
    { id: 'overview', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'profile', labelKey: 'nav.profile', icon: Leaf },
    { id: 'washing-station', labelKey: 'Washing Station', icon: Coffee },
    { id: 'pickups', labelKey: 'nav.pickups', icon: CalendarClock },
    { id: 'payments', labelKey: 'Payment History', icon: FileText },
    { id: 'traceability', labelKey: 'nav.traceability', icon: Link2 },
    { id: 'requests', labelKey: 'Service Requests', icon: ClipboardList },
    { id: 'community', labelKey: 'Community', icon: Users },
    { id: 'reports', labelKey: 'Reports', icon: BarChart3 },
  ],
  aggregator: [
    { id: 'overview', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'farmers', labelKey: 'nav.farmers', icon: Users },
    { id: 'schedule', labelKey: 'nav.pickups', icon: Calendar },
    { id: 'record-pickup', labelKey: 'nav.record_pickup', icon: ClipboardList },
    { id: 'batches', labelKey: 'nav.batches', icon: Package },
    { id: 'history', labelKey: 'nav.history', icon: History },
    { id: 'reports', labelKey: 'Reports', icon: BarChart3 },
    { id: 'support', labelKey: 'support_tickets', icon: Wrench },
  ],
  processor: [
    { id: 'overview', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'suppliers', labelKey: 'Supplier Assignment', icon: Users },
    { id: 'incoming', labelKey: 'nav.incoming', icon: Inbox },
    { id: 'queue', labelKey: 'nav.queue', icon: Kanban },
    { id: 'tracking', labelKey: 'nav.tracking', icon: BarChart3 },
    { id: 'corrective', labelKey: 'nav.corrective', icon: AlertTriangle },
    { id: 'inventory', labelKey: 'Station Inventory', icon: Archive },
    { id: 'reports', labelKey: 'Reports', icon: BarChart3 },
    { id: 'support', labelKey: 'support_tickets', icon: Wrench },
  ],
  quality: [
    { id: 'overview', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'testing', labelKey: 'nav.testing', icon: FlaskConical },
    { id: 'cupping', labelKey: 'nav.cupping', icon: Award },
    { id: 'defects', labelKey: 'nav.defects', icon: AlertTriangle },
    { id: 'certificates', labelKey: 'nav.certificates', icon: FileText },
    { id: 'corrective', labelKey: 'nav.corrective', icon: AlertTriangle },
    { id: 'analytics', labelKey: 'nav.analytics', icon: BarChart3 },
    { id: 'reports', labelKey: 'Reports', icon: BarChart3 },
    { id: 'support', labelKey: 'support_tickets', icon: Wrench },
  ],
  logistics: [
    { id: 'overview', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'authorized-orders', labelKey: 'nav.authorized_orders', icon: FileCheck },
    { id: 'road-transport', labelKey: 'nav.road_transport', icon: Truck },
    { id: 'checkpoints', labelKey: 'nav.transit_checkpoints', icon: Route },
    { id: 'completed-journeys', labelKey: 'nav.completed_journeys', icon: CheckCircle2 },
    { id: 'delivery', labelKey: 'nav.proof_delivery', icon: CheckCircle2 },
    { id: 'reports', labelKey: 'nav.shipment_reports', icon: BarChart3 },
    { id: 'support', labelKey: 'support_tickets', icon: Wrench },
  ],
  exporter: [
    { id: 'overview', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'orders', labelKey: 'nav.customer_orders', icon: ShoppingCart },
    { id: 'authorized-orders', labelKey: 'nav.authorized_orders', icon: FileCheck },
    { id: 'traceability', labelKey: 'nav.traceability_verification', icon: QrCode },
    { id: 'reports', labelKey: 'Reports', icon: BarChart3 },
    { id: 'support', labelKey: 'support_tickets', icon: Wrench },
  ],
  admin: [
    { id: 'overview', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { id: 'approvals', labelKey: 'nav.approvals', icon: CheckCircle2 },
    { id: 'users', labelKey: 'nav.users', icon: Users },
    { id: 'cooperatives', labelKey: 'Work Station Management', icon: Coffee },
    { id: 'transport-companies', labelKey: 'External Transport Companies', icon: Truck },
    { id: 'eudr-risk', labelKey: 'EUDR Risk Checks', icon: ShieldCheck },
    { id: 'impact-monitoring', labelKey: 'Impact Monitoring', icon: BarChart3 },
    { id: 'permissions', labelKey: 'nav.permissions', icon: UserCog },
    { id: 'analytics', labelKey: 'nav.analytics', icon: Activity },
    { id: 'operations', labelKey: 'nav.settings', icon: Settings },
    { id: 'reports', labelKey: 'Reports', icon: BarChart3 },
    { id: 'support', labelKey: 'support_tickets', icon: Wrench },
    { id: 'security', labelKey: 'nav.security', icon: Lock },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  farmer: 'Farmer',
  aggregator: 'Aggregator',
  processor: 'Processor',
  quality: 'Quality Controller',
  logistics: 'Logistics',
  exporter: 'Exporter',
  admin: 'System Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  farmer: 'bg-emerald-500',
  aggregator: 'bg-amber-500',
  processor: 'bg-orange-500',
  quality: 'bg-violet-500',
  logistics: 'bg-sky-500',
  exporter: 'bg-rose-500',
  admin: 'bg-red-600',
};

const ROLE_PATHS: Record<UserRole, string> = {
  farmer: '/dashboard/farmer',
  aggregator: '/dashboard/aggregator',
  processor: '/dashboard/processor',
  quality: '/dashboard/quality',
  logistics: '/dashboard/logistics',
  exporter: '/dashboard/exporter',
  admin: '/dashboard/admin',
};

const NAV_PERMISSIONS: Record<UserRole, Record<string, string | string[]>> = {
  farmer: {
    profile: 'Farm Profile',
    'washing-station': 'Washing Station Connection',
    pickups: 'Pickup Scheduling',
    payments: 'Payments',
    traceability: 'Batch Traceability',
    requests: 'Input and Service Requests',
    community: 'Community Discussion',
    reports: 'Analytics & Reporting',
  },
  aggregator: {
    farmers: 'Farmer Management',
    schedule: 'Pickup Schedule',
    'record-pickup': 'Record Pickup',
    batches: 'Batch Creation',
    history: 'Batch Traceability',
    reports: 'Analytics & Reporting',
    support: 'Help & Support',
  },
  processor: {
    suppliers: 'Supplier Assignment',
    incoming: 'Incoming Batches',
    queue: 'Processing Queue',
    tracking: 'Batch Transformation Tracking',
    corrective: ['Corrective Actions', 'Batch Transformation Tracking'],
    inventory: 'Inventory Management',
    reports: 'Analytics & Reporting',
    support: 'Help & Support',
  },
  quality: {
    testing: 'Quality Management',
    cupping: 'Quality Management',
    defects: 'Defect Tracking',
    certificates: 'Certification & Grading',
    corrective: 'Corrective Actions',
    analytics: 'Analytics & Reporting',
    lab: 'Lab & Buyer Requirements',
    reports: ['Quality Management', 'Analytics & Reporting', 'Certification & Grading'],
    support: 'Help & Support',
  },
  logistics: {
    'authorized-orders': 'Logistics & Shipping',
    'road-transport': 'Transit Checkpoints',
    checkpoints: 'Transit Checkpoints',
    'completed-journeys': 'Transit Checkpoints',
    delivery: 'Proof of Delivery',
    reports: 'Analytics & Reporting',
    support: 'Help & Support',
  },
  exporter: {
    orders: 'Order Management',
    'authorized-orders': 'Order Management',
    traceability: 'Batch Traceability',
    analytics: 'Analytics & Reporting',
    reports: ['Analytics & Reporting', 'Order Management', 'Logistics & Shipping'],
    support: 'Help & Support',
  },
  admin: {
    approvals: 'System Configuration',
    users: 'System Configuration',
    cooperatives: 'System Configuration',
    'transport-companies': 'System Configuration',
    'eudr-risk': 'System Configuration',
    'impact-monitoring': 'Analytics & Reporting',
    samples: 'System Configuration',
    permissions: 'Security & Audit',
    analytics: 'Analytics & Reporting',
    operations: 'System Configuration',
    reports: ['Analytics & Reporting', 'System Configuration'],
    support: 'Support Administration',
    security: 'Security & Audit',
  },
};

const permissionModules = (permissions: any): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  if (Array.isArray(permissions.modules)) return permissions.modules;
  return Object.entries(permissions).filter(([, value]) => Boolean(value)).map(([key]) => key);
};

const canOpenNav = (user: any, role: UserRole, item: NavItem) => {
  if (item.id === 'overview' || item.id === 'notifications') return true;
  if (!user?.permissions) return false;
  const requiredModule = NAV_PERMISSIONS[role]?.[item.id];
  if (!requiredModule) return true;
  const modules = permissionModules(user.permissions);
  const acceptedModules = Array.isArray(requiredModule) ? requiredModule : [requiredModule];
  return modules.includes('*') || acceptedModules.some(moduleName => modules.includes(moduleName));
};

const notificationText = (notification: any) =>
  `${notification?.title || ''} ${notification?.message || ''}`.toLowerCase();

const inferNotificationCategory = (notification: any) => {
  const text = notificationText(notification);
  if (/(pickup|delivery|collection|receipt)/.test(text)) return 'Pickup';
  if (/(payment|paid|payout|mobile money)/.test(text)) return 'Payment';
  if (/(batch|qr|trace|checkpoint|processing)/.test(text)) return 'Batch';
  if (/(washing station|work station|supplier assignment|processor)/.test(text)) return 'Station';
  if (/(quality|cupping|defect|certificate|corrective)/.test(text)) return 'Quality';
  if (/(shipment|vessel|container|customs|port|pod|delivery confirmation)/.test(text)) return 'Logistics';
  if (/(ticket|support|help)/.test(text)) return 'Support';
  if (/(security|login|mfa|access|permission|role)/.test(text)) return 'Security';
  if (/(approval|approved|rejected|registration)/.test(text)) return 'Approval';
  return 'General';
};

const notificationPriority = (notification: any) => {
  const type = String(notification?.type || '').toLowerCase();
  const text = notificationText(notification);
  if (type === 'error' || /(urgent|failed|rejected|breach|denied|overdue)/.test(text)) return 'Urgent';
  if (type === 'warning' || /(delay|pending|risk|attention|missing)/.test(text)) return 'Warning';
  if (type === 'success' || /(completed|approved|created|uploaded|assigned|paid)/.test(text)) return 'Success';
  return 'Info';
};

const notificationTargetSection = (role: UserRole, category: string) => {
  const targets: Record<UserRole, Record<string, string>> = {
    farmer: {
      Pickup: 'pickups', Payment: 'payments', Batch: 'traceability', Station: 'washing-station',
      Quality: 'traceability', Support: 'requests', Approval: 'profile', General: 'overview',
    },
    aggregator: {
      Pickup: 'record-pickup', Payment: 'history', Batch: 'batches', Station: 'farmers',
      Quality: 'history', Support: 'support', Approval: 'farmers', General: 'overview',
    },
    processor: {
      Pickup: 'incoming', Batch: 'queue', Station: 'suppliers', Quality: 'tracking',
      Support: 'support', Approval: 'suppliers', General: 'overview',
    },
    quality: {
      Batch: 'testing', Quality: 'testing', Support: 'support', Approval: 'testing', General: 'overview',
    },
    logistics: {
      Batch: 'authorized-orders', Logistics: 'authorized-orders', Quality: 'authorized-orders', Support: 'support', General: 'overview',
    },
    exporter: {
      Batch: 'authorized-orders', Logistics: 'authorized-orders', Quality: 'orders', Support: 'support', Approval: 'orders', General: 'overview',
    },
    admin: {
      Security: 'security', Support: 'support', Approval: 'approvals', Station: 'cooperatives',
      Batch: 'reports', Quality: 'reports', Logistics: 'reports', General: 'overview',
    },
  };
  return targets[role]?.[category] || targets[role]?.General || 'overview';
};

const notificationStyle = (priority: string) => {
  switch (priority) {
    case 'Urgent': return { dot: 'bg-red-500', pill: 'bg-red-50 text-red-700 border-red-100' };
    case 'Warning': return { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-100' };
    case 'Success': return { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
    default: return { dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 border-blue-100' };
  }
};

export default function MainLayout() {
  const { user, logout, isLoading, updateAuthenticatedUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [mfaSaving, setMfaSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ fullName: '', email: '', phone: '', mfaEnabled: false });
  const [farmerSupplierType, setFarmerSupplierType] = useState<'FARMER' | 'COOPERATIVE'>('FARMER');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { t, i18n } = useTranslation();

  // Live notifications — hooks must be before any conditional returns
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifSearch, setNotifSearch] = useState('');
  const [notifStatusFilter, setNotifStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [notifCategoryFilter, setNotifCategoryFilter] = useState('all');

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiService.getNotifications();
      setNotifs(res.data);
      setUnreadCount(res.unreadCount);
    } catch { /* silent fail */ }
  }, [user]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const handleMarkAllRead = async () => {
    await apiService.markAllNotificationsRead();
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
  };

  const handleMarkOneRead = async (id: string) => {
    await apiService.markNotificationRead(id);
    setNotifs(n => n.map(x => x.notificationId === id ? { ...x, read: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  useEffect(() => {
    if (!isLoading && !user) { navigate('/login'); }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    if (!showUserSettings || !user) return;
    setSettingsForm({
      fullName: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      mfaEnabled: Boolean(user.mfaEnabled),
    });
    setSettingsLoading(true);
    apiService.getCurrentUser()
      .then((res) => {
        const data = res.data || {};
        setSettingsForm({
          fullName: data.fullName || user.name || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          mfaEnabled: Boolean(data.mfaEnabled),
        });
        updateAuthenticatedUser({
          name: data.fullName || user.name,
          email: data.email || user.email,
          phone: data.phone || undefined,
          permissions: data.permissions || user.permissions,
          mfaEnabled: Boolean(data.mfaEnabled),
        });
      })
      .catch(() => toast.error('Failed to load user settings'))
      .finally(() => setSettingsLoading(false));
  }, [showUserSettings, user?.id, updateAuthenticatedUser]);

  useEffect(() => {
    if (!user || user.role !== 'farmer') return;
    apiService.getFarmerDashboard()
      .then((res) => {
        const supplierType = String(res.data?.profile?.supplierType || 'FARMER').toUpperCase() === 'COOPERATIVE' ? 'COOPERATIVE' : 'FARMER';
        setFarmerSupplierType(supplierType);
      })
      .catch(() => setFarmerSupplierType('FARMER'));
  }, [user?.id, user?.role]);

  // Show a blank screen while restoring session — prevents redirect flash
  const role = user?.role;
  const navItems = role ? (ROLE_NAV[role] as NavItem[]).filter(item => canOpenNav(user, role, item)) : [];
  const searchParams = new URLSearchParams(location.search);
  const activeSection = searchParams.get('section') || 'overview';
  const allowedSectionIds = navItems.map(item => item.id).join('|');

  useEffect(() => {
    if (isLoading || !user || !role) return;
    if (activeSection === 'overview' || activeSection === 'notifications') return;
    const isAllowed = allowedSectionIds.split('|').includes(activeSection);
    if (!isAllowed) {
      toast.error('You do not have permission to access that module');
      navigate(`${ROLE_PATHS[role]}?section=overview`, { replace: true });
    }
  }, [activeSection, allowedSectionIds, isLoading, navigate, role, user]);

  if (isLoading) return (
    <div className="h-screen flex items-center justify-center bg-[#F4F0EB]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
          <Coffee className="w-6 h-6 text-white" />
        </div>
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!user) return null;

  if (!role) return null;

  const activeSectionAllowed = activeSection === 'overview' || activeSection === 'notifications' || allowedSectionIds.split('|').includes(activeSection);
  if (!activeSectionAllowed) return null;
  const roleDisplayLabel = role === 'farmer' && farmerSupplierType === 'COOPERATIVE' ? 'Cooperative' : ROLE_LABELS[role];
  const portalDisplayLabel = `${roleDisplayLabel} ${t('nav.portal')}`;
  const enrichedNotifs = notifs.map(notification => ({
    ...notification,
    category: inferNotificationCategory(notification),
    priority: notificationPriority(notification),
  }));
  const notificationCategories = ['all', ...Array.from(new Set(enrichedNotifs.map(notification => notification.category)))];
  const visibleNotifs = enrichedNotifs.filter(notification => {
    const matchesSearch = !notifSearch.trim() || notificationText(notification).includes(notifSearch.trim().toLowerCase());
    const matchesStatus = notifStatusFilter === 'all' || (notifStatusFilter === 'unread' ? !notification.read : notification.read);
    const matchesCategory = notifCategoryFilter === 'all' || notification.category === notifCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  const handleOpenNotification = async (notification: any) => {
    if (!notification.read) {
      await handleMarkOneRead(notification.notificationId);
    }
    const target = notificationTargetSection(role, notification.category || inferNotificationCategory(notification));
    const allowed = target === 'overview' || allowedSectionIds.split('|').includes(target);
    navigate(`${ROLE_PATHS[role]}?section=${allowed ? target : 'overview'}`);
    setShowNotifPanel(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setShowUserMenu(false);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  const handleSaveUserSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsSaving(true);
    try {
      const response = await apiService.updateCurrentUser({
        fullName: settingsForm.fullName,
        email: settingsForm.email,
        phone: settingsForm.phone,
      });
      const data = response.data || {};
      updateAuthenticatedUser({
        name: data.fullName || settingsForm.fullName,
        email: data.email || settingsForm.email,
        phone: data.phone || undefined,
        permissions: data.permissions || user.permissions,
        mfaEnabled: Boolean(data.mfaEnabled),
      });
      toast.success('User information updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update user information');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleToggleMfa = async (enabled: boolean) => {
    setMfaSaving(true);
    try {
      const response = await apiService.updateCurrentUserMfa(enabled);
      const data = response.data || {};
      setSettingsForm(prev => ({ ...prev, mfaEnabled: Boolean(data.mfaEnabled) }));
      updateAuthenticatedUser({ mfaEnabled: Boolean(data.mfaEnabled) });
      toast.success(enabled ? 'Multi-factor authentication activated' : 'Multi-factor authentication disabled');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update MFA');
    } finally {
      setMfaSaving(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#2D5040]">
        <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Coffee className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">CoffeeSCM</p>
          <p className="text-green-400 text-xs">IMPEXCOR Ltd</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-[#2D5040]">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${ROLE_COLORS[role]} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
            {user.initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role]} text-white mt-0.5`}>
              {roleDisplayLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-green-500 text-xs font-medium uppercase tracking-wider px-2 mb-2">{t('menu')}</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          // For the Notifications nav item, use live unread count
          const badge = item.id === 'notifications' ? (unreadCount > 0 ? unreadCount : undefined) : item.badge;
          const navLabel = role === 'farmer' && item.id === 'profile' && farmerSupplierType === 'COOPERATIVE'
            ? 'Farms'
            : t(item.labelKey);
          
          if (item.id === 'notifications') {
            return (
              <button
                key={item.id}
                onClick={() => {
                  setShowNotifPanel(true);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all group ${
                  showNotifPanel
                    ? 'bg-[#2D5A40] text-white'
                    : 'text-green-200 hover:bg-[#243D30] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${showNotifPanel ? 'text-amber-400' : 'text-green-400 group-hover:text-amber-300'}`} />
                <span className="text-sm flex-1 text-left">{navLabel}</span>
                {badge && (
                  <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                {showNotifPanel && <ChevronRight className="w-3.5 h-3.5 text-green-400" />}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              to={`${ROLE_PATHS[role]}?section=${item.id}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all group ${
                isActive
                  ? 'bg-[#2D5A40] text-white'
                  : 'text-green-200 hover:bg-[#243D30] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-green-400 group-hover:text-amber-300'}`} />
              <span className="text-sm flex-1">{navLabel}</span>
              {badge && (
                <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-green-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[#2D5040]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-green-300 hover:bg-[#243D30] hover:text-white transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span className="text-sm">{t('nav.sign_out')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F4F0EB] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#1C3829] flex-shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#1C3829] flex flex-col z-10">
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-400" />
                <span className="text-white font-semibold">CoffeeSCM</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-green-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 flex items-center justify-between px-4 lg:px-6 h-14 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center text-sm text-stone-500 gap-1.5">
              <Coffee className="w-4 h-4 text-amber-600" />
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-stone-800 font-medium">{portalDisplayLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => { setShowLangMenu(!showLangMenu); setShowNotifPanel(false); setShowUserMenu(false); }}
                className="relative p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg flex items-center gap-1"
              >
                <Globe className="w-5 h-5" />
                <span className="text-xs font-semibold uppercase">{i18n.language}</span>
              </button>
              {showLangMenu && (
                <div className="absolute right-0 top-11 w-32 bg-white rounded-xl shadow-xl border border-stone-200 z-50 py-1">
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'rw', label: 'Kinyarwanda' },
                    { code: 'fr', label: 'Français' },
                  ].map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); window.localStorage.setItem('coffee-scm-language', lang.code); setShowLangMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${i18n.language === lang.code ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-stone-600 hover:bg-stone-50'}`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifPanel(!showNotifPanel); setShowUserMenu(false); }}
                className="relative p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 top-11 w-[440px] max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-stone-100 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-stone-50/80">
                    <div>
                      <p className="font-bold text-stone-800 text-sm">Notifications</p>
                      <p className="text-xs text-stone-400">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} • {visibleNotifs.length} shown</p>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="p-3 border-b border-stone-100 space-y-2 bg-white">
                    <input
                      value={notifSearch}
                      onChange={event => setNotifSearch(event.target.value)}
                      placeholder="Search notifications..."
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(['all', 'unread', 'read'] as const).map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setNotifStatusFilter(status)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${notifStatusFilter === status ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                        >
                          {status === 'all' ? 'All' : status === 'unread' ? 'Unread' : 'Read'}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {notificationCategories.map(category => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setNotifCategoryFilter(category)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap ${notifCategoryFilter === category ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                        >
                          {category === 'all' ? 'All Types' : category}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto divide-y divide-stone-50">
                    {notifs.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Bell className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                        <p className="text-sm text-stone-400 font-medium">No notifications yet</p>
                        <p className="text-xs text-stone-300 mt-1">You'll see updates here as they happen</p>
                      </div>
                    ) : visibleNotifs.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Bell className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                        <p className="text-sm text-stone-400 font-medium">No matching notifications</p>
                        <p className="text-xs text-stone-300 mt-1">Try changing the search or filters.</p>
                      </div>
                    ) : visibleNotifs.map((n) => {
                      const style = notificationStyle(n.priority);
                      return (
                        <div
                          key={n.notificationId}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleOpenNotification(n)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleOpenNotification(n);
                            }
                          }}
                          className={`px-4 py-3 transition-colors cursor-pointer ${!n.read ? 'bg-emerald-50/50' : 'bg-white'} hover:bg-stone-50`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm leading-snug ${!n.read ? 'font-bold text-stone-800' : 'font-medium text-stone-600'}`}>{n.title}</p>
                                {!n.read && <span className="rounded-full bg-emerald-500 text-white text-[10px] px-2 py-0.5 font-bold">New</span>}
                              </div>
                              <p className="text-xs text-stone-500 mt-1 leading-relaxed">{n.message}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${style.pill}`}>{n.priority}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-stone-200 bg-stone-50 text-stone-600 font-semibold">{n.category}</span>
                                <span className="text-[10px] text-stone-400">{new Date(n.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="flex gap-2 mt-3">
                                {!n.read && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleMarkOneRead(n.notificationId);
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs font-semibold hover:bg-white"
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-3 text-center border-t border-stone-100 bg-stone-50/50">
                    <button onClick={() => setShowNotifPanel(false)} className="text-xs text-stone-500 hover:text-stone-700 font-medium">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifPanel(false); }}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                <div className={`w-7 h-7 rounded-full ${ROLE_COLORS[role]} flex items-center justify-center text-white text-xs font-semibold`}>
                  {user.initials}
                </div>
                <span className="hidden sm:block text-sm font-medium text-stone-700">{user.name.split(' ')[0]}</span>
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-xl border border-stone-200 z-50">
                  <div className="p-3 border-b border-stone-100">
                    <p className="text-sm font-semibold text-stone-800">{user.name}</p>
                    <p className="text-xs text-stone-500">{user.email}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[role]} text-white`}>
                      {roleDisplayLabel}
                    </span>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserSettings(true);
                        setShowUserMenu(false);
                        setShowNotifPanel(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 rounded-lg"
                    >
                      <Settings className="w-4 h-4" /> {t('nav.settings')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" /> {t('nav.sign_out')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {showUserSettings && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close user settings"
            onClick={() => setShowUserSettings(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-y-auto">
            <div className="px-5 py-4 border-b border-stone-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Account</p>
                <h2 className="text-lg font-bold text-stone-800 mt-1">User Settings</h2>
                <p className="text-sm text-stone-500 mt-0.5">Edit your profile information and security preferences.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUserSettings(false)}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {settingsLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <form onSubmit={handleSaveUserSettings} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Full Name</label>
                        <input
                          required
                          value={settingsForm.fullName}
                          onChange={e => setSettingsForm(prev => ({ ...prev, fullName: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Email</label>
                        <input
                          required
                          type="email"
                          value={settingsForm.email}
                          onChange={e => setSettingsForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Phone</label>
                        <input
                          value={settingsForm.phone}
                          onChange={e => setSettingsForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="+250..."
                          className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={settingsSaving}
                        className="px-4 py-2.5 bg-[#1C3829] text-white text-sm font-semibold rounded-lg hover:bg-[#2D5A40] disabled:opacity-60"
                      >
                        {settingsSaving ? 'Saving...' : 'Save Information'}
                      </button>
                    </div>
                  </form>

                  <div className="rounded-xl border border-stone-200 p-4 bg-stone-50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settingsForm.mfaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-800">Multi-Factor Authentication</p>
                          <p className="text-sm text-stone-500 mt-0.5">
                            {settingsForm.mfaEnabled
                              ? 'MFA is active. Your next login will require an email verification code.'
                              : 'Activate MFA to require an email verification code when signing in.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={mfaSaving}
                        onClick={() => handleToggleMfa(!settingsForm.mfaEnabled)}
                        className={`px-4 py-2.5 text-sm font-semibold rounded-lg disabled:opacity-60 ${
                          settingsForm.mfaEnabled
                            ? 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {mfaSaving ? 'Updating...' : settingsForm.mfaEnabled ? 'Disable MFA' : 'Activate MFA'}
                      </button>
                    </div>
                  </div>

                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel logout"
            onClick={() => setShowLogoutConfirm(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-stone-900">Sign Out</h3>
                <p className="text-sm text-stone-500 mt-2">
                  Are you sure you want to sign out? You will need to log back in to access the system.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
              >
                No, cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
