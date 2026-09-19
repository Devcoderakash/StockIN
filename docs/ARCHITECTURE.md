# StockIN — Architecture & Technical Design Specification

This document details the architectural patterns, state management lifecycle, database transaction models, and security principles implemented across StockIN.

---

## 1. Architectural Principles

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                           Presentation Layer                     │
  │     (Pages, Modals, Drawers, Layout Shell, Printable A4)         │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
  ┌──────────────────────────────▼───────────────────────────────────┐
  │                            Feature Hooks                         │
  │ (useProducts, useStock, useQuotations, useInvoices, useAuth, etc)│
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
  ┌──────────────────────────────▼───────────────────────────────────┐
  │                     State & Orchestration Layer                  │
  │        (AppStateContext: Optimistic Updates & Cache)             │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
  ┌──────────────────────────────▼───────────────────────────────────┐
  │                         Feature Services                         │
  │ (productService, quotationService, invoiceService, authService)  │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
  ┌──────────────────────────────▼───────────────────────────────────┐
  │                     Supabase Client & Auth JWT                   │
  │                     (src/services/supabase/client)                 │
  └──────────────────────────────┬───────────────────────────────────┘
                                 │
  ┌──────────────────────────────▼───────────────────────────────────┐
  │                  PostgreSQL Database & RLS Layer                 │
  │  (10 Tables, Foreign Keys, Stored Procedures, Row Level Security)│
  └──────────────────────────────────────────────────────────────────┘
```

### Key Design Pillars
1. **Feature Modularity**: Code is partitioned by domain capability (`features/products`, `features/invoices`, `features/quotations`, etc.) rather than technical file types alone.
2. **Layered Decoupling**:
   - UI components do not query Supabase directly.
   - UI consumes domain-specific hooks (`useProducts()`, `useInvoices()`).
   - Hooks communicate through the central state and specialized feature services.
   - Services map camelCase TypeScript domain models to snake_case PostgreSQL schemas.
3. **Zero UI Blocking (Optimistic Updates)**:
   - Mutations immediately update React state to deliver sub-10ms UI responsiveness.
   - Writes execute asynchronously in the background. If a write fails, errors are captured, logged, and surfaced to the user.

---

## 2. Authentication & User Profile Lifecycle

1. **Authentication Provider**: Powered by Supabase Auth with email and password credentials.
2. **Session Persistence**: Sessions are saved securely in browser storage (`stockin_auth`), auto-refreshed via Supabase Auth listener (`onAuthStateChange`).
3. **Automated Profile Provisioning**:
   - When a user signs up in `auth.users`, a database trigger (`on_auth_user_created`) automatically provisions a matching row in `public.profiles`.
4. **Route Protection**:
   - `PublicOnlyRoute`: Prevents authenticated users from seeing `/login`, `/register`, or `/forgot-password`, automatically redirecting them to `/dashboard`.
   - `ProtectedRoute`: Prevents unauthenticated requests from accessing application routes, redirecting unauthenticated users to `/login`.
   - `/reset-password`: Intentionally placed outside `PublicOnlyRoute` so users following a Supabase email token link can set a new password without being intercepted.

---

## 3. Data Flow & State Hydration

1. **Initial Mount**:
   - `AppStateProvider` listens to `AuthContext`.
   - As soon as an authenticated `user.id` is available, `fetchAllUserData()` is called.
2. **Parallel Fetching**:
   - 9 database queries are fired in parallel using `Promise.all` (`products`, `customers`, `invoices`, `quotations`, `stockMovements`, `payments`, `settings`).
   - Network latency is kept to a single round-trip instead of sequential waterfalls.
3. **Local Cache**:
   - Loaded records populate React state, enabling instant searching, multi-criteria filtering, and client-side calculations without triggering redundant network requests.

---

## 4. Critical Business Workflows

### A. Quotation Lifecycle & Stock Isolation
- **Rule**: Creating, editing, duplicating, or deleting a quotation **NEVER modifies inventory**.
- Quotations serve as financial proposals and do not affect physical stock counts.
- Quotation forms cross-reference available product stock to warn if requested quantity exceeds current inventory, but inventory remains untouched.

### B. Atomic Quotation → Invoice Conversion
Converting a quotation into an active invoice is executed via an atomic database stored procedure (`convert_quotation_to_invoice_rpc`):
1. **Row Locking**: Locks the target quotation row (`FOR UPDATE`) to prevent concurrent race conditions.
2. **Validation**: Checks that quotation belongs to `auth.uid()` and is not already converted.
3. **Pre-flight Stock Check**: Verifies inventory availability across all quotation line items. If stock is insufficient, the transaction immediately aborts without changes.
4. **Atomic Execution**:
   - Inserts the new invoice into `public.invoices`.
   - Inserts all line items into `public.invoice_items`.
   - Decrements `stock` in `public.products`.
   - Generates audit trail records in `public.stock_movements` (`stock_out`).
   - Marks the quotation status as `converted` and records the linked invoice number and conversion timestamp.
   - All steps succeed together or roll back completely.

### C. Atomic Direct Invoice Creation (`create_invoice_rpc`)
Direct invoice creation replaces the unsafe client-side sequential write waterfall (`dbInsertInvoice` → `dbUpdateProduct` → `dbInsertStockMovement` → `dbUpdateCustomer` → `dbInsertPayment`) with a single atomic PostgreSQL transaction:
1. **Authentication & Tenant Isolation**: Extracts `v_user_id := auth.uid()`. Rejects unauthenticated requests with `UNAUTHENTICATED`. Verifies customer ownership.
2. **Deterministic Row Locking**: All required product IDs are sorted ascending and locked using `SELECT ... FOR UPDATE` before any data mutations occur. This prevents deadlocks and lost updates when multiple concurrent POS terminals sell overlapping inventory.
3. **Pre-flight Stock Check & Duplicate Aggregation**: Aggregates duplicate item quantities and verifies `current_database_stock >= requested_qty`. If any item exceeds available stock, the entire transaction aborts with `INSUFFICIENT_STOCK`.
4. **All-or-Nothing Mutation**:
   - Inserts the invoice record into `public.invoices`.
   - Inserts all line items into `public.invoice_items`.
   - Decrements stock in `public.products` (strictly forbids negative stock without silent clamping).
   - Generates audit movement records in `public.stock_movements` (`stock_out`).
   - Updates customer ledger in `public.customers` (`total_orders`, `total_spent`, `outstanding`).
   - Records payment in `public.payments` if `paid_amount > 0`.
   - Commits all changes simultaneously or performs complete rollback on any exception.
5. **Decoupled Client-Side Archival**: In-browser vector PDF generation and Supabase Storage cloud archival occur *after* the RPC commits. Failures in external storage do not invalidate committed financial records. Status transitions to `failed` gracefully with retry options.

### D. Stock Movements & Audit Trail
Inventory modifications occur through three distinct types:
- **`stock_in`**: Inbound shipments or purchases. Increments `stock`.
- **`stock_out`**: Invoiced sales or material delivery. Decrements `stock`.
- **`adjustment`**: Manual inventory audit corrections or breakage write-offs. Sets `stock` to the specified count.
- Every adjustment creates an immutable historical row in `public.stock_movements`.

---

## 5. Security & Row Level Security (RLS) Model

1. **Defense-in-Depth**:
   - Frontend validation and route guards ensure smooth user experience.
   - Database Row Level Security (RLS) policies serve as the ultimate boundary.
2. **Strict User Isolation**:
   - Every table contains a `user_id UUID NOT NULL DEFAULT auth.uid()`.
   - Every table enforces:
     ```sql
     CREATE POLICY "<table_name>_own" ON public.<table_name>
       FOR ALL
       USING (auth.uid() = user_id)
       WITH CHECK (auth.uid() = user_id);
     ```
   - Even if a malicious user manipulates client-side payloads, the database denies access to other users' records.
3. **Safe Error Handling**:
   - Raw database errors, table names, and PostgreSQL constraint names are intercepted by `formatAuthError` and `formatDbError`.
   - Users only see clean, actionable error messages.

---

## 6. Project Architecture & Folder Structure

```text
StockIN/
├── frontend/
│   ├── src/
│   │   ├── app/                    # Application Root, Providers, Centralized Routing
│   │   │   ├── App.tsx
│   │   │   ├── AppRoutes.tsx
│   │   │   └── providers/
│   │   ├── components/             # Reusable UI & Layout Components
│   │   │   ├── ui/                 # Atomic UI Primitives
│   │   │   ├── layout/             # AppShell, Topbar, Sidebar, Notifications, Search
│   │   │   ├── common/             # Modals, Drawers, StatCards, Badges, ConfirmDialog
│   │   │   └── feedback/           # Toasts & Status Alerts
│   │   ├── features/               # Domain-Driven Feature Modules
│   │   │   ├── auth/               # Components, Pages, Services, Hooks, Types
│   │   │   ├── dashboard/          # Dashboard Charts, Metrics & Recent Activity
│   │   │   ├── products/           # Product Catalog, Pricing & Stock Levels
│   │   │   ├── customers/          # CRM & Customer Ledgers
│   │   │   ├── quotations/         # Sales Estimates & PDF Generation
│   │   │   ├── invoices/           # Tax Invoicing, Billing, & Calculation Utils
│   │   │   ├── history/            # Document History, Server-Side Filtering, Audit Trail
│   │   │   ├── payments/           # Inward Payment Tracking & Receipts
│   │   │   ├── stock/              # Inbound Shipments, Adjustments & Audit Logs
│   │   │   ├── reports/            # Analytics & Business Intelligence
│   │   │   ├── profile/            # User Profile Domain Module
│   │   │   └── settings/           # Business Config, Tax Rules, Prefixes
│   │   ├── services/               # Central External Integrations
│   │   │   ├── supabase/           # Canonical Client & Error Formatters
│   │   │   ├── storage/            # Supabase PDF Storage Service (Signed URLs, Isolation)
│   │   │   └── pdf/                # Zero-Dependency Vector PDF 1.4 Engine
│   │   ├── hooks/                  # Global Cross-Cutting Hooks
│   │   ├── context/                # AuthContext & AppStateContext
│   │   ├── lib/                    # Validation & DB helper adapters
│   │   ├── utils/                  # Formatters & CSV Exporters
│   │   ├── types/                  # Global Root & Re-exported Domain Types
│   │   ├── constants/              # System Constants & Slugs
│   │   └── styles/                 # Tailwind CSS v4 Stylesheet
│   └── package.json
│
├── backend/                        # Node.js / Express Companion Service
│   ├── src/
│   │   ├── app/                    # Express App & Server Bootstrap
│   │   ├── routes/                 # HTTP Route Definitions
│   │   ├── controllers/            # Request Handlers
│   │   ├── services/               # Server-Side PDF & Business Logic Services
│   │   ├── middleware/             # Supabase JWT Auth & Error Handling
│   │   ├── utils/                  # Logger & Standard Response Helpers
│   │   ├── types/                  # Backend TypeScript Types
│   │   └── config/                 # Environment Configuration
│   └── package.json
│
├── supabase/                       # Single Source of Truth
│   ├── migrations/                 # Versioned SQL Migrations
│   ├── seed/                       # Seed SQL and Documentation
│   └── schema.sql                  # Canonical PostgreSQL Schema Reference
│
└── docs/                           # Architecture, Schema & API Specifications
    ├── README.md
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    └── API.md
```

---

## 7. Supabase PDF Storage & Document History Architecture (Step 5)

```text
Invoice / Quotation Finalized
          ↓
Generate Client-Side Vector PDF (PDF 1.4 stream)
          ↓
Upload to Private Supabase Storage (`documents` bucket)
Path: {user_id}/{invoices|quotations}/{id}.pdf
          ↓
Persist Metadata to PostgreSQL (`public.documents` table)
          ↓
History Section (/history)
Server-side Filters & Date Presets → Server-side Pagination (.range()) → Time-limited Signed URLs
```

### Storage Security & Isolation
- **Bucket**: `documents` (`public = false`, 10MB limit, PDF-only).
- **Storage RLS Policies**: Match tenant path prefix `(storage.foldername(name))[1] = auth.uid()::text` across `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- **Signed URL Access**: Files are downloaded and previewed exclusively via authenticated, time-limited signed URLs (`createSignedUrl(path, 300)`).

---

## 8. Environment Variable Architecture & Secret Management

StockIN enforces a strict architectural boundary between client-safe public configuration and private server-only secrets:

```text
                    StockIN
                       |
          +------------+------------+
          |                         |
       FRONTEND                  BACKEND
          |                         |
       PUBLIC ENV               PRIVATE ENV
          |                         |
    VITE_SUPABASE_URL       SERVICE_ROLE_KEY
    VITE_SUPABASE_ANON_KEY  DATABASE secrets
          |                 other server secrets
          |
       Browser
          |
       Supabase
          |
       RLS / Auth
```

### Core Security Rules

1. **"Anything prefixed with VITE_ is potentially visible to the browser."**
   - In Vite applications, any variable with the `VITE_` prefix is inlined into the client-side JavaScript bundle during build or served to the client runtime.
   - Any user can open DevTools (Sources, Network, or Console) and inspect these values.

2. **"Never place server-side secrets in VITE_ variables."**
   - Privileged keys such as `SUPABASE_SERVICE_ROLE_KEY`, database connection strings, database passwords, JWT signing secrets, and private API keys must never have a `VITE_` prefix and must never be placed in `frontend/.env`.

3. **"Supabase RLS provides authorization; the anon/publishable key is not a substitute for RLS."**
   - `VITE_SUPABASE_ANON_KEY` is a public client identifier designed to route requests to the Supabase API.
   - All tenant isolation and data protection are enforced on the database engine level via PostgreSQL Row Level Security (RLS) policies and authenticated `auth.uid()` checks.
   - A compromised or public anon key cannot access another user's rows if RLS policies are properly enforced.

### Environment Tier Responsibilities

| Tier | File Path | Scope | Visibility | Permitted Variables |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `frontend/.env` | Client SPA runtime | Public (Browser) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| **Backend** | `backend/.env` | Node.js / Express API | Private (Server only) | `PORT`, `NODE_ENV`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Templates** | `frontend/.env.example`, `backend/.env.example` | Version-controlled guides | Public | Clean placeholders and documentation comments only (no credentials) |


### Version Control & Ignore Safeguards
- All actual `.env` and `.env.*` files are strictly ignored by `.gitignore` across the root and workspace directories.
- Only `.env.example` files containing dummy placeholders are tracked in Git.
- Vite build configuration (`frontend/vite.config.ts`) has zero custom `define` blocks or secret injection mechanisms.
- Zero shared configuration modules exist between frontend and backend that could leak server credentials into client code.



