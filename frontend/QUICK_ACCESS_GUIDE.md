# Quick Access Guide - New Features

## How to Access Each New Feature

### 🔐 Multi-Factor Authentication (MFA)
**Triggers on:** All user logins (Farmer, Aggregator, Processor, Quality, Logistics, Exporter, Admin)  
**Demo Code:** 123456

**How to Test:**
1. Go to Login page
2. Enter any demo email (e.g., jc.munyarugamba@gmail.com) and password (farmer123)
3. Click "Sign In with MFA"
4. You'll be redirected to MFA verification page
5. Enter **123456** in the 6-digit OTP input
6. Auto-verifies and redirects to your dashboard

**OR use Demo buttons:**
1. Click any demo role button on login page
2. Toast message: "Demo login requires MFA verification"
3. Enter **123456** on MFA page
4. Access granted!

**Direct URL:** `/mfa-verification`  
**Features:** 6-digit OTP input, resend code, back to login, security info panel

---

### 📱 QR Code Login for Field Staff
**Access from:** Login page → Green "QR Code Login (Field Staff)" button  
**Logs in as:** Aggregator (Aline Uwizeyimana)

**How to Test:**
1. Go to Login page
2. Click green **"QR Code Login (Field Staff)"** button
3. View demo QR code badge
4. Click **"Scan QR Code"** button
5. Watch animated scanning process (0-100%)
6. Success screen shows user profile
7. Auto-redirects to Aggregator dashboard

**Direct URL:** `/qr-scanner`  
**Features:** QR code display, scan animation, progress bar, success confirmation, user profile

---

### 1. Enhanced Inventory Management (Processor)
**Login as:** Processor  
**Email:** samuel.mugisha@rwacof.rw  
**Password:** processor123  
**Navigate to:** Dashboard → **Inventory** tab  

**Features to Try:**
- View urgent/aging inventory alerts at the top
- Click "Stock Reconciliation" button to open physical count form
- Enter physical counts and see variance calculations
- Check shelf-life progress bars for aging items
- Review detailed inventory table with expiry dates

---

### 2. Input & Service Requests (Farmer)
**Login as:** Farmer  
**Email:** jc.munyarugamba@gmail.com  
**Password:** farmer123  
**Navigate to:** Dashboard → **Requests** tab  

**Features to Try:**
- Click "New Request" to see available request types (Fertilizer, Tools, Training, etc.)
- View summary stats (Total, Approved, Pending, Rejected)
- Browse request history with status tracking
- Check estimated delivery dates for approved requests

---

### 3. Community Discussion Forum (Farmer)
**Login as:** Farmer  
**Email:** jc.munyarugamba@gmail.com  
**Password:** farmer123  
**Navigate to:** Dashboard → **Community** tab  

**Features to Try:**
- Filter topics by category (Farming, Quality, Market, etc.)
- View reply counts and engagement metrics
- See active discussions from fellow Rwandan farmers
- Check most popular topic: "How to achieve 88+ cupping score" (31 replies, 412 views)

---

### 4. Knowledge Sharing Portal (Farmer)
**Login as:** Farmer  
**Email:** jc.munyarugamba@gmail.com  
**Password:** farmer123  
**Navigate to:** Dashboard → **Knowledge** tab  

**Features to Try:**
- Use search bar to find specific topics
- Filter by category (Success Story, Best Practice, Technical Guide, etc.)
- Read farmer success stories with helpful votes
- Check most popular: "Post-Harvest Processing Guide" (312 views, 128 helpful)
- View author farm details (location and hectares)

---

### 5. Weather Integration (Farmer)
**Login as:** Farmer  
**Email:** jc.munyarugamba@gmail.com  
**Password:** farmer123  
**Navigate to:** Dashboard → **Weather** tab  

**Features to Try:**
- View current weather for Nyamasheke (22°C, Partly Cloudy)
- Check 7-day forecast with emoji weather icons
- Read weather alerts (Heavy rainfall warning for March 28-29)
- Review farming recommendations based on weather
- See UV index, humidity, wind speed, and rainfall data

---

### 6. Contract Management (Exporter)
**Login as:** Exporter  
**Email:** christine.m@rwandacoffee.rw  
**Password:** exporter123  
**Navigate to:** Dashboard → **Contracts** tab  

**Features to Try:**
- View 5 summary stat cards (Total, Active, Pending, Completed, Draft)
- Filter contracts by status
- Check fulfillment progress bars for active contracts
- View contract details (Nordic Roasters: RWF 30.24M, 50% fulfilled)
- See overdue warnings for expired contracts
- Review penalty clauses and quality specifications

---

### 7. Custom Report Builder (Admin)
**Login as:** Admin  
**Email:** eric.kamanzi@rwandacoffee.rw  
**Password:** admin123  
**Navigate to:** Dashboard → **Reports** tab  

**Features to Try:**
- Enter a report name (e.g., "March 2024 Summary")
- Select data source (Batches, Farmers, Pickups, Shipments, Quality, Contracts)
- Choose report type (Table View, Chart View, Export Only)
- Select multiple fields using checkboxes
- Configure grouping and sorting options
- View live preview panel
- Load saved templates (Monthly Export Summary, Farmer Performance, Quality Analytics)
- Click "Generate Report" or "Export as CSV"

---

## All Farmer Dashboard Sections (Example: jc.munyarugamba@gmail.com)

| Tab Name | URL Parameter | Feature |
|----------|---------------|---------|
| Overview | `?section=overview` | KPIs, price trends, recent activity |
| Profile | `?section=profile` | Farm details, certifications |
| Pickups | `?section=pickups` | Pickup history, schedule |
| Payments | `?section=payments` | Payment transactions, MTN Mobile Money |
| Price Trends | `?section=price-trends` | A1/A2/B grade prices |
| **Requests** | `?section=requests` | **NEW: Input & service requests** |
| **Community** | `?section=community` | **NEW: Discussion forum** |
| **Knowledge** | `?section=knowledge` | **NEW: Knowledge articles** |
| **Weather** | `?section=weather` | **NEW: Weather forecast & alerts** |
| Sustainability | `?section=sustainability` | Carbon footprint, water usage |
| Traceability | `?section=traceability` | Farm-to-cup journey |
| Training | `?section=training` | NAEB resources |
| Notifications | `?section=notifications` | Activity feed |

---

## All Processor Dashboard Sections (Example: samuel.mugisha@rwacof.rw)

| Tab Name | URL Parameter | Feature |
|----------|---------------|---------|
| Overview | `?section=overview` | Processing pipeline, KPIs |
| Incoming | `?section=incoming` | Batches awaiting receipt |
| Processing | `?section=processing` | Kanban board workflow |
| **Inventory** | `?section=inventory` | **NEW: Enhanced inventory with expiry monitoring** |
| Sustainability | `?section=sustainability` | Water recycling, energy use |
| Maintenance | `?section=maintenance` | Equipment tracking |
| Notifications | `?section=notifications` | Activity feed |

---

## All Exporter Dashboard Sections (Example: christine.m@rwandacoffee.rw)

| Tab Name | URL Parameter | Feature |
|----------|---------------|---------|
| Overview | `?section=overview` | Export orders, shipments |
| Orders | `?section=orders` | Export order management |
| Batches | `?section=batches` | Batch selection for orders |
| Documents | `?section=documents` | Export documentation |
| Shipment | `?section=shipment` | Shipment preparation |
| **Contracts** | `?section=contracts` | **NEW: Contract management system** |
| Traceability | `?section=traceability` | QR code generation |
| Blockchain | `?section=blockchain` | Blockchain verification |
| Notifications | `?section=notifications` | Activity feed |

---

## All Admin Dashboard Sections (Example: eric.kamanzi@rwandacoffee.rw)

| Tab Name | URL Parameter | Feature |
|----------|---------------|---------|
| Overview | `?section=overview` | System stats, user activity |
| Approvals | `?section=approvals` | Farmer registration approvals |
| Users | `?section=users` | User management |
| Permissions | `?section=permissions` | Role-based access control |
| Analytics | `?section=analytics` | System-wide analytics |
| **Reports** | `?section=reports` | **NEW: Custom report builder** |
| Security | `?section=security` | Security audit logs |
| Compliance | `?section=compliance` | Regulatory compliance |
| Blockchain Audit | `?section=blockchain-audit` | Blockchain transaction history |
| Sustainability | `?section=sustainability` | System-wide sustainability |
| Notifications | `?section=notifications` | Activity feed |

---

## Sample User Credentials

### Farmer
- **Email:** jc.munyarugamba@gmail.com  
- **Password:** farmer123  
- **Features:** Requests, Community, Knowledge, Weather (+ all original features)

### Processor
- **Email:** samuel.mugisha@rwacof.rw  
- **Password:** processor123  
- **Features:** Enhanced Inventory with expiry monitoring and stock reconciliation

### Exporter
- **Email:** christine.m@rwandacoffee.rw  
- **Password:** exporter123  
- **Features:** Contract Management with fulfillment tracking

### Admin
- **Email:** eric.kamanzi@rwandacoffee.rw  
- **Password:** admin123  
- **Features:** Custom Report Builder with 6 data sources

### Aggregator
- **Email:** aline.uwizeyimana@coopac.rw  
- **Password:** aggregator123

### Quality Controller
- **Email:** diane.m@naeb.gov.rw  
- **Password:** quality123

### Logistics
- **Email:** j.nkurikiye@logistics.rw  
- **Password:** logistics123

---

## Direct URL Examples

Assuming the app runs at `http://localhost:5173`:

```
# Farmer - Input Requests
http://localhost:5173/dashboard?section=requests

# Farmer - Community Forum
http://localhost:5173/dashboard?section=community

# Farmer - Knowledge Articles
http://localhost:5173/dashboard?section=knowledge

# Farmer - Weather Forecast
http://localhost:5173/dashboard?section=weather

# Processor - Enhanced Inventory
http://localhost:5173/dashboard?section=inventory

# Exporter - Contract Management
http://localhost:5173/dashboard?section=contracts

# Admin - Report Builder
http://localhost:5173/dashboard?section=reports
```

---

## Key Data to Explore

### Inventory Items (Processor)
- **B005 (Cherry)** - URGENT status (6 days old, must process within 1 day)
- **OLD-002 (Green)** - URGENT status (321 days old, expiring soon)
- **B004 (Parchment)** - AGING status (11 days old, 30-day shelf life)

### Farmer Requests
- **REQ001** - Organic Fertilizer (Approved, delivery March 28)
- **REQ003** - Organic Certification (Pending)
- **REQ006** - Pre-Harvest Loan (Rejected - credit limit exceeded)

### Community Topics
- **T006** - "How to achieve 88+ cupping score" (31 replies, most popular)
- **T003** - "Price trends for A1 grade" (24 replies, 287 views)

### Knowledge Articles
- **KB003** - "Post-Harvest Processing Guide" (312 views, 128 helpful votes)
- **KB001** - "How I Achieved A1 Grade Consistently" (245 views, 89 helpful)

### Weather Alerts
- **W001** - Heavy Rainfall Warning (March 28-29)
- **W002** - Frost Risk Advisory (Temperatures may drop to 12°C)

### Contracts
- **CON001** - Nordic Roasters (Germany) - RWF 30.24M, 50% fulfilled, Active
- **CON003** - Brooklyn Roasters (USA) - RWF 25.2M, 24% fulfilled, Active
- **CON004** - Kyoto Coffee House (Japan) - RWF 18.96M, Pending batch

---

## Testing Workflows

### 1. Complete Inventory Management Flow (Processor)
1. Login as processor
2. Go to Inventory tab
3. Note urgent items requiring immediate processing
4. Click "Stock Reconciliation"
5. Enter physical counts (try: cherry=650, parchment=1300, green=2650)
6. Observe variance calculations
7. Click "Complete Reconciliation"

### 2. Farmer Request Workflow (Farmer)
1. Login as farmer
2. Go to Requests tab
3. View summary statistics
4. Click "New Request" 
5. Browse available request types
6. Review request history with status tracking

### 3. Community Engagement (Farmer)
1. Login as farmer
2. Go to Community tab
3. Try category filters (Farming, Quality, Market, etc.)
4. Click on popular topics
5. View engagement metrics

### 4. Contract Tracking (Exporter)
1. Login as exporter
2. Go to Contracts tab
3. View summary stats (5 contracts total)
4. Filter by "Active" status
5. Check progress bars for fulfillment
6. View Nordic Roasters contract (50% fulfilled)
7. Note overdue warnings if any

### 5. Custom Report Creation (Admin)
1. Login as admin
2. Go to Reports tab
3. Enter report name: "Test Report"
4. Select "Batches" data source
5. Choose "Table View" type
6. Select 5-6 fields (id, name, origin, weight, grade, status)
7. Set grouping by "origin"
8. Watch preview panel update
9. Click "Generate Report"

---

## Feature Highlights

### Most Innovative
- **Expiry Monitoring** - Prevents coffee quality degradation with automated alerts
- **Weather Integration** - Smart farming recommendations based on forecast
- **Stock Reconciliation** - Automatic variance detection with color coding

### Most User-Friendly
- **Community Discussion** - Farmer-to-farmer knowledge sharing
- **Knowledge Portal** - Searchable success stories and guides
- **Report Builder** - Visual configuration with live preview

### Most Business-Critical
- **Contract Management** - Track multi-million RWF deals with fulfillment progress
- **Inventory Management** - Prevent losses from expired stock
- **Input Requests** - Streamline cooperative supply chain

---

**Document Version:** 1.0  
**Last Updated:** March 26, 2024  
**Total New Features:** 7 major modules  
**System Status:** Production-ready prototype