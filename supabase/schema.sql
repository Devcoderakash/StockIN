-- ==============================================================================
-- StockIN - Production Database Schema & Row Level Security (RLS)
-- Version: 3.0 (Full Supabase DB Integration)
--
-- HOW TO RUN:
--   Open your Supabase Dashboard → SQL Editor → paste this entire file → Run.
--   This script is idempotent — safe to run multiple times on the same database.
--
-- SECURITY MODEL:
--   - All tables use Row Level Security (RLS).
--   - Every policy uses auth.uid() from the server JWT — NEVER from client input.
--   - The service-role key (server-only) bypasses RLS — never expose it to frontend.
-- ==============================================================================


-- ==============================================================================
-- HELPERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- 1. PROFILES  (one row per auth.users entry, auto-created by trigger)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  business_name TEXT,
  phone         TEXT,
  email         TEXT,
  created_at    TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name',     new.raw_user_meta_data->>'fullName',     ''),
    COALESCE(new.raw_user_meta_data->>'business_name', new.raw_user_meta_data->>'businessName', ''),
    new.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==============================================================================
-- 2. PRODUCTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
  id                  TEXT PRIMARY KEY,
  user_id             UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  sku                 TEXT DEFAULT ('PRD-' || substr(md5(random()::text), 1, 8)),
  category            TEXT,
  brand               TEXT,
  unit                TEXT,
  purchase_price      NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  selling_price       NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  stock               INTEGER DEFAULT 0 NOT NULL,
  min_stock           INTEGER DEFAULT 5 NOT NULL,
  low_stock_threshold INTEGER,
  tax_rate            NUMERIC(5, 2) DEFAULT 18 NOT NULL,
  gst_rate            NUMERIC(5, 2),
  hsn_code            TEXT,
  description         TEXT,
  billing_type        TEXT DEFAULT 'standard' NOT NULL
                        CHECK (billing_type IN ('standard','dimension')),
  dimension_type      TEXT DEFAULT 'length_width'
                        CHECK (dimension_type IN ('length_width','length_width_height')),
  dimension_unit      TEXT DEFAULT 'ft',
  billing_unit        TEXT DEFAULT 'sq.ft',
  status              TEXT DEFAULT 'in_stock' NOT NULL
                        CHECK (status IN ('in_stock','low_stock','out_of_stock','archived')),
  created_at          TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ==============================================================================
-- 3. CUSTOMERS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  company_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  city         TEXT,
  state        TEXT,
  gstin        TEXT,
  total_orders INTEGER DEFAULT 0 NOT NULL,
  total_spent  NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  outstanding  NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  status       TEXT DEFAULT 'active' NOT NULL
                 CHECK (status IN ('active','inactive')),
  created_at   TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==============================================================================
-- 4. INVOICES
--    Includes cgst / sgst for GST split display on invoice prints.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number   TEXT NOT NULL,
  customer_id      TEXT NOT NULL,
  customer_name    TEXT NOT NULL,
  customer_company TEXT,
  customer_phone   TEXT,
  customer_email   TEXT,
  customer_address TEXT,
  customer_gstin   TEXT,
  date             TEXT NOT NULL,
  due_date         TEXT,
  payment_terms    TEXT,
  subtotal         NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  discount_total   NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  cgst             NUMERIC(12, 2) DEFAULT 0,
  sgst             NUMERIC(12, 2) DEFAULT 0,
  tax_total        NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  grand_total      NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  paid_amount      NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  balance          NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  status           TEXT DEFAULT 'due' NOT NULL
                     CHECK (status IN ('paid','partial','due')),
  notes            TEXT,
  -- Google Drive PDF Document Storage
  google_drive_file_id TEXT,
  google_drive_web_url TEXT,
  pdf_status           TEXT DEFAULT 'pending' NOT NULL
                         CHECK (pdf_status IN ('pending', 'uploaded', 'failed')),
  pdf_uploaded_at      TIMESTAMPTZ,
  pdf_error            TEXT,
  created_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==============================================================================
-- 5. INVOICE ITEMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id               TEXT PRIMARY KEY,
  invoice_id       TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL,
  product_name     TEXT NOT NULL,
  sku              TEXT,
  hsn_code         TEXT,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  rate             NUMERIC(12, 2) NOT NULL CHECK (rate >= 0),
  discount_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL,
  tax_rate         NUMERIC(5, 2) DEFAULT 0 NOT NULL,
  tax_amount       NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  amount           NUMERIC(12, 2) NOT NULL,
  billing_type     TEXT DEFAULT 'standard' NOT NULL
                     CHECK (billing_type IN ('standard','dimension')),
  length           NUMERIC(12, 3),
  width            NUMERIC(12, 3),
  height           NUMERIC(12, 3),
  dimension_unit   TEXT,
  billing_unit     TEXT,
  billable_quantity NUMERIC(12, 3)
);


-- ==============================================================================
-- 6. QUOTATIONS
--    Quotations NEVER deduct stock. Only conversion to invoice does.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id                       TEXT PRIMARY KEY,
  user_id                  UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_number         TEXT NOT NULL,
  customer_id              TEXT NOT NULL,
  customer_name            TEXT NOT NULL,
  customer_company         TEXT,
  customer_phone           TEXT,
  customer_email           TEXT,
  customer_address         TEXT,
  customer_gstin           TEXT,
  quotation_date           TEXT NOT NULL,
  valid_until              TEXT,
  subtotal                 NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  discount_total           NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  cgst                     NUMERIC(12, 2) DEFAULT 0,
  sgst                     NUMERIC(12, 2) DEFAULT 0,
  tax_total                NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  grand_total              NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  notes                    TEXT,
  terms                    TEXT,
  status                   TEXT DEFAULT 'draft' NOT NULL
                             CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  converted_invoice_id     TEXT,
  converted_invoice_number TEXT,
  converted_at             TEXT,
  -- Google Drive PDF Document Storage
  google_drive_file_id     TEXT,
  google_drive_web_url     TEXT,
  pdf_status               TEXT DEFAULT 'pending' NOT NULL
                             CHECK (pdf_status IN ('pending', 'uploaded', 'failed')),
  pdf_uploaded_at          TIMESTAMPTZ,
  pdf_error                TEXT,
  created_at               TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at               TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS set_quotations_updated_at ON public.quotations;
CREATE TRIGGER set_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ==============================================================================
-- 7. QUOTATION ITEMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id               TEXT PRIMARY KEY,
  quotation_id     TEXT NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL,
  product_name     TEXT NOT NULL,
  sku              TEXT,
  hsn_code         TEXT,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  rate             NUMERIC(12, 2) NOT NULL CHECK (rate >= 0),
  discount_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL,
  tax_rate         NUMERIC(5, 2) DEFAULT 0 NOT NULL,
  tax_amount       NUMERIC(12, 2) DEFAULT 0 NOT NULL,
  amount           NUMERIC(12, 2) NOT NULL,
  billing_type     TEXT DEFAULT 'standard' NOT NULL
                     CHECK (billing_type IN ('standard','dimension')),
  length           NUMERIC(12, 3),
  width            NUMERIC(12, 3),
  height           NUMERIC(12, 3),
  dimension_unit   TEXT,
  billing_unit     TEXT,
  billable_quantity NUMERIC(12, 3)
);


-- ==============================================================================
-- 8. STOCK MOVEMENTS  (append-only audit log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id             TEXT PRIMARY KEY,
  user_id        UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date           TEXT NOT NULL,
  product_id     TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  sku            TEXT,
  type           TEXT NOT NULL
                   CHECK (type IN ('stock_in','stock_out','adjustment','return')),
  quantity       INTEGER NOT NULL,
  reference      TEXT,
  previous_stock INTEGER NOT NULL,
  new_stock      INTEGER NOT NULL,
  reason         TEXT,
  purchase_rate  NUMERIC(12, 2),
  created_at     TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==============================================================================
-- 9. PAYMENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id   TEXT NOT NULL,
  type             TEXT DEFAULT 'inward' NOT NULL CHECK (type IN ('inward','outward')),
  party_type       TEXT DEFAULT 'customer' NOT NULL CHECK (party_type IN ('customer','supplier')),
  party_id         TEXT,
  party_name       TEXT NOT NULL,
  invoice_id       TEXT,
  invoice_number   TEXT,
  amount           NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method           TEXT NOT NULL,
  date             TEXT NOT NULL,
  reference_number TEXT,
  status           TEXT DEFAULT 'completed' NOT NULL
                     CHECK (status IN ('completed','pending','failed')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ==============================================================================
-- 10. BUSINESS SETTINGS  (one row per user, JSONB for flexibility)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.business_settings (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS set_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER set_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ==============================================================================
-- SAFE COLUMN ADDITIONS (idempotent — no-op if column already exists)
-- ==============================================================================
ALTER TABLE public.invoices    ADD COLUMN IF NOT EXISTS cgst NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.invoices    ADD COLUMN IF NOT EXISTS sgst NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.quotations  ADD COLUMN IF NOT EXISTS cgst NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.quotations  ADD COLUMN IF NOT EXISTS sgst NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.quotations  ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE public.payments    ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS created_at
  TIMESTAMPTZ DEFAULT timezone('utc'::text, now());


-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies before recreating (idempotent)
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN (
      'profiles','products','customers','invoices','invoice_items',
      'quotations','quotation_items','stock_movements','payments','business_settings'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END;
$$;

-- profiles: keyed by id = auth.uid()
CREATE POLICY "profiles_own" ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- all other tables: keyed by user_id = auth.uid()
CREATE POLICY "products_own"          ON public.products          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "customers_own"         ON public.customers         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoices_own"          ON public.invoices          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "invoice_items_own"     ON public.invoice_items     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotations_own"        ON public.quotations        FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quotation_items_own"   ON public.quotation_items   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stock_movements_own"   ON public.stock_movements   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payments_own"          ON public.payments          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "business_settings_own" ON public.business_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ==============================================================================
-- INDEXES  (significantly improve query performance under load)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_user_id        ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku            ON public.products(user_id, sku);
CREATE INDEX IF NOT EXISTS idx_customers_user_id       ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id        ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id    ON public.invoices(user_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date           ON public.invoices(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice   ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_user      ON public.invoice_items(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_user_id      ON public.quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id  ON public.quotations(user_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quot    ON public.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_user    ON public.quotation_items(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user    ON public.stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id        ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id     ON public.payments(user_id, invoice_id);


-- ==============================================================================
-- RPC: ATOMIC QUOTATION → INVOICE CONVERSION
--
-- This function runs as a single PostgreSQL transaction.
-- Any error inside rolls back ALL changes (invoice, stock, movements, customer).
-- The frontend calls this via: supabase.rpc('convert_quotation_to_invoice_rpc', {...})
--
-- Security: uses auth.uid() internally — NEVER trusts user_id from the call params.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.convert_quotation_to_invoice_rpc(
  p_quotation_id   TEXT,
  p_invoice_id     TEXT,
  p_invoice_number TEXT,
  p_today          TEXT,
  p_payment_terms  TEXT DEFAULT 'Due on Receipt'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quotation    RECORD;
  v_item         RECORD;
  v_prev_stock   INTEGER;
  v_new_stock    INTEGER;
  v_user_id      UUID := auth.uid();
  v_stock_errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- ── 0. Must be authenticated ──────────────────────────────────────────────
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- ── 1. Load & validate quotation (must belong to this user) ──────────────
  SELECT * INTO v_quotation
  FROM public.quotations
  WHERE id = p_quotation_id AND user_id = v_user_id
  FOR UPDATE;                          -- Lock the row to prevent concurrent conversion

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quotation not found.');
  END IF;

  -- ── 2. Prevent duplicate conversion ──────────────────────────────────────
  IF v_quotation.status = 'converted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quotation ' || v_quotation.quotation_number
               || ' is already converted to Invoice '
               || COALESCE(v_quotation.converted_invoice_number,
                            v_quotation.converted_invoice_id, 'unknown') || '.'
    );
  END IF;

  -- ── 3. Pre-flight stock check (ALL items before touching anything) ────────
  FOR v_item IN
    SELECT qi.*, p.stock AS current_stock
    FROM public.quotation_items qi
    LEFT JOIN public.products p
           ON p.id = qi.product_id AND p.user_id = v_user_id
    WHERE qi.quotation_id = p_quotation_id AND qi.user_id = v_user_id
  LOOP
    IF v_item.current_stock IS NULL THEN
      v_stock_errors := array_append(v_stock_errors,
        '"' || v_item.product_name || '" not found in current inventory.');
    ELSIF v_item.current_stock < v_item.quantity THEN
      v_stock_errors := array_append(v_stock_errors,
        '"' || v_item.product_name
        || '" (Required: ' || v_item.quantity
        || ', Available: ' || v_item.current_stock || ')');
    END IF;
  END LOOP;

  IF array_length(v_stock_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient stock:' || chr(10) || array_to_string(v_stock_errors, chr(10))
    );
  END IF;

  -- ── 4. Create invoice ─────────────────────────────────────────────────────
  INSERT INTO public.invoices (
    id, user_id, invoice_number,
    customer_id, customer_name, customer_company,
    customer_phone, customer_email, customer_address, customer_gstin,
    date, due_date, payment_terms,
    subtotal, discount_total, tax_total, grand_total,
    paid_amount, balance, status, notes
  ) VALUES (
    p_invoice_id, v_user_id, p_invoice_number,
    v_quotation.customer_id, v_quotation.customer_name,
    v_quotation.customer_company, v_quotation.customer_phone,
    v_quotation.customer_email,  v_quotation.customer_address,
    v_quotation.customer_gstin,
    p_today, COALESCE(v_quotation.valid_until, p_today), p_payment_terms,
    v_quotation.subtotal, v_quotation.discount_total,
    v_quotation.tax_total, v_quotation.grand_total,
    0, v_quotation.grand_total, 'due',
    'Converted from Quotation ' || v_quotation.quotation_number
  );

  -- ── 5. Copy items, deduct stock, log movements ────────────────────────────
  FOR v_item IN
    SELECT * FROM public.quotation_items
    WHERE quotation_id = p_quotation_id AND user_id = v_user_id
    ORDER BY id
  LOOP
    -- 5a. Invoice item with dimension preservation
    INSERT INTO public.invoice_items (
      id, invoice_id, user_id,
      product_id, product_name, sku, hsn_code,
      quantity, rate, discount_percent, tax_rate, tax_amount, amount,
      billing_type, length, width, height, dimension_unit, billing_unit, billable_quantity
    ) VALUES (
      'ii-' || substr(md5(p_invoice_id || v_item.id || random()::text), 1, 12),
      p_invoice_id, v_user_id,
      v_item.product_id, v_item.product_name, v_item.sku, v_item.hsn_code,
      v_item.quantity, v_item.rate, v_item.discount_percent,
      v_item.tax_rate, v_item.tax_amount, v_item.amount,
      COALESCE(v_item.billing_type, 'standard'),
      v_item.length,
      v_item.width,
      v_item.height,
      v_item.dimension_unit,
      v_item.billing_unit,
      COALESCE(v_item.billable_quantity, v_item.quantity)
    );

    -- 5b. Get current stock (fresh read inside transaction)
    SELECT stock INTO v_prev_stock
    FROM public.products
    WHERE id = v_item.product_id AND user_id = v_user_id
    FOR UPDATE;

    v_new_stock := GREATEST(0, v_prev_stock - v_item.quantity);

    -- 5c. Update product stock + status
    UPDATE public.products
    SET
      stock      = v_new_stock,
      status     = CASE
                     WHEN v_new_stock <= 0          THEN 'out_of_stock'
                     WHEN v_new_stock <= min_stock  THEN 'low_stock'
                     ELSE                                'in_stock'
                   END,
      updated_at = NOW()
    WHERE id = v_item.product_id AND user_id = v_user_id;

    -- 5d. Stock-Out movement
    INSERT INTO public.stock_movements (
      id, user_id, date,
      product_id, product_name, sku,
      type, quantity, reference, previous_stock, new_stock, reason
    ) VALUES (
      'mov-' || substr(md5(p_invoice_id || v_item.id || 'out'), 1, 14),
      v_user_id, p_today,
      v_item.product_id, v_item.product_name, v_item.sku,
      'stock_out', -v_item.quantity, p_invoice_number,
      v_prev_stock, v_new_stock,
      'Quotation ' || v_quotation.quotation_number
        || ' → Invoice ' || p_invoice_number
    );
  END LOOP;

  -- ── 6. Update customer financials ─────────────────────────────────────────
  UPDATE public.customers
  SET
    total_orders = total_orders + 1,
    total_spent  = total_spent  + v_quotation.grand_total,
    outstanding  = outstanding  + v_quotation.grand_total,
    status       = 'active'
  WHERE id = v_quotation.customer_id AND user_id = v_user_id;

  -- ── 7. Mark quotation converted (prevents duplicate) ─────────────────────
  UPDATE public.quotations
  SET
    status                   = 'converted',
    converted_invoice_id     = p_invoice_id,
    converted_invoice_number = p_invoice_number,
    converted_at             = p_today,
    updated_at               = NOW()
  WHERE id = p_quotation_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'success',        true,
    'invoice_id',     p_invoice_id,
    'invoice_number', p_invoice_number
  );

EXCEPTION WHEN OTHERS THEN
  -- Any exception rolls back ALL changes within this function
  RETURN jsonb_build_object('success', false, 'error', 'Conversion failed: ' || SQLERRM);
END;
$$;

-- Grant execute to authenticated users (RLS inside the function handles ownership)
REVOKE ALL ON FUNCTION public.convert_quotation_to_invoice_rpc FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_quotation_to_invoice_rpc TO authenticated;


-- ==============================================================================
-- 12. ATOMIC DIRECT INVOICE CREATION RPC
--     Single PostgreSQL transaction for direct invoice creation.
--     Handles deterministic row locking, stock validation, invoice & items insert,
--     stock deduction, audit logging, customer ledger update, and auto-payment.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_invoice_rpc(
  p_invoice JSONB,
  p_items   JSONB DEFAULT NULL,
  p_payment JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id          UUID := auth.uid();
  v_items            JSONB;
  v_customer_id      TEXT;
  v_customer         RECORD;
  v_product_ids      TEXT[];
  v_stock_errors     TEXT[] := ARRAY[]::TEXT[];
  v_req_rec          RECORD;
  v_item_rec         RECORD;
  v_invoice_id       TEXT;
  v_invoice_number   TEXT;
  v_date             TEXT;
  v_due_date         TEXT;
  v_payment_terms    TEXT;
  v_subtotal         NUMERIC;
  v_discount_total   NUMERIC;
  v_cgst             NUMERIC;
  v_sgst             NUMERIC;
  v_tax_total        NUMERIC;
  v_grand_total      NUMERIC;
  v_paid_amount      NUMERIC;
  v_balance          NUMERIC;
  v_status           TEXT;
  v_notes            TEXT;
  v_prev_stock       INTEGER;
  v_new_stock        INTEGER;
  v_billable_qty     NUMERIC;
  v_item_billing     TEXT;
  v_line_base        NUMERIC;
  v_disc_amt         NUMERIC;
  v_taxable          NUMERIC;
  v_tax_amt          NUMERIC;
  v_line_amt         NUMERIC;
BEGIN
  -- ── 0. Authenticate & Enforce Tenant Isolation ─────────────────────────────
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'UNAUTHENTICATED',
      'error', 'Authentication required. No authenticated user context.'
    );
  END IF;

  -- ── 1. Extract & Validate Input ────────────────────────────────────────────
  IF p_invoice IS NULL OR jsonb_typeof(p_invoice) != 'object' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INPUT',
      'error', 'Invoice payload is required and must be an object.'
    );
  END IF;

  -- Extract items (support explicit p_items or nested p_invoice->'items')
  v_items := COALESCE(p_items, p_invoice->'items');
  IF v_items IS NULL OR jsonb_typeof(v_items) != 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INPUT',
      'error', 'Invoice must contain at least one line item.'
    );
  END IF;

  v_customer_id := p_invoice->>'customer_id';
  IF v_customer_id IS NULL OR trim(v_customer_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INPUT',
      'error', 'Customer ID is required.'
    );
  END IF;

  v_invoice_number := p_invoice->>'invoice_number';
  IF v_invoice_number IS NULL OR trim(v_invoice_number) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INPUT',
      'error', 'Invoice number is required.'
    );
  END IF;

  -- Check for duplicate invoice number within this user tenant
  PERFORM 1
  FROM public.invoices
  WHERE invoice_number = v_invoice_number AND user_id = v_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_INVOICE',
      'error', 'Invoice number ' || v_invoice_number || ' already exists.'
    );
  END IF;

  -- ── 2. Verify and Lock Customer (Tenant Scoped) ────────────────────────────
  SELECT
    id, name, company_name, phone, email, address, gstin,
    total_orders, total_spent, outstanding
  INTO v_customer
  FROM public.customers
  WHERE id = v_customer_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Resilient fallback: auto-create or upsert customer using invoice details
    IF v_customer_id IS NOT NULL AND v_customer_id <> '' THEN
      INSERT INTO public.customers (
        id, user_id, name, company_name, phone, email, address, gstin,
        total_orders, total_spent, outstanding, status
      ) VALUES (
        v_customer_id,
        v_user_id,
        COALESCE(NULLIF(TRIM(v_invoice->>'customer_name'), ''), 'Customer'),
        NULLIF(TRIM(v_invoice->>'customer_company'), ''),
        NULLIF(TRIM(v_invoice->>'customer_phone'), ''),
        NULLIF(TRIM(v_invoice->>'customer_email'), ''),
        NULLIF(TRIM(v_invoice->>'customer_address'), ''),
        NULLIF(TRIM(v_invoice->>'customer_gstin'), ''),
        0, 0, 0, 'active'
      )
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name
      RETURNING
        id, name, company_name, phone, email, address, gstin,
        total_orders, total_spent, outstanding
      INTO v_customer;
    END IF;

    IF v_customer.id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'CUSTOMER_NOT_FOUND',
        'error', 'Customer not found or does not belong to the current user.'
      );
    END IF;
  END IF;

  -- ── 3. Deterministic Product Locking (Deadlock Prevention) ─────────────────
  -- Extract sorted array of distinct product IDs
  SELECT array_agg(DISTINCT item.product_id ORDER BY item.product_id)
  INTO v_product_ids
  FROM jsonb_to_recordset(v_items) AS item(product_id TEXT);

  IF v_product_ids IS NULL OR array_length(v_product_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INPUT',
      'error', 'Line items must contain valid product IDs.'
    );
  END IF;

  -- Lock all product rows in strictly deterministic ascending order
  PERFORM 1
  FROM public.products
  WHERE id = ANY(v_product_ids) AND user_id = v_user_id
  ORDER BY id
  FOR UPDATE;

  -- ── 4. Stock Validation with Duplicate Product Aggregation ─────────────────
  -- Sum total quantity requested per product across all line items
  FOR v_req_rec IN
    SELECT
      req.product_id,
      req.total_qty,
      req.item_name,
      p.id AS product_found,
      p.name AS live_name,
      p.stock AS live_stock,
      p.sku AS live_sku,
      p.min_stock AS live_min_stock
    FROM (
      SELECT
        item.product_id,
        SUM(item.quantity)::INTEGER AS total_qty,
        MAX(item.product_name) AS item_name
      FROM jsonb_to_recordset(v_items) AS item(
        product_id TEXT,
        quantity INTEGER,
        product_name TEXT
      )
      GROUP BY item.product_id
    ) req
    LEFT JOIN public.products p
      ON p.id = req.product_id AND p.user_id = v_user_id
    ORDER BY req.product_id
  LOOP
    IF v_req_rec.product_found IS NULL THEN
      v_stock_errors := array_append(
        v_stock_errors,
        'Product "' || COALESCE(v_req_rec.item_name, v_req_rec.product_id) || '" not found in current inventory.'
      );
    ELSIF v_req_rec.live_stock < v_req_rec.total_qty THEN
      v_stock_errors := array_append(
        v_stock_errors,
        '"' || v_req_rec.live_name || '" (Required: ' || v_req_rec.total_qty
        || ', Available: ' || v_req_rec.live_stock || ')'
      );
    END IF;
  END LOOP;

  -- If any stock constraint is violated, abort immediately without modifying any state
  IF array_length(v_stock_errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_STOCK',
      'error', 'Insufficient warehouse stock:' || chr(10) || array_to_string(v_stock_errors, chr(10))
    );
  END IF;

  -- ── 4b. Dimensional Item Validation ────────────────────────────────────────
  FOR v_item_rec IN
    SELECT * FROM jsonb_to_recordset(v_items) AS (
      billing_type TEXT,
      length NUMERIC,
      width NUMERIC,
      product_name TEXT
    )
  LOOP
    IF v_item_rec.billing_type = 'dimension' THEN
      IF COALESCE(v_item_rec.length, 0) <= 0 OR COALESCE(v_item_rec.width, 0) <= 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INVALID_DIMENSIONS',
          'error', 'Length and width must be greater than 0 for dimension-based product: ' || COALESCE(v_item_rec.product_name, 'Item')
        );
      END IF;
    END IF;
  END LOOP;

  -- ── 5. Prepare Financials & Create Invoice ──────────────────────────────────
  v_invoice_id     := COALESCE(p_invoice->>'id', 'inv-' || substr(md5(random()::text), 1, 10));
  v_date           := COALESCE(p_invoice->>'date', to_char(NOW(), 'YYYY-MM-DD'));
  v_due_date       := p_invoice->>'due_date';
  v_payment_terms  := COALESCE(p_invoice->>'payment_terms', 'Due on Receipt');
  v_subtotal       := COALESCE((p_invoice->>'subtotal')::NUMERIC, 0);
  v_discount_total := COALESCE((p_invoice->>'discount_total')::NUMERIC, 0);
  v_cgst           := COALESCE((p_invoice->>'cgst')::NUMERIC, 0);
  v_sgst           := COALESCE((p_invoice->>'sgst')::NUMERIC, 0);
  v_tax_total      := COALESCE((p_invoice->>'tax_total')::NUMERIC, 0);
  v_grand_total    := COALESCE((p_invoice->>'grand_total')::NUMERIC, 0);
  v_paid_amount    := COALESCE((p_invoice->>'paid_amount')::NUMERIC, 0);
  v_balance        := GREATEST(0, v_grand_total - v_paid_amount);
  v_status         := CASE
                        WHEN v_balance <= 0     THEN 'paid'
                        WHEN v_paid_amount > 0  THEN 'partial'
                        ELSE                         'due'
                      END;
  v_notes          := p_invoice->>'notes';

  INSERT INTO public.invoices (
    id, user_id, invoice_number,
    customer_id, customer_name, customer_company,
    customer_phone, customer_email, customer_address, customer_gstin,
    date, due_date, payment_terms,
    subtotal, discount_total, cgst, sgst, tax_total, grand_total,
    paid_amount, balance, status, notes
  ) VALUES (
    v_invoice_id, v_user_id, v_invoice_number,
    v_customer_id,
    COALESCE(p_invoice->>'customer_name', v_customer.name),
    COALESCE(p_invoice->>'customer_company', v_customer.company_name),
    COALESCE(p_invoice->>'customer_phone', v_customer.phone),
    COALESCE(p_invoice->>'customer_email', v_customer.email),
    COALESCE(p_invoice->>'customer_address', v_customer.address),
    COALESCE(p_invoice->>'customer_gstin', v_customer.gstin),
    v_date, v_due_date, v_payment_terms,
    v_subtotal, v_discount_total, v_cgst, v_sgst, v_tax_total, v_grand_total,
    v_paid_amount, v_balance, v_status, v_notes
  );

  -- ── 6. Insert Line Items with Dimensional Snapshot ────────────────────────
  FOR v_item_rec IN
    SELECT * FROM jsonb_to_recordset(v_items) AS (
      id TEXT,
      product_id TEXT,
      product_name TEXT,
      sku TEXT,
      hsn_code TEXT,
      quantity INTEGER,
      rate NUMERIC,
      discount_percent NUMERIC,
      tax_rate NUMERIC,
      tax_amount NUMERIC,
      amount NUMERIC,
      billing_type TEXT,
      length NUMERIC,
      width NUMERIC,
      height NUMERIC,
      dimension_unit TEXT,
      billing_unit TEXT,
      billable_quantity NUMERIC
    )
  LOOP
    v_item_billing := COALESCE(v_item_rec.billing_type, 'standard');

    IF v_item_billing = 'dimension' THEN
      v_billable_qty := COALESCE(
        v_item_rec.billable_quantity,
        round((COALESCE(v_item_rec.length, 1) * COALESCE(v_item_rec.width, 1) * COALESCE(v_item_rec.height, 1) * v_item_rec.quantity)::numeric, 3)
      );
      v_line_base := round((v_billable_qty * v_item_rec.rate)::numeric, 2);
    ELSE
      v_billable_qty := v_item_rec.quantity;
      v_line_base := round((v_item_rec.quantity * v_item_rec.rate)::numeric, 2);
    END IF;

    v_disc_amt := round((v_line_base * COALESCE(v_item_rec.discount_percent, 0) / 100)::numeric, 2);
    v_taxable  := GREATEST(0, v_line_base - v_disc_amt);
    v_tax_amt  := round((v_taxable * COALESCE(v_item_rec.tax_rate, 0) / 100)::numeric, 2);
    v_line_amt := v_taxable + v_tax_amt;

    INSERT INTO public.invoice_items (
      id, invoice_id, user_id,
      product_id, product_name, sku, hsn_code,
      quantity, rate, discount_percent, tax_rate, tax_amount, amount,
      billing_type, length, width, height, dimension_unit, billing_unit, billable_quantity
    ) VALUES (
      COALESCE(v_item_rec.id, 'ii-' || substr(md5(v_invoice_id || v_item_rec.product_id || random()::text), 1, 12)),
      v_invoice_id, v_user_id,
      v_item_rec.product_id, v_item_rec.product_name, v_item_rec.sku, v_item_rec.hsn_code,
      v_item_rec.quantity, v_item_rec.rate,
      COALESCE(v_item_rec.discount_percent, 0),
      COALESCE(v_item_rec.tax_rate, 0),
      COALESCE(v_item_rec.tax_amount, v_tax_amt),
      COALESCE(v_item_rec.amount, v_line_amt),
      v_item_billing,
      v_item_rec.length,
      v_item_rec.width,
      v_item_rec.height,
      v_item_rec.dimension_unit,
      v_item_rec.billing_unit,
      v_billable_qty
    );
  END LOOP;

  -- ── 7. Deduct Inventory & Create Audit Stock Movements ─────────────────────
  FOR v_req_rec IN
    SELECT
      req.product_id,
      req.total_qty,
      req.item_name,
      p.stock AS live_stock,
      p.min_stock AS live_min_stock,
      p.name AS live_name,
      p.sku AS live_sku
    FROM (
      SELECT
        item.product_id,
        SUM(item.quantity)::INTEGER AS total_qty,
        MAX(item.product_name) AS item_name
      FROM jsonb_to_recordset(v_items) AS item(
        product_id TEXT,
        quantity INTEGER,
        product_name TEXT
      )
      GROUP BY item.product_id
    ) req
    JOIN public.products p
      ON p.id = req.product_id AND p.user_id = v_user_id
    ORDER BY req.product_id
  LOOP
    v_prev_stock := v_req_rec.live_stock;
    v_new_stock  := v_prev_stock - v_req_rec.total_qty;

    -- Strict check against negative inventory (never clamp silently)
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'CRITICAL_INVENTORY_ANOMALY: Product % stock would drop below zero (% -> %)',
        v_req_rec.product_id, v_prev_stock, v_new_stock;
    END IF;

    -- Deduct stock and update inventory status
    UPDATE public.products
    SET
      stock      = v_new_stock,
      status     = CASE
                     WHEN v_new_stock <= 0                 THEN 'out_of_stock'
                     WHEN v_new_stock <= v_req_rec.live_min_stock THEN 'low_stock'
                     ELSE                                       'in_stock'
                   END,
      updated_at = NOW()
    WHERE id = v_req_rec.product_id AND user_id = v_user_id;

    -- Insert stock_out audit movement
    INSERT INTO public.stock_movements (
      id, user_id, date,
      product_id, product_name, sku,
      type, quantity, reference, previous_stock, new_stock, reason
    ) VALUES (
      'mov-' || substr(md5(v_invoice_id || v_req_rec.product_id || 'out'), 1, 14),
      v_user_id,
      to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
      v_req_rec.product_id,
      COALESCE(v_req_rec.live_name, v_req_rec.item_name),
      v_req_rec.live_sku,
      'stock_out',
      -v_req_rec.total_qty,
      v_invoice_number,
      v_prev_stock,
      v_new_stock,
      'Sales Invoice: ' || COALESCE(p_invoice->>'customer_name', v_customer.name)
    );
  END LOOP;

  -- ── 8. Update Customer Financials & Ledger ─────────────────────────────────
  UPDATE public.customers
  SET
    total_orders = total_orders + 1,
    total_spent  = total_spent + v_grand_total,
    outstanding  = outstanding + v_balance,
    status       = 'active'
  WHERE id = v_customer_id AND user_id = v_user_id;

  -- ── 9. Record Auto Payment if Paid Amount > 0 ──────────────────────────────
  IF v_paid_amount > 0 THEN
    INSERT INTO public.payments (
      id, user_id, transaction_id, type, party_type,
      party_id, party_name,
      invoice_id, invoice_number, amount, method,
      date, reference_number, status, notes
    ) VALUES (
      COALESCE(p_payment->>'id', 'pay-' || substr(md5(random()::text), 1, 8)),
      v_user_id,
      COALESCE(p_payment->>'transaction_id', 'TXN-' || floor(10000 + random() * 90000)::text),
      'inward',
      'customer',
      v_customer_id,
      COALESCE(p_invoice->>'customer_company', v_customer.company_name, v_customer.name),
      v_invoice_id,
      v_invoice_number,
      v_paid_amount,
      COALESCE(p_payment->>'method', 'UPI'),
      v_date,
      COALESCE(p_payment->>'reference_number', 'INV-SETTLE-' || v_invoice_number),
      'completed',
      COALESCE(p_payment->>'notes', 'Payment recorded on invoice generation')
    );
  END IF;

  -- ── 10. Return Structured Success Payload ──────────────────────────────────
  RETURN jsonb_build_object(
    'success',        true,
    'invoice_id',     v_invoice_id,
    'invoice_number', v_invoice_number,
    'grand_total',    v_grand_total,
    'balance',        v_balance,
    'customer_id',    v_customer_id,
    'stock_updated',  true
  );

EXCEPTION WHEN OTHERS THEN
  -- Any uncaught exception causes an automatic PostgreSQL ROLLBACK
  RETURN jsonb_build_object(
    'success',    false,
    'error_code', 'DATABASE_ERROR',
    'error',      'Invoice creation failed: ' || SQLERRM
  );
END;
$$;

-- Grant execute privileges to authenticated users only
REVOKE ALL ON FUNCTION public.create_invoice_rpc FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice_rpc TO authenticated;

-- ==============================================================================
-- END OF SCHEMA — v3.1 (Includes Step 2 Atomic Direct Invoice Creation RPC)
-- ==============================================================================

-- ==============================================================================
-- STEP 5: SUPABASE STORAGE & DOCUMENT METADATA SYSTEM
-- ==============================================================================

-- ── 1. Create Private Supabase Storage Bucket ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- ── 2. Storage Tenant Isolation Policies ──────────────────────────────────────
DROP POLICY IF EXISTS "documents_select_own" ON storage.objects;
CREATE POLICY "documents_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_insert_own" ON storage.objects;
CREATE POLICY "documents_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_update_own" ON storage.objects;
CREATE POLICY "documents_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "documents_delete_own" ON storage.objects;
CREATE POLICY "documents_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 3. Document Metadata Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.documents (
  id               TEXT PRIMARY KEY,
  user_id          UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL CHECK (document_type IN ('invoice', 'quotation')),
  document_id      TEXT NOT NULL,
  document_number  TEXT NOT NULL,
  customer_id      TEXT DEFAULT '',
  customer_name    TEXT DEFAULT 'Customer',
  file_path        TEXT NOT NULL,
  file_size        BIGINT NOT NULL DEFAULT 0,
  mime_type        TEXT NOT NULL DEFAULT 'application/pdf',
  pdf_status       TEXT NOT NULL DEFAULT 'ready' CHECK (pdf_status IN ('pending', 'ready', 'failed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_documents_user_type_doc UNIQUE (user_id, document_type, document_id)
);

-- ── 4. History Query Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_user_id       ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_created  ON public.documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_type     ON public.documents(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_user_customer ON public.documents(user_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_doc_num  ON public.documents(user_id, document_number);

-- ── 5. Enable Row Level Security (RLS) ────────────────────────────────────────
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_own" ON public.documents;
CREATE POLICY "documents_own" ON public.documents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.documents TO authenticated;

-- ── 6. History Alias View (Shows up as 'history' in Supabase Table/View list) ───
DROP VIEW IF EXISTS public.history;
CREATE VIEW public.history
WITH (security_invoker = true) AS
SELECT * FROM public.documents;

GRANT ALL ON public.history TO authenticated;
GRANT ALL ON public.history TO anon;

-- ── 7. Extend Invoices & Quotations Tables with Storage References ────────────
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS storage_file_path TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS storage_file_path TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

-- ── 8. Automatically Backfill Existing Invoices & Quotations ──────────────────
INSERT INTO public.documents (
  id,
  user_id,
  document_type,
  document_id,
  document_number,
  customer_id,
  customer_name,
  file_path,
  file_size,
  mime_type,
  pdf_status,
  created_at,
  updated_at
)
SELECT
  'invoice_' || i.id,
  i.user_id,
  'invoice',
  i.id,
  i.invoice_number,
  COALESCE(i.customer_id, ''),
  COALESCE(i.customer_name, 'Customer'),
  COALESCE(i.storage_file_path, i.user_id || '/invoices/' || i.id || '.pdf'),
  COALESCE(i.file_size, 0),
  'application/pdf',
  CASE WHEN i.storage_file_path IS NOT NULL THEN 'ready' ELSE 'pending' END,
  i.created_at,
  i.created_at
FROM public.invoices i
ON CONFLICT (user_id, document_type, document_id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  document_number = EXCLUDED.document_number,
  file_path = EXCLUDED.file_path;

INSERT INTO public.documents (
  id,
  user_id,
  document_type,
  document_id,
  document_number,
  customer_id,
  customer_name,
  file_path,
  file_size,
  mime_type,
  pdf_status,
  created_at,
  updated_at
)
SELECT
  'quotation_' || q.id,
  q.user_id,
  'quotation',
  q.id,
  q.quotation_number,
  COALESCE(q.customer_id, ''),
  COALESCE(q.customer_name, 'Customer'),
  COALESCE(q.storage_file_path, q.user_id || '/quotations/' || q.id || '.pdf'),
  COALESCE(q.file_size, 0),
  'application/pdf',
  CASE WHEN q.storage_file_path IS NOT NULL THEN 'ready' ELSE 'pending' END,
  q.created_at,
  q.created_at
FROM public.quotations q
ON CONFLICT (user_id, document_type, document_id) DO UPDATE SET
  customer_name = EXCLUDED.customer_name,
  document_number = EXCLUDED.document_number,
  file_path = EXCLUDED.file_path;

-- ── 9. Reload PostgREST Schema Cache ──────────────────────────────────────────
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';



