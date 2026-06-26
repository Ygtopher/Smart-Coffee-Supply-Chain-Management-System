Great — this is the **core functional design** of your system. Below is a **clear role-by-role breakdown** showing:

* ✅ Modules each user can access
* ✅ What they do inside the system
* ✅ Typical workflow

This will help you design your **Figma prototype** correctly. 🎯

---

# 👨‍🌾 Farmer

### Modules Access

* Profile / Farm Details
* Pickup Requests / Schedule
* Payment Tracking
* Notifications
* Training Resources

### How Farmer Uses the System

1. Registers account → waits for Admin approval
2. Logs in after approval
3. Adds farm details & production estimate
4. Requests pickup OR sees scheduled pickup
5. After aggregator collects coffee → sees payment
6. Tracks payment history

👉 Farmer **does NOT create batches** and **does NOT deliver coffee**

---

# 🚚 Aggregator

### Modules Access

* Farmer Management
* Pickup Scheduling
* Coffee Pickup Recording
* Payment to Farmers
* Batch Creation / Consolidation
* Inventory (temporary)
* Notifications

### How Aggregator Uses the System

1. Logs in (account created by Admin)
2. Views assigned farmers
3. Schedules pickup
4. Visits farmer and records:

   * weight
   * quality
   * price per kg
5. System calculates payment
6. Marks payment Paid / Pending
7. Combines multiple farmers into **one batch**
8. Sends batch to processor

👉 Aggregator is the **first person creating batches**

---

# 🏭 Processor

### Modules Access

* Incoming Batches
* Processing Queue
* Batch Transformation
* Processing Inventory
* Processing Reports

### How Processor Uses the System

1. Receives batch from aggregator
2. Confirms receipt
3. Starts processing (washing/drying)
4. Updates batch status
5. Converts:

   * Cherry → Parchment → Green coffee
6. Sends batch to Quality Controller

---

# 🔬 Quality Controller

### Modules Access

* Quality Testing
* Cupping Score
* Defect Recording
* Certificate Generation
* Quality Reports

### How Quality Controller Uses the System

1. Receives processed batch
2. Performs quality test
3. Records:

   * moisture
   * defects
   * cupping score
4. Approves or rejects batch
5. Generates quality certificate
6. Passes batch to Exporter

---

# 🚢 Exporter

### Modules Access

* Export Orders
* Batch Selection
* Export Documentation
* Buyer Requirements
* Shipment Preparation

### How Exporter Uses the System

1. Selects approved batches
2. Creates export order
3. Prepares documents:

   * invoice
   * packing list
   * certificate
4. Assigns logistics
5. Sends to shipping

---

# 🚛 Logistics

### Modules Access

* Shipment Tracking
* Container Management
* Route Tracking
* Delivery Confirmation

### How Logistics Uses the System

1. Receives shipment request
2. Assigns container
3. Updates transport details
4. Tracks delivery
5. Confirms shipment delivered

---

# 👨‍💼 Admin

### Modules Access

* User Management
* Role Management
* Farmer Approvals
* System Analytics
* All Modules (Full Access)
* Security Settings

### How Admin Uses the System

1. Approves farmer registrations
2. Creates:

   * Aggregator
   * Processor
   * Quality Controller
   * Logistics
   * Exporter
3. Monitors system activity
4. Views analytics dashboard
5. Manages permissions

---

# 🔄 Complete Workflow (End-to-End)

```
Farmer registers
     ↓
Admin approves
     ↓
Aggregator schedules pickup
     ↓
Aggregator collects coffee + pays farmer
     ↓
Aggregator creates batch
     ↓
Processor processes batch
     ↓
Quality Controller tests
     ↓
Exporter prepares shipment
     ↓
Logistics delivers
```

---

# 🎯 Sidebar Menu Example Per Role

### Farmer Sidebar

* Dashboard
* My Farm
* Pickup Schedule
* Payments
* Notifications

### Aggregator Sidebar

* Dashboard
* Farmers
* Pickups
* Payments
* Batches

### Processor Sidebar

* Dashboard
* Incoming Batches
* Processing Queue
* Inventory

### Quality Sidebar

* Dashboard
* Quality Tests
* Certificates

### Exporter Sidebar

* Dashboard
* Export Orders
* Documents

### Logistics Sidebar

* Dashboard
* Shipments
* Tracking

### Admin Sidebar

* Dashboard
* Users
* Approvals
* Analytics
* Settings

---

This structure is **perfect for your Figma prototype** and will make it look like a **real enterprise coffee system** ☕🚀
