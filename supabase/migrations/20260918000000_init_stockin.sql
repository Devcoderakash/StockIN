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
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  amount           NUMERIC(12, 2) NOT NULL
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
  amount           NUMERIC(12, 2) NOT NULL
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
    -- 5a. Invoice item
    INSERT INTO public.invoice_items (
      id, invoice_id, user_id,
      product_id, product_name, sku, hsn_code,
      quantity, rate, discount_percent, tax_rate, tax_amount, amount
    ) VALUES (
      'ii-' || substr(md5(p_invoice_id || v_item.id || random()::text), 1, 12),
      p_invoice_id, v_user_id,
      v_item.product_id, v_item.product_name, v_item.sku, v_item.hsn_code,
      v_item.quantity, v_item.rate, v_item.discount_percent,
      v_item.tax_rate, v_item.tax_amount, v_item.amount
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
-- END OF SCHEMA — v3.0
-- ==============================================================================
