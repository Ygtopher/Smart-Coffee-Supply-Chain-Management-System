import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { enqueueAggregatorWrite, getAggregatorQueue, syncAggregatorQueue } from '../../services/offlineSync';
import { RoleReports } from '../../components/RoleReports';
// Local states to replace mock data
const notifications = { aggregator: [] };
const mockBatches: any[] = [];
const systemUsers: any[] = [];
import {
  Users, Package, Truck, CheckCircle2, Clock, AlertCircle,
  Plus, Search, Filter, ChevronRight, ArrowUpRight, Calendar, MapPin,
  Eye, Banknote, Smartphone, Building2, Coffee, Bell, Download, Wifi, WifiOff, AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const chartSortClass = "px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600";
const COFFEE_VARIETIES = ['Red Bourbon', 'Bourbon', 'Jackson', 'Mibirizi', 'Typica', 'Gesha'];
const currentCherryPriceFrom = (marketPrices: any) => {
  return String(Number(marketPrices?.baselineRatePerKg || 2600));
};
const coffeeVarietiesForRequest = (request: any) => {
  const raw = request?.availableCoffeeVarieties || request?.farmer?.farmerProfile?.farmDetails?.coffeeVarieties || request?.coffeeVariety || request?.requestedCoffeeVariety || '';
  const parsed = String(raw)
    .split(',')
    .map(variety => variety.trim())
    .filter(Boolean);
  return parsed.length ? parsed : COFFEE_VARIETIES;
};

const prepareReceiptUpload = async (file: File) => {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isImage && !isPdf) throw new Error('Upload a receipt as a photo or PDF file.');

  const readAsDataUrl = (targetFile: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read receipt file'));
    reader.readAsDataURL(targetFile);
  });

  const compressImage = (targetFile: File) => new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(targetFile);
    image.onload = () => {
      const maxSide = 1000;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not prepare photo receipt'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.68));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not load receipt photo'));
    };
    image.src = objectUrl;
  });

  return {
    fileName: isImage ? `${file.name.replace(/\.[^.]+$/, '') || 'payment-receipt'}.jpg` : file.name,
    dataUrl: await (isImage ? compressImage(file) : readAsDataUrl(file)),
  };
};
const monthYearValue = (row: any) => {
  const source = row?.month || row?.date || row?.year || '';
  if (!source) return 0;
  const d = new Date(source);
  if (!Number.isNaN(d.getTime())) return d.getTime();
  const parsed = Date.parse(`1 ${source}`);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const humanizeDefectKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const formatDefectSummary = (defects: any) => {
  if (!defects) return 'No defects recorded';
  const parsed = typeof defects === 'string'
    ? (() => {
      try { return JSON.parse(defects); } catch { return defects; }
    })()
    : defects;
  if (typeof parsed !== 'object') return String(parsed);
  const entries = Object.entries(parsed)
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => `${humanizeDefectKey(key)}: ${value}`);
  return entries.length ? entries.join(', ') : 'No defects recorded';
};
const formatQualitySummary = (quality: any) => quality
  ? `${quality.cuppingScore ?? 'N/A'} pts - ${formatDefectSummary(quality.defects)}`
  : 'Pending assessment';

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

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    initiated: 'bg-sky-100 text-sky-700',
    failed: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-700',
    processing: 'bg-blue-100 text-blue-700',
    'quality-check': 'bg-violet-100 text-violet-700',
    received: 'bg-stone-100 text-stone-600',
    exported: 'bg-emerald-100 text-emerald-700',
    dispatched: 'bg-sky-100 text-sky-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    collected: 'bg-sky-100 text-sky-700',
    needs_consolidation: 'bg-amber-100 text-amber-700',
    split_required: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-stone-100 text-stone-600'}`}>
      {status}
    </span>
  );
};

const evaluateProcessingBatchWeight = (weightKg: number) => {
  if (weightKg < 100) {
    return {
      code: 'needs_consolidation',
      label: 'Needs Consolidation',
      canProcess: false,
      tone: 'amber',
      message: 'Below 100 kg. Consolidate with more farmer receipts before CWS processing.',
    };
  }

  if (weightKg > 500) {
    return {
      code: 'split_required',
      label: 'Split Required',
      canProcess: false,
      tone: 'red',
      message: 'Above 500 kg. Split into smaller processing batches before QR generation.',
    };
  }

  return {
    code: 'valid_processing_cycle',
    label: 'Valid Processing Cycle',
    canProcess: true,
    tone: 'emerald',
    message: 'Within the 100-500 kg CWS processing range.',
  };
};

const ProcessingWeightRuleCard = ({ rule, weightKg }: { rule: any; weightKg: number }) => {
  const styles = rule?.tone === 'red'
    ? 'bg-red-50 border-red-200 text-red-800'
    : rule?.tone === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-emerald-50 border-emerald-100 text-emerald-800';

  return (
    <div className={`rounded-xl border p-3 text-xs ${styles}`}>
      <div className="flex items-start gap-2">
        {rule?.canProcess ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
        <div>
          <p className="font-bold">{rule?.label || 'Processing Weight Rule'}: {Number(weightKg || 0).toLocaleString()} kg</p>
          <p className="mt-1">{rule?.message || 'CWS processing cycle must be between 100 kg and 500 kg.'}</p>
        </div>
      </div>
    </div>
  );
};

const calculateRecommendedSplits = (totalWeight: number) => {
  const batchCount = Math.ceil(totalWeight / 500);
  const baseWeight = Math.floor((totalWeight / batchCount) * 100) / 100;
  const splits = Array(batchCount).fill(baseWeight);
  const remainder = Number((totalWeight - splits.reduce((sum, weight) => sum + weight, 0)).toFixed(2));
  splits[splits.length - 1] = Number((splits[splits.length - 1] + remainder).toFixed(2));
  return splits;
};

const DEFAULT_WASHING_STATIONS = [
  { id: 'kivu-washing-station', name: 'Kivu Washing Station', district: 'Nyamasheke' },
  { id: 'nyungwe-washing-station', name: 'Nyungwe Washing Station', district: 'Nyaruguru' },
  { id: 'muhazi-washing-station', name: 'Muhazi Washing Station', district: 'Rwamagana' },
  { id: 'gakenke-washing-station', name: 'Gakenke Washing Station', district: 'Gakenke' },
];

const parseCoordinates = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]) };
};

type MapCoordinates = { lat: number; lng: number };

const farmProfileFrom = (source?: any) => {
  const profile = source?.farmer?.farmerProfile || source?.farmerProfile || source?.profile || {};
  const details = profile?.farmDetails || source?.farmDetails || source?.farmer?.farmDetails || source?.farm || {};
  const coordinates = profile?.coordinates || details?.coordinates || source?.farmCoordinates || source?.coordinates || null;
  const gpsLocation = profile?.gpsLocation || details?.gpsLocation || source?.farmLocation || source?.gpsLocation || null;

  return {
    ...details,
    ...profile,
    coordinates,
    gpsLocation,
    farmDetails: {
      ...details,
      ...profile?.farmDetails,
      coordinates,
      gpsLocation,
      farmName: profile?.farmName || details?.farmName || source?.farmName,
    },
  };
};

const farmDetailsCoordinates = (farmerProfile?: any) => {
  const profile = farmProfileFrom(farmerProfile);
  return profile.coordinates || profile.farmDetails?.coordinates || farmerProfile?.farmCoordinates || null;
};

const farmCoordinateDestination = (farmerProfile?: any) => {
  const coordinates = parseCoordinates(farmDetailsCoordinates(farmerProfile));
  if (coordinates) {
    return `${coordinates.lat},${coordinates.lng}`;
  }
  return null;
};

const farmerMapUrl = (farmerProfile?: any, origin?: MapCoordinates | null) => {
  const destination = farmCoordinateDestination(farmerProfile);
  if (!destination) return '';
  const source = origin ? `${origin.lat},${origin.lng}` : 'Current Location';
  return `https://maps.google.com/maps?saddr=${encodeURIComponent(source)}&daddr=${encodeURIComponent(destination)}&output=embed`;
};

const farmerNavigationUrl = (farmerProfile?: any, origin?: MapCoordinates | null) => {
  const destination = farmCoordinateDestination(farmerProfile);
  if (!destination) return '';
  const originParam = origin ? `&origin=${encodeURIComponent(`${origin.lat},${origin.lng}`)}` : '';
  return `https://www.google.com/maps/dir/?api=1${originParam}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
};

const enrichWithRegisteredFarmProfile = async (request: any) => {
  const farmerId = request?.farmer?.userId || request?.farmerId || request?.userId;
  if (!farmerId) return request;

  const farmersRes = await apiService.getAllUsers(1, 500, 'FARMER');
  const farmer = (farmersRes.data || []).find((u: any) => u.userId === farmerId);
  if (!farmer?.farmerProfile) return request;

  const requestProfile = request?.farmer?.farmerProfile || {};
  const registeredProfile = farmer.farmerProfile;
  const registeredCoordinates = registeredProfile.coordinates || farmDetailsCoordinates(request);
  const registeredLocation = registeredProfile.gpsLocation || requestProfile.gpsLocation || request.farmLocation;

  return {
    ...request,
    farmCoordinates: registeredCoordinates || request.farmCoordinates,
    farmLocation: registeredLocation || request.farmLocation,
    farmer: {
      ...request.farmer,
      fullName: request.farmer?.fullName || farmer.fullName,
      phone: request.farmer?.phone || farmer.phone,
      email: request.farmer?.email || farmer.email,
      farmerProfile: {
        ...requestProfile,
        ...registeredProfile,
        farmSizeHa: registeredProfile.farmSizeHa ?? requestProfile.farmSizeHa,
        coordinates: registeredCoordinates || requestProfile.coordinates || request.farmCoordinates,
        gpsLocation: registeredLocation || requestProfile.gpsLocation || request.farmLocation,
        farmDetails: {
          ...requestProfile.farmDetails,
          ...registeredProfile.farmDetails,
          coordinates: registeredCoordinates || requestProfile.farmDetails?.coordinates || requestProfile.coordinates || request.farmCoordinates,
          gpsLocation: registeredLocation || requestProfile.farmDetails?.gpsLocation || requestProfile.gpsLocation || request.farmLocation,
          farmName: registeredProfile.farmName || requestProfile.farmName || requestProfile.farmDetails?.farmName,
        },
      },
    },
  };
};

function FarmerRouteMap({ farmerProfile }: { farmerProfile?: any }) {
  const [origin, setOrigin] = useState<MapCoordinates | null>(null);
  const [fallbackProfile, setFallbackProfile] = useState<any | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'ready' | 'blocked' | 'unsupported'>('loading');

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('ready');
      },
      () => setLocationStatus('blocked'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    const farmerId = farmerProfile?.farmer?.userId || farmerProfile?.farmerId || farmerProfile?.userId;
    setFallbackProfile(null);
    if (!farmerId) return;
    let active = true;
    apiService.getAllUsers(1, 500, 'FARMER')
      .then((res) => {
        const farmer = (res.data || []).find((u: any) => u.userId === farmerId);
        if (active && farmer?.farmerProfile) setFallbackProfile(farmer.farmerProfile);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [farmerProfile]);

  const routeSource = fallbackProfile ? { farmerProfile: fallbackProfile } : farmerProfile;
  const profile = farmProfileFrom(routeSource);
  const destination = farmCoordinateDestination(profile);
  const destinationLabel = farmDetailsCoordinates(routeSource) || 'Missing farm coordinates';

  if (!destination) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 min-h-[360px] p-5 flex flex-col justify-center">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Farm coordinates required</p>
            <p className="text-sm text-amber-800 mt-1">
              Add coordinates to this farmer's farm profile to show the route from the aggregator's current location to the farm.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 min-h-[360px]">
      <iframe title="Route to farm location" src={farmerMapUrl(routeSource, origin)} className="w-full h-[360px] border-0" loading="lazy" />
      <div className="p-3 bg-white border-t border-stone-100 flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <MapPin className="w-4 h-4 text-emerald-600" />
        <span className="flex-1 min-w-[180px]">
          {locationStatus === 'ready'
            ? `Route from aggregator location to ${destinationLabel}`
            : locationStatus === 'blocked'
              ? `Location permission needed to route from the aggregator. Destination: ${destinationLabel}`
              : locationStatus === 'unsupported'
                ? `Browser location is unavailable. Destination: ${destinationLabel}`
                : `Getting aggregator location for route to ${destinationLabel}`}
        </span>
        {locationStatus === 'blocked' && (
          <button type="button" onClick={requestLocation} className="font-semibold text-emerald-700 hover:text-emerald-900">
            Retry location
          </button>
        )}
        <a href={farmerNavigationUrl(routeSource, origin)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:text-emerald-900">
          Open route
        </a>
      </div>
    </div>
  );
}

function SyncStatus() {
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  const refresh = useCallback(async () => {
    setQueueCount((await getAggregatorQueue()).length);
  }, []);

  useEffect(() => {
    refresh();
    const handleOnline = async () => {
      setOnline(true);
      const result = await syncAggregatorQueue(apiService.getToken());
      if (result.synced > 0) toast.success(`Synced ${result.synced} offline record(s)`);
      refresh();
    };
    const handleOffline = () => setOnline(false);
    const handleQueue = () => refresh();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('aggregator-sync-queue-changed', handleQueue);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('aggregator-sync-queue-changed', handleQueue);
    };
  }, [refresh]);

  const syncNow = async () => {
    const result = await syncAggregatorQueue(apiService.getToken());
    refresh();
    toast.success(result.synced > 0 ? `Synced ${result.synced} record(s)` : 'No offline records to sync');
  };

  return (
    <button onClick={syncNow} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${online ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
      {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      {online ? 'Online' : 'Offline'} {queueCount > 0 ? `- ${queueCount} saved locally` : ''}
    </button>
  );
}

async function saveAggregatorWrite(endpoint: string, method: 'POST' | 'PATCH', body: Record<string, any>, onlineAction: () => Promise<any>) {
  if (!navigator.onLine) {
    await enqueueAggregatorWrite(endpoint, method, body);
    toast.success('Saved locally. It will sync when internet returns.');
    return { queued: true };
  }
  try {
    return await onlineAction();
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (navigator.onLine && !message.toLowerCase().includes('fetch')) {
      toast.error(message || 'Request failed');
      throw err;
    }
    await enqueueAggregatorWrite(endpoint, method, body);
    toast.success('Connection failed, so this was saved locally for sync.');
    return { queued: true };
  }
}

function Overview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [volumeSort, setVolumeSort] = useState('year');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await apiService.getAggregatorDashboard();
        setDashboardData(response.data);
      } catch (err) {
        console.error('Failed to fetch aggregator dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const volumeData = Object.values((dashboardData?.pickups || []).reduce((acc: Record<string, any>, pickup: any) => {
    const date = new Date(pickup.scheduledDate || pickup.deliveryDate || Date.now());
    const month = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (!acc[month]) acc[month] = { month, weight: 0, pickups: 0, sort: new Date(date.getFullYear(), date.getMonth(), 1).getTime() };
    acc[month].weight += Number(pickup.weight || pickup.weightKg || 0);
    acc[month].pickups += 1;
    return acc;
  }, {}));
  const sortedVolumeData = volumeSort === 'month'
    ? [...volumeData].sort((a: any, b: any) => new Date(monthYearValue(a)).getMonth() - new Date(monthYearValue(b)).getMonth())
    : [...volumeData].sort((a: any, b: any) => Number(a.sort || monthYearValue(a)) - Number(b.sort || monthYearValue(b)));

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;
  const pickups = dashboardData?.pickups || [];
  const estimatedTransportCo2Kg = Number(((Number(dashboardData?.totalWeight || 0) / 1000) * 18).toFixed(1));
  const receiptCoverage = pickups.length ? 100 : 0;
  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-[#1C3829] to-[#2D5A40] rounded-2xl p-5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-green-300 text-sm mb-1">{t('welcome')},</p>
            <h2 className="text-xl font-bold">{user?.name || 'Aggregator'}</h2>
            <p className="text-green-200 text-sm mt-1">Collection operations, offline sync, traceability, and farmer registration</p>
          </div>
          <SyncStatus />
        </div>
        <div className="mt-4 pt-4 border-t border-green-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[{ label: 'Zone', value: 'Assigned cooperatives' }, { label: 'Batches Created', value: String(dashboardData?.totalBatches || 0) }, { label: 'Season', value: '2025/26' }, { label: 'Status', value: 'Active' }].map(s => (
            <div key={s.label}>
              <p className="text-green-300 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('aggregator.total_farmers')} value={String(dashboardData?.assignedFarmers || 0)} sub="Total assigned" icon={Users} color="bg-emerald-600" />
        <KPICard label={t('aggregator.recent_pickups')} value={String(dashboardData?.totalPickups || 0)} sub={`${dashboardData?.totalWeight || 0} kg total`} icon={Truck} color="bg-amber-600" />
        <KPICard label="Payment Receipts" value={String(dashboardData?.totalPickups || 0)} sub="Uploaded after pickup" icon={CheckCircle2} color="bg-rose-500" />
        <KPICard label={t('nav.batches')} value={String(dashboardData?.totalBatches || 0)} sub="All time" icon={Package} color="bg-violet-600" />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-stone-800">Collection Snapshot</h3>
            <p className="text-sm text-stone-500 mt-0.5">Cooperative-level activity from recorded pickups and payment receipt uploads</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">Dashboard KPI</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Farmers served', Number(dashboardData?.assignedFarmers || 0).toLocaleString()],
            ['Cherry collected', `${Number(dashboardData?.totalWeight || 0).toLocaleString()} kg`],
            ['Payment receipt coverage', `${receiptCoverage}%`],
            ['Ready for batching', Number(pickups.filter((pickup: any) => !pickup.batchId).length).toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-xs text-emerald-700">{label}</p>
              <p className="text-lg font-bold text-stone-800 mt-1">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Estimated pickup transport footprint: {estimatedTransportCo2Kg.toLocaleString()} kg CO2e. This stays as a dashboard indicator instead of a separate module.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-stone-800">Monthly Collection Volume (kg)</h3>
            <select value={volumeSort} onChange={e => setVolumeSort(e.target.value)} className={chartSortClass}>
              <option value="year">Year</option>
              <option value="month">Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sortedVolumeData.length ? sortedVolumeData : [{ month: 'No data', weight: 0, pickups: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="weight" stroke="#2D6A4F" strokeWidth={2.5} name="Weight (kg)" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="pickups" stroke="#d97706" strokeWidth={2.5} name="Pickups" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Upcoming Pickups</h3>
          <div className="space-y-3">
            {(dashboardData?.pickups || []).filter((p: any) => !p.batchId).slice(0, 4).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 bg-stone-50 rounded-lg">
                <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{p.farmerName}</p>
                  <p className="text-xs text-stone-400">{new Date(p.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                </div>
                <span className="text-xs text-stone-500 ml-auto">{p.weight}kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FarmerList() {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    farmName: '',
    district: '',
    sector: '',
    farmSizeHa: '',
  });

  const fetchFarmers = useCallback(async () => {
    try {
      const response = await apiService.getAllUsers(1, 100, 'FARMER');
      setFarmers(response.data);
    } catch (err) {
      console.error('Failed to fetch farmers', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarmers();
  }, [fetchFarmers]);

  const handleRegisterFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, farmSizeHa: form.farmSizeHa ? Number(form.farmSizeHa) : undefined };
    try {
      const result = await saveAggregatorWrite('/aggregators/farmers', 'POST', payload, () => apiService.registerAggregatorFarmer(payload));
      if (!(result as any).queued) {
        toast.success('Farmer registered and linked to your cooperative');
        fetchFarmers();
      }
      setForm({ fullName: '', email: '', phone: '', farmName: '', district: '', sector: '', farmSizeHa: '' });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const filtered = farmers.filter(f =>
    f.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    f.email?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Farmer List</h2>
        <div className="flex items-center gap-2">
          <SyncStatus />
          <button onClick={() => setShowForm(v => !v)} className="px-4 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40] transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Farmer
          </button>
        </div>
      </div>
      {showForm && (
        <form onSubmit={handleRegisterFarmer} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['fullName', 'Full name', 'Marie Mukamana'],
              ['email', 'Email', 'farmer@example.com'],
              ['phone', 'Phone', '+25078...'],
              ['farmName', 'Farm name', 'Nyungwe Plot 4'],
              ['district', 'District', 'Nyamasheke'],
              ['sector', 'Sector', 'Rangiro'],
              ['farmSizeHa', 'Farm size (ha)', '1.5'],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-stone-500 mb-1">{label}</label>
                <input
                  required={['fullName', 'email', 'phone', 'farmName', 'district'].includes(key)}
                  type={key === 'farmSizeHa' ? 'number' : 'text'}
                  step={key === 'farmSizeHa' ? '0.1' : undefined}
                  value={(form as any)[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-semibold text-stone-600">Cancel</button>
            <button disabled={saving} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Register Farmer'}
            </button>
          </div>
        </form>
      )}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search farmers..."
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Farmer', 'Phone', 'Grade', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map(f => (
                  <tr key={f.userId} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-semibold flex-shrink-0">
                          {(f.fullName || 'F').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-stone-800 whitespace-nowrap">{f.fullName}</p>
                          <p className="text-xs text-stone-400">{f.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-stone-600 whitespace-nowrap">
                        {f.phone || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">A1</span></td>
                    <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-3">
                      <button className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}

function PickupSchedule() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentCherryPrice, setCurrentCherryPrice] = useState('2600');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [selectedFarmerRequest, setSelectedFarmerRequest] = useState<any | null>(null);
  const [completionRequest, setCompletionRequest] = useState<any | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualWeightKg: '',
    pricePerKg: '2600',
    receiptFileName: '',
    receiptDataUrl: '',
    condition: 'fresh',
    coffeeVariety: '',
    notes: '',
  });
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await apiService.getPickupRequests();
      setRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch pickup requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);
  useEffect(() => {
    apiService.getMarketPrices()
      .then(res => {
        const price = currentCherryPriceFrom(res.data);
        setCurrentCherryPrice(price);
        setCompleteForm(prev => ({ ...prev, pricePerKg: prev.pricePerKg === '2600' ? price : prev.pricePerKg }));
      })
      .catch(() => { });
  }, []);

  const handleApprove = async (requestId: string) => {
    if (!selectedDate) {
      toast.error('Please select a pickup date first');
      return;
    }
    setProcessing(requestId);
    try {
      await apiService.updatePickupRequest(requestId, { status: 'APPROVED', pickupDate: selectedDate });
      toast.success('Pickup request approved!');
      fetchRequests();
    } catch {
      toast.error('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      await apiService.updatePickupRequest(requestId, { status: 'REJECTED' });
      toast.error('Request rejected.');
      fetchRequests();
    } catch {
      toast.error('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const openCompletePickup = (request: any) => {
    setCompletionRequest(request);
    setCompleteForm({
      actualWeightKg: String(request.weightEstimate || ''),
      pricePerKg: currentCherryPrice,
      receiptFileName: '',
      receiptDataUrl: '',
      condition: 'fresh',
      coffeeVariety: request.coffeeVariety || request.requestedCoffeeVariety || 'Red Bourbon',
      notes: '',
    });
  };

  const handleReceiptFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const receipt = await prepareReceiptUpload(file);
      setCompleteForm(prev => ({
        ...prev,
        receiptFileName: receipt.fileName,
        receiptDataUrl: receipt.dataUrl,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload receipt');
    }
  };

  const handleCompletePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionRequest) return;
    setProcessing(completionRequest.requestId);
    const payload = {
      ...completeForm,
      actualWeightKg: Number(completeForm.actualWeightKg),
      pricePerKg: Number(completeForm.pricePerKg),
      farmerId: completionRequest.farmerId,
    };
    try {
      await saveAggregatorWrite(
        `/aggregators/pickup-requests/${completionRequest.requestId}/complete`,
        'POST',
        payload,
        async () => {
          try {
            return await apiService.completePickupRequest(completionRequest.requestId, payload);
          } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (!message.includes('404')) throw err;
            await apiService.recordPickup({
              farmerId: completionRequest.farmerId,
              weightKg: payload.actualWeightKg,
              pricePerKg: payload.pricePerKg,
            });
            return apiService.updatePickupRequest(completionRequest.requestId, {
              status: 'COLLECTED',
              pickupDate: new Date().toISOString(),
            });
          }
        }
      );
      toast.success('Pickup completed and payment receipt recorded');
      setCompletionRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete pickup');
    } finally {
      setProcessing(null);
    }
  };

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDow = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const paddingDays = (firstDow + 6) % 7; // shift to Mon=0
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Dates that have an APPROVED pickup scheduled
  const scheduledDates = new Set(
    requests
      .filter(r => r.status === 'APPROVED' && r.pickupDate)
      .map(r => new Date(r.pickupDate).toDateString())
  );

  const displayed = activeTab === 'pending'
    ? requests.filter(r => r.status === 'PENDING')
    : requests;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingPickups = requests
    .filter(r => r.status === 'APPROVED' && r.pickupDate && new Date(r.pickupDate) >= todayStart)
    .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());
  const overduePickups = requests.filter(r => r.status === 'APPROVED' && r.pickupDate && new Date(r.pickupDate) < todayStart);
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const collectedRequests = requests.filter(r => r.status === 'COLLECTED');
  const progressTotal = Math.max(requests.length, 1);
  const progressRows = [
    { label: 'Pending approval', count: pendingRequests.length, color: 'bg-amber-500', note: 'Needs schedule decision' },
    { label: 'Scheduled upcoming', count: upcomingPickups.length, color: 'bg-emerald-600', note: 'Approved and future dated' },
    { label: 'Overdue scheduled', count: overduePickups.length, color: 'bg-rose-500', note: 'Pickup date has passed' },
    { label: 'Completed pickups', count: collectedRequests.length, color: 'bg-sky-600', note: 'Payment receipt uploaded' },
  ];

  const openFarmerMap = async (request: any) => {
    try {
      setSelectedFarmerRequest(await enrichWithRegisteredFarmProfile(request));
    } catch (err) {
      console.error('Failed to hydrate farmer profile for map', err);
      setSelectedFarmerRequest(request);
    }
  };

  const selectedFarmProfile = selectedFarmerRequest ? farmProfileFrom(selectedFarmerRequest) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-stone-800">Pickup Schedule</h2>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-[#1C3829] text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            Pending ({requests.filter(r => r.status === 'PENDING').length})
          </button>
          <button onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'all' ? 'bg-[#1C3829] text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            All Requests
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Compact Calendar */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }}
              className="p-1 hover:bg-stone-100 rounded-lg text-stone-500">‹</button>
            <span className="text-sm font-bold text-stone-800">{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }}
              className="p-1 hover:bg-stone-100 rounded-lg text-stone-500">›</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-stone-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: paddingDays }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dateStr = new Date(calYear, calMonth, day).toDateString();
              const isToday = new Date(calYear, calMonth, day).toDateString() === today.toDateString();
              const hasPickup = scheduledDates.has(dateStr);
              const fullDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDate === fullDate;
              return (
                <button key={day}
                  onClick={() => setSelectedDate(isSelected ? '' : fullDate)}
                  className={`aspect-square text-xs flex flex-col items-center justify-center rounded-lg transition-all ${isSelected ? 'bg-emerald-600 text-white font-bold' :
                      isToday ? 'bg-emerald-100 text-emerald-700 font-bold' :
                        'hover:bg-stone-100 text-stone-700'
                    }`}>
                  {day}
                  {hasPickup && !isSelected && <div className="w-1 h-1 rounded-full bg-amber-500 mt-0.5" />}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs text-emerald-700 font-semibold">Selected pickup date:</p>
              <p className="text-sm font-bold text-emerald-800">{new Date(selectedDate + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p className="text-[10px] text-emerald-600 mt-1">Click Approve on a request below to schedule it for this date.</p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 text-[10px] text-stone-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Scheduled</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Today</span>
          </div>
        </div>

        {/* Request List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-semibold text-stone-700">{activeTab === 'pending' ? 'No pending requests!' : 'No requests found.'}</p>
              <p className="text-sm text-stone-400 mt-1">All farmer pickup requests are up to date.</p>
            </div>
          ) : (
            displayed.map(r => (
              <div key={r.requestId} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                      {(r.farmer?.fullName || 'F').split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <button onClick={() => openFarmerMap(r)} className="font-bold text-stone-800 hover:text-emerald-700 text-left">
                        {r.farmer?.fullName}
                      </button>
                      <p className="text-xs text-stone-500">{r.farmer?.farmerProfile?.farmName || 'Unknown Farm'} • {r.farmer?.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'COLLECTED' ? 'bg-sky-100 text-sky-700' :
                          'bg-red-100 text-red-700'
                    }`}>{r.status}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'Est. Weight', value: `${r.weightEstimate} kg` },
                    { label: 'Requested', value: new Date(r.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) },
                    { label: 'Pickup Date', value: r.pickupDate ? new Date(r.pickupDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—' },
                  ].map(d => (
                    <div key={d.label} className="bg-stone-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider">{d.label}</p>
                      <p className="text-sm font-bold text-stone-800 mt-0.5">{d.value}</p>
                    </div>
                  ))}
                </div>

                {r.notes && <p className="text-xs text-stone-500 italic bg-stone-50 p-2.5 rounded-xl mb-3">"{r.notes}"</p>}

                {r.status === 'PENDING' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleApprove(r.requestId)}
                      disabled={processing === r.requestId || !selectedDate}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      {processing === r.requestId ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(r.requestId)}
                      disabled={processing === r.requestId}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-all disabled:opacity-50"
                    >
                      <AlertCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => openFarmerMap(r)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-stone-200"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Farmer Info & Map
                    </button>
                    {!selectedDate && <p className="text-[10px] text-stone-400 self-center ml-1">← Select a date on the calendar first</p>}
                  </div>
                )}
                {r.status === 'APPROVED' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openCompletePickup(r)}
                      disabled={processing === r.requestId}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1C3829] hover:bg-[#2D5A40] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                      <Truck className="w-3.5 h-3.5" /> Complete Pickup
                    </button>
                    <button
                      onClick={() => openFarmerMap(r)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-stone-200"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Farmer Info & Map
                    </button>
                  </div>
                )}
                {!['PENDING', 'APPROVED'].includes(r.status) && (
                  <button
                    onClick={() => openFarmerMap(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-bold rounded-xl border border-stone-200"
                  >
                    <MapPin className="w-3.5 h-3.5" /> Farmer Info & Map
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="font-bold text-stone-800">Pickup Progress</h3>
            <p className="text-xs text-stone-500 mt-0.5">Live progress across all farmer pickup requests</p>
          </div>
          <div className="text-sm font-bold text-emerald-700">
            {Math.round(((requests.length - pendingRequests.length) / progressTotal) * 100)}% processed
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {progressRows.map(row => {
            const percent = Math.round((row.count / progressTotal) * 100);
            return (
              <div key={row.label} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{row.label}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{row.note}</p>
                  </div>
                  <span className="text-lg font-bold text-stone-800">{row.count}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${percent}%` }} />
                </div>
                <p className="text-xs text-stone-500 mt-1">{percent}% of requests</p>
              </div>
            );
          })}
        </div>
      </div>

      {selectedFarmerRequest && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-stone-800">{selectedFarmerRequest.farmer?.fullName || 'Farmer details'}</h3>
                <p className="text-sm text-stone-500">{selectedFarmProfile?.farmName || 'Unknown farm'}</p>
              </div>
              <button onClick={() => setSelectedFarmerRequest(null)} className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50">Close</button>
            </div>
            <div className="grid lg:grid-cols-2 gap-5 p-5">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    ['Phone', selectedFarmerRequest.farmer?.phone || 'No phone'],
                    ['Email', selectedFarmerRequest.farmer?.email || 'No email'],
                    ['Farm size', `${selectedFarmProfile?.farmSizeHa || 0} ha`],
                    ['Location', selectedFarmProfile?.gpsLocation || 'No location recorded'],
                    ['Farm coordinates', farmDetailsCoordinates(selectedFarmerRequest) || 'Not captured'],
                    ['Cooperative', selectedFarmProfile?.cooperative?.name || 'Assigned cooperative'],
                    ['Collection zone', selectedFarmProfile?.cooperative?.zone || 'Not recorded'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-semibold text-stone-800 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-bold text-emerald-900">Pickup request</p>
                  <div className="grid sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <p className="text-xs text-emerald-700">Estimated weight</p>
                      <p className="font-bold text-emerald-950">{selectedFarmerRequest.weightEstimate || 0} kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-700">Pickup date</p>
                      <p className="font-bold text-emerald-950">{selectedFarmerRequest.pickupDate ? new Date(selectedFarmerRequest.pickupDate).toLocaleDateString('en-GB') : 'Not scheduled'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-700">Status</p>
                      <p className="font-bold text-emerald-950">{selectedFarmerRequest.status}</p>
                    </div>
                  </div>
                  {selectedFarmerRequest.notes && <p className="text-xs text-emerald-800 mt-3">{selectedFarmerRequest.notes}</p>}
                </div>
              </div>
              <FarmerRouteMap farmerProfile={selectedFarmerRequest} />
            </div>
          </div>
        </div>
      )}

      {completionRequest && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 p-4 flex items-center justify-center">
          <form onSubmit={handleCompletePickup} className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-3xl">
            <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-stone-800">Complete Pickup</h3>
                <p className="text-sm text-stone-500">{completionRequest.farmer?.fullName} - {completionRequest.farmer?.farmerProfile?.farmName || 'Unknown farm'}</p>
              </div>
              <button type="button" onClick={() => setCompletionRequest(null)} className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50">Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Actual weight (kg)</label>
                  <input required type="number" min="0.1" step="0.1" value={completeForm.actualWeightKg} onChange={e => setCompleteForm(prev => ({ ...prev, actualWeightKg: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Payment receipt upload</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleReceiptFile(e.target.files?.[0])} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                  <p className="mt-1 text-[10px] font-semibold text-emerald-700">{completeForm.receiptFileName || 'Upload payment receipt, scale slip, or signed intake note.'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Condition</label>
                  <select value={completeForm.condition} onChange={e => setCompleteForm(prev => ({ ...prev, condition: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                    <option value="fresh">Fresh</option>
                    <option value="delayed">Delayed</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Verified Coffee Variety</label>
                  <select value={completeForm.coffeeVariety} onChange={e => setCompleteForm(prev => ({ ...prev, coffeeVariety: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                    {coffeeVarietiesForRequest(completionRequest).map(variety => <option key={variety} value={variety}>{variety}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] font-semibold text-stone-500">Requested: {completionRequest?.coffeeVariety || completionRequest?.requestedCoffeeVariety || 'Red Bourbon'}</p>
                </div>
              </div>
              <textarea value={completeForm.notes} onChange={e => setCompleteForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Receipt notes or quality observations" className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[90px]" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCompletionRequest(null)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-semibold text-stone-600">Cancel</button>
                <button disabled={processing === completionRequest.requestId} className="px-4 py-2 bg-[#1C3829] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                  {processing === completionRequest.requestId ? 'Saving...' : 'Complete Pickup'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function RecordPickup() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentCherryPrice, setCurrentCherryPrice] = useState('2600');
  const [selectedFarmerRequest, setSelectedFarmerRequest] = useState<any | null>(null);
  const [completionRequest, setCompletionRequest] = useState<any | null>(null);
  const [completeForm, setCompleteForm] = useState({
    actualWeightKg: '',
    pricePerKg: '2600',
    receiptFileName: '',
    receiptDataUrl: '',
    condition: 'fresh',
    coffeeVariety: '',
    notes: '',
  });

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res = await apiService.getPickupRequests();
      setRequests(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pickup requests', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  useEffect(() => {
    apiService.getMarketPrices()
      .then(res => {
        const price = currentCherryPriceFrom(res.data);
        setCurrentCherryPrice(price);
        setCompleteForm(prev => ({ ...prev, pricePerKg: prev.pricePerKg === '2600' ? price : prev.pricePerKg }));
      })
      .catch(() => { });
  }, []);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingPickups = requests
    .filter(r => r.status === 'APPROVED' && r.pickupDate && new Date(r.pickupDate) >= todayStart)
    .sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());

  const openCompletePickup = (request: any) => {
    setCompletionRequest(request);
    setCompleteForm({
      actualWeightKg: String(request.weightEstimate || ''),
      pricePerKg: currentCherryPrice,
      receiptFileName: '',
      receiptDataUrl: '',
      condition: 'fresh',
      coffeeVariety: request.coffeeVariety || request.requestedCoffeeVariety || 'Red Bourbon',
      notes: '',
    });
  };

  const openFarmerMap = async (request: any) => {
    try {
      setSelectedFarmerRequest(await enrichWithRegisteredFarmProfile(request));
    } catch (err) {
      console.error('Failed to hydrate farmer profile for map', err);
      setSelectedFarmerRequest(request);
    }
  };

  const handleReceiptFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const receipt = await prepareReceiptUpload(file);
      setCompleteForm(prev => ({
        ...prev,
        receiptFileName: receipt.fileName,
        receiptDataUrl: receipt.dataUrl,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload receipt');
    }
  };

  const handleCompletePickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionRequest) return;
    if (!completeForm.receiptDataUrl) {
      toast.error('Upload the payment receipt as a photo or PDF before completing pickup.');
      return;
    }
    setProcessing(completionRequest.requestId);
    const payload = {
      ...completeForm,
      actualWeightKg: Number(completeForm.actualWeightKg),
      pricePerKg: Number(completeForm.pricePerKg),
      receiptFileName: completeForm.receiptFileName,
      receiptUrl: completeForm.receiptDataUrl,
      farmerId: completionRequest.farmerId,
    };
    try {
      await saveAggregatorWrite(
        `/aggregators/pickup-requests/${completionRequest.requestId}/complete`,
        'POST',
        payload,
        async () => {
          try {
            return await apiService.completePickupRequest(completionRequest.requestId, payload);
          } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (!message.includes('404')) throw err;
            await apiService.recordPickup({
              farmerId: completionRequest.farmerId,
              weightKg: payload.actualWeightKg,
              pricePerKg: payload.pricePerKg,
            });
            return apiService.updatePickupRequest(completionRequest.requestId, {
              status: 'COLLECTED',
              pickupDate: new Date().toISOString(),
            });
          }
        }
      );
      toast.success('Pickup completed and payment receipt recorded');
      setCompletionRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete pickup');
    } finally {
      setProcessing(null);
    }
  };

  const selectedFarmProfile = selectedFarmerRequest ? farmProfileFrom(selectedFarmerRequest) : null;

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Record Coffee Pickup</h2>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-stone-800">Upcoming Pickups</h3>
            <p className="text-xs text-stone-500 mt-0.5">Approved pickup requests ready for field collection and payment receipt upload</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
            {upcomingPickups.length} scheduled
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Pickup Date', 'Farmer', 'Farm', 'Phone', 'Est. Weight', 'Requested', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loadingRequests ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-stone-400">Loading upcoming pickups...</td></tr>
              ) : upcomingPickups.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-stone-400">No upcoming pickups scheduled yet.</td></tr>
              ) : (
                upcomingPickups.map(r => (
                  <tr key={r.requestId} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-stone-800 whitespace-nowrap">
                      {new Date(r.pickupDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">
                      <button onClick={() => openFarmerMap(r)} className="font-semibold hover:text-emerald-700">
                        {r.farmer?.fullName || 'Unknown farmer'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{r.farmer?.farmerProfile?.farmName || 'Unknown farm'}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{r.farmer?.phone || 'No phone'}</td>
                    <td className="px-4 py-3 font-semibold text-stone-800 whitespace-nowrap">{r.weightEstimate || 0} kg</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                      {r.requestedDate ? new Date(r.requestedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'N/A'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={(r.status || 'approved').toLowerCase()} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => openFarmerMap(r)} className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-50">
                          Map
                        </button>
                        <button onClick={() => openCompletePickup(r)} className="px-3 py-1.5 bg-[#1C3829] text-white rounded-lg text-xs font-semibold hover:bg-[#2D5A40]">
                          Complete Pickup
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFarmerRequest && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-stone-800">{selectedFarmerRequest.farmer?.fullName || 'Farmer details'}</h3>
                <p className="text-sm text-stone-500">{selectedFarmProfile?.farmName || 'Unknown farm'}</p>
              </div>
              <button onClick={() => setSelectedFarmerRequest(null)} className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50">Close</button>
            </div>
            <div className="grid lg:grid-cols-2 gap-5 p-5">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    ['Phone', selectedFarmerRequest.farmer?.phone || 'No phone'],
                    ['Email', selectedFarmerRequest.farmer?.email || 'No email'],
                    ['Farm size', `${selectedFarmProfile?.farmSizeHa || 0} ha`],
                    ['Location', selectedFarmProfile?.gpsLocation || 'No location recorded'],
                    ['Farm coordinates', farmDetailsCoordinates(selectedFarmerRequest) || 'Not captured'],
                    ['Cooperative', selectedFarmProfile?.cooperative?.name || 'Assigned cooperative'],
                    ['Collection zone', selectedFarmProfile?.cooperative?.zone || 'Not recorded'],
                    ['Estimated weight', `${selectedFarmerRequest.weightEstimate || 0} kg`],
                    ['Pickup status', selectedFarmerRequest.status],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-semibold text-stone-800 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                {selectedFarmerRequest.notes && <p className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">{selectedFarmerRequest.notes}</p>}
              </div>
              <FarmerRouteMap farmerProfile={selectedFarmerRequest} />
            </div>
          </div>
        </div>
      )}

      {completionRequest && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 p-4 flex items-center justify-center">
          <form onSubmit={handleCompletePickup} className="bg-white rounded-2xl shadow-xl border border-stone-200 w-full max-w-3xl">
            <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-stone-800">Complete Pickup</h3>
                <p className="text-sm text-stone-500">{completionRequest.farmer?.fullName} - {completionRequest.farmer?.farmerProfile?.farmName || 'Unknown farm'}</p>
              </div>
              <button type="button" onClick={() => setCompletionRequest(null)} className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-semibold text-stone-600 hover:bg-stone-50">Close</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Actual weight (kg)</label>
                  <input required type="number" min="0.1" step="0.1" value={completeForm.actualWeightKg} onChange={e => setCompleteForm(prev => ({ ...prev, actualWeightKg: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Payment receipt upload</label>
                  <input type="file" accept="image/*,application/pdf,.pdf" onChange={e => handleReceiptFile(e.target.files?.[0])} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                  <p className="mt-1 text-[10px] font-semibold text-emerald-700">{completeForm.receiptFileName || 'Upload a payment receipt photo, scale slip photo, signed intake note photo, or PDF.'}</p>
                  {completeForm.receiptDataUrl && (
                    <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2">
                      {completeForm.receiptDataUrl.startsWith('data:image/') ? (
                        <img src={completeForm.receiptDataUrl} alt="Selected payment receipt" className="max-h-32 rounded-md object-contain" />
                      ) : (
                        <p className="text-xs font-semibold text-stone-600">PDF receipt selected and ready to upload.</p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Condition</label>
                  <select value={completeForm.condition} onChange={e => setCompleteForm(prev => ({ ...prev, condition: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                    <option value="fresh">Fresh</option>
                    <option value="delayed">Delayed</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Verified Coffee Variety</label>
                  <select value={completeForm.coffeeVariety} onChange={e => setCompleteForm(prev => ({ ...prev, coffeeVariety: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
                    {coffeeVarietiesForRequest(completionRequest).map(variety => <option key={variety} value={variety}>{variety}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] font-semibold text-stone-500">Requested: {completionRequest?.coffeeVariety || completionRequest?.requestedCoffeeVariety || 'Red Bourbon'}</p>
                </div>
              </div>
              <textarea value={completeForm.notes} onChange={e => setCompleteForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Receipt notes or quality observations" className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[90px]" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCompletionRequest(null)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-semibold text-stone-600">Cancel</button>
                <button disabled={processing === completionRequest.requestId} className="px-4 py-2 bg-[#1C3829] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                  {processing === completionRequest.requestId ? 'Saving...' : 'Complete Pickup'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Payments() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  useEffect(() => {
    apiService.getAggregatorDashboard()
      .then(r => setPickups(r.data.pickups || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const normalizePaymentStatus = (status: any) => String(status || '').toLowerCase();
  const isPaidPayment = (status: any) => ['paid', 'completed'].includes(normalizePaymentStatus(status));
  const isActionablePayment = (status: any) => ['pending', 'initiated', 'failed'].includes(normalizePaymentStatus(status));
  const pendingPickups = pickups.filter(p => isActionablePayment(p.paymentStatus));
  const paidPickups = pickups.filter(p => isPaidPayment(p.paymentStatus));

  const handleMarkPaid = async (pickup: any) => {
    const deliveryId = pickup.realDeliveryId;
    if (!deliveryId) {
      toast.error('Missing delivery record for this payment.');
      return;
    }

    setMarkingPaidId(deliveryId);
    try {
      await apiService.markPickupPaymentPaid(deliveryId);
      setPickups(prev => prev.map(p => (
        p.realDeliveryId === deliveryId
          ? { ...p, paymentStatus: 'paid', paymentProcessedAt: new Date().toISOString() }
          : p
      )));
      toast.success(`Payment for ${pickup.farmerName} marked as paid.`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update payment status.');
    } finally {
      setMarkingPaidId(null);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Payment Management</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-amber-500 text-white rounded-xl p-4">
          <p className="text-amber-100 text-sm">Pending Payments</p>
          <p className="text-2xl font-bold mt-1">RWF {pendingPickups.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}</p>
          <p className="text-amber-200 text-xs mt-1">{pendingPickups.length} farmers</p>
        </div>
        <div className="bg-emerald-600 text-white rounded-xl p-4">
          <p className="text-emerald-100 text-sm">Paid This Month</p>
          <p className="text-2xl font-bold mt-1">RWF {paidPickups.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}</p>
          <p className="text-emerald-200 text-xs mt-1">{paidPickups.length} payments</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-stone-500 text-sm">Total Disbursed</p>
          <p className="text-xl font-bold mt-1 text-stone-800">RWF {pickups.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}</p>
          <p className="text-xs mt-1 text-stone-400">All time</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Payment Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Farmer', 'Pickup ID', 'Weight', 'Amount (RWF)', 'Method', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {pickups.map(p => (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">{p.farmerName}</td>
                  <td className="px-4 py-3 text-stone-500">{p.id}</td>
                  <td className="px-4 py-3 text-stone-600">{p.weight} kg</td>
                  <td className="px-4 py-3 font-semibold text-stone-800">{p.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-stone-600">
                      {p.paymentMethod.includes('Money') ? <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> :
                        p.paymentMethod === 'Bank Transfer' ? <Building2 className="w-3.5 h-3.5 text-blue-500" /> :
                          <Banknote className="w-3.5 h-3.5 text-amber-500" />}
                      {p.paymentMethod}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isPaidPayment(p.paymentStatus) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isActionablePayment(p.paymentStatus) && (
                      <button
                        type="button"
                        disabled={markingPaidId === p.realDeliveryId}
                        onClick={() => handleMarkPaid(p)}
                        className="px-3 py-1 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {markingPaidId === p.realDeliveryId ? 'Saving...' : 'Mark Paid'}
                      </button>
                    )}
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

function BatchManagement() {
  const [batches, setBatches] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [washingStations, setWashingStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdBatch, setCreatedBatch] = useState<any>(null);
  const [batchStep, setBatchStep] = useState(1);

  // Form State
  const [selectedPickups, setSelectedPickups] = useState<string[]>([]);
  const [district, setDistrict] = useState('');
  const [washingStation, setWashingStation] = useState('');
  const [farmName, setFarmName] = useState('');
  const [checkpointLocation, setCheckpointLocation] = useState('');
  const [coffeeVariety, setCoffeeVariety] = useState('Red Bourbon');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [transportMethod, setTransportMethod] = useState('truck');
  const [transporterName, setTransporterName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [condition, setCondition] = useState('fresh');
  const [splitWeights, setSplitWeights] = useState<number[]>([]);

  const fetchData = useCallback(() => {
    setLoading(true);
    apiService.getAggregatorDashboard()
      .then(r => {
        setBatches(r.data.batches || []);
        setPickups(r.data.pickups || []);
        setWashingStations(r.data.washingStations || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPickups.length === 0 || !district || !washingStation || !farmName || !checkpointLocation) {
      toast.error('Please select pickups and fill all fields');
      return;
    }
    const selectedProfileIds = [...new Set(selectedPickupRows.map(p => p.profileId || p.farmName))];
    if (selectedProfileIds.length > 1) {
      toast.error('A batch can only include pickups from one farm');
      return;
    }
    if (selectedCoffeeVarieties.length > 1) {
      toast.error('A batch can only include one verified coffee variety. Create separate batches by variety.');
      return;
    }
    if (selectedAssignedWashingStation && washingStation !== selectedAssignedWashingStation) {
      toast.error(`This supplier is currently connected to ${selectedAssignedWashingStation}`);
      setWashingStation(selectedAssignedWashingStation);
      return;
    }
    setCreating(true);
    try {
      const deliveryIds = selectedPickups.map(id => {
        const p = pickups.find(x => x.id === id);
        return p?.realDeliveryId;
      }).filter(Boolean) as string[];

      if (!splitValid) {
        toast.error('Split weights must each be 100-500 kg and equal the selected total');
        return;
      }

      const payload = {
        deliveryIds,
        district,
        washingStation,
        farmName,
        checkpointLocation,
        coffeeVariety,
        harvestDate,
        transportMethod,
        transporterName,
        departureTime,
        condition,
        ...(selectedWeightRule.code === 'split_required' ? { splitWeights } : {}),
      };
      const res = await saveAggregatorWrite('/aggregators/batches', 'POST', payload, () => apiService.createBatch(payload));
      const createdRule = (res as any).data?.processingWeightRule;
      toast.success((res as any).queued
        ? 'Batch saved locally for sync'
        : createdRule && !createdRule.canProcess
          ? 'Batch created and marked for consolidation'
          : 'Batch created and washing station notified!');
      if (!(res as any).queued) setCreatedBatch((res as any).data);
      setShowModal(false);
      setSelectedPickups([]);
      setDistrict('');
      setWashingStation('');
      setFarmName('');
      setCheckpointLocation('');
      setCoffeeVariety('Red Bourbon');
      setHarvestDate(new Date().toISOString().split('T')[0]);
      setTransporterName('');
      setDepartureTime('');
      setSplitWeights([]);
      setBatchStep(1);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  const unassignedPickups = pickups.filter(p => !p.batchId || p.batchId === '');
  const selectedPickupRows = unassignedPickups.filter(p => selectedPickups.includes(p.id));
  const selectedWeight = selectedPickupRows.reduce((s, p) => s + Number(p.weight || 0), 0);
  const selectedWeightRule = evaluateProcessingBatchWeight(selectedWeight);
  const splitTotal = Number(splitWeights.reduce((sum, weight) => sum + Number(weight || 0), 0).toFixed(2));
  const splitValid = selectedWeightRule.code !== 'split_required' || (
    splitWeights.length > 1 &&
    splitWeights.every(weight => Number(weight) >= 100 && Number(weight) <= 500) &&
    Math.abs(splitTotal - selectedWeight) <= 0.01
  );
  const selectedFarmers = new Set(selectedPickupRows.map(p => p.farmerName)).size;
  const selectedLocations = [...new Set(selectedPickupRows.map(p => p.location || p.district).filter(Boolean))];
  const selectedFarms = [...new Set(selectedPickupRows.map(p => p.farmName).filter(Boolean))];
  const selectedCoffeeVarieties = [...new Set(selectedPickupRows.map(p => p.coffeeVariety).filter(Boolean))];
  const selectedCoordinates = selectedPickupRows[0]?.coordinates || '';
  const stationOptions = washingStations.length > 0 ? washingStations : DEFAULT_WASHING_STATIONS;
  const currentWashingStationFrom = (pickup: any) => pickup?.preferredWashingStation || pickup?.preferred_washing_station || pickup?.currentWashingStation || pickup?.current_washing_station || '';
  const selectedAssignedStations = [...new Set(selectedPickupRows.map(currentWashingStationFrom).filter(Boolean))];
  const selectedAssignedWashingStation = selectedAssignedStations.length === 1 ? selectedAssignedStations[0] : '';
  const assignedStationDetails = stationOptions.find(station => station.name === selectedAssignedWashingStation);
  const missingAssignedStation = selectedPickupRows.length > 0 && !selectedAssignedWashingStation;
  const selectedFarmKey = selectedPickupRows[0]?.profileId || selectedPickupRows[0]?.farmName || null;
  const selectedVarietyKey = selectedPickupRows[0]?.coffeeVariety || null;
  const sameFarmPickups = selectedFarmKey
    ? unassignedPickups.filter(p => (p.profileId || p.farmName) === selectedFarmKey && (!selectedVarietyKey || !p.coffeeVariety || p.coffeeVariety === selectedVarietyKey))
    : unassignedPickups.filter(p => (p.profileId || p.farmName) === (unassignedPickups[0]?.profileId || unassignedPickups[0]?.farmName) && (!unassignedPickups[0]?.coffeeVariety || !p.coffeeVariety || p.coffeeVariety === unassignedPickups[0]?.coffeeVariety));
  const togglePickup = (id: string) => setSelectedPickups(prev => {
    if (prev.includes(id)) return prev.filter(x => x !== id);
    const pickup = unassignedPickups.find(p => p.id === id);
    const current = prev.length ? unassignedPickups.find(p => p.id === prev[0]) : null;
    if (pickup && current && (pickup.profileId || pickup.farmName) !== (current.profileId || current.farmName)) {
      toast.error('A batch can only contain pickups from one farm. Create a separate batch for this farm.');
      return prev;
    }
    if (pickup && current && pickup.coffeeVariety && current.coffeeVariety && pickup.coffeeVariety !== current.coffeeVariety) {
      toast.error('A batch can only contain one verified coffee variety. Create a separate batch for this variety.');
      return prev;
    }
    return [...prev, id];
  });
  const toggleAll = () => {
    if (selectedPickups.length === sameFarmPickups.length && sameFarmPickups.every(p => selectedPickups.includes(p.id))) {
      setSelectedPickups([]);
    } else {
      setSelectedPickups(sameFarmPickups.map(p => p.id));
    }
  };
  const openBatchWizard = () => {
    setShowModal(true);
    setBatchStep(1);
    setCreatedBatch(null);
  };

  useEffect(() => {
    if (selectedWeight > 500) {
      setSplitWeights(calculateRecommendedSplits(selectedWeight));
    } else {
      setSplitWeights([]);
    }
  }, [selectedWeight]);

  useEffect(() => {
    if (selectedFarms.length === 1) setFarmName(selectedFarms[0]);
    if (selectedLocations.length === 1) setDistrict(selectedLocations[0]);
    if (selectedCoffeeVarieties.length === 1) setCoffeeVariety(selectedCoffeeVarieties[0]);
    if (selectedPickupRows.length > 0) setCheckpointLocation(selectedCoordinates || '');
  }, [selectedFarms.join('|'), selectedLocations.join('|'), selectedCoffeeVarieties.join('|'), selectedCoordinates, selectedPickupRows.length]);

  useEffect(() => {
    if (selectedAssignedWashingStation) {
      setWashingStation(selectedAssignedWashingStation);
    } else if (selectedPickupRows.length === 0) {
      setWashingStation('');
    }
  }, [selectedAssignedWashingStation, selectedPickupRows.length]);

  const printQrCode = () => {
    if (!createdBatch) return;

    const labels = createdBatch.isSplitGroup ? (createdBatch.batches || []) : [createdBatch];
    if (!labels.length) {
      toast.error('No QR label data found for this batch');
      return;
    }

    const escapeHtml = (value: unknown) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const labelHtml = labels.map((batch: any, index: number) => {
      const qrCode = batch.qrCode || createdBatch.qrCode || '';
      const weight = Number(batch.weightCherry || createdBatch.weightCherry || 0);
      const partText = createdBatch.isSplitGroup
        ? `Part ${batch.splitIndex || index + 1} of ${batch.splitCount || labels.length}`
        : 'Single batch';
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`;
      return `
        <section class="label">
          <div class="brand">CoffeeSCM - IMPEXCOR Ltd</div>
          <img src="${qrUrl}" alt="QR Code ${escapeHtml(qrCode)}" />
          <h2>${escapeHtml(qrCode)}</h2>
          <p>${escapeHtml(partText)} - ${weight.toLocaleString()} kg</p>
          <p>Group: ${escapeHtml(createdBatch.batchGroupId || batch.batchGroupId || 'N/A')}</p>
          <p>Farm: ${escapeHtml(batch.farmName || createdBatch.farmName || farmName || 'N/A')}</p>
          <p>Station: ${escapeHtml(batch.washingStation || createdBatch.washingStation || washingStation || 'N/A')}</p>
        </section>
      `;
    }).join('');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Allow pop-ups to print the QR label');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Batch QR Labels</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #1c1917;
              background: #fff;
            }
            .sheet {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 14mm;
            }
            .label {
              break-inside: avoid;
              border: 2px solid #1C3829;
              border-radius: 10px;
              padding: 14px;
              min-height: 108mm;
              text-align: center;
            }
            .brand {
              font-size: 12px;
              font-weight: 700;
              color: #047857;
              text-transform: uppercase;
              letter-spacing: .04em;
              margin-bottom: 10px;
            }
            img {
              display: block;
              width: 54mm;
              height: 54mm;
              margin: 0 auto 8px;
              image-rendering: pixelated;
            }
            h2 {
              margin: 6px 0;
              font-family: "Courier New", monospace;
              font-size: 15px;
              letter-spacing: .02em;
            }
            p {
              margin: 5px 0;
              font-size: 12px;
              font-weight: 600;
            }
            @media print {
              .sheet { gap: 10mm; }
            }
          </style>
        </head>
        <body>
          <main class="sheet">${labelHtml}</main>
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('QR label print view opened');
  };

  const downloadPdf = async (batchId: string, qrCode: string) => {
    toast.loading('Generating PDF...', { id: 'pdf' });
    try {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.body.appendChild(script);
      await new Promise(resolve => script.onload = resolve);

      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`Coffee Batch: ${batchId}`, 20, 20);
      doc.setFontSize(12);
      doc.text(`QR Code ID: ${qrCode}`, 20, 30);

      const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrCode}`;
      const imgData = await fetch(imgUrl).then(r => r.blob()).then(blob => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      });

      doc.addImage(imgData as string, 'PNG', 20, 40, 100, 100);
      doc.save(`Batch_${batchId}_QRCode.pdf`);
      toast.success('PDF Downloaded!', { id: 'pdf' });
    } catch (err) {
      toast.error('Failed to generate PDF', { id: 'pdf' });
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Batch Management</h2>
        <div className="flex items-center gap-2">
          <SyncStatus />
          <button onClick={openBatchWizard}
            className="px-4 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40] flex items-center gap-1.5 transition-colors">
            <Plus className="w-4 h-4" /> Create Batch
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Batches', value: String(batches.length), icon: Package, color: 'bg-emerald-600' },
              { label: 'Total Weight', value: `${batches.reduce((s, b) => s + b.totalWeight, 0).toLocaleString()} kg`, icon: Coffee, color: 'bg-amber-600' },
              { label: 'Avg Farmers/Batch', value: batches.length > 0 ? String(Math.ceil(pickups.length / batches.length)) : '0', icon: Users, color: 'bg-violet-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-stone-800">{s.value}</p>
                  <p className="text-xs text-stone-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Batch ID', 'Name', 'Origin', 'Farmers', 'Weight (kg)', 'Quality Feedback', 'Status', 'Created', 'QR Code'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {batches.map(b => (
                    <tr key={b.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-medium text-stone-800">{b.id}</td>
                      <td className="px-4 py-3 font-medium text-emerald-700">{b.name}</td>
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{b.origin}</td>
                      <td className="px-4 py-3 text-stone-600">{b.farmers}</td>
                      <td className="px-4 py-3 font-medium text-stone-800">
                        <div>{b.totalWeight.toLocaleString()}</div>
                        <div className={`mt-1 text-[10px] font-bold ${b.processingWeightRule?.canProcess ? 'text-emerald-700' : b.processingWeightRule?.code === 'split_required' ? 'text-red-700' : 'text-amber-700'}`}>
                          {b.processingWeightRule?.label || evaluateProcessingBatchWeight(Number(b.totalWeight || 0)).label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600 min-w-[180px]">
                        {b.latestQuality ? (
                          <div>
                            <p className="font-semibold text-stone-800">{b.latestQuality.cuppingScore ?? 'N/A'} pts</p>
                            <p className="text-xs text-stone-500">{formatDefectSummary(b.latestQuality.defects)}</p>
                          </div>
                        ) : (
                          <span className="text-stone-400">Pending assessment</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => downloadPdf(b.realId, b.qrCode)}
                          className="p-1.5 bg-stone-100 text-stone-600 rounded hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                          title="Download QR Code PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-stone-400">No batches created yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1C3829] px-6 py-5 text-white flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold">Create Batch From Completed Pickups</h3>
                <p className="text-green-200/80 text-xs mt-1">Select receipts, verify origin, add transport details, then generate the QR batch.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-4 gap-2">
                {['Select Pickups', 'Verify Origin', 'Transport', 'Review + QR'].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setBatchStep(index + 1)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold border ${batchStep === index + 1 ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-stone-50 text-stone-500 border-stone-200'}`}
                  >
                    {index + 1}. {label}
                  </button>
                ))}
              </div>

              {batchStep === 1 && (
                <div className="space-y-3">
                  <div className="grid lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Selected receipts</p>
                      <p className="text-xl font-bold text-emerald-950">{selectedPickups.length}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Total weight</p>
                      <p className="text-xl font-bold text-emerald-950">{selectedWeight} kg</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Farmers</p>
                      <p className="text-xl font-bold text-emerald-950">{selectedFarmers}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Locations</p>
                      <p className="text-xl font-bold text-emerald-950">{selectedLocations.length}</p>
                    </div>
                  </div>
                  {selectedPickups.length > 0 && <ProcessingWeightRuleCard rule={selectedWeightRule} weightKg={selectedWeight} />}
                  {selectedWeightRule.code === 'split_required' && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-red-800">Split into compliant processing batches</p>
                          <p className="text-xs text-red-700 mt-1">Each sub-batch must be 100-500 kg. The split total must equal {selectedWeight} kg.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSplitWeights(calculateRecommendedSplits(selectedWeight))}
                          className="px-3 py-1.5 rounded-lg bg-white border border-red-100 text-xs font-bold text-red-700 hover:bg-red-100"
                        >
                          Recommended
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                        {splitWeights.map((weight, index) => (
                          <label key={index} className="block">
                            <span className="text-[10px] font-bold uppercase text-red-700">Batch {index + 1}</span>
                            <input
                              type="number"
                              min="100"
                              max="500"
                              step="0.01"
                              value={weight}
                              onChange={e => setSplitWeights(prev => prev.map((item, i) => i === index ? Number(e.target.value) : item))}
                              className="mt-1 w-full px-3 py-2 rounded-lg border border-red-100 bg-white text-sm font-semibold text-stone-800"
                            />
                          </label>
                        ))}
                      </div>
                      <div className={`mt-3 text-xs font-bold ${splitValid ? 'text-emerald-700' : 'text-red-700'}`}>
                        Split total: {splitTotal} kg / {selectedWeight} kg
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className={`${batchStep === 2 ? 'grid grid-cols-2 gap-4' : 'hidden'}`}>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Farm / Origin Name</label>
                  <input type="text" required value={farmName} onChange={e => setFarmName(e.target.value)} list="batch-farm-origin-options" placeholder="Auto-filled from selected farm"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  <datalist id="batch-farm-origin-options">
                    {[...new Set(unassignedPickups.map(p => p.farmName).filter(Boolean))].map(name => <option key={name} value={name} />)}
                  </datalist>
                  <p className="mt-1 text-[10px] font-semibold text-emerald-700">Verified from selected pickup's farmer profile.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Location</label>
                  <input type="text" required value={district} onChange={e => setDistrict(e.target.value)} list="batch-location-options" placeholder="Kigali City, Gasabo, Kimironko, Kibagabaga"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                  <datalist id="batch-location-options">
                    {[...new Set(unassignedPickups.map(p => p.location || p.district).filter(Boolean))].map(name => <option key={name} value={name} />)}
                  </datalist>
                  <p className="mt-1 text-[10px] font-semibold text-emerald-700">Verified from the farmer profile farm location.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Checkpoint Location</label>
                  <input type="text" required readOnly value={checkpointLocation} placeholder="Farm coordinates"
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-700 outline-none" />
                  <p className="mt-1 text-[10px] font-semibold text-emerald-700">This checkpoint is the farm coordinates captured in the farmer profile.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Coffee Variety</label>
                  <select value={coffeeVariety} onChange={e => setCoffeeVariety(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                    {(selectedCoffeeVarieties.length === 1 ? selectedCoffeeVarieties : COFFEE_VARIETIES).map(variety => (
                      <option key={variety} value={variety}>{variety}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] font-semibold text-stone-500">
                    Batch uses the aggregator-verified variety from the completed pickup receipt.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Harvest Date</label>
                  <input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
              </div>

              <div className={`${batchStep === 3 ? 'grid grid-cols-2 gap-4' : 'hidden'}`}>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Washing Station</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={washingStation}
                    placeholder="Current washing station will appear after selecting pickups"
                    className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-700 outline-none"
                  />
                  {washingStation ? (
                    <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                      Auto-filled from the supplier's current washing station connection{assignedStationDetails?.district ? `: ${assignedStationDetails.district}` : ''}.
                    </p>
                  ) : selectedPickupRows.length > 0 ? (
                    <p className="mt-1 text-[10px] font-semibold text-red-700">
                      This selected pickup row does not include the supplier's current washing station yet. Reload the dashboard after the backend restarts.
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] font-semibold text-stone-500">Select completed pickups first.</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Transport Method</label>
                  <select value={transportMethod} onChange={e => setTransportMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="bicycle">Bicycle</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Transporter Name</label>
                  <input type="text" value={transporterName} onChange={e => setTransporterName(e.target.value)} placeholder="Optional"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Departure Time</label>
                  <input type="datetime-local" value={departureTime} onChange={e => setDepartureTime(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Batch Condition</label>
                  <select value={condition} onChange={e => setCondition(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option value="fresh">Fresh</option>
                    <option value="delayed">Delayed</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
              </div>

              <div className={batchStep === 1 ? 'block' : 'hidden'}>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest ml-1">Select Pickups to Include</label>
                  <button type="button" onClick={toggleAll} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                    {selectedPickups.length === unassignedPickups.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-stone-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-stone-50">
                  {unassignedPickups.length === 0 ? (
                    <div className="p-8 text-center text-stone-400">No unassigned pickups available. Record a pickup first.</div>
                  ) : (
                    <div className="divide-y divide-stone-200">
                      {unassignedPickups.map(p => (
                        <label key={p.id} className="flex items-center gap-3 p-3 bg-white hover:bg-emerald-50/50 cursor-pointer transition-colors">
                          <input type="checkbox" checked={selectedPickups.includes(p.id)} onChange={() => togglePickup(p.id)}
                            className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500" />
                          <div className="flex-1 flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-stone-800 text-sm">{p.farmerName}</p>
                              <p className="text-xs text-stone-500">{p.receiptNo || p.id} - {p.farmName || p.location} - {new Date(p.scheduledDate).toLocaleDateString()}</p>
                              <p className="text-[11px] text-stone-400">Payment receipt recorded - ready for batch grouping</p>
                            </div>
                            <span className="font-bold text-stone-700">{p.weight} kg</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedPickups.length > 0 && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 ml-1">
                    Selected: {selectedPickups.length} pickup(s) - Total Weight: {selectedWeight} kg
                  </div>
                )}
              </div>

              {batchStep === 4 && (
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-2xl border border-stone-200 overflow-hidden">
                    <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 font-bold text-stone-800">Receipts in this batch</div>
                    <div className="divide-y divide-stone-100 max-h-[300px] overflow-y-auto">
                      {selectedPickupRows.map(p => (
                        <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-stone-800">{p.receiptNo || p.id}</p>
                            <p className="text-xs text-stone-500">{p.farmerName} - {p.farmName || p.location}</p>
                          </div>
                          <span className="font-bold text-stone-700">{p.weight} kg</span>
                        </div>
                      ))}
                      {selectedPickupRows.length === 0 && <div className="p-8 text-center text-stone-400">Select pickups before review.</div>}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#1C3829] text-white p-4">
                    <p className="text-sm text-green-200">Batch Preview</p>
                    <p className="text-2xl font-bold mt-1">{selectedWeight} kg</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <p><span className="text-green-200">Origin:</span> {farmName || 'Not set'}</p>
                      <p><span className="text-green-200">Location:</span> {district || 'Not set'}</p>
                      <p><span className="text-green-200">Station:</span> {washingStation || 'Resolved from current connection'}</p>
                      <p><span className="text-green-200">Receipts:</span> {selectedPickups.length}</p>
                      <p><span className="text-green-200">Status:</span> {selectedWeightRule.code === 'needs_consolidation' ? 'needs_consolidation' : 'pending_transport'}</p>
                      {selectedWeightRule.code === 'split_required' && (
                        <p><span className="text-green-200">Split:</span> {splitWeights.map(weight => `${weight} kg`).join(' + ')}</p>
                      )}
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <ProcessingWeightRuleCard rule={selectedWeightRule} weightKg={selectedWeight} />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-all">Cancel</button>
                {batchStep > 1 && <button type="button" onClick={() => setBatchStep(s => Math.max(1, s - 1))} className="px-4 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-all">Back</button>}
                {batchStep < 4 ? (
                  <button type="button" onClick={() => {
                    if (batchStep === 1 && selectedPickups.length === 0) return toast.error('Select at least one completed pickup receipt');
                    if (batchStep === 1 && [...new Set(selectedPickupRows.map(p => p.profileId || p.farmName))].length > 1) return toast.error('A batch can only include pickups from one farm');
                    if (batchStep === 1 && selectedWeightRule.code === 'split_required' && !splitValid) return toast.error('Create valid 100-500 kg split batches before continuing');
                    if (batchStep === 2 && (!farmName || !district || !checkpointLocation || !coffeeVariety || !harvestDate)) return toast.error('Verify farm origin, location, variety, coordinates, and harvest date');
                    setBatchStep(s => Math.min(4, s + 1));
                  }} className="flex-[2] px-4 py-3 bg-[#1C3829] text-white font-bold rounded-xl hover:bg-[#2D5A40] transition-all flex items-center justify-center gap-2">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={creating || selectedPickups.length === 0 || !splitValid} className="flex-[2] px-4 py-3 bg-[#1C3829] text-white font-bold rounded-xl hover:bg-[#2D5A40] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {creating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Generate Batch QR'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Result Modal */}
      {createdBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Batch Created!</h3>
            <p className="text-sm text-stone-500 mb-6">
              {createdBatch.isSplitGroup
                ? `Created ${createdBatch.batches?.length || 0} linked sub-batches under ${createdBatch.batchGroupId}. Print one QR label per physical batch.`
                : 'Stick this QR code on the physical coffee batch. The processor will scan it upon arrival.'}
            </p>

            {createdBatch.isSplitGroup ? (
              <div className="space-y-3 mb-6 max-h-[360px] overflow-y-auto">
                {createdBatch.batches?.map((batch: any) => (
                  <div key={batch.batchId} className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${batch.qrCode}`} alt="Sub-batch QR Code" className="w-[120px] h-[120px] mx-auto mix-blend-multiply" />
                    <p className="font-mono font-bold text-stone-800 mt-3">{batch.qrCode}</p>
                    <p className="text-xs text-stone-500 mt-1">Part {batch.splitIndex} of {batch.splitCount} - {Number(batch.weightCherry || 0).toLocaleString()} kg</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 inline-block mb-6">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${createdBatch.qrCode}`} alt="Batch QR Code" className="w-[150px] h-[150px] mx-auto mix-blend-multiply" />
                <p className="font-mono font-bold text-stone-800 mt-3">{createdBatch.qrCode}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setCreatedBatch(null)} className="flex-1 py-3 text-stone-500 font-bold rounded-xl border border-stone-200 hover:bg-stone-50">Close</button>
              <button onClick={printQrCode} className="flex-[2] py-3 bg-[#1C3829] text-white font-bold rounded-xl hover:bg-[#2D5A40]">Print Label</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PickupHistory() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getAggregatorDashboard()
      .then(r => setPickups(r.data.pickups || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Pickup History</h2>
      {loading ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">All Pickups ({pickups.length})</h3>
            <button className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['ID', 'Farmer', 'Location', 'Date', 'Weight', 'Grade', 'Receipt Value', 'Batch', 'Payment Receipt'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {pickups.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-500 text-xs">{p.id}</td>
                    <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">{p.farmerName}</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{p.location}</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(p.scheduledDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td className="px-4 py-3 text-stone-600">{p.weight} kg</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700">{p.quality}</span></td>
                    <td className="px-4 py-3 font-medium text-stone-800">{p.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{p.batchId || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status="recorded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pickups.length === 0 && <div className="text-center py-10 text-stone-400">No pickups recorded yet.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Notifs() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Notifications</h2>
      {notifications.aggregator.map(n => (
        <div key={n.id} className={`bg-white rounded-xl border p-4 shadow-sm flex gap-3 ${!n.read ? 'border-emerald-200' : 'border-stone-200'}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100' : n.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
            {n.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
              n.type === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                <Bell className="w-4 h-4 text-blue-600" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-800">{n.title}</p>
              {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </div>
            <p className="text-sm text-stone-600 mt-0.5">{n.message}</p>
            <p className="text-xs text-stone-400 mt-1.5">{n.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RouteOptimization() {
  const routes = [
    { id: 'RT001', name: 'Northern Route', farmers: 4, stops: ['Nyamagabe', 'Huye', 'Nyanza'], distance: '45 km', duration: '2h 15m', status: 'optimized', fuelSaved: '12%' },
    { id: 'RT002', name: 'Western Route', farmers: 3, stops: ['Rusizi', 'Nyamasheke'], distance: '38 km', duration: '1h 50m', status: 'optimized', fuelSaved: '8%' },
    { id: 'RT003', name: 'Southern Route', farmers: 3, stops: ['Gisagara', 'Nyaruguru', 'Nyamagabe'], distance: '52 km', duration: '2h 40m', status: 'pending', fuelSaved: null },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Route Optimization</h2>
        <button onClick={() => toast.success('Optimizing routes...')}
          className="px-4 py-2 bg-[#1C3829] text-white text-sm rounded-lg hover:bg-[#2D5A40] transition-colors flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Optimize Routes
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Routes', value: '3', icon: MapPin, color: 'bg-blue-600' },
          { label: 'Avg Distance', value: '45 km', icon: MapPin, color: 'bg-violet-600' },
          { label: 'Fuel Saved', value: '10%', icon: Coffee, color: 'bg-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-stone-800">{s.value}</p>
              <p className="text-xs text-stone-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Route ID', 'Name', 'Farmers', 'Stops', 'Distance', 'Duration', 'Fuel Saved', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {routes.map(r => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800">{r.id}</td>
                  <td className="px-4 py-3 font-medium text-emerald-700">{r.name}</td>
                  <td className="px-4 py-3 text-stone-600">{r.farmers}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs">{r.stops.join(' → ')}</td>
                  <td className="px-4 py-3 text-stone-600">{r.distance}</td>
                  <td className="px-4 py-3 text-stone-600">{r.duration}</td>
                  <td className="px-4 py-3">
                    {r.fuelSaved ? (
                      <span className="text-emerald-600 font-semibold">{r.fuelSaved}</span>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${r.status === 'optimized' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toast.success(`Viewing ${r.name} on map`)}
                      className="text-xs text-emerald-600 hover:underline font-medium">View Map</button>
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

function Sustainability() {
  const metrics = [
    { category: 'Water Usage', value: '245 L/kg', target: '200 L/kg', status: 'warning' },
    { category: 'Carbon Footprint', value: '1.2 kg CO₂/kg', target: '1.0 kg CO₂/kg', status: 'good' },
    { category: 'Waste Recycled', value: '78%', target: '85%', status: 'warning' },
    { category: 'Renewable Energy', value: '45%', target: '60%', status: 'warning' },
  ];

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Sustainability Tracking</h2>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.category} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm font-medium text-stone-700">{m.category}</p>
              <div className={`w-2 h-2 rounded-full ${m.status === 'good' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </div>
            <p className="text-2xl font-bold text-stone-800">{m.value}</p>
            <p className="text-xs text-stone-500 mt-1">Target: {m.target}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Environmental Impact</h3>
          <div className="space-y-3">
            {[
              { label: 'Trees Planted', value: '120', icon: '🌳' },
              { label: 'Water Conserved', value: '1,250 L', icon: '💧' },
              { label: 'Composted Waste', value: '340 kg', icon: '♻️' },
              { label: 'Solar Energy Used', value: '850 kWh', icon: '☀️' },
            ].map(i => (
              <div key={i.label} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{i.icon}</span>
                  <span className="text-sm font-medium text-stone-700">{i.label}</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">{i.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Certifications</h3>
          <div className="space-y-3">
            {[
              { name: 'Rainforest Alliance', status: 'Active', expires: '2026-12-31' },
              { name: 'Fairtrade', status: 'Active', expires: '2026-08-15' },
              { name: 'Organic (EU)', status: 'Pending Renewal', expires: '2025-04-30' },
            ].map(cert => (
              <div key={cert.name} className="p-3 border border-stone-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-stone-800">{cert.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cert.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {cert.status}
                  </span>
                </div>
                <p className="text-xs text-stone-500">Expires: {new Date(cert.expires).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', cooperativeName: '', district: '', zone: '' });

  useEffect(() => {
    apiService.getAggregatorProfile()
      .then(res => {
        setForm({
          fullName: res.data.user?.fullName || '',
          phone: res.data.user?.phone || '',
          cooperativeName: res.data.cooperative?.name || '',
          district: res.data.cooperative?.district || '',
          zone: res.data.cooperative?.zone || '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await saveAggregatorWrite('/aggregators/profile', 'PATCH', {
        fullName: form.fullName,
        phone: form.phone,
      }, () => apiService.updateAggregatorProfile({ fullName: form.fullName, phone: form.phone }));
      if (!(result as any).queued) toast.success('Profile updated');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Personal & Assigned Cooperative</h2>
        <SyncStatus />
      </div>
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['fullName', 'Full name'],
            ['phone', 'Phone'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-stone-500 mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50"
              />
            </div>
          ))}
          {[
            ['cooperativeName', 'Cooperative name'],
            ['district', 'District'],
            ['zone', 'Collection zone'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-stone-500 mb-1">{label}</label>
              <input
                value={(form as any)[key] || 'Not assigned by admin'}
                readOnly
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-100 text-stone-500"
              />
            </div>
          ))}
        </div>
        <button disabled={saving} className="px-4 py-2.5 bg-[#1C3829] text-white text-sm font-semibold rounded-lg disabled:opacity-60">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

function CheckpointLogging() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batchId: '',
    checkpointType: 'movement',
    locationName: '',
    timestamp: '',
    notes: '',
    transportMethod: 'truck',
    departureTime: '',
    arrivalTime: '',
    condition: 'fresh',
  });

  const fetchBatches = useCallback(() => {
    setLoading(true);
    apiService.getAggregatorDashboard()
      .then(res => {
        const rows = res.data.batches || [];
        setBatches(rows);
        if (!form.batchId && rows[0]?.realId) setForm(prev => ({ ...prev, batchId: rows[0].realId }));
      })
      .catch(() => toast.error('Failed to load batches'))
      .finally(() => setLoading(false));
  }, [form.batchId]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.batchId || !form.locationName) {
      toast.error('Select a batch and enter checkpoint location');
      return;
    }
    setSaving(true);
    try {
      await saveAggregatorWrite('/aggregators/checkpoints', 'POST', {
        batchId: form.batchId,
        checkpointType: form.checkpointType,
        locationName: form.locationName,
        timestamp: form.timestamp,
        notes: form.notes,
      }, () => apiService.createCheckpointLog({
        batchId: form.batchId,
        checkpointType: form.checkpointType,
        locationName: form.locationName,
        timestamp: form.timestamp,
        notes: form.notes,
      }));
      if (form.departureTime || form.arrivalTime) {
        await saveAggregatorWrite('/aggregators/transport-logs', 'POST', {
          batchId: form.batchId,
          transportMethod: form.transportMethod,
          departureTime: form.departureTime,
          arrivalTime: form.arrivalTime,
          condition: form.condition,
          notes: form.notes,
        }, () => apiService.createTransportLog({
          batchId: form.batchId,
          transportMethod: form.transportMethod,
          departureTime: form.departureTime,
          arrivalTime: form.arrivalTime,
          condition: form.condition,
          notes: form.notes,
        }));
      }
      toast.success('Checkpoint logged');
      setForm(prev => ({ ...prev, locationName: '', timestamp: '', notes: '', departureTime: '', arrivalTime: '' }));
      fetchBatches();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Checkpoint & Movement Logging</h2>
        <SyncStatus />
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Batch</label>
            <select value={form.batchId} onChange={e => setForm(prev => ({ ...prev, batchId: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
              <option value="">Select batch</option>
              {batches.map(b => <option key={b.realId || b.id} value={b.realId || b.id}>{b.name || b.id}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Checkpoint type</label>
            <select value={form.checkpointType} onChange={e => setForm(prev => ({ ...prev, checkpointType: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
              <option value="intake">Intake</option>
              <option value="movement">Movement</option>
              <option value="arrival">Arrival</option>
              <option value="condition_check">Condition check</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Location name</label>
            <input required value={form.locationName} onChange={e => setForm(prev => ({ ...prev, locationName: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Timestamp</label>
            <input type="datetime-local" value={form.timestamp} onChange={e => setForm(prev => ({ ...prev, timestamp: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Transport method</label>
            <select value={form.transportMethod} onChange={e => setForm(prev => ({ ...prev, transportMethod: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
              <option value="bicycle">Bicycle</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="truck">Truck</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Departure</label>
            <input type="datetime-local" value={form.departureTime} onChange={e => setForm(prev => ({ ...prev, departureTime: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Arrival</label>
            <input type="datetime-local" value={form.arrivalTime} onChange={e => setForm(prev => ({ ...prev, arrivalTime: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Condition</label>
            <select value={form.condition} onChange={e => setForm(prev => ({ ...prev, condition: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
              <option value="fresh">Fresh</option>
              <option value="delayed">Delayed</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>
        </div>
        <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes" className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[90px]" />
        <button disabled={saving || loading} className="px-4 py-2.5 bg-[#1C3829] text-white text-sm font-semibold rounded-lg disabled:opacity-60">
          {saving ? 'Saving...' : 'Log Checkpoint'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-stone-50 border-b border-stone-100">{['Batch', 'Origin', 'Checkpoints', 'Transport', 'Quality feedback'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-stone-50">
              {batches.map(b => (
                <tr key={b.realId || b.id}>
                  <td className="px-4 py-3 font-semibold text-stone-800">{b.name || b.id}</td>
                  <td className="px-4 py-3 text-stone-600">{b.origin}</td>
                  <td className="px-4 py-3 text-stone-600">{b.checkpoints?.length || 0}</td>
                  <td className="px-4 py-3 text-stone-600">{b.transportLogged ? 'Logged' : 'Pending'}</td>
                  <td className="px-4 py-3 text-stone-600">{formatQualitySummary(b.latestQuality)}</td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-400">No batches yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'technical', description: '' });

  const fetchTickets = useCallback(() => {
    setLoading(true);
    apiService.getAggregatorSupportTickets()
      .then(res => setTickets(res.data || []))
      .catch(() => toast.error('Failed to load support tickets'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await saveAggregatorWrite('/aggregators/support-tickets', 'POST', form, () => apiService.createAggregatorSupportTicket(form));
      if (!(result as any).queued) {
        toast.success('Support ticket submitted');
        fetchTickets();
      }
      setForm({ subject: '', category: 'technical', description: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Help & Support Tickets</h2>
        <SyncStatus />
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input required value={form.subject} onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))} placeholder="Subject" className="sm:col-span-2 px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50">
            <option value="technical">Technical</option>
            <option value="sync">Offline sync</option>
            <option value="batch">Batch traceability</option>
            <option value="farmer">Farmer registration</option>
          </select>
        </div>
        <textarea required value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the issue" className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[110px]" />
        <button disabled={saving} className="px-4 py-2.5 bg-[#1C3829] text-white text-sm font-semibold rounded-lg disabled:opacity-60">{saving ? 'Submitting...' : 'Submit Ticket'}</button>
      </form>
      <div className="grid gap-3">
        {loading ? <div className="p-8 text-center text-stone-400">Loading tickets...</div> : tickets.map(ticket => (
          <div key={ticket.ticketId || ticket.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-800">{ticket.subject}</p>
                <p className="text-sm text-stone-500 mt-1">{ticket.description}</p>
              </div>
              <StatusBadge status={(ticket.status || 'pending').toLowerCase()} />
            </div>
            <p className="text-xs text-stone-400 mt-2">{ticket.category || 'technical'}</p>
          </div>
        ))}
        {!loading && tickets.length === 0 && <div className="p-8 text-center text-stone-400 bg-white rounded-xl border border-stone-200">No support tickets yet.</div>}
      </div>
    </div>
  );
}

const SECTIONS: Record<string, React.ComponentType> = {
  overview: Overview,
  profile: ProfileSettings,
  farmers: FarmerList,
  schedule: PickupSchedule,
  'record-pickup': RecordPickup,
  batches: BatchManagement,
  support: SupportTickets,
  history: PickupHistory,
  reports: RoleReports,
  notifications: Notifs,
};

export default function AggregatorDashboard() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const Component = SECTIONS[section] || Overview;
  return <Component />;
}

