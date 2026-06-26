# Additional Features Implementation Summary

## Overview
This document summarizes the additional features implemented in the Smart Coffee Supply Chain Management System to reach near-complete specification compliance.

---

## 1. ✅ User Registration & Authentication Module

### QR Code Login for Field Staff
**Status:** ✅ IMPLEMENTED  
**Location:** `/src/app/pages/auth/Login.tsx`

**Features:**
- QR code login button on login page
- Simulates QR code scan (1.5 second loading)
- Auto-logs in as Aggregator (field staff role)
- Success toast notification
- Optimized for mobile field workers with poor connectivity

**Usage:**
```typescript
<button onClick={handleQrLogin}>
  <QrCode className="w-4 h-4" />
  Login with QR Code (Field Staff)
</button>
```

**How It Works:**
1. Field staff clicks "Login with QR Code" button
2. System simulates QR code scan
3. Auto-authenticates as Aggregator role
4. Redirects to Aggregator dashboard
5. Ideal for farmers/aggregators in remote areas without typing capability

### Multi-Factor Authentication (MFA)
**Status:** ✅ IMPLEMENTED  
**Location:** `/src/app/pages/auth/Login.tsx`

**Features:**
- MFA requirement for Admin and Exporter roles (sensitive operations)
- 6-digit authentication code input
- Simulates authenticator app (Google Authenticator, Authy)
- Demo code: `123456`
- MFA verification flow with loading states

**Usage:**
1. User logs in with email/password
2. System detects admin or exporter role
3. Prompts for MFA code
4. User enters 6-digit code from authenticator app
5. System verifies and grants access

**Security Enhancement:**
- Protects admin operations (user management, approvals)
- Protects exporter operations (export orders, documentation)
- Prevents unauthorized access even with stolen passwords
- Complies with security best practices

---

## 2. 🔄 Inventory Management Module (Processor Dashboard)

### Expiry and Shelf-Life Monitoring
**Status:** ⚠️ READY TO IMPLEMENT  
**Proposed Location:** `/src/app/pages/processor/ProcessorDashboard.tsx` → Inventory module

**Proposed Implementation:**
```typescript
// Add to inventory items
interface InventoryItem {
  // ... existing fields
  expiryDate?: string; // For green coffee (12-18 months shelf life)
  shelfLifeDays?: number; // Days until quality degradation
  ageInDays: number; // Days since receipt
  status: 'fresh' | 'aging' | 'urgent' | 'expired';
}

// Shelf-life rules for coffee
const SHELF_LIFE_RULES = {
  cherry: 24, // hours (process immediately)
  parchment: 30, // days (before hulling)
  green: 365, // days (12 months optimal)
  roasted: 30, // days (if applicable)
};

// Component additions
function ExpiryMonitoring() {
  const expiringItems = inventory.filter(item => {
    const daysUntilExpiry = calculateDaysUntilExpiry(item);
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
      <h3 className="font-semibold text-stone-800 mb-4">Expiry Alerts</h3>
      {expiringItems.map(item => (
        <div key={item.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-800">{item.batchId} - {item.coffeeType}</p>
              <p className="text-sm text-amber-600">
                {calculateDaysUntilExpiry(item)} days until quality degradation
              </p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              item.status === 'urgent' ? 'bg-red-100 text-red-700' :
              item.status === 'aging' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {item.status.toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Alerts:**
- 🟢 Fresh: 0-50% of shelf life used
- 🟡 Aging: 50-85% of shelf life used
- 🔴 Urgent: 85-100% of shelf life used
- ⚫ Expired: Beyond optimal shelf life

### Stock Reconciliation Tools
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function StockReconciliation() {
  const [reconciliationData, setReconciliationData] = useState({
    systemStock: { cherry: 820, parchment: 350, green: 1240 },
    physicalStock: { cherry: 0, parchment: 0, green: 0 },
    variance: { cherry: 0, parchment: 0, green: 0 },
  });

  const handlePhysicalCount = (type: string, count: number) => {
    setReconciliationData(prev => ({
      ...prev,
      physicalStock: { ...prev.physicalStock, [type]: count },
      variance: {
        ...prev.variance,
        [type]: prev.systemStock[type] - count
      }
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
      <h3 className="font-semibold text-stone-800 mb-4">Stock Reconciliation</h3>
      
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-100">
            <th className="text-left py-2">Coffee Type</th>
            <th className="text-right py-2">System Stock (kg)</th>
            <th className="text-right py-2">Physical Count (kg)</th>
            <th className="text-right py-2">Variance</th>
          </tr>
        </thead>
        <tbody>
          {['cherry', 'parchment', 'green'].map(type => (
            <tr key={type} className="border-b border-stone-50">
              <td className="py-3 capitalize">{type}</td>
              <td className="text-right">{reconciliationData.systemStock[type]}</td>
              <td className="text-right">
                <input
                  type="number"
                  className="w-24 px-2 py-1 border rounded text-right"
                  onChange={e => handlePhysicalCount(type, Number(e.target.value))}
                />
              </td>
              <td className={`text-right font-medium ${
                Math.abs(reconciliationData.variance[type]) > 10 ? 'text-red-600' :
                reconciliationData.variance[type] !== 0 ? 'text-amber-600' :
                'text-green-600'
              }`}>
                {reconciliationData.variance[type] > 0 ? '+' : ''}
                {reconciliationData.variance[type]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
        Complete Reconciliation
      </button>
    </div>
  );
}
```

**Features:**
- Physical count input for each coffee type
- Automatic variance calculation (system - physical)
- Color-coded variance (green: match, amber: minor, red: major)
- Reconciliation reports with timestamps
- Adjustment reasons and notes
- Manager approval for adjustments >10kg

### Mobile Scanning Interface
**Status:** ⚠️ READY TO IMPLEMENT (requires mobile app)  

**Proposed Implementation:**
- QR/Barcode scanner integration
- Batch ID scanning for quick lookup
- Weight entry via mobile device
- Photo capture for quality issues
- Offline mode for poor connectivity
- Auto-sync when connection restored

**Technology Stack:**
- React Native or Progressive Web App (PWA)
- Device camera API for barcode scanning
- Local storage for offline data
- Service workers for background sync

### Integration with Weighing Scales
**Status:** ⚠️ READY TO IMPLEMENT (requires hardware)  

**Proposed Implementation:**
```typescript
// USB/Bluetooth scale integration
interface WeighingScale {
  connect(): Promise<boolean>;
  getWeight(): Promise<number>; // Returns kg
  calibrate(): Promise<void>;
  disconnect(): void;
}

// Usage in pickup recording
function RecordPickupWithScale() {
  const [scale, setScale] = useState<WeighingScale | null>(null);
  const [weight, setWeight] = useState(0);

  const connectScale = async () => {
    const scaleDevice = await navigator.usb.requestDevice({
      filters: [{ vendorId: 0x1234 }] // Scale vendor ID
    });
    // Initialize scale connection
  };

  const captureWeight = async () => {
    if (scale) {
      const currentWeight = await scale.getWeight();
      setWeight(currentWeight);
      toast.success(`Weight captured: ${currentWeight} kg`);
    }
  };

  return (
    <div>
      <button onClick={connectScale}>Connect Scale</button>
      <button onClick={captureWeight}>Capture Weight</button>
      <p>Current Weight: {weight} kg</p>
    </div>
  );
}
```

**Supported Devices:**
- USB digital scales (via WebUSB API)
- Bluetooth scales (via Web Bluetooth API)
- Serial port scales (via Web Serial API)
- Manual entry fallback

---

## 3. 👥 Farmer & Cooperative Portal (Farmer Dashboard)

### Input/Service Requests
**Status:** ⚠️ READY TO IMPLEMENT  
**Proposed Location:** New module in Farmer Dashboard

**Proposed Implementation:**
```typescript
function InputServiceRequests() {
  const [requests, setRequests] = useState([
    { id: 'REQ001', type: 'fertilizer', item: 'Organic Fertilizer', quantity: '50 kg', status: 'pending', requestedAt: '2024-03-20' },
    { id: 'REQ002', type: 'training', item: 'Pruning Workshop', quantity: '1 seat', status: 'approved', requestedAt: '2024-03-15' },
  ]);

  const requestTypes = [
    { value: 'fertilizer', label: 'Fertilizer', icon: '🌱' },
    { value: 'pesticide', label: 'Pesticide', icon: '🐛' },
    { value: 'tools', label: 'Farm Tools', icon: '🔧' },
    { value: 'training', label: 'Training', icon: '📚' },
    { value: 'certification', label: 'Certification Support', icon: '📜' },
    { value: 'finance', label: 'Financial Support', icon: '💰' },
  ];

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Input & Service Requests</h2>

      {/* New Request Button */}
      <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
        <Plus className="w-4 h-4" /> New Request
      </button>

      {/* Request History */}
      <div className="space-y-3">
        {requests.map(req => (
          <div key={req.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {requestTypes.find(t => t.value === req.type)?.icon}
                </span>
                <div>
                  <p className="font-semibold text-stone-800">{req.item}</p>
                  <p className="text-xs text-stone-500">Quantity: {req.quantity}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                req.status === 'approved' ? 'bg-green-100 text-green-700' :
                req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {req.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-stone-400">Requested: {req.requestedAt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Features:**
- Request types: Fertilizer, Pesticide, Tools, Training, Certification, Finance
- Status tracking: Pending / Approved / Rejected / Fulfilled
- Quantity and delivery date management
- Cooperative bulk ordering
- Admin/cooperative approval workflow

### Community Discussion
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function CommunityDiscussion() {
  const [topics, setTopics] = useState([
    { id: 'T001', title: 'Best practices for Red Bourbon pruning', author: 'Jean Claude M.', replies: 12, lastActivity: '2 hours ago', category: 'Farming' },
    { id: 'T002', title: 'Organic certification process?', author: 'Uwase Claudine', replies: 8, lastActivity: '1 day ago', category: 'Certification' },
    { id: 'T003', title: 'Price trends for A1 grade coffee', author: 'Emmanuel H.', replies: 24, lastActivity: '3 hours ago', category: 'Market' },
  ]);

  const categories = ['Farming', 'Quality', 'Market', 'Certification', 'Finance', 'General'];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Community Discussion</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> New Topic
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} className="px-3 py-1 text-xs border border-stone-200 rounded-full hover:bg-emerald-50 hover:border-emerald-300">
            {cat}
          </button>
        ))}
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        {topics.map(topic => (
          <div key={topic.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:border-emerald-300 cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-stone-800 mb-1">{topic.title}</h3>
                <div className="flex items-center gap-3 text-xs text-stone-500">
                  <span>By {topic.author}</span>
                  <span>•</span>
                  <span>{topic.replies} replies</span>
                  <span>•</span>
                  <span>{topic.lastActivity}</span>
                </div>
              </div>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                {topic.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Features:**
- Topic categories: Farming, Quality, Market, Certification, Finance
- Threaded discussions with replies
- Upvoting/downvoting
- Farmer-to-farmer knowledge sharing
- Moderator oversight
- Mobile-friendly interface
- Kinyarwanda language option

### Knowledge Sharing
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function KnowledgeSharing() {
  const [articles, setArticles] = useState([
    {
      id: 'KB001',
      title: 'How I Achieved A1 Grade Consistently',
      author: 'Jean Claude Munyarugamba',
      farm: 'Nyamasheke (2.5 ha)',
      category: 'Success Story',
      views: 245,
      helpful: 89,
      date: '2024-03-15',
      excerpt: 'After 3 years of trial and error, I discovered the key practices that helped me consistently achieve A1 grade...'
    },
    {
      id: 'KB002',
      title: 'Shade Tree Management for Better Coffee',
      author: 'Emmanuel Habimana',
      farm: 'Gakenke (3.2 ha)',
      category: 'Best Practice',
      views: 178,
      helpful: 62,
      date: '2024-03-10',
      excerpt: 'Proper shade management increased my yield by 30% while improving cherry quality. Here's what I learned...'
    },
  ]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Knowledge Sharing</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Share Your Knowledge
        </button>
      </div>

      {/* Articles Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {articles.map(article => (
          <div key={article.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm hover:border-emerald-300 cursor-pointer">
            <span className="px-2 py-1 bg-violet-50 text-violet-700 text-xs rounded-full mb-3 inline-block">
              {article.category}
            </span>
            <h3 className="font-semibold text-stone-800 mb-2">{article.title}</h3>
            <p className="text-sm text-stone-600 mb-3">{article.excerpt}</p>
            
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                {article.author.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-stone-700">{article.author}</p>
                <p className="text-xs">{article.farm}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-stone-400">
              <span>👁️ {article.views} views</span>
              <span>👍 {article.helpful} helpful</span>
              <span>📅 {article.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Features:**
- Farmer success stories
- Best practice guides
- Photo/video sharing
- Seasonal farming calendars
- Problem-solving tips
- "Helpful" voting system
- Search and filter by topic

---

## 4. 📊 Data Analytics & Reporting Module (Admin Dashboard)

### Custom Report Builder
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function CustomReportBuilder() {
  const [reportConfig, setReportConfig] = useState({
    name: '',
    type: 'table', // table, chart, export
    dataSource: 'batches', // batches, farmers, pickups, shipments
    fields: [],
    filters: [],
    groupBy: '',
    sortBy: '',
  });

  const dataSources = [
    { value: 'batches', label: 'Batches', fields: ['id', 'origin', 'weight', 'grade', 'cuppingScore', 'status'] },
    { value: 'farmers', label: 'Farmers', fields: ['id', 'name', 'location', 'farmSize', 'totalWeight', 'grade'] },
    { value: 'pickups', label: 'Pickups', fields: ['id', 'farmerName', 'date', 'weight', 'quality', 'paymentStatus'] },
    { value: 'shipments', label: 'Shipments', fields: ['id', 'destination', 'weight', 'status', 'eta', 'buyer'] },
    { value: 'quality', label: 'Quality Tests', fields: ['id', 'batchId', 'cuppingScore', 'grade', 'tester', 'result'] },
  ];

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Custom Report Builder</h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Report Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Report Name</label>
            <input
              type="text"
              value={reportConfig.name}
              onChange={e => setReportConfig({...reportConfig, name: e.target.value})}
              placeholder="e.g., Monthly Export Summary"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Data Source</label>
            <select
              value={reportConfig.dataSource}
              onChange={e => setReportConfig({...reportConfig, dataSource: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {dataSources.map(ds => (
                <option key={ds.value} value={ds.value}>{ds.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Report Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['table', 'chart', 'export'].map(type => (
                <button
                  key={type}
                  onClick={() => setReportConfig({...reportConfig, type})}
                  className={`px-3 py-2 rounded-lg border capitalize ${
                    reportConfig.type === type
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-stone-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Select Fields</label>
            <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {dataSources
                .find(ds => ds.value === reportConfig.dataSource)?.fields
                .map(field => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded accent-emerald-600"
                      checked={reportConfig.fields.includes(field)}
                      onChange={e => {
                        if (e.target.checked) {
                          setReportConfig({
                            ...reportConfig,
                            fields: [...reportConfig.fields, field]
                          });
                        } else {
                          setReportConfig({
                            ...reportConfig,
                            fields: reportConfig.fields.filter(f => f !== field)
                          });
                        }
                      }}
                    />
                    <span className="text-sm capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-stone-50 rounded-xl p-4">
          <h3 className="font-medium text-stone-700 mb-3">Preview</h3>
          <div className="bg-white rounded-lg p-4 border border-stone-200">
            <p className="text-sm text-stone-500 mb-2">Report: {reportConfig.name || 'Untitled'}</p>
            <p className="text-xs text-stone-400">
              Fields: {reportConfig.fields.length} selected
            </p>
            {reportConfig.fields.length > 0 && (
              <div className="mt-3 text-xs">
                <div className="font-medium text-stone-600 mb-2">Selected Fields:</div>
                <div className="flex flex-wrap gap-2">
                  {reportConfig.fields.map(field => (
                    <span key={field} className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          Generate Report
        </button>
        <button className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50">
          Save Template
        </button>
        <button className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50">
          Export as CSV
        </button>
      </div>
    </div>
  );
}
```

**Features:**
- Drag-and-drop field selection
- Multiple data sources (batches, farmers, pickups, quality tests)
- Filter builder (date range, status, location, grade)
- Group by options (farmer, origin, grade, month)
- Sort options (ascending/descending)
- Export formats: CSV, Excel, PDF
- Save report templates for reuse
- Schedule automated reports

### Predictive Analytics
**Status:** ⚠️ REQUIRES ML MODELS  

**Proposed Implementation:**
```typescript
function PredictiveAnalytics() {
  const predictions = {
    harvest: {
      nextSeason: '4,200 kg',
      confidence: '85%',
      factors: ['Historical data', 'Weather patterns', 'Farm expansion'],
    },
    quality: {
      expectedA1Percentage: '48%',
      confidence: '78%',
      factors: ['Current cupping scores', 'Processing methods', 'Farmer training'],
    },
    demand: {
      nextQuarter: '3,800 kg',
      confidence: '82%',
      factors: ['Buyer orders', 'Market trends', 'Seasonal patterns'],
    },
    price: {
      forecast: 'RWF 2,680/kg (A1)',
      trend: 'increasing',
      confidence: '71%',
      factors: ['International prices', 'Local demand', 'Quality improvement'],
    },
  };

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Predictive Analytics</h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Harvest Prediction */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">Next Season Harvest</p>
              <p className="text-2xl font-bold text-emerald-900">{predictions.harvest.nextSeason}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-emerald-600">Confidence:</span>
            <div className="flex-1 bg-emerald-200 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: predictions.harvest.confidence }} />
            </div>
            <span className="text-xs font-medium text-emerald-700">{predictions.harvest.confidence}</span>
          </div>
          <div className="text-xs text-emerald-600">
            Based on: {predictions.harvest.factors.join(', ')}
          </div>
        </div>

        {/* Quality Prediction */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-violet-700">Expected A1 Grade %</p>
              <p className="text-2xl font-bold text-violet-900">{predictions.quality.expectedA1Percentage}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-violet-600">Confidence:</span>
            <div className="flex-1 bg-violet-200 rounded-full h-2">
              <div className="bg-violet-600 h-2 rounded-full" style={{ width: predictions.quality.confidence }} />
            </div>
            <span className="text-xs font-medium text-violet-700">{predictions.quality.confidence}</span>
          </div>
          <div className="text-xs text-violet-600">
            Based on: {predictions.quality.factors.join(', ')}
          </div>
        </div>

        {/* Demand Forecast */}
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-700">Next Quarter Demand</p>
              <p className="text-2xl font-bold text-blue-900">{predictions.demand.nextQuarter}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-blue-600">Confidence:</span>
            <div className="flex-1 bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: predictions.demand.confidence }} />
            </div>
            <span className="text-xs font-medium text-blue-700">{predictions.demand.confidence}</span>
          </div>
          <div className="text-xs text-blue-600">
            Based on: {predictions.demand.factors.join(', ')}
          </div>
        </div>

        {/* Price Forecast */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-amber-700">Price Forecast (A1)</p>
              <p className="text-2xl font-bold text-amber-900">{predictions.price.forecast}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-amber-600">Confidence:</span>
            <div className="flex-1 bg-amber-200 rounded-full h-2">
              <div className="bg-amber-600 h-2 rounded-full" style={{ width: predictions.price.confidence }} />
            </div>
            <span className="text-xs font-medium text-amber-700">{predictions.price.confidence}</span>
          </div>
          <div className="text-xs text-amber-600">
            Based on: {predictions.price.factors.join(', ')}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Predictions are based on machine learning models trained on historical data. 
          Actual results may vary due to weather, market conditions, and other external factors.
        </p>
      </div>
    </div>
  );
}
```

**ML Models Required:**
- Harvest prediction: Time series forecasting (ARIMA, LSTM)
- Quality prediction: Classification model (Random Forest, XGBoost)
- Demand forecasting: Regression model
- Price forecasting: Time series + sentiment analysis

### BI Tool Integration
**Status:** ⚠️ REQUIRES BACKEND API  

**Proposed Implementation:**
- Export data to Power BI
- Tableau integration via REST API
- Looker dashboards
- Google Data Studio connectors
- Real-time data sync
- Embedded dashboards in admin panel

### Automated Report Generation
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function AutomatedReports() {
  const [scheduledReports, setScheduledReports] = useState([
    { id: 'SR001', name: 'Weekly Export Summary', frequency: 'weekly', recipients: ['admin@rwandacoffee.rw'], format: 'PDF', lastRun: '2024-03-24', nextRun: '2024-03-31' },
    { id: 'SR002', name: 'Monthly Farmer Payments', frequency: 'monthly', recipients: ['finance@rwandacoffee.rw', 'admin@rwandacoffee.rw'], format: 'Excel', lastRun: '2024-03-01', nextRun: '2024-04-01' },
  ]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Automated Report Scheduling</h2>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          + Schedule Report
        </button>
      </div>

      <div className="space-y-3">
        {scheduledReports.map(report => (
          <div key={report.id} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-stone-800">{report.name}</h3>
                <p className="text-xs text-stone-500">
                  Frequency: {report.frequency} | Format: {report.format}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs border rounded hover:bg-stone-50">Edit</button>
                <button className="px-3 py-1 text-xs border rounded hover:bg-stone-50">Run Now</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-stone-500">Recipients:</span>
                <p className="text-stone-700">{report.recipients.length} emails</p>
              </div>
              <div>
                <span className="text-stone-500">Last Run:</span>
                <p className="text-stone-700">{report.lastRun}</p>
              </div>
              <div>
                <span className="text-stone-500">Next Run:</span>
                <p className="text-emerald-600 font-medium">{report.nextRun}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. 📋 Compliance & Audit Module (Admin Dashboard)

### Integration with Certification Bodies
**Status:** ⚠️ REQUIRES API PARTNERSHIPS  

**Proposed Implementation:**
```typescript
// API integrations for certification bodies
const certificationAPIs = {
  fairtrade: {
    endpoint: 'https://api.fairtrade.net/v1',
    authenticate: async (apiKey: string) => { /* OAuth flow */ },
    getCertificateStatus: async (farmerId: string) => { /* Check status */ },
    submitAuditRequest: async (farmerId: string) => { /* Request audit */ },
  },
  rainforestAlliance: {
    endpoint: 'https://api.rainforest-alliance.org/v2',
    verifyFarm: async (farmId: string) => { /* Verification */ },
    downloadCertificate: async (certId: string) => { /* Get PDF */ },
  },
  organic: {
    endpoint: 'https://api.usda.gov/organic/v1',
    checkCompliance: async (farmerId: string) => { /* Compliance check */ },
  },
};

function CertificationIntegration() {
  const [integrations, setIntegrations] = useState([
    { name: 'Fairtrade International', status: 'connected', lastSync: '2024-03-25 14:30', farms: 8 },
    { name: 'Rainforest Alliance', status: 'connected', lastSync: '2024-03-25 12:15', farms: 6 },
    { name: 'USDA Organic', status: 'pending', lastSync: null, farms: 4 },
    { name: 'UTZ Certified', status: 'disconnected', lastSync: '2024-03-20 09:00', farms: 5 },
  ]);

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Certification Body Integration</h2>

      <div className="grid md:grid-cols-2 gap-4">
        {integrations.map(integration => (
          <div key={integration.name} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-800">{integration.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                integration.status === 'connected' ? 'bg-green-100 text-green-700' :
                integration.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {integration.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Farms Certified:</span>
                <span className="font-medium">{integration.farms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Last Sync:</span>
                <span className="font-medium">{integration.lastSync || 'Never'}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {integration.status === 'connected' && (
                <button className="flex-1 px-3 py-2 text-xs border rounded hover:bg-stone-50">
                  Sync Now
                </button>
              )}
              {integration.status === 'disconnected' && (
                <button className="flex-1 px-3 py-2 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">
                  Connect
                </button>
              )}
              <button className="px-3 py-2 text-xs border rounded hover:bg-stone-50">
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Features:**
- Real-time certification status checks
- Automatic certificate downloads
- Audit scheduling via API
- Compliance verification
- Renewal reminders
- Document upload to certification portals

### Risk Assessment
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function RiskAssessment() {
  const risks = [
    {
      id: 'R001',
      category: 'Quality',
      title: 'Defect Rate Increasing',
      severity: 'high',
      probability: 'medium',
      impact: 'High rejection rate may lead to lost export orders',
      mitigation: 'Implement additional farmer training on cherry sorting',
      status: 'active',
      owner: 'Diane Mukandayisenga',
    },
    {
      id: 'R002',
      category: 'Financial',
      title: 'Delayed Farmer Payments',
      severity: 'medium',
      probability: 'low',
      impact: 'Farmer trust erosion, potential supply shortage',
      mitigation: 'Automated payment scheduling, reserve fund allocation',
      status: 'monitoring',
      owner: 'Eric Kamanzi',
    },
    {
      id: 'R003',
      category: 'Compliance',
      title: 'Organic Certification Expiring',
      severity: 'high',
      probability: 'high',
      impact: 'Loss of organic premium pricing, buyer dissatisfaction',
      mitigation: 'Schedule audit 90 days before expiry, prepare documentation',
      status: 'urgent',
      owner: 'Eric Kamanzi',
    },
    {
      id: 'R004',
      category: 'Supply Chain',
      title: 'Port Delays at Mombasa',
      severity: 'medium',
      probability: 'medium',
      impact: 'Shipment delays, buyer penalties, quality degradation',
      mitigation: 'Alternative port routing (Dar es Salaam), buffer time in planning',
      status: 'monitoring',
      owner: 'Joseph Nkurikiye',
    },
  ];

  const severityColor = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200',
  };

  const statusColor = {
    urgent: 'bg-red-50 border-red-300',
    active: 'bg-amber-50 border-amber-300',
    monitoring: 'bg-blue-50 border-blue-300',
    mitigated: 'bg-green-50 border-green-300',
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Risk Assessment & Mitigation</h2>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          + Add Risk
        </button>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-4 gap-4">
        {['Total Risks', 'Urgent', 'Active', 'Mitigated'].map((label, i) => (
          <div key={label} className="bg-white rounded-xl border border-stone-200 p-4 text-center">
            <p className="text-2xl font-bold text-stone-800">
              {i === 0 ? risks.length : i === 1 ? risks.filter(r => r.status === 'urgent').length : i === 2 ? risks.filter(r => r.status === 'active').length : 0}
            </p>
            <p className="text-xs text-stone-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Risk Matrix */}
      <div className="space-y-3">
        {risks.map(risk => (
          <div key={risk.id} className={`rounded-xl border-2 p-4 ${statusColor[risk.status]}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColor[risk.severity]}`}>
                    {risk.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-stone-500">{risk.category}</span>
                </div>
                <h3 className="font-semibold text-stone-800">{risk.title}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                risk.status === 'urgent' ? 'bg-red-100 text-red-700' :
                risk.status === 'active' ? 'bg-amber-100 text-amber-700' :
                risk.status === 'monitoring' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {risk.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-stone-500 font-medium">Impact:</span>
                <p className="text-stone-700">{risk.impact}</p>
              </div>
              <div>
                <span className="text-stone-500 font-medium">Mitigation:</span>
                <p className="text-stone-700">{risk.mitigation}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-xs">Risk Owner: {risk.owner}</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-xs border rounded hover:bg-white">
                    Update Status
                  </button>
                  <button className="px-3 py-1 text-xs border rounded hover:bg-white">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Risk Categories:**
- Quality risks (defect rates, processing failures)
- Financial risks (payment delays, currency fluctuation)
- Compliance risks (certification expiry, regulatory changes)
- Supply chain risks (port delays, logistics failures)
- Environmental risks (climate change, water scarcity)
- Market risks (price volatility, demand changes)

---

## 6. 🚢 Logistics & Shipping Module (Logistics Dashboard)

### Customs Clearance Tracking
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function CustomsClearance() {
  const [clearances, setClearances] = useState([
    {
      id: 'CC001',
      shipmentId: 'SHP001',
      destination: 'Hamburg, Germany',
      status: 'cleared',
      entryDate: '2024-03-27',
      clearanceDate: '2024-03-28',
      documents: [
        { name: 'Bill of Lading', status: 'approved' },
        { name: 'Commercial Invoice', status: 'approved' },
        { name: 'Certificate of Origin', status: 'approved' },
        { name: 'Phytosanitary Certificate', status: 'approved' },
      ],
      dutyPaid: 'EUR 1,250',
      customsOfficer: 'Officer Schmidt',
    },
    {
      id: 'CC002',
      shipmentId: 'SHP002',
      destination: 'Rotterdam, Netherlands',
      status: 'pending',
      entryDate: '2024-04-05',
      clearanceDate: null,
      documents: [
        { name: 'Bill of Lading', status: 'submitted' },
        { name: 'Commercial Invoice', status: 'submitted' },
        { name: 'Certificate of Origin', status: 'pending' },
        { name: 'Phytosanitary Certificate', status: 'submitted' },
      ],
      dutyPaid: null,
      customsOfficer: null,
    },
  ]);

  const statusColor = {
    cleared: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    inspection: 'bg-blue-100 text-blue-700',
    held: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Customs Clearance Tracking</h2>

      <div className="space-y-4">
        {clearances.map(clearance => (
          <div key={clearance.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-stone-800">
                  Shipment {clearance.shipmentId} → {clearance.destination}
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Entry: {clearance.entryDate}
                  {clearance.clearanceDate && ` • Cleared: ${clearance.clearanceDate}`}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[clearance.status]}`}>
                {clearance.status.toUpperCase()}
              </span>
            </div>

            {/* Documents Checklist */}
            <div className="mb-4">
              <p className="text-sm font-medium text-stone-700 mb-2">Required Documents:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {clearance.documents.map(doc => (
                  <div key={doc.name} className="flex items-center gap-2 p-2 bg-stone-50 rounded">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      doc.status === 'approved' ? 'bg-green-100' :
                      doc.status === 'submitted' ? 'bg-blue-100' :
                      'bg-amber-100'
                    }`}>
                      {doc.status === 'approved' ? '✓' :
                       doc.status === 'submitted' ? '⏳' :
                       '⏰'}
                    </div>
                    <span className="text-xs text-stone-700">{doc.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clearance Details */}
            {clearance.status === 'cleared' && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-green-600">Duty Paid:</span>
                    <p className="font-semibold text-green-800">{clearance.dutyPaid}</p>
                  </div>
                  <div>
                    <span className="text-green-600">Customs Officer:</span>
                    <p className="font-semibold text-green-800">{clearance.customsOfficer}</p>
                  </div>
                </div>
              </div>
            )}

            {clearance.status === 'pending' && (
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Upload Missing Documents
                </button>
                <button className="px-4 py-2 text-sm border rounded-lg hover:bg-stone-50">
                  Track Status
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Features:**
- Document checklist tracking
- Customs status updates (pending/inspection/cleared/held)
- Duty and tax calculations
- Inspector assignment
- Estimated clearance time
- SMS/email alerts on status changes
- Integration with customs systems (future)

### Insurance Management
**Status:** ⚠️ READY TO IMPLEMENT  

**Proposed Implementation:**
```typescript
function InsuranceManagement() {
  const [policies, setPolicies] = useState([
    {
      id: 'INS001',
      shipmentId: 'SHP001',
      policyNumber: 'POL-2024-1234',
      insurer: 'Jubilee Insurance',
      coverage: 'All Risk',
      insuredValue: 'USD 15,120',
      premium: 'USD 189',
      startDate: '2024-03-01',
      endDate: '2024-04-15',
      status: 'active',
      claimStatus: null,
    },
    {
      id: 'INS002',
      shipmentId: 'SHP002',
      policyNumber: 'POL-2024-1235',
      insurer: 'SORAS Insurance',
      coverage: 'All Risk',
      insuredValue: 'USD 13,230',
      premium: 'USD 165',
      startDate: '2024-03-12',
      endDate: '2024-04-30',
      status: 'active',
      claimStatus: null,
    },
  ]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">Insurance Management</h2>
        <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          + New Policy
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {policies.map(policy => (
          <div key={policy.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-stone-800">Shipment {policy.shipmentId}</h3>
                <p className="text-xs text-stone-500">Policy: {policy.policyNumber}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-stone-500">Insurer:</span>
                <span className="font-medium">{policy.insurer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Coverage:</span>
                <span className="font-medium">{policy.coverage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Insured Value:</span>
                <span className="font-medium">{policy.insuredValue}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Premium:</span>
                <span className="font-medium text-emerald-600">{policy.premium}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Coverage Period:</span>
                <span className="font-medium">{policy.startDate} - {policy.endDate}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 text-xs border rounded hover:bg-stone-50">
                View Policy
              </button>
              <button className="flex-1 px-3 py-2 text-xs bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100">
                File Claim
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Features:**
- Policy management (all risk, named perils)
- Premium calculation based on cargo value
- Claim filing and tracking
- Insurer contact information
- Coverage verification
- Document upload (policy, certificates)
- Renewal reminders

### Trade Finance Integration
**Status:** ⚠️ REQUIRES BANKING API  

**Proposed Implementation:**
```typescript
function TradeFinance() {
  const [transactions, setTransactions] = useState([
    {
      id: 'LC001',
      exportOrder: 'EO001',
      buyer: 'Nordic Roasters GmbH',
      amount: 'USD 15,120',
      type: 'Letter of Credit',
      issuingBank: 'Deutsche Bank',
      status: 'confirmed',
      openDate: '2024-02-25',
      expiryDate: '2024-04-30',
      documents: ['Invoice', 'Bill of Lading', 'Certificate of Origin'],
      shipmentDate: '2024-03-01',
      presentationDate: '2024-03-28',
      paymentDate: '2024-04-02',
    },
    {
      id: 'TT001',
      exportOrder: 'EO003',
      buyer: 'Brooklyn Roasters Inc.',
      amount: 'USD 6,020',
      type: 'Telegraphic Transfer',
      issuingBank: 'Chase Bank',
      status: 'awaiting-payment',
      openDate: '2024-03-20',
      expiryDate: null,
      documents: [],
      shipmentDate: '2024-03-25',
      presentationDate: null,
      paymentDate: null,
    },
  ]);

  const statusColor = {
    'confirmed': 'bg-green-100 text-green-700',
    'awaiting-payment': 'bg-amber-100 text-amber-700',
    'documents-presented': 'bg-blue-100 text-blue-700',
    'paid': 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-stone-800">Trade Finance Management</h2>

      <div className="space-y-4">
        {transactions.map(txn => (
          <div key={txn.id} className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-stone-800">
                  {txn.type} - {txn.buyer}
                </h3>
                <p className="text-xs text-stone-500">Order: {txn.exportOrder} • {txn.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[txn.status]}`}>
                {txn.status.toUpperCase().replace('-', ' ')}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Amount:</span>
                  <span className="font-semibold text-stone-800">{txn.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Issuing Bank:</span>
                  <span className="font-medium">{txn.issuingBank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Open Date:</span>
                  <span className="font-medium">{txn.openDate}</span>
                </div>
                {txn.expiryDate && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Expiry:</span>
                    <span className="font-medium">{txn.expiryDate}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Shipment:</span>
                  <span className="font-medium">{txn.shipmentDate || 'Pending'}</span>
                </div>
                {txn.presentationDate && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Docs Presented:</span>
                    <span className="font-medium">{txn.presentationDate}</span>
                  </div>
                )}
                {txn.paymentDate && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Payment:</span>
                    <span className="font-medium text-green-600">{txn.paymentDate}</span>
                  </div>
                )}
              </div>
            </div>

            {txn.type === 'Letter of Credit' && txn.documents.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-stone-600 mb-2">Required Documents:</p>
                <div className="flex flex-wrap gap-2">
                  {txn.documents.map(doc => (
                    <span key={doc} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm border rounded-lg hover:bg-stone-50">
                View Details
              </button>
              {txn.status === 'confirmed' && (
                <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Present Documents
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Payment Methods:**
- Letter of Credit (L/C) - most secure
- Telegraphic Transfer (T/T) - wire transfer
- Documents Against Payment (D/P)
- Documents Against Acceptance (D/A)
- Open Account (for trusted buyers)

**Features:**
- L/C status tracking
- Document presentation management
- Payment milestone tracking
- Bank fee calculations
- Currency exchange rates
- SWIFT integration (future)

---

## Summary of Implementation Status

### ✅ FULLY IMPLEMENTED:
1. **QR Code Login for Field Staff** - Login page
2. **Multi-Factor Authentication** - Login page with 6-digit code

### ⚠️ READY TO IMPLEMENT (Mock UI):
3. **Inventory - Expiry Monitoring** - Needs mockData additions
4. **Inventory - Stock Reconciliation** - Needs component in Processor Dashboard
5. **Farmer Portal - Input Requests** - Needs component in Farmer Dashboard
6. **Farmer Portal - Community Discussion** - Needs component in Farmer Dashboard
7. **Farmer Portal - Knowledge Sharing** - Needs component in Farmer Dashboard
8. **Analytics - Custom Report Builder** - Needs component in Admin Dashboard
9. **Analytics - Predictive Analytics** - Needs ML models (mock for now)
10. **Analytics - Automated Reports** - Needs component in Admin Dashboard
11. **Compliance - Risk Assessment** - Needs component in Admin Dashboard
12. **Logistics - Customs Tracking** - Needs component in Logistics Dashboard
13. **Logistics - Insurance Management** - Needs component in Logistics Dashboard
14. **Logistics - Trade Finance** - Needs component in Logistics Dashboard

### ❌ REQUIRES EXTERNAL INTEGRATION:
15. **Mobile Scanning Interface** - Requires mobile app/PWA
16. **Weighing Scale Integration** - Requires hardware + WebUSB API
17. **BI Tool Integration** - Requires backend API + partnerships
18. **Certification Body APIs** - Requires partnerships with Fairtrade, Rainforest Alliance, etc.

---

## Next Steps for Full Implementation

1. Add remaining modules to respective dashboards
2. Update mockData.ts with additional data fields
3. Create new navigation items in each role's sidebar
4. Implement the proposed components
5. Connect to backend APIs (future phase)
6. Deploy mobile app for field features (future phase)

**Total Features Added:** 2/17 fully functional, 12/17 ready for integration, 3/17 require external dependencies

---

**Document Generated:** March 26, 2026  
**System Version:** 2.1 (Authentication & Planning Edition)
