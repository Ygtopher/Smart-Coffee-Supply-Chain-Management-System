import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileText, Loader2, Printer, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const statusClass = (status: string) => {
  const key = String(status || '').toLowerCase();
  if (key.includes('paid') || key.includes('complete') || key.includes('delivered') || key.includes('verified')) return 'bg-emerald-100 text-emerald-700';
  if (key.includes('pending') || key.includes('waiting') || key.includes('ready')) return 'bg-amber-100 text-amber-700';
  if (key.includes('reject') || key.includes('fail') || key.includes('cancel')) return 'bg-red-100 text-red-700';
  return 'bg-stone-100 text-stone-600';
};

const formatReportValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.map(item => formatReportValue(item)).join(', ') : '-';
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${formatReportValue(entryValue)}`)
      .join(', ');
  }
  return String(value);
};

export function RoleReports() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', status: '', search: '' });
  const [generated, setGenerated] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find(template => template.id === selectedTemplateId) || templates[0],
    [templates, selectedTemplateId]
  );
  const activeFilters = useMemo(() => {
    const values = [
      ['Date From', filters.dateFrom || 'All'],
      ['Date To', filters.dateTo || 'All'],
      ['Status', filters.status || 'All'],
      ['Search', filters.search || 'None'],
    ];
    return values;
  }, [filters]);
  const statusOptions = useMemo(() => {
    if (!generated?.rows || !selectedTemplate?.statusField) return [];
    return Array.from(new Set(generated.rows.map((row: any) => row[selectedTemplate.statusField]).filter(Boolean)));
  }, [generated, selectedTemplate]);

  const load = useCallback(() => {
    setLoading(true);
    apiService.getRoleReportTemplates()
      .then(response => {
        setTemplates(response.data || []);
        setSelectedTemplateId(current => current || response.data?.[0]?.id || '');
      })
      .catch(() => toast.error('Failed to load report templates'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!selectedTemplate?.id) return;
    setGenerating(true);
    try {
      const response = await apiService.generateRoleReport({ templateId: selectedTemplate.id, filters });
      setGenerated(response.data);
      toast.success('Report generated from database records');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadCsv = () => {
    if (!generated?.csv) return;
    const blob = new Blob([generated.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generated.template?.id || 'role'}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    if (!generated) return;
    window.print();
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  }

  return (
    <div className="p-6 space-y-5">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          .role-report-print-area,
          .role-report-print-area * {
            visibility: visible !important;
          }

          .role-report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #1c1917 !important;
          }

          .role-report-no-print {
            display: none !important;
          }

          .role-report-print-card {
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .role-report-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }

          .role-report-print-table th,
          .role-report-print-table td {
            border: 1px solid #d6d3d1 !important;
            padding: 6px 8px !important;
            text-align: left !important;
            white-space: normal !important;
            vertical-align: top !important;
          }

          .role-report-print-table th {
            background: #f5f5f4 !important;
            color: #292524 !important;
            font-weight: 700 !important;
          }

          .role-report-print-description {
            text-align: justify !important;
            line-height: 1.5 !important;
            margin: 8px 0 14px !important;
            color: #44403c !important;
          }
        }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Reports</h2>
          <p className="text-sm text-stone-500 mt-0.5">Generate role-specific reports from live database records.</p>
        </div>
        <button type="button" onClick={load} className="px-3 py-2 border border-stone-200 rounded-lg text-xs font-semibold text-stone-600 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-5">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <label className="text-xs font-semibold text-stone-500 uppercase">Report Type</label>
            <select value={selectedTemplate?.id || ''} onChange={event => { setSelectedTemplateId(event.target.value); setGenerated(null); }} className="mt-2 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
              {templates.map(template => <option key={template.id} value={template.id}>{template.title}</option>)}
            </select>
            {selectedTemplate && <p className="text-xs text-stone-500 mt-2">{selectedTemplate.description}</p>}
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-3">
            <h3 className="font-semibold text-stone-800">Filters</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
              <input type="date" value={filters.dateFrom} onChange={event => setFilters(current => ({ ...current, dateFrom: event.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
              <input type="date" value={filters.dateTo} onChange={event => setFilters(current => ({ ...current, dateTo: event.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
              <input value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} placeholder="Search in report rows" className="px-3 py-2 border border-stone-200 rounded-lg text-sm" />
              {selectedTemplate?.statusField && (
                <select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))} className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white">
                  <option value="">All statuses</option>
                  {statusOptions.map(status => <option key={String(status)} value={String(status)}>{String(status)}</option>)}
                </select>
              )}
            </div>
            <button onClick={generate} disabled={generating || !selectedTemplate} className="w-full px-4 py-2.5 bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Generate Report
            </button>
          </div>
          {generated && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm space-y-2">
              <button onClick={downloadCsv} className="w-full px-4 py-2 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download CSV</button>
              <button onClick={printPdf} className="w-full px-4 py-2 border border-stone-200 text-stone-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Print / Save PDF</button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {generated ? (
            <>
              <div className="role-report-print-area space-y-4">
                <div className="grid sm:grid-cols-3 gap-3 role-report-no-print">
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="text-xs text-stone-500">Rows</p><p className="text-2xl font-bold text-stone-800">{generated.summary?.rowCount || 0}</p></div>
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="text-xs text-stone-500">Total Weight</p><p className="text-2xl font-bold text-stone-800">{Number(generated.summary?.totalWeightKg || 0).toLocaleString()} kg</p></div>
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm"><p className="text-xs text-stone-500">Generated</p><p className="text-sm font-bold text-stone-800 mt-1">{new Date(generated.generatedAt).toLocaleString()}</p></div>
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm role-report-print-card">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <img src="/impexcor_logo.png" alt="IMPEXCOR Logo" className="h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      <div>
                        <h1 className="text-xl font-bold text-stone-900">{generated.template?.title}</h1>
                        <p className="text-xs text-stone-400 mt-0.5">IMPEXCOR Smart Coffee Supply Chain Management System</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Report Document</p>
                      <p className="text-xs text-stone-400 mt-0.5">System Reference: {generated.template?.id}</p>
                    </div>
                  </div>
                  <p className="role-report-print-description text-sm text-stone-600 mt-2">{generated.template?.description || 'This report summarizes records generated from the live system database for the selected role and filters.'}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <table className="role-report-print-table w-full text-sm">
                      <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                        <tr><th className="px-3 py-2 text-left">Report Detail</th><th className="px-3 py-2 text-left">Value</th></tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        <tr><td className="px-3 py-2 font-semibold">Generated At</td><td className="px-3 py-2">{new Date(generated.generatedAt).toLocaleString()}</td></tr>
                        <tr><td className="px-3 py-2 font-semibold">Generated By</td><td className="px-3 py-2">{user ? `${user.name} (${user.role})` : 'System User'}</td></tr>
                        <tr><td className="px-3 py-2 font-semibold">Rows</td><td className="px-3 py-2">{generated.summary?.rowCount || 0}</td></tr>
                        <tr><td className="px-3 py-2 font-semibold">Total Weight</td><td className="px-3 py-2">{Number(generated.summary?.totalWeightKg || 0).toLocaleString()} kg</td></tr>
                      </tbody>
                    </table>
                    <table className="role-report-print-table w-full text-sm">
                      <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                        <tr><th className="px-3 py-2 text-left">Filter</th><th className="px-3 py-2 text-left">Value</th></tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {activeFilters.map(([label, value]) => <tr key={label}><td className="px-3 py-2 font-semibold">{label}</td><td className="px-3 py-2">{value}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
                {generated.summary?.statusCounts && Object.keys(generated.summary.statusCounts).length > 0 && (
                  <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm role-report-print-card">
                    <h3 className="font-semibold text-stone-800 mb-3">Status Breakdown</h3>
                    <table className="role-report-print-table w-full text-sm">
                      <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                        <tr><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Records</th></tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {Object.entries(generated.summary.statusCounts).map(([status, count]) => (
                          <tr key={status}>
                            <td className="px-3 py-2"><span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass(status)}`}>{status}</span></td>
                            <td className="px-3 py-2">{String(count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-x-auto role-report-print-card">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <h3 className="font-semibold text-stone-800">Report Table</h3>
                </div>
                <table className="role-report-print-table w-full text-sm">
                  <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                    <tr>{generated.template.columns.map((column: any) => <th key={column.key} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{column.label}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {generated.rows.map((row: any, index: number) => (
                      <tr key={index} className="hover:bg-stone-50">
                        {generated.template.columns.map((column: any) => <td key={column.key} className="px-4 py-3 whitespace-nowrap">{formatReportValue(row[column.key])}</td>)}
                      </tr>
                    ))}
                    {generated.rows.length === 0 && <tr><td colSpan={generated.template.columns.length} className="px-4 py-10 text-center text-stone-400">No records match this report.</td></tr>}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400">
              Select a report type and click Generate Report.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
