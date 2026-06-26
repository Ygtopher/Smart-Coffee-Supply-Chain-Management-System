# Smart Coffee Supply Chain Management System (SCM)

A full-stack, secure, and transparent traceability platform designed for the coffee supply chain in Rwanda. The platform tracks coffee cherry collections from farmers, monitors processing steps, records quality cupping assessments, facilitates logistics/shipment dispatch assignments, handles international export assignments, and provides an analytics and reporting dashboard for administrators.

---

## 🚀 Key Features

* **End-to-End Traceability**: Batch QR codes trace coffee from initial farm intake (cherry weight, moisture, farm location) through cooperative collection, processing, cupping, logistics, and port delivery.
* **Role-Based Access Control (RBAC)**: Custom portals tailored for each stakeholder:
  * **Farmers & Cooperatives**: Log pickups, view market price trends, and monitor delivery receipts.
  * **Aggregators & Processors**: Manage cherry processing batches, workstation assignments, and inventory levels.
  * **Quality Controllers**: Log cupping scores (Aroma, Acidity, Body, Flavour, Moisture, Defects) linked to specific batches.
  * **Logistics & Transporters**: Manage dispatch assignments, assign truck registration plates (Rwanda format), and register Proof of Delivery (POD).
  * **Exporters**: Manage international sales orders, allocate approved batches, and upload compliance documents.
  * **System Admins**: Configure platform parameters, manage user access, run customizable reports, and analyze volume metrics.
* **Multilingual Localization (i18n)**: Fully translated into **English**, **Kinyarwanda**, and **French** to serve regional stakeholders.
* **Robust Security**: Protected by JWT authorization, Multi-Factor Authentication (MFA), and rate-limiting middleware.

---

## 🛠️ Technology Stack

* **Frontend**: React, TypeScript, Vite, TailwindCSS, Lucide Icons, i18next (Localization), Sonner (Toasts)
* **Backend**: Node.js, Express, TypeScript, Prisma ORM, Helmet (Security headers), Morgan (Logging)
* **Database**: PostgreSQL (Prisma-managed schema)
* **Authentication**: JWT, MFA (TOTP-based verification)

---

## 📁 Repository Structure

```text
├── backend/                   # Node.js + Express + Prisma API
│   ├── prisma/                # DB Schema and Migrations
│   ├── src/
│   │   ├── config/            # DB configuration and Permission maps
│   │   ├── controllers/       # Business logic controllers
│   │   ├── middlewares/       # Auth, Rate-limiting, RBAC
│   │   ├── routes/            # Express endpoint routers
│   │   └── utils/             # Helper utilities (JWT, Emails, Payment Matchers)
│   └── tsconfig.json          # TypeScript configuration
│
└── frontend/                  # React + Vite Client
    ├── public/                # Static assets & Service workers
    ├── src/
    │   ├── app/
    │   │   ├── components/    # Shared views (ReportBuilder, RoleReports)
    │   │   ├── context/       # Auth & global state context
    │   │   ├── layouts/       # Main layout & sidebars
    │   │   └── pages/         # Role-specific dashboards and login pages
    │   ├── main.tsx           # Client entrypoint
    │   └── styles/            # Theme, Fonts, Tailwind configs
    └── vite.config.ts         # Vite configuration
```

---

## ⚙️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [PostgreSQL](https://www.postgresql.org/) (running instance)

---

### 1. Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://username:password@localhost:5432/coffee_scm?schema=public"
   JWT_SECRET="your-super-secret-jwt-key"
   ```
4. Run Prisma migrations to build your database schema:
   ```bash
   npx prisma migrate dev
   ```
5. Seed the database with sample roles, cooperatives, and batches:
   ```bash
   npx prisma db seed
   ```
6. Start the development backend server:
   ```bash
   npm run dev
   ```
   *(API will run at `http://localhost:5000`)*

---

### 2. Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development frontend server:
   ```bash
   npm run dev
   ```
   *(Vite client will run at `http://localhost:5173` or similar local port)*

---

## 📈 System Branding & Exports

* **Branded Reports**: All exported and printed PDF/CSV reports automatically embed the official company branding logo and list the verified logged-in user who compiled the report for full accountability and audit trails.
* **Rwanda-format Logistics**: Integrated transporter module enforces Rwanda-standard vehicle registration plate syntax (`RA[A-Z] \d{3}[A-Z]`) for all truck dispatch records.
