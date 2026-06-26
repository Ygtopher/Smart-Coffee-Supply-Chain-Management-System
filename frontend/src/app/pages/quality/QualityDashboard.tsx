import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { enqueueQualityWrite, getQualityQueue, syncQualityQueue } from '../../services/offlineSync';
import { RoleReports } from '../../components/RoleReports';
import {
  FlaskConical, Award, AlertTriangle, FileText, CheckCircle2,
  ArrowUpRight, Star, Download, Plus, AlertCircle, QrCode, Link2, Smartphone, Camera, Wifi, WifiOff, BarChart3,
  Search
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const chartSortClass = "px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-600";
const monthYearValue = (row: any) => {
  const source = row?.createdAt || row?.month || row?.date || row?.year || '';
  if (!source) return 0;
  const d = new Date(source);
  if (!Number.isNaN(d.getTime())) return d.getTime();
  const parsed = Date.parse(`1 ${source}`);
  return Number.isNaN(parsed) ? 0 : parsed;
};

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

const defectTotal = (defects: any) => {
  if (!defects) return 0;
  if (typeof defects === 'number') return defects;
  if (typeof defects === 'string') return Number(defects) || 0;
  if (Array.isArray(defects)) return defects.reduce((s, v) => s + (Number(v.count ?? v) || 0), 0);
  if (typeof defects === 'object') return Object.values(defects).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
  return 0;
};

const qualityTier = (score: number, moisture: number, defects: any) => {
  const total = defectTotal(defects);
  if (score >= 85 && total <= 5 && moisture >= 10 && moisture <= 12) return 'Premium';
  if (score >= 75 && score < 85 && total <= 10) return 'Standard';
  return 'Low';
};

const matchesSearch = (values: any[], query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values
    .filter(value => value !== undefined && value !== null)
    .join(' ')
    .toLowerCase()
    .includes(normalized);
};

const tableDate = (value: any) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const parseQualityNotes = (notes: any) => {
  if (!notes) return {};
  if (typeof notes === 'object') return notes;
  try { return JSON.parse(notes); } catch { return { notes }; }
};

const safeFixed = (value: any, digits = 1, fallback = 'Not recorded') => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(digits) : fallback;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const createSimplePdf = (title: string, lines: string[]) => {
  const clean = (value: any, max = 104) => String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
  const escapeText = (value: any, max = 104) => clean(value, max)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
  const content = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    `(${escapeText(title, 80)}) Tj`,
    '/F1 10 Tf',
    '0 -26 Td',
    '(Smart Coffee Supply Chain Management System - IMPEXCOR Ltd) Tj',
    '0 -20 Td',
    ...lines.flatMap(line => [`(${escapeText(line)}) Tj`, '0 -16 Td']),
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach(object => {
    offsets.push(pdf.length);
    pdf += object + '\n';
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach(offset => {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

const qualityCertificatePdf = (assessment: any, certificate: any) => {
  const notes = parseQualityNotes(assessment.notes);
  const certNo = certificate?.certificateNo || assessment.certificate?.certificateNo || `QC-${assessment.assessmentId?.substring(0, 8)}`;
  const issuedAt = certificate?.issuedAt || assessment.certificate?.issuedAt || new Date().toISOString();
  const status = certificate?.status || assessment.certificate?.status || (assessment.qualityTier === 'Low' ? 'Corrective Action Required' : 'Issued');
  const lines = [
    '',
    `Certificate No: ${certNo}`,
    `Certificate Status: ${status}`,
    `Issued At: ${new Date(issuedAt).toLocaleString()}`,
    `Assessment ID: ${assessment.assessmentId}`,
    `Batch ID: ${assessment.batch?.batchId || assessment.batchId || 'Not recorded'}`,
    `QR Code: ${assessment.batch?.qrCode || 'QR pending'}`,
    `Farm / Origin: ${assessment.batch?.farmName || assessment.batch?.originName || 'Not recorded'}`,
    `Location: ${assessment.batch?.district || assessment.batch?.location || 'Not recorded'}`,
    `Washing Station: ${assessment.batch?.washingStation || 'Not recorded'}`,
    '',
    `Cupping Score: ${safeFixed(assessment.cuppingScore)} / 100`,
    `Quality Tier: ${assessment.qualityTier || qualityTier(Number(assessment.cuppingScore || 0), Number(assessment.moisture || 0), assessment.defects)}`,
    `Moisture: ${safeFixed(assessment.moisture)}%`,
    `Defect Total: ${assessment.defectTotal ?? defectTotal(assessment.defects)}`,
    `Density: ${notes.density || 'Not recorded'}`,
    `Screen Size: ${notes.screenSize || 'Not recorded'}`,
    '',
    `Assessor: ${assessment.assessor?.fullName || assessment.assessor?.email || assessment.assessorId || 'Not recorded'}`,
    `Notes: ${notes.notes || 'No notes recorded.'}`,
    `Corrective Action: ${notes.correctiveAction || 'None'}`,
    '',
    'This PDF was generated from the verified quality assessment record and logged for audit traceability.',
  ];
  return { certNo, blob: createSimplePdf('QUALITY CERTIFICATE', lines) };
};

const QualityTableControls = ({ search, onSearch, sort, onSort, options, resultCount, totalCount }: any) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
      <input
        type="search"
        value={search}
        onChange={e => onSearch(e.target.value)}
        placeholder="Search table..."
        className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
      />
    </div>
    <div className="flex items-center gap-2">
      <select
        value={sort}
        onChange={e => onSort(e.target.value)}
        className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
      >
        {options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-2 rounded-lg whitespace-nowrap">
        {resultCount} of {totalCount}
      </span>
    </div>
  </div>
);

function QualitySyncStatus() {
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const refresh = useCallback(async () => setQueueCount((await getQualityQueue()).length), []);

  useEffect(() => {
    refresh();
    const handleOnline = async () => {
      setOnline(true);
      const result = await syncQualityQueue(apiService.getToken());
      if (result.synced > 0) toast.success(`Synced ${result.synced} quality record(s)`);
      refresh();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('quality-sync-queue-changed', refresh);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('quality-sync-queue-changed', refresh);
    };
  }, [refresh]);

  const syncNow = async () => {
    const result = await syncQualityQueue(apiService.getToken());
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

async function saveQualityWrite(endpoint: string, method: 'POST', body: Record<string, any>, onlineAction: () => Promise<any>) {
  if (!navigator.onLine) {
    await enqueueQualityWrite(endpoint, method, body);
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
    await enqueueQualityWrite(endpoint, method, body);
    toast.success('Connection failed, so this was saved locally for sync.');
    return { queued: true };
  }
}

function Overview() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [batches, setBatches] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scoreSort, setScoreSort] = useState('year');

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const [pendingRes, historyRes, dashboardRes] = await Promise.all([
          apiService.getPendingAssessments(),
          apiService.getQCHistory(),
          apiService.getQCDashboard().catch(() => ({ data: null }))
        ]);
        setBatches(pendingRes.data || []);
        setHistory(historyRes.data || []);
        if (dashboardRes && dashboardRes.data) {
          setDashboard(dashboardRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  const scoreRows = history.map((b: any) => {
    const name = b.batch?.qrCode || (b.batch?.district || b.batch?.batchId || '').substring(0, 8);
    return {
      name,
      score: Number(b.cuppingScore || 0),
      createdAt: b.createdAt
    };
  });

  const sortedScoreRows = scoreSort === 'month'
      ? [...scoreRows].sort((a, b) => new Date(monthYearValue(a)).getMonth() - new Date(monthYearValue(b)).getMonth())
      : [...scoreRows].sort((a, b) => monthYearValue(a) - monthYearValue(b));

  const avgCuppingScore = history.length
    ? (history.reduce((sum, h) => sum + Number(h.cuppingScore || 0), 0) / history.length).toFixed(1)
    : '—';

  const approvedCount = history.filter((h: any) => h.qualityTier !== 'Low').length;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-violet-700 to-violet-500 rounded-2xl p-5 text-white">
        <p className="text-violet-100 text-sm mb-1">{t('welcome')},</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{user?.name || 'Quality Controller Dashboard'}</h2>
            <p className="text-violet-100 text-sm mt-1">NAEB Rwanda - SCA aligned quality assessment lab</p>
          </div>
          <QualitySyncStatus />
        </div>
        <p className="text-violet-100 text-sm mt-1">NAEB Rwanda — SCA Certified Quality Assessment Lab</p>
        <div className="mt-4 pt-4 border-t border-violet-600 grid grid-cols-4 gap-4">
          {[{ label: 'Certification', value: 'SCA Q-Grader' }, { label: 'Tests This Month', value: String(batches.length) }, { label: 'Pass Rate', value: '75%' }, { label: 'Avg Score', value: `${avgCuppingScore} pts` }].map(s => (
            <div key={s.label}>
              <p className="text-violet-200 text-xs">{s.label}</p>
              <p className="text-white font-semibold text-sm mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label={t('quality.pending_tests')} value={String(batches.length)} sub="Awaiting test" icon={FlaskConical} color="bg-violet-600" />
        <KPICard label={t('nav.queue')} value={String(batches.length)} sub="Ready for testing" icon={CheckCircle2} color="bg-emerald-600" />
        <KPICard label={t('quality.avg_cupping_score')} value={avgCuppingScore !== '—' ? `${avgCuppingScore} pts` : '—'} sub="From live assessments" icon={Star} color="bg-amber-500" />
        <KPICard label={t('quality.approved_batches')} value={String(approvedCount)} sub="From assessments" icon={FileText} color="bg-sky-600" />
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
        <h3 className="font-semibold text-stone-800 mb-4">Quality Controller Thesis KPIs</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['Assessment turnaround', `${dashboard?.kpis?.assessmentTurnaroundHours ?? 0}h`],
            ['Cupping consistency', `${dashboard?.kpis?.cuppingConsistencyRate ?? 100}%`],
            ['Defect logging accuracy', `${dashboard?.kpis?.defectLoggingAccuracy ?? 100}%`],
            ['Certificate success', `${dashboard?.kpis?.certificateGenerationSuccessRate ?? 100}%`],
            ['Corrective resolution', `${dashboard?.kpis?.correctiveActionResolutionRate ?? 100}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <p className="text-xs text-stone-500">{label}</p>
              <p className="text-lg font-bold text-stone-800 mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-semibold text-stone-800">Cupping Scores by Batch</h3>
            <select value={scoreSort} onChange={e => setScoreSort(e.target.value)} className={chartSortClass}>
              <option value="year">Year</option>
              <option value="month">Month</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sortedScoreRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[75, 95]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2.5} name="Cupping Score" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-800 mb-4">Pending Quality Tests</h3>
          {loading ? (
            <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
          ) : (
            <div className="space-y-3">
              {batches.map(b => (
                <div key={b.batchId} className="flex items-center justify-between p-3 bg-violet-50 border border-violet-100 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{b.district} - {b.washingStation}</p>
                    <p className="text-xs text-stone-500">{b.batchId.substring(0,8)} • {Number(b.weightCherry).toLocaleString()} kg</p>
                  </div>
                  <button
                    onClick={() => toast.info(`Go to Testing tab to assess ${b.batchId.substring(0,8)}`)}
                    className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Start Test
                  </button>
                </div>
              ))}
              {batches.length === 0 && <p className="text-center text-stone-400 py-10">No pending tests</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QualityTesting() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    batch: '', moisture: '', density: '', screenSize: '', defects: '',
    black: '0', broken: '0', sour: '0', insect: '0', mold: '0', foreignMatter: '0',
    flavor: '8', aroma: '8', acidity: '8', body: '8', aftertaste: '8', balance: '8',
    uniformity: '10', cleanCup: '10', sweetness: '10', overall: '8',
    notes: '', evidence: '', correctiveAction: ''
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const selectedBatch = batches.find(b => b.batchId === form.batch);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await apiService.getPendingAssessments();
        setBatches(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

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
        
        const backCamera = cameras.find((c: any) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment'));
        const cameraId = backCamera ? backCamera.id : cameras[0].id;

        html5QrCode = new Html5Qrcode("qc-qr-reader");
        await html5QrCode.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            setIsCameraOpen(false);
            
            const batch = batches.find(b => b.qrCode === decodedText || b.batchId === decodedText);
            if (!batch) {
              toast.error('Batch not found in pending queue');
              return;
            }
            setForm(f => ({ ...f, batch: batch.batchId }));
            toast.success(`Batch ${batch.batchId.substring(0,8)} identified successfully!`);
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

  const calculateScore = () => {
    const scores = [form.flavor, form.aroma, form.acidity, form.body, form.aftertaste, form.balance, form.uniformity, form.cleanCup, form.sweetness, form.overall]
      .map(v => parseFloat(v) || 0);
    const base = 0;
    const total = base + scores.reduce((s, v) => s + v, 0);
    return total > 0 ? Math.min(100, total).toFixed(1) : '0.0';
  };
  const currentDefects = {
    black: Number(form.black || 0),
    broken: Number(form.broken || 0),
    sour: Number(form.sour || 0),
    insect: Number(form.insect || 0),
    mold: Number(form.mold || 0),
    foreignMatter: Number(form.foreignMatter || 0),
    general: Number(form.defects || 0),
  };
  const scoreValue = parseFloat(calculateScore());
  const moistureValue = parseFloat(form.moisture || '0');
  const previewTier = qualityTier(scoreValue, moistureValue, currentDefects);
  const totalDefects = defectTotal(currentDefects);
  const assessmentDecision = previewTier === 'Low' ? 'Corrective Action Required' : 'Approve for Export Readiness';

  const handleSubmit = async () => {
    if (!form.batch || !form.moisture) {
      toast.error('Please select a batch and enter moisture content');
      return;
    }
    setSubmitting(true);
    const defects = {
      black: Number(form.black || 0),
      broken: Number(form.broken || 0),
      sour: Number(form.sour || 0),
      insect: Number(form.insect || 0),
      mold: Number(form.mold || 0),
      foreignMatter: Number(form.foreignMatter || 0),
      general: Number(form.defects || 0),
    };
    const payload = {
      cuppingScore: parseFloat(calculateScore()),
      moisture: parseFloat(form.moisture),
      density: Number(form.density || 0),
      screenSize: Number(form.screenSize || 0),
      defects,
      scaScores: {
        aroma: Number(form.aroma),
        flavor: Number(form.flavor),
        aftertaste: Number(form.aftertaste),
        acidity: Number(form.acidity),
        body: Number(form.body),
        balance: Number(form.balance),
        uniformity: Number(form.uniformity),
        cleanCup: Number(form.cleanCup),
        sweetness: Number(form.sweetness),
        overall: Number(form.overall),
      },
      evidence: form.evidence ? form.evidence.split(',').map(x => x.trim()).filter(Boolean) : [],
      correctiveAction: form.correctiveAction,
      notes: form.notes
    };
    try {
      const result = await saveQualityWrite(`/qc/assessments/${form.batch}`, 'POST', payload, () => apiService.submitQualityAssessment(form.batch, payload));
      const tier = qualityTier(payload.cuppingScore, payload.moisture, defects);
      toast.success((result as any).queued ? 'Assessment saved locally for sync' : `Quality assessment saved: ${tier}`);
      setForm({ ...form, batch: '', moisture: '', defects: '', black: '0', broken: '0', sour: '0', insect: '0', mold: '0', foreignMatter: '0', notes: '', evidence: '', correctiveAction: '' });
      const res = await apiService.getPendingAssessments();
      setBatches(res.data);
    } catch (err) {
      toast.error('Failed to save assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const ScoreInput = ({ label, value, onChange }: any) => (
    <div className="flex items-center justify-between py-2 border-b border-stone-50">
      <span className="text-sm text-stone-600">{label}</span>
      <div className="flex items-center gap-1">
        {[6, 7, 8, 9, 10].map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(String(v))}
            className={`w-7 h-7 rounded text-xs font-medium transition-colors ${value === String(v) ? 'bg-violet-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-violet-100'}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Assessment Queue & Lab Certification</h2>
          <p className="text-sm text-stone-500">Only batches marked ready_for_quality are available for certification.</p>
        </div>
        <QualitySyncStatus />
      </div>
      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
      ) : (
        <div className="grid lg:grid-cols-[320px_1fr_1fr] gap-5">
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-stone-800">Ready For Quality</h3>
            {batches.map(b => {
              const processingCompleted = b.checkpointLogs?.find((l: any) => l.checkpointType === 'Processing Completed');
              const risk = b.transportLogs?.some((t: any) => t.condition && t.condition !== 'fresh') || b.checkpointLogs?.some((l: any) => String(l.notes || '').toLowerCase().includes('anomaly'));
              return (
                <button
                  key={b.batchId}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, batch: b.batchId }))}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${form.batch === b.batchId ? 'border-violet-400 bg-violet-50' : 'border-stone-100 hover:border-violet-200'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-stone-800">{b.district} - {b.washingStation}</p>
                      <p className="text-xs text-stone-500">{b.qrCode || b.batchId?.substring(0, 8)}</p>
                    </div>
                    {risk && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                  <p className="text-xs text-stone-500 mt-2">{Number(b.weightCherry).toLocaleString()} kg cherry</p>
                  <p className="text-[11px] text-stone-400 mt-1">{processingCompleted ? `Processed: ${new Date(processingCompleted.timestamp).toLocaleString()}` : 'Processing log pending review'}</p>
                </button>
              );
            })}
            {batches.length === 0 && <p className="text-center text-stone-400 py-8 text-sm">No batches waiting for QC.</p>}
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-700 mb-4 pb-3 border-b border-stone-100">Physical Analysis</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Batch Identification <span className="text-red-500">*</span></label>
                {!form.batch ? (
                  <>
                    <button 
                      onClick={() => setIsCameraOpen(!isCameraOpen)}
                      type="button"
                      className={`w-full px-4 py-3 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        isCameraOpen ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                      }`}
                    >
                      <Camera className="w-5 h-5" />
                      {isCameraOpen ? 'Close Camera' : 'Scan Batch QR Code'}
                    </button>
                    {isCameraOpen && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-stone-200">
                        <div id="qc-qr-reader" className="w-full max-w-sm mx-auto"></div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-violet-50 border border-violet-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-violet-100 flex items-center justify-center">
                        <QrCode className="w-4 h-4 text-violet-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-violet-900">Batch {form.batch.substring(0,8)}</p>
                        <p className="text-xs text-violet-600">Successfully identified</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setForm(f => ({ ...f, batch: '' }))}
                      className="text-xs font-semibold text-violet-600 hover:text-violet-800"
                    >
                      Scan Different
                    </button>
                  </div>
                )}
              </div>
            {selectedBatch && (
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                <p className="text-xs font-bold text-violet-700 uppercase">Read-only traceability context</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <p><span className="text-stone-500">Origin:</span> <span className="font-semibold text-stone-800">{selectedBatch.farmName}</span></p>
                  <p><span className="text-stone-500">Station:</span> <span className="font-semibold text-stone-800">{selectedBatch.washingStation}</span></p>
                  <p><span className="text-stone-500">Weight:</span> <span className="font-semibold text-stone-800">{Number(selectedBatch.weightCherry).toLocaleString()} kg</span></p>
                  <p><span className="text-stone-500">Checkpoints:</span> <span className="font-semibold text-stone-800">{selectedBatch.checkpointLogs?.length || 0}</span></p>
                </div>
                <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                  {(selectedBatch.checkpointLogs || []).slice(-4).map((log: any) => (
                    <p key={log.logId} className="text-[11px] text-violet-700">{log.checkpointType}: {log.locationName}</p>
                  ))}
                </div>
              </div>
            )}
            {[
              { label: 'Moisture Content (%)', key: 'moisture', placeholder: '11.0 - 12.5' },
              { label: 'Bean Density (g/L)', key: 'density', placeholder: '680 - 720' },
              { label: 'Screen Size (mesh)', key: 'screenSize', placeholder: '14 - 18' },
              { label: 'Defect Count (per 300g)', key: 'defects', placeholder: '0 - 15' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">{field.label}</label>
                <input
                  type="number"
                  value={(form as any)[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-stone-50"
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              {[
                ['black', 'Black'],
                ['broken', 'Broken'],
                ['sour', 'Sour'],
                ['insect', 'Insect'],
                ['mold', 'Mold'],
                ['foreignMatter', 'Foreign matter'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-stone-600 mb-1">{label} defects</label>
                  <input type="number" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
                </div>
              ))}
            </div>
            <textarea value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))} placeholder="Lab photo/certificate URLs, comma separated" className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[72px]" />
            <textarea value={form.correctiveAction} onChange={e => setForm(f => ({ ...f, correctiveAction: e.target.value }))} placeholder="Corrective action recommendation if non-conforming" className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[72px]" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
          <h3 className="font-semibold text-stone-700 mb-4 pb-3 border-b border-stone-100">Cupping Score (SCA Protocol)</h3>
          <div className="space-y-0">
            {[
              { label: 'Fragrance/Aroma', key: 'aroma' },
              { label: 'Flavor', key: 'flavor' },
              { label: 'Aftertaste', key: 'aftertaste' },
              { label: 'Acidity', key: 'acidity' },
              { label: 'Body', key: 'body' },
              { label: 'Balance', key: 'balance' },
              { label: 'Uniformity', key: 'uniformity' },
              { label: 'Clean Cup', key: 'cleanCup' },
              { label: 'Sweetness', key: 'sweetness' },
              { label: 'Overall', key: 'overall' },
            ].map(item => (
              <ScoreInput
                key={item.key}
                label={item.label}
                value={(form as any)[item.key]}
                onChange={(v: string) => setForm(f => ({ ...f, [item.key]: v }))}
              />
            ))}
          </div>
          <div className="mt-4 p-3 bg-violet-50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-semibold text-violet-800">Calculated Score</span>
            <span className="text-2xl font-bold text-violet-700">{calculateScore()}</span>
          </div>
          <div className={`mt-3 p-3 rounded-lg border ${previewTier === 'Low' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-800">Automatic tier</span>
              <span className={`text-sm font-bold ${previewTier === 'Low' ? 'text-amber-700' : 'text-emerald-700'}`}>{previewTier}</span>
            </div>
            <p className="text-xs text-stone-600 mt-1">Defects: {totalDefects} / Moisture: {form.moisture || '0'}% / Decision: {assessmentDecision}</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-3 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : previewTier === 'Low' ? 'Submit Corrective Action' : 'Certify & Notify Logistics'}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

function CuppingScores() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  useEffect(() => {
    apiService.getQCHistory().then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const parseNotes = (notes: any) => {
    if (!notes) return {};
    if (typeof notes === 'object') return notes;
    try { return JSON.parse(notes); } catch { return { notes }; }
  };
  const defectRows = (defects: any) => {
    if (!defects) return [];
    if (typeof defects === 'object' && !Array.isArray(defects)) return Object.entries(defects).map(([type, count]) => ({ type, count }));
    if (Array.isArray(defects)) return defects.map((item, index) => ({ type: item?.type || 'Defect ' + (index + 1), count: item?.count ?? item?.value ?? item }));
    return [{ type: 'General defects', count: defects }];
  };
  const visibleHistory = history
    .filter((assessment: any) => matchesSearch([
      assessment.batch?.batchId,
      assessment.batchId,
      assessment.batch?.qrCode,
      assessment.batch?.washingStation,
      assessment.batch?.district,
      assessment.cuppingScore,
      assessment.qualityTier,
      assessment.moisture,
      assessment.defectTotal,
      assessment.certificate?.status,
      assessment.assessor?.fullName,
    ], search))
    .sort((a: any, b: any) => {
      switch (sort) {
        case 'date_asc': return tableDate(a.createdAt) - tableDate(b.createdAt);
        case 'score_desc': return Number(b.cuppingScore || 0) - Number(a.cuppingScore || 0);
        case 'score_asc': return Number(a.cuppingScore || 0) - Number(b.cuppingScore || 0);
        case 'moisture_desc': return Number(b.moisture || 0) - Number(a.moisture || 0);
        case 'defects_desc': return Number(b.defectTotal ?? defectTotal(b.defects)) - Number(a.defectTotal ?? defectTotal(a.defects));
        case 'tier': return String(a.qualityTier || '').localeCompare(String(b.qualityTier || ''));
        case 'station': return String(a.batch?.washingStation || '').localeCompare(String(b.batch?.washingStation || ''));
        case 'date_desc':
        default: return tableDate(b.createdAt) - tableDate(a.createdAt);
      }
    });
  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>;
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Cupping Score History</h2>
          <p className="text-sm text-stone-500 mt-0.5">Click a row to view the full quality assessment results</p>
        </div>
        <span className="text-xs bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-semibold">{history.length} assessments</span>
      </div>
      {history.length === 0 ? (
        <p className="text-center text-stone-400 py-10 bg-white rounded-xl border border-stone-200">No assessments submitted yet.</p>
      ) : (
        <>
        <QualityTableControls
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          resultCount={visibleHistory.length}
          totalCount={history.length}
          options={[
            { value: 'date_desc', label: 'Newest first' },
            { value: 'date_asc', label: 'Oldest first' },
            { value: 'score_desc', label: 'Score high-low' },
            { value: 'score_asc', label: 'Score low-high' },
            { value: 'moisture_desc', label: 'Moisture high-low' },
            { value: 'defects_desc', label: 'Defects high-low' },
            { value: 'tier', label: 'Tier A-Z' },
            { value: 'station', label: 'Station A-Z' },
          ]}
        />
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Batch / QR', 'Washing Station', 'Location', 'Cupping Score', 'Tier', 'Moisture', 'Defects', 'Assessed', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visibleHistory.map((assessment: any) => (
                  <tr key={assessment.assessmentId} onClick={() => setSelectedAssessment(assessment)} className="hover:bg-violet-50/50 cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-800">{assessment.batch?.batchId?.substring(0, 12) || assessment.batchId?.substring(0, 12)}</p>
                      <p className="text-xs text-stone-500">{assessment.batch?.qrCode || 'QR pending'}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{assessment.batch?.washingStation || 'Aggregated Batch'}</td>
                    <td className="px-4 py-3 text-stone-600">{assessment.batch?.district || 'Not recorded'}</td>
                    <td className="px-4 py-3"><span className="font-bold text-violet-700">{Number(assessment.cuppingScore).toFixed(1)}</span><span className="text-xs text-stone-400"> / 100</span></td>
                    <td className="px-4 py-3"><span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (assessment.qualityTier === 'Premium' ? 'bg-emerald-100 text-emerald-700' : assessment.qualityTier === 'Low' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>{assessment.qualityTier || qualityTier(Number(assessment.cuppingScore), Number(assessment.moisture), assessment.defects)}</span></td>
                    <td className="px-4 py-3 text-stone-600">{Number(assessment.moisture).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-stone-600">{assessment.defectTotal ?? defectTotal(assessment.defects)}</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(assessment.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">{assessment.certificate?.status || assessment.batch?.status || 'Recorded'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {selectedAssessment && (() => {
        const parsed = parseNotes(selectedAssessment.notes);
        const scaScores = parsed.scaScores || {};
        const defects = defectRows(selectedAssessment.defects);
        const noteText = typeof parsed.notes === 'string' && parsed.notes.trim()
          ? parsed.notes
          : 'No notes recorded.';
        const evidenceText = Array.isArray(parsed.evidence)
          ? parsed.evidence.filter(Boolean).join(', ')
          : parsed.evidence;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 bg-violet-700 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Full Cupping Assessment Results</h3>
                  <p className="text-xs text-violet-100">{selectedAssessment.batch?.qrCode || selectedAssessment.batchId} - {new Date(selectedAssessment.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedAssessment(null)} className="p-1 rounded hover:bg-white/10"><Plus className="w-5 h-5 rotate-45" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ['Cupping Score', Number(selectedAssessment.cuppingScore).toFixed(1) + ' / 100'],
                    ['Quality Tier', selectedAssessment.qualityTier || qualityTier(Number(selectedAssessment.cuppingScore), Number(selectedAssessment.moisture), selectedAssessment.defects)],
                    ['Moisture', Number(selectedAssessment.moisture).toFixed(1) + '%'],
                    ['Total Defects', selectedAssessment.defectTotal ?? defectTotal(selectedAssessment.defects)],
                    ['Density', parsed.density || 'Not recorded'],
                    ['Screen Size', parsed.screenSize || 'Not recorded'],
                    ['Certificate', selectedAssessment.certificate?.certificateNo || 'Not generated'],
                    ['Certificate Status', selectedAssessment.certificate?.status || 'Recorded'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-stone-100 bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className="font-bold text-stone-800 mt-1">{value}</p></div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-stone-200 p-4">
                    <h4 className="font-semibold text-stone-800 mb-3">SCA Attribute Scores</h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {['aroma', 'flavor', 'aftertaste', 'acidity', 'body', 'balance', 'uniformity', 'cleanCup', 'sweetness', 'overall'].map(key => (
                        <div key={key} className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2 text-sm"><span className="capitalize text-violet-700">{key.replace(/([A-Z])/g, ' $1')}</span><span className="font-bold text-violet-900">{scaScores[key] ?? 'N/A'}</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-stone-200 p-4">
                    <h4 className="font-semibold text-stone-800 mb-3">Defect Breakdown</h4>
                    {defects.length === 0 ? <p className="text-sm text-stone-500">No defects recorded.</p> : (
                      <div className="space-y-2">{defects.map((defect) => <div key={String(defect.type)} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm"><span className="capitalize text-amber-800">{String(defect.type).replace(/([A-Z])/g, ' $1')}</span><span className="font-bold text-amber-900">{String(defect.count)}</span></div>)}</div>
                    )}
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="rounded-xl border border-stone-200 p-4">
                    <h4 className="font-semibold text-stone-800 mb-3">Batch & Assessor</h4>
                    <div className="space-y-2 text-sm text-stone-600">
                      <p><span className="font-semibold text-stone-800">Farm:</span> {selectedAssessment.batch?.farmName || 'Not recorded'}</p>
                      <p><span className="font-semibold text-stone-800">Washing Station:</span> {selectedAssessment.batch?.washingStation || 'Not recorded'}</p>
                      <p><span className="font-semibold text-stone-800">Location:</span> {selectedAssessment.batch?.district || 'Not recorded'}</p>
                      <p><span className="font-semibold text-stone-800">Batch Weight:</span> {Number(selectedAssessment.batch?.weightCherry || 0).toLocaleString()} kg</p>
                      <p><span className="font-semibold text-stone-800">Assessor:</span> {selectedAssessment.assessor?.fullName || selectedAssessment.assessor?.email || 'Quality Controller'}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-stone-200 p-4">
                    <h4 className="font-semibold text-stone-800 mb-3">Notes & Evidence</h4>
                    <p className="text-sm text-stone-600">{noteText}</p>
                    {evidenceText && <p className="text-sm text-stone-600 mt-2"><span className="font-semibold text-stone-800">Evidence:</span> {evidenceText}</p>}
                    {parsed.correctiveAction && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 mt-3">{parsed.correctiveAction}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function DefectTracking() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  useEffect(() => {
    apiService.getQCHistory().then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const defectRows: any[] = history.flatMap((assessment: any) => {
    const defects = assessment.defects;
    const common = {
      assessmentId: assessment.assessmentId,
      batchId: assessment.batch?.batchId || assessment.batchId,
      qrCode: assessment.batch?.qrCode,
      washingStation: assessment.batch?.washingStation,
      location: assessment.batch?.district,
      score: assessment.cuppingScore,
      tier: assessment.qualityTier,
      moisture: assessment.moisture,
      assessedAt: assessment.createdAt,
      status: assessment.certificate?.status || assessment.batch?.status || 'Recorded',
    };
    if (defects == null) return [];
    if (typeof defects === 'object' && !Array.isArray(defects)) {
      return Object.entries(defects).map(([type, count]) => ({ ...common, type, count }));
    }
    if (Array.isArray(defects)) {
      return defects.map((item, index) => ({ ...common, type: item?.type || 'Defect ' + (index + 1), count: item?.count ?? item?.value ?? item }));
    }
    return [{ ...common, type: 'General Defects', count: defects }];
  }).filter((row) => Number(row.count) > 0 || String(row.count).trim() !== '0');
  const visibleDefectRows = defectRows
    .filter((row) => matchesSearch([
      row.type,
      row.count,
      row.batchId,
      row.qrCode,
      row.washingStation,
      row.location,
      row.score,
      row.tier,
      row.moisture,
      row.status,
    ], search))
    .sort((a, b) => {
      switch (sort) {
        case 'date_asc': return tableDate(a.assessedAt) - tableDate(b.assessedAt);
        case 'count_desc': return Number(b.count || 0) - Number(a.count || 0);
        case 'count_asc': return Number(a.count || 0) - Number(b.count || 0);
        case 'score_desc': return Number(b.score || 0) - Number(a.score || 0);
        case 'type': return String(a.type || '').localeCompare(String(b.type || ''));
        case 'tier': return String(a.tier || '').localeCompare(String(b.tier || ''));
        case 'date_desc':
        default: return tableDate(b.assessedAt) - tableDate(a.assessedAt);
      }
    });
  const totalDefects = visibleDefectRows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Defect Tracking</h2>
          <p className="text-sm text-stone-500 mt-0.5">Defect breakdown by assessment, batch, and quality result</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-semibold">{visibleDefectRows.length} defect rows</span>
          <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-semibold">{totalDefects} total defects</span>
        </div>
      </div>
      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
      ) : defectRows.length === 0 ? (
        <p className="text-center text-stone-400 py-10 bg-white rounded-xl border border-stone-200">No defect data recorded yet.</p>
      ) : (
        <>
        <QualityTableControls
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          resultCount={visibleDefectRows.length}
          totalCount={defectRows.length}
          options={[
            { value: 'date_desc', label: 'Newest first' },
            { value: 'date_asc', label: 'Oldest first' },
            { value: 'count_desc', label: 'Defects high-low' },
            { value: 'count_asc', label: 'Defects low-high' },
            { value: 'score_desc', label: 'Score high-low' },
            { value: 'type', label: 'Defect type' },
            { value: 'tier', label: 'Tier A-Z' },
          ]}
        />
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Defect Type', 'Count', 'Batch / QR', 'Washing Station', 'Location', 'Score', 'Tier', 'Moisture', 'Assessed', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visibleDefectRows.map((row: any, index: number) => (
                  <tr key={row.assessmentId + row.type + index} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-semibold text-stone-800 capitalize">{String(row.type).replace(/_/g, ' ').replace(/([A-Z])/g, ' $1')}</td>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">{String(row.count)}</span></td>
                    <td className="px-4 py-3"><p className="font-medium text-stone-800">{row.batchId?.substring(0, 12) || 'N/A'}</p><p className="text-xs text-stone-500">{row.qrCode || 'QR pending'}</p></td>
                    <td className="px-4 py-3 text-stone-600">{row.washingStation || 'Not recorded'}</td>
                    <td className="px-4 py-3 text-stone-600">{row.location || 'Not recorded'}</td>
                    <td className="px-4 py-3 font-bold text-violet-700">{Number(row.score).toFixed(1)}</td>
                    <td className="px-4 py-3"><span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (row.tier === 'Premium' ? 'bg-emerald-100 text-emerald-700' : row.tier === 'Low' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>{row.tier || 'Standard'}</span></td>
                    <td className="px-4 py-3 text-stone-600">{Number(row.moisture).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(row.assessedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function Certificates() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  useEffect(() => {
    apiService.getQCHistory().then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const generateCertificate = async (assessment: any) => {
    setGenerating(assessment.assessmentId);
    try {
      const res = await apiService.generateQualityCertificate(assessment.assessmentId);
      const { certNo, blob } = qualityCertificatePdf(assessment, res.data);
      downloadBlob(blob, `${certNo}.pdf`);
      toast.success('PDF certificate generated: ' + certNo);
    } catch {
      toast.error('Failed to generate PDF certificate');
    } finally {
      setGenerating(null);
    }
  };
  const visibleCertificates = history
    .filter((assessment: any) => matchesSearch([
      assessment.certificate?.certificateNo,
      assessment.assessmentId,
      assessment.batch?.batchId,
      assessment.batchId,
      assessment.batch?.qrCode,
      assessment.batch?.washingStation,
      assessment.batch?.district,
      assessment.cuppingScore,
      assessment.qualityTier,
      assessment.moisture,
      assessment.certificate?.status,
    ], search))
    .sort((a: any, b: any) => {
      switch (sort) {
        case 'date_asc': return tableDate(a.certificate?.issuedAt || a.createdAt) - tableDate(b.certificate?.issuedAt || b.createdAt);
        case 'score_desc': return Number(b.cuppingScore || 0) - Number(a.cuppingScore || 0);
        case 'score_asc': return Number(a.cuppingScore || 0) - Number(b.cuppingScore || 0);
        case 'tier': return String(a.qualityTier || '').localeCompare(String(b.qualityTier || ''));
        case 'status': return String(a.certificate?.status || '').localeCompare(String(b.certificate?.status || ''));
        case 'station': return String(a.batch?.washingStation || '').localeCompare(String(b.batch?.washingStation || ''));
        case 'date_desc':
        default: return tableDate(b.certificate?.issuedAt || b.createdAt) - tableDate(a.certificate?.issuedAt || a.createdAt);
      }
    });
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Quality Certificates</h2>
          <p className="text-sm text-stone-500 mt-0.5">Digital certificate status for completed quality assessments</p>
        </div>
        <span className="text-xs bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-semibold">{history.length} certificates</span>
      </div>
      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
      ) : history.length === 0 ? (
        <p className="text-center text-stone-400 py-10 bg-white rounded-xl border border-stone-200">No assessments completed yet.</p>
      ) : (
        <>
        <QualityTableControls
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSort={setSort}
          resultCount={visibleCertificates.length}
          totalCount={history.length}
          options={[
            { value: 'date_desc', label: 'Newest issued' },
            { value: 'date_asc', label: 'Oldest issued' },
            { value: 'score_desc', label: 'Score high-low' },
            { value: 'score_asc', label: 'Score low-high' },
            { value: 'tier', label: 'Tier A-Z' },
            { value: 'status', label: 'Status A-Z' },
            { value: 'station', label: 'Station A-Z' },
          ]}
        />
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['Certificate No', 'Batch / QR', 'Washing Station', 'Location', 'Score', 'Tier', 'Moisture', 'Status', 'Issued', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visibleCertificates.map((assessment: any) => (
                  <tr key={assessment.assessmentId} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-mono text-xs text-stone-700">{assessment.certificate?.certificateNo || 'QC-' + assessment.assessmentId?.substring(0, 8)}</td>
                    <td className="px-4 py-3"><p className="font-medium text-stone-800">{assessment.batch?.batchId?.substring(0, 12) || assessment.batchId?.substring(0, 12)}</p><p className="text-xs text-stone-500">{assessment.batch?.qrCode || 'QR pending'}</p></td>
                    <td className="px-4 py-3 text-stone-600">{assessment.batch?.washingStation || 'Aggregated Batch'}</td>
                    <td className="px-4 py-3 text-stone-600">{assessment.batch?.district || 'Not recorded'}</td>
                    <td className="px-4 py-3 font-bold text-violet-700">{Number(assessment.cuppingScore).toFixed(1)}</td>
                    <td className="px-4 py-3"><span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (assessment.qualityTier === 'Premium' ? 'bg-emerald-100 text-emerald-700' : assessment.qualityTier === 'Low' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>{assessment.qualityTier || 'Standard'}</span></td>
                    <td className="px-4 py-3 text-stone-600">{Number(assessment.moisture).toFixed(1)}%</td>
                    <td className="px-4 py-3"><span className={'px-2.5 py-1 rounded-full text-xs font-semibold ' + (assessment.certificate?.status === 'Corrective Action Required' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{assessment.certificate?.status || 'Issued'}</span></td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{new Date(assessment.certificate?.issuedAt || assessment.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => generateCertificate(assessment)} disabled={generating === assessment.assessmentId} className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-60 whitespace-nowrap">
                        <Download className="w-3.5 h-3.5" /> {generating === assessment.assessmentId ? 'Generating...' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [reviewing, setReviewing] = useState('');
  const [, setSearchParams] = useSearchParams();
  const loadActions = useCallback(() => {
    setLoading(true);
    apiService.getCorrectiveActions()
      .then(r => setActions(r.data))
      .catch(() => toast.error('Failed to load corrective actions'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    loadActions();
  }, [loadActions]);

  const review = async (action: any, decision: 'resolved' | 'rejected') => {
    const reviewNotes = window.prompt(decision === 'resolved'
      ? 'Add review notes before accepting this correction'
      : 'Explain why this correction is rejected');
    if (reviewNotes === null) return;
    setReviewing(action.action_id);
    try {
      await apiService.reviewCorrectiveAction(action.action_id, { decision, reviewNotes });
      toast.success(decision === 'resolved' ? 'Corrective action accepted' : 'Corrective action rejected');
      loadActions();
    } catch {
      toast.error('Failed to review corrective action');
    } finally {
      setReviewing('');
    }
  };

  const filtered = actions
    .filter((a: any) => {
      return matchesSearch([
        a.action_id,
        a.assessment_id,
        a.batch_id,
        a.qr_code,
        a.farm_name,
        a.washing_station,
        a.district,
        a.issue_type,
        a.severity,
        a.responsible_role,
        a.required_action,
        a.submitted_notes,
        a.status,
      ], search);
    })
    .sort((a: any, b: any) => {
      switch (sort) {
        case 'date_asc': return tableDate(a.created_at) - tableDate(b.created_at);
        case 'due_asc': return tableDate(a.deadline) - tableDate(b.deadline);
        case 'severity': return String(a.severity || '').localeCompare(String(b.severity || ''));
        case 'status': return String(a.status || '').localeCompare(String(b.status || ''));
        case 'station': return String(a.washing_station || '').localeCompare(String(b.washing_station || ''));
        case 'date_desc':
        default: return tableDate(b.created_at) - tableDate(a.created_at);
      }
    });
  const openCount = actions.filter((a: any) => !['Resolved'].includes(String(a.status))).length;
  const evidenceList = (value: any) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [String(value)];
    } catch {
      return [String(value)];
    }
  };
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Corrective Actions</h2>
          <p className="text-sm text-stone-500 mt-0.5">Quality issue tickets assigned for remediation and QC review</p>
        </div>
        <span className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-semibold">{openCount} open</span>
      </div>
      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
      ) : actions.length === 0 ? (
        <p className="text-center text-stone-400 py-10 bg-white rounded-xl border border-stone-200">No corrective actions required.</p>
      ) : (
        <>
          <QualityTableControls
            search={search}
            onSearch={setSearch}
            sort={sort}
            onSort={setSort}
            resultCount={filtered.length}
            totalCount={actions.length}
            options={[
              { value: 'date_desc', label: 'Newest flagged' },
              { value: 'date_asc', label: 'Oldest flagged' },
              { value: 'due_asc', label: 'Due date' },
              { value: 'severity', label: 'Severity A-Z' },
              { value: 'status', label: 'Status A-Z' },
              { value: 'station', label: 'Station A-Z' },
            ]}
          />
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    {['Batch / QR', 'Issue', 'Quality Result', 'Action Required', 'Processor Evidence', 'Due', 'Status', 'Next Step'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filtered.map((a: any) => {
                    const evidence = evidenceList(a.evidence);
                    const isReady = a.status === 'Ready for Reassessment';
                    const statusClass = a.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : a.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : isReady
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-amber-100 text-amber-700';
                    return (
                      <tr key={a.action_id} className="hover:bg-amber-50/40 align-top">
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-800">{a.batch_id?.substring(0, 12)}</p>
                          <p className="text-xs text-stone-500 font-mono">{a.qr_code || 'QR pending'}</p>
                          <p className="text-xs text-stone-500 mt-1">{a.farm_name || 'Origin not recorded'}</p>
                          <p className="text-xs text-stone-400">{a.washing_station || a.district || 'Station not recorded'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-800">{a.issue_type}</p>
                          <span className={'inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ' + (a.severity === 'High' ? 'bg-red-100 text-red-700' : a.severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>{a.severity}</span>
                          <p className="text-xs text-stone-500 mt-1">Responsible: {String(a.responsible_role || 'PROCESSOR').replace('_', ' ')}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-700">
                          <p>Cupping: <span className="font-bold text-amber-700">{safeFixed(a.cupping_score)}</span></p>
                          <p className="text-xs mt-1">Moisture: {safeFixed(a.moisture)}%</p>
                          <p className="text-xs">Defects: {defectTotal(a.defects)}</p>
                        </td>
                        <td className="px-4 py-3 min-w-[280px]">
                          <p className="text-sm text-amber-800">{a.required_action}</p>
                        </td>
                        <td className="px-4 py-3 min-w-[240px]">
                          <p className="text-sm text-stone-700">{a.submitted_notes || 'No evidence submitted yet.'}</p>
                          {evidence.map((item: any, index: number) => (
                            <p key={index} className="text-xs text-violet-700 mt-1 break-all">{String(item)}</p>
                          ))}
                          {a.review_notes && <p className="text-xs text-stone-500 mt-2">QC review: {a.review_notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{a.deadline ? new Date(a.deadline).toLocaleDateString() : '72h remediation'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${statusClass}`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {isReady ? (
                            <div className="flex flex-col gap-2">
                              <button onClick={() => setSearchParams({ section: 'testing' })} className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold">Reassess Batch</button>
                              <button disabled={reviewing === a.action_id} onClick={() => review(a, 'rejected')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold disabled:opacity-60">Reject</button>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">{a.status === 'Resolved' ? 'Closed' : 'Waiting'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Notifs() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.getNotifications().then(r => setNotifs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-stone-800">Notifications</h2>
      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
      ) : notifs.length === 0 ? (
        <p className="text-center text-stone-400 py-10 bg-white rounded-xl border border-stone-200">No notifications yet.</p>
      ) : notifs.map((n: any) => (
        <div key={n.notificationId} className={"bg-white rounded-xl border p-4 shadow-sm flex gap-3 " + (n.read ? "border-stone-200" : "border-violet-200 bg-violet-50/30")}>
          <div className={"w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 " + (n.type === 'success' ? 'bg-emerald-100' : 'bg-amber-100')}>
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

function QRCodeGeneration() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiService.getPendingAssessments().then(r => setBatches(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">QR Code Management</h2>
      {loading ? (
        <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>
      ) : batches.length === 0 ? (
        <p className="text-center text-stone-400 py-10 bg-white rounded-xl border border-stone-200">No batches available.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b: any) => (
            <div key={b.batchId} className="bg-white rounded-xl border-2 border-violet-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center"><QrCode className="w-6 h-6 text-violet-600" /></div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">{b.status}</span>
              </div>
              <h4 className="font-semibold text-stone-800 mb-1">{b.farmName}</h4>
              <p className="text-xs text-stone-500 mb-3">{b.district} • {b.washingStation}</p>
              <div className="bg-stone-50 rounded p-2 mb-3">
                <p className="text-xs font-mono text-stone-600 break-all">{b.qrCode}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(b.qrCode); }}
                className="w-full py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors">
                Copy QR Code
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlockchainVerification() {
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Blockchain Verification</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-sm flex flex-col items-center gap-4 text-center">
        <Link2 className="w-12 h-12 text-stone-300" />
        <p className="text-sm font-medium text-stone-600">Tamper-Proof Audit Trail</p>
        <p className="text-xs max-w-md text-stone-500">Every quality assessment is timestamped and stored with full chain-of-custody logging. Full blockchain integration is planned for Phase 2.</p>
        <button onClick={() => toast.info('Blockchain integration coming in Phase 2')}
          className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 flex items-center gap-2">
          <Link2 className="w-4 h-4" /> View Audit Log
        </button>
      </div>
    </div>
  );
}

function QualityAnalytics() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('score_desc');
  useEffect(() => {
    apiService.getQCDashboard().then(r => setDashboard(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const rows = dashboard?.analytics?.byRegion || [];
  const visibleRows = [...rows]
    .filter((row: any) => matchesSearch([row.region, row.count, row.avgScore], search))
    .sort((a: any, b: any) => {
      switch (sort) {
        case 'score_asc': return Number(a.avgScore || 0) - Number(b.avgScore || 0);
        case 'count_desc': return Number(b.count || 0) - Number(a.count || 0);
        case 'count_asc': return Number(a.count || 0) - Number(b.count || 0);
        case 'region': return String(a.region || '').localeCompare(String(b.region || ''));
        case 'score_desc':
        default: return Number(b.avgScore || 0) - Number(a.avgScore || 0);
      }
    });
  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Quality Analytics</h2>
      {loading ? <div className="p-10 text-center text-stone-400">Loading analytics...</div> : (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <h3 className="font-semibold text-stone-800 mb-4">Average Score by Region</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avgScore" stroke="#7c3aed" strokeWidth={2.5} name="Average Score" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100">
              <QualityTableControls
                search={search}
                onSearch={setSearch}
                sort={sort}
                onSort={setSort}
                resultCount={visibleRows.length}
                totalCount={rows.length}
                options={[
                  { value: 'score_desc', label: 'Avg score high-low' },
                  { value: 'score_asc', label: 'Avg score low-high' },
                  { value: 'count_desc', label: 'Assessments high-low' },
                  { value: 'count_asc', label: 'Assessments low-high' },
                  { value: 'region', label: 'Region A-Z' },
                ]}
              />
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-stone-50">{['Region', 'Assessments', 'Avg Score'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-stone-50">
                {visibleRows.map((r: any) => <tr key={r.region}><td className="px-4 py-3 font-medium">{r.region}</td><td className="px-4 py-3">{r.count}</td><td className="px-4 py-3 font-bold text-violet-700">{r.avgScore}</td></tr>)}
                {visibleRows.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-stone-400">No quality analytics match this search.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function QualitySupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [form, setForm] = useState({ subject: '', category: 'protocol', description: '' });
  const load = useCallback(() => {
    apiService.getQCSupportTickets().then(r => setTickets(r.data || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await saveQualityWrite('/qc/support-tickets', 'POST', form, () => apiService.createQCSupportTicket(form));
    toast.success((result as any).queued ? 'Support ticket saved locally for sync' : 'Support ticket submitted');
    setForm({ subject: '', category: 'protocol', description: '' });
    load();
  };
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Quality Help & Protocol Support</h2>
        <QualitySyncStatus />
      </div>
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
        <p className="font-semibold text-violet-900">Protocol guides</p>
        <p className="text-sm text-violet-700 mt-1">Use SCA cupping attributes, IMPEXCOR thresholds, NAEB moisture expectations, and categorized JSONB defect logging for every assessment.</p>
      </div>
      <form onSubmit={submit} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" className="sm:col-span-2 px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50" />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50">
            <option value="protocol">Protocol</option>
            <option value="equipment">Lab equipment</option>
            <option value="certificate">Certificate</option>
            <option value="sync">Offline sync</option>
          </select>
        </div>
        <textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the request" className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 min-h-[100px]" />
        <button className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold">Submit Ticket</button>
      </form>
      <div className="grid gap-3">
        {tickets.map(t => (
          <div key={t.ticketId} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <p className="font-semibold text-stone-800">{t.subject}</p>
            <p className="text-sm text-stone-500 mt-1">{t.description}</p>
            <p className="text-xs text-stone-400 mt-2">{t.category} - {t.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabAndBuyerRequirements() {
  const [labRows, setLabRows] = useState<any[]>([]);
  const [buyerRows, setBuyerRows] = useState<any[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [sampleNotes, setSampleNotes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'samples' | 'requirements' | 'lab'>('samples');
  const [labForm, setLabForm] = useState({ batchId: '', labName: '', sampleCode: '', status: 'Received' });
  const [buyerForm, setBuyerForm] = useState({ buyer: '', grade: 'A1', minCuppingScore: 85, moistureMin: 10, moistureMax: 12, maxDefects: 5, notes: '' });
  const load = useCallback(() => {
    Promise.all([apiService.getLabSyncRecords(), apiService.getBuyerQualityRequirements(), apiService.getQCSamplePreparations()])
      .then(([lab, buyer, samples]) => { setLabRows(lab.data || []); setBuyerRows(buyer.data || []); setSampleRows(samples.data || []); })
      .catch(() => toast.error('Failed to load lab and buyer requirements'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitLab = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiService.createLabSyncRecord({ ...labForm, payload: { source: 'manual lab sync', receivedBy: 'Quality Controller' } });
    toast.success('Lab result sync record saved');
    setLabForm({ batchId: '', labName: '', sampleCode: '', status: 'Received' });
    load();
  };
  const submitBuyer = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiService.createBuyerQualityRequirement(buyerForm);
    toast.success('Buyer quality requirement saved');
    setBuyerForm({ buyer: '', grade: 'A1', minCuppingScore: 85, moistureMin: 10, moistureMax: 12, maxDefects: 5, notes: '' });
    load();
  };
  const verifySample = async (sampleId: string) => {
    await apiService.verifyQCSamplePreparation(sampleId, { qcNotes: sampleNotes[sampleId] || '' });
    toast.success('Sample verified and released to Logistics');
    setSampleNotes(notes => ({ ...notes, [sampleId]: '' }));
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Samples &amp; Buyer Requirements</h2>
        <p className="text-sm text-stone-500 mt-0.5">Verify customer samples, define buyer quality rules, and record manual laboratory results.</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-1 shadow-sm flex flex-wrap gap-1">
        {[
          { id: 'samples', label: 'Customer Samples', count: sampleRows.length },
          { id: 'requirements', label: 'Buyer Requirements', count: buyerRows.length },
          { id: 'lab', label: 'Manual Lab Records', count: labRows.length },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === tab.id ? 'bg-violet-700 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            {tab.label} <span className={activeTab === tab.id ? 'text-violet-100' : 'text-stone-400'}>({tab.count})</span>
          </button>
        ))}
      </div>

      {activeTab === 'samples' && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-stone-800">Customer Sample Verification</h3>
              <p className="text-xs text-stone-500 mt-1">Exporter-approved samples appear here. QC verifies the selected batch before Logistics dispatches the sample.</p>
            </div>
            <button type="button" onClick={load} className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600">Refresh</button>
          </div>
          {sampleRows.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-sm">No customer samples waiting for QC</div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="bg-stone-50 text-stone-500 uppercase">{['Reference','Buyer','Batch','Quantity','Status','QC Notes','Action'].map(title => <th key={title} className="px-3 py-2 text-left">{title}</th>)}</tr></thead>
              <tbody>
                {sampleRows.map(sample => (
                  <tr key={sample.sampleId} className="border-t border-stone-100">
                    <td className="px-3 py-2 font-mono">{sample.referenceCode || sample.orderId?.slice(0, 8)}</td>
                    <td className="px-3 py-2">{sample.buyer}</td>
                    <td className="px-3 py-2">{sample.qrCode || 'No batch selected'}<p className="text-stone-400">{sample.farmName || '-'}</p></td>
                    <td className="px-3 py-2">{Number(sample.sampleQuantityG || 0).toLocaleString()} g</td>
                    <td className="px-3 py-2">{sample.status}</td>
                    <td className="px-3 py-2 min-w-[220px]">
                      {sample.status === 'Awaiting QC Verification'
                        ? <input value={sampleNotes[sample.sampleId] || ''} onChange={e => setSampleNotes(notes => ({ ...notes, [sample.sampleId]: e.target.value }))} placeholder="Cupping/sample notes" className="w-full px-2 py-1.5 border rounded-lg" />
                        : <span>{sample.qcNotes || '-'}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {sample.status === 'Awaiting QC Verification'
                        ? <button onClick={() => verifySample(sample.sampleId)} className="px-3 py-1.5 bg-violet-700 text-white rounded-lg font-semibold">Verify Sample</button>
                        : <span className="text-stone-400">Released</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'requirements' && (
        <div className="grid xl:grid-cols-[420px_1fr] gap-5">
          <form onSubmit={submitBuyer} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-stone-800">Buyer Quality Rule</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required value={buyerForm.buyer} onChange={e => setBuyerForm(f => ({ ...f, buyer: e.target.value }))} placeholder="Buyer / customer" className="px-3 py-2 border rounded-lg text-sm" />
              <select value={buyerForm.grade} onChange={e => setBuyerForm(f => ({ ...f, grade: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm bg-white">
                {['A1','A2','A3','Premium','Standard'].map(g => <option key={g}>{g}</option>)}
              </select>
              <input type="number" value={buyerForm.minCuppingScore} onChange={e => setBuyerForm(f => ({ ...f, minCuppingScore: Number(e.target.value) }))} placeholder="Min score" className="px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={buyerForm.maxDefects} onChange={e => setBuyerForm(f => ({ ...f, maxDefects: Number(e.target.value) }))} placeholder="Max defects" className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="number" value={buyerForm.moistureMin} onChange={e => setBuyerForm(f => ({ ...f, moistureMin: Number(e.target.value) }))} placeholder="Min moisture %" className="px-3 py-2 border rounded-lg text-sm" />
              <input type="number" value={buyerForm.moistureMax} onChange={e => setBuyerForm(f => ({ ...f, moistureMax: Number(e.target.value) }))} placeholder="Max moisture %" className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <textarea value={buyerForm.notes} onChange={e => setBuyerForm(f => ({ ...f, notes: e.target.value }))} placeholder="Buyer notes" className="w-full px-3 py-2 border rounded-lg text-sm min-h-[80px]" />
            <button className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-semibold">Save Requirement</button>
          </form>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100"><h3 className="font-bold text-stone-800">Buyer Requirements</h3></div>
            <table className="w-full text-xs">
              <thead><tr className="bg-stone-50">{['buyer','grade','min_cupping_score','moisture_min','moisture_max','max_defects','status'].map(c => <th key={c} className="px-3 py-2 text-left uppercase text-stone-500">{c.replace(/_/g,' ')}</th>)}</tr></thead>
              <tbody>{buyerRows.map((row: any, i: number) => <tr key={i} className="border-t">{['buyer','grade','min_cupping_score','moisture_min','moisture_max','max_defects','status'].map(c => <td key={c} className="px-3 py-2">{String(row[c] ?? '-')}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'lab' && (
        <div className="grid xl:grid-cols-[420px_1fr] gap-5">
        <form onSubmit={submitLab} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-stone-800">Manual Lab Record</h3>
          <input value={labForm.batchId} onChange={e => setLabForm(f => ({ ...f, batchId: e.target.value }))} placeholder="Batch ID (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input required value={labForm.labName} onChange={e => setLabForm(f => ({ ...f, labName: e.target.value }))} placeholder="Lab name" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <input required value={labForm.sampleCode} onChange={e => setLabForm(f => ({ ...f, sampleCode: e.target.value }))} placeholder="Sample code" className="w-full px-3 py-2 border rounded-lg text-sm" />
          <select value={labForm.status} onChange={e => setLabForm(f => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
            {['Received','Validated','Rejected','Needs Review'].map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="px-4 py-2 bg-violet-700 text-white rounded-lg text-sm font-semibold">Save Lab Record</button>
        </form>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100"><h3 className="font-bold text-stone-800">Manual Lab Records</h3></div>
            <table className="w-full text-xs">
              <thead><tr className="bg-stone-50">{['lab_name','sample_code','status','synced_at'].map(c => <th key={c} className="px-3 py-2 text-left uppercase text-stone-500">{c.replace(/_/g,' ')}</th>)}</tr></thead>
              <tbody>{labRows.map((row: any, i: number) => <tr key={i} className="border-t">{['lab_name','sample_code','status','synced_at'].map(c => <td key={c} className="px-3 py-2">{String(row[c] ?? '-')}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const SECTIONS: Record<string, React.ComponentType> = {
  overview: Overview,
  testing: QualityTesting,
  cupping: CuppingScores,
  defects: DefectTracking,
  certificates: Certificates,
  corrective: CorrectiveActions,
  analytics: QualityAnalytics,
  lab: LabAndBuyerRequirements,
  reports: RoleReports,
  support: QualitySupport,
  'qr-codes': QRCodeGeneration,
  blockchain: BlockchainVerification,
  notifications: Notifs,
};

export default function QualityDashboard() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section') || 'overview';
  const Component = SECTIONS[section] || Overview;
  return <Component />;
}
