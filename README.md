# StockIN — Enterprise Inventory, Quotation & Invoicing Suite

StockIN is a production-grade inventory, stock management, customer CRM, quotation estimation, and GST tax invoicing system. Built as a high-performance monorepo using **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Node/Express**, and **Supabase (PostgreSQL with Row Level Security & Private Document Storage)**.

---

## 📌 Problem & Purpose

Growing distribution, wholesale, retail, and manufacturing businesses often suffer from disconnected systems: spreadsheets for inventory, external tools for billing, and manual logbooks for quotations and customer credit. This leads to overselling, stock discrepancies, missed receivables, and compliance headaches.

**StockIN solves this by unifying:**
- Real-time warehouse inventory and movement logs.
- Dimension-based billing (e.g., glass, plywood, granite by length × width area) alongside standard unit billing.
- Atomic quotation-to-invoice conversion preventing duplicate conversions or stock overdrafts.
- Automatic customer ledger reconciliation with instant credit tracking.
- Client-side vector PDF generation paired with secure, private cloud document archiving and audit trails.

---

## ⚡ Core Features

### 1. Multi-Tenant Authentication & Session Security
- Secure email/password authentication via Supabase Auth with automated session persistence and refresh tokens.
- PostgreSQL Row Level Security (RLS) guaranteeing strict tenant isolation: users can never access or modify data belonging to other accounts.

### 2. Product Catalog & Dimensional Billing
- Supports both standard discrete unit products (Pcs, Box, Kg) and dimensional products (Length × Width with automatic area calculations in sq.ft, sq.m).
- Purchase cost, selling rate, minimum buffer stock levels, tax rates (0%, 5%, 12%, 18%, 28%), and HSN code compliance.
- CSV import and export capabilities for seamless bulk catalog operations.

### 3. Real-Time Stock Management & Replenishment
- Live warehouse balance tracking across healthy, low-stock, and out-of-stock thresholds.
- Dedicated **Stock In** intake workflow for logging incoming shipments with supplier references, invoice numbers, and unit purchase costs.
- Stock adjustment tools with complete audit trail history (`stock_in`, `stock_out`, `adjustment`, `return`).

### 4. Sales Invoicing & Billing POS
- Rapid invoice creation with line items, customizable discounts, tax auto-calculation (CGST/SGST split), and stock validation.
- Atomic transactional creation ensuring inventory is decremented and movement logs are created synchronously.
- Multiple payment settlement states: `paid`, `partial`, and `due` with balance carryover into customer ledgers.

### 5. Quotation Engine & Atomic Conversion
- Professional price estimation and formal quotes with expiration dates and customizable terms.
- Quotations do **not** affect warehouse inventory until converted.
- **One-Click Atomic Conversion**: Converts quotes into sales invoices via a server-side PostgreSQL stored procedure (`convert_quotation_to_invoice_rpc`) that validates current warehouse stock, creates invoice records, deducts inventory, and marks the quote converted in a single atomic database transaction.

### 6. Customer CRM & Financial Ledgers
- Centralized customer directory with company names, GSTIN, phone, address, and credit limits.
- Automated ledger tracking total spent, order history, and live outstanding balances.

### 7. Payments & Collections Register
- Real-time ledger of cash, UPI, bank transfer, and cheque receipts linked to specific invoices or general customer accounts.

### 8. Document History & Private Cloud Storage
- Vector PDF generation for tax invoices and quotations.
- Automated background archiving to a private Supabase Storage bucket (`documents`) under tenant-isolated directories (`{user_id}/invoices/` and `{user_id}/quotations/`).
- Secure time-limited signed URLs for document viewing and downloads with self-healing PDF regeneration if files are missing.

### 9. Business Analytics & Financial Reports
- Multi-dimensional financial analytics: Sales trends, Inventory valuation, Gross margins (COGS), Tax slab breakdown, Customer sales volume, and Stock movement throughput.
- Export all reports and transaction ledgers to CSV.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, React Router v7, Vite 8 |
| **Language & Tooling** | TypeScript 6, Bun, Oxlint |
| **Styling & Design** | Tailwind CSS v4, Plus Jakarta Sans, Lucide React Icons |
| **Data Visualization** | Recharts (Area, Bar, Donut, and Composition Charts) |
| **Database & Auth** | Supabase PostgreSQL, Row Level Security (RLS), Supabase Auth |
| **Storage & Archiving** | Supabase Storage (Private `documents` bucket, Signed URLs) |
| **Backend Service** | Node.js, Express, TypeScript, tsx |
| **Hosting & Deployment** | Cloudflare Pages (Frontend via Wrangler), Node/Docker (Backend) |

---

## 📁 Repository Structure

```
StockIN/
├── frontend/                              # Client Application (React 19 + TypeScript + Vite)
│   ├── src/
│   │   ├── app/                           # Top-level App Shell, Providers & Declarative Routes
│   │   ├── components/                    # Reusable UI Library (layout, common, billing, modals)
│   │   ├── features/                      # Domain Feature Modules:
│   │   │   ├── auth/                      # Authentication (Login, Register, Password Reset)
│   │   │   ├── dashboard/                 # KPI Cards, Sales Analytics & Quick Ledgers
│   │   │   ├── products/                  # Product Catalog & Modal Forms
│   │   │   ├── stock/                     # Stock Balances, Stock In & Replenishment
│   │   │   ├── invoices/                  # Sales Invoicing, Billing & Printables
│   │   │   ├── quotations/                # Quotes, Conversion & PDF Printables
│   │   │   ├── customers/                 # Customer CRM & Account Ledgers
│   │   │   ├── payments/                  # Payment Receipts & Collections Register
│   │   │   ├── history/                   # Document Audit History & Storage Sync
│   │   │   ├── reports/                   # Financial, Sales & Inventory Reports
│   │   │   └── settings/                  # Business Profile, GST & Preferences
│   │   ├── context/                       # Global React State (AppStateContext, AuthContext)
│   │   ├── services/                      # Vector PDF Generator & Supabase Storage Client
│   │   ├── types/                         # Centralized TypeScript Interfaces
│   │   └── styles/                        # Tailwind CSS v4 Design System & Print Rules
│   ├── public/                            # Static Assets (favicon, icons, logo)
│   ├── index.html                         # HTML Entrypoint
│   └── package.json                       # Frontend Dependencies
│
├── backend/                               # Server-Side API Service (Node / Express)
│   ├── src/
│   │   ├── app/                           # Express Server Initialization & Middleware
│   │   ├── config/                        # Environment & Supabase Admin Client
│   │   └── routes/                        # Health & API Endpoints
│   └── package.json                       # Backend Dependencies
│
├── supabase/                              # Infrastructure & Database Migrations
│   ├── migrations/                        # Versioned PostgreSQL Migrations
│   │   ├── 20260918000000_init_stockin.sql
│   │   ├── 20260918000001_create_invoice_rpc.sql
│   │   ├── 20260918000002_documents_storage_and_history.sql
│   │   └── 20260918000003_security_and_reliability_hardening.sql
│   └── schema.sql                         # Reference Master Database Schema
│
├── docs/                                  # Technical Documentation
│   ├── ARCHITECTURE.md                    # System Design, Data Flow & Security
│   ├── DATABASE.md                        # Database ERD, Table Schemas & RLS Rules
│   └── API.md                             # Stored Procedures (RPC) & Endpoints
│
├── package.json                           # Workspace Root Orchestrator
└── README.md                              # This Documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Bun** (v1.1+ recommended) or **Node.js** (v18+) with npm
- A [Supabase](https://supabase.com) project for PostgreSQL database & storage

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Devcoderakash/StockIN.git
cd StockIN
bun install
```

### 2. Configure Environment Variables

**Frontend (`frontend/.env`):**
```bash
cp frontend/.env.example frontend/.env
```
Update with your public Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Backend (`backend/.env`):**
```bash
cp backend/.env.example backend/.env
```
Update with server settings and private keys:
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Setup Database Schema & Migrations
1. Open your Supabase Dashboard -> **SQL Editor**.
2. Run the script in [`supabase/schema.sql`](supabase/schema.sql) (or apply via CLI using `supabase db push`).
3. This creates all core tables, configures Row Level Security (RLS) policies, provisions the private `documents` bucket, and installs the atomic stored procedures (`create_invoice_rpc`, `convert_quotation_to_invoice_rpc`).

### 4. Run Development Servers
```bash
# Start frontend client on http://localhost:5173
bun run dev

# Or start backend service simultaneously:
bun run dev:backend
```

---

## 🧪 Testing & Verification

The repository includes a comprehensive unit and integration test suite (106 tests across 11 test suites) covering core business calculations, atomic RPC conversions, inventory constraints, and PDF generation:

```bash
# Run full automated test suite
bun test

# Run unit tests only
bun run test:unit

# Run integration tests only
bun run test:integration

# Type check frontend and backend
bun run typecheck

# Run linter
bun run lint
```

---

## 🚢 Deployment

### Frontend (Cloudflare Pages)
The client application is optimized for static hosting with edge caching:
```bash
cd frontend
bun run build
bun run deploy
# Or deploy dist/ directly to Vercel, Netlify, or Cloudflare Pages
```

### Backend (Node / Docker)
```bash
cd backend
bun run build
bun start
```

---

## 📋 Known Limitations & Future Roadmap

- **Multi-Warehouse Support**: Current inventory models single-facility tracking per account. Multi-warehouse transfers and bin location tracking are planned for future iterations.
- **Direct WhatsApp / SMS Delivery**: PDF invoices are exported and downloaded locally or linked via signed URL; direct automated SMS/WhatsApp API triggers can be hooked via webhook integrations.
- **Offline Sync (PWA)**: Full offline capability with background sync is planned for high-latency or unstable connectivity environments.
