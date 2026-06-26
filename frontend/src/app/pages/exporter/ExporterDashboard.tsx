import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { RoleReports } from '../../components/RoleReports';
import {
  ShoppingCart, FileText, Truck, CheckCircle2, Clock, AlertCircle,
  ArrowUpRight, Plus, Download, Package, Globe, DollarSign, QrCode, Link2,
  Loader2, RefreshCw, MapPin, XCircle, Sprout
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const Spin = () => <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-rose-600" /></div>;
const Empty = ({ msg }: { msg: string }) => <div className="py-12 text-center text-stone-400 text-sm">{msg}</div>;
const AUTHORIZED_ORDER_STATUSES = ['Ready for Shipment', 'Logistics Authorized', 'Shipment Created', 'Shipped', 'Delivered'];
const isAuthorizedOrder = (order: any) => AUTHORIZED_ORDER_STATUSES.includes(String(order?.status || ''));
const requestTypeFor = (order: any) => order?.qualitySpecs?.requestType === 'SAMPLE' || String(order?.status || '').toLowerCase().includes('sample') ? 'Sample' : 'Order';
const allocationRowsFor = (order: any) => {
  if (Array.isArray(order?.allocations) && order.allocations.length > 0) return order.allocations;
  const notes = String(order?.quoteNotes || '');
  const matches = [...notes.matchAll(/([A-Z0-9-]{5,})\s*:\s*([\d,]+(?:\.\d+)?)\s*kg/gi)];
  return matches.map((match, index) => ({
    allocationId: `note-${order?.orderId || 'order'}-${index}`,
    batchId: match[1],
    allocatedWeightKg: Number(String(match[2]).replace(/,/g, '')),
    matchType: 'Authorized',
    batch: {
      qrCode: match[1],
      farmName: 'Recorded in authorization notes',
      washingStation: 'See logistics/order notes',
      coffeeVariety: order?.qualitySpecs?.coffeeType || 'Requested variety',
      status: order?.status || 'Authorized',
    },
  }));
};

const KPI = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}><Icon className="w-5 h-5 text-white" /></div>
      <ArrowUpRight className="w-4 h-4 text-stone-300" />
    </div>
    <p className="text-2xl font-bold text-stone-800">{value}</p>
    <p className="text-sm text-stone-500 mt-0.5">{label}</p>
  </div>
);

const Badge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700', shipping: 'bg-sky-100 text-sky-700',
    scheduled: 'bg-amber-100 text-amber-700', pending: 'bg-stone-100 text-stone-600',
    delivered: 'bg-emerald-100 text-emerald-700', dispatched: 'bg-teal-100 text-teal-700',
    verified: 'bg-emerald-100 text-emerald-700',
    authorized: 'bg-emerald-100 text-emerald-700', 'awaiting review': 'bg-amber-100 text-amber-700',
  };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status?.toLowerCase()] || 'bg-stone-100 text-stone-600'}`}>{status}</span>;
};

function Overview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.getExporterStats().then(r => setStats(r.data)).catch(() => { }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-rose-700 to-rose-500 rounded-2xl p-5 text-white">
        <p className="text-rose-100 text-sm mb-1">{t('welcome')},</p>
        <h2 className="text-xl font-bold">{user?.name || 'Export Operations'}</h2>
        <p className="text-rose-100 text-sm mt-1">Rwanda Coffee Exports — Licensed Coffee Exporter</p>
      </div>
      {loading ? <Spin /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI label={t('exporter.open_orders')} value={stats?.totalShipments ?? 0} icon={ShoppingCart} color="bg-rose-600" />
            <KPI label={t('exporter.ready_for_shipment')} value={stats?.availableBatches ?? 0} icon={Package} color="bg-emerald-600" />
            <KPI label={t('logistics.active_shipments')} value={stats?.activeShipments ?? 0} icon={Truck} color="bg-sky-600" />
            <KPI label="Verified Docs" value={stats?.complianceDocs ?? 0} icon={CheckCircle2} color="bg-amber-600" />
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">Recent Shipments</h3>
            <div className="space-y-3">
              {stats?.recentShipments?.length ? stats.recentShipments.map((s: any) => (
                <div key={s.shipmentId} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center"><Globe className="w-4 h-4 text-rose-600" /></div>
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{s.containerNo}</p>
                      <p className="text-xs text-stone-400">{s.vesselName} • {s.portDestination}</p>
                    </div>
                  </div>
                  <Badge status={s.status} />
                </div>
              )) : <Empty msg="No shipments yet" />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExportOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [approvedBatches, setApprovedBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [reviewForm, setReviewForm] = useState({ status: 'Under Review', pricePerKg: '', quoteNotes: '', batchId: '' });
  const [form, setForm] = useState({
    contactPerson: '',
    buyer: '',
    email: '',
    phone: '',
    country: '',
    coffeeVariety: 'Red Bourbon',
    weight: '',
    grade: 'Premium',
    minCuppingScore: '85',
    maxMoisture: '12',
    defectTolerance: '5 defects max',
    packaging: '60 kg jute bags',
    specialRequirements: '',
    pricePerKg: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [matchingOrderId, setMatchingOrderId] = useState<string | null>(null);
  const [matchingLoadingId, setMatchingLoadingId] = useState<string | null>(null);
  const [allocatingOrderId, setAllocatingOrderId] = useState<string | null>(null);
  const [matchesByOrder, setMatchesByOrder] = useState<Record<string, any[]>>({});
  const [selectedMatchIds, setSelectedMatchIds] = useState<Record<string, string[]>>({});
  const readableRequirementRows = (source: any, fallback: Record<string, any> = {}) => Object.entries({ ...(source || {}), ...fallback })
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase()),
      value: Array.isArray(value) ? value.join(', ') : String(value),
    }));
  const matchBadgeClass = (type: string) => {
    const value = String(type || '').toLowerCase();
    if (value.includes('exact')) return 'bg-emerald-100 text-emerald-700';
    if (value.includes('partial')) return 'bg-amber-100 text-amber-700';
    return 'bg-stone-100 text-stone-600';
  };
  const countDefects = (defects: any) => {
    if (!defects || typeof defects !== 'object') return 0;
    if (Array.isArray(defects)) return defects.reduce((sum, item) => sum + Number(item?.count || item || 0), 0);
    return Object.values(defects).reduce((sum: number, value: any) => sum + Number(value || 0), 0);
  };
  const tierFor = (assessment: any) => {
    const score = Number(assessment?.cuppingScore || 0);
    const moisture = Number(assessment?.moisture || 0);
    const defects = countDefects(assessment?.defects);
    if (score >= 85 && defects <= 5 && moisture >= 10 && moisture <= 12) return 'Premium';
    if (score >= 75 && score < 85 && defects <= 10) return 'Standard';
    return 'Low';
  };
  const normalizedGrade = (grade: any) => {
    const value = String(grade || '').toLowerCase();
    if (value.includes('premium') || value === 'a1' || value.includes('specialty')) return 'Premium';
    if (value.includes('standard') || value === 'a2') return 'Standard';
    if (value.includes('low') || value === 'a3' || value === 'b') return 'Low';
    return String(grade || 'Any');
  };
  const locallyReservedKgForBatch = (batch: any, currentOrderId: string) => orders
    .filter(row => row.orderId !== currentOrderId)
    .filter(row => isAuthorizedOrder(row) || ['Matched / Ready for Quote', 'Partially Matched'].includes(String(row.status || '')))
    .flatMap(row => allocationRowsFor(row))
    .filter(allocation => {
      const allocationBatchId = String(allocation.batchId || '');
      const allocationQr = String(allocation.batch?.qrCode || '');
      return allocationBatchId === String(batch.batchId || '') || allocationQr === String(batch.qrCode || '');
    })
    .reduce((sum, allocation) => sum + Number(allocation.allocatedWeightKg || 0), 0);
  const localBatchMatches = (order: any) => approvedBatches
    .map(batch => {
      const specs = order.qualitySpecs || {};
      const assessment = batch.qualityAssessments?.[0] || null;
      const requestedVariety = String(specs.coffeeType || specs.coffeeVariety || '').trim();
      const batchVariety = String(batch.coffeeVariety || 'Red Bourbon').trim();
      const requestedGrade = normalizedGrade(order.grade);
      const batchTier = tierFor(assessment);
      const requestedWeight = Number(order.weight || 0);
      const totalWeightKg = Number(batch.totalWeightKg ?? batch.weightCherry ?? 0);
      const localReservedWeightKg = locallyReservedKgForBatch(batch, order.orderId);
      const reservedWeightKg = Math.max(Number(batch.reservedWeightKg || 0), localReservedWeightKg);
      const availableWeight = Math.max(0, totalWeightKg - reservedWeightKg);
      const cuppingScore = Number(assessment?.cuppingScore || 0);
      const moisture = Number(assessment?.moisture || 0);
      const defects = countDefects(assessment?.defects);
      let score = 100;
      const reasons: string[] = [];

      if (requestedVariety && batchVariety.toLowerCase() !== requestedVariety.toLowerCase()) {
        score -= 35;
        reasons.push(`Variety is ${batchVariety}, requested ${requestedVariety}`);
      } else {
        reasons.push(requestedVariety ? `Variety matches ${requestedVariety}` : `Variety available: ${batchVariety}`);
      }
      if (requestedGrade !== 'Any' && batchTier !== requestedGrade) {
        score -= 25;
        reasons.push(`Grade is ${batchTier}, requested ${requestedGrade}`);
      } else {
        reasons.push(`Grade matches ${batchTier}`);
      }
      if (requestedWeight > 0 && availableWeight < requestedWeight) {
        score -= 10;
        reasons.push(`Partial quantity: ${availableWeight.toLocaleString()} kg available of ${requestedWeight.toLocaleString()} kg requested`);
      } else if (requestedWeight > 0) {
        reasons.push(`Single batch can cover ${requestedWeight.toLocaleString()} kg`);
      }
      reasons.push(`Cupping ${cuppingScore} pts, moisture ${moisture}%, ${defects} defects`);
      const matchScore = Math.max(0, Math.min(100, score));
      const matchType = matchScore >= 90 && availableWeight >= requestedWeight ? 'Exact Match' : matchScore >= 70 ? 'Partial Match' : 'Needs Review';
      return {
        batchId: batch.batchId,
        qrCode: batch.qrCode,
        farmName: batch.farmName,
        washingStation: batch.washingStation,
        coffeeVariety: batchVariety,
        weightCherry: availableWeight,
        totalWeightKg,
        reservedWeightKg,
        availableWeightKg: availableWeight,
        status: batch.status,
        quality: { tier: batchTier, cuppingScore, moisture, defects, assessmentDate: assessment?.createdAt || null },
        matchScore,
        matchType,
        reasons,
      };
    })
    .filter(match => Number(match.availableWeightKg || match.weightCherry || 0) > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.weightCherry - a.weightCherry);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderResponse, batchResponse] = await Promise.all([apiService.getExportOrders(), apiService.getApprovedBatches()]);
      setOrders(orderResponse.data);
      setApprovedBatches(batchResponse.data || []);
    } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.buyer || !form.weight || Number(form.weight) < 100) {
      toast.error(!form.buyer ? 'Buyer name is required' : 'Minimum order quantity is 100 kg');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.createExportOrder({
        buyer: form.buyer,
        customerName: form.contactPerson,
        companyName: form.buyer,
        email: form.email,
        phone: form.phone,
        country: form.country,
        weight: Number(form.weight),
        grade: form.grade,
        pricePerKg: Number(form.pricePerKg) || 0,
        qualitySpecs: {
          coffeeType: form.coffeeVariety,
          minCuppingScore: Number(form.minCuppingScore || 0),
          maxMoisture: Number(form.maxMoisture || 0),
          defectTolerance: form.defectTolerance,
          requestType: 'ORDER',
        },
        shipmentRequirements: {
          packaging: form.packaging,
        },
        message: form.specialRequirements || undefined,
      });
      toast.success('Export order created!');
      setShowForm(false);
      setForm({ contactPerson: '', buyer: '', email: '', phone: '', country: '', coffeeVariety: 'Red Bourbon', weight: '', grade: 'Premium', minCuppingScore: '85', maxMoisture: '12', defectTolerance: '5 defects max', packaging: '60 kg jute bags', specialRequirements: '', pricePerKg: '' });
      load();
    } catch { toast.error('Failed to create order'); } finally { setSubmitting(false); }
  };

  const openReview = (order: any) => {
    setSelectedOrder(order);
    setReviewForm({
      status: order.status || 'Under Review',
      pricePerKg: Number(order.pricePerKg || 0) > 0 ? String(order.pricePerKg) : '',
      quoteNotes: order.quoteNotes || '',
      batchId: order.batchId || order.samplePreparation?.batchId || '',
    });
  };

  const saveReview = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);
    try {
      await apiService.updateExportOrderStatus(selectedOrder.orderId, {
        status: reviewForm.status,
        pricePerKg: reviewForm.pricePerKg ? Number(reviewForm.pricePerKg) : undefined,
        quoteNotes: reviewForm.quoteNotes,
        batchId: reviewForm.batchId || undefined,
      });
      toast.success('Customer order updated');
      setSelectedOrder(null);
      load();
    } catch {
      toast.error('Failed to update customer order');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMatches = async (order: any) => {
    if (matchingOrderId === order.orderId && matchesByOrder[order.orderId]) {
      setMatchingOrderId(null);
      return;
    }
    setMatchingOrderId(order.orderId);
    setMatchingLoadingId(order.orderId);
    setMatchesByOrder(prev => ({ ...prev, [order.orderId]: localBatchMatches(order) }));
    setSelectedMatchIds(prev => ({
      ...prev,
      [order.orderId]: (order.allocations || []).map((allocation: any) => allocation.batchId),
    }));
    window.setTimeout(() => {
      setMatchingLoadingId(null);
    }, 100);
  };

  const toggleMatchSelection = (orderId: string, batchId: string) => {
    setSelectedMatchIds(prev => {
      const current = prev[orderId] || [];
      const next = current.includes(batchId) ? current.filter(id => id !== batchId) : [...current, batchId];
      return { ...prev, [orderId]: next };
    });
  };

  const selectedMatchSummary = (order: any) => {
    const matches = matchesByOrder[order.orderId] || [];
    const ids = selectedMatchIds[order.orderId] || [];
    const requestedKg = Number(order.weight || 0);
    let remainingKg = requestedKg;
    const selected = ids
      .map(batchId => matches.find(match => match.batchId === batchId))
      .filter(Boolean)
      .map(match => {
        const availableKg = Number(match.weightCherry || 0);
        const allocatedWeightKg = requestedKg > 0 ? Math.min(Math.max(remainingKg, 0), availableKg) : availableKg;
        remainingKg -= allocatedWeightKg;
        return {
          ...match,
          allocatedWeightKg,
          isPartialAllocation: allocatedWeightKg > 0 && allocatedWeightKg < availableKg,
        };
      })
      .filter(match => Number(match.allocatedWeightKg || 0) > 0);
    const selectedKg = selected.reduce((sum, match) => sum + Number(match.allocatedWeightKg || 0), 0);
    const allocationByBatch = new Map(selected.map(match => [match.batchId, match]));
    return { selected, selectedKg, requestedKg, remainingKg: Math.max(0, requestedKg - selectedKg), allocationByBatch };
  };

  const allocateMatches = async (order: any) => {
    const summary = selectedMatchSummary(order);
    const { selected } = summary;
    if (selected.length === 0) {
      toast.error('Select at least one matching batch');
      return;
    }
    setAllocatingOrderId(order.orderId);
    try {
      const allocationNote = selected
        .map(match => `${match.qrCode}: ${Number(match.allocatedWeightKg || 0).toLocaleString()} kg`)
        .join('; ');
      await apiService.updateExportOrderStatus(order.orderId, {
        status: 'Ready for Shipment',
        batchId: selected[0]?.batchId,
        allocations: selected.map(match => ({
          batchId: match.batchId,
          allocatedWeightKg: Number(match.allocatedWeightKg || 0),
          matchScore: Number(match.matchScore || 0),
        })),
        quoteNotes: `Logistics authorized for this customer request: ${allocationNote}`,
      });
      toast.success('Logistics authorized for selected customer order');
      await load();
      setMatchesByOrder(prev => ({ ...prev, [order.orderId]: localBatchMatches(order) }));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to authorize Logistics for selected batches');
    } finally {
      setAllocatingOrderId(null);
    }
  };

  const workQueueOrders = orders
    .filter(order => !isAuthorizedOrder(order))
    .filter(order => requestTypeFor(order) !== 'Sample');

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Export Orders</h2>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(v => !v)} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-rose-800 text-base">New Export Order</h3>
              <p className="text-xs text-rose-600 mt-0.5">Enter buyer details and coffee requirements</p>
            </div>
            <button onClick={() => setShowForm(false)} className="p-1.5 text-rose-400 hover:bg-rose-100 rounded-lg">
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Buyer Information */}
          <div>
            <p className="text-xs font-semibold uppercase text-rose-700 mb-2 tracking-wider">Buyer Information</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Contact Person</label>
                <input
                  value={form.contactPerson}
                  onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))}
                  placeholder="Buyer contact name"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Buyer / Company Name *</label>
                <input
                  required
                  value={form.buyer}
                  onChange={e => setForm(p => ({ ...p, buyer: e.target.value }))}
                  placeholder="Company or buyer name"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="buyer@company.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Phone / WhatsApp</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+250 7XX XXX XXX"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Destination Country</label>
                <input
                  value={form.country}
                  onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. Germany, USA, Japan"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Price per kg (USD)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.pricePerKg}
                  onChange={e => setForm(p => ({ ...p, pricePerKg: e.target.value }))}
                  placeholder="e.g. 4.50"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>
          </div>

          {/* Coffee Specifications */}
          <div>
            <p className="text-xs font-semibold uppercase text-rose-700 mb-2 tracking-wider">Coffee Specifications</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Coffee Variety</label>
                <select
                  value={form.coffeeVariety}
                  onChange={e => setForm(p => ({ ...p, coffeeVariety: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  {['Red Bourbon', 'Bourbon', 'Jackson', 'Mibirizi', 'Typica', 'Gesha'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Quantity kg *</label>
                <input
                  required
                  type="number"
                  min={100}
                  value={form.weight}
                  onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                  placeholder="Min 100 kg"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-stone-600 font-medium mb-2">Coffee Grade *</p>
              <div className="grid sm:grid-cols-3 gap-2">
                {[
                  { value: 'Premium', detail: 'High-scoring lots — specialty and premium export' },
                  { value: 'Standard', detail: 'Approved export-grade for reliable commercial orders' },
                  { value: 'Low', detail: 'Lower-tier coffee reviewed before matching' },
                ].map(g => (
                  <label
                    key={g.value}
                    className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-sm ${form.grade === g.value
                        ? 'border-rose-500 bg-rose-50'
                        : 'border-rose-100 bg-white hover:bg-rose-50/50'
                      }`}
                  >
                    <input
                      type="radio"
                      name="exportGrade"
                      value={g.value}
                      checked={form.grade === g.value}
                      onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
                      className="mt-0.5 accent-rose-600"
                    />
                    <span>
                      <span className="block font-semibold text-stone-800">{g.value}</span>
                      <span className="block text-xs text-stone-500 mt-0.5">{g.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Quality Requirements */}
          <div>
            <p className="text-xs font-semibold uppercase text-rose-700 mb-2 tracking-wider">Quality Requirements</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Minimum Cupping Score</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.minCuppingScore}
                  onChange={e => setForm(p => ({ ...p, minCuppingScore: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Max Moisture %</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.1}
                  value={form.maxMoisture}
                  onChange={e => setForm(p => ({ ...p, maxMoisture: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Defect Tolerance</label>
                <input
                  value={form.defectTolerance}
                  onChange={e => setForm(p => ({ ...p, defectTolerance: e.target.value }))}
                  placeholder="e.g. max 5 defects, no mold"
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 font-medium mb-1 block">Packaging</label>
                <select
                  value={form.packaging}
                  onChange={e => setForm(p => ({ ...p, packaging: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  {['60 kg jute bags', '30 kg bags', 'GrainPro lined bags', 'Custom packaging'].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-stone-600 font-medium mb-1 block">Special Requirements / Notes</label>
                <textarea
                  value={form.specialRequirements}
                  onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))}
                  rows={2}
                  placeholder="Contract terms, roasting profile, buyer-specific quality rules..."
                  className="w-full px-3 py-2.5 rounded-lg border border-rose-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1 border-t border-rose-100">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">Cancel</button>
            <button onClick={submit} disabled={submitting} className="px-5 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Order'}
            </button>
          </div>
        </div>
      )}

      {loading ? <Spin /> : workQueueOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-5"><Empty msg="No customer orders waiting for exporter action" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 bg-stone-50">
            <p className="text-sm font-semibold text-stone-800">Customer and export orders</p>
            <p className="text-xs text-stone-500 mt-1">Orders stay here until the exporter authorizes Logistics. Authorized orders move to the Authorized Orders table.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Reference', 'Buyer', 'Country', 'Grade', 'Quantity', 'Price/kg', 'Status', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {workQueueOrders.map(o => {
                  const matches = matchesByOrder[o.orderId] || [];
                  const selectedIds = selectedMatchIds[o.orderId] || [];
                  const summary = selectedMatchSummary(o);
                  return (
                    <Fragment key={o.orderId}>
                      <tr className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-mono text-xs text-stone-600">{o.referenceCode || o.orderId.slice(0, 8)}</td>
                        <td className="px-4 py-3 font-medium text-stone-800">{o.buyer}</td>
                        <td className="px-4 py-3 text-stone-600">{o.country}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">{o.grade}</span></td>
                        <td className="px-4 py-3 text-stone-600">{`${Number(o.weight).toLocaleString()} kg`}</td>
                        <td className="px-4 py-3 text-stone-600">{Number(o.pricePerKg) > 0 ? `$${o.pricePerKg}` : 'Not quoted'}</td>
                        <td className="px-4 py-3"><Badge status={o.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 whitespace-nowrap">
                            <button onClick={() => loadMatches(o)} className="px-3 py-1.5 border border-stone-200 text-stone-700 rounded-lg text-xs hover:bg-stone-50">
                              {matchingLoadingId === o.orderId ? 'Finding...' : matchingOrderId === o.orderId ? 'Hide Matches' : 'Find Matching Batches'}
                            </button>
                            <button onClick={() => openReview(o)} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700">
                              Review
                            </button>
                          </div>
                        </td>
                      </tr>
                      {matchingOrderId === o.orderId && (
                        <tr className="bg-rose-50/40">
                          <td colSpan={9} className="px-4 py-4">
                            <div className="rounded-xl border border-rose-100 bg-white p-4 space-y-4">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div>
                                  <h4 className="font-semibold text-stone-900">Matching export-ready batches</h4>
                                  <p className="text-xs text-stone-500 mt-1">Ranked by coffee variety, quality grade, cupping score, moisture, defects, and available quantity.</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                  <div className="rounded-lg bg-stone-50 px-3 py-2">
                                    <p className="text-stone-400">Requested</p>
                                    <p className="font-bold text-stone-800">{summary.requestedKg.toLocaleString()} kg</p>
                                  </div>
                                  <div className="rounded-lg bg-emerald-50 px-3 py-2">
                                    <p className="text-emerald-600">Selected</p>
                                    <p className="font-bold text-emerald-800">{summary.selectedKg.toLocaleString()} kg</p>
                                  </div>
                                  <div className="rounded-lg bg-amber-50 px-3 py-2">
                                    <p className="text-amber-600">Remaining</p>
                                    <p className="font-bold text-amber-800">{summary.remainingKg.toLocaleString()} kg</p>
                                  </div>
                                </div>
                              </div>
                              {matchingLoadingId === o.orderId ? (
                                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-rose-600" /></div>
                              ) : matches.length === 0 ? (
                                <Empty msg="No certified export-ready batches match this request yet" />
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-stone-50 border-y border-stone-100">
                                        {['Select', 'Match', 'Batch', 'Coffee', 'Quality', 'Weight', 'Reasons'].map(header => (
                                          <th key={header} className="px-3 py-2 text-left font-semibold text-stone-500 uppercase tracking-wide">{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                      {matches.map(match => {
                                        const selectedAllocation = summary.allocationByBatch.get(match.batchId);
                                        const isSelected = selectedIds.includes(match.batchId);
                                        const isFullyReserved = Number(match.weightCherry || 0) <= 0;
                                        const isDisabled = !isSelected && (isFullyReserved || (summary.remainingKg <= 0 && summary.requestedKg > 0));
                                        return (
                                          <tr key={match.batchId} className={isSelected ? 'bg-emerald-50/50' : isDisabled ? 'opacity-50' : ''}>
                                            <td className="px-3 py-3">
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={isDisabled}
                                                onChange={() => toggleMatchSelection(o.orderId, match.batchId)}
                                                className="w-4 h-4 accent-rose-600"
                                              />
                                            </td>
                                            <td className="px-3 py-3">
                                              <span className={`px-2 py-0.5 rounded-full font-semibold ${matchBadgeClass(match.matchType)}`}>{match.matchType}</span>
                                              <p className="mt-1 text-stone-400">{match.matchScore}% score</p>
                                            </td>
                                            <td className="px-3 py-3">
                                              <p className="font-mono font-semibold text-stone-800">{match.qrCode}</p>
                                              <p className="text-stone-500">{match.farmName}</p>
                                              <p className="text-stone-400">{match.washingStation}</p>
                                            </td>
                                            <td className="px-3 py-3 text-stone-700">{match.coffeeVariety}</td>
                                            <td className="px-3 py-3">
                                              <p className="font-semibold text-stone-800">{match.quality?.tier}</p>
                                              <p className="text-stone-500">{match.quality?.cuppingScore} pts, {match.quality?.moisture}% moisture</p>
                                              <p className="text-stone-400">{match.quality?.defects} defects</p>
                                            </td>
                                            <td className="px-3 py-3 font-semibold text-stone-700">
                                              {selectedAllocation ? (
                                                <>
                                                  <p>{Number(selectedAllocation.allocatedWeightKg || 0).toLocaleString()} kg allocated</p>
                                                  <p className="text-[11px] font-normal text-stone-400">
                                                    of {Number(match.weightCherry || 0).toLocaleString()} kg available
                                                    {selectedAllocation.isPartialAllocation ? ' (partial)' : ''}
                                                  </p>
                                                </>
                                              ) : (
                                                <>
                                                  <p>{Number(match.weightCherry || 0).toLocaleString()} kg available</p>
                                                  {Number(match.reservedWeightKg || 0) > 0 && (
                                                    <p className="text-[11px] font-normal text-stone-400">
                                                      {Number(match.reservedWeightKg || 0).toLocaleString()} kg reserved of {Number(match.totalWeightKg || 0).toLocaleString()} kg
                                                    </p>
                                                  )}
                                                </>
                                              )}
                                            </td>
                                            <td className="px-3 py-3 text-stone-600 min-w-64">
                                              <ul className="space-y-1">
                                                {(match.reasons || []).slice(0, 4).map((reason: string) => <li key={reason}>{reason}</li>)}
                                              </ul>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <div className="flex justify-end">
                                <button
                                  onClick={() => allocateMatches(o)}
                                  disabled={allocatingOrderId === o.orderId || summary.selected.length === 0 || summary.remainingKg > 0}
                                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                                >
                                  {allocatingOrderId === o.orderId ? 'Authorizing...' : 'Authorize Logistics'}
                                </button>
                              </div>
                              {summary.selected.length > 0 && summary.remainingKg > 0 && (
                                <p className="text-xs text-amber-700 text-right">Select {summary.remainingKg.toLocaleString()} kg more before authorizing Logistics.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-stone-500">{requestTypeFor(selectedOrder) === 'Sample' ? 'Customer sample request' : 'Customer order'}</p>
                <h3 className="font-bold text-stone-900">{selectedOrder.referenceCode || selectedOrder.orderId.slice(0, 8)}</h3>
                <p className="text-sm text-stone-500 mt-1">{selectedOrder.buyer} - {selectedOrder.customerEmail || 'No customer email'}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm">Close</button>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                {[
                  ['Destination', selectedOrder.country],
                  ['Coffee', selectedOrder.grade],
                  ['Quantity', requestTypeFor(selectedOrder) === 'Sample' ? `${Number(selectedOrder.qualitySpecs?.sampleQuantityGrams || Number(selectedOrder.weight || 0) * 1000).toLocaleString()} g sample` : `${Number(selectedOrder.weight).toLocaleString()} kg`],
                  ['Purpose', requestTypeFor(selectedOrder) === 'Sample' ? selectedOrder.qualitySpecs?.samplePurpose || 'Buyer evaluation' : 'Export order'],
                  ['Incoterm', selectedOrder.incoterm || 'Not specified'],
                  ['Phone', selectedOrder.customerPhone || 'Not provided'],
                  ['Company', selectedOrder.companyName || 'Not provided'],
                  ['Total quote', Number(selectedOrder.totalValue) > 0 ? `$${Number(selectedOrder.totalValue).toLocaleString()}` : 'Not quoted'],
                  ['Created', new Date(selectedOrder.orderDate).toLocaleDateString()],
                ].map(([label, value]) => (
                  <div key={label} className="bg-stone-50 rounded-lg p-3">
                    <p className="text-xs text-stone-500">{label}</p>
                    <p className="font-semibold text-stone-800 mt-1">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-stone-200 p-4">
                  <h4 className="font-semibold text-stone-800 mb-3">Buyer requirements</h4>
                  <div className="space-y-3 text-sm text-stone-600">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Coffee and quality</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {readableRequirementRows(selectedOrder.qualitySpecs).map(row => (
                          <div key={row.label} className="rounded-lg bg-stone-50 p-2">
                            <p className="text-[11px] text-stone-400">{row.label}</p>
                            <p className="font-semibold text-stone-700">{row.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">Delivery and packaging</p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {readableRequirementRows(selectedOrder.shipmentRequirements, { incoterm: selectedOrder.incoterm }).map(row => (
                          <div key={row.label} className="rounded-lg bg-stone-50 p-2">
                            <p className="text-[11px] text-stone-400">{row.label}</p>
                            <p className="font-semibold text-stone-700">{row.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {requestTypeFor(selectedOrder) === 'Sample' && selectedOrder.samplePreparation && (
                      <p>Sample workflow: {selectedOrder.samplePreparation.status}{selectedOrder.samplePreparation.trackingNo ? ` - Tracking ${selectedOrder.samplePreparation.trackingNo}` : ''}</p>
                    )}
                    {selectedOrder.customerMessage && <p>Notes: {selectedOrder.customerMessage}</p>}
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 p-4 space-y-3">
                  <h4 className="font-semibold text-stone-800">Review and quote</h4>
                  <select value={reviewForm.status} onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm">
                    {(requestTypeFor(selectedOrder) === 'Sample'
                      ? ['Sample Requested', 'Under Review', 'Sample Approved', 'Prepared by Logistics', 'Dispatched', 'Delivered', 'Feedback Received', 'Converted to Order', 'Rejected']
                      : ['Customer Request', 'Under Review', 'Quoted', 'Confirmed', 'Scheduled', 'Shipped', 'Delivered', 'Rejected']
                    ).map(status => <option key={status}>{status}</option>)}
                  </select>
                  {requestTypeFor(selectedOrder) === 'Sample' && (
                    <select value={reviewForm.batchId} onChange={e => setReviewForm(f => ({ ...f, batchId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm bg-white">
                      <option value="">Select batch/lot for the customer sample</option>
                      {approvedBatches.map(batch => (
                        <option key={batch.batchId} value={batch.batchId}>
                          {batch.qrCode} - {batch.coffeeVariety || 'Red Bourbon'} - {batch.farmName} - {batch.washingStation} ({Number(batch.weightCherry || 0).toLocaleString()} kg)
                        </option>
                      ))}
                    </select>
                  )}
                  <input type="number" value={reviewForm.pricePerKg} onChange={e => setReviewForm(f => ({ ...f, pricePerKg: e.target.value }))} placeholder={requestTypeFor(selectedOrder) === 'Sample' ? 'Sample handling/shipping quote USD per kg' : 'Quoted price per kg USD'} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm" />
                  <textarea value={reviewForm.quoteNotes} onChange={e => setReviewForm(f => ({ ...f, quoteNotes: e.target.value }))} placeholder={requestTypeFor(selectedOrder) === 'Sample' ? 'Sample approval, dispatch details, or conversion note to customer' : 'Quote notes or message to customer'} className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm min-h-24" />
                  <button onClick={saveReview} disabled={submitting} className="w-full px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
                    {submitting ? 'Saving...' : 'Save Review'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 p-4">
                <h4 className="font-semibold text-stone-800 mb-3">Conversation</h4>
                <div className="space-y-2">
                  {(selectedOrder.messages || []).length === 0 ? <p className="text-sm text-stone-400">No messages yet</p> : selectedOrder.messages.map((msg: any) => (
                    <div key={msg.messageId} className={`rounded-lg p-3 text-sm ${msg.senderType === 'EXPORTER' ? 'bg-rose-50 text-rose-900' : 'bg-stone-50 text-stone-700'}`}>
                      <p className="font-semibold">{msg.senderName}</p>
                      <p className="mt-1">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthorizedOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getExportOrders();
      setOrders((response.data || []).filter(isAuthorizedOrder).filter(order => requestTypeFor(order) !== 'Sample'));
    } catch {
      toast.error('Failed to load authorized orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = orders
    .filter(order => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [
        order.referenceCode,
        order.buyer,
        order.companyName,
        order.customerEmail,
        order.customerPhone,
        order.grade,
        order.status,
        ...allocationRowsFor(order).map((allocation: any) => allocation.batch?.qrCode || allocation.batchId),
      ].some(value => String(value || '').toLowerCase().includes(query));
    })
    .sort((left, right) => {
      if (sort === 'customer') return String(left.buyer || '').localeCompare(String(right.buyer || ''));
      if (sort === 'status') return String(left.status || '').localeCompare(String(right.status || ''));
      if (sort === 'weight') return Number(right.weight || 0) - Number(left.weight || 0);
      return new Date(right.orderDate || 0).getTime() - new Date(left.orderDate || 0).getTime();
    });

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Authorized Orders</h2>
          <p className="text-sm text-stone-500 mt-1">Customer orders already approved by Exporter and handed to Logistics for shipment preparation.</p>
        </div>
        <button onClick={load} className="px-3 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-wrap gap-2 items-center justify-between bg-stone-50">
          <div>
            <p className="text-sm font-semibold text-stone-800">Orders sent to Logistics</p>
            <p className="text-xs text-stone-500 mt-1">These orders no longer appear in Customer Orders.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search customer, QR, status" className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white min-w-56" />
            <select value={sort} onChange={event => setSort(event.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-white">
              <option value="newest">Newest</option>
              <option value="customer">Customer</option>
              <option value="status">Status</option>
              <option value="weight">Weight</option>
            </select>
          </div>
        </div>
        {loading ? <Spin /> : rows.length === 0 ? (
          <Empty msg="No authorized orders yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Reference', 'Customer', 'Contact', 'Coffee', 'Authorized Batches', 'Status', 'Action'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {rows.map(order => {
                  const expanded = expandedOrderId === order.orderId;
                  const allocations = allocationRowsFor(order);
                  return (
                    <Fragment key={order.orderId}>
                      <tr className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-stone-800">{order.referenceCode || order.orderId.slice(0, 8)}</p>
                          <p className="text-xs text-stone-400">{new Date(order.orderDate).toLocaleDateString()}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-800">{order.buyer}</p>
                          <p className="text-xs text-stone-400">{order.companyName || order.country || 'Customer order'}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          <p>{order.customerEmail || '-'}</p>
                          <p className="text-xs text-stone-400">{order.customerPhone || '-'}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          <p>{order.grade} - {order.qualitySpecs?.coffeeType || 'Any variety'}</p>
                          <p className="text-xs text-stone-400">{Number(order.weight || 0).toLocaleString()} kg requested</p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          <p className="font-semibold">{allocations.reduce((sum: number, row: any) => sum + Number(row.allocatedWeightKg || 0), 0).toLocaleString()} kg authorized</p>
                          <p className="font-mono text-xs text-stone-400">{allocations.map((row: any) => row.batch?.qrCode || row.batchId?.slice(0, 8)).join(', ') || '-'}</p>
                        </td>
                        <td className="px-4 py-3"><Badge status={order.status} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => setExpandedOrderId(expanded ? null : order.orderId)} className="px-3 py-1.5 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-50">
                            {expanded ? 'Hide Details' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-rose-50/40">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="rounded-xl border border-rose-100 bg-white p-4 space-y-3">
                              <h4 className="font-semibold text-stone-800">Authorized batch allocations</h4>
                              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                {[
                                  ['Customer', order.buyer],
                                  ['Company', order.companyName || 'Not provided'],
                                  ['Email', order.customerEmail || 'Not provided'],
                                  ['Phone', order.customerPhone || 'Not provided'],
                                  ['Destination / Market', order.country || 'To be discussed'],
                                  ['Requested Coffee', `${order.grade} - ${order.qualitySpecs?.coffeeType || 'Any variety'}`],
                                  ['Requested Quantity', `${Number(order.weight || 0).toLocaleString()} kg`],
                                  ['Order Status', order.status],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-lg bg-stone-50 p-3">
                                    <p className="text-xs text-stone-500">{label}</p>
                                    <p className="font-semibold text-stone-800 mt-1">{value}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="grid md:grid-cols-2 gap-3">
                                {allocations.map((allocation: any) => (
                                  <div key={allocation.allocationId || allocation.batchId} className="rounded-lg border border-stone-100 p-3">
                                    <p className="font-mono text-xs font-semibold text-stone-800">{allocation.batch?.qrCode || allocation.batchId}</p>
                                    <p className="text-sm text-stone-600 mt-1">{allocation.batch?.farmName || '-'} - {allocation.batch?.washingStation || '-'}</p>
                                    <p className="text-xs text-stone-400 mt-1">{allocation.batch?.coffeeVariety || 'Red Bourbon'} - {Number(allocation.allocatedWeightKg || 0).toLocaleString()} kg</p>
                                    <Badge status={allocation.batch?.status || 'Authorized'} />
                                  </div>
                                ))}
                              </div>
                              <div className="grid md:grid-cols-2 gap-3">
                                <div className="rounded-lg border border-stone-100 p-3">
                                  <h5 className="font-semibold text-stone-800 mb-2">Buyer Requirements</h5>
                                  <div className="space-y-1 text-xs text-stone-600">
                                    {Object.entries(order.qualitySpecs || {}).filter(([, value]) => value !== null && value !== undefined && value !== '').map(([key, value]) => (
                                      <p key={key}><span className="font-semibold">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(Array.isArray(value) ? value.join(', ') : value)}</p>
                                    ))}
                                    {Object.keys(order.qualitySpecs || {}).length === 0 && <p>No specific buyer quality requirements recorded.</p>}
                                  </div>
                                </div>
                                <div className="rounded-lg border border-stone-100 p-3">
                                  <h5 className="font-semibold text-stone-800 mb-2">Logistics Handoff</h5>
                                  <div className="space-y-1 text-xs text-stone-600">
                                    <p><span className="font-semibold">Authorized kg:</span> {allocations.reduce((sum: number, row: any) => sum + Number(row.allocatedWeightKg || 0), 0).toLocaleString()} kg</p>
                                    <p><span className="font-semibold">Batch count:</span> {allocations.length}</p>
                                    <p><span className="font-semibold">Shipment ID:</span> {order.shipmentId || 'Not created yet'}</p>
                                    <p><span className="font-semibold">Next step:</span> Logistics creates shipment/container from authorized batches.</p>
                                  </div>
                                </div>
                              </div>
                              {order.quoteNotes && <p className="text-sm text-stone-600 bg-stone-50 rounded-lg p-3">{order.quoteNotes}</p>}
                              {(order.messages || []).length > 0 && (
                                <div className="rounded-lg border border-stone-100 p-3">
                                  <h5 className="font-semibold text-stone-800 mb-2">Conversation</h5>
                                  <div className="space-y-2">
                                    {order.messages.map((message: any) => (
                                      <div key={message.messageId} className="rounded-lg bg-stone-50 p-2 text-xs">
                                        <p className="font-semibold text-stone-700">{message.senderName || message.senderType}</p>
                                        <p className="text-stone-600 mt-1">{message.message}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
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
    </div>
  );
}

function BatchSelection() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ containerNo: '', vesselName: '', portLoading: 'Mombasa', portDestination: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await apiService.getApprovedBatches(); setBatches(r.data); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ship = async () => {
    if (!selected || !form.containerNo) return;
    setSubmitting(true);
    try {
      await apiService.createShipment({ batchId: selected, ...form });
      toast.success('Shipment scheduled!'); setSelected(null); setShowForm(false); load();
    } catch { toast.error('Failed to schedule shipment'); } finally { setSubmitting(false); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Batch Selection for Export</h2>
        {selected && !showForm && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700">Schedule Export</button>
        )}
      </div>

      {showForm && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-rose-800">Shipping Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {[['containerNo', 'Container No.'], ['vesselName', 'Vessel Name'], ['portDestination', 'Port of Destination']].map(([k, lbl]) => (
              <div key={k}>
                <label className="text-xs text-rose-700 font-medium mb-1 block">{lbl}</label>
                <input value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-rose-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg">Cancel</button>
            <button onClick={ship} disabled={submitting} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 disabled:opacity-50">
              {submitting ? 'Scheduling…' : 'Confirm Export'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">Only QC-certified batches (Dispatched status) can be selected for export.</p>
      </div>

      {loading ? <Spin /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {batches.length === 0 ? <div className="col-span-full bg-white rounded-xl border border-stone-200 p-5"><Empty msg="No approved batches available" /></div>
            : batches.map(b => {
              const sel = selected === b.batchId;
              const score = b.qualityAssessments?.[0]?.cuppingScore ?? 'N/A';
              return (
                <div key={b.batchId} onClick={() => setSelected(sel ? null : b.batchId)}
                  className={`bg-white rounded-xl border-2 p-4 shadow-sm transition-all cursor-pointer ${sel ? 'border-rose-500 bg-rose-50' : 'border-stone-200 hover:border-rose-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-stone-800">{b.washingStation}</p>
                      <p className="text-xs text-stone-400">{b.district} • {b.qrCode}</p>
                    </div>
                    <div className="flex items-center gap-2"><Badge status={b.status} />{sel && <CheckCircle2 className="w-5 h-5 text-rose-600" />}</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[['Weight', `${b.weightCherry} kg`], ['Variety', b.coffeeVariety || 'Red Bourbon'], ['QC Score', String(score)], ['Date', new Date(b.createdAt).toLocaleDateString()]].map(([l, v]) => (
                      <div key={l} className="bg-stone-50 rounded p-2 text-center">
                        <p className="text-stone-400">{l}</p><p className="font-semibold text-stone-700">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function ShipmentAuthorization() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await apiService.getApprovedBatches(); setBatches(response.data); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const authorize = async (batchId: string) => {
    setAuthorizing(batchId);
    try {
      await apiService.authorizeBatchForShipment(batchId);
      toast.success('Batch authorized for Logistics shipment preparation');
      load();
    } catch {
      toast.error('Failed to authorize shipment preparation');
    } finally {
      setAuthorizing(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Shipment Authorization</h2>
          <p className="text-sm text-stone-500 mt-1">Review QC-certified coffee and authorize Logistics to prepare container and transport details.</p>
        </div>
        <button onClick={load} className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg" aria-label="Refresh batches">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">Authorization does not book a vessel. After approval, Logistics receives the batch and records shipping details.</p>
      </div>
      {loading ? <Spin /> : batches.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-5"><Empty msg="No QC-certified batches awaiting shipment review" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>{['Batch / QR', 'Origin', 'Variety', 'Station', 'Weight', 'QC Score', 'Status', 'Action'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{title}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {batches.map(batch => {
                const quality = batch.qualityAssessments?.[0];
                const authorized = batch.status === 'shipment_authorized';
                return (
                  <tr key={batch.batchId} className="hover:bg-stone-50">
                    <td className="px-5 py-3"><p className="font-semibold text-stone-800">{batch.qrCode || batch.batchId.slice(0, 8)}</p><p className="text-xs text-stone-400">{batch.batchId.slice(0, 12)}</p></td>
                    <td className="px-5 py-3"><p className="font-medium text-stone-700">{batch.farmName}</p><p className="text-xs text-stone-400">{batch.district}</p></td>
                    <td className="px-5 py-3 text-stone-700">{batch.coffeeVariety || 'Red Bourbon'}</td>
                    <td className="px-5 py-3 text-stone-700">{batch.washingStation}</td>
                    <td className="px-5 py-3 text-stone-700">{Number(batch.weightCherry || 0).toLocaleString()} kg</td>
                    <td className="px-5 py-3 text-stone-700">{quality ? Number(quality.cuppingScore).toFixed(1) : 'N/A'}</td>
                    <td className="px-5 py-3"><Badge status={authorized ? 'Authorized' : 'Awaiting Review'} /></td>
                    <td className="px-5 py-3">
                      {authorized ? (
                        <span className="text-xs font-semibold text-emerald-700">Sent to Logistics</span>
                      ) : (
                        <button onClick={() => authorize(batch.batchId)} disabled={authorizing === batch.batchId} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-60 whitespace-nowrap">
                          {authorizing === batch.batchId ? 'Authorizing...' : 'Authorize Preparation'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BatchReview() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [authorizing, setAuthorizing] = useState<string | null>(null);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [traceabilityByBatch, setTraceabilityByBatch] = useState<Record<string, any>>({});
  const [traceabilityLoading, setTraceabilityLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getApprovedBatches();
      setBatches(response.data || []);
    } catch {
      toast.error('Failed to retrieve certified batch review data');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const visibleBatches = batches.filter(batch => {
    if (statusFilter !== 'all' && batch.status !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [batch.qrCode, batch.batchId, batch.farmName, batch.district, batch.washingStation]
      .some(value => String(value || '').toLowerCase().includes(query));
  });
  const awaiting = batches.filter(batch => batch.status === 'export_ready').length;
  const authorized = batches.filter(batch => batch.status === 'shipment_authorized').length;

  const authorize = async (batchId: string) => {
    setAuthorizing(batchId);
    try {
      await apiService.authorizeBatchForShipment(batchId);
      toast.success('Batch authorized and sent to Logistics');
      load();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to authorize batch for Logistics');
    } finally {
      setAuthorizing(null);
    }
  };

  const verifyBatchQr = async (batch: any) => {
    if (expandedBatchId === batch.batchId) {
      setExpandedBatchId(null);
      return;
    }
    setExpandedBatchId(batch.batchId);
    if (traceabilityByBatch[batch.batchId]) return;
    const qrCode = String(batch.qrCode || '').trim();
    if (!qrCode) {
      toast.error('This batch has no QR code to verify');
      return;
    }
    setTraceabilityLoading(batch.batchId);
    try {
      const response = await apiService.getTraceability(qrCode);
      setTraceabilityByBatch(current => ({ ...current, [batch.batchId]: response.data }));
    } catch (error: any) {
      toast.error(error?.message || 'Batch traceability record not found');
      setExpandedBatchId(null);
    } finally {
      setTraceabilityLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Export-Ready Batches</h2>
          <p className="text-sm text-stone-500 mt-1">Verify QC-approved batches, match them to customer demand, and authorize Logistics preparation.</p>
        </div>
        <button onClick={load} className="p-2 text-stone-400 hover:bg-stone-100 rounded-lg" aria-label="Refresh batch review">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          ['Certified Lots', batches.length],
          ['Awaiting Authorization', awaiting],
          ['Authorized for Logistics', authorized],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs uppercase font-semibold text-stone-500">{label}</p>
            <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-stone-800">Quality-Approved Export Lots</p>
            <p className="text-xs text-stone-500 mt-1">Only batches with quality results appear here. Authorization moves the batch to Logistics.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search QR, farm, station" className="px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-xs min-w-[210px]" />
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-xs" aria-label="Filter batch review status">
              <option value="all">All statuses</option>
              <option value="export_ready">Awaiting authorization</option>
              <option value="shipment_authorized">Authorized</option>
            </select>
          </div>
        </div>
        {loading ? <Spin /> : visibleBatches.length === 0 ? <Empty msg="No certified batches match this review" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>{['Batch / QR', 'Origin and Station', 'Variety', 'Weight', 'Quality Result', 'Handoff Status', 'Actions'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold whitespace-nowrap">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleBatches.map(batch => {
                  const quality = batch.qualityAssessments?.[0];
                  const traceability = traceabilityByBatch[batch.batchId];
                  const checkpoints = traceability?.checkpoints || traceability?.checkpointLogs || [];
                  const transport = traceability?.transport || traceability?.transportLogs || [];
                  return (
                    <Fragment key={batch.batchId}>
                      <tr className="hover:bg-stone-50">
                        <td className="px-5 py-3"><p className="font-semibold text-stone-800">{batch.qrCode || batch.batchId.slice(0, 8)}</p><p className="text-xs text-stone-400">{batch.batchId.slice(0, 12)}</p></td>
                        <td className="px-5 py-3"><p className="font-medium text-stone-700">{batch.farmName}</p><p className="text-xs text-stone-500">{batch.district} / {batch.washingStation}</p></td>
                        <td className="px-5 py-3 text-stone-700 whitespace-nowrap">{batch.coffeeVariety || 'Red Bourbon'}</td>
                        <td className="px-5 py-3 text-stone-700">{Number(batch.weightCherry || 0).toLocaleString()} kg</td>
                        <td className="px-5 py-3"><p className="font-semibold text-emerald-700">{quality ? `${Number(quality.cuppingScore).toFixed(1)} / 100` : 'Certificate missing'}</p><p className="text-xs text-stone-500">{quality ? `Moisture ${Number(quality.moisture).toFixed(1)}%` : 'Review required'}</p></td>
                        <td className="px-5 py-3"><Badge status={batch.status === 'shipment_authorized' ? 'Sent to Logistics' : 'Ready for Exporter'} /></td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => verifyBatchQr(batch)}
                              className="px-3 py-1.5 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-50"
                            >
                              {expandedBatchId === batch.batchId ? 'Hide QR' : 'Verify QR'}
                            </button>
                            {batch.status === 'shipment_authorized' ? (
                              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold whitespace-nowrap">Logistics notified</span>
                            ) : (
                              <button type="button" onClick={() => authorize(batch.batchId)} disabled={authorizing === batch.batchId} className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 disabled:opacity-60 whitespace-nowrap">
                                {authorizing === batch.batchId ? 'Authorizing...' : 'Authorize Logistics'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedBatchId === batch.batchId && (
                        <tr className="bg-rose-50/30">
                          <td colSpan={7} className="px-5 py-5">
                            {traceabilityLoading === batch.batchId ? (
                              <div className="flex items-center justify-center gap-2 py-8 text-sm text-stone-500">
                                <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> Verifying batch QR...
                              </div>
                            ) : traceability ? (
                              <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm space-y-4">
                                <div className="grid md:grid-cols-4 gap-3">
                                  {[
                                    ['Batch Status', traceability.stage || batch.status],
                                    ['QR Code', traceability.qrCode || batch.qrCode],
                                    ['Origin', traceability.farmName || batch.farmName],
                                    ['Washing Station', traceability.washingStation || batch.washingStation],
                                    ['Batch Weight', `${Number(traceability.weightCherry || batch.weightCherry || 0).toLocaleString()} kg`],
                                    ['Variety', traceability.variety || batch.coffeeVariety || 'Red Bourbon'],
                                    ['Cupping Score', traceability.quality?.cuppingScore ? `${Number(traceability.quality.cuppingScore).toFixed(1)} / 100` : quality ? `${Number(quality.cuppingScore).toFixed(1)} / 100` : 'Not recorded'],
                                    ['Moisture', traceability.quality?.moisture ? `${Number(traceability.quality.moisture).toFixed(1)}%` : quality ? `${Number(quality.moisture).toFixed(1)}%` : 'Not recorded'],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg bg-stone-50 border border-stone-100 p-3">
                                      <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">{label}</p>
                                      <p className="text-sm font-semibold text-stone-800 mt-1">{value}</p>
                                    </div>
                                  ))}
                                </div>
                                <div className="grid lg:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="text-sm font-bold text-stone-800 mb-3">Supply Chain Checkpoints</h4>
                                    {checkpoints.length === 0 ? (
                                      <p className="text-sm text-stone-400 rounded-lg border border-dashed border-stone-200 p-4">No checkpoint records found for this QR.</p>
                                    ) : (
                                      <div className="space-y-3">
                                        {checkpoints.map((log: any, index: number) => (
                                          <div key={log.logId || log.checkpointId || index} className="flex gap-3">
                                            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{index + 1}</div>
                                            <div className="pb-3 border-b border-stone-100 flex-1">
                                              <p className="text-sm font-semibold text-stone-800">{log.checkpointType || log.checkpointName || log.eventType || 'Checkpoint'}</p>
                                              <p className="text-xs text-stone-500 mt-1">{log.locationName || log.checkpointName || '-'}</p>
                                              <p className="text-xs text-stone-400 mt-0.5">{new Date(log.timestamp || log.recordedAt || log.recorded_at || Date.now()).toLocaleString()}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-stone-800 mb-3">Transport & Shipment Status</h4>
                                    <div className="space-y-3">
                                      <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">Transport Logs</p>
                                        <p className="text-sm font-semibold text-stone-800 mt-1">{transport.length} movement record(s)</p>
                                      </div>
                                      <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">Export / Shipment</p>
                                        <p className="text-sm font-semibold text-stone-800 mt-1">{traceability.exportDetails?.status || 'Not shipped yet'}</p>
                                      </div>
                                      <p className="text-xs text-stone-500">This verification confirms the selected export batch has a traceable QR record before Logistics handoff.</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
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
    </div>
  );
}

function Documentation() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    apiService.getComplianceDocs().then(r => setDocs(r.data)).catch(() => { }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const reviewDoc = async (docId: string, status: string) => {
    try {
      await apiService.updateComplianceDocStatus(docId, { status });
      toast.success(`Document ${status.toLowerCase()}`);
      load();
    } catch {
      toast.error('Could not update document status');
    }
  };
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Export Documentation</h2>
      {loading ? <Spin /> : docs.length === 0 ? <Empty msg="No compliance documents yet" /> : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Type', 'Certification', 'Container', 'Status', 'Review', 'Generated', 'File'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {docs.map(d => (
                  <tr key={d.docId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800 flex items-center gap-2"><FileText className="w-4 h-4 text-rose-400" />{d.documentType || '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{d.certificationType}</td>
                    <td className="px-4 py-3 text-sky-700 font-medium">{d.shippingRecord?.containerNo || '—'}</td>
                    <td className="px-4 py-3"><Badge status={d.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => reviewDoc(d.docId, 'Approved')} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50" title="Approve export package"><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={() => reviewDoc(d.docId, 'Rejected')} className="p-1.5 rounded text-red-600 hover:bg-red-50" title="Reject and request resubmission"><XCircle className="w-4 h-4" /></button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(d.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                    <td className="px-4 py-3">
                      {d.fileUrl ? <button onClick={() => window.open(d.fileUrl, '_blank')} className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700"><Download className="w-3.5 h-3.5" /></button> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TraceabilityQR() {
  const [searchParams] = useSearchParams();
  const initialQrCode = searchParams.get('qr') || '';
  const [qrCode, setQrCode] = useState(initialQrCode);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (code = qrCode) => {
    const cleanCode = String(code || '').trim();
    if (!cleanCode) return;
    setLoading(true);
    try { const r = await apiService.getTraceability(cleanCode); setResult(r.data); }
    catch { toast.error('Batch not found'); setResult(null); }
    finally { setLoading(false); }
  }, [qrCode]);

  useEffect(() => {
    const urlQr = searchParams.get('qr') || '';
    if (!urlQr) return;
    setQrCode(urlQr);
    lookup(urlQr);
  }, [searchParams, lookup]);
  const resultCheckpoints = result?.checkpoints || result?.checkpointLogs || [];

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Traceability Verification</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <div className="flex gap-3">
          <input value={qrCode} onChange={e => setQrCode(e.target.value)} placeholder="Enter batch QR code…"
            className="flex-1 px-4 py-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          <button onClick={() => lookup()} disabled={loading || !qrCode}
            className="px-4 py-2.5 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />} Verify
          </button>
        </div>
        {result && (
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              {[['Farm', result.farmName], ['District', result.district], ['Status', result.status],
              ['Weight', `${Number(result.weightCherry).toLocaleString()} kg`],
              ['QR Code', result.qrCode], ['Created', new Date(result.createdAt).toLocaleDateString()]
              ].map(([l, v]) => (
                <div key={l} className="bg-stone-50 rounded-lg p-3">
                  <p className="text-xs text-stone-400 mb-1">{l}</p>
                  <p className="font-semibold text-stone-800 text-sm">{v}</p>
                </div>
              ))}
            </div>
            {resultCheckpoints.length > 0 && (
              <div>
                <h4 className="font-semibold text-stone-700 mb-3 text-sm">Supply Chain Journey</h4>
                <div className="space-y-3">
                  {resultCheckpoints.map((log: any, i: number) => (
                    <div key={log.logId || log.checkpointId || i} className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                      <div className="flex-1 pb-3 border-b border-stone-100">
                        <p className="text-sm font-semibold text-stone-800">{log.checkpointType || log.checkpointName || log.eventType || 'Checkpoint'}</p>
                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                          <MapPin className="w-3 h-3" />{log.locationName || log.checkpointName || '-'}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{new Date(log.timestamp || log.recordedAt || log.recorded_at || Date.now()).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockchainVerification() {
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Blockchain Verification</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-sm flex flex-col items-center gap-4">
        <Link2 className="w-12 h-12 text-stone-300" />
        <p className="text-sm font-medium text-stone-600">Blockchain Audit Trail</p>
        <p className="text-xs text-center max-w-md text-stone-500">
          Every QR checkpoint scan and compliance document is recorded with a tamper-proof timestamp.
          Full blockchain integration available in the next release phase.
        </p>
        <button onClick={() => toast.info('Blockchain audit log export coming soon')}
          className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 flex items-center gap-2">
          <Link2 className="w-4 h-4" /> View Audit Trail
        </button>
      </div>
    </div>
  );
}

function Reporting() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.getExporterReporting().then(r => setData(r.data)).catch(() => { }).finally(() => setLoading(false));
  }, []);
  if (loading) return <Spin />;
  const kpis = data?.exportKpis || {};
  const farmers = data?.aggregatedFarmers || {};
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Exporter Analytics & Reporting</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          ['On-time shipment rate', `${kpis.onTimeShipmentRate ?? 100}%`],
          ['Documentation accuracy', `${kpis.documentationAccuracy ?? 100}%`],
          ['Customs clearance time', `${kpis.customsClearanceHours ?? 0}h`],
          ['POD upload rate', `${kpis.podUploadRate ?? 100}%`],
          ['Freight cost variance', `$${kpis.freightCostVariance ?? 0}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="text-xl font-bold text-stone-800 mt-1">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Aggregated Farmer Metrics</h3>
          <div className="space-y-3">
            {[
              ['Total farmers', farmers.totalFarmers ?? 0],
              ['Active suppliers', farmers.activeFarmers ?? 0],
              ['Avg quality score', farmers.averageQualityScore ?? 0],
              ['Cherry volume', `${Number(farmers.totalCherryKg || 0).toLocaleString()} kg`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-600">{label}</span>
                <span className="font-semibold text-stone-800">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Anonymized Performance by District</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-stone-50">{['District', 'Farmers', 'Batches', 'Weight'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-stone-50">
                {(farmers.byDistrict || []).map((row: any) => (
                  <tr key={row.district}>
                    <td className="px-4 py-3 font-medium text-stone-800">{row.district}</td>
                    <td className="px-4 py-3 text-stone-600">{row.farmers}</td>
                    <td className="px-4 py-3 text-stone-600">{row.batches}</td>
                    <td className="px-4 py-3 text-stone-600">{Number(row.weightKg).toLocaleString()} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SustainabilityReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getExporterReporting()
      .then(r => setData(r.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;

  const farmers = data?.aggregatedFarmers || {};
  const kpis = data?.exportKpis || {};
  const sustainability = data?.sustainability || {};
  const sustainabilityTotals = sustainability.totals || {};
  const totalCherryKg = Number(farmers.totalCherryKg || 0);
  const activeFarmers = Number(farmers.activeFarmers || 0);
  const carbonKg = Number(sustainabilityTotals.carbonKg || 0);
  const waterLiters = Number(sustainabilityTotals.waterLiters || 0);
  const sustainabilityMetrics = [
    { label: 'Traceable export volume', value: `${totalCherryKg.toLocaleString()} kg`, sub: 'Certified/export-ready cherry volume', icon: Package, color: 'bg-emerald-600' },
    { label: 'Farmers represented', value: activeFarmers.toLocaleString(), sub: 'Aggregated and anonymized suppliers', icon: Globe, color: 'bg-sky-600' },
    { label: 'Recorded CO2 footprint', value: `${carbonKg.toLocaleString()} kg`, sub: 'From sustainability metric records', icon: Truck, color: 'bg-amber-600' },
    { label: 'Recorded water usage', value: `${waterLiters.toLocaleString()} L`, sub: 'From sustainability metric records', icon: Sprout, color: 'bg-teal-600' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Sustainability Report</h2>
        <button onClick={() => toast.info('Sustainability PDF export coming soon')}
          className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sustainabilityMetrics.map(metric => (
          <div key={metric.label} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${metric.color} flex items-center justify-center mb-3`}>
              <metric.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-stone-800">{metric.value}</p>
            <p className="text-sm font-semibold text-stone-700 mt-1">{metric.label}</p>
            <p className="text-xs text-stone-500 mt-1">{metric.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Export Sustainability KPIs</h3>
          <div className="space-y-3">
            {[
              ['On-time shipment rate', `${kpis.onTimeShipmentRate ?? 100}%`],
              ['Documentation accuracy', `${kpis.documentationAccuracy ?? 100}%`],
              ['POD upload rate', `${kpis.podUploadRate ?? 100}%`],
              ['Average quality score', farmers.averageQualityScore ?? 0],
              ['Social impact score', `${sustainabilityTotals.socialScore ?? 0}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                <span className="text-sm text-stone-600">{label}</span>
                <span className="font-semibold text-stone-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Buyer Reporting Scope</h3>
          <div className="space-y-3">
            {[
              ['Farmer privacy', 'Aggregated only, no personal farmer PII'],
              ['Traceability basis', 'Batch QR journey, checkpoint history, quality certificate'],
              ['Compliance use', 'NAEB/EUDR export package support'],
              ['Payment model', 'Farmer baseline payout tracked separately from export premium'],
            ].map(([label, value]) => (
              <div key={label} className="p-3 border border-stone-200 rounded-lg">
                <p className="text-sm font-semibold text-stone-800">{label}</p>
                <p className="text-xs text-stone-500 mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [form, setForm] = useState({ subject: '', category: 'NAEB/EUDR compliance', description: '' });
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    apiService.getExporterSupportTickets().then(r => setTickets(r.data)).catch(() => { }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async () => {
    if (!form.subject || !form.description) return;
    try {
      await apiService.createExporterSupportTicket(form);
      toast.success('Support ticket submitted');
      setForm({ subject: '', category: 'NAEB/EUDR compliance', description: '' });
      load();
    } catch {
      toast.error('Could not submit ticket');
    }
  };
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Export Help & Support</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm grid sm:grid-cols-3 gap-4">
        <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="px-3 py-2 rounded-lg border border-stone-200 text-sm" />
        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="px-3 py-2 rounded-lg border border-stone-200 text-sm">
          {['NAEB/EUDR compliance', 'Shipping API', 'Buyer documentation', 'Customs clearance'].map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={submit} className="px-4 py-2 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700">Submit Ticket</button>
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue" className="sm:col-span-3 px-3 py-2 rounded-lg border border-stone-200 text-sm min-h-24" />
      </div>
      {loading ? <Spin /> : tickets.map(t => (
        <div key={t.ticketId} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center justify-between"><p className="font-semibold text-stone-800">{t.subject}</p><Badge status={t.status} /></div>
          <p className="text-xs text-stone-500 mt-1">{t.category} - {new Date(t.createdAt).toLocaleString()}</p>
          <p className="text-sm text-stone-600 mt-2">{t.description}</p>
        </div>
      ))}
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
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Notifications</h2>
      {loading ? <Spin /> : notifs.length === 0 ? <Empty msg="No notifications yet" /> : notifs.map(n => (
        <div key={n.notificationId} className={`bg-white rounded-xl border p-4 shadow-sm flex gap-3 ${!n.read ? 'border-rose-200 bg-rose-50/30' : 'border-stone-200'}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-800">{n.title}</p>
            <p className="text-sm text-stone-600 mt-0.5">{n.message}</p>
            <p className="text-xs text-stone-400 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const SECTIONS: Record<string, React.ComponentType> = {
  overview: Overview, orders: ExportOrders, 'authorized-orders': AuthorizedOrders,
  traceability: TraceabilityQR, analytics: Reporting, reports: RoleReports, support: Support,
  blockchain: BlockchainVerification, notifications: Notifs,
};

export default function ExporterDashboard() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const Component = SECTIONS[section] || Overview;
  return <Component />;
}

