import { useState, useEffect } from 'react';
import { FileText, Download, Save, BarChart3, Trash2, FolderOpen, CheckCircle2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'report_builder_templates';

interface ReportTemplate {
  id: string;
  name: string;
  type: 'table' | 'chart' | 'export';
  dataSource: string;
  fields: string[];
  groupBy: string;
  sortBy: string;
  savedAt: string;
}

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'default-1',
    name: 'Monthly Export Summary',
    type: 'table',
    dataSource: 'shipments',
    fields: ['shipmentId', 'containerNo', 'status', 'portLoading', 'portDestination', 'shippedAt'],
    groupBy: 'status',
    sortBy: 'shippedAt',
    savedAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    name: 'Farmer Performance Report',
    type: 'table',
    dataSource: 'farmers',
    fields: ['fullName', 'email', 'phone', 'farmName', 'farmSizeHa', 'status'],
    groupBy: '',
    sortBy: 'fullName',
    savedAt: new Date().toISOString(),
  },
  {
    id: 'default-3',
    name: 'Quality Analytics',
    type: 'chart',
    dataSource: 'quality',
    fields: ['batchId', 'cuppingScore', 'moisture', 'defects', 'createdAt'],
    groupBy: '',
    sortBy: 'cuppingScore',
    savedAt: new Date().toISOString(),
  },
];

function loadTemplates(): ReportTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const custom: ReportTemplate[] = stored ? JSON.parse(stored) : [];
    // Merge defaults (only those not overridden by a same-id custom entry)
    const customIds = new Set(custom.map(t => t.id));
    const defaults = DEFAULT_TEMPLATES.filter(d => !customIds.has(d.id));
    return [...defaults, ...custom];
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveTemplates(templates: ReportTemplate[]) {
  // Only persist non-default templates to localStorage
  const custom = templates.filter(t => !DEFAULT_TEMPLATES.some(d => d.id === t.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
}

export function ReportBuilder() {
  const { user } = useAuth();
  const [reportConfig, setReportConfig] = useState({
    name: '',
    type: 'table' as 'table' | 'chart' | 'export',
    dataSource: 'batches' as string,
    fields: [] as string[],
    groupBy: '',
    sortBy: '',
  });
  const [generated, setGenerated] = useState<{ rows: any[]; csv: string; groups: Record<string, number> | null } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const dataSources = [
    { value: 'batches', label: 'Batches', fields: ['batchId', 'qrCode', 'farmName', 'district', 'washingStation', 'weightCherry', 'status', 'createdAt'] },
    { value: 'farmers', label: 'Farmers', fields: ['userId', 'fullName', 'email', 'phone', 'farmName', 'farmSizeHa', 'gpsLocation', 'coordinates', 'status'] },
    { value: 'pickups', label: 'Pickups', fields: ['deliveryId', 'profileId', 'batchId', 'deliveryDate', 'weightKg', 'buyer', 'pricePerKg'] },
    { value: 'shipments', label: 'Shipments', fields: ['shipmentId', 'containerNo', 'portLoading', 'portDestination', 'status', 'truckCompany', 'truckPlate', 'driverName', 'lastCheckpoint', 'podStatus', 'shippedAt', 'farmName', 'weightCherry'] },
    { value: 'roadTransport', label: 'Road Transport', fields: ['containerNo', 'truckCompany', 'truckPlate', 'driverName', 'originLocation', 'destinationPort', 'status', 'departureTime', 'expectedArrival', 'actualArrival'] },
    { value: 'transitCheckpoints', label: 'Transit Checkpoints', fields: ['containerNo', 'truckCompany', 'checkpointName', 'eventType', 'latitude', 'longitude', 'sealCondition', 'source', 'recordedAt'] },
    { value: 'proofOfDelivery', label: 'Proof of Delivery', fields: ['containerNo', 'batchQr', 'destinationPort', 'truckCompany', 'podStatus', 'documentType', 'uploadedAt'] },
    { value: 'quality', label: 'Quality Tests', fields: ['assessmentId', 'batchId', 'cuppingScore', 'moisture', 'defects', 'assessorId', 'createdAt'] },
    { value: 'contracts', label: 'Contracts', fields: ['id', 'buyer', 'country', 'type', 'grade', 'quantity', 'pricePerKg', 'totalValue', 'status', 'deliveredWeight'] },
  ];

  const currentDataSource = dataSources.find(ds => ds.value === reportConfig.dataSource);

  const toggleField = (field: string) => {
    setReportConfig(prev => ({
      ...prev,
      fields: prev.fields.includes(field)
        ? prev.fields.filter(f => f !== field)
        : [...prev.fields, field],
    }));
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const result = await apiService.generateCustomReport(reportConfig);
      setGenerated(result.data);
      toast.success(`Report generated — ${result.data.rows.length} rows`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const saveTemplate = async () => {
    if (!reportConfig.name.trim()) {
      toast.error('Enter a report name before saving');
      return;
    }
    if (reportConfig.fields.length === 0) {
      toast.error('Select at least one field before saving');
      return;
    }
    setSaving(true);
    try {
      const existing = templates.find(t => t.name.toLowerCase() === reportConfig.name.toLowerCase());
      let updated: ReportTemplate[];
      if (existing) {
        updated = templates.map(t =>
          t.id === existing.id ? { ...t, ...reportConfig, savedAt: new Date().toISOString() } : t
        );
        toast.success(`Template "${reportConfig.name}" updated`);
      } else {
        const newTemplate: ReportTemplate = {
          id: `custom-${Date.now()}`,
          ...reportConfig,
          savedAt: new Date().toISOString(),
        };
        updated = [...templates, newTemplate];
        toast.success(`Template "${reportConfig.name}" saved`);
      }
      setTemplates(updated);
      saveTemplates(updated);
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = (template: ReportTemplate) => {
    setReportConfig({
      name: template.name,
      type: template.type,
      dataSource: template.dataSource,
      fields: template.fields,
      groupBy: template.groupBy,
      sortBy: template.sortBy,
    });
    setGenerated(null);
    toast.success(`Template "${template.name}" loaded`);
  };

  const deleteTemplate = (id: string) => {
    if (DEFAULT_TEMPLATES.some(d => d.id === id)) {
      toast.error('Default templates cannot be deleted');
      setConfirmDelete(null);
      return;
    }
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    setConfirmDelete(null);
    toast.success('Template deleted');
  };

  const downloadCsv = () => {
    if (!generated?.csv) return;
    const blob = new Blob([generated.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportConfig.name || reportConfig.dataSource}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    window.print();
  };

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

          .custom-report-print-area,
          .custom-report-print-area * {
            visibility: visible !important;
          }

          .custom-report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #1c1917 !important;
          }

          .custom-report-no-print {
            display: none !important;
          }

          .custom-report-print-card {
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .custom-report-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }

          .custom-report-print-table th,
          .custom-report-print-table td {
            border: 1px solid #d6d3d1 !important;
            padding: 6px 8px !important;
            text-align: left !important;
            white-space: normal !important;
            vertical-align: top !important;
          }

          .custom-report-print-table th {
            background: #f5f5f4 !important;
            color: #292524 !important;
            font-weight: 700 !important;
          }
        }
      `}</style>
      <div>
        <h2 className="text-lg font-bold text-stone-800">Custom Report Builder</h2>
        <p className="text-sm text-stone-500 mt-0.5">Create, save, and reload custom reports with flexible data sources and export options</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-5">
          {/* Report Name */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <label className="block text-sm font-semibold text-stone-700 mb-2">Report Name</label>
            <input
              type="text"
              value={reportConfig.name}
              onChange={e => setReportConfig({ ...reportConfig, name: e.target.value })}
              placeholder="e.g., Monthly Export Summary"
              className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Data Source Selection */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <label className="block text-sm font-semibold text-stone-700 mb-3">Data Source</label>
            <div className="grid sm:grid-cols-3 gap-3">
              {dataSources.map(ds => (
                <button
                  key={ds.value}
                  onClick={() => setReportConfig({ ...reportConfig, dataSource: ds.value, fields: [] })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    reportConfig.dataSource === ds.value
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-emerald-200'
                  }`}
                >
                  <p className="font-semibold text-sm">{ds.label}</p>
                  <p className="text-xs opacity-70 mt-0.5">{ds.fields.length} fields</p>
                </button>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <label className="block text-sm font-semibold text-stone-700 mb-3">Report Type</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'table', label: 'Table View', icon: FileText },
                { value: 'chart', label: 'Chart View', icon: BarChart3 },
                { value: 'export', label: 'Export Only', icon: Download },
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setReportConfig({ ...reportConfig, type: type.value as any })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    reportConfig.type === type.value
                      ? 'bg-violet-50 border-violet-300 text-violet-700'
                      : 'bg-white border-stone-200 text-stone-700 hover:border-violet-200'
                  }`}
                >
                  <type.icon className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-xs font-medium text-center">{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Field Selection */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-stone-700">
                Select Fields ({reportConfig.fields.length} selected)
              </label>
              {reportConfig.fields.length > 0 && (
                <button
                  onClick={() => setReportConfig(prev => ({ ...prev, fields: [] }))}
                  className="text-xs text-stone-400 hover:text-red-500"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2">
              {currentDataSource?.fields.map(field => (
                <label key={field} className="flex items-center gap-2 p-2 rounded hover:bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportConfig.fields.includes(field)}
                    onChange={() => toggleField(field)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                  <span className="text-sm capitalize text-stone-700">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sorting & Grouping */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Group By</label>
                <select
                  value={reportConfig.groupBy}
                  onChange={e => setReportConfig({ ...reportConfig, groupBy: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">No grouping</option>
                  {currentDataSource?.fields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-2">Sort By</label>
                <select
                  value={reportConfig.sortBy}
                  onChange={e => setReportConfig({ ...reportConfig, sortBy: e.target.value })}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Default order</option>
                  {currentDataSource?.fields.map(field => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Generated Table Preview */}
          {generated && generated.rows.length > 0 && reportConfig.type === 'table' && (
            <>
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden print:hidden">
                <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-stone-800">{reportConfig.name || 'Report'}</h4>
                    <p className="text-xs text-stone-500 mt-0.5">{generated.rows.length} rows · {reportConfig.fields.length} columns</p>
                  </div>
                  <button
                    onClick={downloadCsv}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white text-xs rounded-lg hover:bg-emerald-800"
                  >
                    <Download className="w-3.5 h-3.5" /> Download CSV
                  </button>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-50 sticky top-0">
                      <tr>
                        {reportConfig.fields.map(col => (
                          <th key={col} className="px-3 py-2 text-left text-stone-500 uppercase font-semibold whitespace-nowrap">
                            {col.replace(/([A-Z])/g, ' $1').trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {generated.rows.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          {reportConfig.fields.map(col => (
                            <td key={col} className="px-3 py-2 text-stone-600 whitespace-nowrap">
                              {String(row[col] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {generated.rows.length > 20 && (
                  <div className="px-5 py-2 border-t border-stone-100 text-xs text-stone-400 text-center">
                    Showing first 20 of {generated.rows.length} rows. Download CSV for full data.
                  </div>
                )}
              </div>

              {/* Print-Only Custom Report Document */}
              <div className="hidden print:block custom-report-print-area space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img src="/impexcor_logo.png" alt="IMPEXCOR Logo" className="h-12 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div>
                      <h1 className="text-xl font-bold text-stone-900">{reportConfig.name || 'Custom Report'}</h1>
                      <p className="text-xs text-stone-400 mt-0.5">IMPEXCOR Smart Coffee Supply Chain Management System</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Custom Report Document</p>
                    <p className="text-xs text-stone-400 mt-0.5">DataSource: <span className="capitalize">{reportConfig.dataSource}</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <table className="custom-report-print-table w-full text-sm">
                    <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                      <tr><th className="px-3 py-2 text-left">Report Detail</th><th className="px-3 py-2 text-left">Value</th></tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      <tr><td className="px-3 py-2 font-semibold">Generated At</td><td className="px-3 py-2">{new Date().toLocaleString()}</td></tr>
                      <tr><td className="px-3 py-2 font-semibold">Generated By</td><td className="px-3 py-2">{user ? `${user.name} (${user.role})` : 'System User'}</td></tr>
                      <tr><td className="px-3 py-2 font-semibold">Total Rows</td><td className="px-3 py-2">{generated.rows.length}</td></tr>
                    </tbody>
                  </table>
                  <table className="custom-report-print-table w-full text-sm">
                    <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                      <tr><th className="px-3 py-2 text-left">Configuration</th><th className="px-3 py-2 text-left">Value</th></tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      <tr><td className="px-3 py-2 font-semibold">Group By</td><td className="px-3 py-2">{reportConfig.groupBy || 'None'}</td></tr>
                      <tr><td className="px-3 py-2 font-semibold">Sort By</td><td className="px-3 py-2">{reportConfig.sortBy || 'Default'}</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                  <table className="custom-report-print-table w-full text-xs">
                    <thead className="bg-stone-50">
                      <tr>
                        {reportConfig.fields.map(col => (
                          <th key={col} className="px-3 py-2 text-left text-stone-500 uppercase font-semibold whitespace-nowrap">
                            {col.replace(/([A-Z])/g, ' $1').trim()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {generated.rows.map((row, idx) => (
                        <tr key={idx}>
                          {reportConfig.fields.map(col => (
                            <td key={col} className="px-3 py-2 text-stone-600">
                              {String(row[col] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Preview & Actions */}
          <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl border border-stone-200 p-5 shadow-sm sticky top-6">
            <h3 className="font-semibold text-stone-700 mb-3">Report Preview</h3>
            <div className="bg-white rounded-lg p-4 border border-stone-200 mb-4">
              <p className="text-xs text-stone-500 mb-1">Report Name</p>
              <p className="font-semibold text-stone-800">{reportConfig.name || 'Untitled Report'}</p>
              <p className="text-xs text-stone-500 mt-3 mb-1">Data Source</p>
              <p className="font-medium text-emerald-700 capitalize">{reportConfig.dataSource}</p>
              <p className="text-xs text-stone-500 mt-3 mb-1">Type</p>
              <p className="font-medium text-violet-700 capitalize">{reportConfig.type}</p>
              {reportConfig.fields.length > 0 && (
                <>
                  <p className="text-xs text-stone-500 mt-3 mb-2">Selected Fields ({reportConfig.fields.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {reportConfig.fields.map(field => (
                      <span key={field} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">
                        {field}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={generateReport}
                disabled={generating || !reportConfig.name || reportConfig.fields.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BarChart3 className="w-4 h-4" />
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving || !reportConfig.name || reportConfig.fields.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-violet-300 text-violet-700 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save as Template'}
              </button>
              <button
                onClick={downloadCsv}
                disabled={!generated?.csv}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" /> Export as CSV
              </button>
              {generated && (
                <button
                  onClick={printPdf}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
              )}
            </div>

            {generated && (
              <div className="mt-4 pt-4 border-t border-stone-200 flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {generated.rows.length} rows generated
              </div>
            )}
          </div>

          {/* Saved Templates */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-stone-700 text-sm">Saved Templates</h4>
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{templates.length}</span>
            </div>
            {templates.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">No templates yet. Configure a report and click "Save as Template".</p>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`group flex items-start justify-between gap-2 p-3 rounded-lg border transition-colors ${
                      reportConfig.name === template.name
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-stone-100 hover:border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <p className="text-sm font-medium text-stone-700 leading-tight">{template.name}</p>
                      </div>
                      <p className="text-xs text-stone-400 mt-1 ml-5 capitalize">
                        {template.dataSource} · {template.fields.length} fields · {template.type}
                      </p>
                      <p className="text-xs text-stone-300 mt-0.5 ml-5">
                        {new Date(template.savedAt).toLocaleDateString()}
                      </p>
                    </button>
                    {!DEFAULT_TEMPLATES.some(d => d.id === template.id) && (
                      confirmDelete === template.id ? (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded font-semibold"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 border border-stone-200 text-stone-600 text-xs rounded"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(template.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition-all flex-shrink-0"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
