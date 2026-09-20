-- ==============================================================================
-- FIX: Update create_invoice_rpc with resilient customer fallback
-- ==============================================================================
-- Problem: When a customer was just added in the UI, race conditions or client
--          ID synchronization could cause "Customer not found or does not belong
--          to current user".
-- Solution: Add auto-create/upsert fallback into create_invoice_rpc so if the
--           customer ID is not found, the RPC automatically registers the customer
--           from invoice metadata and proceeds with atomic invoice creation.
-- Run this SQL in your Supabase SQL Editor if you wish to apply server-side.
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
      'error', 'p_invoice parameter must be a non-null JSON object.'
    );
  END IF;

  v_items := COALESCE(p_items, p_invoice->'items');
  IF v_items IS NULL OR jsonb_typeof(v_items) != 'array' OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'EMPTY_INVOICE',
      'error', 'Invoice must contain at least one line item.'
    );
  END IF;

  v_customer_id    := p_invoice->>'customer_id';
  v_invoice_number := p_invoice->>'invoice_number';

  IF v_customer_id IS NULL OR TRIM(v_customer_id) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_CUSTOMER',
      'error', 'A valid customer_id is required to create an invoice.'
    );
  END IF;

  IF v_invoice_number IS NULL OR TRIM(v_invoice_number) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_INVOICE_NUMBER',
      'error', 'invoice_number is required.'
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
    -- Resilient fallback: auto-create or upsert customer using invoice details
    IF v_customer_id IS NOT NULL AND v_customer_id <> '' THEN
      INSERT INTO public.customers (
        id, user_id, name, company_name, phone, email, address, gstin,
        total_orders, total_spent, outstanding, status
      ) VALUES (
        v_customer_id,
        v_user_id,
        COALESCE(NULLIF(TRIM(p_invoice->>'customer_name'), ''), 'Customer'),
        NULLIF(TRIM(p_invoice->>'customer_company'), ''),
        NULLIF(TRIM(p_invoice->>'customer_phone'), ''),
        NULLIF(TRIM(p_invoice->>'customer_email'), ''),
        NULLIF(TRIM(p_invoice->>'customer_address'), ''),
        NULLIF(TRIM(p_invoice->>'customer_gstin'), ''),
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

  -- ── 6. Insert Line Items ───────────────────────────────────────────────────
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
        (COALESCE(v_item_rec.length, 0) * COALESCE(v_item_rec.width, 0) * COALESCE(v_item_rec.quantity, 1))
      );
    ELSE
      v_billable_qty := v_item_rec.quantity;
    END IF;

    v_line_base := v_billable_qty * v_item_rec.rate;
    v_disc_amt  := v_line_base * (COALESCE(v_item_rec.discount_percent, 0) / 100.0);
    v_taxable   := v_line_base - v_disc_amt;
    v_tax_amt   := COALESCE(v_item_rec.tax_amount, v_taxable * (COALESCE(v_item_rec.tax_rate, 0) / 100.0));
    v_line_amt  := COALESCE(v_item_rec.amount, v_taxable + v_tax_amt);

    INSERT INTO public.invoice_items (
      id, invoice_id, product_id, product_name,
      sku, hsn_code, quantity, rate,
      discount_percent, tax_rate, tax_amount, amount,
      billing_type, length, width, height,
      dimension_unit, billing_unit, billable_quantity
    ) VALUES (
      COALESCE(v_item_rec.id, 'item-' || substr(md5(random()::text), 1, 10)),
      v_invoice_id,
      v_item_rec.product_id,
      v_item_rec.product_name,
      v_item_rec.sku,
      v_item_rec.hsn_code,
      v_item_rec.quantity,
      v_item_rec.rate,
      COALESCE(v_item_rec.discount_percent, 0),
      COALESCE(v_item_rec.tax_rate, 0),
      v_tax_amt,
      v_line_amt,
      v_item_billing,
      v_item_rec.length,
      v_item_rec.width,
      v_item_rec.height,
      v_item_rec.dimension_unit,
      v_item_rec.billing_unit,
      v_billable_qty
    );
  END LOOP;

  -- ── 7. Atomically Deduct Stock & Write Stock Movement Audit Logs ───────────
  FOR v_req_rec IN
    SELECT
      item.product_id,
      SUM(item.quantity)::INTEGER AS total_qty,
      MAX(item.product_name) AS live_name,
      MAX(item.sku) AS live_sku
    FROM jsonb_to_recordset(v_items) AS item(
      product_id TEXT,
      quantity INTEGER,
      product_name TEXT,
      sku TEXT
    )
    GROUP BY item.product_id
  LOOP
    SELECT stock, name, sku, min_stock
    INTO v_prev_stock, v_req_rec.live_name, v_req_rec.live_sku, v_req_rec.live_min_stock
    FROM public.products
    WHERE id = v_req_rec.product_id AND user_id = v_user_id;

    v_new_stock := v_prev_stock - v_req_rec.total_qty;

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
    'customer_id', v_customer_id,
    'stock_updated', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice_rpc(JSONB, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invoice_rpc(JSONB, JSONB, JSONB) TO authenticated;
