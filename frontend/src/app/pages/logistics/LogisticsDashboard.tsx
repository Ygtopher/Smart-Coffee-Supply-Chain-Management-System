import { Fragment, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { enqueueLogisticsWrite, getLogisticsQueue, syncLogisticsQueue } from '../../services/offlineSync';
import { RoleReports } from '../../components/RoleReports';
import {
  Ship, Boxes, CheckCircle2, Clock, AlertCircle, ArrowUpRight,
  MapPin, Package, Anchor, Navigation, Check, FileText, Download,
  Upload, Loader2, RefreshCw, Wifi, WifiOff, Plus, BarChart3, Truck,
  Smartphone, ExternalLink, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
    {sub && <p className="text-xs text-emerald-600 mt-1">{sub}</p>}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    delivered: 'bg-emerald-100 text-emerald-700',
    'in-transit': 'bg-blue-100 text-blue-700',
    dispatched: 'bg-sky-100 text-sky-700',
    scheduled: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    'export scheduled': 'bg-teal-100 text-teal-700',
    'ready for dispatch': 'bg-teal-100 text-teal-700',
    shipment_authorized: 'bg-emerald-100 text-emerald-700',
    'at port': 'bg-sky-100 text-sky-700',
    planned: 'bg-stone-100 text-stone-700',
    'at border': 'bg-amber-100 text-amber-700',
    'port arrived': 'bg-sky-100 text-sky-700',
    loaded: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    intact: 'bg-emerald-100 text-emerald-700',
    'checked - intact': 'bg-emerald-100 text-emerald-700',
    damaged: 'bg-red-100 text-red-700',
    replaced: 'bg-amber-100 text-amber-700',
    'customs clearance': 'bg-violet-100 text-violet-700',
    delayed: 'bg-amber-100 text-amber-700',
    'on hold': 'bg-orange-100 text-orange-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
    available: 'bg-emerald-100 text-emerald-700',
    ready: 'bg-emerald-100 text-emerald-700',
    verified: 'bg-emerald-100 text-emerald-700',
    waiting: 'bg-stone-100 text-stone-600',
    reserved: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    inactive: 'bg-stone-100 text-stone-600',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status?.toLowerCase()] || 'bg-stone-100 text-stone-600'}`}>
      {status}
    </span>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
  <div className="py-16 flex flex-col items-center text-stone-400">
    <Icon className="w-10 h-10 mb-3 text-stone-300" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

const getDocumentType = (fileUrl = '') => {
  const dataMatch = fileUrl.match(/^data:([^;,]+)/);
  if (dataMatch?.[1]) return dataMatch[1];
  const cleanUrl = fileUrl.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.pdf')) return 'application/pdf';
  if (/\.(png|jpe?g|webp|gif)$/.test(cleanUrl)) return 'image/*';
  return 'application/octet-stream';
};

const dataUrlToBlobUrl = async (fileUrl: string) => {
  const response = await fetch(fileUrl);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

const openDocumentUrl = async (fileUrl: string, fileName = 'pod-document') => {
  if (!fileUrl) return;
  if (!fileUrl.startsWith('data:')) {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const objectUrl = await dataUrlToBlobUrl(fileUrl);
  const tab = window.open(objectUrl, '_blank', 'noopener,noreferrer');
  if (!tab) {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
};

const downloadDocumentUrl = async (fileUrl: string, fileName = 'pod-document') => {
  if (!fileUrl) return;
  const anchor = document.createElement('a');
  if (fileUrl.startsWith('data:')) {
    const objectUrl = await dataUrlToBlobUrl(fileUrl);
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    return;
  }
  anchor.href = fileUrl;
  anchor.download = fileName;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.click();
};

function LogisticsSyncStatus() {
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const refresh = useCallback(async () => setQueueCount((await getLogisticsQueue()).length), []);
  useEffect(() => {
    refresh();
    const handleOnline = async () => {
      setOnline(true);
      const result = await syncLogisticsQueue(apiService.getToken());
      if (result.synced > 0) toast.success(`Synced ${result.synced} logistics record(s)`);
      refresh();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('logistics-sync-queue-changed', refresh);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('logistics-sync-queue-changed', refresh);
    };
  }, [refresh]);
  const syncNow = async () => {
    const result = await syncLogisticsQueue(apiService.getToken());
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

async function saveLogisticsWrite(endpoint: string, method: 'POST' | 'PATCH', body: Record<string, any>, onlineAction: () => Promise<any>) {
  if (!navigator.onLine) {
    await enqueueLogisticsWrite(endpoint, method, body);
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
    await enqueueLogisticsWrite(endpoint, method, body);
    toast.success('Connection failed, so this was saved locally for sync.');
    return { queued: true };
  }
}

function useShipments() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getShipments();
      setShipments(res.data);
    } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);
  return { shipments, loading, refetch: fetch };
}

function useRoadTransports() {
  const [roadTransports, setRoadTransports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getRoadTransports();
      setRoadTransports(response.data || []);
    } catch {
      setRoadTransports([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetch(); }, [fetch]);
  return { roadTransports, loading, refetch: fetch };
}

function Overview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { shipments, loading, refetch } = useShipments();
  const [dashboard, setDashboard] = useState<any>(null);
  const [readyBatches, setReadyBatches] = useState<any[]>([]);
  const [readyLoading, setReadyLoading] = useState(true);
  const [bookingBatch, setBookingBatch] = useState<any | null>(null);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    containerNo: '',
    vesselName: '',
    portLoading: 'Mombasa',
    portDestination: '',
    shippingLine: '',
    incoterm: 'FOB',
    quotedFreightCost: '',
    actualFreightCost: '',
    insuranceDetails: '',
    customsStatus: 'Draft',
    naebLicense: '',
    eudrVerifiedLoc: '',
    destinationMarket: '',
  });
  const active = shipments.filter(s => !['Delivered', 'Cancelled'].includes(s.status)).length;
  const inTransit = shipments.filter(s => s.status === 'In Transit').length;
  const delivered = shipments.filter(s => s.status === 'Delivered').length;
  const totalKg = shipments.reduce((s, sh) => s + Number(sh.batch?.weightCherry || 0), 0);
  const bookedBatchIds = new Set(shipments.map(s => s.batchId).filter(Boolean));
  const unbookedReadyBatches = readyBatches.filter(b => !bookedBatchIds.has(b.batchId));

  const loadReadyBatches = useCallback(async () => {
    setReadyLoading(true);
    try {
      const res = await apiService.getApprovedBatches();
      setReadyBatches(res.data || []);
    } catch {
      setReadyBatches([]);
    } finally {
      setReadyLoading(false);
    }
  }, []);
  useEffect(() => {
    apiService.getLogisticsDashboard().then(r => setDashboard(r.data)).catch(() => {});
    loadReadyBatches();
  }, [loadReadyBatches]);

  const openBooking = (batch: any) => {
    setBookingBatch(batch);
    setBookingForm({
      containerNo: '',
      vesselName: '',
      portLoading: 'Mombasa',
      portDestination: '',
      shippingLine: '',
      incoterm: 'FOB',
      quotedFreightCost: '',
      actualFreightCost: '',
      insuranceDetails: '',
      customsStatus: 'Draft',
      naebLicense: '',
      eudrVerifiedLoc: batch.checkpointLocation || batch.coordinates || '',
      destinationMarket: '',
    });
  };

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!bookingBatch) return;
    setBookingSaving(true);
    const payload = {
      batchId: bookingBatch.batchId,
      ...bookingForm,
      quotedFreightCost: Number(bookingForm.quotedFreightCost || 0),
      actualFreightCost: Number(bookingForm.actualFreightCost || 0),
    };
    try {
      const result = await saveLogisticsWrite('/exports/shipments', 'POST', payload, () => apiService.createShipment(payload));
      toast.success((result as any).queued ? 'Shipment booking saved locally for sync' : 'Shipment booked and export documents generated');
      setBookingBatch(null);
      await Promise.all([refetch(), loadReadyBatches()]);
    } finally {
      setBookingSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-sky-700 to-sky-500 rounded-2xl p-5 text-white">
        <p className="text-sky-100 text-sm mb-1">{t('welcome')},</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{user?.name || 'Logistics Operations'}</h2>
            <p className="text-sky-100 text-sm mt-1">Port operations, freight, customs clearance, and POD tracking</p>
          </div>
          <LogisticsSyncStatus />
        </div>
        <p className="text-sky-100 text-sm mt-1">Port Operations • Freight &amp; Customs Clearance</p>
        <div className="mt-4 pt-4 border-t border-sky-600 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Shipments', value: loading ? '…' : String(shipments.length) },
            { label: 'Active', value: loading ? '…' : String(active) },
            { label: 'Delivered', value: loading ? '…' : String(delivered) },
            { label: 'Total Volume', value: loading ? '…' : `${totalKg.toLocaleString()} kg` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-sky-200 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label={t('logistics.active_shipments')} value={active} icon={Ship} color="bg-sky-600" />
            <KPICard label={t('logistics.in_transit')} value={inTransit} icon={Navigation} color="bg-blue-600" />
            <KPICard label={t('logistics.delivered')} value={delivered} icon={CheckCircle2} color="bg-emerald-600" />
            <KPICard label="Total Volume" value={`${totalKg.toLocaleString()} kg`} icon={Package} color="bg-amber-600" />
          </div>

          <div className="grid lg:grid-cols-[1.7fr_1fr] gap-5">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-stone-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-800">Export-ready batches</h3>
                  <p className="text-xs text-stone-500 mt-1">Quality-approved batches waiting for container booking and export documents.</p>
                </div>
                <button onClick={loadReadyBatches} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {readyLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
              ) : unbookedReadyBatches.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon={Package} message="No export-ready batches waiting for shipment" />
                  <p className="text-center text-xs text-stone-500 -mt-10 pb-8">Batches appear here after Quality Controller approval.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                      <tr>
                        <th className="text-left px-5 py-3">Batch</th>
                        <th className="text-left px-5 py-3">Origin</th>
                        <th className="text-left px-5 py-3">Quality</th>
                        <th className="text-left px-5 py-3">Weight</th>
                        <th className="text-left px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {unbookedReadyBatches.slice(0, 6).map(batch => {
                        const assessment = batch.qualityAssessments?.[0];
                        return (
                          <tr key={batch.batchId} className="hover:bg-stone-50">
                            <td className="px-5 py-3">
                              <p className="font-semibold text-stone-800">{batch.qrCode || batch.batchId?.slice(0, 8)}</p>
                              <p className="text-xs text-stone-400">{batch.status}</p>
                            </td>
                            <td className="px-5 py-3">
                              <p className="font-medium text-stone-700">{batch.farmName || 'Farm origin'}</p>
                              <p className="text-xs text-stone-400">{batch.district || 'Location pending'}</p>
                            </td>
                            <td className="px-5 py-3">
                              <p className="font-medium text-stone-700">{assessment?.qualityGrade || assessment?.tier || 'Approved'}</p>
                              <p className="text-xs text-stone-400">{assessment?.cuppingScore ? `${assessment.cuppingScore} pts` : 'Certificate ready'}</p>
                            </td>
                            <td className="px-5 py-3 font-semibold text-stone-800">{Number(batch.weightCherry || 0).toLocaleString()} kg</td>
                            <td className="px-5 py-3">
                              <button onClick={() => openBooking(batch)} className="px-3 py-1.5 bg-sky-600 text-white text-xs rounded-lg hover:bg-sky-700">
                                Book Shipment
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <h3 className="font-semibold text-stone-800 mb-4">Next logistics actions</h3>
              <div className="space-y-3">
                {[
                  ['Book shipment', 'Select an export-ready batch, assign container, carrier or vessel name, Incoterm, ports, and freight cost.'],
                  ['Generate documents', 'Commercial invoice, packing list, certificate of origin, NAEB license, and EUDR proof are created from verified batch data.'],
                  ['Track movement', 'Update scheduled, dispatched, in transit, customs, and delivered statuses as the shipment moves.'],
                  ['Confirm POD', 'Upload proof of delivery and close the shipment for exporter/admin visibility.'],
                ].map(([title, copy], index) => (
                  <div key={title} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center text-xs font-bold">{index + 1}</div>
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg bg-stone-50 border border-stone-100 p-3">
                <p className="text-xs text-stone-500">Current KPI snapshot</p>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div><p className="text-stone-400">On-time</p><p className="font-bold text-stone-800">{dashboard?.kpis?.onTimeShipmentRate ?? 100}%</p></div>
                  <div><p className="text-stone-400">Docs accuracy</p><p className="font-bold text-stone-800">{dashboard?.kpis?.documentationAccuracy ?? 100}%</p></div>
                  <div><p className="text-stone-400">Customs</p><p className="font-bold text-stone-800">{dashboard?.kpis?.customsClearanceHours ?? 0}h</p></div>
                  <div><p className="text-stone-400">POD upload</p><p className="font-bold text-stone-800">{dashboard?.kpis?.podUploadRate ?? 100}%</p></div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-stone-800">Recent Shipments</h3>
            {shipments.length === 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 p-5">
                <EmptyState icon={Ship} message="No shipments booked yet" />
                <p className="text-center text-xs text-stone-500 -mt-10 pb-8">Use Export-ready batches above or Containers to book the first shipment.</p>
              </div>
            ) : shipments.slice(0, 5).map(s => (
              <div key={s.shipmentId} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-stone-800">{s.containerNo}</h4>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{s.vesselName} • {s.portLoading} → {s.portDestination}</p>
                  </div>
                  <div className="text-right text-xs text-stone-500">
                    <p>{Number(s.batch?.weightCherry || 0).toLocaleString()} kg</p>
                    <p className="text-stone-400">{s.batch?.district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-stone-50 rounded-lg p-3">
                  <div className="text-center min-w-0">
                    <MapPin className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-stone-700 truncate">{s.portLoading}</p>
                  </div>
                  <div className="flex-1 relative h-0.5 bg-stone-200">
                    <div className={`absolute top-0 left-0 h-full bg-sky-500 transition-all ${s.status === 'Delivered' ? 'w-full' : s.status === 'In Transit' ? 'w-1/2' : s.status === 'Dispatched' ? 'w-1/4' : 'w-0'}`} />
                  </div>
                  <div className="text-center min-w-0">
                    <Anchor className="w-4 h-4 text-sky-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-stone-700 truncate">{s.portDestination}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {bookingBatch && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={submitBooking} className="bg-white rounded-xl border border-stone-200 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-stone-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-800">Book Shipment</h3>
                <p className="text-xs text-stone-500 mt-1">{bookingBatch.farmName} - {bookingBatch.district} - {Number(bookingBatch.weightCherry || 0).toLocaleString()} kg</p>
              </div>
              <button type="button" onClick={() => setBookingBatch(null)} className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm hover:bg-stone-50">
                Close
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['containerNo', 'Container no'],
                  ['vesselName', 'Carrier / vessel name'],
                  ['shippingLine', 'Shipping line or logistics agent'],
                  ['portLoading', 'Port loading'],
                  ['portDestination', 'Port destination'],
                  ['destinationMarket', 'Destination market'],
                  ['quotedFreightCost', 'Quoted freight cost'],
                  ['actualFreightCost', 'Actual freight cost'],
                  ['naebLicense', 'NAEB license'],
                  ['eudrVerifiedLoc', 'EUDR verified location'],
                ].map(([key, placeholder]) => (
                  <input
                    key={key}
                    required={['containerNo', 'vesselName', 'portDestination'].includes(key)}
                    value={(bookingForm as any)[key]}
                    onChange={e => setBookingForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50"
                  />
                ))}
                <select value={bookingForm.incoterm} onChange={e => setBookingForm(f => ({ ...f, incoterm: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
                  {['FOB', 'CIF', 'EXW', 'CFR', 'DAP'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
                <select value={bookingForm.customsStatus} onChange={e => setBookingForm(f => ({ ...f, customsStatus: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
                  {['Draft', 'Submitted', 'Cleared', 'Held'].map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <textarea value={bookingForm.insuranceDetails} onChange={e => setBookingForm(f => ({ ...f, insuranceDetails: e.target.value }))} placeholder="Insurance documentation/details" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[80px]" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setBookingBatch(null)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm hover:bg-stone-50">Cancel</button>
                <button disabled={bookingSaving} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 flex items-center gap-2">
                  {bookingSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Book Container & Generate Docs
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ShipmentTracking() {
  const { shipments, loading, refetch } = useShipments();

  const handleUpdateStatus = async (shipmentId: string, status: string) => {
    try {
      const details = status === 'Delivered'
        ? { podUrl: window.prompt('Proof of Delivery document URL') || '', portArrivalAt: new Date().toISOString(), customsStatus: 'Cleared' }
        : status === 'In Transit'
          ? { portDepartureAt: new Date().toISOString(), transitCondition: 'Normal', customsStatus: 'Submitted' }
          : { portDepartureAt: new Date().toISOString() };
      const result = await saveLogisticsWrite(`/exports/shipments/${shipmentId}/status`, 'PATCH', { status, ...details }, () => apiService.updateShipmentStatus(shipmentId, status, details));
      toast.success((result as any).queued ? 'Shipment update saved locally for sync' : `Shipment marked as ${status}`);
      refetch();
    } catch { toast.error('Failed to update shipment'); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Shipment Tracking</h2>
        <button onClick={refetch} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
      ) : shipments.length === 0 ? (
        <EmptyState icon={Ship} message="No shipments to track" />
      ) : shipments.map(s => {
        const events = [
          { event: `Cargo loaded at ${s.portLoading}`, done: true, icon: Package },
          { event: `Vessel: ${s.vesselName}`, done: s.status !== 'Scheduled', icon: Ship },
          { event: 'In transit to destination', done: s.status === 'In Transit' || s.status === 'Delivered', icon: Navigation },
          { event: `Arrival at ${s.portDestination}`, done: s.status === 'Delivered', icon: Anchor },
        ];
        return (
          <div key={s.shipmentId} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-stone-800">{s.containerNo}</h4>
                <p className="text-xs text-stone-400 mt-0.5">{s.portLoading} → {s.portDestination}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="space-y-3 mb-4">
              {events.map((ev, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${ev.done ? 'bg-emerald-600' : 'bg-stone-100'}`}>
                    <ev.icon className={`w-3.5 h-3.5 ${ev.done ? 'text-white' : 'text-stone-400'}`} />
                  </div>
                  <div className="flex-1 pb-3 border-b border-stone-50">
                    <p className={`text-sm font-medium ${ev.done ? 'text-stone-800' : 'text-stone-400'}`}>{ev.event}</p>
                  </div>
                </div>
              ))}
            </div>
            {s.status !== 'Delivered' && (
              <div className="flex gap-2">
                {s.status === 'Scheduled' && (
                  <button onClick={() => handleUpdateStatus(s.shipmentId, 'Dispatched')}
                    className="px-3 py-1.5 bg-sky-600 text-white text-xs rounded-lg hover:bg-sky-700">Mark Dispatched</button>
                )}
                {s.status === 'Dispatched' && (
                  <button onClick={() => handleUpdateStatus(s.shipmentId, 'In Transit')}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Mark In Transit</button>
                )}
                {s.status === 'In Transit' && (
                  <button onClick={() => handleUpdateStatus(s.shipmentId, 'Delivered')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg hover:bg-emerald-700">
                    <Check className="w-3.5 h-3.5" /> Confirm Delivery
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContainerManagement() {
  const { shipments, loading, refetch } = useShipments();
  const [authorizedOrders, setAuthorizedOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [authorizedOrdersError, setAuthorizedOrdersError] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState<'authorized' | 'create'>('authorized');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('All Stages');
  const [shipmentSort, setShipmentSort] = useState('newest');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'coffee' | 'documents' | 'transit'>('overview');
  const [form, setForm] = useState({
    orderId: '', batchId: '', containerNo: '', vesselName: '', portLoading: 'Mombasa', portDestination: '',
    shippingLine: '', incoterm: 'FOB', quotedFreightCost: '', actualFreightCost: '',
    insuranceDetails: '', customsStatus: 'Draft', naebLicense: '', eudrVerifiedLoc: '', destinationMarket: '',
    containerType: '20 ft', sealNo: '', loadedWeightKg: '', loadingDate: '', departureDate: '', estimatedArrivalDate: ''
  });
  const loadAuthorizedOrders = useCallback(async () => {
    setOrdersLoading(true);
    setAuthorizedOrdersError('');
    try {
      const response = await apiService.getLogisticsAuthorizedOrders();
      setAuthorizedOrders(response.data || []);
    } catch (error: any) {
      setAuthorizedOrders([]);
      setAuthorizedOrdersError(
        String(error?.message || '').includes('404')
          ? 'The exporter-authorized orders endpoint is not loaded in the running backend. Restart the backend server, then refresh this page.'
          : error?.message || 'Could not load exporter-authorized customer orders'
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);
  useEffect(() => {
    loadAuthorizedOrders();
  }, [loadAuthorizedOrders]);
  const selectedAuthorizedOrder = authorizedOrders.find(order => order.orderId === form.orderId);
  const shipmentBatchOptions = selectedAuthorizedOrder?.allocations?.filter((allocation: any) => !allocation.shipmentId) || [];
  const selectedShipmentAllocation = shipmentBatchOptions.find((allocation: any) => allocation.batchId === form.batchId);
  const openAuthorizedOrders = authorizedOrders.filter(order => (order.allocations || []).some((allocation: any) => !allocation.shipmentId));
  const shippedAuthorizedOrders = authorizedOrders.filter(order => (order.allocations || []).length > 0 && !(order.allocations || []).some((allocation: any) => !allocation.shipmentId));
  const orderAllocationTotal = (order: any) => (order.allocations || []).reduce((sum: number, allocation: any) => sum + Number(allocation.allocatedWeightKg || 0), 0);
  const orderUnshippedTotal = (order: any) => (order.allocations || [])
    .filter((allocation: any) => !allocation.shipmentId)
    .reduce((sum: number, allocation: any) => sum + Number(allocation.allocatedWeightKg || 0), 0);
  const chooseAuthorizedOrder = (orderId: string) => {
    const order = authorizedOrders.find(row => row.orderId === orderId);
    const openAllocations = order?.allocations?.filter((allocation: any) => !allocation.shipmentId) || [];
    const firstAllocation = openAllocations[0];
    const totalAuthorizedKg = openAllocations.reduce((sum: number, allocation: any) => sum + Number(allocation.allocatedWeightKg || 0), 0);
    setForm(current => ({
      ...current,
      orderId,
      batchId: firstAllocation?.batchId || '',
      loadedWeightKg: totalAuthorizedKg ? String(totalAuthorizedKg) : '',
      destinationMarket: order?.country || current.destinationMarket,
      portDestination: current.portDestination || 'Mombasa Port',
    }));
  };
  const chooseShipmentBatch = (batchId: string) => {
    const allocation = shipmentBatchOptions.find((item: any) => item.batchId === batchId);
    const batch = allocation?.batch;
    setForm(current => ({
      ...current,
      batchId,
      loadedWeightKg: allocation ? String(allocation.allocatedWeightKg || batch?.weightCherry || '') : batch ? String(batch.weightCherry) : '',
    }));
  };
  const active = shipments.filter(s => !['Delivered', 'Cancelled'].includes(s.status)).length;
  const delivered = shipments.filter(s => s.status === 'Delivered').length;
  const stages = ['All Stages', 'Ready for Dispatch', 'At Port', 'In Transit', 'Customs Clearance', 'Delivered', 'Delayed', 'On Hold', 'Cancelled'];
  const filteredShipments = shipments
    .filter(shipment => stageFilter === 'All Stages' || shipment.status === stageFilter)
    .filter(shipment => {
      const query = shipmentSearch.toLowerCase().trim();
      if (!query) return true;
      return [shipment.shipmentId, shipment.containerNo, shipment.vesselName, shipment.portDestination, shipment.batch?.qrCode]
        .some(value => String(value || '').toLowerCase().includes(query));
    })
    .sort((left, right) => {
      if (shipmentSort === 'destination') return String(left.portDestination || '').localeCompare(String(right.portDestination || ''));
      if (shipmentSort === 'weight') return Number(right.batch?.weightCherry || 0) - Number(left.batch?.weightCherry || 0);
      const leftDate = new Date(shipmentSort === 'eta' ? (left.estimatedArrivalDate || 0) : (left.departureDate || left.shippedAt || 0)).getTime();
      const rightDate = new Date(shipmentSort === 'eta' ? (right.estimatedArrivalDate || 0) : (right.departureDate || right.shippedAt || 0)).getTime();
      return rightDate - leftDate;
    });
  const selectedShipment = shipments.find(shipment => shipment.shipmentId === selectedShipmentId) || null;
  const shipmentStages = ['Ready for Dispatch', 'At Port', 'In Transit', 'Customs Clearance', 'Delayed', 'On Hold', 'Cancelled'];
  const formatShipmentDate = (value: any) => value ? new Date(value).toLocaleDateString() : '-';

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Authorized Orders</h2>
          <p className="text-sm text-stone-500 mt-1">Orders sent by Exporter with reserved coffee batches ready for Logistics shipment preparation.</p>
        </div>
        <div className="flex items-center gap-2">
          <LogisticsSyncStatus />
          <button onClick={loadAuthorizedOrders} className="p-2 border border-stone-200 rounded-lg text-stone-500 hover:bg-stone-50">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      {workspaceTab === 'authorized' && (
        <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-stone-800">Authorized Customer Orders</h3>
              <p className="text-xs text-stone-500 mt-1">Exporter-approved orders with reserved coffee batches ready for Logistics shipment preparation.</p>
            </div>
            <button onClick={loadAuthorizedOrders} className="p-2 border border-stone-200 rounded-lg text-stone-500 hover:bg-stone-50"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {ordersLoading ? (
            <div className="py-10 text-center text-stone-400">Loading authorized orders...</div>
          ) : authorizedOrdersError ? (
            <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {authorizedOrdersError}
            </div>
          ) : openAuthorizedOrders.length === 0 ? (
            <EmptyState icon={Package} message="No customer orders authorized for Logistics yet" />
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      {['Reference','Customer','Contact','Coffee','Authorized Batches','Action'].map(header => (
                        <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {openAuthorizedOrders.map(order => {
                      const isSelected = form.orderId === order.orderId;
                      return (
                        <Fragment key={order.orderId}>
                          <tr
                            onClick={() => chooseAuthorizedOrder(isSelected ? '' : order.orderId)}
                            className={`cursor-pointer ${isSelected ? 'bg-sky-50' : 'hover:bg-stone-50'}`}
                          >
                            <td className="px-4 py-3">
                              <p className="font-mono text-xs font-semibold text-stone-800">{order.referenceCode || order.orderId.slice(0, 8)}</p>
                              <p className="text-stone-400">{new Date(order.orderDate).toLocaleDateString()}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-stone-800">{order.buyer}</p>
                              <p className="text-stone-400">{order.companyName || order.customerEmail || 'Customer order'}</p>
                            </td>
                            <td className="px-4 py-3 text-stone-600">
                              <p>{order.customerEmail || '-'}</p>
                              <p className="text-stone-400">{order.customerPhone || '-'}</p>
                            </td>
                            <td className="px-4 py-3 text-stone-600">
                              <p>{order.grade} - {order.qualitySpecs?.coffeeType || 'Any variety'}</p>
                              <p className="text-stone-400">{Number(order.weight || 0).toLocaleString()} kg requested</p>
                            </td>
                            <td className="px-4 py-3 text-stone-600">
                              <div className="space-y-1">
                                {(order.allocations || []).map((allocation: any) => (
                                  <p key={allocation.allocationId} className="font-mono text-xs">
                                    {allocation.batch?.qrCode || allocation.batchId.slice(0, 8)} - {Number(allocation.allocatedWeightKg || 0).toLocaleString()} kg
                                    {allocation.shipmentId ? ' - shipment created' : ''}
                                  </p>
                                ))}
                              </div>
                              <p className="mt-1 text-xs font-semibold text-emerald-700">{orderUnshippedTotal(order).toLocaleString()} kg unshipped</p>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={event => {
                                  event.stopPropagation();
                                  chooseAuthorizedOrder(order.orderId);
                                  setWorkspaceTab('create');
                                }}
                                className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700"
                              >
                                Create Shipment
                              </button>
                            </td>
                          </tr>
                          {isSelected && (
                            <tr className="bg-sky-50">
                              <td colSpan={6} className="p-4">
                                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <h4 className="font-semibold text-sky-950">{order.referenceCode || order.orderId.slice(0, 8)} - {order.buyer}</h4>
                                      <p className="text-xs text-sky-700 mt-1">{order.customerEmail || 'No email'} | {order.customerPhone || 'No phone recorded'}</p>
                                    </div>
                                  </div>
                                  <div className="grid sm:grid-cols-4 gap-3 mt-4 text-xs">
                                    <div className="rounded-lg bg-white border border-sky-100 p-3"><p className="text-sky-700">Requested</p><p className="font-bold text-sky-950">{Number(order.weight || 0).toLocaleString()} kg</p></div>
                                    <div className="rounded-lg bg-white border border-sky-100 p-3"><p className="text-sky-700">Authorized</p><p className="font-bold text-sky-950">{orderAllocationTotal(order).toLocaleString()} kg</p></div>
                                    <div className="rounded-lg bg-white border border-sky-100 p-3"><p className="text-sky-700">Unshipped</p><p className="font-bold text-sky-950">{orderUnshippedTotal(order).toLocaleString()} kg</p></div>
                                    <div className="rounded-lg bg-white border border-sky-100 p-3"><p className="text-sky-700">Coffee</p><p className="font-bold text-sky-950">{order.grade} - {order.qualitySpecs?.coffeeType || 'Any'}</p></div>
                                  </div>
                                  <div className="mt-4 overflow-x-auto rounded-lg border border-sky-100 bg-white">
                                    <table className="w-full text-xs">
                                      <thead className="bg-sky-50 text-sky-700 uppercase">
                                        <tr>{['Batch QR', 'Farm / Washing Station', 'Variety', 'Authorized kg', 'Shipment'].map(header => <th key={header} className="px-3 py-2 text-left font-semibold">{header}</th>)}</tr>
                                      </thead>
                                      <tbody className="divide-y divide-sky-50">
                                        {(order.allocations || []).map((allocation: any) => (
                                          <tr key={allocation.allocationId}>
                                            <td className="px-3 py-2 font-mono font-semibold">{allocation.batch?.qrCode || allocation.batchId.slice(0, 8)}</td>
                                            <td className="px-3 py-2">{allocation.batch?.farmName || '-'}<p className="text-stone-400">{allocation.batch?.washingStation || '-'}</p></td>
                                            <td className="px-3 py-2">{allocation.batch?.coffeeVariety || 'Red Bourbon'}</td>
                                            <td className="px-3 py-2">{Number(allocation.allocatedWeightKg || 0).toLocaleString()} kg</td>
                                            <td className="px-3 py-2">{allocation.shipmentId ? <StatusBadge status="Shipment Created" /> : <StatusBadge status="Ready" />}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
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
        </section>
      )}
      {workspaceTab === 'create' && (
        !selectedAuthorizedOrder ? (
          <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <EmptyState icon={Package} message="Select an authorized customer order before creating a shipment" />
            <button type="button" onClick={() => setWorkspaceTab('authorized')} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold">Go to Authorized Orders</button>
          </section>
        ) : shipmentBatchOptions.length === 0 ? (
          <section className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <EmptyState icon={CheckCircle2} message="All authorized batch allocations for this order already have shipments" />
            <button type="button" onClick={() => setWorkspaceTab('authorized')} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold">Back to Authorized Orders</button>
          </section>
        ) : (
        <form onSubmit={async e => {
          e.preventDefault();
          const payload = {
            orderId: form.orderId,
            batchId: form.batchId,
            batchIds: shipmentBatchOptions.map((allocation: any) => allocation.batchId),
            containerNo: form.containerNo,
            containerType: form.containerType,
            sealNo: form.sealNo,
            loadedWeightKg: orderUnshippedTotal(selectedAuthorizedOrder),
            loadingDate: form.loadingDate,
            portDestination: form.portDestination,
            destinationMarket: form.destinationMarket,
          };
          const result = await saveLogisticsWrite('/exports/shipments', 'POST', payload, () => apiService.createShipment(payload));
          toast.success((result as any).queued ? 'Shipment setup saved locally for sync' : 'Shipment container setup created');
          setWorkspaceTab('authorized');
          setForm(current => ({ ...current, orderId: '', batchId: '', containerNo: '', sealNo: '', loadedWeightKg: '', loadingDate: '' }));
          await Promise.all([refetch(), loadAuthorizedOrders()]);
        }} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-stone-800">Create Shipment</h3>
              <p className="text-xs text-stone-500 mt-1">Prepare one sealed container from an exporter-authorized customer order allocation.</p>
            </div>
            <button type="button" onClick={() => setWorkspaceTab('authorized')} className="px-3 py-2 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold hover:bg-stone-50">Back to Authorized Orders</button>
          </div>
          <div className="border-t border-stone-100 pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-stone-500">1. Customer Order</p>
            {selectedAuthorizedOrder && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs">
                <div><p className="text-sky-700">Reference</p><p className="font-semibold text-sky-950">{selectedAuthorizedOrder.referenceCode || selectedAuthorizedOrder.orderId.slice(0, 8)}</p></div>
                <div><p className="text-sky-700">Customer</p><p className="font-semibold text-sky-950">{selectedAuthorizedOrder.buyer}</p></div>
                <div><p className="text-sky-700">Contact</p><p className="font-semibold text-sky-950">{selectedAuthorizedOrder.customerEmail || '-'}</p></div>
                <div><p className="text-sky-700">Coffee</p><p className="font-semibold text-sky-950">{selectedAuthorizedOrder.grade} - {selectedAuthorizedOrder.qualitySpecs?.coffeeType || 'Any variety'}</p></div>
                <div><p className="text-sky-700">Requested</p><p className="font-semibold text-sky-950">{Number(selectedAuthorizedOrder.weight || 0).toLocaleString()} kg</p></div>
                <div><p className="text-sky-700">Authorized</p><p className="font-semibold text-sky-950">{orderAllocationTotal(selectedAuthorizedOrder).toLocaleString()} kg</p></div>
                <div><p className="text-sky-700">Unshipped</p><p className="font-semibold text-sky-950">{orderUnshippedTotal(selectedAuthorizedOrder).toLocaleString()} kg</p></div>
                <div><p className="text-sky-700">Destination Market</p><p className="font-semibold text-sky-950">{selectedAuthorizedOrder.country || form.destinationMarket || '-'}</p></div>
              </div>
            )}
          </div>
          <div className="border-t border-stone-100 pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-stone-500">2. Authorized Batch Allocation</p>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <p className="font-semibold text-emerald-900">All authorized unshipped allocations for this order</p>
                <p className="text-emerald-700">{shipmentBatchOptions.length} batch allocation{shipmentBatchOptions.length === 1 ? '' : 's'} | {orderUnshippedTotal(selectedAuthorizedOrder).toLocaleString()} kg total</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-emerald-100/70 text-emerald-800 uppercase">
                    <tr>
                      {['Batch QR', 'Farm / Origin', 'Washing Station', 'Variety', 'Authorized KG', 'Shipment Target'].map(header => (
                        <th key={header} className="px-3 py-2 text-left font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 bg-white">
                    {shipmentBatchOptions.map((allocation: any) => {
                      const isShipmentTarget = allocation.batchId === form.batchId;
                      return (
                        <tr key={allocation.allocationId || allocation.batchId} className={isShipmentTarget ? 'bg-emerald-50' : ''}>
                          <td className="px-3 py-2 font-mono font-semibold text-stone-800">{allocation.batch?.qrCode || allocation.batchId.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-stone-700">{allocation.batch?.farmName || '-'}</td>
                          <td className="px-3 py-2 text-stone-700">{allocation.batch?.washingStation || '-'}</td>
                          <td className="px-3 py-2 text-stone-700">{allocation.batch?.coffeeVariety || 'Red Bourbon'}</td>
                          <td className="px-3 py-2 font-semibold text-stone-800">{Number(allocation.allocatedWeightKg || 0).toLocaleString()} kg</td>
                          <td className="px-3 py-2">{isShipmentTarget ? <StatusBadge status="Primary Batch" /> : <StatusBadge status="Included" />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-100 pt-4 space-y-3">
            <p className="text-xs font-semibold uppercase text-stone-500">3. Container Setup</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-stone-600">Container number</span>
                <input required value={form.containerNo} onChange={event => setForm(current => ({ ...current, containerNo: event.target.value }))} placeholder="e.g. MSCU1234567" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-stone-600">Container type</span>
                <select value={form.containerType} onChange={event => setForm(current => ({ ...current, containerType: event.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
                  {['20 ft', '40 ft'].map(option => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-stone-600">Security seal number</span>
                <input required value={form.sealNo} onChange={event => setForm(current => ({ ...current, sealNo: event.target.value }))} placeholder="Enter seal reference" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-stone-600">Loaded coffee weight</span>
                <input readOnly value={orderUnshippedTotal(selectedAuthorizedOrder) ? `${orderUnshippedTotal(selectedAuthorizedOrder).toLocaleString()} kg` : ''} placeholder="Set by authorized allocations" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-100" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-stone-600">Container loading date</span>
                <input type="date" required value={form.loadingDate} onChange={event => setForm(current => ({ ...current, loadingDate: event.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-stone-600">Destination port</span>
                <input required value={form.portDestination} onChange={event => setForm(current => ({ ...current, portDestination: event.target.value }))} placeholder="Port receiving cargo" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-stone-600">Destination market</span>
                <input value={form.destinationMarket} onChange={event => setForm(current => ({ ...current, destinationMarket: event.target.value }))} placeholder="e.g. Belgium" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
              </label>
            </div>
          </div>
          <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg p-3">After this container setup is created, use Road Transport for truck movement and Proof of Delivery after the truck company confirms delivery.</p>
          <button disabled={!form.orderId || !form.batchId || !selectedShipmentAllocation} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:bg-stone-300 disabled:cursor-not-allowed">Create Shipment</button>
        </form>
        )
      )}
      {false && <><div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Containers', value: loading ? '…' : String(shipments.length), color: 'bg-sky-50 text-sky-700 border-sky-200' },
          { label: 'Active', value: loading ? '…' : String(active), color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Delivered', value: loading ? '…' : String(delivered), color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border-2 ${s.color} p-4`}>
            <p className="text-xs font-semibold uppercase">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h3 className="font-semibold text-stone-800">Shipment Pipeline</h3>
            <p className="text-xs text-stone-500 mt-1">Traceable export lots assigned to containers and delivery stages.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input value={shipmentSearch} onChange={event => setShipmentSearch(event.target.value)} placeholder="Search shipment, batch, or carrier" className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-stone-50 min-w-[210px]" />
            <select value={stageFilter} onChange={event => setStageFilter(event.target.value)} aria-label="Filter shipment stage" className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-stone-50">
              {stages.map(stage => <option key={stage}>{stage}</option>)}
            </select>
            <select value={shipmentSort} onChange={event => setShipmentSort(event.target.value)} aria-label="Sort shipments" className="px-3 py-2 border border-stone-200 rounded-lg text-xs bg-stone-50">
              <option value="newest">Departure date</option>
              <option value="eta">ETA</option>
              <option value="destination">Destination</option>
              <option value="weight">Weight</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : filteredShipments.length === 0 ? (
          <EmptyState icon={Boxes} message="No shipments match the selected filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase">
                <tr>{['Shipment / Container', 'Batch / Grade', 'Weight', 'Carrier / Vessel', 'Destination', 'Stage', 'Departure / ETA', 'Actions'].map(title => <th key={title} className="px-4 py-3 text-left font-semibold">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredShipments.map(shipment => {
                  const assessment = shipment.batch?.qualityAssessments?.[0];
                  return (
                    <tr key={shipment.shipmentId} className="hover:bg-stone-50">
                      <td className="px-4 py-3"><p className="font-semibold text-stone-800">{shipment.containerNo}</p><p className="text-stone-400">{shipment.shipmentId.slice(0, 8)}</p></td>
                      <td className="px-4 py-3"><p className="font-medium text-stone-700">{shipment.batch?.qrCode || shipment.batch?.farmName || '-'}</p><p className="text-stone-400">{assessment?.qualityGrade || assessment?.tier || 'Certified'}</p></td>
                      <td className="px-4 py-3 text-stone-700">{Number(shipment.loadedWeightKg || shipment.batch?.weightCherry || 0).toLocaleString()} kg</td>
                      <td className="px-4 py-3"><p className="text-stone-700">{shipment.vesselName}</p><p className="text-stone-400">{shipment.shippingLine || '-'}</p></td>
                      <td className="px-4 py-3 text-stone-700">{shipment.portDestination}</td>
                      <td className="px-4 py-3">
                        <select value={shipment.status} onChange={async event => {
                          try {
                            await apiService.updateShipmentStatus(shipment.shipmentId, event.target.value);
                            toast.success('Shipment stage updated');
                            refetch();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : 'Could not update stage');
                          }
                        }} className="px-2 py-1.5 border border-stone-200 rounded-lg bg-white">
                          {Array.from(new Set([shipment.status, ...shipmentStages])).map(stage => <option key={stage}>{stage}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-stone-600"><p>{formatShipmentDate(shipment.departureDate)}</p><p className="text-stone-400">{formatShipmentDate(shipment.estimatedArrivalDate)}</p></td>
                      <td className="px-4 py-3"><button type="button" onClick={() => { setSelectedShipmentId(shipment.shipmentId); setDetailTab('overview'); }} className="px-3 py-1.5 border border-sky-200 text-sky-700 rounded-lg font-semibold hover:bg-sky-50">View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selectedShipment && (
        <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div><h3 className="font-semibold text-stone-800">{selectedShipment.containerNo} - Shipment Details</h3><p className="text-xs text-stone-500 mt-1">{selectedShipment.vesselName} to {selectedShipment.portDestination}</p></div>
            <button type="button" onClick={() => setSelectedShipmentId(null)} className="px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold">Close</button>
          </div>
          <div className="flex border-b border-stone-100 px-4">
            {(['overview', 'coffee', 'documents', 'transit'] as const).map(tab => <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 ${detailTab === tab ? 'text-sky-700 border-sky-600' : 'text-stone-500 border-transparent'}`}>{tab === 'coffee' ? 'Coffee Lot' : tab}</button>)}
          </div>
          <div className="p-5 text-sm">
            {detailTab === 'overview' && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{[['Status', selectedShipment.status], ['Container Type', selectedShipment.containerType || '-'], ['Seal Number', selectedShipment.sealNo || '-'], ['Loaded Weight', `${Number(selectedShipment.loadedWeightKg || selectedShipment.batch?.weightCherry || 0).toLocaleString()} kg`], ['Port of Loading', selectedShipment.portLoading], ['Destination Port', selectedShipment.portDestination], ['Departure', formatShipmentDate(selectedShipment.departureDate)], ['ETA', formatShipmentDate(selectedShipment.estimatedArrivalDate)]].map(([label, value]) => <div key={label} className="bg-stone-50 rounded-lg p-3"><p className="text-xs text-stone-400">{label}</p><p className="font-semibold text-stone-700 mt-1">{value}</p></div>)}</div>}
            {detailTab === 'coffee' && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><div><p className="text-xs text-stone-400">Batch QR</p><p className="font-semibold text-stone-700 mt-1">{selectedShipment.batch?.qrCode || '-'}</p></div><div><p className="text-xs text-stone-400">Farm Origin</p><p className="font-semibold text-stone-700 mt-1">{selectedShipment.batch?.farmName || '-'}</p></div><div><p className="text-xs text-stone-400">Location</p><p className="font-semibold text-stone-700 mt-1">{selectedShipment.batch?.district || '-'}</p></div><div><p className="text-xs text-stone-400">Quality Grade</p><p className="font-semibold text-stone-700 mt-1">{selectedShipment.batch?.qualityAssessments?.[0]?.qualityGrade || selectedShipment.batch?.qualityAssessments?.[0]?.tier || 'Certified'}</p></div></div>}
            {detailTab === 'documents' && <div className="space-y-2">{(selectedShipment.complianceDocs || []).map((doc: any) => <div key={doc.docId} className="flex items-center justify-between border border-stone-100 rounded-lg p-3"><span className="font-medium text-stone-700">{doc.documentType}</span><StatusBadge status={doc.status} /></div>)}{(selectedShipment.complianceDocs || []).length === 0 && <p className="text-stone-500">No shipment documents recorded.</p>}</div>}
            {detailTab === 'transit' && <div className="grid sm:grid-cols-3 gap-4"><div><p className="text-xs text-stone-400">Carrier / Vessel</p><p className="font-semibold text-stone-700 mt-1">{selectedShipment.vesselName}</p></div><div><p className="text-xs text-stone-400">Shipping Line / Agent</p><p className="font-semibold text-stone-700 mt-1">{selectedShipment.shippingLine || '-'}</p></div><div><p className="text-xs text-stone-400">Transit Tracking</p><p className="font-semibold text-stone-700 mt-1">Road checkpoints and port events</p></div></div>}
          </div>
        </section>
      )}
      </>}
    </div>
  );
}


// Rwanda plate format: RA + letter + space + 3 digits + space + letter  e.g. RAB 123 A
const formatRwandaPlate = (raw: string): string => {
  // Strip everything except letters and digits, uppercase
  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  // Always start with RA
  let body = clean;
  if (!body.startsWith('R')) body = 'RA';
  else if (body.length >= 2 && body[1] !== 'A') body = 'RA' + body.slice(2);
  else if (body.length === 1) body = 'RA';
  // Separate into parts: RA + 1 letter + 3 digits + 1 letter
  // body[0..1] = 'RA', body[2] = letter, body[3..5] = digits, body[6] = letter
  const prefix = 'RA';
  const rest = body.slice(2); // everything after RA
  let part1 = ''; // 1 letter
  let part2 = ''; // up to 3 digits
  let part3 = ''; // 1 letter
  let i = 0;
  // consume 1 letter
  while (i < rest.length && part1.length < 1) {
    if (/[A-Z]/.test(rest[i])) { part1 += rest[i]; i++; } else { i++; }
  }
  // consume up to 3 digits
  while (i < rest.length && part2.length < 3) {
    if (/[0-9]/.test(rest[i])) { part2 += rest[i]; i++; } else { i++; }
  }
  // consume 1 letter
  while (i < rest.length && part3.length < 1) {
    if (/[A-Z]/.test(rest[i])) { part3 += rest[i]; i++; } else { i++; }
  }
  // Build formatted string progressively
  let result = prefix;
  if (part1) result += part1;
  if (part2) result += ' ' + part2;
  if (part3) result += ' ' + part3;
  return result;
};

const isValidRwandaPlate = (plate: string): boolean =>
  /^RA[A-Z] \d{3} [A-Z]$/.test(plate);

function RoadTransport() {
  const { shipments, loading: shipmentsLoading, refetch: refetchShipments } = useShipments();
  const { roadTransports, loading, refetch } = useRoadTransports();
  const [truckCompanies, setTruckCompanies] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    shipmentId: '', truckCompanyId: '', truckPlate: 'RA', transporterCompany: '',
    originLocation: 'Kigali', destinationPort: 'Mombasa Port', sealNo: '',
    departureTime: '', expectedArrival: '',
  });
  useEffect(() => {
    apiService.getTruckCompanies()
      .then(response => setTruckCompanies((response.data || []).filter((company: any) => company.status === 'active')))
      .catch(() => setTruckCompanies([]));
  }, []);

  const copyDriverLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Private truck company trip link copied');
    } catch {
      toast.error('Could not copy the trip link.');
    }
  };

  const chooseShipment = (shipmentId: string) => {
    const existing = roadTransports.find(record => record.shipmentId === shipmentId);
    const shipment = shipments.find(row => row.shipmentId === shipmentId);
    setForm(existing ? {
      shipmentId,
      truckCompanyId: existing.truckCompanyId || '',
      truckPlate: existing.truckPlate ? formatRwandaPlate(existing.truckPlate) : 'RA',
      transporterCompany: existing.transporterCompany || '',
      originLocation: existing.originLocation || 'Kigali',
      destinationPort: existing.destinationPort || 'Mombasa Port',
      sealNo: existing.sealNo || '',
      departureTime: existing.departureTime ? new Date(existing.departureTime).toISOString().slice(0, 16) : '',
      expectedArrival: existing.expectedArrival ? new Date(existing.expectedArrival).toISOString().slice(0, 16) : '',
    } : {
      shipmentId, truckCompanyId: '', truckPlate: 'RA', transporterCompany: '',
      originLocation: 'Kigali', destinationPort: 'Mombasa Port', sealNo: shipment?.sealNo || '',
      departureTime: '', expectedArrival: '',
    });
  };

  const roadStages = ['Dispatch from Kigali', 'Border Exit', 'Border Entry', 'Transit Checkpoint', 'Port Arrival', 'Vessel Loading'];
  const deriveRoadStatus = (eventType: string | undefined, fallbackStatus: string) => {
    if (String(fallbackStatus || '').trim().toLowerCase() === 'completed') return 'Completed';
    const eventKey = String(eventType || '').trim().toLowerCase();
    if (eventKey.includes('loading') || eventKey === 'loaded' || eventKey.includes('container loaded')) return 'Loaded';
    if (eventKey.includes('port arrival')) return 'At Port';
    if (eventKey.includes('border exit')) return 'At Border';
    if (eventKey.includes('border entry') || eventKey.includes('transit checkpoint')) return 'In Transit';
    if (eventKey.includes('dispatch')) return 'Dispatched';
    return fallbackStatus || 'Planned';
  };
  const getRoadSummary = (record: any) => {
    const checkpoints = [...(record.checkpoints || [])].sort((a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    const latest = checkpoints[checkpoints.length - 1] || null;
    const latestGps = [...checkpoints].reverse().find((checkpoint: any) => checkpoint.submissionSource === 'DRIVER_PHONE' && checkpoint.latitude && checkpoint.longitude) || null;
    const completed = new Set(checkpoints.map((checkpoint: any) => checkpoint.eventType));
    const nextExpected = roadStages.find(stage => !completed.has(stage)) || 'Complete';
    const currentStatus = deriveRoadStatus(latest?.eventType, record.status);
    const lastUpdate = latest ? new Date(latest.recordedAt) : (record.departureTime ? new Date(record.departureTime) : null);
    const hoursSinceUpdate = lastUpdate ? (Date.now() - lastUpdate.getTime()) / 36e5 : 0;
    const completedStatuses = ['At Port', 'Port Arrived', 'Loaded', 'Delivered', 'Completed'];
    const pastEta = record.expectedArrival && new Date(record.expectedArrival).getTime() < Date.now() && !completedStatuses.includes(currentStatus);
    const staleUpdate = Boolean(lastUpdate && hoursSinceUpdate > 24 && !completedStatuses.includes(currentStatus));
    return { latest, latestGps, nextExpected, currentStatus, delayed: pastEta || staleUpdate, hoursSinceUpdate };
  };
  const roadByShipment = new Map(roadTransports.map(record => [record.shipmentId, record]));
  const createdShipments = shipments.filter(shipment => !['Delivered', 'Cancelled', 'Rejected'].includes(String(shipment.status || '')));
  const readyDispatchShipments = createdShipments.filter(shipment => !roadByShipment.has(shipment.shipmentId));
  const assignedDispatchShipments = createdShipments.filter(shipment => {
    const roadRecord = roadByShipment.get(shipment.shipmentId);
    return roadRecord && getRoadSummary(roadRecord).currentStatus !== 'Completed';
  });

  const orderLabel = (shipment: any) => {
    const order = shipment.customerOrder;
    if (!order) return { title: shipment.batch?.qrCode || 'Authorized order load', sub: shipment.batch?.farmName || shipment.destinationMarket || '-' };
    return {
      title: order.referenceCode || order.orderId?.slice(0, 8) || 'Customer order',
      sub: order.buyer || order.companyName || order.customerEmail || '-',
    };
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        departureTime: form.departureTime ? new Date(form.departureTime).toISOString() : null,
        expectedArrival: form.expectedArrival ? new Date(form.expectedArrival).toISOString() : null,
      };
      const result = await saveLogisticsWrite(
        `/exports/shipments/${form.shipmentId}/road-transport`,
        'POST',
        payload,
        () => apiService.createRoadTransport(form.shipmentId, payload),
      );
      toast.success((result as any).queued ? 'Road dispatch saved locally for sync' : 'Road transport record saved');
      await Promise.all([refetch(), refetchShipments()]);
    } finally {
      setSaving(false);
    }
  };

  const renderAssignmentPanel = (shipment: any, roadRecord: any, roadStatus: string, link: string, colSpan: number) => (
    <tr className="bg-sky-50">
      <td colSpan={colSpan} className="p-5">
        <form onSubmit={submit} className="rounded-xl border border-sky-100 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-sky-950">Dispatch Assignment - {shipment.containerNo}</h4>
              <p className="text-xs text-sky-700 mt-1">Traceable load: {shipment.batch?.qrCode || 'Authorized order load'} | {Number(shipment.loadedWeightKg || shipment.batch?.weightCherry || 0).toLocaleString()} kg</p>
            </div>
            <StatusBadge status={roadStatus} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="text-xs text-stone-500">
              Shipment / Container
              <input readOnly value={`${shipment.containerNo} - ${shipment.shipmentId.slice(0, 8)}`} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-100 text-stone-600" />
            </label>
            <label className="text-xs text-stone-500">
              Truck Company
              <select required value={form.truckCompanyId} onChange={event => {
                const company = truckCompanies.find((item: any) => item.truckCompanyId === event.target.value);
                setForm(current => ({ ...current, truckCompanyId: event.target.value, transporterCompany: company?.companyName || '' }));
              }} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700">
                <option value="">Select registered transporter</option>
                {truckCompanies.map((company: any) => <option key={company.truckCompanyId} value={company.truckCompanyId}>{company.companyName} - {company.operatingCorridors || 'Any corridor'}</option>)}
              </select>
            </label>
            <label className="text-xs text-stone-500">
              Truck Registration Plate
              <input
                required
                value={form.truckPlate}
                onChange={event => {
                  const formatted = formatRwandaPlate(event.target.value);
                  setForm(current => ({ ...current, truckPlate: formatted }));
                }}
                onKeyDown={event => {
                  // Prevent deleting the mandatory 'RA' prefix
                  const input = event.target as HTMLInputElement;
                  if ((event.key === 'Backspace' || event.key === 'Delete') && input.selectionStart !== null && input.selectionStart <= 2 && input.selectionEnd !== null && input.selectionEnd <= 2) {
                    event.preventDefault();
                  }
                }}
                placeholder="RAB 123 A"
                maxLength={9}
                pattern="^RA[A-Z] \d{3} [A-Z]$"
                title="Rwanda plate: RA + letter + 3 digits + letter  (e.g. RAB 123 A)"
                className={`mt-1 w-full px-3 py-2 border rounded-lg text-sm bg-stone-50 text-stone-700 font-mono tracking-widest ${
                  form.truckPlate && !isValidRwandaPlate(form.truckPlate)
                    ? 'border-amber-400 focus:ring-amber-400'
                    : 'border-stone-200'
                }`}
              />
              <span className={`text-[10px] mt-0.5 block ${
                form.truckPlate && !isValidRwandaPlate(form.truckPlate) ? 'text-amber-600' : 'text-stone-400'
              }`}>
                Format: RA + letter + 3 digits + letter &nbsp;•&nbsp; e.g. RAB 123 A
              </span>
            </label>
            <label className="text-xs text-stone-500">
              Transport Company
              <input value={form.transporterCompany} readOnly placeholder="Selected transporter" className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-100 text-stone-600" />
            </label>
            <label className="text-xs text-stone-500">
              Seal Number
              <input value={form.sealNo} onChange={event => setForm(current => ({ ...current, sealNo: event.target.value }))} placeholder="Container seal" className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700" />
            </label>
            <label className="text-xs text-stone-500">
              Origin Location
              <input required value={form.originLocation} onChange={event => setForm(current => ({ ...current, originLocation: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700" />
            </label>
            <label className="text-xs text-stone-500">
              Destination Port
              <input required value={form.destinationPort} onChange={event => setForm(current => ({ ...current, destinationPort: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700" />
            </label>
            <label className="text-xs text-stone-500">
              Departure Time
              <input type="datetime-local" value={form.departureTime} onChange={event => setForm(current => ({ ...current, departureTime: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700" />
            </label>
            <label className="text-xs text-stone-500">
              Expected Port Arrival
              <input type="datetime-local" value={form.expectedArrival} onChange={event => setForm(current => ({ ...current, expectedArrival: event.target.value }))} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 text-stone-700" />
            </label>
            <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
              <p className="font-semibold text-sky-900">Road status is automatic</p>
              <p className="mt-1">It changes when the truck company submits checkpoints from the trip link.</p>
            </div>
            <div className="flex items-end">
              <button disabled={saving || !form.shipmentId} className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Dispatch Assignment
              </button>
            </div>
          </div>
          {link && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex gap-2">
                <Smartphone className="w-4 h-4 text-emerald-700 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Truck company trip link</p>
                  <p className="text-xs text-emerald-700">Send this private link to {roadRecord?.truckCompany?.companyName || roadRecord?.transporterCompany || 'the truck company'}.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => copyDriverLink(link)} className="inline-flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-white rounded-lg text-xs font-semibold text-emerald-700"><Copy className="w-3.5 h-3.5" /> Copy Link</button>
                <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-700 rounded-lg text-xs font-semibold text-white"><ExternalLink className="w-3.5 h-3.5" /> Open</a>
              </div>
            </div>
          )}
        </form>
      </td>
    </tr>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Road Transport</h2>
          <p className="text-sm text-stone-500 mt-1">Start from a created shipment, then assign the truck company and road dispatch details.</p>
        </div>
        <LogisticsSyncStatus />
      </div>

      <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-stone-800">Orders Ready for Dispatch Assignment</h3>
            <p className="text-xs text-stone-500 mt-1">Created shipments that still need a truck company and road dispatch assignment.</p>
          </div>
          <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-3 py-1">{readyDispatchShipments.length} ready</span>
        </div>
        {loading || shipmentsLoading ? <div className="py-10 text-center text-stone-400">Loading created shipments...</div> : readyDispatchShipments.length === 0 ? (
          <EmptyState icon={Truck} message="No shipment is waiting for dispatch assignment" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>{['Shipment / Container', 'Customer / Order', 'Authorized Coffee', 'Destination Port', 'Seal', 'Status', 'Action'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {readyDispatchShipments.map(shipment => {
                  const isSelected = form.shipmentId === shipment.shipmentId;
                  const roadStatus = shipment.status || 'Ready for Dispatch';
                  const order = orderLabel(shipment);
                  return (
                    <Fragment key={shipment.shipmentId}>
                      <tr className={isSelected ? 'bg-sky-50' : 'hover:bg-stone-50'}>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-800">{shipment.containerNo}</p><p className="text-xs text-stone-400">{shipment.shipmentId.slice(0, 8)}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{order.title}</p><p className="text-xs text-stone-400">{order.sub}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{Number(shipment.loadedWeightKg || shipment.batch?.weightCherry || 0).toLocaleString()} kg</p><p className="text-xs text-stone-400">{shipment.batch?.qrCode || 'Authorized order load'}</p></td>
                        <td className="px-5 py-3 text-stone-600">{shipment.portDestination || 'Mombasa Port'}</td>
                        <td className="px-5 py-3 text-stone-600">{shipment.sealNo || '-'}</td>
                        <td className="px-5 py-3"><StatusBadge status={roadStatus} /></td>
                        <td className="px-5 py-3"><button type="button" onClick={() => chooseShipment(isSelected ? '' : shipment.shipmentId)} className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700">{isSelected ? 'Hide Assignment' : 'Dispatch Assignment'}</button></td>
                      </tr>
                      {isSelected && renderAssignmentPanel(shipment, null, roadStatus, '', 7)}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-stone-800">Assigned Road Transport Orders</h3>
            <p className="text-xs text-stone-500 mt-1">Shipments already assigned to an external truck company.</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">{assignedDispatchShipments.length} assigned</span>
        </div>
        {loading || shipmentsLoading ? <div className="py-10 text-center text-stone-400">Loading road assignments...</div> : assignedDispatchShipments.length === 0 ? (
          <EmptyState icon={Truck} message="No shipment has been assigned to road transport yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>{['Shipment / Container', 'Customer / Order', 'Truck Company', 'Truck Plate', 'Route', 'Current Stage', 'Last Checkpoint / GPS', 'Trip Link'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {assignedDispatchShipments.map(shipment => {
                  const roadRecord = roadByShipment.get(shipment.shipmentId);
                  const summary = roadRecord ? getRoadSummary(roadRecord) : null;
                  const isSelected = form.shipmentId === shipment.shipmentId;
                  const roadStatus = summary?.currentStatus || roadRecord?.status || shipment.status || 'Dispatched';
                  const link = roadRecord?.driverAccessToken ? `${window.location.origin}/driver-trip/${roadRecord.driverAccessToken}` : '';
                  const order = orderLabel(shipment);
                  return (
                    <Fragment key={shipment.shipmentId}>
                      <tr className={isSelected ? 'bg-sky-50' : 'hover:bg-stone-50'}>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-800">{shipment.containerNo}</p><p className="text-xs text-stone-400">{shipment.shipmentId.slice(0, 8)}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{order.title}</p><p className="text-xs text-stone-400">{order.sub}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{roadRecord?.truckCompany?.companyName || roadRecord?.transporterCompany || '-'}</p><p className="text-xs text-stone-400">{roadRecord?.truckCompany?.licenseNo || roadRecord?.truckCompany?.phone || '-'}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{roadRecord?.truckPlate || '-'}</p><p className="text-xs text-stone-400">{roadRecord?.driverName || 'Driver chosen by company'}</p></td>
                        <td className="px-5 py-3 text-stone-600 min-w-[170px]"><p>{roadRecord?.originLocation || '-'}</p><p className="text-xs text-stone-400">to {roadRecord?.destinationPort || shipment.portDestination || 'Mombasa Port'}</p></td>
                        <td className="px-5 py-3"><StatusBadge status={roadStatus} /></td>
                        <td className="px-5 py-3 text-stone-600"><p className="font-medium text-stone-700">{summary?.latest?.eventType || 'No checkpoint'}</p><p className="text-xs text-stone-400">{summary?.latestGps ? new Date(summary.latestGps.recordedAt).toLocaleString() : 'No GPS yet'}</p></td>
                        <td className="px-5 py-3">{link ? <button type="button" onClick={() => copyDriverLink(link)} className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800"><Smartphone className="w-3.5 h-3.5" /> Copy Link</button> : <span className="text-xs text-stone-400">Not generated</span>}</td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TransitCheckpoints() {
  const mombasaPort = 'Port of Mombasa, Mombasa, Kenya';
  const { roadTransports, loading, refetch } = useRoadTransports();
  const [expandedId, setExpandedId] = useState('');
  const [focusedCheckpointId, setFocusedCheckpointId] = useState('');
  const stages = ['Dispatch from Kigali', 'Border Exit', 'Border Entry', 'Transit Checkpoint', 'Port Arrival', 'Vessel Loading'];

  const sortedCheckpoints = (record: any) => [...(record?.checkpoints || [])].sort((a: any, b: any) => {
    return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
  });
  const checkpointsWithLocation = (record: any) => sortedCheckpoints(record).filter((checkpoint: any) =>
    checkpoint.submissionSource === 'DRIVER_PHONE' && checkpoint.latitude && checkpoint.longitude
  );
  const getFocusedCheckpoint = (record: any) => {
    const located = checkpointsWithLocation(record);
    return located.find((checkpoint: any) => checkpoint.checkpointId === focusedCheckpointId)
      || located[located.length - 1]
      || null;
  };
  const routeDetails = (record: any) => {
    const focusedCheckpoint = getFocusedCheckpoint(record);
    if (!focusedCheckpoint) return { focusedCheckpoint: null, mapUrl: '', directionsLink: '' };
    const driverPosition = `${focusedCheckpoint.latitude},${focusedCheckpoint.longitude}`;
    return {
      focusedCheckpoint,
      mapUrl: `https://maps.google.com/maps?saddr=${encodeURIComponent(driverPosition)}&daddr=${encodeURIComponent(mombasaPort)}&output=embed`,
      directionsLink: `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(driverPosition)}&destination=${encodeURIComponent(mombasaPort)}&travelmode=driving`,
    };
  };
  const rowSummary = (record: any) => {
    const checkpoints = sortedCheckpoints(record);
    const latest = checkpoints[checkpoints.length - 1] || null;
    const latestGps = [...checkpointsWithLocation(record)].pop() || null;
    const completed = new Set(checkpoints.map((checkpoint: any) => checkpoint.eventType));
    const completedCount = stages.filter(stage => completed.has(stage)).length;
    const nextExpected = stages.find(stage => !completed.has(stage)) || 'Complete';
    const eventKey = String(latest?.eventType || '').trim().toLowerCase();
    const savedStatus = String(record.status || '').trim();
    const currentStatus = savedStatus.toLowerCase() === 'completed'
      ? 'Completed'
      : eventKey.includes('loading') || eventKey === 'loaded' || eventKey.includes('container loaded')
      ? 'Loaded'
      : eventKey.includes('port arrival')
        ? 'At Port'
        : eventKey.includes('border exit')
          ? 'At Border'
          : eventKey.includes('border entry') || eventKey.includes('transit checkpoint')
            ? 'In Transit'
            : eventKey.includes('dispatch')
              ? 'Dispatched'
              : (record.status || 'Planned');
    const lastUpdate = latest ? new Date(latest.recordedAt) : (record.departureTime ? new Date(record.departureTime) : null);
    const hoursSinceUpdate = lastUpdate ? (Date.now() - lastUpdate.getTime()) / 36e5 : 0;
    const completedStatuses = ['At Port', 'Port Arrived', 'Loaded', 'Delivered'];
    const pastEta = record.expectedArrival && new Date(record.expectedArrival).getTime() < Date.now() && !completedStatuses.includes(currentStatus);
    const staleUpdate = Boolean(lastUpdate && hoursSinceUpdate > 24 && !completedStatuses.includes(currentStatus));
    return { latest, latestGps, completed, completedCount, nextExpected, currentStatus, delayed: pastEta || staleUpdate };
  };
  const stageText = (status: string) => {
    const key = String(status || 'Planned').toLowerCase();
    if (key === 'planned') return 'Waiting for dispatch';
    if (key === 'dispatched') return 'Left Kigali';
    if (key === 'at border') return 'Border processing';
    if (key === 'in transit') return 'Moving toward port';
    if (key === 'at port' || key === 'port arrived') return 'Arrived at Mombasa';
    if (key === 'loaded') return 'Loaded for onward shipment';
    if (key === 'completed') return 'Journey completed';
    if (key === 'delivered') return 'Delivery confirmed';
    return 'Road movement active';
  };
  const toggleExpanded = (recordId: string) => {
    setExpandedId(current => current === recordId ? '' : recordId);
    setFocusedCheckpointId('');
  };
  const activeRoadTransports = roadTransports.filter(record => rowSummary(record).currentStatus !== 'Completed');
  const completeJourney = async (record: any) => {
    try {
      await apiService.completeRoadTransportJourney(record.roadTransportId);
      toast.success('Road journey completed');
      setExpandedId('');
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete road journey');
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Transit Checkpoints</h2>
          <p className="text-sm text-stone-500 mt-1">Monitor phone GPS checkpoint evidence for the road movement from Kigali to Mombasa Port.</p>
        </div>
        <LogisticsSyncStatus />
      </div>
      {loading ? <div className="py-10 text-center text-stone-400">Loading road journeys...</div> : roadTransports.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200"><EmptyState icon={MapPin} message="Create a road transport record before logging checkpoints" /></div>
      ) : (
        <>
          <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-800">Road Transit Checkpoint Board</h3>
                <p className="text-xs text-stone-500 mt-1">Click a truck journey to open the route map, progress checklist, and checkpoint records.</p>
              </div>
              <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-3 py-1">{activeRoadTransports.length} active journeys</span>
            </div>
            {activeRoadTransports.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="All loaded road journeys have been completed" />
            ) : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                  <tr>{['Container', 'Truck Company', 'Truck / Driver', 'Route', 'Current Stage', 'Last Checkpoint', 'Last GPS Time', 'Delay', 'Action'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold">{title}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activeRoadTransports.map(record => {
                    const summary = rowSummary(record);
                    const expanded = expandedId === record.roadTransportId;
                    const route = routeDetails(record);
                    return (
                      <Fragment key={record.roadTransportId}>
                        <tr onClick={() => toggleExpanded(record.roadTransportId)} className={`cursor-pointer transition-colors ${expanded ? 'bg-sky-50/60' : 'hover:bg-stone-50'}`}>
                          <td className="px-5 py-3"><p className="font-semibold text-stone-800">{record.containerNo}</p><p className="text-xs text-stone-500">{record.batchQrCode || '-'}</p></td>
                          <td className="px-5 py-3"><p className="font-semibold text-stone-700">{record.truckCompany?.companyName || record.transporterCompany || '-'}</p><p className="text-xs text-stone-500">{record.truckCompany?.phone || record.truckCompany?.licenseNo || '-'}</p></td>
                          <td className="px-5 py-3"><p className="font-semibold text-stone-700">{record.truckPlate}</p><p className="text-xs text-stone-500">{record.driverName || 'Chosen by truck company'}</p></td>
                          <td className="px-5 py-3 text-stone-600 min-w-[220px]"><p>{record.originLocation}</p><p className="text-xs text-stone-400">to {record.destinationPort}</p></td>
                          <td className="px-5 py-3 min-w-[190px]">
                            <div className={`rounded-lg border px-3 py-2 ${summary.delayed ? 'border-amber-200 bg-amber-50' : 'border-stone-100 bg-stone-50'}`}>
                              <StatusBadge status={summary.currentStatus} />
                              <p className="mt-1 text-xs font-semibold text-stone-700">{stageText(summary.currentStatus)}</p>
                              <p className="mt-0.5 text-[11px] text-stone-500">Last: {summary.latest?.eventType || 'No checkpoint'}</p>
                              <p className={`mt-0.5 text-[11px] ${summary.delayed ? 'font-semibold text-amber-700' : 'text-stone-500'}`}>
                                {summary.delayed ? 'Delayed' : `Next: ${summary.nextExpected}`}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-stone-600"><p className="font-medium text-stone-700">{summary.latest?.eventType || 'No checkpoint'}</p><p className="text-xs text-stone-400">{summary.latest?.checkpointName || 'Awaiting driver submission'}</p></td>
                          <td className="px-5 py-3 text-stone-600">{summary.latestGps ? new Date(summary.latestGps.recordedAt).toLocaleString() : 'No GPS yet'}</td>
                          <td className="px-5 py-3">
                            {summary.delayed ? <StatusBadge status="Delayed" /> : <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-0.5">On track</span>}
                          </td>
                          <td className="px-5 py-3">
                            {summary.currentStatus === 'Loaded' ? (
                              <button type="button" onClick={(event) => { event.stopPropagation(); completeJourney(record); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                              </button>
                            ) : (
                              <span className="text-xs text-stone-400">After loading</span>
                            )}
                          </td>
                        </tr>
                        {expanded && (
                          <tr>
                            <td colSpan={9} className="bg-sky-50/40 px-5 py-5">
                              <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-4">
                                <div className="relative flex items-center justify-center border border-stone-200 rounded-xl overflow-hidden min-h-[360px] bg-stone-50">
                                  {route.focusedCheckpoint ? (
                                    <iframe title={`Driver route to Mombasa Port for ${record.containerNo}`} src={route.mapUrl} className="absolute inset-0 w-full h-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                                  ) : (
                                    <div className="max-w-sm px-8 text-center text-stone-600">
                                      <MapPin className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                                      <p className="font-medium text-stone-800">Driver location required</p>
                                      <p className="mt-1 text-sm">The route to Port of Mombasa will appear here after the driver submits a phone GPS checkpoint.</p>
                                    </div>
                                  )}
                                  <div className="absolute top-3 left-3 bg-white/95 rounded-lg border border-stone-200 p-3 shadow-sm pointer-events-none">
                                    <p className="text-xs font-semibold text-stone-800">{route.focusedCheckpoint ? 'Driver Location to Mombasa Port' : 'Route to Mombasa Port'}</p>
                                    <p className="text-[11px] text-stone-500">{route.focusedCheckpoint ? `GPS accuracy ${Math.round(Number(route.focusedCheckpoint.locationAccuracyM || 0))} m - ${route.focusedCheckpoint.checkpointName}` : 'Awaiting driver phone GPS checkpoint'}</p>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className={`rounded-xl border p-4 ${route.focusedCheckpoint ? 'border-emerald-100 bg-emerald-50' : 'border-stone-100 bg-white'}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Truck className={`h-4 w-4 ${route.focusedCheckpoint ? 'text-emerald-700' : 'text-stone-400'}`} />
                                        <p className="text-xs font-semibold text-stone-800">Driver Location</p>
                                      </div>
                                      <button type="button" onClick={(event) => { event.stopPropagation(); route.directionsLink && window.open(route.directionsLink, '_blank', 'noopener,noreferrer'); }} disabled={!route.directionsLink} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-sky-200 bg-sky-50 text-sky-700 rounded-lg text-xs font-semibold disabled:border-stone-200 disabled:bg-stone-50 disabled:text-stone-400"><Navigation className="w-3.5 h-3.5" /> Open Route</button>
                                    </div>
                                    {route.focusedCheckpoint ? (
                                      <>
                                        <p className="mt-2 text-sm font-semibold text-emerald-800">{route.focusedCheckpoint.latitude}, {route.focusedCheckpoint.longitude}</p>
                                        <p className="mt-1 text-[11px] text-emerald-700">Reported {new Date(route.focusedCheckpoint.recordedAt).toLocaleString()} | Accuracy {Math.round(Number(route.focusedCheckpoint.locationAccuracyM || 0))} m</p>
                                        <p className="mt-1 text-[11px] text-stone-600">Google route begins at this submitted phone position and continues to {mombasaPort}.</p>
                                      </>
                                    ) : (
                                      <p className="mt-2 text-xs text-stone-500">Waiting for the driver to submit a phone GPS checkpoint. No route is shown until the driver's location is recorded.</p>
                                    )}
                                  </div>

                                  <div className="bg-white rounded-xl border border-stone-200 p-4">
                                    <p className="text-xs font-semibold text-stone-800 mb-3">Journey Progress</p>
                                    <div className="space-y-3">
                                      {stages.map(stage => (
                                        <div key={stage} className="flex items-center gap-3">
                                          <span className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${summary.completed.has(stage) ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400'}`}>
                                            {summary.completed.has(stage) ? <Check className="w-3.5 h-3.5" /> : <span className="w-2 h-2 rounded-full bg-current" />}
                                          </span>
                                          <span className={`text-xs ${summary.completed.has(stage) ? 'font-semibold text-stone-700' : 'text-stone-500'}`}>{stage}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <p className="text-[11px] text-stone-500 mt-4 border-t border-stone-100 pt-3">Checkpoint markers are submitted from the driver's phone with consent. This is event-based monitoring, not continuous GPS.</p>
                                  </div>

                                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-stone-100"><h4 className="text-xs font-semibold text-stone-800">Checkpoint History</h4></div>
                                    {sortedCheckpoints(record).length === 0 ? (
                                      <div className="px-4 py-6 text-center text-xs text-stone-400">No checkpoints recorded yet</div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead className="bg-stone-50 text-stone-500 uppercase">
                                            <tr>{['Event', 'Location', 'Time', 'Coordinates', 'Seal', 'Route'].map(title => <th key={title} className="px-4 py-2 text-left font-semibold">{title}</th>)}</tr>
                                          </thead>
                                          <tbody className="divide-y divide-stone-100">
                                            {sortedCheckpoints(record).map((checkpoint: any) => (
                                              <tr key={checkpoint.checkpointId}>
                                                <td className="px-4 py-2 font-semibold text-stone-800">{checkpoint.eventType}</td>
                                                <td className="px-4 py-2 text-stone-600">{checkpoint.checkpointName}</td>
                                                <td className="px-4 py-2 text-stone-600">{new Date(checkpoint.recordedAt).toLocaleString()}</td>
                                                <td className="px-4 py-2 text-stone-600">{checkpoint.latitude && checkpoint.longitude ? `${checkpoint.latitude}, ${checkpoint.longitude}` : '-'}</td>
                                                <td className="px-4 py-2"><StatusBadge status={checkpoint.sealCondition || 'Recorded'} /></td>
                                                <td className="px-4 py-2">{checkpoint.submissionSource === 'DRIVER_PHONE' && checkpoint.latitude && checkpoint.longitude ? <button type="button" onClick={(event) => { event.stopPropagation(); setFocusedCheckpointId(checkpoint.checkpointId); }} className="text-xs font-semibold text-sky-700">Show Route</button> : '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>}
          </section>

          <section className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3">
            <Smartphone className="w-5 h-5 text-emerald-700 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-emerald-900">Driver-submitted checkpoint evidence</h3>
              <p className="text-xs text-emerald-700 mt-1">Logistics creates and shares the private driver link from Road Transport. The driver submits timestamped GPS and seal-condition events from a phone while Logistics monitors the records here.</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CompletedJourneys() {
  const { roadTransports, loading } = useRoadTransports();
  const [expandedId, setExpandedId] = useState('');
  const completedJourneys = roadTransports.filter(record => String(record.status || '').toLowerCase() === 'completed');
  const sortedCheckpoints = (record: any) => [...(record?.checkpoints || [])].sort((a: any, b: any) => {
    return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
  });
  const routeSummary = (record: any) => {
    const checkpoints = sortedCheckpoints(record);
    const start = record.departureTime ? new Date(record.departureTime) : (checkpoints[0]?.recordedAt ? new Date(checkpoints[0].recordedAt) : null);
    const finish = record.actualArrival ? new Date(record.actualArrival) : (record.updatedAt ? new Date(record.updatedAt) : null);
    const durationHours = start && finish ? Math.max(0, Math.round(((finish.getTime() - start.getTime()) / 36e5) * 10) / 10) : null;
    return {
      latest: checkpoints[checkpoints.length - 1] || null,
      checkpointCount: checkpoints.length,
      durationHours,
    };
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Completed Journeys</h2>
          <p className="text-sm text-stone-500 mt-1">Closed road transport journeys after the container has been loaded and logistics marks the movement complete.</p>
        </div>
        <LogisticsSyncStatus />
      </div>
      {loading ? (
        <div className="py-10 text-center text-stone-400">Loading completed journeys...</div>
      ) : completedJourneys.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200"><EmptyState icon={CheckCircle2} message="No completed road journeys yet" /></div>
      ) : (
        <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-stone-800">Completed Road Journey Register</h3>
              <p className="text-xs text-stone-500 mt-1">Click a row to review the checkpoint history and route evidence.</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">{completedJourneys.length} completed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                <tr>{['Container', 'Batch / Farm', 'Truck Company', 'Truck / Driver', 'Route', 'Checkpoints', 'Duration', 'Status'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {completedJourneys.map(record => {
                  const expanded = expandedId === record.roadTransportId;
                  const summary = routeSummary(record);
                  return (
                    <Fragment key={record.roadTransportId}>
                      <tr onClick={() => setExpandedId(current => current === record.roadTransportId ? '' : record.roadTransportId)} className={`cursor-pointer transition-colors ${expanded ? 'bg-emerald-50/60' : 'hover:bg-stone-50'}`}>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-800">{record.containerNo}</p><p className="text-xs text-stone-400">{record.roadTransportId.slice(0, 8)}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{record.batchQrCode || '-'}</p><p className="text-xs text-stone-400">{record.farmName || '-'}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{record.truckCompany?.companyName || record.transporterCompany || '-'}</p><p className="text-xs text-stone-400">{record.truckCompany?.phone || record.truckCompany?.licenseNo || '-'}</p></td>
                        <td className="px-5 py-3"><p className="font-semibold text-stone-700">{record.truckPlate || '-'}</p><p className="text-xs text-stone-400">{record.driverName || 'Chosen by truck company'}</p></td>
                        <td className="px-5 py-3 text-stone-600 min-w-[220px]"><p>{record.originLocation || '-'}</p><p className="text-xs text-stone-400">to {record.destinationPort || '-'}</p></td>
                        <td className="px-5 py-3 text-stone-600"><p className="font-semibold text-stone-700">{summary.checkpointCount}</p><p className="text-xs text-stone-400">Last: {summary.latest?.eventType || '-'}</p></td>
                        <td className="px-5 py-3 text-stone-600">{summary.durationHours !== null ? `${summary.durationHours}h` : '-'}</td>
                        <td className="px-5 py-3"><StatusBadge status="Completed" /></td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={8} className="bg-emerald-50/40 px-5 py-5">
                            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4">
                              <div className="bg-white rounded-xl border border-emerald-100 p-4">
                                <h4 className="text-sm font-semibold text-stone-800">Journey Summary</h4>
                                <div className="mt-4 grid sm:grid-cols-2 gap-3">
                                  {[
                                    ['Departure', record.departureTime ? new Date(record.departureTime).toLocaleString() : '-'],
                                    ['Completed', record.actualArrival ? new Date(record.actualArrival).toLocaleString() : (record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '-')],
                                    ['Seal Number', record.sealNo || '-'],
                                    ['Destination', record.destinationPort || '-'],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                                      <p className="text-[11px] uppercase text-stone-400 font-semibold">{label}</p>
                                      <p className="mt-1 text-sm font-semibold text-stone-800">{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                                <div className="px-4 py-3 border-b border-stone-100"><h4 className="text-xs font-semibold text-stone-800">Checkpoint History</h4></div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-stone-50 text-stone-500 uppercase">
                                      <tr>{['Event', 'Location', 'Time', 'Coordinates', 'Seal'].map(title => <th key={title} className="px-4 py-2 text-left font-semibold">{title}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100">
                                      {sortedCheckpoints(record).map((checkpoint: any) => (
                                        <tr key={checkpoint.checkpointId}>
                                          <td className="px-4 py-2 font-semibold text-stone-800">{checkpoint.eventType}</td>
                                          <td className="px-4 py-2 text-stone-600">{checkpoint.checkpointName}</td>
                                          <td className="px-4 py-2 text-stone-600">{new Date(checkpoint.recordedAt).toLocaleString()}</td>
                                          <td className="px-4 py-2 text-stone-600">{checkpoint.latitude && checkpoint.longitude ? `${checkpoint.latitude}, ${checkpoint.longitude}` : '-'}</td>
                                          <td className="px-4 py-2"><StatusBadge status={checkpoint.sealCondition || 'Recorded'} /></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
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
        </section>
      )}
    </div>
  );
}

function CustomsDocuments() {
  const [docs, setDocs] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [form, setForm] = useState({ shipmentId: '', batchId: '', documentType: 'Commercial Invoice', naebLicense: '', eudrVerifiedLoc: '', certificationType: 'Export Compliance' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getComplianceDocs().then(r => setDocs(r.data)).catch(() => {}).finally(() => setLoading(false));
    apiService.getShipments().then(r => setShipments(r.data || [])).catch(() => {});
  }, []);

  const approved = docs.filter(d => d.status === 'Verified').length;
  const pending = docs.filter(d => d.status !== 'Verified').length;
  const documentFileName = (doc: any) => `${String(doc.documentType || 'export-document').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${doc.docId || Date.now()}.pdf`;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Customs Documents</h2>
        <LogisticsSyncStatus />
      </div>
      <form onSubmit={async e => {
        e.preventDefault();
        const result = await saveLogisticsWrite('/exports/compliance-docs', 'POST', form, () => apiService.generateComplianceDoc(form));
        toast.success((result as any).queued ? 'Document draft saved locally for sync' : 'Compliance document generated');
        const docsRes = await apiService.getComplianceDocs();
        setDocs(docsRes.data);
      }} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select required value={form.shipmentId} onChange={e => {
            const shipment = shipments.find(s => s.shipmentId === e.target.value);
            setForm(f => ({ ...f, shipmentId: e.target.value, batchId: shipment?.batchId || f.batchId }));
          }} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
            <option value="">Select shipment</option>
            {shipments.map(s => <option key={s.shipmentId} value={s.shipmentId}>{s.containerNo} - {s.portDestination}</option>)}
          </select>
          <select value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value, certificationType: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
            {['Commercial Invoice','Packing List','Certificate of Origin','NAEB License','EUDR Proof','Proof of Delivery'].map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <input value={form.naebLicense} onChange={e => setForm(f => ({ ...f, naebLicense: e.target.value }))} placeholder="NAEB license" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          <input value={form.eudrVerifiedLoc} onChange={e => setForm(f => ({ ...f, eudrVerifiedLoc: e.target.value }))} placeholder="EUDR verified-location proof" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
        </div>
        <button className="px-4 py-2 bg-sky-600 text-white text-sm rounded-lg hover:bg-sky-700 flex items-center gap-1.5">
          <Upload className="w-4 h-4" /> Generate / Attach Document
        </button>
      </form>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Documents', value: loading ? '…' : String(docs.length), color: 'bg-sky-600' },
          { label: 'Approved', value: loading ? '…' : String(approved), color: 'bg-emerald-600' },
          { label: 'Pending', value: loading ? '…' : String(pending), color: 'bg-amber-600' },
        ].map(s => (
          <div key={s.label} className={`${s.color} text-white rounded-xl p-4 shadow-sm`}>
            <p className="text-sm opacity-90">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} message="No compliance documents yet" />
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Type', 'Certification', 'Container', 'Status', 'Generated', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {docs.map(doc => (
                  <tr key={doc.docId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{doc.documentType || '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{doc.certificationType}</td>
                    <td className="px-4 py-3 text-sky-700 font-medium">{doc.shippingRecord?.containerNo || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                      {new Date(doc.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      {doc.fileUrl ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => openDocumentUrl(doc.fileUrl, documentFileName(doc))}
                            className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700" title="Open PDF">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => downloadDocumentUrl(doc.fileUrl, documentFileName(doc))}
                            className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700" title="Download PDF">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : '—'}
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

function ProofOfDelivery() {
  const { shipments, loading, refetch } = useShipments();
  const [form, setForm] = useState({ shipmentId: '', podUrl: '', podFileName: '', portArrivalAt: '', receiverName: '', sealCondition: 'Intact', notes: '' });
  const [samples, setSamples] = useState<any[]>([]);
  const [sampleForms, setSampleForms] = useState<Record<string, { carrier: string; trackingNo: string; notes: string }>>({});
  const [expandedPodId, setExpandedPodId] = useState('');
  const [podPreview, setPodPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const podRows = shipments.filter(shipment => shipment.status !== 'Cancelled');
  const delivered = shipments.filter(shipment => shipment.status === 'Delivered');
  const latestCheckpoint = (shipment: any) => {
    const checkpoints = [...(shipment.roadTransport?.checkpoints || [])].sort((a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    return checkpoints[checkpoints.length - 1] || null;
  };
  const canUploadPod = (shipment: any) => {
    return shipment.status !== 'Delivered';
  };
  const loadSamples = useCallback(() => {
    apiService.getSampleDispatches().then(response => setSamples(response.data || [])).catch(() => {});
  }, []);
  useEffect(() => { loadSamples(); }, [loadSamples]);

  const readPodFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('POD file must be 10MB or smaller.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setForm(current => ({ ...current, podUrl: dataUrl, podFileName: file.name }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        podUrl: form.podUrl,
        portArrivalAt: form.portArrivalAt ? new Date(form.portArrivalAt).toISOString() : new Date().toISOString(),
        receiverName: form.receiverName,
        sealCondition: form.sealCondition,
        podFileName: form.podFileName,
        notes: form.notes,
      };
      const result = await saveLogisticsWrite(`/exports/shipments/${form.shipmentId}/proof-of-delivery`, 'POST', payload, () => apiService.confirmProofOfDelivery(form.shipmentId, payload));
      toast.success((result as any).queued ? 'Proof of delivery saved locally for sync' : 'Delivery confirmed and proof recorded');
      setForm({ shipmentId: '', podUrl: '', podFileName: '', portArrivalAt: '', receiverName: '', sealCondition: 'Intact', notes: '' });
      setExpandedPodId('');
      refetch();
    } finally {
      setSaving(false);
    }
  };
  const dispatchSample = async (sampleId: string) => {
    const sampleForm = sampleForms[sampleId] || { carrier: '', trackingNo: '', notes: '' };
    if (!sampleForm.carrier || !sampleForm.trackingNo) {
      toast.error('Carrier and tracking number are required');
      return;
    }
    await apiService.dispatchCustomerSample(sampleId, sampleForm);
    toast.success('Customer sample dispatched');
    setSampleForms(current => ({ ...current, [sampleId]: { carrier: '', trackingNo: '', notes: '' } }));
    loadSamples();
  };
  const viewPod = (shipment: any, pod: any) => {
    const fileUrl = pod?.fileUrl || '';
    if (!fileUrl) return;
    setPodPreview({
      fileUrl,
      containerNo: shipment.containerNo,
      batchQr: shipment.batch?.qrCode || '-',
      destination: shipment.portDestination || '-',
      uploadedAt: pod.generatedAt,
      fileName: pod.fileName || `POD-${shipment.containerNo || shipment.shipmentId}.pdf`,
      documentType: getDocumentType(fileUrl),
    });
  };

  return (
    <div className="p-6 space-y-5">
      {podPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden border border-stone-200">
            <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-stone-900">Proof of Delivery</h3>
                <p className="text-xs text-stone-500 mt-1">
                  {podPreview.containerNo} | Batch {podPreview.batchQr} | {podPreview.destination}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Uploaded {podPreview.uploadedAt ? new Date(podPreview.uploadedAt).toLocaleString() : '-'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openDocumentUrl(podPreview.fileUrl, podPreview.fileName)} className="px-3 py-2 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Tab
                </button>
                <button type="button" onClick={() => downloadDocumentUrl(podPreview.fileUrl, podPreview.fileName)} className="px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button type="button" onClick={() => setPodPreview(null)} className="px-3 py-2 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50">Close</button>
              </div>
            </div>
            <div className="bg-stone-100 p-4">
              {podPreview.documentType.startsWith('image/') || podPreview.documentType === 'image/*' ? (
                <div className="bg-white rounded-xl border border-stone-200 min-h-[520px] max-h-[68vh] overflow-auto flex items-center justify-center">
                  <img src={podPreview.fileUrl} alt="Proof of delivery" className="max-w-full h-auto object-contain" />
                </div>
              ) : (
                <iframe title="Proof of delivery document" src={podPreview.fileUrl} className="w-full h-[68vh] bg-white rounded-xl border border-stone-200" />
              )}
            </div>
          </div>
        </div>
      )}
      <div>
        <h2 className="text-lg font-bold text-stone-800">Proof of Delivery</h2>
        <p className="text-sm text-stone-500 mt-1">Confirm final arrival only after a receiving document is available.</p>
      </div>
      <section className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Shipment POD Register</h3>
          <p className="text-xs text-stone-500 mt-1">POD upload is enabled for any shipment that is not yet fully delivered.</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
        ) : podRows.length === 0 ? (
          <EmptyState icon={CheckCircle2} message="No shipments available for proof of delivery" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                <tr>{['Container', 'Batch QR', 'Destination Port', 'Truck Company', 'Driver', 'Arrival Checkpoint', 'POD Status', 'Uploaded At', 'Action'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
              {podRows.map(shipment => {
                const pod = shipment.complianceDocs?.find((doc: any) => doc.documentType === 'Proof of Delivery');
                const checkpoint = latestCheckpoint(shipment);
                const uploadable = canUploadPod(shipment);
                const expanded = expandedPodId === shipment.shipmentId;
                return (
                    <Fragment key={shipment.shipmentId}>
                      <tr className={expanded ? 'bg-emerald-50/40' : 'hover:bg-stone-50'}>
                        <td className="px-5 py-3 font-semibold text-stone-800">{shipment.containerNo}</td>
                        <td className="px-5 py-3 text-sky-700 font-medium">{shipment.batch?.qrCode || '-'}</td>
                        <td className="px-5 py-3 text-stone-600">{shipment.portDestination}</td>
                        <td className="px-5 py-3 text-stone-600">{shipment.roadTransport?.truckCompany?.companyName || shipment.roadTransport?.transporterCompany || '-'}</td>
                        <td className="px-5 py-3 text-stone-600">{shipment.roadTransport?.driverName || 'Chosen by truck company'}</td>
                        <td className="px-5 py-3 text-stone-600"><p>{checkpoint?.eventType || 'No checkpoint'}</p><p className="text-xs text-stone-400">{checkpoint?.recordedAt ? new Date(checkpoint.recordedAt).toLocaleString() : '-'}</p></td>
                        <td className="px-5 py-3"><StatusBadge status={pod ? 'Verified' : uploadable ? 'Ready' : 'Waiting'} /></td>
                        <td className="px-5 py-3 text-stone-600">{pod?.generatedAt ? new Date(pod.generatedAt).toLocaleString() : '-'}</td>
                        <td className="px-5 py-3">
                          {pod?.fileUrl ? (
                            <button onClick={() => viewPod(shipment, pod)} className="flex items-center gap-1 text-sky-700 text-xs font-semibold"><Download className="w-3.5 h-3.5" /> View POD</button>
                          ) : (
                            <button disabled={!uploadable} onClick={() => {
                              setExpandedPodId(current => current === shipment.shipmentId ? '' : shipment.shipmentId);
                              setForm(current => ({
                                ...current,
                                shipmentId: shipment.shipmentId,
                                podUrl: current.shipmentId === shipment.shipmentId ? current.podUrl : '',
                                podFileName: current.shipmentId === shipment.shipmentId ? current.podFileName : '',
                                portArrivalAt: checkpoint?.recordedAt ? new Date(checkpoint.recordedAt).toISOString().slice(0, 16) : current.portArrivalAt,
                              }));
                            }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold disabled:bg-stone-200 disabled:text-stone-400">
                              {expanded ? 'Close' : 'Upload POD'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={9} className="bg-emerald-50/40 px-5 py-5">
                            <form onSubmit={submit} className="bg-white rounded-xl border border-emerald-100 p-5 shadow-sm space-y-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-semibold text-stone-800">Upload Proof of Delivery</h3>
                                  <p className="text-xs text-stone-500 mt-1">Attach a signed POD PDF/photo or paste a document URL for {shipment.containerNo}.</p>
                                </div>
                                <StatusBadge status={shipment.roadTransport?.status || shipment.status} />
                              </div>
                              <div className="grid sm:grid-cols-4 gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                                <div><p className="text-xs text-emerald-700">Container</p><p className="font-semibold text-emerald-950">{shipment.containerNo}</p></div>
                                <div><p className="text-xs text-emerald-700">Batch QR</p><p className="font-semibold text-emerald-950">{shipment.batch?.qrCode || '-'}</p></div>
                                <div><p className="text-xs text-emerald-700">Truck Company</p><p className="font-semibold text-emerald-950">{shipment.roadTransport?.truckCompany?.companyName || shipment.roadTransport?.transporterCompany || '-'}</p></div>
                                <div><p className="text-xs text-emerald-700">Arrival Checkpoint</p><p className="font-semibold text-emerald-950">{checkpoint?.eventType || '-'}</p></div>
                              </div>
                              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <input value={form.receiverName} onChange={event => setForm(current => ({ ...current, receiverName: event.target.value }))} placeholder="Receiver / agent name" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                                <select value={form.sealCondition} onChange={event => setForm(current => ({ ...current, sealCondition: event.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
                                  {['Intact', 'Checked - Intact', 'Damaged', 'Replaced'].map(status => <option key={status}>{status}</option>)}
                                </select>
                                <input type="datetime-local" value={form.portArrivalAt} onChange={event => setForm(current => ({ ...current, portArrivalAt: event.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                                <label className="px-3 py-2 border border-dashed border-stone-300 rounded-lg text-sm bg-stone-50 text-stone-600 cursor-pointer hover:border-emerald-300">
                                  {form.podFileName || 'Upload PDF/photo'}
                                  <input type="file" accept="application/pdf,image/*" onChange={event => event.target.files?.[0] && readPodFile(event.target.files[0])} className="hidden" />
                                </label>
                                <input value={form.podUrl.startsWith('data:') ? '' : form.podUrl} onChange={event => setForm(current => ({ ...current, podUrl: event.target.value, podFileName: '' }))} placeholder="Or paste POD document URL" className="lg:col-span-4 px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                              </div>
                              <textarea value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Delivery condition, seal notes, or consignee notes" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[80px]" />
                              <button disabled={saving || !form.podUrl} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center gap-2">
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                <CheckCircle2 className="w-4 h-4" />
                                Confirm Delivery &amp; Record POD
                              </button>
                            </form>
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
      </section>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Confirmed Deliveries</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-sky-500" /></div>
        ) : delivered.length === 0 ? (
          <EmptyState icon={CheckCircle2} message="No proof of delivery has been confirmed" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
              <tr>{['Container', 'Vessel', 'Destination', 'Status', 'POD Document'].map(title => <th key={title} className="px-5 py-3 text-left font-semibold">{title}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {delivered.map(shipment => {
                const pod = shipment.complianceDocs?.find((doc: any) => doc.documentType === 'Proof of Delivery');
                return (
                  <tr key={shipment.shipmentId}>
                    <td className="px-5 py-3 font-semibold text-stone-800">{shipment.containerNo}</td>
                    <td className="px-5 py-3 text-stone-600">{shipment.vesselName}</td>
                    <td className="px-5 py-3 text-stone-600">{shipment.portDestination}</td>
                    <td className="px-5 py-3"><StatusBadge status={shipment.status} /></td>
                    <td className="px-5 py-3">
                      {pod?.fileUrl ? <button onClick={() => viewPod(shipment, pod)} className="flex items-center gap-1 text-sky-700 text-xs font-semibold"><Download className="w-3.5 h-3.5" /> Open POD</button> : <span className="text-xs text-stone-400">Not attached</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function LogisticsSupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [form, setForm] = useState({ subject: '', category: 'shipping', description: '' });
  const load = useCallback(() => { apiService.getLogisticsSupportTickets().then(r => setTickets(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await saveLogisticsWrite('/exports/logistics/support-tickets', 'POST', form, () => apiService.createLogisticsSupportTicket(form));
    toast.success((result as any).queued ? 'Support ticket saved locally for sync' : 'Support ticket submitted');
    setForm({ subject: '', category: 'shipping', description: '' });
    load();
  };
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-stone-800">Logistics Help & Export Protocols</h2><LogisticsSyncStatus /></div>
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 text-sm text-sky-800">Use verified batch, quality certificate, NAEB license, EUDR proof, Incoterms, and POD records for every export package.</div>
      <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" className="sm:col-span-2 px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">{['shipping','customs','documents','naeb-sync','offline-sync'].map(x => <option key={x}>{x}</option>)}</select>
        </div>
        <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the issue" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[100px]" />
        <button className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold">Submit Ticket</button>
      </form>
      {tickets.map(t => <div key={t.ticketId} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="font-semibold text-stone-800">{t.subject}</p><p className="text-sm text-stone-500 mt-1">{t.description}</p><p className="text-xs text-stone-400 mt-2">{t.category} - {t.status}</p></div>)}
    </div>
  );
}

function ShipmentReports() {
  const { shipments } = useShipments();
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Shipment Summary Reports</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <p className="text-sm text-stone-500 mb-4">Generate internal audit, buyer, or NAEB compliance summaries from live shipment and document records.</p>
        <button onClick={() => {
          const csv = ['Container,Vessel,Origin,Destination,Status,WeightKg', ...shipments.map(s => `${s.containerNo},${s.vesselName},${s.portLoading},${s.portDestination},${s.status},${Number(s.batch?.weightCherry || 0)}`)].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'shipment-summary.csv'; a.click(); URL.revokeObjectURL(url);
        }} className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Export Summary CSV</button>
      </div>
    </div>
  );
}

function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.getNotifications().then(r => setNotifs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Notifications</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
      ) : notifs.length === 0 ? (
        <EmptyState icon={AlertCircle} message="No notifications yet" />
      ) : notifs.map(n => (
        <div key={n.notificationId} className={`bg-white rounded-xl border p-4 shadow-sm flex gap-3 ${!n.read ? 'border-sky-200 bg-sky-50/30' : 'border-stone-200'}`}>
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
  overview: Overview,
  'authorized-orders': ContainerManagement,
  containers: ContainerManagement,
  'road-transport': RoadTransport,
  checkpoints: TransitCheckpoints,
  'completed-journeys': CompletedJourneys,
  transit: TransitCheckpoints,
  customs: CustomsDocuments,
  delivery: ProofOfDelivery,
  support: LogisticsSupport,
  reports: RoleReports,
  notifications: Notifications,
};

export default function LogisticsDashboard() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const Component = SECTIONS[section] || Overview;
  return <Component />;
}
