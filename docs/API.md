# StockIN — API & Services Specification

This document details the interfaces, endpoints, Supabase Storage services, and PostgreSQL RPC stored procedures across the StockIN platform.

---

## 1. Supabase Storage & Document History

Vector PDF invoices and quotations are archived into the private `documents` Supabase Storage bucket with PostgreSQL Row Level Security (RLS) policies.

### Storage Layout
- **Invoices**: `{user_id}/invoices/{invoice_id}.pdf`
- **Quotations**: `{user_id}/quotations/{quotation_id}.pdf`

### Client Services (`src/services/storage/documentStorageService.ts`)

#### `uploadInvoicePdf(invoice, settings)`
Generates client-side vector PDF 1.4, uploads to private `documents` bucket, and upserts metadata into `public.documents`.

#### `uploadQuotationPdf(quotation, settings)`
Generates client-side vector PDF 1.4, uploads to private `documents` bucket, and upserts metadata into `public.documents`.

#### `createDocumentSignedUrl(filePath, expiresInSeconds, context)`
Generates a time-limited signed URL (default 600s / 10 minutes) for authorized viewing and downloading.
- Normalizes paths automatically using `normalizeStoragePath`.
- Evaluates storage tenant isolation: `(storage.foldername(name))[1] = auth.uid()::text`.

#### `downloadDocumentPdf(filePath, fileName, context)`
Downloads file bytes from private storage bucket and triggers a browser download. Falls back to signed token retrieval.

---

## 2. Supabase Stored Procedures (RPC)

### `public.create_invoice_rpc`

Executes atomic direct invoice creation inside a single PostgreSQL ACID transaction.

#### Parameters
- `p_invoice` (`JSONB`): Invoice header payload (invoice_number, customer_id, date, due_date, subtotal, tax, grand_total, etc.)
- `p_items` (`JSONB`): Array of line items (product_id, quantity, rate, tax, discount, amount)
- `p_payment` (`JSONB` optional): Payment record if `paid_amount > 0`

#### Guarantees
1. Authenticates `auth.uid()` (rejects unauthenticated callers with `UNAUTHENTICATED`).
2. Locks customer row with `FOR UPDATE` scoped to `user_id`.
3. Locks all products deterministically in ascending ID order to prevent deadlocks.
4. Aggregates quantities across duplicate product line items.
5. Aborts and rolls back completely if any product has insufficient warehouse stock.
6. Deducts stock, records `STOCK_OUT` audit movements, creates invoice items, updates customer ledger, and commits atomically.

---

### `public.convert_quotation_to_invoice_rpc`

Performs atomic quotation conversion and inventory decrement.

#### Parameters
- `p_quotation_id` (`TEXT`): ID of the quotation to convert.
- `p_invoice_id` (`TEXT`): Target invoice ID.
- `p_invoice_number` (`TEXT`): Generated invoice number (e.g. `INV-00045`).
- `p_today` (`TEXT`): ISO date string for invoice date.
- `p_payment_terms` (`TEXT`): Payment terms string.

#### Guarantees
1. Validates quotation ownership (`WHERE user_id = auth.uid() FOR UPDATE`).
2. Rejects duplicate conversions (`status = 'converted'`).
3. Validates stock across all quotation line items before making modifications.
4. Decrements stock, inserts `STOCK_OUT` movements, creates the invoice, marks quotation converted, and commits atomically.

---

## 3. Dedicated Backend Server Endpoints

Base URL: `http://localhost:3001/api/v1`

### 1. Health Check
```http
GET /api/v1/health
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "StockIN Backend",
    "timestamp": "2026-09-18T14:30:00.000Z"
  }
}
```

CORS is restricted in production to the configured frontend domain (`FRONTEND_URL`), preventing unauthorized cross-origin requests.
