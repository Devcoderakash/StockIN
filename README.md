# StockIN — Enterprise Inventory, Quotation & Invoicing Suite
### Production Monorepo: Frontend + Backend + Supabase (PostgreSQL & Storage)

StockIN is a high-performance inventory, stock movement, customer CRM, quotation estimate, GST tax invoicing, and document history platform powered by **React 19**, **TypeScript**, **Vite**, **Supabase (PostgreSQL with RLS & Supabase Storage)**, and **Tailwind CSS**.

---

## 📁 Repository Structure

```
StockIN/
├── frontend/                              # React 19 + TypeScript + Vite Client Application
│   ├── src/
│   │   ├── app/                           # App Root, Routes, Providers & App Config
│   │   ├── components/                    # Modular UI Library (ui, layout, common, forms, modals, feedback)
│   │   ├── features/                      # Domain Modules (auth, products, stock, customers, quotations, invoices, payments, history, reports, settings)
│   │   ├── hooks/                         # Centralized Hooks
│   │   ├── lib/                           # Supabase Client & Form Validators
│   │   ├── services/                      # Vector PDF Generation & Supabase Storage Client
│   │   ├── types/                         # TypeScript Domain Interfaces
│   │   ├── constants/                     # Business Rules & Constants
│   │   ├── utils/                         # Formatters & CSV Export
│   │   └── styles/                        # Tailwind CSS v4 Stylesheet
│   ├── public/                            # Static web assets
│   ├── index.html                         # SPA Entrypoint
│   ├── package.json                       # Frontend Dependencies
│   └── vite.config.ts                     # Vite Configuration
│
├── backend/                               # Dedicated Server-Side Service (Node/TypeScript)
│   ├── src/
│   │   ├── app/                           # Express App & Server Initialization
│   │   ├── config/                        # Environment & Constants
│   │   ├── routes/                        # Health Routes
│   │   ├── middleware/                    # Auth (Supabase JWT) & Error Handling
│   │   └── types/                         # Backend TypeScript Types
│   └── package.json                       # Backend Dependencies
│
├── supabase/                              # Single Source of Truth Infrastructure
│   ├── migrations/                        # Versioned SQL Migrations
│   │   ├── 20260918000000_init_stockin.sql
│   │   ├── 20260918000001_create_invoice_rpc.sql
│   │   ├── 20260918000002_documents_storage_and_history.sql
│   │   └── 20260918000003_security_and_reliability_hardening.sql
│   ├── schema.sql                         # Reference Master Schema (Tables, RLS, Triggers, RPC, Storage)
│   └── config.toml                        # Supabase CLI Configuration
│
├── docs/                                  # Complete System Documentation
│   ├── ARCHITECTURE.md                    # Architecture & Security Specification
│   ├── DATABASE.md                        # Database ERD, Schema, and RLS Details
│   └── API.md                             # RPC, Edge Functions, and Backend Endpoints
│
├── .gitignore                             # Monorepo Git Ignore
├── README.md                              # This Document
└── package.json                           # Workspace Orchestrator
```

---

## 🚀 Quick Start

### 1. Prerequisites
- [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/) (v18+)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local development)

### 2. Install Workspace Dependencies
From the repository root:
```bash
bun install
# or npm install
```

### 3. Configure Environment Variables

**Frontend (Client-Safe Configuration):**
```bash
cp frontend/.env.example frontend/.env
```
Set your public Supabase project URL and anonymous key:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Backend (Server Secrets & Configuration):**
```bash
cp backend/.env.example backend/.env
```
Set your backend server port, CORS origin, and private credentials (including `SUPABASE_SERVICE_ROLE_KEY`).


### 4. Supabase Database Migration
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy and paste the contents of [`supabase/schema.sql`](supabase/schema.sql) (or run the migration via CLI: `supabase db push`).
4. Click **Run**.
   - This creates all 10 tables, enables Row Level Security (RLS) on all tables, and creates the atomic `convert_quotation_to_invoice_rpc` stored procedure.

---

## 🛠️ Development & Build Commands

### Root Workspace Commands

| Command | Description |
|---|---|
| `bun run dev` (or `bun run dev:frontend`) | Starts the frontend Vite development server on `http://localhost:5173` |
| `bun run dev:backend` | Starts the backend Node/Express service on `http://localhost:3001` |
| `bun run build` | Builds both frontend and backend for production |
| `bun run build:frontend` | Builds frontend (`tsc -b && vite build`) into `frontend/dist/` |
| `bun run build:backend` | Compiles backend (`tsc`) into `backend/dist/` |
| `bun run lint` | Runs Oxlint linter across frontend |

### Individual Package Commands

```bash
# Frontend
cd frontend
bun run dev
bun run build

# Backend
cd backend
bun run dev
bun run build
```

---

## ☁️ Supabase PDF Document Archiving & History

StockIN archives generated vector PDF invoices and quotations in a private **Supabase Storage** bucket (`documents`) with strict PostgreSQL Row Level Security (RLS) policies and complete document history tracking.

### Architecture Highlights:
1. **Multi-Tenant Path Isolation**: Stored under `{user_id}/invoices/{id}.pdf` and `{user_id}/quotations/{id}.pdf`.
2. **Private & Secure**: The `documents` bucket is private (`public = false`). Direct file access is strictly blocked without valid authentication tokens.
3. **Time-Limited Signed URLs**: Client-side document viewing and downloads generate secure 10-minute temporary signed URLs (`createDocumentSignedUrl`).
4. **Decoupled Resilience**: Document archiving runs in the background. A storage failure never aborts or rolls back database transactions.
5. **On-Demand Self-Healing**: If an older invoice lacks an archived PDF, the system automatically regenerates and archives it on-the-fly upon preview or download request.

---

## 🔒 Security & Business Rules

1. **Row Level Security (RLS)**: Every user's data is isolated at the PostgreSQL database level using `auth.uid() = user_id`. User A can never read, modify, or delete User B's records.
2. **Zero Client Secrets**: Google Service Account credentials, private keys, and Supabase service-role keys are never included in frontend builds.
3. **Quotation vs. Invoice Integrity**:
   - **Quotations**: Pure sales estimates. Creating, updating, duplicating, or deleting quotations **never** modifies inventory.
   - **Invoices**: Tax invoices. Creating an invoice decrements product stock and records `STOCK_OUT` audit trail movements.
   - **Conversion**: Converting a quotation to an invoice runs atomically via `convert_quotation_to_invoice_rpc` with duplicate conversion protection.
4. **Decoupled Supabase Storage**: Private storage is exclusively for document archiving. A network or storage failure never rolls back invoices or inventory changes; failed uploads can be retried safely.
