import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { RoleReports } from '../../components/RoleReports';
// Temporary locals for unimplemented features
const priceData: any[] = [
  { month: 'Apr 2026', baseline: 2500, a1: 3000, a2: 2800, a3: 2600 },
  { month: 'May 2026', baseline: 2600, a1: 3200, a2: 2950, a3: 2700 },
];
const defaultPriceGrades = [
  { key: 'a1', grade: 'Grade A1 export reference', price: 'RWF 3,200/kg', pricePerKg: 3200, change: '+6.7%', changePercent: 6.7 },
  { key: 'a2', grade: 'Grade A2 export reference', price: 'RWF 2,950/kg', pricePerKg: 2950, change: '+5.4%', changePercent: 5.4 },
  { key: 'a3', grade: 'Grade A3 export reference', price: 'RWF 2,700/kg', pricePerKg: 2700, change: '+3.8%', changePercent: 3.8 },
];
const defaultPriceTrendState = {
  baselineRatePerKg: 2600,
  previousBaselineRatePerKg: 2500,
  baselineChange: '+4.0%',
  grades: defaultPriceGrades,
  history: priceData,
  updatedAt: null,
};
const chartSortClass = "px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600";
const COFFEE_VARIETIES = ['Red Bourbon', 'Bourbon', 'Jackson', 'Mibirizi', 'Typica', 'Gesha'];
const monthYearValue = (row: any) => {
  const parsed = Date.parse(`1 ${String(row?.month || row?.date || row?.year || '')}`);
  return Number.isNaN(parsed) ? 0 : parsed;
};
const sortPriceHistory = (rows: any[], sort: string) => {
  const monthlyRows = [...rows].sort((a, b) => monthYearValue(a) - monthYearValue(b));
  if (sort === 'month') {
    return monthlyRows;
  }
  const grouped = monthlyRows.reduce<Record<string, any[]>>((acc, row) => {
    const dateValue = monthYearValue(row);
    const year = dateValue ? String(new Date(dateValue).getFullYear()) : 'Unknown';
    acc[year] = acc[year] || [];
    acc[year].push(row);
    return acc;
  }, {});
  return Object.entries(grouped).map(([year, yearRows]) => {
    const keys = ['baseline', 'a1', 'a2', 'a3'];
    return keys.reduce<Record<string, any>>((row, key) => {
      const values = yearRows.map((item) => Number(item[key] || 0)).filter((value) => value > 0);
      row[key] = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
      return row;
    }, { month: year });
  });
};
const parseLatLng = (value?: string | null) => {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};
const osmEmbedUrl = (coordinates: { lat: number; lng: number }) =>
  `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15&output=embed`;
const RWANDA_LOCATIONS: Record<string, Record<string, string[]>> = {
  'Kigali City': {
    Gasabo: ['Bumbogo', 'Gatsata', 'Gikomero', 'Gisozi', 'Jabana', 'Jali', 'Kacyiru', 'Kimihurura', 'Kimironko', 'Kinyinya', 'Ndera', 'Nduba', 'Remera', 'Rusororo', 'Rutunga'],
    Kicukiro: ['Gahanga', 'Gatenga', 'Gikondo', 'Kagarama', 'Kanombe', 'Kicukiro', 'Kigarama', 'Masaka', 'Niboye', 'Nyarugunga'],
    Nyarugenge: ['Gitega', 'Kanyinya', 'Kigali', 'Kimisagara', 'Mageragere', 'Muhima', 'Nyakabanda', 'Nyamirambo', 'Nyarugenge', 'Rwezamenyo'],
  },
  'Eastern Province': {
    Bugesera: ['Gashora', 'Juru', 'Kamabuye', 'Mareba', 'Mayange', 'Musenyi', 'Mwogo', 'Ntarama', 'Nyamata', 'Nyarugenge', 'Rilima', 'Ruhuha', 'Rweru', 'Shyara'],
    Gatsibo: ['Gasange', 'Gatsibo', 'Gitoki', 'Kabarore', 'Kageyo', 'Kiramuruzi', 'Kiziguro', 'Muhura', 'Murambi', 'Ngarama', 'Nyagihanga', 'Remera', 'Rugarama', 'Rwimbogo'],
    Kayonza: ['Gahini', 'Kabare', 'Kabarondo', 'Mukarange', 'Murama', 'Murundi', 'Mwiri', 'Ndego', 'Nyamirama', 'Rukara', 'Ruramira', 'Rwinkwavu'],
    Kirehe: ['Gahara', 'Gatore', 'Kigarama', 'Kigina', 'Kirehe', 'Mahama', 'Mpanga', 'Musaza', 'Mushikiri', 'Nasho', 'Nyamugari', 'Nyarubuye'],
    Ngoma: ['Gashanda', 'Jarama', 'Karembo', 'Kazo', 'Kibungo', 'Mugesera', 'Murama', 'Mutenderi', 'Remera', 'Rukira', 'Rukumberi', 'Rurenge', 'Sake', 'Zaza'],
    Nyagatare: ['Gatunda', 'Karama', 'Karangazi', 'Katabagemu', 'Kiyombe', 'Matimba', 'Mimuri', 'Mukama', 'Musheli', 'Nyagatare', 'Rukomo', 'Rwempasha', 'Rwimiyaga', 'Tabagwe'],
    Rwamagana: ['Fumbwe', 'Gahengeri', 'Gishari', 'Karenge', 'Kigabiro', 'Muhazi', 'Munyaga', 'Munyiginya', 'Musha', 'Muyumbu', 'Mwulire', 'Nyakariro', 'Nzige', 'Rubona'],
  },
  'Northern Province': {
    Burera: ['Bungwe', 'Butaro', 'Cyanika', 'Cyeru', 'Gahunga', 'Gatebe', 'Gitovu', 'Kagogo', 'Kinoni', 'Kinyababa', 'Kivuye', 'Nemba', 'Rugarama', 'Rugengabari', 'Ruhunde', 'Rusarabuye', 'Rwerere'],
    Gakenke: ['Busengo', 'Coko', 'Cyabingo', 'Gakenke', 'Gashenyi', 'Janja', 'Kamubuga', 'Karambo', 'Kivuruga', 'Mataba', 'Minazi', 'Mugunga', 'Muhondo', 'Muyongwe', 'Muzo', 'Nemba', 'Ruli', 'Rusasa', 'Rushashi'],
    Gicumbi: ['Bukure', 'Bwisige', 'Byumba', 'Cyumba', 'Giti', 'Kaniga', 'Manyagiro', 'Miyove', 'Mukarange', 'Muko', 'Mutete', 'Nyamiyaga', 'Nyankenke', 'Rubaya', 'Rukomo', 'Rushaki', 'Rutare', 'Ruvune', 'Rwamiko', 'Shangasha'],
    Musanze: ['Busogo', 'Cyuve', 'Gacaca', 'Gashaki', 'Gataraga', 'Kimonyi', 'Kinigi', 'Muhoza', 'Muko', 'Musanze', 'Nkotsi', 'Nyange', 'Remera', 'Rwaza', 'Shingiro'],
    Rulindo: ['Base', 'Burega', 'Bushoki', 'Buyoga', 'Cyinzuzi', 'Cyungo', 'Kinihira', 'Kisaro', 'Masoro', 'Mbogo', 'Murambi', 'Ngoma', 'Ntarabana', 'Rukozo', 'Rusiga', 'Shyorongi', 'Tumba'],
  },
  'Southern Province': {
    Gisagara: ['Gikonko', 'Gishubi', 'Kansi', 'Kibirizi', 'Kigembe', 'Mamba', 'Muganza', 'Mugombwa', 'Mukindo', 'Musha', 'Ndora', 'Nyanza', 'Save'],
    Huye: ['Gishamvu', 'Huye', 'Karama', 'Kigoma', 'Kinazi', 'Maraba', 'Mbazi', 'Mukura', 'Ngoma', 'Ruhashya', 'Rusatira', 'Rwaniro', 'Simbi', 'Tumba'],
    Kamonyi: ['Gacurabwenge', 'Karama', 'Kayenzi', 'Kayumbu', 'Mugina', 'Musambira', 'Ngamba', 'Nyamiyaga', 'Nyarubaka', 'Rugalika', 'Rukoma', 'Runda'],
    Muhanga: ['Cyeza', 'Kabacuzi', 'Kibangu', 'Kiyumba', 'Muhanga', 'Mushishiro', 'Nyabinoni', 'Nyamabuye', 'Nyarusange', 'Rongi', 'Rugendabari', 'Shyogwe'],
    Nyamagabe: ['Buruhukiro', 'Cyanika', 'Gasaka', 'Gatare', 'Kaduha', 'Kamegeri', 'Kibirizi', 'Kibumbwe', 'Kitabi', 'Mbazi', 'Mugano', 'Musange', 'Musebeya', 'Mushubi', 'Nkomane', 'Tare', 'Uwinkingi'],
    Nyanza: ['Busasamana', 'Busoro', 'Cyabakamyi', 'Kibirizi', 'Kigoma', 'Mukingo', 'Muyira', 'Ntyazo', 'Nyagisozi', 'Rwabicuma'],
    Nyaruguru: ['Busanze', 'Cyahinda', 'Kibeho', 'Kivu', 'Mata', 'Muganza', 'Munini', 'Ngera', 'Ngoma', 'Nyabimata', 'Nyagisozi', 'Ruheru', 'Ruramba', 'Rusenge'],
    Ruhango: ['Bweramana', 'Byimana', 'Kabagari', 'Kinazi', 'Kinihira', 'Mbuye', 'Mwendo', 'Ntongwe', 'Ruhango'],
  },
  'Western Province': {
    Karongi: ['Bwishyura', 'Gashari', 'Gishyita', 'Gitesi', 'Mubuga', 'Murambi', 'Murundi', 'Mutuntu', 'Rubengera', 'Rugabano', 'Ruganda', 'Rwankuba', 'Twumba'],
    Ngororero: ['Bwira', 'Gatumba', 'Hindiro', 'Kabaya', 'Kageyo', 'Kavumu', 'Matyazo', 'Muhanda', 'Muhororo', 'Ndaro', 'Ngororero', 'Nyange', 'Sovu'],
    Nyabihu: ['Bigogwe', 'Jenda', 'Jomba', 'Kabatwa', 'Karago', 'Kintobo', 'Mukamira', 'Muringa', 'Rambura', 'Rugera', 'Rurembo', 'Shyira'],
    Nyamasheke: ['Bushekeri', 'Bushenge', 'Cyato', 'Gihombo', 'Kagano', 'Kanjongo', 'Karambi', 'Karengera', 'Kirimbi', 'Macuba', 'Mahembe', 'Nyabitekeri', 'Rangiro', 'Ruharambuga', 'Shangi'],
    Rubavu: ['Bugeshi', 'Busasamana', 'Cyanzarwe', 'Gisenyi', 'Kanama', 'Kanzenze', 'Mudende', 'Nyakiriba', 'Nyamyumba', 'Nyundo', 'Rubavu', 'Rugerero'],
    Rusizi: ['Bugarama', 'Butare', 'Bweyeye', 'Gashonga', 'Giheke', 'Gihundwe', 'Gikundamvura', 'Gitambi', 'Kamembe', 'Muganza', 'Mururu', 'Nkanka', 'Nkombo', 'Nkungu', 'Nyakabuye', 'Nyakarenzo', 'Nzahaha', 'Rwimbogo'],
    Rutsiro: ['Boneza', 'Gihango', 'Kigeyo', 'Kivumu', 'Manihira', 'Mukura', 'Murunda', 'Musasa', 'Mushonyi', 'Mushubati', 'Nyabirasi', 'Ruhango', 'Rusebeya'],
  },
};
// notifications fetched live from API
const sustainabilityData = {
  farmer: [{
    farmerId: 'F001',
    month: 'March 2026',
    waterUsage: '12.5',
    carbonFootprint: '0.4',
    organicWaste: 120,
    renewableEnergy: 65,
    organicFertilizer: '85%',
    shadeTrees: '24',
    agroforestry: true,
    chemicalUse: 0
  }],
  systemWide: {}
};
const weatherData: any = { current: {}, forecast: [], alerts: [] };
const trainingResources = [
  {
    id: 'sorting-a1',
    title: 'Cherry Sorting for A1 Quality',
    category: 'Quality Improvement',
    format: 'Video',
    duration: '12 min',
    level: 'Beginner',
  },
  {
    id: 'washed-processing',
    title: 'Fully Washed Processing Best Practices',
    category: 'Processing',
    format: 'PDF',
    duration: '8 pages',
    level: 'Intermediate',
  },
  {
    id: 'pest-management',
    title: 'Integrated Pest Management for Coffee Farms',
    category: 'Farm Health',
    format: 'PDF',
    duration: '10 pages',
    level: 'Beginner',
  },
  {
    id: 'soil-water',
    title: 'Soil Fertility and Water Conservation',
    category: 'Sustainability',
    format: 'Webinar',
    duration: '45 min',
    level: 'Intermediate',
  },
  {
    id: 'naeb-compliance',
    title: 'NAEB and IMPEXCOR Compliance Basics',
    category: 'Compliance',
    format: 'PDF',
    duration: '6 pages',
    level: 'Beginner',
  },
  {
    id: 'post-harvest',
    title: 'Post-Harvest Handling to Reduce Defects',
    category: 'Quality Improvement',
    format: 'Video',
    duration: '15 min',
    level: 'Advanced',
  },
];
import {
  TrendingUp, Leaf, CalendarClock, CheckCircle2, Clock,
  AlertCircle, MapPin, Award, BookOpen, Play, FileText,
  ArrowUpRight, Coffee, Star, ChevronRight, Bell, Sprout, Droplets,
  Zap, Recycle, TreeDeciduous, Link2, MapPinned, Package, Ship, QrCode,
  Plus, MessageSquare, ThumbsUp, Eye, Cloud, CloudRain, Wind, Thermometer,
  Download,
  Search, Filter as FilterIcon, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const KPICard = ({ label, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <ArrowUpRight className="w-4 h-4 text-stone-300" />
    </div>
    <p className="text-2xl font-bold text-stone-800">{value}</p>
    <p className="text-sm font-medium text-stone-500 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-emerald-600 mt-1 font-medium">{sub}</p>}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const normalized = String(status || '').toLowerCase();
  const map: Record<string, string> = {
    paid: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    initiated: 'bg-sky-100 text-sky-700',
    failed: 'bg-red-100 text-red-700',
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
    collected: 'bg-sky-100 text-sky-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[normalized] || 'bg-stone-100 text-stone-600'}`}>
      {normalized || 'pending'}
    </span>
  );
};

const isPaidStatus = (status: any) => ['paid', 'completed'].includes(String(status || '').toLowerCase());
const isPendingStatus = (status: any) => ['pending', 'initiated'].includes(String(status || '').toLowerCase());

const escapePdfText = (value: any) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const createReceiptPdf = (lines: string[]) => {
  const content = [
    'BT',
    '/F1 18 Tf',
    '72 760 Td',
    `(Smart Coffee Payment Receipt) Tj`,
    '/F1 10 Tf',
    '0 -24 Td',
    `(IMPEXCOR Coffee Supply Chain Management System) Tj`,
    ...lines.flatMap((line, index) => [
      index === 0 ? '0 -34 Td' : '0 -18 Td',
      `(${escapePdfText(line)}) Tj`,
    ]),
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

function Overview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [priceTrendData, setPriceTrendData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);
  const [pickupRecords, setPickupRecords] = useState<any[]>([]);
  const [eudrStatus, setEudrStatus] = useState<any>(null);
  const [pickupSort, setPickupSort] = useState('year');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, notifRes, priceRes, pickupRes, eudrRes] = await Promise.all([
          apiService.getFarmerDashboard(),
          apiService.getNotifications(),
          apiService.getFarmerPriceTrends().catch(() => ({ data: null })),
          apiService.getFarmerPickups().catch(() => ({ data: [] })),
          apiService.getFarmerEudrStatus().catch(() => ({ data: null })),
        ]);
        setDashboardData(dashRes.data);
        setRecentNotifs(notifRes.data || []);
        setPriceTrendData(priceRes.data);
        setPickupRecords(pickupRes.data || []);
        setEudrStatus(eudrRes.data);
      } catch (err) {
        console.error('Failed to fetch farmer dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex justify-center text-stone-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  const metrics = dashboardData?.metrics || {
    totalDeliveries: 0,
    totalWeight: 0,
    totalEarned: 0,
    pendingPayment: 0,
  };

  const profile = dashboardData?.profile || {};
  const baselineRate = Number(priceTrendData?.baselineRatePerKg ?? defaultPriceTrendState.baselineRatePerKg);
  const baselineChange = priceTrendData?.baselineChange || defaultPriceTrendState.baselineChange;
  const eudrSummary = eudrStatus?.summary || { total: 0, status: 'Not Checked', highRisk: 0, mediumRisk: 0, notVerified: 0 };
  const eudrBadgeClass = eudrSummary.status === 'Clear'
    ? 'bg-emerald-100 text-emerald-700'
    : eudrSummary.status === 'Monitor'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';
  const pickupStats = Object.values(pickupRecords.reduce((acc: Record<string, any>, pickup: any) => {
    const date = new Date(pickup.deliveryDate || pickup.createdAt || Date.now());
    const month = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (!acc[month]) acc[month] = { month, weight: 0, pickups: 0, sort: new Date(date.getFullYear(), date.getMonth(), 1).getTime() };
    acc[month].weight += Number(pickup.weightKg || 0);
    acc[month].pickups += 1;
    return acc;
  }, {})).sort((a: any, b: any) => (a as any).sort - (b as any).sort);
  const sortedPickupStats = pickupSort === 'month'
    ? [...pickupStats].sort((a: any, b: any) => new Date((a as any).sort).getMonth() - new Date((b as any).sort).getMonth())
    : [...pickupStats].sort((a: any, b: any) => (a as any).sort - (b as any).sort);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1C3829] to-[#2D5A40] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-300 text-sm">{t('welcome')},</p>
            <h2 className="text-xl font-bold mt-0.5">{user?.name || 'Farmer'} 👋</h2>
            <p className="text-green-200 text-sm mt-1">{profile.gpsLocation || 'Nyamasheke, Western Province'} • A1 Grade Coffee Farm</p>
          </div>
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
            <Coffee className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-green-700 grid grid-cols-3 gap-4">
          {[
            { label: 'Farm Size', value: `${profile.farmSizeHa || 0} ha` },
            { label: 'Altitude', value: '1,750 m' },
            { label: 'Variety', value: 'Red Bourbon' }
          ].map(s => (
            <div key={s.label}>
              <p className="text-green-300 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('total_deliveries')} value={metrics.totalDeliveries} sub="This season" icon={CalendarClock} color="bg-emerald-600" />
        <KPICard label={t('total_weight')} value={`${metrics.totalWeight} kg`} sub="↑ 12% vs last season" icon={Leaf} color="bg-amber-600" />
        <KPICard label="Receipt Records" value={metrics.totalDeliveries} sub="Uploaded at pickup" icon={CheckCircle2} color="bg-violet-600" />
        <KPICard label="Supplier Type" value={String(profile.supplierType || 'FARMER').toUpperCase() === 'COOPERATIVE' ? 'Cooperative' : 'Farmer'} sub="Shared portal features" icon={Clock} color="bg-rose-500" />
      </div>

      {/* Pickup Statistics + Baseline Rate */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-semibold text-stone-800">Pickup Statistics</h3>
              <p className="text-sm text-stone-500 mt-0.5">Monthly completed pickup weight and count.</p>
            </div>
            <select
              value={pickupSort}
              onChange={e => setPickupSort(e.target.value)}
              className={chartSortClass}
            >
              <option value="year">Year</option>
              <option value="month">Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={sortedPickupStats.length ? sortedPickupStats : [{ month: 'No data', weight: 0, pickups: 0 }]}>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-stone-800">Baseline farmer rate</h3>
              <p className="text-sm text-stone-500 mt-1">Current intake rate used when pickup is completed.</p>
              {priceTrendData?.updatedAt && <p className="text-xs text-stone-400 mt-2">Updated {new Date(priceTrendData.updatedAt).toLocaleDateString()}</p>}
            </div>
            <span className={`text-xs font-semibold ${String(baselineChange).startsWith('-') ? 'text-red-600 bg-red-50' : 'text-emerald-700 bg-emerald-50'} px-2.5 py-1 rounded-full`}>
              {baselineChange}
            </span>
          </div>
          <p className="mt-6 text-4xl font-bold text-emerald-700">RWF {baselineRate.toLocaleString()}/kg</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-stone-800">EUDR location screening</h3>
              <p className="text-sm text-stone-500 mt-1">Deforestation-risk checks based on registered farm coordinates.</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${eudrBadgeClass}`}>{eudrSummary.status}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5 text-center">
            <div className="rounded-lg bg-stone-50 p-3"><p className="text-xl font-bold text-stone-800">{eudrSummary.total || 0}</p><p className="text-xs text-stone-500">Checked</p></div>
            <div className="rounded-lg bg-red-50 p-3"><p className="text-xl font-bold text-red-700">{eudrSummary.highRisk || 0}</p><p className="text-xs text-red-600">High</p></div>
            <div className="rounded-lg bg-amber-50 p-3"><p className="text-xl font-bold text-amber-700">{eudrSummary.mediumRisk || eudrSummary.notVerified || 0}</p><p className="text-xs text-amber-600">Review</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <h3 className="font-semibold text-stone-800 mb-4">{t('recent_activity')}</h3>
        <div className="space-y-3">
          {recentNotifs.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">No recent activity.</p>
          ) : recentNotifs.slice(0, 4).map((n: any) => (
            <div key={n.notificationId} className="flex items-start gap-2.5">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <div>
                <p className="text-sm font-medium text-stone-700">{n.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FarmProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    farmName: '',
    gpsLocation: '',
    farmSizeHa: '',
    coordinates: '',
    numberOfFarms: '',
  });
  const [memberFarms, setMemberFarms] = useState<any[]>([]);
  const [memberFarmSaving, setMemberFarmSaving] = useState(false);
  const [memberFarmForm, setMemberFarmForm] = useState({
    farmName: '',
    farmLocation: '',
    province: '',
    district: '',
    cell: '',
    coordinates: '',
    farmSizeHa: '',
    coffeeVarieties: '',
  });
  const [expandedMemberFarmId, setExpandedMemberFarmId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiService.getFarmerDashboard();
        const nextProfile = response.data.profile;
        setProfile(nextProfile);
        setForm({
          farmName: nextProfile?.farmName || '',
          gpsLocation: nextProfile?.gpsLocation || '',
          farmSizeHa: String(nextProfile?.farmSizeHa || ''),
          coordinates: nextProfile?.coordinates || '',
          numberOfFarms: String(nextProfile?.numberOfFarms || ''),
        });
        if (String(nextProfile?.supplierType || '').toUpperCase() === 'COOPERATIVE') {
          const farmsResponse = await apiService.getCooperativeMemberFarms();
          setMemberFarms(farmsResponse.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="p-10 text-center text-stone-400">Loading profile...</div>;

  const aggregator = profile?.aggregator;
  const supplierType = String(profile?.supplierType || 'FARMER').toUpperCase();
  const profileCoordinates = parseLatLng(profile?.coordinates);
  const memberFarmDistricts = memberFarmForm.province ? Object.keys(RWANDA_LOCATIONS[memberFarmForm.province] || {}) : [];
  const memberFarmCells = memberFarmForm.province && memberFarmForm.district
    ? (RWANDA_LOCATIONS[memberFarmForm.province]?.[memberFarmForm.district] || [])
    : [];
  const memberFarmLocation = ['Rwanda', memberFarmForm.province, memberFarmForm.district, memberFarmForm.cell].filter(Boolean).join(', ');
  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));
  const updateMemberFarmForm = (field: string, value: string) => setMemberFarmForm(prev => {
    if (field === 'province') return { ...prev, province: value, district: '', cell: '', farmLocation: '' };
    if (field === 'district') return { ...prev, district: value, cell: '', farmLocation: '' };
    return { ...prev, [field]: value };
  });
  const captureProfileGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        updateForm('coordinates', coords);
        toast.success(`Captured GPS coordinates: ${coords}`);
      },
      (error) => toast.error(error.message || 'Could not capture GPS coordinates')
    );
  };

  const captureMemberFarmGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        updateMemberFarmForm('coordinates', coords);
        toast.success(`Captured GPS coordinates: ${coords}`);
      },
      (error) => toast.error(error.message || 'Could not capture GPS coordinates')
    );
  };

  const saveFarmDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiService.updateFarmerProfile({
        farmName: form.farmName,
        gpsLocation: form.gpsLocation,
        farmSizeHa: form.farmSizeHa,
        coordinates: form.coordinates,
        numberOfFarms: form.numberOfFarms,
      });
      setProfile((prev: any) => ({ ...prev, ...(response.data || {}) }));
      setEditing(false);
      toast.success('Farm details updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update farm details');
    } finally {
      setSaving(false);
    }
  };

  const addMemberFarm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!memberFarmForm.province || !memberFarmForm.district || !memberFarmForm.cell) {
      toast.error('Select province, district, and cell for this farm');
      return;
    }
    setMemberFarmSaving(true);
    try {
      const response = await apiService.createCooperativeMemberFarm({
        ...memberFarmForm,
        farmLocation: memberFarmLocation,
      });
      setMemberFarms(prev => [response.data, ...prev]);
      setMemberFarmForm({ farmName: '', farmLocation: '', province: '', district: '', cell: '', coordinates: '', farmSizeHa: '', coffeeVarieties: '' });
      toast.success('Cooperative farm added');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add cooperative farm');
    } finally {
      setMemberFarmSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-stone-800">{supplierType === 'COOPERATIVE' ? 'Farms' : 'Farm Profile'}</h2>
        {supplierType === 'COOPERATIVE' && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 border border-emerald-100">
            Cooperative supplier account
          </span>
        )}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-700 mb-4 pb-3 border-b border-stone-100">Personal Information</h3>
          <div className="space-y-3">
            {[
              { label: 'Full Name', value: user?.name },
              { label: 'Email', value: user?.email },
              { label: 'Phone', value: user?.phone || 'Not provided' },
              { label: 'User ID', value: user?.id?.substring(0, 8) },
              { label: 'Status', value: user?.status },
              { label: 'Account Type', value: supplierType === 'COOPERATIVE' ? 'Cooperative Supplier' : 'Farmer / Big Farm' },
            ].map(f => (
              <div key={f.label} className="flex items-start justify-between py-2 border-b border-stone-50">
                <span className="text-sm text-stone-500">{f.label}</span>
                <span className="text-sm font-medium text-stone-800 text-right max-w-xs">{f.value}</span>
              </div>
            ))}
          </div>

          {aggregator && (
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" /> Assigned Aggregator
              </h4>
              <p className="text-sm font-semibold text-stone-800">{aggregator.fullName}</p>
              <p className="text-xs text-stone-500 mt-0.5">{aggregator.phone || 'No phone provided'}</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">Your primary contact for coffee collection</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="mb-4 pb-3 border-b border-stone-100 flex items-center justify-between gap-3">
            <h3 className="font-semibold text-stone-700">{supplierType === 'COOPERATIVE' ? 'Cooperative Production Details' : 'Farm Details'}</h3>
            <button type="button" onClick={() => setEditing(!editing)} className="px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50 text-xs font-semibold text-emerald-700">
              {editing ? 'Cancel' : 'Edit Details'}
            </button>
          </div>
          {editing ? (
            <form onSubmit={saveFarmDetails} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">{supplierType === 'COOPERATIVE' ? 'Cooperative Name' : 'Farm Name'}</label>
                <input value={form.farmName} onChange={e => updateForm('farmName', e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">{supplierType === 'COOPERATIVE' ? 'Cooperative Location' : 'Farm Location'}</label>
                <input value={form.gpsLocation} onChange={e => updateForm('gpsLocation', e.target.value)} placeholder="Kigali City, Gasabo, Kimironko, Kibagabaga" className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">{supplierType === 'COOPERATIVE' ? 'Total Production Area (ha)' : 'Farm Size (ha)'}</label>
                  <input type="number" min="0" step="0.01" value={form.farmSizeHa} onChange={e => updateForm('farmSizeHa', e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm" />
                </div>
                {supplierType === 'COOPERATIVE' && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">Number of Farms</label>
                    <input type="number" min="0" step="1" value={form.numberOfFarms} onChange={e => updateForm('numberOfFarms', e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">GPS Coordinates</label>
                <div className="flex gap-2">
                  <input value={form.coordinates} onChange={e => updateForm('coordinates', e.target.value)} placeholder="-1.933775, 30.132433" className="flex-1 px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm" />
                  <button type="button" onClick={captureProfileGps} className="px-3 py-2 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50">Capture GPS</button>
                </div>
              </div>
              <button disabled={saving} className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Farm Details'}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              {[
                { label: supplierType === 'COOPERATIVE' ? 'Cooperative Name' : 'Farm Name', value: profile?.farmName || 'Not set' },
                { label: supplierType === 'COOPERATIVE' ? 'Cooperative Location' : 'Farm Location', value: profile?.gpsLocation || 'Not set' },
                { label: supplierType === 'COOPERATIVE' ? 'Total Production Area' : 'Farm Size', value: `${profile?.farmSizeHa || 0} hectares` },
                ...(supplierType === 'COOPERATIVE' ? [{ label: 'Number of Farms', value: String(profile?.numberOfFarms || 0) }] : []),
                { label: 'Coordinates', value: profile?.coordinates || 'Not captured' },
                ...(supplierType === 'FARMER' ? [{ label: 'Coffee Variety', value: profile?.coffeeVarieties || 'Red Bourbon' }] : []),
                { label: 'Processing Method', value: 'Fully Washed' },
              ].map(f => (
                <div key={f.label} className="flex items-start justify-between py-2 border-b border-stone-50">
                  <span className="text-sm text-stone-500">{f.label}</span>
                  <span className="text-sm font-medium text-stone-800 text-right max-w-xs">{f.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {supplierType === 'COOPERATIVE' && (
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 pb-3 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700">Member Farms</h3>
              <p className="text-xs text-stone-500 mt-1">Add the farms represented by this cooperative with their GPS coordinates.</p>
            </div>

            <form onSubmit={addMemberFarm} className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">Country</span>
                <input
                  value="Rwanda"
                  disabled
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-100 text-sm text-stone-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">Farm Name</span>
                <input
                  required
                  value={memberFarmForm.farmName}
                  onChange={e => updateMemberFarmForm('farmName', e.target.value)}
                  placeholder="Farm name"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">Province</span>
                <select
                  required
                  value={memberFarmForm.province}
                  onChange={e => updateMemberFarmForm('province', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm"
                >
                  <option value="">Select province</option>
                  {Object.keys(RWANDA_LOCATIONS).map(province => <option key={province} value={province}>{province}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">District</span>
                <select
                  required
                  value={memberFarmForm.district}
                  onChange={e => updateMemberFarmForm('district', e.target.value)}
                  disabled={!memberFarmForm.province}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm disabled:bg-stone-100 disabled:text-stone-400"
                >
                  <option value="">{memberFarmForm.province ? 'Select district' : 'Choose province first'}</option>
                  {memberFarmDistricts.map(district => <option key={district} value={district}>{district}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">Cell / Area</span>
                <select
                  required
                  value={memberFarmForm.cell}
                  onChange={e => updateMemberFarmForm('cell', e.target.value)}
                  disabled={!memberFarmForm.district}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm disabled:bg-stone-100 disabled:text-stone-400"
                >
                  <option value="">{memberFarmForm.district ? 'Select cell / area' : 'Choose district first'}</option>
                  {memberFarmCells.map(cell => <option key={cell} value={cell}>{cell}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">GPS Coordinates</span>
                <div className="flex gap-2">
                  <input
                    required
                    value={memberFarmForm.coordinates}
                    onChange={e => updateMemberFarmForm('coordinates', e.target.value)}
                    placeholder="-1.933775, 30.132433"
                    className="min-w-0 flex-1 px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm"
                  />
                  <button type="button" onClick={captureMemberFarmGps} className="px-3 py-2 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50">GPS</button>
                </div>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-stone-500">Farm Size (ha)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={memberFarmForm.farmSizeHa}
                  onChange={e => updateMemberFarmForm('farmSizeHa', e.target.value)}
                  placeholder="Size ha"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm"
                />
              </label>
              <label className="space-y-1 lg:col-span-2">
                <span className="text-xs font-semibold text-stone-500">Coffee Varieties</span>
                <select
                  value={memberFarmForm.coffeeVarieties}
                  onChange={e => updateMemberFarmForm('coffeeVarieties', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm"
                >
                  <option value="">Select coffee variety</option>
                  {COFFEE_VARIETIES.map(variety => <option key={variety} value={variety}>{variety}</option>)}
                </select>
              </label>
              <div className="flex items-end">
                <button disabled={memberFarmSaving} className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                  {memberFarmSaving ? 'Adding...' : 'Add Farm'}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto border border-stone-100 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-500">
                    {['Farm', 'Location', 'GPS Coordinates', 'Size', 'Varieties'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {memberFarms.map(farm => {
                    const farmCoordinates = parseLatLng(farm.coordinates);
                    const isExpanded = expandedMemberFarmId === farm.farmId;
                    return (
                      <Fragment key={farm.farmId}>
                        <tr
                          onClick={() => setExpandedMemberFarmId(isExpanded ? null : farm.farmId)}
                          className="hover:bg-stone-50 cursor-pointer"
                          title="Click to view this farm on the map"
                        >
                          <td className="px-4 py-3 font-semibold text-stone-800">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-emerald-600" />
                              <span>{farm.farmName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-stone-600">{farm.farmLocation || '-'}</td>
                          <td className="px-4 py-3 text-stone-600">{farm.coordinates}</td>
                          <td className="px-4 py-3 text-stone-600">{farm.farmSizeHa ? `${farm.farmSizeHa} ha` : '-'}</td>
                          <td className="px-4 py-3 text-stone-600">{farm.coffeeVarieties || '-'}</td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="px-4 py-4 bg-stone-50">
                              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100">
                                  <div>
                                    <p className="text-sm font-bold text-stone-800">{farm.farmName} Location</p>
                                    <p className="text-xs text-stone-500">{farm.farmLocation || 'Location not recorded'} - {farm.coordinates || 'Coordinates not captured'}</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setExpandedMemberFarmId(null);
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                                  >
                                    Close Map
                                  </button>
                                </div>
                                <div className="h-64 bg-stone-100">
                                  {farmCoordinates ? (
                                    <iframe
                                      title={`${farm.farmName} map`}
                                      width="100%"
                                      height="100%"
                                      frameBorder="0"
                                      src={osmEmbedUrl(farmCoordinates)}
                                    />
                                  ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-stone-400">
                                      <MapPin className="w-8 h-8 mb-2 opacity-30" />
                                      <p className="text-sm font-medium">Farm map not available</p>
                                      <p className="text-xs mt-1">Add coordinates as latitude, longitude to show this farm.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {memberFarms.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-stone-400">No member farms added yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-stone-700 mb-4 pb-3 border-b border-stone-100 flex items-center justify-between">
            <span>{supplierType === 'COOPERATIVE' ? 'Cooperative Location' : 'Location Map'}</span>
            {profileCoordinates && <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Live Coordinates</span>}
          </h3>
          <div className="bg-stone-50 rounded-xl overflow-hidden h-72 border border-stone-200 relative group">
            {profileCoordinates ? (
              <>
                <iframe
                  title="Farm Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={osmEmbedUrl(profileCoordinates)}
                />
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur shadow-lg border border-stone-200 rounded-lg p-2 text-[10px] text-stone-600">
                  GPS: {profile.coordinates}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-stone-400">
                <MapPin className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">Map view not available</p>
                <p className="text-xs mt-1">Capture GPS coordinates during registration or enter them as latitude, longitude</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WashingStationConnection() {
  const [data, setData] = useState<any>({ stations: [], requests: [], current: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ washingStationName: '', reason: '' });

  const loadConnection = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getFarmerWashingStationRequests();
      setData(response.data || { stations: [], requests: [], current: null });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load washing station connection');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  const pendingRequest = (data.requests || []).find((request: any) => String(request.status).toUpperCase() === 'PENDING');

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.washingStationName) {
      toast.error('Select a washing station');
      return;
    }
    setSaving(true);
    try {
      await apiService.createFarmerWashingStationRequest(form);
      toast.success('Washing station request sent to processor');
      setForm({ washingStationName: '', reason: '' });
      await loadConnection();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Washing Station Connection</h2>
        <p className="text-sm text-stone-500 mt-0.5">Request or change the washing station that will connect you with the correct aggregator.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400">Loading connection...</div>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Current Washing Station</p>
              <p className="text-lg font-bold text-stone-800 mt-2">{data.current?.preferred_washing_station || 'Not connected yet'}</p>
              <StatusBadge status={String(data.current?.assignment_status || 'PENDING').toLowerCase()} />
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Assigned Aggregator</p>
              <p className="text-lg font-bold text-stone-800 mt-2">{data.current?.aggregator_name || 'Waiting for processor'}</p>
              <p className="text-sm text-stone-500 mt-1">{data.current?.aggregator_phone || 'No contact assigned'}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Pending Request</p>
              <p className="text-lg font-bold text-stone-800 mt-2">{pendingRequest?.washing_station_name || 'None'}</p>
              <p className="text-sm text-stone-500 mt-1">{pendingRequest ? 'Processor review required' : 'You can submit a new request'}</p>
            </div>
          </div>

          <form onSubmit={submitRequest} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-stone-800">Request Washing Station</h3>
              <p className="text-xs text-stone-500 mt-0.5">Your current aggregator remains unchanged until the processor approves this request.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Washing Station</label>
                <select
                  value={form.washingStationName}
                  onChange={e => setForm(f => ({ ...f, washingStationName: e.target.value }))}
                  disabled={Boolean(pendingRequest)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                >
                  <option value="">Select washing station...</option>
                  {(data.stations || []).map((station: any) => (
                    <option key={station.locationId || station.name} value={station.name}>{station.name} - {station.district}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Reason</label>
                <input
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  disabled={Boolean(pendingRequest)}
                  placeholder="Closer station, new cooperative route, seasonal delivery..."
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || Boolean(pendingRequest)}
              className="px-4 py-2.5 rounded-lg bg-[#1C3829] text-white text-sm font-semibold hover:bg-[#2D5A40] disabled:opacity-50"
            >
              {pendingRequest ? 'Request Pending' : saving ? 'Sending...' : 'Send Request'}
            </button>
          </form>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800">Request History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Requested Station', 'Previous Station', 'Reason', 'Status', 'Requested On', 'Reviewed On'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(data.requests || []).map((request: any) => (
                    <tr key={request.request_id || request.requestId} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-semibold text-stone-800">{request.washing_station_name}</td>
                      <td className="px-4 py-3 text-stone-600">{request.current_washing_station || 'None'}</td>
                      <td className="px-4 py-3 text-stone-600">{request.reason || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={request.status} /></td>
                      <td className="px-4 py-3 text-stone-500">{new Date(request.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-stone-500">{request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data.requests || []).length === 0 && <div className="py-10 text-center text-stone-400">No washing station requests yet.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Pickups() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [memberFarmVarieties, setMemberFarmVarieties] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ weightEstimate: '', coffeeVariety: '', notes: '', requestedDate: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pickupRes, requestRes, dashboardRes] = await Promise.all([
        apiService.getFarmerPickups(),
        apiService.getFarmerPickupRequests(),
        apiService.getFarmerDashboard()
      ]);
      setPickups(pickupRes.data);
      setRequests(requestRes.data);
      const nextProfile = dashboardRes.data?.profile || null;
      setProfile(nextProfile);

      if (String(nextProfile?.supplierType || '').toUpperCase() === 'COOPERATIVE') {
        const farmsResponse = await apiService.getCooperativeMemberFarms();
        const varieties = Array.from(new Set(
          (farmsResponse.data || [])
            .flatMap((farm: any) => String(farm.coffeeVarieties || '').split(','))
            .map((variety: string) => variety.trim())
            .filter(Boolean)
        ));
        setMemberFarmVarieties(varieties);
      } else {
        setMemberFarmVarieties([]);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const estimatedWeight = Number(formData.weightEstimate || 0);
  const isPickupWeightValid = estimatedWeight >= 100;
  const isAssignedToAggregator = Boolean(profile?.aggregator?.fullName && profile?.assignmentStatus === 'APPROVED');
  const supplierType = String(profile?.supplierType || 'FARMER').toUpperCase();
  const pickupCoffeeVarieties = supplierType === 'COOPERATIVE'
    ? memberFarmVarieties
    : String(profile?.coffeeVarieties || 'Red Bourbon')
      .split(',')
      .map(variety => variety.trim())
      .filter(Boolean);
  const coffeeVarietyOptions = pickupCoffeeVarieties.length ? pickupCoffeeVarieties : COFFEE_VARIETIES;
  const formatDate = (value?: string | Date | null) => value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAssignedToAggregator) {
      toast.error('You must be assigned to an aggregator before requesting pickup.');
      return;
    }
    if (!isPickupWeightValid) {
      toast.error('Pickup request must be at least 100 kg');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.createPickupRequest({
        weightEstimate: estimatedWeight,
        notes: formData.notes,
        requestedDate: formData.requestedDate,
        coffeeVariety: formData.coffeeVariety || coffeeVarietyOptions[0],
        farmCoordinates: profile?.coordinates,
        farmLocation: profile?.gpsLocation,
      });
      toast.success('Pickup request submitted successfully!');
      setShowModal(false);
      setFormData({ weightEstimate: '', coffeeVariety: '', notes: '', requestedDate: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-stone-800">Pickup Schedule</h2>
        <button
          onClick={() => {
            if (!isAssignedToAggregator) {
              toast.error('You must be assigned to an aggregator before requesting pickup.');
              return;
            }
            setShowModal(true);
          }}
          disabled={!isAssignedToAggregator}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1C3829] text-white text-sm font-semibold rounded-xl hover:bg-[#2D5A40] transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <Plus className="w-4 h-4" /> Request Pickup
        </button>
      </div>

      {!isAssignedToAggregator && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Aggregator assignment required</p>
          <p className="mt-1">Send a washing station connection request first. Once the processor assigns your aggregator, pickup requests will be available.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Completed Pickups', value: String(pickups.length), icon: CheckCircle2, color: 'bg-emerald-500' },
          { label: 'Pending Requests', value: String(requests.filter(r => r.status === 'PENDING').length), icon: Clock, color: 'bg-amber-500' },
          { label: 'Total Weight', value: `${pickups.reduce((s, p) => s + Number(p.weightKg), 0)} kg`, icon: Leaf, color: 'bg-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3 shadow-md`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-stone-800">{s.value}</p>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
            <h3 className="font-bold text-stone-800">Active Requests</h3>
            <span className="text-xs font-semibold bg-stone-200 text-stone-600 px-2 py-1 rounded-full">{requests.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500">
                  {['Requested Date', 'Aggregator Pickup Date', 'Estimated Weight', 'Coffee Variety', 'Farm Location', 'Status', 'Notes'].map(header => (
                    <th key={header} className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {requests.map(r => (
                  <tr key={r.requestId} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-5 py-4 text-stone-700 whitespace-nowrap">{formatDate(r.requestedDate)}</td>
                    <td className="px-5 py-4 font-semibold text-stone-800 whitespace-nowrap">{formatDate(r.pickupDate)}</td>
                    <td className="px-5 py-4 font-bold text-stone-800 whitespace-nowrap">{Number(r.weightEstimate || 0).toLocaleString()} kg</td>
                    <td className="px-5 py-4 text-stone-700 whitespace-nowrap">{r.coffeeVariety || '-'}</td>
                    <td className="px-5 py-4 text-stone-600 min-w-[180px]">{r.farmLocation || profile?.gpsLocation || '-'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          r.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
                        }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-stone-500 min-w-[220px]">{r.notes || '-'}</td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-stone-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                      No pickup requests yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
            <h3 className="font-bold text-stone-800">Recent Deliveries</h3>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">{pickups.length} completed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500">
                  {['Delivery Date', 'Weight', 'Recorded Rate', 'Receipt No.', 'Receipt Status'].map(header => (
                    <th key={header} className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {pickups.map(p => (
                  <tr key={p.deliveryId} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="px-5 py-4 text-stone-600 whitespace-nowrap">{formatDate(p.deliveryDate)}</td>
                    <td className="px-5 py-4 font-bold text-stone-800 whitespace-nowrap">{Number(p.weightKg || 0).toLocaleString()} kg</td>
                    <td className="px-5 py-4 text-stone-600 whitespace-nowrap">RWF {Number(p.pricePerKg || 0).toLocaleString()}/kg</td>
                    <td className="px-5 py-4 font-semibold text-stone-700 whitespace-nowrap">{p.receiptNo || '-'}</td>
                    <td className="px-5 py-4"><StatusBadge status={p.status || 'Recorded'} /></td>
                  </tr>
                ))}
                {pickups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-stone-400">No delivery history found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1C3829] px-6 py-6 text-white relative">
              <h3 className="text-xl font-bold">Request a Pickup</h3>
              <p className="text-green-200/80 text-xs mt-1">An aggregator will be notified to schedule your pickup.</p>
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Estimated Weight (kg)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="100"
                    step="1"
                    value={formData.weightEstimate}
                    onChange={e => setFormData({ ...formData, weightEstimate: e.target.value })}
                    className="w-full pl-4 pr-12 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-semibold"
                    placeholder="e.g. 100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">KG</span>
                </div>
                <p className={`mt-2 text-xs font-semibold ${formData.weightEstimate && !isPickupWeightValid ? 'text-amber-700' : 'text-stone-400'}`}>
                  Minimum pickup request is 100 kg of coffee cherry.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={formData.requestedDate}
                  onChange={e => setFormData({ ...formData, requestedDate: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Coffee Variety</label>
                <select
                  required
                  value={formData.coffeeVariety || coffeeVarietyOptions[0] || ''}
                  onChange={e => setFormData({ ...formData, coffeeVariety: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-semibold"
                >
                  {coffeeVarietyOptions.map(variety => <option key={variety} value={variety}>{variety}</option>)}
                </select>
                <p className="mt-2 text-xs text-stone-400">
                  {supplierType === 'COOPERATIVE'
                    ? 'Choose from the varieties recorded on your member farms.'
                    : 'Choose the variety for this pickup request.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all min-h-[100px] resize-none"
                  placeholder="e.g. Near the main gate..."
                />
              </div>

              <div className={`rounded-xl border p-3 text-xs ${profile?.coordinates ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                <p className="font-bold">Farm route coordinates</p>
                <p className="mt-1">{profile?.coordinates || 'No farm coordinates captured yet. Update Farm Details before requesting pickup.'}</p>
                {profile?.gpsLocation && <p className="mt-1 text-stone-500">{profile.gpsLocation}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !profile?.coordinates || !isPickupWeightValid || !isAssignedToAggregator}
                  className="flex-[2] px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Submit Request</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentReceipts() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getFarmerPaymentReceipts()
      .then(res => setReceipts(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const uploadedReceipts = receipts.filter(receipt => receipt.receiptUrl);
  const isPhotoReceipt = (receipt: any) => String(receipt.receiptUrl || '').startsWith('data:image/');
  const downloadUploadedReceipt = (receipt: any) => {
    if (!receipt.receiptUrl) return;
    const link = document.createElement('a');
    link.href = receipt.receiptUrl;
    link.download = receipt.receiptFileName || `${receipt.receiptNo}.${isPhotoReceipt(receipt) ? 'jpg' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const openReceipt = (receipt: any) => {
    if (!receipt.receiptUrl) return;
    const win = window.open();
    if (win) {
      win.document.write(isPhotoReceipt(receipt)
        ? `<img src="${receipt.receiptUrl}" style="max-width:100%;height:auto" alt="Payment receipt" />`
        : `<iframe src="${receipt.receiptUrl}" style="border:0;width:100%;height:100vh"></iframe>`);
      win.document.close();
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Payment Receipt History</h2>
        <p className="text-sm text-stone-500 mt-0.5">Receipts uploaded by the aggregator after pickup completion.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <KPICard label="Pickup Requests" value={receipts.length} sub="All submitted requests" icon={CalendarClock} color="bg-emerald-600" />
        <KPICard label="Uploaded Receipts" value={uploadedReceipts.length} sub="Proof files available" icon={FileText} color="bg-violet-600" />
        <KPICard label="Pending Receipts" value={receipts.length - uploadedReceipts.length} sub="Waiting for aggregator upload" icon={Clock} color="bg-amber-600" />
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Uploaded Payment Receipts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Receipt', 'Pickup Date', 'Weight', 'Farm Location', 'File', 'Status', 'Download'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {receipts.map(receipt => (
                <tr key={receipt.requestId} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">{receipt.receiptNo}</td>
                  <td className="px-4 py-3 text-stone-600">{new Date(receipt.pickupDate || receipt.requestedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-stone-600">{receipt.weightKg} kg</td>
                  <td className="px-4 py-3 text-stone-600">{receipt.farmLocation || 'Farm profile location'}</td>
                  <td className="px-4 py-3 text-stone-500">
                    <div className="flex items-center gap-2">
                      {isPhotoReceipt(receipt) && <img src={receipt.receiptUrl} alt="Receipt" className="h-9 w-9 rounded-md border border-stone-200 object-cover" />}
                      <span>{receipt.receiptFileName || 'Not uploaded yet'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={receipt.receiptUrl ? 'completed' : receipt.status || 'pending'} /></td>
                  <td className="px-4 py-3">
                    {receipt.receiptUrl ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openReceipt(receipt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadUploadedReceipt(receipt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-stone-400">Waiting upload</span>
                    )}
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-stone-400">No pickup requests or payment receipts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Payments() {
  const { user } = useAuth();
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPickups = async () => {
      try {
        const res = await apiService.getFarmerPickups();
        setPickups(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPickups();
  }, []);

  const totalPaid = pickups.filter(p => isPaidStatus(p.status)).reduce((s, p) => s + Number(p.totalAmount || Number(p.weightKg) * Number(p.pricePerKg)), 0);
  const totalPending = pickups.filter(p => isPendingStatus(p.status)).reduce((s, p) => s + Number(p.totalAmount || Number(p.weightKg) * Number(p.pricePerKg)), 0);
  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  const paidTransactions = pickups.filter(p => isPaidStatus(p.status));
  const lastPayment = paidTransactions.length > 0 ? paidTransactions[0] : null;
  const lastPaymentAmount = lastPayment ? (Number(lastPayment.weightKg) * Number(lastPayment.pricePerKg)).toLocaleString() : '0';
  const lastPaymentDate = lastPayment ? new Date(lastPayment.deliveryDate).toLocaleDateString() : '—';

  const downloadReceipt = (payment: any) => {
    if (!isPaidStatus(payment.status)) {
      return;
    }
    const receiptNo = payment.receiptNo || `RCT-${String(payment.deliveryId).slice(0, 8).toUpperCase()}`;
    const amount = Number(payment.totalAmount || Number(payment.weightKg) * Number(payment.pricePerKg));
    const deliveryDate = payment.deliveryDate ? new Date(payment.deliveryDate).toLocaleDateString() : 'N/A';
    const blob = createReceiptPdf([
      `Receipt No: ${receiptNo}`,
      `Farmer: ${user?.name || 'Farmer'}`,
      `Delivery Date: ${deliveryDate}`,
      `Weight: ${payment.weightKg || 0} kg`,
      `Price per kg: RWF ${Number(payment.pricePerKg || 0).toLocaleString()}`,
      `Payment Method: ${payment.paymentMethod || 'Mobile Money'}`,
      `Reference: ${payment.paymentReference || 'Awaiting reference'}`,
      `Status: ${payment.status || 'pending'}`,
      `Total Amount: RWF ${amount.toLocaleString()}`,
      `Generated: ${new Date().toLocaleString()}`,
    ]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receiptNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Payment History</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-emerald-600 text-white rounded-xl p-5 shadow-sm">
          <p className="text-emerald-100 text-sm">Total Received</p>
          <p className="text-2xl font-bold mt-1">RWF {totalPaid.toLocaleString()}</p>
          <p className="text-emerald-200 text-xs mt-1">All time earnings</p>
        </div>
        <div className="bg-amber-500 text-white rounded-xl p-5 shadow-sm">
          <p className="text-amber-100 text-sm">Pending Payment</p>
          <p className="text-2xl font-bold mt-1">RWF {totalPending.toLocaleString()}</p>
          <p className="text-amber-200 text-xs mt-1">Awaiting aggregator</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
          <p className="text-stone-500 text-sm">Last Payment</p>
          <p className="text-xl font-bold mt-1 text-stone-800">RWF {lastPaymentAmount}</p>
          <p className="text-xs mt-1 text-emerald-600">Received {lastPaymentDate}</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Payment Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                {['Receipt', 'Date', 'Weight', 'Amount (RWF)', 'Method', 'Reference', 'Status', 'Download'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {pickups.map(p => {
                const paid = isPaidStatus(p.status);
                return (
                  <tr key={p.deliveryId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">{p.receiptNo || `RCT-${String(p.deliveryId).slice(0, 8).toUpperCase()}`}</td>
                    <td className="px-4 py-3 text-stone-600">{new Date(p.deliveryDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-stone-600">{p.weightKg} kg</td>
                    <td className="px-4 py-3 font-semibold text-stone-800">{Number(p.totalAmount || Number(p.weightKg) * Number(p.pricePerKg)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-stone-600">{p.paymentMethod || 'Mobile Money'}</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{p.paymentReference || 'Awaiting reference'}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status || 'pending'} /></td>
                    <td className="px-4 py-3">
                      {paid ? (
                        <button
                          type="button"
                          onClick={() => downloadReceipt(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Receipt
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-stone-400">Available after payment</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pickups.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-stone-400">No payment transactions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PriceTrends() {
  const [prices, setPrices] = useState<any>(defaultPriceTrendState);
  const [loading, setLoading] = useState(true);

  const loadPrices = useCallback(() => {
    setLoading(true);
    apiService.getFarmerPriceTrends()
      .then((response) => setPrices(response.data))
      .catch(() => setPrices(defaultPriceTrendState))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  const grades = prices?.grades?.length ? prices.grades : defaultPriceGrades;
  const baselineRate = Number(prices?.baselineRatePerKg ?? defaultPriceTrendState.baselineRatePerKg);
  const baselineChange = prices?.baselineChange || defaultPriceTrendState.baselineChange;
  const a1 = grades.find((grade: any) => grade.key === 'a1') || grades[0];
  const incomeLift = a1?.pricePerKg && baselineRate
    ? (((Number(a1.pricePerKg) - baselineRate) / baselineRate) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Price Trends</h2>
        <div className="flex items-center gap-2">
          {prices?.updatedAt && <span className="text-xs text-stone-400">Updated {new Date(prices.updatedAt).toLocaleDateString()}</span>}
          <button onClick={loadPrices} disabled={loading} className="px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50 text-xs font-semibold text-emerald-700 disabled:opacity-60">
            Refresh
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-600">Baseline farmer rate</span>
            <span className={`text-xs font-medium ${String(baselineChange).startsWith('-') ? 'text-red-600' : 'text-emerald-600'} flex items-center gap-0.5`}>
              <TrendingUp className="w-3.5 h-3.5" /> {baselineChange}
            </span>
          </div>
          <p className="text-xl font-bold text-stone-800">RWF {baselineRate.toLocaleString()}/kg</p>
          <p className="text-xs text-stone-400 mt-1">Immediate intake payment rate</p>
        </div>
        {grades.map((g: any) => (
          <div key={g.grade} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-600">{g.grade}</span>
              <span className={`text-xs font-medium ${Number(g.changePercent || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'} flex items-center gap-0.5`}>
                <TrendingUp className="w-3.5 h-3.5" /> {g.change}
              </span>
            </div>
            <p className="text-xl font-bold text-stone-800">{g.price}</p>
            <p className="text-xs text-stone-400 mt-1">{loading ? 'Loading configured price...' : 'Export premium reference, not immediate payout'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Training() {
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Training Resources</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainingResources.map(r => (
          <div key={r.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:border-emerald-200 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${r.format === 'Video' ? 'bg-red-50 text-red-600' :
                  r.format === 'PDF' ? 'bg-blue-50 text-blue-600' :
                    'bg-purple-50 text-purple-600'
                }`}>
                {r.format}
              </span>
              <span className="text-xs text-stone-400">{r.duration}</span>
            </div>
            <h4 className="font-medium text-stone-800 text-sm mb-2 group-hover:text-emerald-700 transition-colors">{r.title}</h4>
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{r.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.level === 'Beginner' ? 'bg-emerald-50 text-emerald-600' :
                  r.level === 'Intermediate' ? 'bg-amber-50 text-amber-600' :
                    'bg-red-50 text-red-600'
                }`}>{r.level}</span>
            </div>
            <button className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mt-3 hover:gap-2.5 transition-all">
              {r.format === 'Video' ? <Play className="w-3.5 h-3.5" /> : r.format === 'PDF' ? <FileText className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
              {r.format === 'Video' ? 'Watch now' : r.format === 'PDF' ? 'Download PDF' : 'Join Webinar'}
            </button>
          </div>
        ))}
      </div>
      <div className="bg-emerald-900 text-white rounded-xl p-5">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-semibold">Upcoming: Fully Washed Processing Best Practices Webinar</p>
            <p className="text-green-200 text-sm mt-0.5">March 27, 2026 at 2:00 PM CAT • Hosted by NAEB (National Agricultural Export Board)</p>
          </div>
          <button className="ml-auto bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0 transition-colors">
            Register
          </button>
        </div>
      </div>
    </div>
  );
}

function Notifs() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.getNotifications().then(r => setNotifs(r.data)).catch(() => { }).finally(() => setLoading(false));
  }, []);
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Notifications</h2>
      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>
      ) : notifs.length === 0 ? (
        <p className="text-center text-stone-400 py-10 bg-white rounded-xl border border-stone-200">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {notifs.map(n => (
            <div key={n.notificationId} className={`bg-white rounded-xl border p-4 shadow-sm flex items-start gap-3 ${!n.read ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100' : n.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                }`}>
                {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                  n.type === 'warning' ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
                    <Bell className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-800">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                </div>
                <p className="text-sm text-stone-600 mt-0.5">{n.message}</p>
                <p className="text-xs text-stone-400 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sustainability() {
  const farmerData = sustainabilityData.farmer.find(f => f.farmerId === 'F001') || sustainabilityData.farmer[0];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Sustainability Tracking</h2>
          <p className="text-sm text-stone-500 mt-0.5">Environmental impact metrics for your farm</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
          <Sprout className="w-4 h-4" />
          <span className="font-medium">{farmerData.month}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Droplets className="w-8 h-8 opacity-80" />
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">{farmerData.waterUsage}</span>
            </div>
          </div>
          <p className="text-sm opacity-90">Water Usage</p>
          <p className="text-xs opacity-75 mt-1">Liters per kg cherry</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <TreeDeciduous className="w-8 h-8 opacity-80" />
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">{farmerData.carbonFootprint}</span>
            </div>
          </div>
          <p className="text-sm opacity-90">Carbon Footprint</p>
          <p className="text-xs opacity-75 mt-1">Tons CO₂ equivalent</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Recycle className="w-8 h-8 opacity-80" />
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">{farmerData.organicWaste}</span>
            </div>
          </div>
          <p className="text-sm opacity-90">Organic Waste</p>
          <p className="text-xs opacity-75 mt-1">Kg composted this month</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 opacity-80" />
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">{farmerData.renewableEnergy}%</span>
            </div>
          </div>
          <p className="text-sm opacity-90">Renewable Energy</p>
          <p className="text-xs opacity-75 mt-1">Solar panel contribution</p>
        </div>
      </div>

      {/* Environmental Practices */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Environmental Practices</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <TreeDeciduous className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">Agroforestry System</p>
                  <p className="text-xs text-stone-500">Shade-grown coffee with native trees</p>
                </div>
              </div>
              {farmerData.agroforestry && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <Leaf className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">Organic Farming</p>
                  <p className="text-xs text-stone-500">{farmerData.chemicalUse === 0 ? 'Zero chemical pesticides' : `${farmerData.chemicalUse} kg chemicals used`}</p>
                </div>
              </div>
              {farmerData.chemicalUse === 0 && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Droplets className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800">Water Conservation</p>
                  <p className="text-xs text-stone-500">Drip irrigation & rainwater harvesting</p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Sustainability Impact</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600">Carbon Offset (Trees)</span>
                <span className="text-sm font-semibold text-emerald-600">92% below average</span>
              </div>
              <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600">Water Efficiency</span>
                <span className="text-sm font-semibold text-blue-600">85% efficient</span>
              </div>
              <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600">Waste Recycling</span>
                <span className="text-sm font-semibold text-amber-600">100% composted</span>
              </div>
              <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-stone-600">Renewable Energy</span>
                <span className="text-sm font-semibold text-purple-600">{farmerData.renewableEnergy}% solar</span>
              </div>
              <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${farmerData.renewableEnergy}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certification Impact */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Award className="w-10 h-10 flex-shrink-0 opacity-90" />
          <div>
            <h3 className="font-semibold text-lg">Sustainability Certifications</h3>
            <p className="text-emerald-100 text-sm mt-1">
              Your sustainable practices qualify you for Organic and Rainforest Alliance certifications,
              increasing market value by up to 18% and enabling access to premium buyers.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium">🌿 Organic Certified</span>
              <span className="px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium">🌳 Rainforest Alliance</span>
              <span className="px-3 py-1.5 bg-white/10 border border-white/30 rounded-lg text-sm font-medium">🌍 UTZ Eligible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDefects = (defects: any) => {
  if (!defects || (typeof defects === 'object' && Object.keys(defects).length === 0)) return [];
  if (Array.isArray(defects)) {
    return defects.map((item, index) => ({
      label: item?.type || item?.name || `Defect ${index + 1}`,
      value: item?.count ?? item?.value ?? item?.severity ?? 'Recorded',
    }));
  }
  if (typeof defects === 'object') {
    return Object.entries(defects).map(([label, value]) => ({ label, value: String(value) }));
  }
  return [{ label: 'Defects', value: String(defects) }];
};

function Traceability() {
  const [traceabilityData, setTraceabilityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [traceabilitySearch, setTraceabilitySearch] = useState('');
  const [traceabilitySort, setTraceabilitySort] = useState('newest');

  useEffect(() => {
    apiService.getFarmerTraceability()
      .then(r => {
        setTraceabilityData(r.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getBatchDate = (batch: any) => (
    batch.deliveries?.[0]?.deliveryDate ||
    batch.qualityFeedback?.assessedAt ||
    batch.journey?.[0]?.date ||
    ''
  );
  const getBatchTimestamp = (batch: any) => {
    const timestamp = new Date(getBatchDate(batch)).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };
  const getQualityScore = (batch: any) => Number(batch.qualityFeedback?.cuppingScore || 0);
  const getBatchWeight = (batch: any) => Number(batch.farmerDeliveryKg || batch.weightCherry || 0);
  const normalizedTraceabilitySearch = traceabilitySearch.trim().toLowerCase();
  const filteredTraceabilityData = traceabilityData.filter((batch) => {
    if (!normalizedTraceabilitySearch) return true;

    const searchableFields = [
      batch.batchId,
      batch.batchName,
      batch.status,
      batch.washingStation,
      batch.qualityFeedback?.cuppingScore,
      batch.qualityFeedback?.notes,
      ...(batch.deliveries || []).flatMap((delivery: any) => [delivery.deliveryId, delivery.buyer, delivery.pricePerKg]),
      ...(batch.checkpointHistory || []).flatMap((log: any) => [log.checkpointType, log.status, log.actor]),
      ...(batch.transportHistory || []).flatMap((log: any) => [log.transportMethod, log.status, log.transporterName]),
      ...(batch.shipments || []).flatMap((shipment: any) => [
        shipment.status,
        shipment.containerNo,
        shipment.vesselName,
        shipment.roadTransport?.status,
        shipment.roadTransport?.truckPlate,
        ...(shipment.roadTransport?.checkpoints || []).flatMap((checkpoint: any) => [checkpoint.checkpointName, checkpoint.eventType]),
      ]),
    ];

    return searchableFields
      .filter((field) => field !== undefined && field !== null)
      .join(' ')
      .toLowerCase()
      .includes(normalizedTraceabilitySearch);
  });
  const sortedTraceabilityData = [...filteredTraceabilityData].sort((a, b) => {
    switch (traceabilitySort) {
      case 'oldest':
        return getBatchTimestamp(a) - getBatchTimestamp(b);
      case 'status':
        return String(a.status || '').localeCompare(String(b.status || ''));
      case 'weight_desc':
        return getBatchWeight(b) - getBatchWeight(a);
      case 'weight_asc':
        return getBatchWeight(a) - getBatchWeight(b);
      case 'quality_desc':
        return getQualityScore(b) - getQualityScore(a);
      case 'quality_asc':
        return getQualityScore(a) - getQualityScore(b);
      case 'washing_station':
        return String(a.washingStation || '').localeCompare(String(b.washingStation || ''));
      case 'newest':
      default:
        return getBatchTimestamp(b) - getBatchTimestamp(a);
    }
  });
  const selectedJourney =
    traceabilityData.find(j => j.batchId === selectedBatchId);
  const qualityFeedback = selectedJourney?.qualityFeedback;
  const defects = formatDefects(qualityFeedback?.defects);
  const renderJourneyDropdown = (batch: any) => {
    const feedback = batch.qualityFeedback;
    const batchDefects = formatDefects(feedback?.defects);
    return (
      <div className="bg-emerald-50/60 border-t border-emerald-100 p-5 space-y-5">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Batch Status', value: batch.status || 'Pending', icon: Package },
            { label: 'Batch Weight', value: `${getBatchWeight(batch)} kg`, icon: Coffee },
            { label: 'Checkpoints', value: batch.checkpointHistory?.length || 0, icon: QrCode },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-stone-500 mb-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">{item.label}</span>
                </div>
                <p className="text-lg font-bold text-stone-800">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-stone-800">Quality Feedback</h3>
                <p className="text-xs text-stone-500 mt-0.5">Cupping, moisture, defects, and improvement notes</p>
              </div>
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            {feedback ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <p className="text-xs text-emerald-700 font-medium">Cupping Score</p>
                    <p className="text-2xl font-bold text-emerald-800 mt-1">{feedback.cuppingScore?.toFixed?.(1) || feedback.cuppingScore}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs text-blue-700 font-medium">Moisture</p>
                    <p className="text-2xl font-bold text-blue-800 mt-1">{feedback.moisture?.toFixed?.(1) || feedback.moisture}%</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                    <p className="text-xs text-amber-700 font-medium">Assessor</p>
                    <p className="text-sm font-semibold text-amber-900 mt-2">{feedback.assessor || 'Quality team'}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-stone-50 border border-stone-100 p-3">
                  <p className="text-xs text-stone-500 font-medium mb-2">Defects</p>
                  {batchDefects.length === 0 ? (
                    <p className="text-sm text-stone-600">No defects recorded.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {batchDefects.map((defect) => (
                        <div key={defect.label} className="flex items-center justify-between text-xs bg-white rounded-lg border border-stone-100 px-3 py-2">
                          <span className="text-stone-700">{defect.label}</span>
                          <span className="font-semibold text-stone-900">{defect.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-stone-700 bg-stone-50 border border-stone-100 rounded-xl p-3">{feedback.notes || 'No additional improvement notes were provided.'}</p>
              </div>
            ) : (
              <p className="rounded-xl bg-stone-50 border border-stone-100 p-4 text-sm text-stone-500">Quality feedback has not been submitted for this batch yet.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">Supply Chain Journey</h3>
            <div className="space-y-3">
              {(batch.journey || []).map((stage: any, idx: number) => (
                <div key={`${stage.stage}-${idx}`} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{stage.stage}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{formatDateTime(stage.date)}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Verified</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {stage.location}</p>
                  {stage.actors?.length ? <p className="text-xs text-stone-500 mt-1">Actors: <span className="text-stone-700 font-medium">{stage.actors.join(', ')}</span></p> : null}
                  {stage.notes && <p className="text-xs text-stone-500 mt-1">Notes: <span className="text-stone-700">{stage.notes}</span></p>}
                </div>
              ))}
              {(!batch.journey || batch.journey.length === 0) && <p className="text-sm text-stone-500">No journey stages have been recorded yet.</p>}
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">QR Checkpoint History</h3>
            {batch.checkpointHistory?.length ? (
              <div className="space-y-3">
                {batch.checkpointHistory.map((log: any) => (
                  <div key={log.logId} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-800">{log.checkpointType}</p>
                      <span className="text-xs text-stone-500">{formatDateTime(log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">{log.locationName}</p>
                    <p className="text-xs text-stone-500 mt-1">Scanned by {log.scannedBy}</p>
                    {log.notes && <p className="text-xs text-stone-500 mt-1">{log.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No QR checkpoints have been recorded yet.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">Transport & Shipment Status</h3>
            <div className="space-y-3">
              {batch.transportHistory?.length ? batch.transportHistory.map((log: any) => (
                <div key={log.logId} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                  <p className="text-sm font-semibold text-stone-800">{log.transportMethod}</p>
                  <p className="text-xs text-stone-500 mt-1">Departed {formatDateTime(log.departureTime)}</p>
                  <p className="text-xs text-stone-500">Arrived {formatDateTime(log.arrivalTime)}</p>
                  <p className="text-xs text-stone-600 mt-1">Condition: {log.condition}</p>
                </div>
              )) : <p className="text-sm text-stone-500">No transport records have been recorded yet.</p>}

              {batch.shipments?.map((shipment: any) => (
                <div key={shipment.shipmentId} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-blue-900">{shipment.status}</p>
                    <Ship className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-blue-700 mt-1">{shipment.portLoading} to {shipment.portDestination}</p>
                  <p className="text-xs text-blue-700">Container {shipment.containerNo}</p>
                  <p className="text-xs text-blue-600 mt-1">Updated {formatDateTime(shipment.shippedAt)}</p>
                  {shipment.roadTransport && (
                    <div className="mt-3 rounded-md border border-blue-100 bg-white/80 p-2.5">
                      <p className="text-xs font-semibold text-blue-900">Road transport: {shipment.roadTransport.status}</p>
                      <p className="text-xs text-blue-700 mt-1">{shipment.roadTransport.originLocation} to {shipment.roadTransport.destinationPort}</p>
                      <p className="text-xs text-blue-700">Truck {shipment.roadTransport.truckPlate} - {shipment.roadTransport.driverName || shipment.roadTransport.truckCompany?.companyName || 'truck company assigned'}</p>
                      <p className="text-xs text-blue-600 mt-1">{shipment.roadTransport.checkpoints?.length || 0} corridor checkpoints recorded</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" /></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Coffee Traceability Journey</h2>
          <p className="text-sm text-stone-500 mt-0.5">Read-only batch record from delivery through quality and shipment</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
          <Link2 className="w-4 h-4" />
          <span className="font-medium">Read-only verified record</span>
        </div>
      </div>

      {/* Batch Selection */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-stone-800">Your Traceable Batches</h3>
            <p className="text-xs text-stone-500 mt-0.5">Click a batch to open its supply chain journey</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="search"
                value={traceabilitySearch}
                onChange={(event) => setTraceabilitySearch(event.target.value)}
                placeholder="Search batch, status, station, quality"
                className="w-full sm:w-72 pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={traceabilitySort}
              onChange={(event) => setTraceabilitySort(event.target.value)}
              className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">Newest delivery</option>
              <option value="oldest">Oldest delivery</option>
              <option value="status">Status A-Z</option>
              <option value="weight_desc">Weight high-low</option>
              <option value="weight_asc">Weight low-high</option>
              <option value="quality_desc">Quality high-low</option>
              <option value="quality_asc">Quality low-high</option>
              <option value="washing_station">Washing station</option>
            </select>
            <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-2 rounded-lg font-medium whitespace-nowrap">
              {sortedTraceabilityData.length} of {traceabilityData.length}
            </span>
          </div>
        </div>
        {traceabilityData.length === 0 ? (
          <div className="text-center py-6 text-stone-500">Your coffee hasn't been assigned to any traceable batches yet.</div>
        ) : sortedTraceabilityData.length === 0 ? (
          <div className="text-center py-6 text-stone-500">No batches match this search.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-100">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Batch</th>
                  <th className="px-4 py-3 text-left font-semibold">Delivery Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Washing Station</th>
                  <th className="px-4 py-3 text-left font-semibold">Weight</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Quality</th>
                  <th className="px-4 py-3 text-left font-semibold">Checkpoints</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sortedTraceabilityData.map((batch) => {
                  const expanded = selectedBatchId === batch.batchId;
                  return (
                    <Fragment key={batch.batchId}>
                      <tr
                        className={`transition-colors ${expanded
                            ? 'bg-emerald-50'
                            : 'bg-white hover:bg-stone-50'
                          }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className={`w-4 h-4 ${expanded ? 'text-emerald-600' : 'text-stone-400'}`} />
                            <div>
                              <p className="font-semibold text-stone-800">{batch.batchName || batch.batchId}</p>
                              <p className="text-xs text-stone-500">{batch.batchId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{formatDateTime(getBatchDate(batch))}</td>
                        <td className="px-4 py-3 text-stone-600">{batch.washingStation || 'Pending assignment'}</td>
                        <td className="px-4 py-3 font-medium text-stone-700">{getBatchWeight(batch)} kg</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            {batch.status || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {batch.qualityFeedback ? `${getQualityScore(batch).toFixed(1)} pts` : 'Awaiting QC'}
                        </td>
                        <td className="px-4 py-3 text-stone-600">{batch.checkpointHistory?.length || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedBatchId(current => current === batch.batchId ? null : batch.batchId);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                          >
                            {expanded ? 'Hide Journey' : 'View Journey'}
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            {renderJourneyDropdown(batch)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {false && selectedJourney && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase text-emerald-700">Selected batch</p>
            <p className="font-semibold text-emerald-900">{selectedJourney.batchName || selectedJourney.batchId}</p>
          </div>
          <span className="text-xs bg-white text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
            {selectedJourney.status || 'Pending'}
          </span>
        </div>
      )}

      {false && selectedJourney && (
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Batch Status', value: selectedJourney.status || 'Pending', icon: Package },
            { label: 'Batch Weight', value: `${selectedJourney.weightCherry || 0} kg`, icon: Coffee },
            { label: 'Checkpoints', value: selectedJourney.checkpointHistory?.length || 0, icon: QrCode },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-stone-500 mb-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">{item.label}</span>
                </div>
                <p className="text-lg font-bold text-stone-800">{item.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {false && selectedJourney && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-stone-800">Quality Feedback</h3>
              <p className="text-xs text-stone-500 mt-0.5">Cupping, moisture, defects, and improvement notes from quality control</p>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </div>

          {qualityFeedback ? (
            <div className="grid lg:grid-cols-3 gap-5">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs text-emerald-700 font-medium">Cupping Score</p>
                <p className="text-3xl font-bold text-emerald-800 mt-1">{qualityFeedback.cuppingScore?.toFixed?.(1) || qualityFeedback.cuppingScore}</p>
                <p className="text-xs text-emerald-600 mt-1">Assessed by {qualityFeedback.assessor}</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-xs text-blue-700 font-medium">Moisture</p>
                <p className="text-3xl font-bold text-blue-800 mt-1">{qualityFeedback.moisture?.toFixed?.(1) || qualityFeedback.moisture}%</p>
                <p className="text-xs text-blue-600 mt-1">{formatDateTime(qualityFeedback.assessedAt)}</p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs text-amber-700 font-medium">Defect Report</p>
                {defects.length === 0 ? (
                  <p className="text-sm font-semibold text-amber-800 mt-2">No defects recorded</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {defects.slice(0, 4).map((defect) => (
                      <div key={defect.label} className="flex items-center justify-between text-xs">
                        <span className="text-amber-800">{defect.label}</span>
                        <span className="font-semibold text-amber-900">{defect.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:col-span-3 rounded-xl bg-stone-50 border border-stone-100 p-4">
                <p className="text-xs text-stone-500 font-medium mb-1">Quality Notes</p>
                <p className="text-sm text-stone-700">{qualityFeedback.notes || 'No additional improvement notes were provided.'}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 text-sm text-stone-500">
              Quality feedback has not been submitted for this batch yet.
            </div>
          )}
        </div>
      )}

      {/* Journey Timeline */}
      {false && selectedJourney && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-5">Supply Chain Journey — Batch {selectedJourney.batchName}</h3>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-blue-500 to-violet-500" />

            {/* Journey Stages */}
            <div className="space-y-6">
              {selectedJourney.journey.map((stage: any, idx: number) => (
                <div key={idx} className="relative pl-14">
                  {/* Stage Icon */}
                  <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center ${idx === selectedJourney.journey.length - 1 ? 'bg-gradient-to-br from-violet-500 to-purple-600' :
                      idx >= selectedJourney.journey.length - 2 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                        'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    } shadow-lg`}>
                    {stage.stage === 'Farm' ? <Leaf className="w-5 h-5 text-white" /> :
                      stage.stage === 'Aggregation' ? <Package className="w-5 h-5 text-white" /> :
                        stage.stage === 'Processing' ? <Coffee className="w-5 h-5 text-white" /> :
                          stage.stage === 'Quality Control' ? <Award className="w-5 h-5 text-white" /> :
                            stage.stage === 'Export' ? <FileText className="w-5 h-5 text-white" /> :
                              stage.stage === 'Shipping' ? <Ship className="w-5 h-5 text-white" /> :
                                <CheckCircle2 className="w-5 h-5 text-white" />}
                  </div>

                  {/* Stage Content */}
                  <div className="bg-stone-50 rounded-lg p-4 border border-stone-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-stone-800">{stage.stage}</h4>
                        <p className="text-xs text-stone-500 mt-0.5">{formatDateTime(stage.date)}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                        ✓ Verified
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-600 mt-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{stage.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-600 mt-1">
                      <Link2 className="w-3.5 h-3.5" />
                      <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {stage.blockchainHash}
                      </code>
                    </div>

                    <div className="mt-2 pt-2 border-t border-stone-200">
                      <p className="text-xs text-stone-500">Actors: <span className="text-stone-700 font-medium">{stage.actors.join(', ')}</span></p>
                      {stage.notes && <p className="text-xs text-stone-500 mt-1">Notes: <span className="text-stone-700">{stage.notes}</span></p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {false && selectedJourney && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">QR Checkpoint History</h3>
            {selectedJourney.checkpointHistory?.length ? (
              <div className="space-y-3">
                {selectedJourney.checkpointHistory.map((log: any) => (
                  <div key={log.logId} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-800">{log.checkpointType}</p>
                      <span className="text-xs text-stone-500">{formatDateTime(log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">{log.locationName}</p>
                    <p className="text-xs text-stone-500 mt-1">Scanned by {log.scannedBy}</p>
                    {log.notes && <p className="text-xs text-stone-500 mt-1">{log.notes}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No QR checkpoints have been recorded yet.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">Transport & Shipment Status</h3>
            <div className="space-y-3">
              {selectedJourney.transportHistory?.length ? selectedJourney.transportHistory.map((log: any) => (
                <div key={log.logId} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                  <p className="text-sm font-semibold text-stone-800">{log.transportMethod}</p>
                  <p className="text-xs text-stone-500 mt-1">Departed {formatDateTime(log.departureTime)}</p>
                  <p className="text-xs text-stone-500">Arrived {formatDateTime(log.arrivalTime)}</p>
                  <p className="text-xs text-stone-600 mt-1">Condition: {log.condition}</p>
                </div>
              )) : <p className="text-sm text-stone-500">No transport records have been recorded yet.</p>}

              {selectedJourney.shipments?.map((shipment: any) => (
                <div key={shipment.shipmentId} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-blue-900">{shipment.status}</p>
                    <Ship className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-blue-700 mt-1">{shipment.portLoading} to {shipment.portDestination}</p>
                  <p className="text-xs text-blue-700">Container {shipment.containerNo} - {shipment.vesselName}</p>
                  <p className="text-xs text-blue-600 mt-1">Shipped {formatDateTime(shipment.shippedAt)}</p>
                  {shipment.roadTransport && (
                    <div className="mt-3 rounded-md border border-blue-100 bg-white/80 p-2.5">
                      <p className="text-xs font-semibold text-blue-900">Road transport: {shipment.roadTransport.status}</p>
                      <p className="text-xs text-blue-700 mt-1">
                        {shipment.roadTransport.originLocation} to {shipment.roadTransport.destinationPort}
                      </p>
                      <p className="text-xs text-blue-700">
                        Truck {shipment.roadTransport.truckPlate} - {shipment.roadTransport.driverName || shipment.roadTransport.truckCompany?.companyName || 'truck company assigned'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {shipment.roadTransport.checkpoints?.length || 0} corridor checkpoints recorded
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Consumer Transparency */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Read-Only Farm-to-Cup Record</h3>
            <p className="text-blue-100 text-sm mt-1">
              Farmers can view the full traceability history, quality feedback, checkpoint scans, and shipment status here. Batch creation, QR scans, quality scores, and shipment updates remain controlled by authorized supply-chain roles so the record stays audit-ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== NEW MODULES ====================

function InputRequests() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [formData, setFormData] = useState({ requestType: 'Tools', description: '', quantity: '', preferredDate: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await apiService.getFarmerServiceRequests();
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createFarmerServiceRequest(formData);
      toast.success('Service request submitted successfully!');
      setShowNewRequest(false);
      setFormData({ requestType: 'Tools', description: '', quantity: '', preferredDate: '' });
      fetchTickets();
    } catch (err) {
      toast.error('Failed to submit request');
    }
  };

  const requestTypes = [
    { value: 'Fertilizer', label: 'Fertilizer', icon: '🌱', description: 'Organic & chemical fertilizers' },
    { value: 'Pesticide', label: 'Pesticide', icon: '🐛', description: 'Pest & disease control' },
    { value: 'Tools', label: 'Farm Tools', icon: '🔧', description: 'Pruning tools, equipment' },
    { value: 'Training', label: 'Training', icon: '📚', description: 'Workshops & courses' },
    { value: 'Certification', label: 'Certification', icon: '📜', description: 'Organic, Fairtrade, etc.' },
    { value: 'Finance', label: 'Financial Support', icon: '💰', description: 'Loans & credit access' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Support Tickets & Requests</h2>
          <p className="text-sm text-stone-500 mt-0.5">Request inputs, services, and support from cooperative</p>
        </div>
        <button
          onClick={() => setShowNewRequest(!showNewRequest)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {showNewRequest && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border-2 border-emerald-200 p-5">
          <h3 className="font-semibold text-stone-800 mb-4">Submit Input / Service Request</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Request Type</label>
              <select value={formData.requestType} onChange={e => setFormData({ ...formData, requestType: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                {requestTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Quantity / service size" />
              <input type="date" value={formData.preferredDate} onChange={e => setFormData({ ...formData, preferredDate: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
              <textarea required rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border rounded-lg" placeholder="Details..." />
            </div>
            <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700">Submit Request</button>
          </div>
        </form>
      )}

      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Tickets', value: tickets.length, color: 'bg-blue-100 text-blue-700' },
          { label: 'Open / Pending', value: tickets.filter(r => r.status === 'Open').length, color: 'bg-amber-100 text-amber-700' },
          { label: 'Resolved', value: tickets.filter(r => r.status === 'Resolved').length, color: 'bg-emerald-100 text-emerald-700' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs mt-0.5 opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-medium">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Request Type</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Quantity</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tickets.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-stone-500">No input or service requests found</td></tr>
            ) : tickets.map((req: any) => (
              <tr key={req.request_id || req.requestId} className="hover:bg-stone-50">
                <td className="px-5 py-3 font-mono text-xs text-stone-500">#{String(req.request_id || req.requestId).substring(0, 8).toUpperCase()}</td>
                <td className="px-5 py-3 text-stone-800 font-medium">{req.request_type || req.requestType}</td>
                <td className="px-5 py-3 text-stone-600">{req.description}</td>
                <td className="px-5 py-3 text-stone-600">{req.quantity || '-'}</td>
                <td className="px-5 py-3 text-stone-500">{new Date(req.created_at || req.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'Open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Community() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [topics, setTopics] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ groupId: 'General Discussion', content: '' });
  const [replyForms, setReplyForms] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiService.getCommunityTopics().then(r => setTopics(r.data)).catch(console.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiService.createCommunityPost(form);
      toast.success('Community topic posted');
      setForm({ groupId: 'General Discussion', content: '' });
      setShowForm(false);
      load();
    } catch {
      toast.error('Failed to post community topic');
    }
  };

  const submitReply = async (event: React.FormEvent, postId: string) => {
    event.preventDefault();
    const content = (replyForms[postId] || '').trim();
    if (!content) return;
    try {
      await apiService.createCommunityReply(postId, { content });
      setReplyForms(prev => ({ ...prev, [postId]: '' }));
      toast.success('Reply posted');
      load();
    } catch {
      toast.error('Failed to post reply');
    }
  };

  const toggleLike = async (postId: string) => {
    try {
      await apiService.toggleCommunityLike(postId);
      load();
    } catch {
      toast.error('Failed to update like');
    }
  };

  const categories = ['all', 'Farming Techniques', 'Pest Control', 'Market Prices', 'General Discussion'];

  const filteredTopics = activeFilter === 'all' ? topics : topics.filter(t => t.category === activeFilter);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Community Discussion</h2>
          <p className="text-sm text-stone-500 mt-0.5">Connect with fellow farmers, ask questions, share experiences</p>
        </div>
        <button
          onClick={() => setShowForm(prev => !prev)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Topic
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitPost} className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm space-y-3">
          <div className="grid sm:grid-cols-[220px_1fr] gap-3">
            <select value={form.groupId} onChange={e => setForm(prev => ({ ...prev, groupId: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
              {categories.filter(c => c !== 'all').map(cat => <option key={cat}>{cat}</option>)}
            </select>
            <input value={form.content} onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))} required placeholder="Ask a question or share field experience..." className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
          </div>
          <button className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-semibold">Post Topic</button>
        </form>
      )}

      {/* Categories Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1.5 text-sm rounded-full transition-all ${activeFilter === cat
                ? 'bg-emerald-600 text-white'
                : 'border border-stone-200 text-stone-600 hover:bg-emerald-50 hover:border-emerald-300'
              }`}
          >
            {cat === 'all' ? 'All Topics' : cat}
          </button>
        ))}
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {filteredTopics.length === 0 ? <p className="text-center py-6 text-stone-500">No topics found</p> : filteredTopics.map(topic => (
          <div
            key={topic.id}
            className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-stone-800 mb-1 hover:text-emerald-700 transition-colors">{topic.title}</h3>
                <p className="text-sm text-stone-600 line-clamp-2">{topic.excerpt}</p>
              </div>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium whitespace-nowrap ml-3">
                {topic.category}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-500 mt-3 pt-3 border-t border-stone-100">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                {topic.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <span className="font-medium text-stone-700">{topic.author}</span>
              <span>•</span>
              <MessageSquare className="w-3 h-3" />
              <span>{topic.replies} replies</span>
              <button onClick={() => toggleLike(topic.id)} className="font-semibold text-emerald-700 hover:text-emerald-800">
                {topic.likes || 0} likes
              </button>
              <span>•</span>
              <Eye className="w-3 h-3" />
              <span>{topic.views} views</span>
              <span>•</span>
              <span>{topic.lastActivity}</span>
            </div>
            {topic.replyItems?.length > 0 && (
              <div className="mt-3 space-y-2">
                {topic.replyItems.slice(0, 3).map((reply: any) => (
                  <div key={reply.replyId} className="rounded-lg bg-stone-50 border border-stone-100 px-3 py-2">
                    <p className="text-xs font-semibold text-stone-700">{reply.author || 'Community member'}</p>
                    <p className="text-sm text-stone-600 mt-0.5">{reply.content}</p>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={(event) => submitReply(event, topic.id)} className="mt-3 flex gap-2">
              <input
                value={replyForms[topic.id] || ''}
                onChange={e => setReplyForms(prev => ({ ...prev, [topic.id]: e.target.value }))}
                placeholder="Write a reply..."
                className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50"
              />
              <button className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold">Reply</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

function Knowledge() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    apiService.getKnowledgeArticles().then(r => setArticles(r.data)).catch(console.error);
  }, []);

  const categories = ['all', ...Array.from(new Set(articles.map(a => a.category)))];

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-5">
      <PriceTrends />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Knowledge Sharing</h2>
          <p className="text-sm text-stone-500 mt-0.5">Learn from farmer success stories and best practices</p>
        </div>
        <button
          onClick={() => toast.success('Opening article submission form...')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Share Knowledge
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
          ))}
        </select>
      </div>

      {/* Articles Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredArticles.map(article => (
          <div
            key={article.id}
            className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => toast.info('Opening full article...')}
          >
            <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs rounded-full font-medium inline-block mb-3">
              {article.category}
            </span>
            <h3 className="font-semibold text-stone-800 mb-2 hover:text-emerald-700 transition-colors">{article.title}</h3>
            <p className="text-sm text-stone-600 mb-3 line-clamp-2">{article.excerpt}</p>

            {/* Author Info */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-stone-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                {article.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-stone-700 text-sm">{article.author}</p>
                <p className="text-xs text-stone-500">{article.farm}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-xs text-stone-500">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{article.views} views</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                <span>{article.helpful} helpful</span>
              </div>
              <span>•</span>
              <span>{new Date(article.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {article.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Weather() {
  const { current, forecast, alerts } = weatherData;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Weather Forecast</h2>
        <p className="text-sm text-stone-500 mt-0.5">Plan your farming activities with accurate weather data</p>
      </div>

      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`rounded-xl border-2 p-4 ${alert.severity === 'warning' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'warning' ? 'text-red-600' : 'text-amber-600'
                  }`} />
                <div>
                  <p className={`font-semibold ${alert.severity === 'warning' ? 'text-red-800' : 'text-amber-800'
                    }`}>{alert.title}</p>
                  <p className={`text-sm mt-1 ${alert.severity === 'warning' ? 'text-red-700' : 'text-amber-700'
                    }`}>{alert.message}</p>
                  <p className="text-xs text-stone-500 mt-2">Valid until: {new Date(alert.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Weather */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm mb-1">Current Weather</p>
            <h3 className="text-2xl font-bold">{current.location}</h3>
            <p className="text-blue-100 text-sm mt-1">Last updated: {current.lastUpdated}</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold">{current.temperature}°C</p>
            <p className="text-blue-100 mt-1">{current.condition}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-blue-500">
          {[
            { label: 'Humidity', value: `${current.humidity}%`, icon: Droplets },
            { label: 'Wind', value: `${current.windSpeed} km/h`, icon: Wind },
            { label: 'Rainfall', value: `${current.rainfall} mm`, icon: CloudRain },
            { label: 'UV Index', value: current.uvIndex, icon: Zap },
          ].map(stat => (
            <div key={stat.label}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-4 h-4 text-blue-200" />
                <p className="text-xs text-blue-200">{stat.label}</p>
              </div>
              <p className="font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <h3 className="font-semibold text-stone-800 mb-4">7-Day Forecast</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {forecast.map(day => (
            <div key={day.date} className="bg-stone-50 rounded-lg p-3 text-center">
              <p className="text-xs font-medium text-stone-600 mb-2">{day.day}</p>
              <p className="text-3xl mb-2">{day.icon}</p>
              <p className="text-sm font-semibold text-stone-800">{day.high}° / {day.low}°</p>
              <p className="text-xs text-stone-500 mt-1">{day.condition}</p>
              {day.rainfall > 0 && (
                <p className="text-xs text-blue-600 mt-1 flex items-center justify-center gap-1">
                  <CloudRain className="w-3 h-3" />
                  {day.rainfall}mm
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Farming Recommendations */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-5">
        <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          Farming Recommendations
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-stone-700"><span className="font-medium">Good conditions for cherry picking</span> - Low humidity and no rain expected today</p>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-stone-700"><span className="font-medium">Delay picking on Thu-Fri</span> - Heavy rainfall expected, wait for drying</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-stone-700"><span className="font-medium">Ideal for drying this weekend</span> - Sunny conditions with low humidity</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const SECTIONS: Record<string, React.ComponentType> = {
  overview: Overview,
  profile: FarmProfile,
  'washing-station': WashingStationConnection,
  pickups: Pickups,
  payments: PaymentReceipts,
  traceability: Traceability,
  notifications: Notifs,
  requests: InputRequests,
  community: Community,
  reports: RoleReports,
  weather: Weather,
};

export default function FarmerDashboard() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const Component = SECTIONS[section] || Overview;
  return <Component />;
}
