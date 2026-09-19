# StockIN Documentation Hub

Welcome to the technical documentation for **StockIN** — an Enterprise Inventory, Quotation, CRM & GST Invoicing Suite.

---

## 📚 Documentation Index

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architectural patterns, feature-based modular layout, layer separation, state management, and security model. |
| [DATABASE.md](./DATABASE.md) | PostgreSQL schema, 10 table specifications, Entity-Relationship Diagram (ERD), Row Level Security (RLS) policies, and performance indexes. |
| [API.md](./API.md) | Supabase Storage (`documents`), Stored Procedures (`create_invoice_rpc`, `convert_quotation_to_invoice_rpc`), and Express endpoints. |

---

## 🏛️ System Overview

StockIN is organized into a clean 3-tier monorepo structure:
- **`frontend/`**: React 19 + TypeScript + Vite SPA utilizing a feature-based architecture (`features/`), canonical integration services (`services/`), and reusable UI/Layout blocks (`components/`).
- **`backend/`**: Node.js / Express companion backend (`backend/src/`) for health monitoring, auxiliary tasks, and document proxying.
- **`supabase/`**: PostgreSQL database migrations (`supabase/migrations/`), Edge Functions (`supabase/functions/`), and CLI configuration.
