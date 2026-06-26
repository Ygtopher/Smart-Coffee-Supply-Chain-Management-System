# Smart Coffee Supply Chain Management System - Complete User Documentation

## System Overview

This is a comprehensive coffee supply chain management system specifically designed for Rwanda's specialty coffee industry. The system manages the entire supply chain from farmer registration through international export, with 7 distinct role-based dashboards featuring advanced modules for sustainability, traceability, and compliance.

**System Context:**
- **Country:** Rwanda (East Africa)
- **Currency:** Rwandan Franc (RWF)
- **Locations:** Western, Southern, Northern, and Eastern Provinces
- **Coffee Varieties:** Red Bourbon, Bourbon, Jackson, Mibirizi
- **Quality Grading:** NAEB Standards (Grade A1, A2, B)
- **Payment Methods:** MTN Mobile Money, Airtel Money, Bank Transfer, Cash
- **Certifications:** Organic, Rainforest Alliance, Fairtrade, UTZ, Café Practices
- **Language:** English with Kinyarwanda greetings (Murakoze, Muraho)

**Key Features:**
- ✅ Complete farm-to-export traceability
- ✅ Blockchain verification for quality and exports
- ✅ GPS tracking for containers and farms
- ✅ Sustainability metrics tracking
- ✅ QR code generation for consumer transparency
- ✅ Route optimization for aggregators
- ✅ Equipment maintenance tracking
- ✅ Compliance monitoring and audit trails

---

## Role-Based Access Control

### Authentication System

**Login Process:**
- Users log in with email and password
- System routes to role-specific dashboard
- Each role has isolated modules and permissions

**User Creation Rules:**
1. **Farmers Only:** Can self-register (requires admin approval)
2. **All Other Roles:** Created by Admin with auto-generated temporary passwords
3. **First Login:** Non-farmers must change temporary password

**7 System Roles:**
1. 🌱 **Farmer** - Coffee producers
2. 🚜 **Aggregator** - Coffee collectors and batch creators
3. ⚙️ **Processor** - Washing station operators
4. 🔬 **Quality Controller** - NAEB Q-Graders
5. 🚢 **Logistics** - Shipping coordinators
6. 🌍 **Exporter** - Export order managers
7. 👤 **Admin** - System administrators

---

## 1. FARMER ROLE 🌱

**User Example:** Jean Claude Munyarugamba (F001)  
**Location:** Nyamasheke, Western Province  
**Farm:** 2.5 hectares at 1750m altitude, Red Bourbon variety

### Dashboard Overview
Quick snapshot of farm operations and earnings

**Features:**
- **Personalized Greeting:** "Murakoze! Welcome back, Jean Claude" or "Muraho! Good morning"
- **Farm Profile Card:**
  - Farm size in hectares
  - Altitude (meters above sea level)
  - Coffee variety
  - Active certifications (badges)
- **4 KPI Cards:**
  - 🚜 **Total Deliveries:** Season count (e.g., 8 deliveries)
  - ⚖️ **Total Weight:** Cumulative kg delivered (e.g., 2,340 kg)
  - 💰 **Total Earned:** RWF earned this season (e.g., RWF 8,236,000)
  - ⏳ **Pending Payment:** RWF awaiting payment (e.g., RWF 2,214,000)
- **Price Trends Chart:** 6-month line chart for grades A1, A2, B
- **Recent Activity Feed:** Latest 5 notifications
- **Certifications Display:** Visual badges for Organic, Rainforest Alliance, etc.

### Module 1.1: My Farm
View and manage farm information

**Personal Information Section:**
- Full name and farmer ID (e.g., F001)
- Email address and phone number (+250 format)
- Registration date and account status
- Last login timestamp

**Farm Details Section:**
- **Location:** District and Province (e.g., Nyamasheke, Western Province)
- **Farm Size:** Hectares (e.g., 2.5 ha)
- **Altitude:** Meters above sea level (e.g., 1750m)
- **Coffee Variety:** Red Bourbon, Bourbon, Jackson, Mibirizi
- **Processing Method:** Fully Washed, Semi-Washed, Natural
- **Annual Yield Estimate:** Expected kg per season
- **GPS Coordinates:** Latitude and Longitude display
- **Certifications:** List of active certifications with issue dates

**Soil & Climate Section:**
- Soil type (Volcanic, Clay, etc.)
- Average rainfall (mm per year)
- Shade tree coverage (%)
- Harvest season months

### Module 1.2: Pickup Schedule
Track coffee pickup history and future schedules

**Summary Statistics:**
- 📅 **Scheduled Pickups:** Count of upcoming collections
- ✅ **Completed Pickups:** Count of finished deliveries
- ⚖️ **Total Weight Delivered:** Cumulative kg this season

**Pickup Records Table:**
- **Pickup ID:** Unique identifier (e.g., PU001)
- **Date:** Scheduled or completed date
- **Weight (kg):** Coffee cherry delivered
- **Quality Grade:** A1 / A2 / B
- **Price per kg:** RWF rate based on grade
- **Total Amount:** RWF (weight × price)
- **Payment Status:** 
  - ✅ PAID (green badge)
  - ⏳ PENDING (amber badge)

**Actions:**
- 🔔 **Request Pickup Button:** Submit new pickup request with estimated weight
- 📱 Contact aggregator directly
- 🗓️ View monthly calendar view of pickups

### Module 1.3: Payments
Track financial transactions and earnings

**Payment Summary Cards:**
- 💰 **Total Received:** All-time earnings (RWF)
- ⏳ **Pending Payment:** Awaiting disbursement (RWF + farmer count)
- 📅 **Last Payment:** Most recent amount and date

**Payment Transactions Table:**
- **Pickup ID:** Linked to pickup record
- **Date:** Payment or scheduled date
- **Weight (kg):** Coffee delivered
- **Amount (RWF):** Payment value
- **Payment Method:**
  - 📱 MTN Mobile Money (orange icon)
  - 📱 Airtel Money (red icon)
  - 🏦 Bank Transfer
  - 💵 Cash
- **Status:** Paid / Pending
- **Receipt:** Download PDF receipt (for paid transactions)

**Payment Details Panel:**
- Payment breakdown per pickup
- Payment method confirmation
- Transaction reference numbers
- Mobile money confirmation codes

### Module 1.4: Price Trends
View market pricing information

**Current Prices Section (RWF/kg):**
- **Grade A1:** 
  - Current rate: RWF 2,600/kg
  - Change from last month: +2.4% ⬆️ (green)
  - Quality: Specialty grade, highest quality
- **Grade A2:**
  - Current rate: RWF 2,340/kg
  - Change from last month: +2.4% ⬆️
  - Quality: Premium grade, excellent quality
- **Grade B:**
  - Current rate: RWF 2,070/kg
  - Change from last month: +3.5% ⬆️
  - Quality: Commercial grade, good quality

**Historical Price Chart:**
- 6-month line chart (Oct → Mar)
- All three grades displayed
- Hover to see exact values
- Clear trend visualization

**NAEB Price Advisory Panel:**
- Market insights and trends
- Quality improvement tips
- Best practices for achieving A1 grade
- Upcoming price announcements
- Harvest timing recommendations

**Quality Requirements:**
- **A1 Requirements:** Specialty grade (85+ SCA score), no defects, 10.5-11.5% moisture
- **A2 Requirements:** Premium grade (80-84 SCA score), minimal defects, 11.0-12.0% moisture
- **B Requirements:** Commercial grade, minor defects acceptable

### Module 1.5: Training Resources
Access educational materials and capacity building

**Resource Library:**
- **Format Types:**
  - 🎥 Video tutorials
  - 📄 PDF guides
  - 💻 Webinars (live and recorded)
- **Categories:**
  - 🌱 Farming techniques
  - ⚙️ Processing methods
  - 🔬 Quality improvement
  - ♻️ Sustainability practices
  - 📜 Certification preparation
  - 💰 Financial management
- **Difficulty Levels:**
  - 🟢 Beginner
  - 🟡 Intermediate
  - 🔴 Advanced

**Featured Resources:**
1. **"Fully Washed Processing at Rwanda Washing Stations"**
   - Format: Video (45 min)
   - Level: Beginner
   - Topics: Cherry selection, pulping, fermentation, washing, drying

2. **"Bourbon Variety Management & Soil Health in Rwanda"**
   - Format: PDF (30 pages)
   - Level: Intermediate
   - Topics: Pruning, fertilization, pest management, soil conservation

3. **"Understanding NAEB Coffee Quality Grading (A1/A2/B)"**
   - Format: Video (20 min)
   - Level: Beginner
   - Topics: Grading criteria, defect identification, quality improvement

4. **"Café Practices & Organic Certification for Smallholder Farmers"**
   - Format: Webinar (60 min)
   - Level: Advanced
   - Topics: Certification process, requirements, documentation, inspection preparation

5. **"MTN Mobile Money & Airtel Money Payment Guide"**
   - Format: PDF (15 pages)
   - Level: Beginner
   - Topics: Account setup, payment receipt, transaction history

**Upcoming Events:**
- NAEB hosted webinars
- Field days at demonstration farms
- Cooperative meetings
- Quality assessment workshops

**Download Options:**
- Download PDF materials
- View videos in-platform
- Register for webinars
- Bookmark favorites

### Module 1.6: Notifications
Stay updated on system activities

**Notification Types:**
- ✅ **Success:** Payment received, Pickup completed
- ⚠️ **Warning:** Payment overdue, Quality grade below expectation
- ℹ️ **Info:** Price update, Training resource added, New certification opportunity
- ❌ **Error:** Pickup cancelled, Payment failed

**Features:**
- Unread notification badges (red dot)
- Time stamps ("2 hours ago", "1 day ago")
- Clear, actionable messages
- Mark as read functionality
- Notification history archive

**Example Notifications:**
- "Pickup Scheduled: Your pickup for 320kg has been scheduled for March 20, 2024."
- "Payment Received: RWF 832,000 has been transferred to your MTN Mobile Money for Batch PU001."
- "New Price Update: A1 grade coffee price has increased to RWF 2,600/kg effective today."
- "Training Reminder: Webinar 'Post-Harvest Best Practices' starts in 2 days at NAEB."

---

## 2. AGGREGATOR ROLE 🚜

**User Example:** Aline Uwizeyimana (A001)  
**Organization:** COOPAC - Coffee Producers Cooperative  
**Zone:** Western Province Collection Zone (Nyamasheke, Karongi, Rusizi)

### Dashboard Overview
Monitor collection operations and farmer relationships

**Zone Information:**
- Collection zone name
- Number of assigned farmers (e.g., 10 active farmers)
- Geographic coverage (districts)
- Washing station partnerships

**4 KPI Cards:**
- 🌾 **Assigned Farmers:** Total count (e.g., 10 farmers)
- 🚜 **Pickups This Month:** Total kg collected (e.g., 1,530 kg)
- 💸 **Pending Payments:** RWF owed to farmers + farmer count (e.g., RWF 11,382,000 to 4 farmers)
- 📦 **Batches Created:** Season count (e.g., 3 batches)

**Weekly Collection Chart:**
- Bar chart showing kg collected per week
- Color-coded by quality grade
- Week-over-week comparison

**Upcoming Pickups Panel:**
- This week's scheduled pickups
- Farmer names and locations
- Estimated weights
- Quality grade expectations

### Module 2.1: Farmers
Manage farmer relationships and directory

**Search & Filter:**
- Search by farmer name or ID
- Filter by location (district)
- Filter by status (active/inactive/pending)
- Filter by certification
- Sort by pending payment amount

**Farmer Directory Table:**
- **Farmer Name & ID:** e.g., "Jean Claude Munyarugamba (F001)"
- **Location:** District and province
- **Farm Size:** Hectares
- **Altitude:** Meters (higher = better quality potential)
- **Grade Capability:** A1 / A2 / B (based on historical performance)
- **Certifications:** Badge display (Organic, Rainforest Alliance, etc.)
- **Status:** 
  - 🟢 Active (regular pickups)
  - 🟡 Inactive (no recent pickups)
  - ⏳ Pending approval
- **Pending Payment:** RWF amount owed
- **Contact:** Phone number (+250 xxx xxx xxx)

**Actions:**
- 👁️ View full farmer profile
- 📞 Call farmer directly
- 📅 Schedule pickup
- 💰 Record payment
- 📊 View performance history

**Add Farmer Button:**
- Register new farmer to zone
- Collect basic farm information
- Submit for admin approval

### Module 2.2: Pickup Schedule
Plan and organize collection routes

**Monthly Calendar View:**
- Visual calendar with pickup indicators
- Today highlighted
- Pickup density visualization (color intensity)
- Multiple pickups per day supported
- Click date to see pickup details

**This Week's Pickups Panel:**
- **Farmer Name:** e.g., "Emmanuel Habimana"
- **Location:** District (e.g., "Gakenke")
- **Scheduled Date:** Day and time
- **Expected Weight:** Kg (based on farmer estimate)
- **Quality Estimate:** Grade expectation
- **Status:** Scheduled / Completed / Cancelled

**Actions:**
- ➕ Add new pickup to schedule
- ✏️ Edit pickup details
- ❌ Cancel pickup
- ✅ Mark as completed
- 🗺️ View route optimization (see Module 2.9)

### Module 2.3: Record Pickup
Document coffee collection transactions

**Pickup Details Form:**
- **Farmer Selection:** Dropdown list of assigned farmers
- **Pickup Date:** Date picker (defaults to today)
- **Weight (kg):** Number input for cherry coffee weight
- **Quality Grade Assessment:** Radio buttons for A1 / A2 / B
  - A1: Specialty grade (ripe, uniform, no defects)
  - A2: Premium grade (mostly ripe, minimal defects)
  - B: Commercial grade (mixed ripeness, some defects)
- **Notes:** Text area for observations
  - Cherry condition (ripe, underripe, overripe)
  - Sorting quality
  - Any issues or special conditions

**Payment Calculation Panel:**
- **Price per kg:** Editable field with suggested price
  - A1: RWF 2,600/kg (default)
  - A2: RWF 2,340/kg (default)
  - B: RWF 2,070/kg (default)
- **Weight:** Display from form
- **Total Amount:** 🧮 **AUTO-CALCULATED** (weight × price per kg)
  - Example: 320 kg × RWF 2,600 = **RWF 832,000**
- **Payment Method:** Dropdown selection
  - 📱 MTN Mobile Money
  - 📱 Airtel Money
  - 🏦 Bank Transfer
  - 💵 Cash

**Payment Status Options:**
- **✅ Mark as Paid:** Immediate payment (farmer receives immediately)
- **⏳ Mark as Pending:** Deferred payment (pay later from Payments module)

**Record Pickup Button:**
- Saves transaction to database
- Updates farmer's total weight and pending payment
- Creates pickup record with unique ID
- Shows success notification
- Option to print receipt

**Success Message:**
"Pickup recorded successfully! Jean Claude Munyarugamba has delivered 320 kg of A1 grade coffee for RWF 832,000. Payment status: PAID via MTN Mobile Money."

### Module 2.4: Payments
Track and execute farmer payments

**Payment Summary Cards:**
- 💸 **Pending Payments:** Total RWF owed + number of farmers (e.g., RWF 11,382,000 to 4 farmers)
- ✅ **Paid This Month:** Total disbursed + payment count (e.g., RWF 1,884,000, 3 payments)
- 📊 **Total Disbursed:** All-time payment total (e.g., RWF 22,466,000)

**Payment Records Table:**
- **Farmer Name:** Full name
- **Pickup ID:** Reference to pickup record (e.g., PU002)
- **Date:** Pickup date
- **Weight (kg):** Coffee delivered
- **Amount (RWF):** Payment value
- **Payment Method:** Icon display
  - 📱 MTN Mobile Money (orange)
  - 📱 Airtel Money (red)
  - 🏦 Bank Transfer
  - 💵 Cash
- **Status:** 
  - ✅ PAID (green badge)
  - ⏳ PENDING (amber badge)

**Actions for Pending Payments:**
- **✅ Mark Paid Button:** 
  - Records payment transaction
  - Updates farmer's pending payment to 0
  - Sends payment confirmation notification
  - Generates receipt
- **View Details:** See pickup details and farmer info

**Bulk Payment Feature:**
- Select multiple pending payments
- Process all at once
- Generate combined receipt
- Update all farmer records

### Module 2.5: Batch Management
Consolidate pickups into processor batches

**Batch Statistics:**
- 📦 **Total Batches Created:** Season count (e.g., 3 batches)
- ⚖️ **Total Weight Consolidated:** Cumulative kg (e.g., 2,390 kg)
- 👥 **Average Farmers per Batch:** Calculation (e.g., 2.3 farmers/batch)

**Batch Table:**
- **Batch ID & Name:** e.g., "B003 - HUY-2024-003"
- **Origin:** District/zone (e.g., "Huye")
- **Number of Farmers:** Count of contributing farmers
- **Total Weight (kg):** Consolidated weight
- **Process Type:** 
  - Fully Washed (most common)
  - Semi-Washed
  - Natural (rare in Rwanda)
- **Status:** 
  - 📥 Received (at processor)
  - ⚙️ Processing (washing/drying)
  - 🔬 Quality Check (QC testing)
  - 📤 Dispatched (sent to exporter)
  - 🚢 Exported (shipped)
- **Created Date:** Batch creation timestamp
- **Grade:** A1 / A2 / B (based on quality test)

**Create Batch Button:**
- Opens batch creation form
- Select multiple pickups to consolidate
- Assign batch name (auto-generated or custom)
- Set process type
- Send to processor
- Generate batch documentation

**Batch Details View:**
- List of contributing farmers
- Individual pickup weights
- Quality grade breakdown
- Payment status per farmer
- Processing history timeline

### Module 2.6: Pickup History
Comprehensive pickup records and analytics

**Complete Pickup Log:**
- All pickup records from current season
- Detailed transaction history
- Linked batch IDs (if consolidated)
- Payment history
- Quality grades assigned

**Filter Options:**
- Date range picker (from-to dates)
- Farmer filter (dropdown)
- Status filter (all/paid/pending)
- Grade filter (A1/A2/B)
- Payment method filter

**Export Options:**
- Download as CSV
- Download as Excel
- Generate PDF report
- Print-friendly view

**Analytics Display:**
- Total pickups count
- Total weight collected
- Average weight per pickup
- Grade distribution (pie chart)
- Payment completion rate
- Top contributing farmers

### Module 2.7: Notifications
Activity alerts for collection operations

**Notification Types:**
- ✅ **Batch Confirmed:** "Batch HUY-2024-003 has been sent to processing."
- ⚠️ **Payment Overdue:** "Payment for Emmanuel Habimana (PU002) is overdue by 3 days."
- ℹ️ **Farmer Assigned:** "Innocent Nshimiyimana (F007) has been assigned to your collection zone."
- 🚜 **Pickup Requested:** "Jean Claude Munyarugamba has requested a pickup for 280kg."

### Module 2.8: Route Optimization ⭐ NEW
Plan efficient collection routes to minimize fuel costs and time

**Route Planning Interface:**
- **Map View:** Visual display of farm locations
- **Route Builder:**
  - Select multiple farmers for a single route
  - Drag to reorder stops
  - System suggests optimal sequence
- **Route Metrics:**
  - 📍 **Total Distance:** Kilometers for complete route
  - ⛽ **Estimated Fuel:** Liters required
  - ⏱️ **Estimated Time:** Hours for complete route
  - 💰 **Cost Estimate:** RWF for fuel and vehicle costs

**Waypoint Details:**
- **Farmer Name & Location**
- **Order in Route:** 1st stop, 2nd stop, etc.
- **ETA:** Estimated time of arrival
- **Status:** Pending / Completed
- **Expected Weight:** Kg to collect

**Route History:**
- Previous routes with performance metrics
- Actual vs. estimated comparisons
- Fuel efficiency tracking
- Time efficiency analysis

**Optimization Algorithm:**
- Considers farm locations (GPS coordinates)
- Minimizes total distance
- Accounts for road conditions
- Suggests optimal pickup sequence

**Example Route:**
```
Route R001 - March 26, 2024
1. F001 - Jean Claude (Nyamasheke) - ETA 09:00 - 320 kg
2. F003 - Emmanuel (Gakenke) - ETA 11:30 - 280 kg
3. F004 - Marie Rose (Rulindo) - ETA 14:00 - 150 kg
Total: 145 km | 18L fuel | 750 kg coffee | RWF 45,000 cost
```

### Module 2.9: Sustainability ⭐ NEW
Track environmental impact of collection operations

**Aggregator Sustainability Metrics:**
- **Fuel Consumption:** Liters used this month (e.g., 240L)
- **Route Efficiency:** Percentage (e.g., 87% efficient)
- **CO2 Emissions:** Kg CO2 emitted (e.g., 630 kg)
- **Electric Vehicles:** Count of EVs in fleet (e.g., 2/5 vehicles)
- **Total Vehicles:** Fleet size

**Vehicle Fleet Overview:**
- List of collection vehicles
- Fuel type (Diesel, Petrol, Electric, Hybrid)
- Fuel consumption per vehicle
- CO2 emissions per vehicle
- Maintenance schedule

**Efficiency Recommendations:**
- Route optimization suggestions
- Fuel-saving tips
- Vehicle maintenance reminders
- EV transition planning

**Progress Tracking:**
- Monthly fuel consumption trend
- CO2 reduction over time
- Route efficiency improvement
- Target vs. actual comparisons

---

## 3. PROCESSOR ROLE ⚙️

**User Example:** Samuel Mugisha (P001)  
**Facility:** Nyamasheke Washing Station  
**Capacity:** 500 kg cherry/day  
**Methods:** Fully Washed, Semi-Washed

### Dashboard Overview
Monitor processing operations and capacity

**Washing Station Information:**
- Facility name and location
- Processing capacity (kg/day)
- Processing methods supported
- Active certifications (Organic, Fair Trade, etc.)
- Current season throughput

**4 KPI Cards:**
- 📥 **Incoming Batches:** Awaiting receipt (e.g., 1 batch, 650 kg)
- ⚙️ **In Processing:** Currently active (e.g., 1 batch, 820 kg)
- ✅ **Completed:** Sent to QC (e.g., 1 batch, 510 kg)
- 📊 **Total Volume:** Kg processed this month (e.g., 3,210 kg)

**Processing Pipeline Visual:**
- 4-stage pipeline with batch IDs
- Stage indicators: Received → Processing → Quality Check → Dispatched
- Current batches displayed in each stage
- Real-time status updates

**Today's Activity Feed:**
- Recent processing events
- Batch arrivals
- Process completions
- QC requests

### Module 3.1: Incoming Batches
Receive and acknowledge new batches from aggregators

**Pending Receipt Alert:**
- Number of batches awaiting confirmation
- Total weight pending receipt
- Aggregator contact information

**Batch Arrival Table:**
- **Batch ID & Name:** e.g., "B005 - KAR-2024-005"
- **Origin:** District/collection zone (e.g., "Karongi")
- **Number of Farmers:** Contributing farmer count
- **Weight (kg):** Cherry coffee weight
- **Process Type:** 
  - Fully Washed (standard)
  - Semi-Washed (honey process)
  - Natural (rare)
- **Arrival Date:** Expected or actual arrival date
- **Status:** 
  - 🚚 In Transit (on the way)
  - 📥 Arrived (at facility, awaiting receipt confirmation)
  - ✅ Received (confirmed and logged)

**Actions:**
- **Confirm Receipt Button:** Acknowledge batch arrival
  - Verify weight against manifest
  - Inspect initial quality
  - Assign to storage location
  - Generate receipt document
- **Start Processing Button:** Move to processing queue
- **Report Issue:** Flag problems (weight discrepancy, quality issue)

### Module 3.2: Processing Queue (Kanban Board)
Track batches through processing stages

**4-Column Kanban Layout:**

**Column 1: Received (📥)**
- Cherry coffee in warehouse storage
- Awaiting processing slot
- Initial quality check completed
- Batch details card:
  - Batch name & ID
  - Origin district
  - Weight (kg)
  - Process type
  - Receipt date

**Column 2: In Processing (⚙️)**
- Currently in washing/drying
- Process stage indicators:
  - Pulping
  - Fermentation
  - Washing
  - Drying
  - Hulling (parchment → green)
- Days in process
- Expected completion date

**Column 3: Quality Check (🔬)**
- Processing complete, awaiting QC
- Green bean ready
- Moisture content checked
- Sample prepared for quality controller
- Awaiting test results

**Column 4: Dispatched (📤)**
- Sent to quality controller
- Test results received
- Grade assigned
- Ready for export selection
- Completion date

**Batch Card Details:**
- Batch name (clickable for full details)
- Weight and origin
- Process type
- Days in current stage
- **Move Forward Button:** Progress to next stage
- **View Details Link:** Full batch information

**Drag-and-Drop:** (Future feature)
- Drag batch cards between columns
- Auto-updates status
- Logs stage transitions

### Module 3.3: Batch Transformation Tracking
Monitor coffee transformation from cherry to green bean

**Process Stages per Batch:**

**Stage 1: Cherry Received ✅**
- Date received
- Initial weight (kg cherry)
- Cherry quality assessment
- Storage location assigned

**Stage 2: Washing/Drying Process ⚙️**
- Process type (Fully Washed / Semi-Washed)
- Start date
- **Process Steps:**
  - Pulping (remove skin and pulp)
  - Fermentation (12-24 hours)
  - Washing (remove mucilage)
  - Drying (10-14 days to 11-12% moisture)
- Progress percentage
- Current moisture level
- Temperature monitoring
- Expected completion date

**Stage 3: Green Bean Output ☕**
- Parchment hulling completed
- Green bean weight (kg)
- **Conversion Rate:** % yield (cherry → green)
  - Typical: 20-22% (5 kg cherry → 1 kg green)
  - Example: 650 kg cherry → 130 kg green (20% yield)
- Bean screen size
- Defect count (preliminary)

**Stage 4: QC Approved ✅**
- Quality test completed
- Cupping score received
- Grade assigned (A1/A2/B)
- Certificate issued
- Ready for export

**Visual Progress Indicators:**
- Colored progress bars per stage
- Completion checkmarks
- Timeline visualization

### Module 3.4: Inventory
Track processing inventory by coffee type

**Stock by Type Cards:**

**Cherry Coffee (🍒)**
- Current stock: e.g., 820 kg
- Storage location: Warehouse
- Batches: List of batch IDs
- Age: Days since receipt
- Status: Fresh / Aging / Urgent (process soon)

**Parchment (Washed) (📄)**
- Current stock: e.g., 350 kg
- Storage location: Drying beds
- Moisture content: e.g., 11.2%
- Days drying: e.g., 12 days
- Status: Drying / Ready to hull

**Green Coffee (☕)**
- Current stock: e.g., 1,240 kg
- Storage location: Warehouse, cool storage
- Batches: List of batch IDs with grades
- Quality certified: Yes/No
- Status: Awaiting export / In transit

**Roasted (Optional) (🔥)**
- If facility has roasting capability
- Current stock: kg
- Roast profiles
- Batch dates

**Inventory Table:**
- **Inventory ID:** Unique reference (e.g., INV-2024-015)
- **Coffee Type:** Cherry / Parchment / Green / Roasted
- **Batch Reference:** Linked batch ID
- **Origin:** District/collection zone
- **Weight (kg):** Current quantity
- **Storage Location:** 
  - Warehouse (cherry, green)
  - Drying beds (parchment)
  - Cool storage (green)
- **Status:** 
  - In Process
  - Ready to Move
  - Quality Certified
  - Awaiting Export

**Actions:**
- View batch details
- Update weight (after processing loss)
- Move to different storage location
- Mark for quality testing

**Stock Alerts:**
- Low stock warnings
- Aging inventory alerts
- Moisture content out of range
- Urgent processing required

### Module 3.5: Equipment Maintenance ⭐ NEW
Track and schedule maintenance for processing equipment

**Equipment Inventory:**
- **Pulpers:** Cherry skin removal machines
- **Fermentation Tanks:** For wet fermentation
- **Washing Channels:** Mucilage removal
- **Drying Beds:** Parchment drying tables
- **Hullers:** Parchment removal (parchment → green)
- **Sorters:** Density and color sorting machines
- **Moisture Meters:** Quality control equipment
- **Generators:** Backup power supply

**Equipment Cards Display:**
- **Equipment Name & ID:** e.g., "Pulper #1 (EQ-001)"
- **Type:** Pulper, Huller, Dryer, etc.
- **Status:**
  - 🟢 Operational (working normally)
  - 🟡 Maintenance Due (service needed soon)
  - 🔧 Under Maintenance (currently being serviced)
  - 🔴 Needs Repair (not operational)
- **Last Maintenance:** Date of last service
- **Next Due:** Upcoming maintenance date
- **Service History:** Count of past services
- **Usage Hours:** Operating hours since last maintenance

**Maintenance Schedule Table:**
- **Equipment:** Name and type
- **Maintenance Type:** 
  - Routine (weekly/monthly checks)
  - Preventive (scheduled service)
  - Corrective (repairs)
  - Emergency (breakdown)
- **Due Date:** When service is needed
- **Status:** Scheduled / In Progress / Completed / Overdue
- **Cost Estimate:** RWF for service
- **Technician:** Assigned service person
- **Priority:** High / Medium / Low

**Maintenance History:**
- Date performed
- Maintenance type
- Issues found and resolved
- Parts replaced
- Cost (RWF)
- Downtime (hours)
- Technician notes

**Actions:**
- **Schedule Maintenance:** Plan upcoming service
- **Log Maintenance:** Record completed service
- **Report Issue:** Flag equipment problem
- **View History:** See all past maintenance

**Alerts & Notifications:**
- ⚠️ Maintenance due soon (7 days before)
- 🔴 Maintenance overdue
- 🔧 Equipment breakdown reported
- ✅ Maintenance completed

**Cost Tracking:**
- Monthly maintenance costs
- Cost per equipment type
- Preventive vs. corrective cost comparison
- Budget vs. actual spending

### Module 3.6: Sustainability ⭐ NEW
Track environmental impact of processing operations

**Processor Sustainability Metrics:**

**Water Management:**
- **Water Usage per kg:** Liters used per kg processed (e.g., 45 L/kg)
- **Water Recycled:** Percentage (e.g., 42%)
- **Target:** 50% recycling rate
- **Monthly Water Consumption:** Total liters this month

**Energy Management:**
- **Energy Consumption:** kWh this month (e.g., 1,250 kWh)
- **Solar Power:** Percentage from solar (e.g., 35%)
- **Biomass Fuel:** Percentage from coffee waste (e.g., 60%)
- **Grid Power:** Percentage from grid (e.g., 5%)

**Waste Management:**
- **Waste Recycling Rate:** Percentage (e.g., 78%)
- **Composted Waste:** Kg this month
- **Coffee Pulp Recycling:** Used as fertilizer/biomass fuel
- **Wastewater Treatment:** Treatment method and quality

**Sustainability Targets:**
- Water usage reduction goal (% decrease target)
- Renewable energy increase goal (% target)
- Waste recycling improvement goal
- Progress bars showing current vs. target

**Environmental Impact Report:**
- Carbon footprint calculation
- Water conservation achievements
- Renewable energy usage trend
- Waste diversion from landfill

**Best Practices:**
- Water conservation tips
- Solar panel investment guidance
- Biomass fuel utilization
- Composting techniques

### Module 3.7: Notifications
Processing alerts and updates

**Notification Types:**
- 📥 **Batch Arrival:** "New batch RUL-2024-004 (820kg) has arrived from Aggregator A001."
- ✅ **Process Complete:** "Batch HUY-2024-003 has completed fully washed processing. Ready for QC."
- ⚠️ **Capacity Alert:** "Processing facility is at 85% capacity. Plan accordingly."
- 🔧 **Maintenance Due:** "Pulper #1 maintenance due in 3 days."

---

## 4. QUALITY CONTROLLER ROLE 🔬

**User Example:** Diane Mukandayisenga (Q001)  
**Organization:** NAEB Rwanda (National Agricultural Export Board)  
**Certification:** SCA Q-Grader License, NAEB Certified Cupper

### Dashboard Overview
Quality operations monitoring and testing queue

**Q-Grader Certification Display:**
- SCA Licensed Cupper badge
- License number and expiry
- Specialty Coffee Association membership
- Years of experience

**4 KPI Cards:**
- 🔬 **Tests This Month:** Count + pending (e.g., 4 completed, 1 pending)
- ✅ **Batches Approved:** Count + pass rate (e.g., 3 approved, 75% pass rate)
- ⭐ **Avg Cupping Score:** SCA points (e.g., 85.1 points)
- 📜 **Certificates Issued:** Count this month (e.g., 3 certificates)

**Cupping Scores Chart:**
- Bar chart of recent batches
- Y-axis: SCA score (0-100)
- Color-coded by result (green = approved, red = rejected)
- Hover for detailed breakdown

**Pending Tests Panel:**
- List of batches awaiting quality testing
- Batch IDs and processor names
- Days waiting
- Priority indicators
- **Start Test Button** for each batch

### Module 4.1: Quality Testing Form
Conduct comprehensive quality analysis using SCA protocol

**Batch Selection:**
- Dropdown list of batches ready for testing
- Batch details display (origin, weight, processor)
- Sample preparation checklist
- 350g sample size requirement

**Section 1: Physical Analysis**

**Moisture Content (%)**
- Target range: 10.5% - 12.5%
- Input field with decimal precision
- Status indicator:
  - 🟢 Within range (10.5-12.5%)
  - 🟡 Borderline (12.5-13.0%)
  - 🔴 Out of spec (>13.0% or <10.5%)
- Standard: NAEB requirement

**Water Activity (Aw)**
- Target: < 0.60
- Input field
- Critical for storage stability

**Bean Density (g/L)**
- Target range: 680-720 g/L
- Higher density = better quality
- Input field
- Method: Volumetric measurement

**Screen Size (mesh)**
- Target: 14-18 mesh
- Larger beans = higher grade
- Common sizes: 15, 16, 17, 18
- Input dropdown

**Defect Count (per 300g sample)**
- Primary defects: 0 for A1 grade
- Secondary defects: <5 for A1
- Input field
- Defect classification link

**Section 2: SCA Cupping Protocol**

**7 Scoring Categories (6.00 - 10.00 scale, 0.25 increments):**

1. **Fragrance/Aroma (dry/wet)**
   - Dry fragrance: Ground coffee smell
   - Wet aroma: After hot water added
   - Intensity and quality
   - Slider: 6.00 ← → 10.00

2. **Flavor**
   - Combined taste and aroma in mouth
   - Complexity and balance
   - Flavor notes (fruity, floral, nutty, etc.)
   - Slider: 6.00 ← → 10.00

3. **Aftertaste**
   - Length and quality of finish
   - Pleasant lingering flavors
   - Clean vs. lingering defects
   - Slider: 6.00 ← → 10.00

4. **Acidity**
   - Brightness and liveliness
   - Quality and intensity
   - Types: Citric, Malic, Tartaric
   - Slider: 6.00 ← → 10.00

5. **Body**
   - Mouthfeel and texture
   - Light, Medium, Full
   - Viscosity and weight
   - Slider: 6.00 ← → 10.00

6. **Balance**
   - Harmony of flavor, acidity, body
   - No single attribute dominates
   - Overall integration
   - Slider: 6.00 ← → 10.00

7. **Overall**
   - Cupper's holistic impression
   - Personal evaluation
   - Would you buy this coffee?
   - Slider: 6.00 ← → 10.00

**Score Calculation:**
- **Base Score:** 36 points (fixed)
- **Category Total:** Sum of 7 categories (42-70 possible)
- **Final Score:** Base + Category Total (78-106 theoretical, 100 max practical)
- **Auto-calculated and displayed in real-time**

**Flavor Notes (Optional):**
- Text area for descriptors
- Examples: "Red Apple, Caramel, Black Tea", "Berry, Chocolate, Vanilla"
- Aroma descriptors: "Floral, Citrus", "Sweet, Nutty"

**Cupping Notes:**
- Acidity type: Bright, Crisp, Soft, Sharp
- Body description: Silky, Creamy, Light, Full
- Aftertaste: Clean, Long, Sweet, Short
- Balance: Excellent, Very Good, Good, Fair

**Grade Assignment:**
- Based on final score:
  - **A1:** 85+ points (Specialty Grade)
  - **A2:** 80-84 points (Premium Grade)
  - **B:** <80 points (Commercial Grade)
- Auto-assigned based on score
- Manual override available with justification

**Test Result:**
- Approved ✅ (meets standards)
- Rejected ❌ (fails standards)
- Conditional (requires retest)

**Save Test Results Button:**
- Saves all physical and cupping data
- Generates test record with unique ID
- Timestamps submission
- Notifies processor and exporter
- Triggers certificate generation (if approved)

### Module 4.2: Cupping Scores
View historical quality test results and sensory profiles

**Score Cards per Batch:**

**Card Header:**
- Batch name (e.g., "NYM-2024-001")
- Cupping score in large font (e.g., **88.2**)
- Grade badge (A1/A2/B with color coding)
- Result status (Approved ✅ / Rejected ❌)

**Card Content:**
- **Tester:** Quality controller name (e.g., "Diane Mukandayisenga")
- **Test Date:** Full date and time
- **Origin:** District/region
- **Process Type:** Fully Washed / Semi-Washed

**Radar Chart:**
- 6-axis sensory profile visualization
- Axes: Fragrance, Flavor, Aftertaste, Acidity, Body, Balance
- Visual comparison of category scores
- Shaded area shows coffee's profile

**Physical Test Summary:**
- Moisture: % value with status indicator
- Defects: Count with severity
- Density: g/L value
- Screen Size: Mesh number

**Flavor & Aroma Notes:**
- Flavor descriptors: "Red Apple, Caramel, Black Tea"
- Aroma profile: "Floral, Citrus"
- Acidity: "Bright, Vibrant"
- Body: "Silky"
- Aftertaste: "Clean, Long"
- Balance: "Excellent"
- Overall: "Specialty Grade"

**Certificate Reference:**
- Certificate ID (if issued)
- Download certificate button
- Blockchain hash (if verified)

**Actions:**
- View full test details
- Download PDF report
- Compare with other batches
- Retest (if needed)

**Filter & Search:**
- Filter by date range
- Filter by grade (A1/A2/B)
- Filter by result (approved/rejected)
- Search by batch ID
- Sort by score (high to low)

### Module 4.3: Defect Tracking
Monitor and log coffee defects with impact analysis

**Defect Summary Cards:**
- **Primary Defects:** Count (high impact on quality)
  - Target: 0 for A1 grade
  - Example: 4 total across batches
  - Color: Red background
- **Secondary Defects:** Count (medium/low impact)
  - Target: <5 for A1 grade
  - Example: 15 total across batches
  - Color: Amber background
- **Clean Batches:** Count (0 defects)
  - Example: 2 batches
  - Color: Green background

**Defect Types Table:**

**Primary Defects (Category 1):**
- **Full Black:** Beans completely black (insect damage, late harvest)
  - Count: e.g., 2 per 300g
  - Batch: GDO-2024-003
  - Impact: High
  - Equivalency: 1 full black = 1 defect
  
- **Full Sour:** Fermentation defect, vinegar smell
  - Count: e.g., 1 per 300g
  - Batch: SID-2024-002
  - Impact: High
  - Cause: Over-fermentation during processing

- **Dried Cherry/Pod:** Whole cherry dried with bean inside
  - Count: e.g., 0 (rare in washed coffee)
  - Impact: High
  - Cause: Processing failure

- **Fungus Damaged:** Visible mold or fungal infection
  - Count: e.g., 1 per 300g
  - Batch: BAL-2024-006
  - Impact: High
  - Health concern

**Secondary Defects (Category 2):**
- **Partial Black:** Portions of bean black
  - Count: e.g., 3 per 300g
  - Equivalency: 3 partial black = 1 defect

- **Partial Sour:** Light fermentation
  - Count: e.g., 2 per 300g
  - Impact: Medium

- **Parchment:** Parchment not fully removed
  - Count: e.g., 5 per 300g
  - Equivalency: 5 parchment = 1 defect

- **Floater:** Low-density beans
  - Count: e.g., 3 per 300g
  - Cause: Underripe, insect damage, drought

- **Immature/Unripe:** Green, underdeveloped beans
  - Count: e.g., 4 per 300g
  - Impact: Medium
  - Cause: Early harvest

- **Withered:** Shriveled beans
  - Count: e.g., 2 per 300g
  - Cause: Drought stress

- **Shell:** Malformed, hollow beans
  - Count: e.g., 1 per 300g
  - Cause: Genetic, environmental

- **Broken/Cut/Chipped:** Physical damage
  - Count: e.g., 2 per 300g
  - Equivalency: 5 broken = 1 defect

**Defect Analysis:**
- Total defect equivalents calculation
- Grade determination based on defects
- Trend analysis (increasing/decreasing defects)
- Root cause identification

**Actions:**
- **Log Correction Action:** Document remediation steps
- **Provide Feedback:** Send to processor
- **Schedule Retest:** If defects borderline
- **Reject Batch:** If defects exceed limits

**Correction Action Tracking:**
- Issue identified
- Action taken (re-sorting, re-processing)
- Responsible party
- Follow-up date
- Resolution status

### Module 4.4: Certificates
Generate and manage official NAEB quality certificates

**Certificate Generation:**
- **Generate Certificate Button:** Opens certificate form
- Auto-populates data from quality test
- Assigns unique NAEB certificate ID
- Includes cupping score and grade
- Tester signature (digital)
- Official NAEB seal

**Certificate Cards Display:**

**Certificate Header:**
- **Certificate ID:** Unique identifier (e.g., "NAEB-QC-2024-001")
- **Batch Name:** e.g., "NYM-2024-001"
- **Cupping Score:** Large display (e.g., 88.2)
- **Result Badge:** 
  - ✅ APPROVED (green)
  - ❌ REJECTED (red)

**Certificate Details:**
- **Issue Date:** Full date and time
- **Tester Name:** Diane Mukandayisenga
- **License No:** Q-Grader license number
- **Batch Origin:** District, province
- **Weight:** Kg certified
- **Process Type:** Fully Washed / Semi-Washed
- **Grade:** A1 / A2 / B
- **Moisture Content:** % value
- **Quality Notes:** Brief summary

**Actions:**
- **Download PDF:** Generate printable certificate
- **Email:** Send to processor/exporter
- **Verify:** Check certificate authenticity
- **Revoke:** Cancel certificate (with justification)

**Pending Certificates:**
- List of batches that passed QC but don't have certificates yet
- **Generate Now Button** for each
- Batch details and test scores
- Days since test completion

**Certificate Archive:**
- All issued certificates
- Search by certificate ID or batch name
- Filter by date range
- Filter by result (approved/rejected)
- Export list as CSV

**Certificate Template:**
```
═══════════════════════════════════════════
      NAEB RWANDA QUALITY CERTIFICATE
═══════════════════════════════════════════

Certificate No: NAEB-QC-2024-001
Date Issued: February 22, 2024

BATCH INFORMATION:
Batch ID: NYM-2024-001 (Nyamasheke)
Weight: 1,200 kg Green Bean
Process Type: Fully Washed
Origin: Nyamasheke, Western Province

QUALITY ASSESSMENT:
Cupping Score: 88.2 / 100 (SCA Protocol)
Grade: A1 - Specialty Grade
Moisture Content: 10.8%
Defect Count: 1 (Category 2)
Screen Size: 17 mesh

SENSORY PROFILE:
Flavor: Red Apple, Caramel, Black Tea
Aroma: Floral, Citrus
Acidity: Bright, Vibrant
Body: Silky
Aftertaste: Clean, Long

RESULT: APPROVED ✅
This coffee meets NAEB specialty grade standards.

Certified By: Diane Mukandayisenga
Q-Grader License: RWA-Q-2023-012
National Agricultural Export Board (NAEB)
═══════════════════════════════════════════
```

### Module 4.5: QR Code Generation ⭐ NEW
Generate QR codes for batch traceability and consumer transparency

**QR Code Generation Interface:**
- **Batch Selection:** Dropdown of certified batches
- **Certificate Link:** Auto-linked to quality certificate
- **Generate QR Button:** Creates unique QR code

**QR Code Display:**
- Visual QR code image (200x200px)
- **QR Content:** Public URL for traceability
  - Example: `https://rwandacoffee.rw/trace/B001`
- **Batch Information:**
  - Batch ID and name
  - Certificate ID
  - Generation date
  - Public URL
- **Download Options:**
  - Download as PNG
  - Download as SVG (vector)
  - Download as PDF (with batch info)

**QR Code Records Table:**
- **QR ID:** Unique identifier (e.g., QR001)
- **Batch ID:** Linked batch
- **Certificate ID:** NAEB certificate reference
- **Generated At:** Date created
- **Type:** quality_certificate / batch_traceability
- **Public URL:** Consumer-facing link
- **Scan Count:** Number of times scanned (if tracked)

**Consumer-Facing Page:**
When QR code is scanned, displays:
- Batch origin (farm locations)
- Quality score and grade
- Flavor profile
- Processing method
- Certification details
- Supply chain journey
- Blockchain verification hash

**Use Cases:**
- Print on coffee bags for consumer scanning
- Attach to export documentation
- Display at washing stations
- Use in marketing materials

### Module 4.6: Blockchain Verification ⭐ NEW
Immutable record of quality certifications on blockchain

**Blockchain Records Table:**
- **Block ID:** Unique blockchain identifier (e.g., BLK001)
- **Batch ID:** Coffee batch reference
- **Transaction Hash:** Blockchain transaction (e.g., 0x7f3c8a1b...)
- **Block Number:** Ethereum block number (e.g., 1523847)
- **Timestamp:** Date and time of blockchain record
- **Event Type:** quality_certified
- **Data Stored:**
  - Cupping score
  - Tester ID
  - Certificate ID
  - Grade
- **Verified:** ✅ Status (confirmed on blockchain)

**Verification Process:**
- Quality test completed → Certificate issued → Blockchain record created
- Transaction hash generated
- Block mined and confirmed
- Verification badge displayed

**Verification Details:**
- **Network:** Ethereum Mainnet (or Testnet for demo)
- **Smart Contract:** Address
- **Gas Used:** Transaction cost
- **Confirmations:** Number of confirmations
- **Explorer Link:** View on Etherscan

**Public Verification:**
- Anyone can verify certificate authenticity
- Enter certificate ID or batch ID
- System returns blockchain record
- Displays transaction hash for independent verification

**Benefits:**
- Immutable quality records
- Prevents certificate fraud
- Consumer trust and transparency
- Supply chain integrity

### Module 4.7: Notifications
Quality control alerts and test reminders

**Notification Types:**
- 🔬 **Batch Pending Review:** "Batch HUY-2024-003 is waiting for NAEB quality assessment."
- ✅ **Certificate Issued:** "Quality certificate NAEB-QC-2024-003 has been issued for MUH-2024-006."
- 📅 **Cupping Session:** "Scheduled cupping session for 3 batches tomorrow at 9:00 AM CAT."
- ⚠️ **Defects Detected:** "High defect count in batch BAL-2024-006. Review required."

---

## 5. LOGISTICS ROLE 🚢

**User Example:** Joseph Nkurikiye (L001)  
**Organization:** Rwanda Coffee Logistics Ltd  
**Routes:** Kigali → Mombasa → EU/USA/Japan  
**Partners:** MSC, CMA CGM, Hapag-Lloyd

### Dashboard Overview
Shipment operations monitoring and coordination

**Port Operations Info:**
- Primary port: Mombasa Port, Kenya
- Secondary: Dar es Salaam Port, Tanzania
- Export routes: EU (Hamburg, Rotterdam), USA (New York), Japan (Yokohama)
- Shipping partners: MSC, CMA CGM, Hapag-Lloyd, Maersk

**4 KPI Cards:**
- 🚢 **Active Shipments:** In transit count (e.g., 2 shipments)
- ⏱️ **In Transit:** Current + ETA (e.g., "SHP002 - ETA Apr 5")
- ✅ **Delivered:** This month count (e.g., 1 delivered)
- 📊 **Total Volume:** Kg across all shipments (e.g., 2,610 kg)

**Active Shipment Cards:**
Each active shipment displays:
- **Shipment ID:** e.g., SHP002
- **Status Badge:** 
  - 🚚 Dispatched (preparing to ship)
  - ⚓ At Port (awaiting vessel)
  - 🚢 In Transit (at sea)
  - ✅ Delivered (arrived at destination)
- **Batch Name & Vessel:** e.g., "GAK-2024-002 via CMA CGM TROCADERO"
- **Weight & Buyer:** e.g., "980 kg → Dutch Coffee Import BV"
- **Route Visualization:**
  - Origin: Mombasa Port, Kenya
  - Destination: Rotterdam, Netherlands
  - Progress bar showing journey completion
- **Container Details:**
  - Container No: e.g., CMAU2345678
  - Carrier: CMA CGM
  - ETD (Estimated Time of Departure): Mar 12, 2024
  - ETA (Estimated Time of Arrival): Apr 5, 2024

### Module 5.1: Shipment Tracking
Detailed shipment timeline and event logging

**Shipment Timeline per Shipment:**

**Event 1: ✓ Cargo Loaded at Origin**
- Status: Completed ✅
- Date: Mar 11, 2024, 14:30 CAT
- Location: Mombasa Port, Kenya
- Container: CMAU2345678 sealed
- Weight verified: 980 kg
- Inspection completed

**Event 2: ✓ Vessel Departed**
- Status: Completed ✅
- Date: Mar 12, 2024, 08:00 EAT
- Vessel: CMA CGM TROCADERO
- Voyage No: MV-2024-018
- Route: Mombasa → Suez Canal → Rotterdam
- Expected transit: 24 days

**Event 3: ⏳ In Transit via Carrier**
- Status: Current 🚢
- Current Location: Red Sea (GPS: 10.4515°N, 51.1657°E)
- Last Update: Mar 26, 2024, 09:15 UTC
- Distance to Destination: ~6,500 km
- Days in Transit: 14 days
- Days Remaining: ~10 days

**Event 4: ⏳ Estimated Arrival at Destination**
- Status: Pending ⏳
- ETA: Apr 5, 2024, 18:00 CEST
- Port: Rotterdam, Netherlands
- Berth: To be assigned
- Customs Clearance: Required
- Delivery: After customs clearance

**Refresh Tracking Button:**
- Updates with latest vessel position
- Syncs with carrier systems
- Refreshes ETA based on current speed
- Shows any delays or issues

**Delay Notifications:**
If vessel is delayed:
- ⚠️ Alert banner: "CMA CGM TROCADERO (SHP002) is delayed by 2 days due to port congestion at Mombasa."
- Updated ETA displayed
- Buyer notification sent automatically

### Module 5.2: Containers
Track shipping containers and their contents

**Container Summary Cards:**
- 📦 **Total Containers:** Season count (e.g., 3 containers)
- 🚢 **In Transit:** Currently at sea (e.g., 1 container)
- ✅ **Delivered:** This month (e.g., 1 container)

**Container Cards Display:**

**Container Card Structure:**
- **Container Number:** MSCU1234567 (large, bold)
- **Container Type:** 20ft Standard / 40ft High Cube
- **Seal Number:** For security verification (e.g., SEAL-789456)
- **Cargo Details:**
  - Batch Reference: e.g., B001 (NYM-2024-001)
  - Weight: e.g., 1,200 kg Green Coffee
  - Bags: e.g., 20 bags × 60 kg
- **Vessel Information:**
  - Vessel Name: MSC AGADIR
  - Voyage No: MV-2024-012
  - Carrier: Mediterranean Shipping Company (MSC)
- **Dates:**
  - Departure: Mar 1, 2024 (Mombasa)
  - Arrival: Mar 28, 2024 (Hamburg)
- **Status:**
  - ✅ DELIVERED (green badge)
  - 🚢 IN TRANSIT (blue badge)
  - 🚚 DISPATCHED (amber badge)
- **Buyer:** Nordic Roasters GmbH
- **Destination:** Hamburg, Germany

**Container Status Timeline:**
- Container loaded → Sealed → Departed → In transit → Arrived → Customs cleared → Delivered

**Actions:**
- View full container details
- Track current location (GPS)
- View temperature/humidity log (if monitored)
- Download shipping documents
- Confirm delivery

### Module 5.3: Route Tracking
Visualize shipping routes and monitor progress

**Interactive Route Map:** (Placeholder for production)
- Visual map display with route lines
- Origin and destination markers
- Current vessel position (GPS pin)
- Major waypoints (Suez Canal, Cape of Good Hope, etc.)
- Real-time position updates

**Route List Display:**

**Route Card per Shipment:**
- **Shipment ID:** SHP002
- **Route:** Mombasa → Suez Canal → Mediterranean → Rotterdam
- **Distance:** ~8,500 km
- **Transit Time:** 24 days (estimated)
- **Progress:** 58% complete (visual progress bar)
- **Current Location:** Red Sea (with GPS coordinates)
- **Next Waypoint:** Suez Canal (ETA Mar 28)
- **Vessel Speed:** 18 knots (average)
- **Weather:** Clear / Rough Seas / Storm (if tracked)

**Major Routes:**
- **To Europe:** 
  - Mombasa → Suez Canal → Mediterranean → Hamburg/Rotterdam
  - Duration: 22-26 days
  
- **To USA:** 
  - Mombasa → Cape of Good Hope → Atlantic → New York
  - Duration: 35-40 days
  
- **To Japan:** 
  - Mombasa → Indian Ocean → Malacca Strait → Pacific → Yokohama
  - Duration: 28-32 days

**Route Efficiency Metrics:**
- Average transit time per route
- On-time delivery rate
- Carrier performance comparison
- Cost per route

### Module 5.4: GPS Tracking ⭐ NEW
Real-time container location and environmental monitoring

**GPS Tracking Dashboard:**

**Container Location Map:**
- Interactive map showing all active containers
- Real-time GPS position updates
- Color-coded pins:
  - 🔵 In Transit (at sea)
  - 🟢 At Port (loading/unloading)
  - ⚪ Delivered (final destination)

**Container GPS Cards:**

**Card for Each Active Container:**
- **Container ID:** CMAU2345678
- **Shipment ID:** SHP002
- **Current Location:**
  - GPS Coordinates: Lat 10.4515°N, Long 51.1657°E
  - Location Description: "Red Sea"
  - Last Updated: Mar 26, 2024, 09:15 UTC
- **Status:** 🚢 In Transit
- **Environmental Monitoring:**
  - 🌡️ **Temperature:** 22.3°C
    - Status: ✅ Within range (18-26°C)
  - 💧 **Humidity:** 68%
    - Status: ✅ Within range (55-75%)
- **Movement History:**
  - Last 24 hours: 432 km traveled
  - Average speed: 18 knots
  - Route: Following planned course

**Environmental Alerts:**
If temperature/humidity out of range:
- ⚠️ Alert: "Container CMAU2345678 temperature at 28.5°C, exceeds safe range"
- Notification sent to logistics manager
- Action required: Contact vessel operator

**GPS History:**
- Track playback feature
- View entire journey from origin
- Timestamps for each position update
- Speed and direction at each point

**Farm GPS Tracking:**
- GPS coordinates for each farmer's farm
- Location verification for origin claims
- Distance calculations for route planning
- Map view of all farms in collection zone

**Use Cases:**
- Real-time shipment monitoring
- Quality assurance (temperature-sensitive)
- Route verification for traceability
- Delay detection and notification
- Insurance and security

### Module 5.5: Delivery Confirmation
Confirm and document successful deliveries

**Shipment Status per Order:**

**Delivered Shipments Display:**

**✅ Delivery Confirmed Banner:**
- **Shipment ID:** SHP001
- **Batch:** NYM-2024-001 (Nyamasheke)
- **Buyer:** Nordic Roasters GmbH
- **Destination:** Hamburg, Germany
- **Weight:** 1,200 kg
- **Delivery Date:** Mar 28, 2024
- **POD (Proof of Delivery):** ✅ Received and verified
- **Signature:** Digital signature on file
- **Documents:**
  - ✓ Bill of Lading signed
  - ✓ Commercial Invoice delivered
  - ✓ Quality Certificate provided
  - ✓ Certificate of Origin included
- **Status:** COMPLETED ✅
- **Final Notes:** "Delivery completed on time. No issues reported. Buyer satisfied."

**In-Transit Shipments Display:**

**⏳ In Transit Panel:**
- **Shipment ID:** SHP002
- **Batch:** GAK-2024-002
- **Buyer:** Dutch Coffee Import BV
- **Destination:** Rotterdam, Netherlands
- **Weight:** 980 kg
- **ETA:** Apr 5, 2024, 18:00 CEST
- **Current Status:** 🚢 At Sea (Red Sea)
- **Progress:** 58% complete
- **Days to Delivery:** ~10 days
- **Pre-Arrival Tasks:**
  - ⏳ Customs documentation submitted (pending)
  - ⏳ Delivery appointment scheduled (pending)
  - ✓ Buyer notified of ETA

**Confirm Delivery Button:**
- Opens delivery confirmation form
- Fields:
  - Actual delivery date & time
  - Receiving party name & signature
  - Condition of cargo (intact/damaged)
  - Any issues or discrepancies
  - Upload POD document
  - Upload photos (if needed)
- **Submit Button:** Marks shipment as delivered
- Sends confirmation to all parties
- Closes shipment record

**Delivery Issues:**
If problems:
- **Report Issue Button:**
  - Damaged container
  - Weight discrepancy
  - Missing documents
  - Quality concerns
  - Buyer disputes
- Issue tracking system
- Resolution workflow
- Claim filing process

### Module 5.6: Notifications
Logistics alerts and shipment updates

**Notification Types:**
- 🚢 **Shipment Dispatched:** "SHP003 (MUH-2024-006) has been dispatched to New York via Mombasa."
- ⚠️ **Vessel Delay:** "CMA CGM TROCADERO (SHP002) is delayed by 2 days due to port congestion at Mombasa."
- ✅ **Customs Cleared:** "SHP001 has cleared Hamburg customs and is ready for delivery."
- 🌡️ **Temperature Alert:** "Container CMAU2345678 temperature at 28.5°C, exceeds safe range."

---

## 6. EXPORTER ROLE 🌍

**User Example:** Christine Mukamurenzi (E001)  
**Organization:** Rwanda Coffee Exports Ltd  
**License:** NAEB Export License RW-EXP-2024-089  
**Markets:** EU, USA, Japan, South Korea

### Dashboard Overview
Export operations and order management

**Export License Info:**
- License Number: RW-EXP-2024-089
- Issuing Authority: NAEB Rwanda
- Issue Date: Jan 15, 2023
- Expiry Date: Jan 15, 2025 (renewal required)
- Markets Authorized: EU, USA, Japan, South Korea
- Incoterms: FOB (Free On Board), CIF (Cost, Insurance, Freight)

**4 KPI Cards:**
- 📋 **Export Orders:** Season count (e.g., 4 orders)
- 💰 **Total Value:** USD total (e.g., $34,370)
- 🚢 **Active Shipments:** In transit count (e.g., 1 shipment)
- ⏳ **Pending Orders:** Awaiting batch (e.g., 1 order)

**Recent Export Orders Panel:**
- **Buyer Name & Country:** e.g., "Nordic Roasters GmbH (Germany)"
- **Weight & Grade:** e.g., "1,200 kg A1"
- **Total Value:** USD (e.g., "$15,120")
- **Status:**
  - ⏳ Pending-Batch (no batch assigned)
  - 📋 Preparing (batch selected, docs in progress)
  - 🚢 Shipping (in transit)
  - ✅ Completed (delivered)

**Recent Alerts Feed:**
- New order notifications
- Batch availability alerts
- Document completion reminders
- Shipment departure confirmations

### Module 6.1: Export Orders
Manage export contracts and buyer relationships

**New Order Button:**
- Opens order creation form
- Fields:
  - Buyer company name
  - Buyer country
  - Coffee grade (A1/A2/B)
  - Weight (kg)
  - Price per kg (USD)
  - Total value (auto-calculated)
  - Incoterm (FOB/CIF)
  - Delivery deadline
  - Special requirements

**Export Orders Table:**

**Order Columns:**
- **Order ID:** Unique identifier (e.g., EO001, EO002)
- **Buyer Company:** e.g., "Nordic Roasters GmbH"
- **Country:** Destination flag + name (e.g., 🇩🇪 Germany)
- **Coffee Grade:** A1 / A2 / B (color-coded badge)
- **Weight (kg):** Order quantity (e.g., 1,200 kg)
- **Price per kg:** USD rate (e.g., $12.60/kg)
- **Total Value:** USD total (e.g., $15,120)
- **Assigned Batch:** Batch ID or "Not Assigned"
- **Status:**
  - ⏳ **Pending-Batch:** No batch assigned yet
  - 📋 **Preparing:** Batch selected, docs being prepared
  - 🚢 **Shipping:** Cargo dispatched, in transit
  - ✅ **Completed:** Delivered to buyer
- **Order Date:** When order was placed
- **Deadline:** Expected delivery date

**Actions:**
- **View Details:** Full order information
- **Assign Batch:** Select quality-approved batch
- **Prepare Docs:** Generate export documentation
- **Track Shipment:** Monitor shipping progress
- **Mark Complete:** Confirm delivery

**Order Details View:**
- Full buyer contact information
- Contract terms and conditions
- Payment terms (L/C, T/T, etc.)
- Quality requirements
- Packaging specifications
- Delivery instructions
- Special certifications required

### Module 6.2: Batch Selection
Assign QC-approved batches to export orders

**Advisory Alert:**
⚠️ "Only quality-certified batches can be selected for export orders. All batches must have NAEB Quality Certificate and grade A1, A2, or B."

**Batch Selection Grid:**

**Available Batches Display:**
Each batch shown as a card with checkbox

**Batch Card Contents:**
- **Checkbox:** For selection (multi-select enabled)
- **Batch Name:** e.g., "YRG-2024-001 (Nyaruguru)"
- **Origin:** District, province
- **Weight (kg):** Available quantity (e.g., 1,200 kg)
- **Cupping Score:** SCA points (e.g., 88.2)
- **Grade:** A1 / A2 / B (large, color-coded)
- **Status Indicator:**
  - ✅ Available (certified, no allocation)
  - 🔒 Reserved (allocated to order)
  - ⏳ Processing (in QC)
  - ❌ Not Certified (failed QC)
- **Process Type:** Fully Washed / Semi-Washed
- **Certificate ID:** NAEB certificate reference
- **Flavor Profile:** Brief description (e.g., "Fruity, Floral, Sweet")

**Filter Options:**
- Grade filter (A1/A2/B)
- Availability filter (Available/Reserved/All)
- Origin filter (District dropdown)
- Weight range (Min-Max kg)
- Cupping score range (80-100)

**Selection Panel:**
- **Order Details:** Display order being fulfilled
- **Selected Batches:** List with weights
- **Total Selected Weight:** Sum of selected batches
- **Order Weight:** Target weight needed
- **Match Status:**
  - ✅ Exact Match (selected = order)
  - ⚠️ Under (selected < order) - select more
  - ⚠️ Over (selected > order) - adjust selection

**Assign Batches Button:**
- Links selected batches to export order
- Marks batches as "Reserved"
- Updates order status to "Preparing"
- Triggers documentation preparation
- Sends notification to logistics

**Multi-Batch Orders:**
- Orders can combine multiple batches
- System tracks individual batch contributions
- Maintains full traceability per batch
- Certificate compilation for combined shipments

### Module 6.3: Documentation
Manage export paperwork and compliance documents

**Create Document Button:**
- Opens document generation wizard
- Select document type
- Auto-fills from order data
- Manual field editing allowed
- Save as draft or issue immediately

**Document Types Table:**

**1. Commercial Invoice** 💰
- Purpose: Price and payment details
- Required For: All exports
- Contents:
  - Seller: Rwanda Coffee Exports Ltd
  - Buyer: Company name and address
  - Order reference number
  - Coffee details (weight, grade, price)
  - Total value (USD)
  - Payment terms
  - Bank details
- Status: Issued / Draft / Pending
- Actions: Download PDF / Email / Edit

**2. Packing List** 📦
- Purpose: Container contents inventory
- Required For: All shipments
- Contents:
  - Container number
  - Number of bags
  - Weight per bag (typically 60kg)
  - Total gross weight
  - Total net weight
  - Batch IDs included
  - Bag markings
- Status: Issued / Draft / Pending

**3. Certificate of Origin** 🇷🇼
- Purpose: Prove Rwanda origin
- Required For: Import customs clearance
- Contents:
  - Origin: Rwanda (specific districts)
  - Coffee variety: Red Bourbon
  - Harvest season
  - NAEB certification
  - Chamber of Commerce stamp
- Issued By: Rwanda Chamber of Commerce
- Status: Issued / Requested / Pending

**4. Phytosanitary Certificate** 🌱
- Purpose: Plant health certification
- Required For: International plant health regulations
- Contents:
  - Product: Green coffee beans
  - Treatment: None required (processed product)
  - Inspection: No pests or diseases found
  - Inspector signature
- Issued By: Rwanda Agriculture Board (RAB)
- Status: Issued / Requested / Pending

**5. Quality Certificate** ⭐
- Purpose: Quality assurance from QC department
- Required For: Buyer confidence, premium markets
- Contents:
  - NAEB Quality Certificate
  - Cupping score
  - Grade (A1/A2/B)
  - Sensory profile
  - Physical analysis results
  - Q-Grader signature
- Issued By: NAEB Quality Controller
- Status: Issued (auto-linked from QC module)

**6. Bill of Lading** 🚢
- Purpose: Shipping receipt and title document
- Required For: Freight and ownership transfer
- Contents:
  - Shipper: Rwanda Coffee Exports Ltd
  - Consignee: Buyer or "To Order"
  - Vessel name and voyage number
  - Container number
  - Port of loading: Mombasa, Kenya
  - Port of discharge: Hamburg/Rotterdam/New York
  - Weight and volume
  - Freight paid/collect
- Issued By: Shipping line (MSC/CMA/Hapag-Lloyd)
- Status: Issued / Awaited / Pending

**Document Management:**

**Document Details per Order:**
- **Order ID:** Reference link
- **Buyer Name:** Company
- **Document Type:** Icon + name
- **Issue Date:** When generated
- **Status:**
  - ✅ Issued (complete, official)
  - 📝 Draft (in progress, editable)
  - ⏳ Pending (awaiting info/approval)
- **Actions:**
  - 📥 Download PDF
  - ✏️ Edit (if draft)
  - 📧 Email to buyer
  - 🗑️ Delete (if draft)

**Document Package:**
- All documents for an order grouped together
- **Complete Package Download:** ZIP file with all PDFs
- Email entire package to buyer
- Print-friendly combined document

**Document Checklist:**
For each order, track document completion:
- ✓ Commercial Invoice
- ✓ Packing List
- ✓ Certificate of Origin
- ⏳ Phytosanitary Certificate (awaited)
- ✓ Quality Certificate
- ⏳ Bill of Lading (awaited from shipping line)
- **Status:** 4/6 Complete

### Module 6.4: Shipment Preparation
Prepare orders for export with checklist tracking

**Preparation Checklist per Order:**

**Step 1: ✓ Export Order Created**
- Status: Completed ✅
- Date: Feb 25, 2024
- Order ID: EO001
- Buyer: Nordic Roasters GmbH
- Details: 1,200 kg A1 grade, $15,120

**Step 2: ✓ Batch Selected & QC Approved**
- Status: Completed ✅
- Date: Feb 28, 2024
- Batch: B001 (NYM-2024-001)
- Grade: A1 (88.2 SCA points)
- Certificate: NAEB-QC-2024-001

**Step 3: ⏳ Documents Prepared**
- Status: In Progress ⏳
- Required: Minimum 3 documents
- Completed: 4/6 documents
- Pending:
  - ⏳ Phytosanitary Certificate (requested from RAB)
  - ⏳ Bill of Lading (awaiting shipping line)
- **Action:** Follow up with issuing authorities

**Step 4: ⏳ Container Booked**
- Status: Not Started ⏳
- Required: Container reservation with shipping line
- Details Needed:
  - Container type (20ft/40ft)
  - Shipping line selection
  - Vessel preference
  - Departure date
- **Action:** Contact logistics to book container

**Step 5: ⏳ Cargo Loaded**
- Status: Not Started ⏳
- Required: Coffee loaded into container
- Location: Mombasa Port, Kenya
- Loading Date: To be scheduled
- Supervision: Required
- **Action:** Coordinate with logistics

**Step 6: ⏳ Vessel Departed**
- Status: Not Started ⏳
- Required: Vessel sail from port
- ETD: To be confirmed
- ETA: To be calculated
- Tracking: Will be enabled after departure
- **Action:** Monitor departure schedule

**Progress Tracking:**
- Visual progress bar (e.g., 33% complete)
- Steps completed: 2/6
- Estimated completion: 10 days
- On track / Delayed indicator

**Complete Step Actions:**
- **Mark Step Complete:** Check off completed tasks
- **Add Notes:** Document important details
- **Upload Documents:** Attach related files
- **Set Reminders:** For pending tasks

**Preparation Status Summary:**
- 🟢 **On Track:** All steps progressing as planned
- 🟡 **At Risk:** Some delays, attention needed
- 🔴 **Delayed:** Critical delays, urgent action required

### Module 6.5: Traceability & QR ⭐ NEW
Complete farm-to-cup journey visualization with QR codes

**Traceability Dashboard:**

**QR Code Generation per Export Order:**
- **Order Selection:** Dropdown of export orders
- **Generate QR Button:** Creates unique QR code for order
- **QR Display:**
  - Visual QR code image
  - Public URL: `https://rwandacoffee.rw/trace/EO001-YRG`
  - Order ID and batch reference
  - Generated date

**Traceability Journey Visualization:**

**Export Order: EO001 - Nordic Roasters GmbH**
**Batch: YRG-2024-001 (Nyaruguru District)**

**Complete Supply Chain Journey:**

**Stage 1: 🌱 Farm Collection**
- **Date:** Feb 15, 2024
- **Location:** Nyamagabe District, Rwanda
- **GPS:** -2.6150°S, 29.6025°E
- **Actors:** 3 farmers contributing to this batch
  - Jean Claude Munyarugamba (F001)
  - Uwase Claudine (F002)
  - Emmanuel Habimana (F003)
- **Weight:** 1,240 kg cherry coffee collected
- **Blockchain Hash:** 0x1a2b3c4d... (immutable record)

**Stage 2: 🚜 Aggregation**
- **Date:** Feb 16, 2024
- **Location:** Zone A Collection Point, Nyamasheke
- **GPS:** -2.4845°S, 29.0180°E
- **Actor:** Aline Uwizeyimana (A001) - COOPAC Aggregator
- **Action:** Pickups consolidated into batch
- **Weight:** 1,240 kg cherry coffee
- **Payment:** RWF 3,224,000 paid to farmers
- **Blockchain Hash:** 0x4d5e6f7a... (payment verified)

**Stage 3: ⚙️ Processing**
- **Date:** Feb 20, 2024
- **Location:** Nyamasheke Washing Station
- **GPS:** -2.4920°S, 29.0250°E
- **Actor:** Samuel Mugisha (P001) - Processor
- **Process:** Fully Washed (pulping, fermentation, washing, drying)
- **Transformation:** 1,240 kg cherry → 248 kg green bean (20% yield)
- **Duration:** 14 days processing
- **Blockchain Hash:** 0x7a8b9c0d... (process verified)

**Stage 4: 🔬 Quality Control**
- **Date:** Feb 28, 2024
- **Location:** NAEB Quality Lab, Kigali
- **GPS:** -1.9441°S, 30.0619°E
- **Actor:** Diane Mukandayisenga (Q001) - Q-Grader
- **Test Results:**
  - Cupping Score: 88.2 / 100 (SCA Protocol)
  - Grade: A1 - Specialty Grade
  - Flavor: Red Apple, Caramel, Black Tea
  - Certificate: NAEB-QC-2024-001
- **Blockchain Hash:** 0x7f3c8a1b... (certificate on blockchain)

**Stage 5: 🌍 Export**
- **Date:** Mar 1, 2024
- **Location:** Kigali Export Hub
- **Actor:** Christine Mukamurenzi (E001) - Exporter
- **Export Order:** EO001 - Nordic Roasters GmbH
- **Documentation:** All export papers prepared
- **Value:** $15,120 USD
- **Blockchain Hash:** 0x2d4e5f6a... (export transaction)

**Stage 6: 🚢 Shipping**
- **Date:** Mar 1, 2024
- **Location:** Mombasa Port → Hamburg, Germany
- **Actor:** Joseph Nkurikiye (L001) - Logistics
- **Vessel:** MSC AGADIR (Voyage MV-2024-012)
- **Container:** MSCU1234567
- **Transit:** 27 days
- **GPS Tracking:** Real-time location updates
- **Blockchain Hash:** 0x9a2f5c8b... (shipping verified)

**Stage 7: ✅ Delivery**
- **Date:** Mar 28, 2024
- **Location:** Hamburg, Germany
- **GPS:** 53.5511°N, 9.9937°E
- **Actor:** Nordic Roasters GmbH (Buyer)
- **Status:** Delivered and accepted
- **Quality:** Confirmed (post-arrival cupping)
- **Blockchain Hash:** 0x6e7f8a9b... (delivery confirmed)

**Traceability Features:**
- **Interactive Timeline:** Click each stage for details
- **Map View:** Visual journey on map with pins
- **Actor Profiles:** Click actor name to see full profile
- **Blockchain Verification:** Verify each stage independently
- **Download Journey:** PDF report of complete journey
- **Public Sharing:** QR code for consumer transparency

**Consumer-Facing Page:**
When QR code is scanned by coffee consumer:
- Complete farm-to-cup journey
- Farmer stories and photos
- Quality scores and flavor notes
- Processing method details
- Sustainability metrics
- Blockchain verification links
- Roaster information

**Benefits:**
- Complete transparency for buyers
- Marketing tool for specialty coffee
- Blockchain-verified authenticity
- Consumer trust and engagement
- Premium pricing justification

### Module 6.6: Blockchain Verification ⭐ NEW
Verify export transactions and quality certificates on blockchain

**Blockchain Verification Dashboard:**

**Export Transaction Records:**
- **Transaction Hash:** Unique blockchain identifier
- **Export Order:** EO001, EO002, etc.
- **Block Number:** Ethereum block (e.g., 1524103)
- **Timestamp:** Date and time of record
- **Event Type:**
  - export_shipped (cargo dispatched)
  - quality_certified (QC approved)
  - batch_created (batch consolidated)
- **Data Stored:**
  - Buyer name and destination
  - Batch ID and weight
  - Quality certificate ID
  - Export value
- **Verified Status:** ✅ Confirmed on blockchain

**Verification Process:**
- Export order completed → Blockchain record created
- Transaction hash generated
- Block mined and confirmed
- Public verification available

**Public Verification Portal:**
- Enter export order ID or transaction hash
- System retrieves blockchain record
- Displays all verified data
- Provides Etherscan link for independent verification

**Verification Details View:**
- **Order ID:** EO001
- **Batch ID:** B001 (NYM-2024-001)
- **Buyer:** Nordic Roasters GmbH
- **Destination:** Hamburg, Germany
- **Weight:** 1,200 kg
- **Grade:** A1
- **Quality Certificate:** NAEB-QC-2024-001
- **Transaction Hash:** 0x9a2f5c8b1e4d7a3f6c9b2e5a8d1f4c7b0e3a6d9c2f5b8e1a4d7c0f3b6e9a
- **Block Number:** 1524103
- **Network:** Ethereum Mainnet
- **Confirmations:** 1,247
- **Verified:** ✅ Yes

**Benefits:**
- Immutable export records
- Prevents fraud and document tampering
- Buyer confidence and trust
- Regulatory compliance
- Marketing advantage for specialty coffee

### Module 6.7: Notifications
Export activity alerts and reminders

**Notification Types:**
- 📋 **New Export Order:** "Kyoto Coffee House (Japan) has placed an order for 600kg A1 grade."
- ✅ **Batch Approved:** "Batch MUH-2024-006 has passed NAEB quality control. Ready for export."
- ⚠️ **Document Required:** "Rwanda Certificate of Origin needed for EO003 before March 28."
- 🚢 **Shipment Departed:** "SHP003 has departed Mombasa Port en route to New York."

---

## 7. ADMIN ROLE 👤

**User Example:** Eric Kamanzi (ADM001)  
**Organization:** Rwanda Coffee Supply Chain Management  
**Role:** System Administrator

### Dashboard Overview
System-wide monitoring and management

**System Status:**
- Total registered users: 79
- System uptime: 99.8%
- Database status: Healthy ✅
- Last backup: 2 hours ago

**4 KPI Cards:**
- 👥 **Registered Users:** All roles count (e.g., 79 users)
- ⏳ **Pending Approvals:** Farmer registrations (e.g., 3 pending)
- 📦 **Active Batches:** In supply chain (e.g., 6 batches)
- 📊 **Exports This Month:** Value + % change (e.g., $19.4K, ↑12%)

**Monthly Volume Chart:**
- Bar chart: Collected / Processed / Exported (kg)
- 6-month trend (Oct → Mar)
- Color-coded bars
- Hover for exact values

**Batch Status Distribution:**
- Pie chart showing:
  - 42% Exported (green)
  - 18% In Transit (blue)
  - 22% Processing (orange)
  - 12% Quality Check (purple)
  - 6% Received (gray)

**Quality Grade Distribution:**
- 3 circular progress indicators:
  - **Grade A1:** 46% (28 batches) - Specialty
  - **Grade A2:** 36% (22 batches) - Premium
  - **Grade B:** 18% (11 batches) - Commercial

### Module 7.1: Farmer Approvals
Review and approve farmer registrations

**Pending Count Badge:**
- Amber badge showing count (e.g., "3 pending")
- Prominent display in sidebar
- Alert if pending >7 days

**Approval Alert:**
⚠️ "3 new farmer registrations are pending your approval. Review and approve or reject in the Farmer Approvals section."

**Approval Cards per Farmer:**

**Farmer Registration Card:**

**Header:**
- **Initials Badge:** Colored circle with initials (e.g., "PN" for Patrick Niyonzima)
- **Name:** Patrick Niyonzima (full name, bold)
- **Email:** p.niyonzima@gmail.com
- **Registered Date:** Jan 12, 2024 (time since: "72 days ago")
- **Status Badge:** ⏳ PENDING (amber)

**Farm Information Grid:**
- **Location:** Karongi, Western Province
- **Farm Size:** 4.0 hectares
- **Phone:** +250 788 567 890
- **Farmer Ref ID:** F005

**Additional Notes Panel:**
(Blue background info box)
- **Notes:** "Has 4 hectares, strong cooperative member from Karongi Washing Station"
- Provides context for approval decision

**Action Buttons:**

**✅ Approve Button:**
- Green button with checkmark icon
- Label: "Approve"
- On click:
  - Shows loading spinner
  - Activates farmer account
  - Generates auto-password
  - Sends welcome email with credentials
  - Shows success toast: "Patrick Niyonzima's registration has been approved! Login credentials sent."
  - Removes card from pending list

**❌ Reject Button:**
- Red outlined button with X icon
- Label: "Reject"
- On click:
  - Shows loading spinner
  - Denies registration
  - Sends rejection email (optional)
  - Shows error toast: "Patrick Niyonzima's registration has been rejected."
  - Removes card from pending list

**👁️ View Full Application Link:**
- Opens modal with complete registration form
- Shows all submitted information
- Includes farm details, certification history, references
- Option to print or download

**Processing Indicators:**
- Loading spinner during approval/rejection
- Disabled buttons while processing
- Success/error messages after completion

**Empty State:**
(When no pending approvals)
- ✅ Checkmark icon (large, green)
- Message: "All registrations reviewed!"
- Subtext: "No pending farmer approvals at this time."

### Module 7.2: User Management
Create and manage non-farmer users across all roles

**Create User Button:**
- Opens user creation form modal
- Green button with UserPlus icon
- Label: "+ Create User"

**Create User Form:**

**Personal Information:**
- **Full Name:** Text input (required)
  - Placeholder: "e.g., Kigali Uwamahoro"
- **Email Address:** Email input (required)
  - Placeholder: "user@rwandacoffee.rw"
  - Validation: Must be valid email format
- **Role:** Dropdown (required)
  - Options: Aggregator, Processor, Quality, Logistics, Exporter
  - (Farmer not included - they self-register)
  - Color-coded options
- **Phone Number:** Tel input (optional)
  - Placeholder: "+250 7XX XXX XXX"
  - Format: Rwanda phone number format

**Password Management Info:**
(Blue info box)
- "A temporary password will be auto-generated and sent to the user's email. They will be prompted to change it on first login."

**Form Actions:**
- **✅ Create Account Button:**
  - Green button
  - On click:
    - Validates all required fields
    - Generates random temporary password
    - Creates user account
    - Sends welcome email with credentials
    - Shows loading spinner
    - Success toast: "User Diane Mukandayisenga (quality) created successfully! Credentials sent to diane.m@naeb.gov.rw"
    - Closes form
    - Adds user to table
- **Cancel Button:**
  - Gray outlined button
  - Closes form without saving

**User Directory Table:**

**Table Columns:**

**1. User (with avatar)**
- Initials badge (color-coded by role)
- Full name (bold)
- Email (smaller, gray text)
- Example:
  ```
  [EK] Eric Kamanzi
       eric.kamanzi@rwandacoffee.rw
  ```

**2. Role**
- Color-coded badge
- Role name capitalized
- Colors:
  - 🔴 Admin (red-600)
  - 🟠 Aggregator (amber-500)
  - 🟠 Processor (orange-500)
  - 🟣 Quality (violet-500)
  - 🔵 Logistics (sky-500)
  - 🌹 Exporter (rose-500)
  - 🟢 Farmer (emerald-500)

**3. Status**
- Green dot + "Active" for active users
- Gray dot + "Inactive" for inactive users
- Red dot + "Locked" for locked accounts

**4. Last Login**
- Timestamp of last login
- Format: "2024-03-25" or "2 hours ago"

**5. Created By**
- Who created this user
- "System" for auto-created
- Admin name for admin-created
- "Self" for farmer self-registration

**6. Actions**
- **👁️ View:** View user details
  - Opens user profile modal
  - Shows all user information
  - Activity history
  - Permissions

- **🔒 Reset Password:** Reset user password
  - Opens confirmation dialog
  - Generates new temporary password
  - Sends email to user
  - Toast: "Resetting password for Diane Mukandayisenga..."
  - Success toast: "Password reset email sent."

**Table Features:**
- Sortable columns (click header to sort)
- Search bar at top (filter by name or email)
- Pagination (if >20 users)
- Role filter dropdown
- Status filter dropdown

### Module 7.3: Role Permissions
Configure role-based access control matrix

**Permission Matrix Intro:**
- Explanation of role-based access control
- How permissions are enforced
- Link to modify permissions (admin only)

**Permission Matrix Table:**

**Table Structure:**
- **Rows:** System modules
- **Columns:** Roles (Farmer, Aggregator, Processor, Quality, Logistics, Exporter, Admin)
- **Cells:** Access indicators

**Module Categories (Rows):**
1. **Farm Profile** - View and edit farm information
2. **Pickup Scheduling** - Schedule coffee pickups
3. **Record Pickup** - Document collection transactions
4. **Farmer Payments** - Manage farmer payments
5. **Batch Creation** - Consolidate pickups into batches
6. **Processing Queue** - Manage washing/drying operations
7. **Quality Testing** - Conduct SCA cupping tests
8. **Certificate Generation** - Issue NAEB quality certificates
9. **Export Orders** - Manage export contracts
10. **Shipment Management** - Coordinate logistics
11. **Analytics View** - View system analytics
12. **User Management** - Create and manage users

**Permission Indicators:**
- ✅ **Green Checkmark:** Role has access to module
- ➖ **Gray Dash:** Role does not have access

**Example Permission Matrix:**
```
Module               | Farmer | Aggregator | Processor | Quality | Logistics | Exporter | Admin
---------------------|--------|------------|-----------|---------|-----------|----------|------
Farm Profile         |   ✅   |     ➖     |    ➖     |   ➖    |    ➖     |    ➖    |  ✅
Pickup Scheduling    |   ✅   |     ✅     |    ➖     |   ➖    |    ➖     |    ➖    |  ✅
Record Pickup        |   ➖   |     ✅     |    ➖     |   ➖    |    ➖     |    ➖    |  ✅
Farmer Payments      |   ✅   |     ✅     |    ➖     |   ➖    |    ➖     |    ➖    |  ✅
Batch Creation       |   ➖   |     ✅     |    ➖     |   ➖    |    ➖     |    ➖    |  ✅
Processing Queue     |   ➖   |     ➖     |    ✅     |   ➖    |    ➖     |    ➖    |  ✅
Quality Testing      |   ➖   |     ➖     |    ➖     |   ✅    |    ➖     |    ➖    |  ✅
Certificate Gen      |   ➖   |     ➖     |    ➖     |   ✅    |    ➖     |    ➖    |  ✅
Export Orders        |   ➖   |     ➖     |    ➖     |   ➖    |    ➖     |    ✅    |  ✅
Shipment Mgmt        |   ➖   |     ➖     |    ➖     |   ➖    |    ✅     |    ➖    |  ✅
Analytics View       |   ➖   |     ➖     |    ➖     |   ➖    |    ➖     |    ➖    |  ✅
User Management      |   ➖   |     ➖     |    ➖     |   ➖    |    ➖     |    ➖    |  ✅
```

**Admin Column:**
- Admin role has ✅ (checkmark) for ALL modules
- Full system access
- Highlighted column (different background color)

**Permission Notes:**
(Amber info box at bottom)
⚠️ "Permission changes take effect immediately. All modifications are logged in the audit trail."

**Edit Permissions:** (Future feature)
- Click cell to toggle permission
- Confirmation dialog for changes
- Audit log entry created
- Notification sent to affected users

### Module 7.4: System Analytics
Supply chain performance monitoring and KPIs

**System KPI Cards:**

**1. Total Coffee Collected**
- **Value:** 23,900 kg
- **Subtitle:** This season
- **Color:** Emerald green background
- **Icon:** Coffee bean

**2. Total Farmers Active**
- **Value:** 8 farmers
- **Subtitle:** Across 4 regions (Western, Southern, Northern, Eastern)
- **Color:** Amber background
- **Icon:** Users group

**3. Export Revenue**
- **Value:** $19,405 USD
- **Subtitle:** Current season
- **Color:** Violet background
- **Icon:** Trending up arrow

**4. Avg Quality Score**
- **Value:** 85.1 points
- **Subtitle:** SCA cupping score
- **Color:** Sky blue background
- **Icon:** Star

**Volume Trend Chart:**
- **Title:** "Supply Chain Volume Trend (kg)"
- **Type:** Bar chart
- **Data:** Monthly from Oct → Mar
- **Series:**
  - **Collected:** Dark green bars (cherry coffee from farmers)
  - **Processed:** Orange bars (green coffee after processing)
  - **Exported:** Purple bars (shipped internationally)
- **Features:**
  - Grouped bars per month
  - Legend with color coding
  - Hover tooltips with exact values
  - Y-axis: kg (0-5000)
  - X-axis: Months

**Performance Metrics Cards:**

**1. Payment to Farmers**
- **Value:** RWF 18,450,000
- **Subtitle:** This month, 8 pickups
- **Trend:** Payment flow to farmers

**2. Compliance Rate**
- **Value:** 94.2%
- **Subtitle:** Quality standards adherence
- **Trend:** High compliance (green indicator)

**3. On-time Deliveries**
- **Value:** 2/3 shipments
- **Percentage:** 66.7% on schedule
- **Trend:** 1 shipment delayed

**Additional Analytics:** (Future expansion)
- Farmer performance ranking
- Processor efficiency metrics
- Quality score trends
- Export market breakdown
- Revenue by grade
- Seasonal patterns

### Module 7.5: Security Settings
System security configuration and monitoring

**Security Toggles:**

**1. Multi-Factor Authentication (MFA)**
- **Description:** "Require MFA for all sensitive operations and admin actions"
- **Current Status:** ON (green toggle)
- **On Click:**
  - Toggle switches
  - Confirmation dialog: "Are you sure you want to disable MFA?"
  - Success toast: "Multi-Factor Authentication disabled" or "...enabled"
  - Audit log entry created

**2. Automatic Session Timeout**
- **Description:** "Auto-logout after 30 minutes of inactivity"
- **Current Status:** ON (green toggle)
- **Configuration:** Timeout duration (15/30/60 minutes)

**3. Audit Log**
- **Description:** "Log all user actions, data modifications and access events"
- **Current Status:** ON (green toggle)
- **Storage:** All actions logged with timestamps

**Recent Security Events Log:**

**Security Events Table:**
- **Event Type:** Success (green dot), Error (red dot), Info (blue dot)
- **Event Description:** e.g., "Admin login", "Failed login attempt", "Password reset"
- **User:** Who performed the action or "Unknown"
- **Time:** Timestamp (e.g., "2024-03-25 09:14")
- **IP Address:** Masked IP (e.g., "197.156.102.xx")

**Example Security Events:**
1. **Event:** Admin login
   - **User:** Eric Kamanzi
   - **Time:** 2024-03-25 09:14
   - **IP:** 197.156.102.xx
   - **Type:** Success (green dot)

2. **Event:** Failed login attempt
   - **User:** Unknown
   - **Time:** 2024-03-24 23:47
   - **IP:** 197.156.120.xx
   - **Type:** Error (red dot)

3. **Event:** User created
   - **User:** Eric Kamanzi
   - **Time:** 2024-03-24 14:22
   - **IP:** 197.156.102.xx
   - **Type:** Info (blue dot)

4. **Event:** Password reset
   - **User:** Diane Mukandayisenga
   - **Time:** 2024-03-23 11:05
   - **IP:** 197.156.80.xx
   - **Type:** Info (blue dot)

**Security Actions:**
- View full audit log (paginated)
- Export security events (CSV)
- Block suspicious IP addresses
- Review failed login attempts
- Password policy configuration

### Module 7.6: Compliance ⭐ ENHANCED
Regulatory compliance tracking and certification management

**Compliance Score Dashboard:**
- **Overall Score:** 94% (out of 100%)
- **Score Breakdown:**
  - NAEB Standards: 98%
  - Export Regulations: 92%
  - Quality Compliance: 96%
  - Certification Status: 88%
  - Documentation Complete: 95%

**Compliance Summary Cards:**

**1. Compliant**
- **Count:** 5 items
- **Color:** Green background
- **Status:** All requirements met

**2. Expiring Soon**
- **Count:** 2 items
- **Color:** Amber background
- **Status:** Renewal required within 90 days

**3. Action Required**
- **Count:** 1 item
- **Color:** Red background
- **Status:** Immediate attention needed

**Compliance Requirements Table:**

**Example Requirements:**

**1. NAEB Export License**
- **Requirement:** Valid export license for Rwanda coffee
- **Status:** ✅ Compliant (green badge)
- **Expiry Date:** Jan 15, 2025
- **Renewal Days:** 295 days remaining
- **Holder:** Rwanda Coffee Exports Ltd
- **Notes:** License No. RW-EXP-2024-089
- **Actions:** View / Renew / Download

**2. Organic Certification**
- **Requirement:** USDA Organic certification for organic farms
- **Status:** ⚠️ Expiring Soon (amber badge)
- **Expiry Date:** Apr 30, 2024
- **Renewal Days:** 35 days remaining
- **Holder:** Nyamasheke Cooperative
- **Coverage:** 4/8 farmers
- **Actions:** Renew / Contact Certifier

**3. Rainforest Alliance**
- **Requirement:** Sustainability certification for SAN standards
- **Status:** ✅ Compliant (green badge)
- **Expiry Date:** Mar 20, 2026
- **Renewal Days:** 724 days remaining
- **Holder:** Gakenke Washing Station
- **Actions:** View / Download Certificate

**4. Fair Trade Certification**
- **Requirement:** Fairtrade International certification
- **Status:** ✅ Compliant (green badge)
- **Expiry Date:** Nov 5, 2024
- **Renewal Days:** 224 days remaining
- **Holder:** Karongi Coffee Cooperative
- **Coverage:** 8/8 farmers
- **Actions:** View / Renew

**5. ISO 22000 Food Safety**
- **Requirement:** Food safety management system
- **Status:** ⚠️ Expiring Soon (amber badge)
- **Expiry Date:** Aug 12, 2024
- **Renewal Days:** 139 days remaining
- **Holder:** Rwacof Processing Ltd
- **Actions:** Schedule Audit / Renew

**6. EU Regulation (EUDR) Compliance**
- **Requirement:** EU Deforestation Regulation compliance
- **Status:** 🔴 Action Required (red badge)
- **Expiry Date:** Jan 1, 2025
- **Notes:** Traceability data submission pending
- **Actions:** Submit GPS Data / Complete Due Diligence

**Compliance Actions:**
- **Renew:** Initiate renewal process
- **Schedule Audit:** Book inspection date
- **Upload Documents:** Add certification documents
- **Contact Certifier:** Email/phone contact
- **View Details:** Full certification info

**Compliance Alerts:**
- 7 days before expiry: Amber warning
- Expiry date passed: Red critical alert
- Email notifications to admin
- Dashboard alerts

### Module 7.7: Blockchain Audit ⭐ NEW
Complete blockchain audit trail for system transparency

**Blockchain Summary Cards:**

**1. Total Records**
- **Value:** 5 records
- **Color:** Blue background
- **Icon:** Database

**2. Verified**
- **Value:** 5 records (100%)
- **Color:** Green background
- **Icon:** Checkmark shield

**3. Network**
- **Value:** Ethereum
- **Color:** Purple background
- **Icon:** Blockchain link

**Blockchain Records Table:**

**Table Columns:**
1. **Record ID:** Unique identifier (e.g., BLK001)
2. **Entity:** What was recorded (e.g., "Export Order EO001", "Batch YRG-2024-001")
3. **Type:** Badge (export / quality / batch)
4. **Block Hash:** Truncated hash (e.g., "0x8f3a...2c5d")
5. **Transaction Hash:** Full transaction (e.g., "0x4b7e...9a1f")
6. **Actor:** Who created record (e.g., "Christine Mukamurenzi", "Diane Mukandayisenga")
7. **Timestamp:** Date and time (e.g., "2024-03-01 10:30")
8. **Status:** ✅ Verified badge (green)

**Example Blockchain Records:**

**BLK001: Export Order EO001**
- **Type:** Export (rose badge)
- **Block Hash:** 0x8f3a...2c5d
- **Timestamp:** Mar 1, 2024, 10:30:00
- **Transaction:** 0x4b7e...9a1f
- **Actor:** Christine Mukamurenzi
- **Verified:** ✅ Yes

**BLK002: Batch YRG-2024-001**
- **Type:** Quality (violet badge)
- **Block Hash:** 0x7a8f...3d2e
- **Timestamp:** Mar 15, 2024, 14:32:00
- **Transaction:** 0x9c4b...7f1a
- **Actor:** Diane Mukandayisenga
- **Verified:** ✅ Yes

**BLK003: Export Order EO002**
- **Type:** Export (rose badge)
- **Block Hash:** 0x1d6c...7b4a
- **Timestamp:** Mar 12, 2024, 14:15:00
- **Transaction:** 0x9e2f...3c8d
- **Actor:** Christine Mukamurenzi
- **Verified:** ✅ Yes

**Blockchain Info Panel:**
(Blue info box with link icon)
- **Title:** "Blockchain Transparency"
- **Content:** "All quality certifications and export transactions are recorded on the Ethereum blockchain for immutable audit trails and transparency."
- **Network:** Ethereum Mainnet (or Testnet)
- **Explorer Link:** View on Etherscan

**Verification Features:**
- Click transaction hash to view on blockchain explorer
- Verify any record independently
- Public verification portal
- Immutable record guarantee

### Module 7.8: Sustainability Report ⭐ NEW
Comprehensive environmental, social, and economic metrics

**Overall Sustainability Score:**
(Large banner with gradient background)
- **Score:** 82% (Good Performance)
- **Breakdown:**
  - Environmental: 78%
  - Social: 100%
  - Economic: 68%
- **Basis:** 6 key sustainability metrics

**Sustainability Metrics Cards:**

Each card shows:
- **Metric Name:** e.g., "Water Conservation"
- **Current Value:** e.g., "8,500 L"
- **Target:** e.g., "10,000 L"
- **Progress Bar:** Visual indicator (e.g., 85% of target)
- **Status Dot:** 
  - 🟢 Excellent (>95% of target)
  - 🟢 Good (85-95% of target)
  - 🟡 Warning (70-85% of target)

**6 Key Metrics:**

**1. Water Conservation**
- **Value:** 8,500 L saved
- **Target:** 10,000 L
- **Progress:** 85% (good)
- **Status:** 🟢 Good

**2. Carbon Footprint Reduction**
- **Value:** 12% reduction
- **Target:** 15% reduction
- **Progress:** 80% (warning)
- **Status:** 🟡 Warning

**3. Waste Recycling**
- **Value:** 78% recycled
- **Target:** 85% target
- **Progress:** 92% (warning)
- **Status:** 🟡 Warning

**4. Renewable Energy Usage**
- **Value:** 48% renewable
- **Target:** 60% target
- **Progress:** 80% (warning)
- **Status:** 🟡 Warning

**5. Fair Trade Compliance**
- **Value:** 100% compliant
- **Target:** 100% target
- **Progress:** 100% (excellent)
- **Status:** 🟢 Excellent

**6. Organic Certification**
- **Value:** 4/8 farmers
- **Target:** 6/8 farmers
- **Progress:** 67% (warning)
- **Status:** 🟡 Warning

**Environmental Impact Dashboard:**

**4 Impact Cards:**

**1. 🌳 Trees Planted**
- **Value:** 320 trees
- **Trend:** +45 this month
- **Impact:** Agroforestry and shade cover

**2. 💧 Water Conserved**
- **Value:** 8,500 L
- **Trend:** +12% vs last month
- **Impact:** Recycling and efficiency

**3. ♻️ Composted Waste**
- **Value:** 1,240 kg
- **Trend:** 91% recycling rate
- **Impact:** Coffee pulp as fertilizer

**4. ☀️ Solar Energy Generated**
- **Value:** 2,850 kWh
- **Trend:** 48% of total usage
- **Impact:** Renewable energy

**Certifications & Compliance:**

**Certification Cards:**

**1. Fairtrade**
- **Status:** Active (green badge)
- **Coverage:** 8/8 farmers
- **Expires:** Aug 15, 2026

**2. Rainforest Alliance**
- **Status:** Active (green badge)
- **Coverage:** 6/8 farmers
- **Expires:** Dec 31, 2026

**3. Organic (EU)**
- **Status:** Renewal Pending (amber badge)
- **Coverage:** 4/8 farmers
- **Expires:** Apr 30, 2025

**4. UTZ Certified**
- **Status:** Active (green badge)
- **Coverage:** 5/8 farmers
- **Expires:** Sep 20, 2025

**Sustainability Goals:**
- Increase organic certification coverage to 6/8 farmers
- Achieve 15% carbon footprint reduction
- Reach 60% renewable energy usage
- Maintain 100% Fair Trade compliance

### Module 7.9: Notifications
System-wide alerts and critical notifications

**Notification Types:**
- ⚠️ **Approval Required:** "3 new farmer registrations are pending your approval."
- ℹ️ **System Update:** "Scheduled maintenance on March 28, 2024 from 2-4 AM CAT."
- ✅ **Export Milestone:** "Monthly export target of 3,000kg achieved ahead of schedule."
- ❌ **Security Alert:** "Multiple failed login attempts detected from IP 197.156.x.x."

---

## SYSTEM-WIDE FEATURES

### Notification System
- Real-time alerts for all roles
- Unread badge indicators
- Type-coded notifications (success/warning/info/error)
- Timestamps for all notifications
- Mark as read functionality
- Notification history archive

### Search & Filter
- Global search across modules
- Filter by date range
- Filter by status
- Filter by location/origin
- Sort by multiple criteria

### Data Export
(Future feature)
- Export to CSV
- Export to Excel
- Generate PDF reports
- Email reports
- Scheduled exports

### Mobile Responsiveness
- Fully responsive design
- Works on all screen sizes
- Mobile-optimized layouts
- Touch-friendly interfaces
- Progressive Web App (future)

### Internationalization
- English primary language
- Kinyarwanda greetings
- Rwanda-specific formatting
- Currency: RWF
- Date format: DD/MM/YYYY

---

## SYSTEM WORKFLOW: COMPLETE COFFEE JOURNEY

**Step 1: Farmer Registration 🌱**
- Farmer self-registers online
- Submits farm details and certifications
- Admin reviews application
- Admin approves → Credentials sent

**Step 2: Coffee Harvest & Pickup Request 🌾**
- Farmer harvests coffee cherry
- Farmer requests pickup (estimated weight)
- Aggregator sees request in Pickup Schedule

**Step 3: Coffee Collection 🚜**
- Aggregator schedules pickup route (Route Optimization)
- Aggregator visits farm
- Weighs coffee, assesses quality grade
- Records pickup (weight × price = total)
- Makes payment (MTN MoMo/Bank/Cash) or marks pending

**Step 4: Batch Consolidation 📦**
- Aggregator consolidates multiple pickups
- Creates batch with unique ID
- Sends batch to processor
- Tracks sustainability metrics

**Step 5: Coffee Processing ⚙️**
- Processor receives batch
- Washes cherry (pulping, fermentation, washing)
- Dries parchment (10-14 days)
- Hulls to green bean
- Monitors equipment maintenance
- Tracks water and energy usage

**Step 6: Quality Testing 🔬**
- Quality Controller receives processed coffee
- Conducts physical analysis (moisture, density, defects)
- Performs SCA cupping protocol
- Assigns grade (A1/A2/B) and score
- Issues NAEB Quality Certificate
- Generates QR code and blockchain record

**Step 7: Export Order & Documentation 🌍**
- Exporter receives order from international buyer
- Selects quality-certified batch
- Prepares export documents (invoice, packing list, certificates)
- Coordinates with logistics

**Step 8: Shipping & GPS Tracking 🚢**
- Logistics books container with shipping line
- Loads coffee at Mombasa Port
- Tracks shipment with GPS
- Monitors temperature and humidity
- Updates ETA

**Step 9: Delivery & Blockchain Verification ✅**
- Container arrives at destination
- Customs clearance
- Buyer confirms delivery
- Blockchain record created
- Payment released
- Complete traceability available via QR code

---

## KEY STRENGTHS

✅ **Complete Supply Chain Coverage**
- Farm to export fully managed
- All 7 roles with specialized modules
- Seamless handoffs between stages

✅ **Advanced Traceability**
- QR code generation for consumer scanning
- Blockchain verification for immutable records
- GPS tracking for farms and containers
- Complete journey visualization

✅ **Sustainability Tracking**
- Carbon footprint monitoring
- Water conservation metrics
- Renewable energy usage
- Certification compliance

✅ **Rwanda Localization**
- RWF currency throughout
- Rwandan locations (provinces, districts)
- Local payment methods (MTN MoMo, Airtel Money)
- NAEB quality standards
- Kinyarwanda greetings

✅ **Quality Assurance**
- SCA cupping protocol
- NAEB grading standards (A1/A2/B)
- Comprehensive defect tracking
- Certificate generation

✅ **Real-time Monitoring**
- GPS container tracking
- Equipment maintenance alerts
- Route optimization
- Environmental monitoring

---

## SYSTEM REQUIREMENTS

### For Farmers:
- Internet-connected device (computer, smartphone, tablet)
- Email address
- Rwanda mobile number
- Basic computer literacy

### For All Other Roles:
- Computer or tablet with modern web browser
- Stable internet connection
- Official organization email address
- Role-specific training

### Technical Requirements:
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Minimum screen resolution: 1280×720
- Internet speed: 2 Mbps minimum
- JavaScript enabled
- Cookies enabled

---

## GETTING STARTED

### For Farmers:
1. Visit system login page
2. Click "Register as Farmer"
3. Fill registration form with farm details
4. Submit for admin approval
5. Wait for approval email (typically 1-3 days)
6. Log in with credentials from email
7. Change temporary password
8. Complete farm profile

### For Other Roles:
1. Admin creates your account
2. Receive email with temporary credentials
3. Log in with provided email and password
4. Change temporary password on first login
5. Complete profile information
6. Access role-specific dashboard

---

## SUPPORT & HELP

### Contact Information:
- **System Administrator:** Eric Kamanzi - eric.kamanzi@rwandacoffee.rw
- **NAEB Quality Support:** +250 788 XXX XXX
- **Technical Support:** support@rwandacoffee.rw

### Training Resources:
- Video tutorials available in Training module (Farmer dashboard)
- PDF user guides
- Live webinars scheduled monthly
- One-on-one training available on request

### Common Issues:
- **Forgot Password:** Click "Forgot Password" on login page
- **Account Locked:** Contact system administrator
- **Payment Issues:** Contact aggregator directly
- **Technical Problems:** Email technical support

---

**Document Generated:** March 26, 2026  
**System Version:** 2.0 (Advanced Modules Edition)  
**Document Date:** March 26, 2026  
**Total Pages:** 147 (comprehensive documentation)

---

## APPENDICES

### Appendix A: Rwandan Coffee Grading Standards (NAEB)

**Grade A1 - Specialty Grade:**
- Cupping score: 85+ (SCA)
- Moisture: 10.5-11.5%
- Primary defects: 0
- Secondary defects: 0-3
- Screen size: 17-18
- Price premium: Highest

**Grade A2 - Premium Grade:**
- Cupping score: 80-84 (SCA)
- Moisture: 11.0-12.0%
- Primary defects: 0-1
- Secondary defects: 3-8
- Screen size: 15-16
- Price premium: Medium

**Grade B - Commercial Grade:**
- Cupping score: <80 (SCA)
- Moisture: 11.5-13.0%
- Primary defects: 1-3
- Secondary defects: 8-15
- Screen size: 13-14
- Price premium: Standard

### Appendix B: Payment Methods in Rwanda

**MTN Mobile Money:**
- Most popular mobile payment service
- Orange branding
- Short code: *182#
- Used by majority of farmers

**Airtel Money:**
- Second largest mobile payment
- Red branding
- Short code: *500#
- Growing adoption

**Bank Transfer:**
- Traditional banking
- Used for large transactions
- Multiple banks supported

**Cash:**
- Still used in rural areas
- Immediate payment
- Receipt required

### Appendix C: Rwanda Coffee Regions

**Western Province:**
- Districts: Nyamasheke, Karongi, Rusizi, Rutsiro
- Altitude: 1500-2000m
- Characteristics: Fruity, floral, high acidity

**Southern Province:**
- Districts: Huye, Nyamagabe, Nyaruguru, Gisagara, Muhanga
- Altitude: 1400-1900m
- Characteristics: Sweet, balanced, medium body

**Northern Province:**
- Districts: Gakenke, Rulindo, Gicumbi
- Altitude: 1700-2200m
- Characteristics: Bright acidity, complex flavors

**Eastern Province:**
- Districts: Rwamagana, Ngoma, Kirehe
- Altitude: 1200-1600m
- Characteristics: Mild, low acidity

### Appendix D: Coffee Processing Methods

**Fully Washed (Most Common in Rwanda):**
1. Cherry sorting
2. Pulping (skin removal)
3. Fermentation (12-24 hours)
4. Washing (mucilage removal)
5. Drying (10-14 days)
6. Hulling (parchment removal)
Result: Clean, bright, fruity flavors

**Semi-Washed (Honey Process):**
1. Cherry sorting
2. Pulping (partial mucilage left)
3. Drying with mucilage
4. Hulling
Result: Sweeter, fuller body

**Natural (Rare in Rwanda):**
1. Cherry sorting
2. Drying whole cherry
3. Hulling
Result: Fruity, wine-like flavors

---

**END OF DOCUMENTATION**
