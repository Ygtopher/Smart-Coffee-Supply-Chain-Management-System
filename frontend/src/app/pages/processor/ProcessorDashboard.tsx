import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import apiService from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { enqueueProcessorWrite, getProcessorQueue, syncProcessorQueue } from '../../services/offlineSync';
import { RoleReports } from '../../components/RoleReports';
import {
  Package, ArrowUpRight, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Plus, Coffee, Wrench, ArrowRight, Loader2,
  AlertTriangle, Warehouse, RefreshCw, Camera, Wifi, WifiOff, FileCheck, ClipboardList, Users
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
    received: 'bg-blue-100 text-blue-700',
    pending_transport: 'bg-sky-100 text-sky-700',
    needs_consolidation: 'bg-amber-100 text-amber-700',
    split_required: 'bg-red-100 text-red-700',
    ready_for_quality: 'bg-violet-100 text-violet-700',
    processing: 'bg-amber-100 text-amber-700',
    'in transit': 'bg-sky-100 text-sky-700',
    'in-transit': 'bg-sky-100 text-sky-700',
    'needs consolidation': 'bg-amber-100 text-amber-700',
    'split required': 'bg-red-100 text-red-700',
    'quality check': 'bg-violet-100 text-violet-700',
    'quality-check': 'bg-violet-100 text-violet-700',
    'ready for reassessment': 'bg-violet-100 text-violet-700',
    dispatched: 'bg-emerald-100 text-emerald-700',
    'export scheduled': 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status?.toLowerCase()] || 'bg-stone-100 text-stone-600'}`}>
      {status}
    </span>
  );
};

const normalizeProcessorStage = (status: any) => {
  const raw = String(status || '').toLowerCase().replace(/[_-]/g, ' ').trim();
  if (['pending transport', 'in transit', 'transit'].includes(raw)) return 'In Transit';
  if (['received', 'arrived', 'arrived washing station'].includes(raw)) return 'Received';
  if (['processing', 'pulping', 'fermentation', 'washing', 'drying'].includes(raw)) return 'Processing';
  if (['ready for quality', 'quality check', 'tested', 'corrective action required', 'export ready'].includes(raw)) return 'Quality Check';
  if (['dispatched', 'shipped', 'delivered', 'in shipment'].includes(raw)) return 'Dispatched';
  return 'In Transit';
};

const parseMaybeJson = (value: any) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const humanizeKey = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());

const formatDefectSummary = (defects: any) => {
  const parsed = parseMaybeJson(defects) || defects;
  if (!parsed || typeof parsed !== 'object') return String(defects || 'No defects recorded');
  const entries = Object.entries(parsed)
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => `${humanizeKey(key)}: ${value}`);
  return entries.length ? entries.join(', ') : 'No defects recorded';
};

const qualityEvidenceSummary = (notes: any) => {
  const parsed = parseMaybeJson(notes);
  if (!parsed || typeof parsed !== 'object') return notes ? [String(notes)] : [];
  return [
    parsed.tier ? `Tier: ${parsed.tier}` : null,
    parsed.defectTotal !== undefined ? `Total defects: ${parsed.defectTotal}` : null,
    parsed.density ? `Density: ${parsed.density}` : null,
    parsed.screenSize ? `Screen size: ${parsed.screenSize}` : null,
    parsed.notes ? `Notes: ${parsed.notes}` : null,
    parsed.correctiveAction ? `Corrective action: ${parsed.correctiveAction}` : null,
  ].filter(Boolean);
};

const evaluateProcessingBatchWeight = (weightKg: number) => {
  if (weightKg < 100) {
    return {
      code: 'needs_consolidation',
      label: 'Needs Consolidation',
      canProcess: false,
      message: 'Below 100 kg. Consolidate before fermentation/drying.',
    };
  }

  if (weightKg > 500) {
    return {
      code: 'split_required',
      label: 'Split Required',
      canProcess: false,
      message: 'Above 500 kg. Split before fermentation/drying.',
    };
  }

  return {
    code: 'valid_processing_cycle',
    label: 'Valid Processing Cycle',
    canProcess: true,
    message: 'Within the 100-500 kg CWS processing range.',
  };
};

const processingWeightRuleFor = (batch: any) => batch?.processingWeightRule || evaluateProcessingBatchWeight(Number(batch?.weightCherry || 0));

const ProcessingWeightRuleBadge = ({ batch }: { batch: any }) => {
  const rule = processingWeightRuleFor(batch);
  const className = rule.canProcess
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : rule.code === 'split_required'
      ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-amber-50 text-amber-700 border-amber-100';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${className}`}>
      {rule.canProcess ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {rule.label}
    </span>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
  <div className="py-16 flex flex-col items-center text-stone-400">
    <Icon className="w-10 h-10 mb-3 text-stone-300" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

function ProcessorSyncStatus() {
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const refresh = useCallback(async () => setQueueCount((await getProcessorQueue()).length), []);

  useEffect(() => {
    refresh();
    const handleOnline = async () => {
      setOnline(true);
      const result = await syncProcessorQueue(apiService.getToken());
      if (result.synced > 0) toast.success(`Synced ${result.synced} processor record(s)`);
      refresh();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('processor-sync-queue-changed', refresh);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('processor-sync-queue-changed', refresh);
    };
  }, [refresh]);

  const syncNow = async () => {
    const result = await syncProcessorQueue(apiService.getToken());
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

async function saveProcessorWrite(endpoint: string, method: 'POST' | 'PATCH', body: Record<string, any>, onlineAction: () => Promise<any>) {
  if (!navigator.onLine) {
    await enqueueProcessorWrite(endpoint, method, body);
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
    await enqueueProcessorWrite(endpoint, method, body);
    toast.success('Connection failed, so this was saved locally for sync.');
    return { queued: true };
  }
}

function useBatches() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.getProcessorBatches();
      setBatches(res.data);
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { batches, loading, refetch: fetch };
}

function Overview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { batches, loading } = useBatches();
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    apiService.getProcessorDashboard().then(res => setKpis(res.data.kpis)).catch(() => {});
  }, []);

  const stats = {
    incoming: batches.filter(b => b.status === 'In Transit').length,
    received: batches.filter(b => b.status === 'Received').length,
    processing: batches.filter(b => b.status === 'Processing').length,
    qc: batches.filter(b => b.status === 'Quality Check').length,
    dispatched: batches.filter(b => b.status === 'Dispatched').length,
    totalKg: batches.reduce((s, b) => s + Number(b.weightCherry || 0), 0),
  };

  const PIPELINE = [
    { id: 'In Transit', label: 'In Transit', color: 'border-blue-300 bg-blue-50', text: 'text-blue-700' },
    { id: 'Received', label: 'Received', color: 'border-orange-300 bg-orange-50', text: 'text-orange-700' },
    { id: 'Processing', label: 'Processing', color: 'border-amber-300 bg-amber-50', text: 'text-amber-700' },
    { id: 'Quality Check', label: 'Quality Check', color: 'border-violet-300 bg-violet-50', text: 'text-violet-700' },
    { id: 'Dispatched', label: 'Dispatched', color: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-700' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-700 to-orange-500 rounded-2xl p-5 text-white">
        <p className="text-orange-100 text-sm mb-1">{t('welcome')},</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{user?.name || 'Processing Station'}</h2>
            <p className="text-orange-100 text-sm mt-1">Washing station operations, QR intake, FIFO inventory, and QC handoff</p>
          </div>
          <ProcessorSyncStatus />
        </div>
        <p className="text-orange-100 text-sm mt-1">Washing Station Operations • Fully Washed &amp; Semi-Washed Processing</p>
        <div className="mt-4 pt-4 border-t border-orange-600 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Batches', value: loading ? '…' : String(batches.length) },
            { label: 'In Processing', value: loading ? '…' : String(stats.processing) },
            { label: 'Quality Check', value: loading ? '…' : String(stats.qc) },
            { label: 'Total Volume', value: loading ? '…' : `${stats.totalKg.toLocaleString()} kg` },
          ].map(s => (
            <div key={s.label}>
              <p className="text-orange-200 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label={t('processor.batches_in_queue')} value={stats.incoming} sub="In transit" icon={Package} color="bg-blue-600" />
            <KPICard label={t('processor.active_processing')} value={stats.processing} sub="Active" icon={Clock} color="bg-amber-600" />
            <KPICard label={t('processor.completed_batches')} value={stats.qc} sub="Awaiting QC" icon={CheckCircle2} color="bg-violet-600" />
            <KPICard label={t('processor.quality_yield')} value={`${stats.totalKg.toLocaleString()} kg`} sub="All batches" icon={Coffee} color="bg-orange-600" />
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">Processor Thesis KPIs</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                ['Processing throughput', `${kpis?.processingThroughput ?? 0} batches`],
                ['FIFO compliance', `${kpis?.fifoComplianceRate ?? 100}%`],
                ['Offline sync success', `${kpis?.offlineSyncSuccessRate ?? 100}%`],
                ['QC handoff turnaround', `${kpis?.qualityHandoffTurnaroundHours ?? 0}h`],
                ['Anomaly flag rate', `${kpis?.anomalyFlagRate ?? 0}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">{label}</p>
                  <p className="text-lg font-bold text-stone-800 mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">Processing Pipeline</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {PIPELINE.map((stage, i, arr) => {
                const stageBatches = batches.filter(b => b.status === stage.id);
                return (
                  <div key={stage.id} className="relative">
                    <div className={`border-2 ${stage.color} rounded-xl p-4`}>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${stage.text} mb-2`}>{stage.label}</p>
                      <p className={`text-3xl font-bold ${stage.text}`}>{stageBatches.length}</p>
                      <p className="text-xs text-stone-400 mt-1">batches</p>
                      <div className="mt-3 space-y-1">
                        {stageBatches.slice(0, 3).map(b => (
                          <div key={b.batchId} className="text-xs text-stone-600 bg-white rounded px-2 py-1 truncate">
                            {b.district} — {b.batchId?.substring(0, 8)}
                          </div>
                        ))}
                        {stageBatches.length > 3 && (
                          <div className="text-xs text-stone-400 px-2">+{stageBatches.length - 3} more</div>
                        )}
                      </div>
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 z-10 hidden lg:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          {batches.some(b => {
            if (!b.createdAt) return false;
            const hrs = (Date.now() - new Date(b.createdAt).getTime()) / 3600000;
            return hrs > 24 && b.status === 'In Transit';
          }) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Quality Risk Alert</p>
                <p className="text-xs text-amber-700 mt-0.5">One or more batches have been in transit for over 24 hours. Confirm receipt immediately to prevent quality degradation.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IncomingBatches() {
  const { batches, loading, refetch } = useBatches();

  const [scanQr, setScanQr] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const incomingBatches = batches.filter(b => b.status === 'In Transit' || b.rawStatus === 'pending_transport');

  const handleStartProcessing = async (batchId: string) => {
    try {
      const payload = { condition: 'fresh', locationName: 'Washing Station Intake', notes: 'QR intake confirmed by processor' };
      const result = await saveProcessorWrite(`/processors/batches/${batchId}/status`, 'PATCH', { status: 'received', ...payload }, () => apiService.updateBatchStatus(batchId, 'received', payload));
      toast.success('Receipt confirmed. Batch is ready for processing.');
      refetch();
    } catch { toast.error('Failed to update batch'); }
  };

  useEffect(() => {
    if (!isCameraOpen) return;
    let html5QrCode: any;
    
    const startScanner = async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Ensure DOM is ready
      
      const Html5Qrcode = (window as any).Html5Qrcode;
      if (!Html5Qrcode) return;

      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          toast.error("No cameras found on your device.");
          setIsCameraOpen(false);
          return;
        }
        
        // Try to find a back camera, otherwise use the first one
        const backCamera = cameras.find((c: any) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
        const cameraId = backCamera ? backCamera.id : cameras[0].id;

        html5QrCode = new Html5Qrcode("qr-reader");
        await html5QrCode.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            setScanQr(decodedText);
            setIsCameraOpen(false);
            
            const batch = batches.find(b => b.qrCode === decodedText || b.batchId === decodedText);
            if (!batch) {
              toast.error('Batch not found for this QR Code');
              return;
            }
            if (!['In Transit', 'pending_transport'].includes(batch.status)) {
              toast.info(`Batch is already in ${batch.status} status`);
              return;
            }
            handleStartProcessing(batch.batchId);
          },
          () => { /* silent */ }
        );
      } catch (err) {
        console.error("Camera error:", err);
        toast.error("Could not access camera. Please ensure permissions are granted.");
        setIsCameraOpen(false);
      }
    };

    if (!(window as any).Html5Qrcode) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode';
      script.async = true;
      script.onload = startScanner;
      document.body.appendChild(script);
    } else {
      startScanner();
    }

    return () => {
      if (html5QrCode) {
        try { 
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error); 
        } catch(e) {}
      }
    };
  }, [isCameraOpen, batches]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanQr) return;
    const batch = batches.find(b => b.qrCode === scanQr || b.batchId === scanQr);
    if (!batch) {
      toast.error('Batch not found for this QR Code');
      return;
    }
    if (!['In Transit', 'pending_transport'].includes(batch.status)) {
      toast.info(`Batch is already in ${batch.status} status`);
      setScanQr('');
      return;
    }
    handleStartProcessing(batch.batchId);
    setScanQr('');
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Incoming Batches</h2>
        <button onClick={refetch} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-stone-800">Scan QR Code</h3>
          <p className="text-sm text-stone-500">Scan the QR code on the batch label to automatically receive it.</p>
        </div>
        <div className="flex gap-3">
          <form onSubmit={handleScan} className="flex gap-2 w-full max-w-sm">
            <input 
              type="text" 
              placeholder="Scan or enter QR Code..." 
              value={scanQr}
              onChange={(e) => setScanQr(e.target.value)}
              className="flex-1 px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-stone-50"
            />
            <button type="submit" className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors">
              Submit
            </button>
          </form>
          <button 
            onClick={() => setIsCameraOpen(!isCameraOpen)}
            className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${
              isCameraOpen ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            <Camera className="w-5 h-5" />
            {isCameraOpen ? 'Close Camera' : 'Camera Scan'}
          </button>
        </div>
      </div>

      {isCameraOpen && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm mb-5">
          <div id="qr-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden border border-stone-200"></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Incoming Queue ({incomingBatches.length})</h3>
          </div>
          <div className="overflow-x-auto">
            {incomingBatches.length === 0 ? (
              <EmptyState icon={Package} message="No incoming batches waiting for intake" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Batch ID', 'District', 'Washing Station', 'Weight (kg)', 'Transit Risk', 'Condition', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {incomingBatches.map(b => (
                    <tr key={b.batchId} className="hover:bg-stone-50">
                      <td className="px-4 py-3 font-mono text-stone-500 text-xs">{b.batchId?.substring(0, 8)}</td>
                      <td className="px-4 py-3 font-medium text-orange-700">{b.district}</td>
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{b.washingStation}</td>
                      <td className="px-4 py-3 font-medium text-stone-800">
                        <div>{Number(b.weightCherry).toLocaleString()}</div>
                        <div className="mt-1"><ProcessingWeightRuleBadge batch={b} /></div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {b.transitHours && b.transitHours > 24 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> {Math.round(b.transitHours)}h
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Normal</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{b.arrivalCondition || 'Pending arrival'}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessingQueue() {
  const { batches, loading, refetch } = useBatches();
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [processForm, setProcessForm] = useState({
    greenCoffeeWeightKg: '',
    coffeeForm: 'Parchment',
    pulpingHours: '',
    fermentationHours: '',
    washingCycles: '',
    dryingHours: '',
    initialMoisture: '',
    visualDefects: '',
    anomalies: '',
    downtimeMinutes: '',
    notes: '',
  });

  const moveForward = async (batchId: string, currentStatus: string) => {
    const next: Record<string, string> = {
      'In Transit': 'received',
      'Received': 'processing',
      'Processing': 'ready_for_quality',
    };
    const nextStatus = next[currentStatus];
    if (!nextStatus) return;
    const batch = batches.find(b => b.batchId === batchId);
    const rule = processingWeightRuleFor(batch);
    if (['processing', 'ready_for_quality'].includes(nextStatus) && !rule.canProcess) {
      toast.error(rule.message);
      return;
    }
    if (currentStatus === 'Processing') {
      setSelectedBatch(batch);
      return;
    }
    try {
      const result = await saveProcessorWrite(`/processors/batches/${batchId}/status`, 'PATCH', { status: nextStatus }, () => apiService.updateBatchStatus(batchId, nextStatus));
      toast.success((result as any).queued ? 'Status saved locally for sync' : currentStatus === 'Received' ? 'Batch moved to processing' : 'Receipt confirmed');
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update status'); }
  };

  const submitProcessing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !processForm.greenCoffeeWeightKg) {
      toast.error('Enter output weight before quality handoff');
      return;
    }
    const selectedRule = processingWeightRuleFor(selectedBatch);
    if (!selectedRule.canProcess) {
      toast.error(selectedRule.message);
      return;
    }
    const payload = {
      ...processForm,
      greenCoffeeWeightKg: Number(processForm.greenCoffeeWeightKg),
      pulpingHours: Number(processForm.pulpingHours || 0),
      fermentationHours: Number(processForm.fermentationHours || 0),
      washingCycles: Number(processForm.washingCycles || 0),
      dryingHours: Number(processForm.dryingHours || 0),
      initialMoisture: Number(processForm.initialMoisture || 0),
      downtimeMinutes: Number(processForm.downtimeMinutes || 0),
      visualDefects: processForm.visualDefects.split(',').map(x => x.trim()).filter(Boolean),
      anomalies: processForm.anomalies.split(',').map(x => x.trim()).filter(Boolean),
    };
    try {
      const result = await saveProcessorWrite(`/processors/batches/${selectedBatch.batchId}/complete`, 'POST', payload, () => apiService.completeProcessing(selectedBatch.batchId, payload));
      toast.success((result as any).queued ? 'Processing log saved locally for sync' : 'Processing complete and QC notified');
      setSelectedBatch(null);
      setProcessForm({ greenCoffeeWeightKg: '', coffeeForm: 'Parchment', pulpingHours: '', fermentationHours: '', washingCycles: '', dryingHours: '', initialMoisture: '', visualDefects: '', anomalies: '', downtimeMinutes: '', notes: '' });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to complete processing'); }
  };

  const statusOrder = ['Received', 'Processing', 'Quality Check', 'In Transit', 'Dispatched'];
  const sortedBatches = [...batches].sort((a, b) => {
    const statusDiff = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
    if (statusDiff !== 0) return statusDiff;
    return Number(new Date(a.createdAt || 0)) - Number(new Date(b.createdAt || 0));
  });
  const queueCounts = statusOrder.map((status) => ({
    status,
    count: batches.filter((batch) => batch.status === status).length,
  }));
  const getAction = (batch: any) => {
    const rule = processingWeightRuleFor(batch);
    if (batch.status === 'Received') {
      return {
        label: 'Start Processing',
        disabled: !rule.canProcess,
        onClick: () => moveForward(batch.batchId, batch.status),
      };
    }
    if (batch.status === 'Processing') {
      return {
        label: 'Complete Processing',
        disabled: !rule.canProcess,
        onClick: () => moveForward(batch.batchId, batch.status),
      };
    }
    if (batch.status === 'In Transit') {
      return { label: 'Scan QR Intake', disabled: true, onClick: () => {} };
    }
    if (batch.status === 'Quality Check') {
      return { label: 'With QC', disabled: true, onClick: () => {} };
    }
    return { label: 'No action', disabled: true, onClick: () => {} };
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Processing Queue</h2>
        <div className="flex items-center gap-3">
          <ProcessorSyncStatus />
          <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full">{batches.length} total batches</span>
          <button onClick={refetch} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-stone-800">Processing Operations Table</h3>
              <p className="text-xs text-stone-500 mt-0.5">Many-batch view for intake, active processing, QC handoff, and dispatch readiness</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {queueCounts.map((item) => (
                <span key={item.status} className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-medium">
                  {item.status}: {item.count}
                </span>
              ))}
            </div>
          </div>
          {sortedBatches.length === 0 ? (
            <EmptyState icon={Package} message="No batches in the processing queue" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr className="text-left text-xs uppercase text-stone-500">
                    <th className="px-4 py-3 font-semibold">Batch</th>
                    <th className="px-4 py-3 font-semibold">Origin / Location</th>
                    <th className="px-4 py-3 font-semibold">Washing Station</th>
                    <th className="px-4 py-3 font-semibold">Weight</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Processing Rule</th>
                    <th className="px-4 py-3 font-semibold">Group</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {sortedBatches.map((batch) => {
                    const action = getAction(batch);
                    return (
                      <tr key={batch.batchId} className="hover:bg-stone-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-800">{batch.batchId?.substring(0, 12)}</p>
                          <p className="text-xs text-stone-500">{batch.qrCode || batch.batchId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-700">{batch.farmName || 'Farm origin'}</p>
                          <p className="text-xs text-stone-500">{batch.district || 'Location pending'}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-600">{batch.washingStation || 'Not assigned'}</td>
                        <td className="px-4 py-3 font-semibold text-stone-800">{Number(batch.weightCherry || 0).toLocaleString()} kg</td>
                        <td className="px-4 py-3"><StatusBadge status={batch.status} /></td>
                        <td className="px-4 py-3"><ProcessingWeightRuleBadge batch={batch} /></td>
                        <td className="px-4 py-3">
                          {batch.batchGroupId ? (
                            <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-1 rounded-full">{batch.batchGroupId}</span>
                          ) : (
                            <span className="text-xs text-stone-400">Single batch</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-semibold hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {action.label}
                            {!action.disabled && <ChevronRight className="w-3 h-3" />}
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
      )}

      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-orange-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold">Complete Processing Log</h3>
                <p className="text-xs text-orange-100">{selectedBatch.farmName} - {selectedBatch.batchId?.substring(0, 8)}</p>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="p-1 rounded hover:bg-white/10"><Plus className="w-5 h-5 rotate-45" /></button>
            </div>
            <form onSubmit={submitProcessing} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-3 gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3">
                <div>
                  <p className="text-xs text-orange-700">Cherry input</p>
                  <p className="font-bold text-stone-800">{Number(selectedBatch.weightCherry || 0).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-xs text-orange-700">Output weight</p>
                  <p className="font-bold text-stone-800">{Number(processForm.greenCoffeeWeightKg || 0).toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-xs text-orange-700">Yield</p>
                  <p className="font-bold text-stone-800">{selectedBatch.weightCherry ? `${Math.round((Number(processForm.greenCoffeeWeightKg || 0) / Number(selectedBatch.weightCherry)) * 100)}%` : '0%'}</p>
                </div>
              </div>
              <div className={`rounded-xl border p-3 text-xs ${
                processingWeightRuleFor(selectedBatch).canProcess
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : processingWeightRuleFor(selectedBatch).code === 'split_required'
                    ? 'bg-red-50 border-red-100 text-red-800'
                    : 'bg-amber-50 border-amber-100 text-amber-800'
              }`}>
                <p className="font-bold">{processingWeightRuleFor(selectedBatch).label}</p>
                <p className="mt-1">{processingWeightRuleFor(selectedBatch).message}</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['greenCoffeeWeightKg', 'Output weight kg', 'number'],
                  ['pulpingHours', 'Pulping hours', 'number'],
                  ['fermentationHours', 'Fermentation hours', 'number'],
                  ['washingCycles', 'Washing cycles', 'number'],
                  ['dryingHours', 'Drying hours', 'number'],
                  ['initialMoisture', 'Initial moisture %', 'number'],
                  ['downtimeMinutes', 'Downtime minutes', 'number'],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-stone-500 mb-1">{label}</label>
                    <input required={['greenCoffeeWeightKg', 'initialMoisture'].includes(key)} type={type} value={(processForm as any)[key]} onChange={e => setProcessForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Coffee form</label>
                  <select value={processForm.coffeeForm} onChange={e => setProcessForm(prev => ({ ...prev, coffeeForm: e.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
                    <option value="Parchment">Parchment</option>
                    <option value="Green Coffee">Green Coffee</option>
                  </select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <textarea value={processForm.visualDefects} onChange={e => setProcessForm(prev => ({ ...prev, visualDefects: e.target.value }))} placeholder="Visual defects, comma separated" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[90px]" />
                <textarea value={processForm.anomalies} onChange={e => setProcessForm(prev => ({ ...prev, anomalies: e.target.value }))} placeholder="Anomalies, risk flags, equipment issues" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[90px]" />
              </div>
              <textarea value={processForm.notes} onChange={e => setProcessForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Processing notes" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[90px]" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedBatch(null)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-semibold text-stone-600">Cancel</button>
                <button disabled={!processingWeightRuleFor(selectedBatch).canProcess} className="px-4 py-2 bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Send to Quality</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchTracking() {
  const { batches, loading } = useBatches();
  const STEPS = ['In Transit', 'Received', 'Processing', 'Quality Check', 'Dispatched'];
  const sortedBatches = [...batches].sort((a, b) => {
    const aStep = STEPS.indexOf(normalizeProcessorStage(a.status));
    const bStep = STEPS.indexOf(normalizeProcessorStage(b.status));
    if (aStep !== bStep) return aStep - bStep;
    return String(a.farmName || '').localeCompare(String(b.farmName || ''));
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Batch Transformation Tracking</h2>
          <p className="text-sm text-stone-500 mt-0.5">Table view of each batch as it moves from intake to dispatch</p>
        </div>
        <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full">{batches.length} tracked batches</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : batches.length === 0 ? (
        <EmptyState icon={Package} message="No batches to track" />
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr className="text-left text-xs uppercase text-stone-500">
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Origin / Location</th>
                  <th className="px-4 py-3 font-semibold">Weight</th>
                  <th className="px-4 py-3 font-semibold">Current Stage</th>
                  {STEPS.map((step) => (
                    <th key={step} className="px-3 py-3 text-center font-semibold whitespace-nowrap">{step}</th>
                  ))}
                  <th className="px-4 py-3 font-semibold">Processing Rule</th>
                  <th className="px-4 py-3 font-semibold">Quality Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sortedBatches.map((batch) => {
                  const currentStage = normalizeProcessorStage(batch.status);
                  const currentIdx = Math.max(0, STEPS.indexOf(currentStage));
                  const quality = batch.latestQuality;
                  const qualityNotes = qualityEvidenceSummary(quality?.notes);
                  return (
                    <tr key={batch.batchId} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-stone-800">{batch.batchId?.substring(0, 12)}</p>
                        <p className="text-xs text-stone-500">{batch.qrCode || batch.batchId}</p>
                        {batch.batchGroupId && <p className="text-xs font-semibold text-violet-700 mt-1">Group {batch.batchGroupId}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-700">{batch.farmName || 'Farm origin'}</p>
                        <p className="text-xs text-stone-500">{batch.district || 'Location pending'}</p>
                        <p className="text-xs text-stone-400 mt-1">{batch.washingStation || 'Washing station pending'}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-800">{Number(batch.weightCherry || 0).toLocaleString()} kg</td>
                      <td className="px-4 py-3"><StatusBadge status={currentStage} /></td>
                      {STEPS.map((step, index) => {
                        const done = currentIdx >= index;
                        const active = currentIdx === index;
                        return (
                          <td key={step} className="px-3 py-3 text-center">
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                              done ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'
                            }`}>
                              {done ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                            </span>
                            {active && <p className="text-[10px] text-emerald-700 font-semibold mt-1">Current</p>}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3"><ProcessingWeightRuleBadge batch={batch} /></td>
                      <td className="px-4 py-3 min-w-56">
                        {quality ? (
                          <div className="rounded-lg border border-violet-100 bg-violet-50 p-2">
                            <p className="text-xs font-semibold text-violet-700">Cupping {quality.cuppingScore} pts</p>
                            <p className="text-xs text-stone-600 mt-1">Moisture {quality.moisture}%</p>
                            <p className="text-xs text-stone-500 mt-1">Defects: {formatDefectSummary(quality.defects)}</p>
                            {qualityNotes.map((note: any) => (
                              <p key={note} className="text-xs text-violet-700 mt-1">{note}</p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400">Awaiting quality result</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MaintenanceSchedule() {
  const { batches, refetch } = useBatches();
  const [form, setForm] = useState({ batchId: '', stepName: 'maintenance', durationHours: '', downtimeMinutes: '', anomalies: '', notes: '', locationName: 'Washing Station' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.batchId) {
      toast.error('Select a batch for this schedule or downtime log');
      return;
    }
    const payload = {
      ...form,
      durationHours: Number(form.durationHours || 0),
      downtimeMinutes: Number(form.downtimeMinutes || 0),
      anomalies: form.anomalies.split(',').map(x => x.trim()).filter(Boolean),
    };
    try {
      const result = await saveProcessorWrite(`/processors/batches/${form.batchId}/logs`, 'POST', payload, () => apiService.logProcessingStep(form.batchId, payload));
      toast.success((result as any).queued ? 'Schedule log saved locally for sync' : 'Production schedule / downtime log saved');
      setForm({ batchId: '', stepName: 'maintenance', durationHours: '', downtimeMinutes: '', anomalies: '', notes: '', locationName: 'Washing Station' });
      refetch();
    } catch { toast.error('Failed to save production log'); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Production Schedule & Maintenance</h2>
        <ProcessorSyncStatus />
      </div>
      <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Batch</label>
            <select value={form.batchId} onChange={e => setForm(prev => ({ ...prev, batchId: e.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
              <option value="">Select batch</option>
              {batches.map(b => <option key={b.batchId} value={b.batchId}>{b.farmName} - {b.batchId?.substring(0, 8)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">Log type</label>
            <select value={form.stepName} onChange={e => setForm(prev => ({ ...prev, stepName: e.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
              <option value="capacity_slot">Capacity slot</option>
              <option value="maintenance">Maintenance downtime</option>
              <option value="quality_intake">Quality intake</option>
              <option value="processing_note">Processing note</option>
            </select>
          </div>
          <input value={form.durationHours} onChange={e => setForm(prev => ({ ...prev, durationHours: e.target.value }))} placeholder="Capacity/duration hours" type="number" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          <input value={form.downtimeMinutes} onChange={e => setForm(prev => ({ ...prev, downtimeMinutes: e.target.value }))} placeholder="Downtime minutes" type="number" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.locationName} onChange={e => setForm(prev => ({ ...prev, locationName: e.target.value }))} placeholder="Station / line" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          <input value={form.anomalies} onChange={e => setForm(prev => ({ ...prev, anomalies: e.target.value }))} placeholder="Anomalies or equipment issues, comma separated" className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
        </div>
        <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[90px]" />
        <button className="px-4 py-2 bg-orange-700 text-white rounded-lg text-sm font-semibold">Save Log</button>
      </form>
    </div>
  );
}

function ProcessorCompliance() {
  const checks = [
    ['NAEB intake requirements', 'Origin, district, washing station, weight, QR code, and arrival condition must be recorded before processing.'],
    ['FIFO handling', 'Older received batches should be processed first unless a quality-risk alert requires priority handling.'],
    ['Moisture and defect intake', 'Initial moisture, visible defects, anomalies, and downtime must be logged before QC handoff.'],
    ['Traceability lock', 'Checkpoint logs are append-only; processors should add corrections as new logs rather than altering submitted records.'],
    ['Role isolation', 'Processors do not approve export readiness, edit quality scores, or access farmer payment records.'],
  ];

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Basic Compliance & Sustainability</h2>
      <div className="grid lg:grid-cols-2 gap-4">
        {checks.map(([title, body]) => (
          <div key={title} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-800">{title}</p>
                <p className="text-sm text-stone-500 mt-1">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
        <h3 className="font-semibold text-emerald-900 mb-2">Station-Level Sustainability Metrics</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            ['Water use tracking', 'Record washing cycles'],
            ['Waste reduction', 'Monitor weight conversion'],
            ['Energy downtime', 'Log equipment anomalies'],
          ].map(([label, value]) => (
            <div key={label} className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-emerald-700">{label}</p>
              <p className="font-bold text-stone-800 mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StationInventory() {
  const [items, setItems] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInventory = useCallback(() => {
    setLoading(true);
    apiService.getProcessorInventory()
      .then(response => {
        setItems(response.data || []);
        setMovements(response.movements || []);
      })
      .catch(() => toast.error('Failed to load station inventory'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const currentStockKg = items.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const awaitingQc = items.filter(item => String(item.status || '').toLowerCase().includes('qc')).length;
  const fifoQueue = [...items].sort((a, b) => new Date(a.fifoDate || 0).getTime() - new Date(b.fifoDate || 0).getTime());
  const oldestAge = fifoQueue[0]?.ageInDays ?? 0;
  const priorityFor = (item: any) => {
    if (Number(item.ageInDays || 0) >= 3) return { label: 'High', className: 'bg-red-50 text-red-700 border-red-100', action: 'Process first' };
    if (Number(item.ageInDays || 0) >= 1) return { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-100', action: 'Schedule today' };
    return { label: 'Normal', className: 'bg-emerald-50 text-emerald-700 border-emerald-100', action: 'Monitor' };
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Station Inventory</h2>
          <p className="text-sm text-stone-500 mt-0.5">Washing-station stock, weight transformation, FIFO queue, and internal stock movement tracking.</p>
        </div>
        <button onClick={loadInventory} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm font-semibold text-stone-600 hover:bg-stone-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <KPICard label="Current station stock" value={`${currentStockKg.toLocaleString()} kg`} sub="Physical coffee held" icon={Warehouse} color="bg-orange-600" />
        <KPICard label="Inventory lots" value={String(items.length)} sub="Active stock records" icon={Package} color="bg-amber-600" />
        <KPICard label="Awaiting QC" value={String(awaitingQc)} sub="Ready after processing" icon={FileCheck} color="bg-violet-600" />
        <KPICard label="Oldest FIFO age" value={`${oldestAge}d`} sub="Process older lots first" icon={Clock} color="bg-sky-600" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800">Current Stock</h3>
              <p className="text-xs text-stone-500 mt-0.5">What is physically held at the processor station.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    {['Batch / QR', 'Farm Origin', 'Coffee Form', 'Current Weight', 'Location', 'Status'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 min-w-[180px]"><p className="font-semibold text-stone-800">{item.batchId?.slice(0, 10)}</p><p className="text-xs text-stone-500">{item.qrCode || item.lotNo || '-'}</p></td>
                      <td className="px-4 py-3 min-w-[180px]"><p className="font-medium text-stone-700">{item.farmName || 'Farm origin'}</p><p className="text-xs text-stone-500">{item.district || 'Location pending'}</p></td>
                      <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{item.coffeeForm || '-'}</td>
                      <td className="px-4 py-3 font-bold text-stone-800 whitespace-nowrap">{Number(item.weight || 0).toLocaleString()} kg</td>
                      <td className="px-4 py-3 text-stone-600 min-w-[160px]">{item.location || item.washingStation || 'Station stock'}</td>
                      <td className="px-4 py-3"><StatusBadge status={item.status || 'In stock'} /></td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400">No station inventory records yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800">Weight Transformation</h3>
              <p className="text-xs text-stone-500 mt-0.5">Shows conversion from cherry intake to the current processed form.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500">
                  <tr>
                    {['Batch', 'Cherry Input', 'Current Form', 'Current Weight', 'Loss / Conversion', 'Yield'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {items.map(item => {
                    const original = Number(item.originalCherryKg || 0);
                    const current = Number(item.weight || 0);
                    const loss = Math.max(0, original - current);
                    const yieldPct = original ? Math.round((current / original) * 100) : 0;
                    return (
                      <tr key={`${item.id}-weight`} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-semibold text-stone-800">{item.batchId?.slice(0, 12)}</td>
                        <td className="px-4 py-3 text-stone-700">{original.toLocaleString()} kg</td>
                        <td className="px-4 py-3 text-stone-700">{item.coffeeForm || '-'}</td>
                        <td className="px-4 py-3 font-bold text-stone-800">{current.toLocaleString()} kg</td>
                        <td className="px-4 py-3 text-stone-600">{loss.toLocaleString()} kg</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">{yieldPct}%</span></td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400">No transformation records yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="font-semibold text-stone-800">FIFO Queue</h3>
                <p className="text-xs text-stone-500 mt-0.5">Older lots should move first unless a quality risk changes priority.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>{['Batch', 'FIFO Date', 'Age', 'Priority', 'Next Action'].map(header => <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">{header}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {fifoQueue.map(item => {
                      const priority = priorityFor(item);
                      return (
                        <tr key={`${item.id}-fifo`} className="hover:bg-stone-50">
                          <td className="px-4 py-3 font-semibold text-stone-800">{item.batchId?.slice(0, 10)}</td>
                          <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{item.fifoDate ? new Date(item.fifoDate).toLocaleDateString() : '-'}</td>
                          <td className="px-4 py-3 text-stone-700">{item.ageInDays || 0} days</td>
                          <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priority.className}`}>{priority.label}</span></td>
                          <td className="px-4 py-3 text-stone-600">{priority.action}</td>
                        </tr>
                      );
                    })}
                    {fifoQueue.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-stone-400">FIFO queue is empty.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-stone-100">
                <h3 className="font-semibold text-stone-800">Stock Movements</h3>
                <p className="text-xs text-stone-500 mt-0.5">Internal movement history created by processing outputs and reconciliations.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500">
                    <tr>{['Movement', 'Batch', 'From', 'To', 'Weight', 'Time'].map(header => <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">{header}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {movements.map(movement => (
                      <tr key={movement.movementId} className="hover:bg-stone-50">
                        <td className="px-4 py-3 font-semibold text-stone-800 min-w-[160px]">{movement.movementType}</td>
                        <td className="px-4 py-3 text-stone-600">{movement.qrCode || movement.batchId?.slice(0, 10)}</td>
                        <td className="px-4 py-3 text-stone-600">{movement.fromLocation || '-'}</td>
                        <td className="px-4 py-3 text-stone-600">{movement.toLocation || '-'}</td>
                        <td className="px-4 py-3 font-bold text-stone-800">{Number(movement.quantityKg || 0).toLocaleString()} kg</td>
                        <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{movement.movementDate ? new Date(movement.movementDate).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                    {movements.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-stone-400">No stock movements recorded yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CorrectiveActions() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ submittedNotes: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadActions = useCallback(() => {
    setLoading(true);
    apiService.getProcessorCorrectiveActions()
      .then(r => setActions(r.data))
      .catch(() => toast.error('Failed to load corrective actions'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!form.submittedNotes.trim()) {
      toast.error('Add correction notes before submitting');
      return;
    }
    setSubmitting(true);
    try {
      await apiService.submitProcessorCorrectiveAction(selected.action_id, {
        submittedNotes: form.submittedNotes,
      });
      toast.success('Batch sent back to QC for reassessment');
      setSelected(null);
      setForm({ submittedNotes: '' });
      loadActions();
    } catch {
      toast.error('Failed to submit correction');
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = actions.filter(action => action.status !== 'Resolved').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Corrective Actions</h2>
          <p className="text-sm text-stone-500 mt-0.5">Reprocess failed batches and send them back to QC for reassessment</p>
        </div>
        <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-semibold">{openCount} open</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : actions.length === 0 ? (
        <EmptyState icon={AlertTriangle} message="No corrective actions assigned" />
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr className="text-left text-xs uppercase text-stone-500">
                  {['Batch', 'Issue', 'QC Result', 'Required Action', 'Deadline', 'Status', 'Action'].map(header => (
                    <th key={header} className="px-4 py-3 font-semibold whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {actions.map(action => (
                  <tr key={action.action_id} className="hover:bg-stone-50 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-800">{action.batch_id?.substring(0, 12)}</p>
                      <p className="text-xs text-stone-500">{action.qr_code || 'QR pending'}</p>
                      <p className="text-xs text-stone-400 mt-1">{action.farm_name || 'Farm origin'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-800">{action.issue_type}</p>
                      <span className={'inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ' + (action.severity === 'High' ? 'bg-red-100 text-red-700' : action.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>{action.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      <p>Cupping {Number(action.cupping_score || 0).toFixed(1)} pts</p>
                      <p className="text-xs mt-1">Moisture {Number(action.moisture || 0).toFixed(1)}%</p>
                      <p className="text-xs">Defects: {formatDefectSummary(action.defects)}</p>
                    </td>
                    <td className="px-4 py-3 min-w-[280px] text-amber-800">{action.required_action}</td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{action.deadline ? new Date(action.deadline).toLocaleDateString() : '72h'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={action.status} />
                      {action.review_notes && <p className="text-xs text-red-600 mt-1">{action.review_notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {action.status === 'Resolved' ? (
                        <span className="text-xs text-emerald-700 font-semibold">Accepted by QC</span>
                      ) : action.status === 'Ready for Reassessment' ? (
                        <span className="text-xs text-violet-700 font-semibold">Back in QC queue</span>
                      ) : (
                        <button onClick={() => {
                          setSelected(action);
                          setForm({ submittedNotes: action.submitted_notes || '' });
                        }} className="px-3 py-1.5 bg-orange-700 text-white rounded-lg text-xs font-semibold">
                          Complete Correction
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-stone-200">
            <div className="p-5 border-b border-stone-100">
              <h3 className="font-bold text-stone-800">Complete Correction</h3>
              <p className="text-sm text-stone-500 mt-1">{selected.issue_type} - {selected.qr_code || selected.batch_id}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-xs uppercase font-semibold text-amber-700">Required Action</p>
                <p className="text-sm text-amber-900 mt-1">{selected.required_action}</p>
              </div>
              <label className="block">
                <span className="text-xs uppercase font-semibold text-stone-500">Reprocessing notes</span>
                <textarea value={form.submittedNotes} onChange={e => setForm(prev => ({ ...prev, submittedNotes: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[110px]" placeholder="Explain what was corrected, for example re-dried to 11% moisture or sorted visible defects." />
              </label>
            </div>
            <div className="p-5 border-t border-stone-100 flex justify-end gap-2">
              <button type="button" onClick={() => setSelected(null)} className="px-4 py-2 border border-stone-200 rounded-lg text-sm font-semibold text-stone-600">Cancel</button>
              <button disabled={submitting} className="px-4 py-2 bg-orange-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60">{submitting ? 'Saving...' : 'Submit Correction'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function SupportTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subject: '', category: 'processing', description: '' });

  const loadTickets = useCallback(() => {
    setLoading(true);
    apiService.getProcessorSupportTickets()
      .then(response => setTickets(response.data || []))
      .catch(() => toast.error('Failed to load support tickets'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await saveProcessorWrite('/processors/support-tickets', 'POST', form, () => apiService.createProcessorSupportTicket(form));
      toast.success((result as any).queued ? 'Support ticket saved locally for sync' : 'Support ticket submitted');
      setForm({ subject: '', category: 'processing', description: '' });
      loadTickets();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to submit support ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Support Tickets & Requests</h2>
        <p className="text-sm text-stone-500 mt-0.5">Request help for processing, station operations, inventory, equipment, or offline sync issues.</p>
      </div>

      <form onSubmit={submitTicket} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            required
            value={form.subject}
            onChange={event => setForm(prev => ({ ...prev, subject: event.target.value }))}
            placeholder="Subject"
            className="sm:col-span-2 px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50"
          />
          <select
            value={form.category}
            onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))}
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50"
          >
            <option value="processing">Processing workflow</option>
            <option value="inventory">Inventory / FIFO</option>
            <option value="equipment">Equipment issue</option>
            <option value="offline-sync">Offline sync</option>
            <option value="batch-receipt">Batch receipt / QR scan</option>
          </select>
        </div>
        <textarea
          required
          value={form.description}
          onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))}
          placeholder="Describe the request"
          className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[110px]"
        />
        <button disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60">
          {saving ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h3 className="font-semibold text-stone-800">Submitted Requests</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-stone-400">No support tickets yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500">
                  {['Subject', 'Category', 'Status', 'Created'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {tickets.map(ticket => (
                  <tr key={ticket.ticketId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 min-w-[260px]">
                      <p className="font-semibold text-stone-800">{ticket.subject}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{ticket.description}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{ticket.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={ticket.status || 'Open'} /></td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '-'}</td>
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

function SupplierAssignments() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [aggregators, setAggregators] = useState<any[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedAggregators, setSelectedAggregators] = useState<Record<string, string>>({});

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getProcessorSupplierAssignments();
      setSuppliers(response.data.suppliers || []);
      setAggregators(response.data.aggregators || []);
      setStations(response.data.stations || []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load supplier assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const assignSupplier = async (supplier: any) => {
    const aggregatorId = selectedAggregators[supplier.profileId] || supplier.assignedAggregator?.userId;
    if (!aggregatorId) {
      toast.error('Select an aggregator first');
      return;
    }
    setSaving(supplier.profileId);
    try {
      await apiService.assignProcessorSupplier(supplier.profileId, { aggregatorId, status: 'APPROVED' });
      toast.success('Supplier connected to aggregator');
      await loadAssignments();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to assign supplier');
    } finally {
      setSaving(null);
    }
  };

  const pendingCount = suppliers.filter(s => String(s.assignmentStatus || '').toUpperCase() !== 'APPROVED').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Supplier Assignment</h2>
          <p className="text-sm text-stone-500 mt-0.5">Only farmers or cooperative suppliers who requested your assigned washing station appear here.</p>
          {stations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {stations.map(station => (
                <span key={station} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">{station}</span>
              ))}
            </div>
          )}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
          <Users className="w-4 h-4" /> {pendingCount} pending
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Supplier', 'Type', 'Location', 'Requested Station', 'Assigned Aggregator', 'Status', 'Action'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {suppliers.map(supplier => {
                  const status = String(supplier.assignmentStatus || 'PENDING_ASSIGNMENT').toUpperCase();
                  return (
                    <tr key={supplier.profileId} className="hover:bg-stone-50">
                      <td className="px-4 py-3 min-w-[220px]">
                        <p className="font-semibold text-stone-800">{supplier.supplierName}</p>
                        <p className="text-xs text-stone-500">{supplier.farmName}</p>
                        <p className="text-xs text-stone-400">{supplier.supplierPhone || supplier.supplierEmail || 'No contact recorded'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
                          {supplier.supplierType === 'COOPERATIVE' ? `Cooperative (${supplier.numberOfFarms || 0} farms)` : 'Farmer / Big Farm'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 min-w-[190px]">{supplier.location || 'Not recorded'}<p className="text-xs text-stone-400">{supplier.coordinates || 'No coordinates'}</p></td>
                      <td className="px-4 py-3 text-stone-700 min-w-[190px]">
                        <p className="font-semibold">{supplier.latestRequest?.washingStationName || supplier.preferredWashingStation || 'No request yet'}</p>
                        <p className="text-xs text-stone-400">{supplier.latestRequest?.reason || 'Supplier must request from portal'}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[220px]">
                        <select
                          value={selectedAggregators[supplier.profileId] || supplier.assignedAggregator?.userId || ''}
                          onChange={e => setSelectedAggregators(prev => ({ ...prev, [supplier.profileId]: e.target.value }))}
                          className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-sm"
                        >
                          <option value="">Select aggregator...</option>
                          {aggregators.map(aggregator => (
                            <option key={aggregator.userId} value={aggregator.userId}>{aggregator.fullName || aggregator.email}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={status === 'APPROVED' ? 'received' : 'pending_transport'} /></td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => assignSupplier(supplier)}
                          disabled={saving === supplier.profileId}
                          className="px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 disabled:opacity-50"
                        >
                          {saving === supplier.profileId ? 'Saving...' : status === 'APPROVED' ? 'Update' : 'Assign'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {suppliers.length === 0 && (
              <div className="py-12 text-center text-stone-400">
                {stations.length === 0
                  ? 'No washing station is assigned to your processor account yet.'
                  : 'No supplier has requested your assigned washing station yet.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Notifications() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getNotifications().then(r => {
      setNotifs(r.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Notifications</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
      ) : notifs.length === 0 ? (
        <EmptyState icon={AlertCircle} message="No notifications yet" />
      ) : notifs.map(n => (
        <div key={n.notificationId} className={`bg-white rounded-xl border p-4 shadow-sm flex gap-3 ${!n.read ? 'border-orange-200 bg-orange-50/30' : 'border-stone-200'}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100' : n.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
            {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-800">{n.title}</p>
              {!n.read && <span className="w-2 h-2 rounded-full bg-orange-500" />}
            </div>
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
  suppliers: SupplierAssignments,
  incoming: IncomingBatches,
  queue: ProcessingQueue,
  tracking: BatchTracking,
  corrective: CorrectiveActions,
  inventory: StationInventory,
  reports: RoleReports,
  support: SupportTickets,
  notifications: Notifications,
};

export default function ProcessorDashboard() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const Component = SECTIONS[section] || Overview;
  return <Component />;
}
