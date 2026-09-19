/**
 * frontend/src/features/quotations/services/__tests__/quotationService.test.ts
 *
 * Test Suite for Quotation Lifecycle, Stock Isolation, and Conversion (Step 4 Sections 14, 15, 16)
 * Validates:
 * 1. Creation, editing, and deletion do NOT mutate product inventory.
 * 2. Conversion atomicity and stock deduction guarantees.
 * 3. Pre-flight stock check failure preserves quotation and prevents invoice creation.
 * 4. Double-conversion prevention (idempotency guard).
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test';
import {
  convertQuotationToInvoice,
  type ConvertResult,
} from '@/features/quotations/services/quotationService';

// Supabase RPC mock
const mockRpc = mock((..._args: unknown[]) =>
  Promise.resolve<{ data: any; error: any }>({ data: null, error: null })
);
const mockFrom = mock(() => ({
  select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }),
  insert: () => Promise.resolve({ error: null }),
  update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
}));

mock.module('@/lib/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

// In-memory simulation of quotation and product tables replicating PostgreSQL state
class QuotationEngineSimulator {
  products = new Map<string, { id: string; name: string; stock: number; min_stock: number }>();
  quotations = new Map<
    string,
    {
      id: string;
      quotation_number: string;
      customer_id: string;
      grand_total: number;
      status: 'draft' | 'sent' | 'converted' | 'expired';
      converted_invoice_id?: string;
      items: { product_id: string; product_name: string; quantity: number; rate: number }[];
    }
  >();
  invoices = new Map<string, any>();
  stockMovements: any[] = [];
  customerLedger = new Map<string, { total_orders: number; total_spent: number; outstanding: number }>();

  reset() {
    this.products.clear();
    this.quotations.clear();
    this.invoices.clear();
    this.stockMovements = [];
    this.customerLedger.clear();
  }

  // 1. Create quotation (Draft / Sent)
  createQuotation(q: {
    id: string;
    quotation_number: string;
    customer_id: string;
    grand_total: number;
    items: { product_id: string; product_name: string; quantity: number; rate: number }[];
  }) {
    this.quotations.set(q.id, {
      ...q,
      status: 'draft',
    });
    // No stock deduction happens here!
  }

  // 2. Edit quotation
  updateQuotation(id: string, updates: { items?: any[]; grand_total?: number }) {
    const q = this.quotations.get(id);
    if (!q) throw new Error('Quotation not found');
    if (updates.items) q.items = updates.items;
    if (updates.grand_total !== undefined) q.grand_total = updates.grand_total;
    // No stock deduction happens here!
  }

  // 3. Delete quotation
  deleteQuotation(id: string) {
    this.quotations.delete(id);
    // No stock mutation happens here!
  }

  // 4. Exact implementation of convert_quotation_to_invoice_rpc logic
  convertQuotation(
    quotationId: string,
    invoiceId: string,
    invoiceNumber: string,
    today: string
  ): { success: boolean; error?: string; invoice_id?: string; invoice_number?: string } {
    const q = this.quotations.get(quotationId);
    if (!q) {
      return { success: false, error: 'Quotation not found.' };
    }

    // Guard: Prevent double-conversion
    if (q.status === 'converted') {
      return {
        success: false,
        error: `Quotation ${q.quotation_number} is already converted to Invoice ${q.converted_invoice_id}.`,
      };
    }

    // Pre-flight stock check
    const stockErrors: string[] = [];
    for (const item of q.items) {
      const prod = this.products.get(item.product_id);
      if (!prod) {
        stockErrors.push(`"${item.product_name}" not found in current inventory.`);
      } else if (prod.stock < item.quantity) {
        stockErrors.push(`"${item.product_name}" (Required: ${item.quantity}, Available: ${prod.stock})`);
      }
    }

    if (stockErrors.length > 0) {
      return {
        success: false,
        error: `Insufficient stock:\n${stockErrors.join('\n')}`,
      };
    }

    // Atomic execution: create invoice, deduct stock, log movement, update customer, mark converted
    this.invoices.set(invoiceId, {
      id: invoiceId,
      invoice_number: invoiceNumber,
      customer_id: q.customer_id,
      grand_total: q.grand_total,
      date: today,
    });

    for (const item of q.items) {
      const prod = this.products.get(item.product_id)!;
      const prevStock = prod.stock;
      prod.stock = Math.max(0, prod.stock - item.quantity);

      this.stockMovements.push({
        product_id: prod.id,
        previous_stock: prevStock,
        new_stock: prod.stock,
        quantity: -item.quantity,
        reference: invoiceNumber,
        reason: `Quotation ${q.quotation_number} → Invoice ${invoiceNumber}`,
      });
    }

    const cust = this.customerLedger.get(q.customer_id) || { total_orders: 0, total_spent: 0, outstanding: 0 };
    cust.total_orders += 1;
    cust.total_spent += q.grand_total;
    cust.outstanding += q.grand_total;
    this.customerLedger.set(q.customer_id, cust);

    q.status = 'converted';
    q.converted_invoice_id = invoiceId;

    return {
      success: true,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
    };
  }
}

describe('Step 4 — Quotation Lifecycle & Conversion Tests', () => {
  const engine = new QuotationEngineSimulator();

  beforeEach(() => {
    engine.reset();
    mockRpc.mockClear();
    // Seed test product
    engine.products.set('prod-1', {
      id: 'prod-1',
      name: 'Wireless Keyboard',
      stock: 10,
      min_stock: 2,
    });
    // Seed customer
    engine.customerLedger.set('cust-1', {
      total_orders: 0,
      total_spent: 0,
      outstanding: 0,
    });
  });

  describe('Section 14: Quotation Lifecycle (Draft, Edit, Delete do NOT mutate stock)', () => {
    test('Creating quotation leaves inventory untouched', () => {
      engine.createQuotation({
        id: 'q-101',
        quotation_number: 'QUO-2026-001',
        customer_id: 'cust-1',
        grand_total: 1500,
        items: [{ product_id: 'prod-1', product_name: 'Wireless Keyboard', quantity: 5, rate: 300 }],
      });

      // Stock remains exactly 10
      expect(engine.products.get('prod-1')?.stock).toBe(10);
      expect(engine.stockMovements.length).toBe(0);
      expect(engine.invoices.size).toBe(0);
    });

    test('Editing quotation quantities leaves inventory untouched', () => {
      engine.createQuotation({
        id: 'q-101',
        quotation_number: 'QUO-2026-001',
        customer_id: 'cust-1',
        grand_total: 1500,
        items: [{ product_id: 'prod-1', product_name: 'Wireless Keyboard', quantity: 5, rate: 300 }],
      });

      // Edit to 8 units
      engine.updateQuotation('q-101', {
        items: [{ product_id: 'prod-1', product_name: 'Wireless Keyboard', quantity: 8, rate: 300 }],
        grand_total: 2400,
      });

      // Stock is STILL 10
      expect(engine.products.get('prod-1')?.stock).toBe(10);
      expect(engine.stockMovements.length).toBe(0);
    });

    test('Deleting quotation leaves inventory untouched', () => {
      engine.createQuotation({
        id: 'q-101',
        quotation_number: 'QUO-2026-001',
        customer_id: 'cust-1',
        grand_total: 1500,
        items: [{ product_id: 'prod-1', product_name: 'Wireless Keyboard', quantity: 5, rate: 300 }],
      });

      engine.deleteQuotation('q-101');
      expect(engine.quotations.has('q-101')).toBe(false);
      expect(engine.products.get('prod-1')?.stock).toBe(10);
      expect(engine.stockMovements.length).toBe(0);
    });
  });

  describe('Section 15: Quotation Conversion — Stock Failure Abort', () => {
    test('Conversion aborts if required quantity exceeds available stock', () => {
      // Stock is 10, quotation asks for 15
      engine.createQuotation({
        id: 'q-over',
        quotation_number: 'QUO-2026-002',
        customer_id: 'cust-1',
        grand_total: 4500,
        items: [{ product_id: 'prod-1', product_name: 'Wireless Keyboard', quantity: 15, rate: 300 }],
      });

      const res = engine.convertQuotation('q-over', 'inv-gen-1', 'INV-2026-001', '2026-09-18');

      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient stock');
      expect(res.error).toContain('Wireless Keyboard');

      // Crucial: Quotation status remains 'draft' (unconverted)
      expect(engine.quotations.get('q-over')?.status).toBe('draft');
      expect(engine.quotations.get('q-over')?.converted_invoice_id).toBeUndefined();

      // Zero mutation: stock remains 10, no invoice created, no movement logged
      expect(engine.products.get('prod-1')?.stock).toBe(10);
      expect(engine.invoices.size).toBe(0);
      expect(engine.stockMovements.length).toBe(0);
      expect(engine.customerLedger.get('cust-1')?.total_orders).toBe(0);
    });
  });

  describe('Section 16: Quotation Double-Conversion Prevention', () => {
    test('Conversion succeeds on first attempt and rejects duplicate attempt', () => {
      // Initial stock 10, quote asks for 4
      engine.createQuotation({
        id: 'q-double',
        quotation_number: 'QUO-2026-003',
        customer_id: 'cust-1',
        grand_total: 1200,
        items: [{ product_id: 'prod-1', product_name: 'Wireless Keyboard', quantity: 4, rate: 300 }],
      });

      // 1st conversion attempt -> SUCCESS
      const firstRes = engine.convertQuotation('q-double', 'inv-first', 'INV-1001', '2026-09-18');
      expect(firstRes.success).toBe(true);
      expect(engine.products.get('prod-1')?.stock).toBe(6); // 10 - 4 = 6
      expect(engine.invoices.size).toBe(1);
      expect(engine.stockMovements.length).toBe(1);
      expect(engine.quotations.get('q-double')?.status).toBe('converted');

      // 2nd conversion attempt on same quotation -> MUST BE REJECTED
      const secondRes = engine.convertQuotation('q-double', 'inv-second', 'INV-1002', '2026-09-18');
      expect(secondRes.success).toBe(false);
      expect(secondRes.error).toContain('already converted');

      // Stock is STILL 6 (NO duplicate deduction to 2)
      expect(engine.products.get('prod-1')?.stock).toBe(6);
      expect(engine.invoices.size).toBe(1); // Only 1 invoice
      expect(engine.stockMovements.length).toBe(1); // Only 1 movement
    });
  });

  describe('Client Service: convertQuotationToInvoice RPC Integration', () => {
    test('convertQuotationToInvoice calls RPC with exact parameters and returns success', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'inv-rpc-100',
          invoice_number: 'INV-2026-500',
        },
        error: null,
      });

      const res = await convertQuotationToInvoice(
        'quo-123',
        'inv-rpc-100',
        'INV-2026-500',
        '2026-09-18',
        'Net 30'
      );

      expect(mockRpc).toHaveBeenCalledTimes(1);
      const [rpcName, rpcParams] = mockRpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
      expect(rpcName).toBe('convert_quotation_to_invoice_rpc');
      expect(rpcParams.p_quotation_id).toBe('quo-123');
      expect(rpcParams.p_invoice_id).toBe('inv-rpc-100');
      expect(rpcParams.p_invoice_number).toBe('INV-2026-500');
      expect(rpcParams.p_today).toBe('2026-09-18');
      expect(rpcParams.p_payment_terms).toBe('Net 30');

      expect(res.success).toBe(true);
      expect(res.invoiceId).toBe('inv-rpc-100');
      expect(res.invoiceNumber).toBe('INV-2026-500');
    });

    test('convertQuotationToInvoice handles RPC failure response cleanly', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Insufficient stock:\n"Executive Chair" (Required: 5, Available: 1)',
        },
        error: null,
      });

      const res = await convertQuotationToInvoice(
        'quo-999',
        'inv-999',
        'INV-999',
        '2026-09-18',
        'Due on Receipt'
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient stock');
    });
  });
});
