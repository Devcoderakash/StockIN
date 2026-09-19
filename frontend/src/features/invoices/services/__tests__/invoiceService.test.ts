/**
 * frontend/src/features/invoices/services/__tests__/invoiceService.test.ts
 *
 * Test suite for Step 2: Atomic Direct Invoice Creation with PostgreSQL RPC
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Mock Supabase client for invoiceService unit tests
const mockRpc = mock((..._args: unknown[]) => Promise.resolve<{ data: any; error: any }>({ data: null, error: null }));

mock.module('@/lib/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

import { createInvoiceAtomic } from '../invoiceService';
import type { Invoice } from '@/types';

describe('Step 2: Atomic Direct Invoice Creation RPC & Service Tests', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  const mockInvoiceData: Omit<Invoice, 'id'> = {
    invoiceNumber: 'INV-2026-001',
    customerId: 'cust-101',
    customerName: 'Aarav Sharma',
    customerCompany: 'Sharma Enterprises',
    customerPhone: '+91 98765 43210',
    customerEmail: 'aarav@sharma.in',
    customerAddress: 'MG Road, Indore, MP',
    customerGstin: '23AAAAA0000A1Z5',
    date: '2026-09-18',
    dueDate: '2026-09-25',
    paymentTerms: 'Due on Receipt',
    subtotal: 10000,
    discountTotal: 500,
    taxTotal: 1710,
    grandTotal: 11210,
    paidAmount: 5000,
    balance: 6210,
    status: 'partial',
    items: [
      {
        id: 'ii-1',
        productId: 'prod-A',
        productName: 'Executive Desk Chair',
        sku: 'PRD-DSK-01',
        hsnCode: '94033010',
        quantity: 2,
        rate: 5000,
        discountPercent: 5,
        taxRate: 18,
        taxAmount: 1710,
        amount: 11210,
      },
    ],
    notes: 'Standard delivery terms apply.',
  };

  test('Test 1: createInvoiceAtomic packages parameters and handles successful RPC response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        invoice_id: 'inv-generated-123',
        invoice_number: 'INV-2026-001',
        grand_total: 11210,
        balance: 6210,
        customer_id: 'cust-101',
        stock_updated: true,
      },
      error: null,
    });

    const result = await createInvoiceAtomic(mockInvoiceData, 'UPI');

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [rpcName, rpcParams] = (mockRpc.mock.calls[0] as unknown as [string, Record<string, unknown>]);

    expect(rpcName).toBe('create_invoice_rpc');
    expect(rpcParams.p_invoice).toBeDefined();
    expect(rpcParams.p_items).toBeDefined();
    expect(rpcParams.p_payment).toBeDefined();

    const pInvoice = rpcParams.p_invoice as Record<string, unknown>;
    expect(pInvoice.invoice_number).toBe('INV-2026-001');
    expect(pInvoice.customer_id).toBe('cust-101');
    expect(pInvoice.grand_total).toBe(11210);
    expect(pInvoice.paid_amount).toBe(5000);

    const pItems = rpcParams.p_items as Array<Record<string, unknown>>;
    expect(pItems.length).toBe(1);
    expect(pItems[0].product_id).toBe('prod-A');
    expect(pItems[0].quantity).toBe(2);

    const pPayment = rpcParams.p_payment as Record<string, unknown>;
    expect(pPayment.method).toBe('UPI');
    expect(pPayment.reference_number).toBe('INV-SETTLE-INV-2026-001');

    expect(result.success).toBe(true);
    expect(result.invoiceId).toBe('inv-generated-123');
    expect(result.invoiceNumber).toBe('INV-2026-001');
  });

  test('Test 2: createInvoiceAtomic does not attach payment when paidAmount is 0', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: true,
        invoice_id: 'inv-unpaid-001',
        invoice_number: 'INV-2026-002',
        grand_total: 1000,
        balance: 1000,
        customer_id: 'cust-101',
      },
      error: null,
    });

    const unpaidInvoice = {
      ...mockInvoiceData,
      paidAmount: 0,
      balance: 11210,
      status: 'due' as const,
    };

    const result = await createInvoiceAtomic(unpaidInvoice);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [, rpcParams] = (mockRpc.mock.calls[0] as unknown as [string, Record<string, unknown>]);
    expect(rpcParams.p_payment).toBeNull();
    expect(result.success).toBe(true);
  });

  test('Test 3: createInvoiceAtomic handles INSUFFICIENT_STOCK abort from RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        success: false,
        error_code: 'INSUFFICIENT_STOCK',
        error: 'Insufficient warehouse stock:\n"Executive Desk Chair" (Required: 10, Available: 3)',
      },
      error: null,
    });

    const result = await createInvoiceAtomic({
      ...mockInvoiceData,
      items: [{ ...mockInvoiceData.items[0], quantity: 10 }],
    });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INSUFFICIENT_STOCK');
    expect(result.error).toContain('Insufficient warehouse stock');
  });

  test('Test 4: createInvoiceAtomic handles network/server errors cleanly', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Could not connect to PostgreSQL server' },
    });

    const result = await createInvoiceAtomic(mockInvoiceData);

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RPC_ERROR');
    expect(result.error).toBe('Could not connect to PostgreSQL server');
  });

  test('Test 5: Migration file exists and adheres to all architectural constraints', () => {
    const migrationPath = resolve(__dirname, '../../../../../../supabase/migrations/20260918000001_create_invoice_rpc.sql');
    expect(existsSync(migrationPath)).toBe(true);

    const sqlContent = readFileSync(migrationPath, 'utf-8');

    // 1. Function definition
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.create_invoice_rpc');

    // 2. Security Definer with search_path
    expect(sqlContent).toContain('SECURITY DEFINER');
    expect(sqlContent).toContain('SET search_path = public, pg_temp');

    // 3. Tenant isolation with auth.uid()
    expect(sqlContent).toContain('auth.uid()');
    expect(sqlContent).toContain('v_user_id IS NULL');
    expect(sqlContent).toContain('UNAUTHENTICATED');

    // 4. Deterministic row-level locking
    expect(sqlContent).toContain('SELECT array_agg(DISTINCT item.product_id ORDER BY item.product_id)');
    expect(sqlContent).toContain('ORDER BY id');
    expect(sqlContent).toContain('FOR UPDATE');

    // 5. Pre-flight stock check and duplicate product aggregation
    expect(sqlContent).toContain('SUM(item.quantity)::INTEGER AS total_qty');
    expect(sqlContent).toContain('INSUFFICIENT_STOCK');

    // 6. Strict check against negative inventory (no silent clamping)
    expect(sqlContent).toContain('IF v_new_stock < 0 THEN');
    expect(sqlContent).not.toContain('GREATEST(stock - quantity, 0)');

    // 7. Insert into invoices and invoice_items
    expect(sqlContent).toContain('INSERT INTO public.invoices');
    expect(sqlContent).toContain('INSERT INTO public.invoice_items');

    // 8. Inventory deduction and stock_out audit movement
    expect(sqlContent).toContain('UPDATE public.products');
    expect(sqlContent).toContain('INSERT INTO public.stock_movements');
    expect(sqlContent).toContain("'stock_out'");

    // 9. Customer ledger update
    expect(sqlContent).toContain('UPDATE public.customers');
    expect(sqlContent).toContain('total_orders = total_orders + 1');
    expect(sqlContent).toContain('total_spent  = total_spent + v_grand_total');
    expect(sqlContent).toContain('outstanding  = outstanding + v_balance');

    // 10. Automatic payment insert if paid
    expect(sqlContent).toContain('IF v_paid_amount > 0 THEN');
    expect(sqlContent).toContain('INSERT INTO public.payments');

    // 11. Search path hardening on convert_quotation_to_invoice_rpc
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.convert_quotation_to_invoice_rpc');
  });

  test('Test 6: Master schema.sql incorporates create_invoice_rpc and hardened quotation RPC', () => {
    const schemaPath = resolve(__dirname, '../../../../../../supabase/schema.sql');
    expect(existsSync(schemaPath)).toBe(true);

    const schemaContent = readFileSync(schemaPath, 'utf-8');
    expect(schemaContent).toContain('CREATE OR REPLACE FUNCTION public.create_invoice_rpc');
    expect(schemaContent).toContain('SET search_path = public, pg_temp');
    expect(schemaContent).toContain('GRANT EXECUTE ON FUNCTION public.create_invoice_rpc TO authenticated;');
  });
});
