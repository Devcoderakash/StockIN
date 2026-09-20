-- ==============================================================================
-- StockIN — Migration: Dimension-Based Product Billing
-- Migration ID: 20260920000000_dimension_based_billing.sql
-- ==============================================================================
-- Adds dimension-based billing attributes to products, invoice_items,
-- and quotation_items. Updates create_invoice_rpc and convert_quotation_to_invoice_rpc
-- to snapshot dimensional data while strictly preserving physical stock deduction (Qty).
-- ==============================================================================

-- ── 1. Products Table Extensions ──────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (billing_type IN ('standard', 'dimension')),
  ADD COLUMN IF NOT EXISTS dimension_type TEXT DEFAULT 'length_width'
    CHECK (dimension_type IN ('length_width', 'length_width_height')),
  ADD COLUMN IF NOT EXISTS dimension_unit TEXT DEFAULT 'ft',
  ADD COLUMN IF NOT EXISTS billing_unit TEXT DEFAULT 'sq.ft';

COMMENT ON COLUMN public.products.billing_type IS 'Mode 1: standard (Qty x Rate), Mode 2: dimension (Length x Width x Qty x Rate)';
COMMENT ON COLUMN public.products.dimension_type IS 'Dimension formula structure (length_width or length_width_height)';
COMMENT ON COLUMN public.products.dimension_unit IS 'Unit of linear dimension measurement (ft, in, m, cm)';
COMMENT ON COLUMN public.products.billing_unit IS 'Billable area/volume rate unit (sq.ft, sq.in, sq.m, sq.cm)';


-- ── 2. Invoice Items Table Extensions ─────────────────────────────────────────
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (billing_type IN ('standard', 'dimension')),
  ADD COLUMN IF NOT EXISTS length NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS width NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS height NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS dimension_unit TEXT,
  ADD COLUMN IF NOT EXISTS billing_unit TEXT,
  ADD COLUMN IF NOT EXISTS billable_quantity NUMERIC(12, 3);

COMMENT ON COLUMN public.invoice_items.billable_quantity IS 'Snapshot billable quantity (Length x Width x Qty for dimensional, or Qty for standard)';


-- ── 3. Quotation Items Table Extensions ───────────────────────────────────────
ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'standard'
    CHECK (billing_type IN ('standard', 'dimension')),
  ADD COLUMN IF NOT EXISTS length NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS width NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS height NUMERIC(12, 3),
  ADD COLUMN IF NOT EXISTS dimension_unit TEXT,
  ADD COLUMN IF NOT EXISTS billing_unit TEXT,
  ADD COLUMN IF NOT EXISTS billable_quantity NUMERIC(12, 3);


-- ── 4. Atomic Direct Invoice Creation RPC (Updated for Dimension Support) ─────
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
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'CUSTOMER_NOT_FOUND',
      'error', 'Customer not found or does not belong to the current user.'
    );
  END IF;

  -- ── 3. Deterministic Product Locking (Deadlock Prevention) ─────────────────
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

  PERFORM 1
  FROM public.products
  WHERE id = ANY(v_product_ids) AND user_id = v_user_id
  ORDER BY id
  FOR UPDATE;

  -- ── 4. Stock Validation with Duplicate Product Aggregation ─────────────────
  -- Stock deduction strictly tracks physical quantity requested per product
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
  -- PHYSICAL INVENTORY RULE: Stock deduction strictly uses physical Quantity!
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

    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Concurrency stock depletion for product %: requested %, available %',
        v_req_rec.live_name, v_req_rec.total_qty, v_prev_stock;
    END IF;

    UPDATE public.products
    SET
      stock = v_new_stock,
      status = CASE
        WHEN v_new_stock = 0 THEN 'out_of_stock'
        WHEN v_new_stock <= v_req_rec.live_min_stock THEN 'low_stock'
        ELSE 'in_stock'
      END,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_req_rec.product_id AND user_id = v_user_id;

    INSERT INTO public.stock_movements (
      id, user_id, product_id, product_name, sku,
      type, quantity, previous_stock, new_stock,
      reference, reason, date
    ) VALUES (
      'mov-' || substr(md5(v_invoice_id || v_req_rec.product_id || random()::text), 1, 10),
      v_user_id,
      v_req_rec.product_id,
      v_req_rec.live_name,
      v_req_rec.live_sku,
      'stock_out',
      v_req_rec.total_qty,
      v_prev_stock,
      v_new_stock,
      v_invoice_number,
      'Deducted on direct sale generation',
      v_date
    );
  END LOOP;

  -- ── 8. Update Customer Ledger ───────────────────────────────────────────────
  UPDATE public.customers
  SET
    total_orders = total_orders + 1,
    total_spent  = total_spent + v_grand_total,
    outstanding  = outstanding + v_balance
  WHERE id = v_customer_id AND user_id = v_user_id;

  -- ── 9. Record Initial Payment (if provided) ────────────────────────────────
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
      COALESCE(p_payment->>'notes', 'Settled on direct invoice creation')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'grand_total', v_grand_total,
    'balance', v_balance,
    'customer_id', v_customer_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'RPC_EXCEPTION',
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice_rpc(JSONB, JSONB, JSONB) TO authenticated;


-- ── 5. Quotation to Invoice Conversion RPC (Updated for Dimension Support) ───
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
  FOR UPDATE;

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

  -- ── 3. Pre-flight stock check (physical quantity) ────────────────────────
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

  -- ── 5. Copy items with dimensional snapshot & deduct stock ────────────────
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

    -- 5b. Get current stock
    SELECT stock INTO v_prev_stock
    FROM public.products
    WHERE id = v_item.product_id AND user_id = v_user_id
    FOR UPDATE;

    v_new_stock := v_prev_stock - v_item.quantity;

    -- 5c. Deduct stock (physical units)
    UPDATE public.products
    SET
      stock = v_new_stock,
      status = CASE
        WHEN v_new_stock = 0 THEN 'out_of_stock'
        WHEN v_new_stock <= min_stock THEN 'low_stock'
        ELSE 'in_stock'
      END,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_item.product_id AND user_id = v_user_id;

    -- 5d. Stock movement audit
    INSERT INTO public.stock_movements (
      id, user_id, product_id, product_name, sku,
      type, quantity, previous_stock, new_stock,
      reference, reason, date
    ) VALUES (
      'mov-' || substr(md5(p_invoice_id || v_item.id || random()::text), 1, 10),
      v_user_id,
      v_item.product_id,
      v_item.product_name,
      v_item.sku,
      'stock_out',
      v_item.quantity,
      v_prev_stock,
      v_new_stock,
      p_invoice_number,
      'Deducted on conversion of Quotation ' || v_quotation.quotation_number,
      p_today
    );
  END LOOP;

  -- ── 6. Update quotation status to converted ───────────────────────────────
  UPDATE public.quotations
  SET
    status                   = 'converted',
    converted_invoice_id     = p_invoice_id,
    converted_invoice_number = p_invoice_number,
    converted_at             = p_today,
    updated_at               = timezone('utc'::text, now())
  WHERE id = p_quotation_id AND user_id = v_user_id;

  -- ── 7. Update customer ledger ─────────────────────────────────────────────
  UPDATE public.customers
  SET
    total_orders = total_orders + 1,
    total_spent  = total_spent + v_quotation.grand_total,
    outstanding  = outstanding + v_quotation.grand_total
  WHERE id = v_quotation.customer_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'success',        true,
    'invoice_id',     p_invoice_id,
    'invoice_number', p_invoice_number
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'Conversion transaction failed: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quotation_to_invoice_rpc(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
