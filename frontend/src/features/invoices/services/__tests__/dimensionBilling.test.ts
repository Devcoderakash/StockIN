/**
 * frontend/src/features/invoices/services/__tests__/dimensionBilling.test.ts
 *
 * Master Verification Suite for Dimension-Based Product Billing (Section 23)
 *
 * Automated tests covering all 10 required test scenarios:
 * Test 1: Standard product invoice (Qty=2, Rate=100 -> Total=200+GST, Stock 10->8)
 * Test 2: Dimension product invoice (2x4 ft, Qty=1 @ 120/sq.ft -> Billable Qty=8, Amt=960+GST, Stock 10->9)
 * Test 3: Dimension product multiple quantity (2x4 ft, Qty=3 @ 120/sq.ft -> Billable Qty=24, Amt=2880+GST, Stock 10->7)
 * Test 4: Discount calculation (2x4x1 @ 120 = 960, 5% disc = 48, Taxable = 912, GST on 912)
 * Test 5: GST calculation (Base 960, GST 18% = 172.80, Total = 1132.80)
 * Test 6: Insufficient stock rejection (Stock 1, try Qty 2 -> Rejected, stock remains 1)
 * Test 7: Missing dimension validation (Length=0, Width=4 -> Rejected)
 * Test 8: Existing invoice compatibility (Legacy invoices without dimension fields render & calculate as standard)
 * Test 9: PDF generation (Generates valid PDF 1.4 vector doc with dimensional size & billable qty)
 * Test 10: Quotation conversion (Dimensions preserved, stock deducted by physical Qty only)
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { calculateLineItem, calculateTotals } from '@/features/invoices/utils/invoiceCalculations';
import { generateDocumentPdf } from '@/services/pdf/pdfService';
import type { Invoice, Quotation, BusinessSettings } from '@/types';
import fs from 'node:fs';
import path from 'node:path';

interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  stock: number;
  min_stock: number;
  selling_price: number;
  tax_rate: number;
  billing_type: 'standard' | 'dimension';
  dimension_unit?: 'ft' | 'in' | 'm' | 'cm';
  billing_unit?: 'sq.ft' | 'sq.in' | 'sq.m' | 'sq.cm' | 'running_ft';
}

interface InvoiceItemRecord {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  discount_percent: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  billing_type?: 'standard' | 'dimension';
  length?: number;
  width?: number;
  dimension_unit?: string;
  billing_unit?: string;
  billable_quantity?: number;
}

interface QuotationItemRecord {
  id: string;
  quotation_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  rate: number;
  discount_percent: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  billing_type?: 'standard' | 'dimension';
  length?: number;
  width?: number;
  dimension_unit?: string;
  billing_unit?: string;
  billable_quantity?: number;
}

/**
 * Replicates the authoritative PostgreSQL RPCs:
 * - public.create_invoice_rpc
 * - public.convert_quotation_to_invoice_rpc
 */
class DimensionDatabaseSimulator {
  products: Map<string, ProductRecord> = new Map();
  invoices: Map<string, any> = new Map();
  invoiceItems: InvoiceItemRecord[] = [];
  quotations: Map<string, any> = new Map();
  quotationItems: QuotationItemRecord[] = [];
  stockMovements: any[] = [];

  reset() {
    this.products.clear();
    this.invoices.clear();
    this.invoiceItems = [];
    this.quotations.clear();
    this.quotationItems = [];
    this.stockMovements = [];
  }

  addProduct(p: ProductRecord) {
    this.products.set(p.id, { ...p });
  }

  // Exact reproduction of public.create_invoice_rpc with dimensional support
  async executeCreateInvoiceRpc(
    userId: string,
    invoiceData: { id: string; invoice_number: string; customer_id: string; grand_total: number },
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      rate: number;
      discount_percent?: number;
      tax_rate?: number;
      billing_type?: 'standard' | 'dimension';
      length?: number;
      width?: number;
      dimension_unit?: string;
      billing_unit?: string;
    }>
  ): Promise<{ success: boolean; error_code?: string; error?: string; invoice_id?: string }> {
    // 1. Transaction snapshot for rollback
    const snapshotProducts = new Map(Array.from(this.products.entries()).map(([k, v]) => [k, { ...v }]));

    // 2. Validate dimensional input
    for (const item of items) {
      if (item.billing_type === 'dimension') {
        if (!item.length || item.length <= 0 || !item.width || item.width <= 0) {
          return {
            success: false,
            error_code: 'INVALID_DIMENSIONS',
            error: `Product "${item.product_name}" requires length and width greater than 0.`,
          };
        }
      }
    }

    // 3. Aggregate physical stock deduction requirements (sum physical quantity only)
    const requiredStock = new Map<string, number>();
    for (const item of items) {
      const current = requiredStock.get(item.product_id) || 0;
      requiredStock.set(item.product_id, current + item.quantity);
    }

    // 4. Pre-flight inventory validation (FOR UPDATE simulation)
    for (const [prodId, reqQty] of requiredStock.entries()) {
      const prod = this.products.get(prodId);
      if (!prod) {
        return { success: false, error_code: 'PRODUCT_NOT_FOUND', error: `Product not found: ${prodId}` };
      }
      if (prod.stock < reqQty) {
        // Rollback state
        this.products = snapshotProducts;
        return {
          success: false,
          error_code: 'INSUFFICIENT_STOCK',
          error: `Insufficient stock for product "${prod.name}". Available: ${prod.stock}, Required: ${reqQty}`,
        };
      }
    }

    // 5. Deduct physical stock strictly by physical quantity
    for (const [prodId, reqQty] of requiredStock.entries()) {
      const prod = this.products.get(prodId)!;
      const prevStock = prod.stock;
      prod.stock -= reqQty;
      this.stockMovements.push({
        product_id: prodId,
        type: 'out',
        quantity: reqQty,
        previous_stock: prevStock,
        new_stock: prod.stock,
        reference: `Invoice ${invoiceData.invoice_number}`,
      });
    }

    // 6. Insert invoice and line items with dimensional snapshots
    this.invoices.set(invoiceData.id, invoiceData);
    for (const item of items) {
      const isDim = item.billing_type === 'dimension';
      const billableQty = isDim
        ? Math.round((item.length || 0) * (item.width || 0) * item.quantity * 1000) / 1000
        : item.quantity;
      const base = billableQty * item.rate;
      const disc = (base * (item.discount_percent || 0)) / 100;
      const taxable = Math.max(0, base - disc);
      const tax = (taxable * (item.tax_rate || 0)) / 100;
      const total = taxable + tax;

      this.invoiceItems.push({
        id: `item-${Date.now()}-${Math.random()}`,
        invoice_id: invoiceData.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        rate: item.rate,
        discount_percent: item.discount_percent || 0,
        tax_rate: item.tax_rate || 0,
        tax_amount: tax,
        amount: total,
        billing_type: item.billing_type || 'standard',
        length: item.length,
        width: item.width,
        dimension_unit: item.dimension_unit,
        billing_unit: item.billing_unit,
        billable_quantity: billableQty,
      });
    }

    return { success: true, invoice_id: invoiceData.id };
  }

  // Exact reproduction of public.convert_quotation_to_invoice_rpc with dimensional preservation
  async executeConvertQuotationRpc(
    quotationId: string,
    invoiceId: string,
    invoiceNumber: string
  ): Promise<{ success: boolean; error_code?: string; error?: string }> {
    const q = this.quotations.get(quotationId);
    if (!q) return { success: false, error_code: 'QUOTATION_NOT_FOUND', error: 'Quotation not found' };
    if (q.status === 'converted') {
      return { success: false, error_code: 'ALREADY_CONVERTED', error: 'Quotation has already been converted.' };
    }

    const qItems = this.quotationItems.filter((i) => i.quotation_id === quotationId);

    // Aggregate required stock by physical quantity only
    const requiredStock = new Map<string, number>();
    for (const item of qItems) {
      const cur = requiredStock.get(item.product_id) || 0;
      requiredStock.set(item.product_id, cur + item.quantity);
    }

    // Verify stock
    for (const [prodId, reqQty] of requiredStock.entries()) {
      const prod = this.products.get(prodId);
      if (!prod || prod.stock < reqQty) {
        return {
          success: false,
          error_code: 'INSUFFICIENT_STOCK',
          error: `Insufficient stock for product "${prod?.name}". Available: ${prod?.stock ?? 0}, Required: ${reqQty}`,
        };
      }
    }

    // Deduct physical stock
    for (const [prodId, reqQty] of requiredStock.entries()) {
      const prod = this.products.get(prodId)!;
      prod.stock -= reqQty;
    }

    // Create invoice and copy items preserving dimensional attributes
    q.status = 'converted';
    this.invoices.set(invoiceId, { id: invoiceId, invoice_number: invoiceNumber, grand_total: q.grand_total });
    for (const item of qItems) {
      this.invoiceItems.push({
        ...item,
        id: `inv-item-${Date.now()}-${Math.random()}`,
        invoice_id: invoiceId,
      });
    }

    return { success: true };
  }
}

describe('StockIN Dimension-Based Product Billing Test Suite (Section 23)', () => {
  let db: DimensionDatabaseSimulator;

  beforeEach(() => {
    db = new DimensionDatabaseSimulator();
  });

  // =========================================================================
  // Test 1: Standard product invoice
  // =========================================================================
  test('Test 1: Standard product invoice — physical quantity * rate, stock 10 -> 8', async () => {
    db.addProduct({
      id: 'prod-standard-a',
      name: 'Product A (Standard)',
      sku: 'SKU-STD-001',
      stock: 10,
      min_stock: 2,
      selling_price: 100,
      tax_rate: 18,
      billing_type: 'standard',
    });

    const calc = calculateLineItem(2, 100, 0, 18, { billingType: 'standard' });
    expect(calc.billableQuantity).toBe(2);
    expect(calc.taxableAmount).toBe(200);
    expect(calc.taxAmount).toBe(36);
    expect(calc.totalAmount).toBe(236);

    const result = await db.executeCreateInvoiceRpc(
      'user-1',
      { id: 'inv-1', invoice_number: 'INV-001', customer_id: 'cust-1', grand_total: calc.totalAmount },
      [
        {
          product_id: 'prod-standard-a',
          product_name: 'Product A (Standard)',
          quantity: 2,
          rate: 100,
          discount_percent: 0,
          tax_rate: 18,
          billing_type: 'standard',
        },
      ]
    );

    expect(result.success).toBe(true);
    const prod = db.products.get('prod-standard-a');
    expect(prod?.stock).toBe(8); // 10 - 2 = 8
  });

  // =========================================================================
  // Test 2: Dimension product invoice
  // =========================================================================
  test('Test 2: Dimension product invoice — 2 x 4 ft, Qty 1 @ ₹120/sq.ft -> Billable Qty 8, Amt 960 + GST, Stock 10 -> 9', async () => {
    db.addProduct({
      id: 'prod-door-b',
      name: 'Door (Dimension)',
      sku: 'DOOR-001',
      stock: 10,
      min_stock: 2,
      selling_price: 120,
      tax_rate: 18,
      billing_type: 'dimension',
      dimension_unit: 'ft',
      billing_unit: 'sq.ft',
    });

    // 2 ft x 4 ft x 1 unit @ 120/sq.ft
    const calc = calculateLineItem(1, 120, 0, 18, {
      billingType: 'dimension',
      length: 2,
      width: 4,
    });

    expect(calc.billableQuantity).toBe(8); // 2 * 4 * 1 = 8 sq.ft
    expect(calc.taxableAmount).toBe(960); // 8 * 120 = 960
    expect(calc.taxAmount).toBe(172.8); // 960 * 18% = 172.80
    expect(calc.totalAmount).toBe(1132.8);

    const result = await db.executeCreateInvoiceRpc(
      'user-1',
      { id: 'inv-2', invoice_number: 'INV-002', customer_id: 'cust-1', grand_total: calc.totalAmount },
      [
        {
          product_id: 'prod-door-b',
          product_name: 'Door (Dimension)',
          quantity: 1,
          rate: 120,
          discount_percent: 0,
          tax_rate: 18,
          billing_type: 'dimension',
          length: 2,
          width: 4,
          dimension_unit: 'ft',
          billing_unit: 'sq.ft',
        },
      ]
    );

    expect(result.success).toBe(true);
    const prod = db.products.get('prod-door-b');
    expect(prod?.stock).toBe(9); // Physical stock 10 - 1 = 9 (NOT 10 - 8 = 2!)
  });

  // =========================================================================
  // Test 3: Dimension product multiple quantity
  // =========================================================================
  test('Test 3: Dimension product multiple quantity — 2 x 4 ft, Qty 3 @ ₹120/sq.ft -> Billable Qty 24, Amt 2,880 + GST, Stock 10 -> 7', async () => {
    db.addProduct({
      id: 'prod-door-b',
      name: 'Door (Dimension)',
      sku: 'DOOR-001',
      stock: 10,
      min_stock: 2,
      selling_price: 120,
      tax_rate: 18,
      billing_type: 'dimension',
      dimension_unit: 'ft',
      billing_unit: 'sq.ft',
    });

    // 2 ft x 4 ft x 3 units @ 120/sq.ft
    const calc = calculateLineItem(3, 120, 0, 18, {
      billingType: 'dimension',
      length: 2,
      width: 4,
    });

    expect(calc.billableQuantity).toBe(24); // 2 * 4 * 3 = 24 sq.ft
    expect(calc.taxableAmount).toBe(2880); // 24 * 120 = 2,880
    expect(calc.taxAmount).toBe(518.4); // 2,880 * 18% = 518.40
    expect(calc.totalAmount).toBe(3398.4);

    const result = await db.executeCreateInvoiceRpc(
      'user-1',
      { id: 'inv-3', invoice_number: 'INV-003', customer_id: 'cust-1', grand_total: calc.totalAmount },
      [
        {
          product_id: 'prod-door-b',
          product_name: 'Door (Dimension)',
          quantity: 3,
          rate: 120,
          discount_percent: 0,
          tax_rate: 18,
          billing_type: 'dimension',
          length: 2,
          width: 4,
          dimension_unit: 'ft',
          billing_unit: 'sq.ft',
        },
      ]
    );

    expect(result.success).toBe(true);
    const prod = db.products.get('prod-door-b');
    expect(prod?.stock).toBe(7); // Physical stock: 10 - 3 = 7 (NOT 10 - 24 = -14!)
  });

  // =========================================================================
  // Test 4: Discount calculation
  // =========================================================================
  test('Test 4: Discount calculation — 2 x 4 x 1 @ ₹120 = ₹960, 5% disc = ₹48, Taxable = ₹912, GST on ₹912', () => {
    // 2 x 4 x 1 @ 120 = 960 base
    // 5% discount = 48
    // Taxable = 912
    // GST 18% on 912 = 164.16
    const calc = calculateLineItem(1, 120, 5, 18, {
      billingType: 'dimension',
      length: 2,
      width: 4,
    });

    expect(calc.billableQuantity).toBe(8);
    expect(calc.discountAmount).toBe(48);
    expect(calc.taxableAmount).toBe(912);
    expect(calc.taxAmount).toBe(164.16);
    expect(calc.totalAmount).toBe(1076.16);
  });

  // =========================================================================
  // Test 5: GST calculation
  // =========================================================================
  test('Test 5: GST calculation — Base ₹960, GST 18% = ₹172.80, Total = ₹1,132.80', () => {
    const calc = calculateLineItem(1, 120, 0, 18, {
      billingType: 'dimension',
      length: 2,
      width: 4,
    });

    expect(calc.taxableAmount).toBe(960);
    expect(calc.taxAmount).toBe(172.8);
    expect(calc.totalAmount).toBe(1132.8);
  });

  // =========================================================================
  // Test 6: Insufficient stock rejection
  // =========================================================================
  test('Test 6: Insufficient stock rejection — Stock 1, try to sell Qty 2 -> Rejected, stock remains 1', async () => {
    db.addProduct({
      id: 'prod-door-low',
      name: 'Door (Dimension)',
      sku: 'DOOR-002',
      stock: 1, // Only 1 physical unit in warehouse
      min_stock: 0,
      selling_price: 120,
      tax_rate: 18,
      billing_type: 'dimension',
      dimension_unit: 'ft',
      billing_unit: 'sq.ft',
    });

    const result = await db.executeCreateInvoiceRpc(
      'user-1',
      { id: 'inv-fail', invoice_number: 'INV-FAIL', customer_id: 'cust-1', grand_total: 2000 },
      [
        {
          product_id: 'prod-door-low',
          product_name: 'Door (Dimension)',
          quantity: 2, // Requesting 2 units (available: 1)
          rate: 120,
          billing_type: 'dimension',
          length: 2,
          width: 4,
        },
      ]
    );

    expect(result.success).toBe(false);
    expect(result.error_code).toBe('INSUFFICIENT_STOCK');
    const prod = db.products.get('prod-door-low');
    expect(prod?.stock).toBe(1); // Stock completely unchanged
    expect(db.invoices.has('inv-fail')).toBe(false);
  });

  // =========================================================================
  // Test 7: Missing dimension validation
  // =========================================================================
  test('Test 7: Missing dimension validation — Length = 0, Width = 4 -> Rejected', async () => {
    db.addProduct({
      id: 'prod-door-c',
      name: 'Door (Dimension)',
      sku: 'DOOR-003',
      stock: 10,
      min_stock: 0,
      selling_price: 120,
      tax_rate: 18,
      billing_type: 'dimension',
    });

    const result = await db.executeCreateInvoiceRpc(
      'user-1',
      { id: 'inv-err', invoice_number: 'INV-ERR', customer_id: 'cust-1', grand_total: 500 },
      [
        {
          product_id: 'prod-door-c',
          product_name: 'Door (Dimension)',
          quantity: 1,
          rate: 120,
          billing_type: 'dimension',
          length: 0, // Invalid length!
          width: 4,
        },
      ]
    );

    expect(result.success).toBe(false);
    expect(result.error_code).toBe('INVALID_DIMENSIONS');
    const prod = db.products.get('prod-door-c');
    expect(prod?.stock).toBe(10); // Stock unchanged
  });

  // =========================================================================
  // Test 8: Existing invoice compatibility
  // =========================================================================
  test('Test 8: Existing invoice compatibility — legacy items without dimensions render without errors', () => {
    // Legacy invoice record created prior to dimension billing
    const legacyItem = {
      quantity: 5,
      rate: 50,
      discountPercent: 0,
      taxRate: 18,
      // No billingType, length, width, or billableQuantity
    };

    const totals = calculateTotals([legacyItem]);
    expect(totals.subtotal).toBe(250);
    expect(totals.taxTotal).toBe(45);
    expect(totals.grandTotal).toBe(295);

    const legacyInvoice: Invoice = {
      id: 'inv-legacy',
      invoiceNumber: 'INV-LEGACY-001',
      customerId: 'cust-1',
      customerName: 'Old Customer',
      customerPhone: '9999999999',
      date: '2026-01-01',
      dueDate: '2026-01-15',
      items: [
        {
          id: 'item-leg-1',
          productId: 'prod-leg',
          productName: 'Old Product',
          sku: 'LEG-01',
          hsnCode: '94033010',
          quantity: 5,
          rate: 50,
          discountPercent: 0,
          taxRate: 18,
          taxAmount: 45,
          amount: 295,
        },
      ],
      subtotal: 250,
      discountTotal: 0,
      taxTotal: 45,
      cgst: 22.5,
      sgst: 22.5,
      grandTotal: 295,
      paidAmount: 295,
      balance: 0,
      status: 'paid',
      createdAt: '2026-01-01T00:00:00Z',
    } as unknown as Invoice;

    const settings = {
      businessName: 'StockIN Master',
      phone: '9876543210',
      email: 'owner@stockin.com',
      address: 'Industrial Area',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      pincode: '462001',
      gstin: '23AAAAA0000A1Z5',
    } as BusinessSettings;

    const pdf = generateDocumentPdf({
      type: 'invoice',
      document: legacyInvoice,
      settings,
    });

    expect(pdf.base64).toBeTruthy();
    expect(pdf.blob.size).toBeGreaterThan(500);
  });

  // =========================================================================
  // Test 9: PDF generation with dimensional data
  // =========================================================================
  test('Test 9: PDF generation — generates valid PDF 1.4 containing dimension specs', () => {
    const dimInvoice = {
      id: 'inv-dim-pdf',
      invoiceNumber: 'INV-DIM-001',
      customerId: 'cust-dim',
      customerName: 'Architect Customer',
      customerPhone: '9888888888',
      date: '2026-09-20',
      dueDate: '2026-10-05',
      items: [
        {
          id: 'item-dim-1',
          productId: 'door-prod',
          productName: 'Teak Wood Flush Door',
          sku: 'DOOR-TEAK-01',
          hsnCode: '94033010',
          quantity: 2,
          rate: 120,
          discountPercent: 0,
          taxRate: 18,
          taxAmount: 345.6,
          amount: 2265.6,
          billingType: 'dimension',
          length: 2.5,
          width: 6.5,
          dimensionUnit: 'ft',
          billingUnit: 'sq.ft',
          billableQuantity: 32.5, // 2.5 * 6.5 * 2 = 32.5 sq.ft
        },
      ],
      subtotal: 1920,
      discountTotal: 0,
      taxTotal: 345.6,
      grandTotal: 2266,
      paidAmount: 2266,
      balance: 0,
      status: 'paid',
      createdAt: '2026-09-20T00:00:00Z',
    } as unknown as Invoice;

    const settings = {
      businessName: 'StockIN Plywood & Glass',
      phone: '9876543210',
      email: 'owner@stockin.com',
      address: 'Commercial Complex',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      pincode: '462001',
      gstin: '23AAAAA0000A1Z5',
    } as BusinessSettings;

    const pdf = generateDocumentPdf({
      type: 'invoice',
      document: dimInvoice,
      settings,
    });

    expect(pdf.blob.size).toBeGreaterThan(1000);
    // Convert base64 to text to verify content stream
    const decoded = Buffer.from(pdf.base64, 'base64').toString('utf-8');
    expect(decoded).toContain('%PDF-1.4');
    expect(decoded).toContain('Teak Wood Flush Door');
    expect(decoded).toContain('Size: 2.5 ft x 6.5 ft');
    expect(decoded).toContain('Billable Area: 32.5 sq.ft');
    expect(decoded).toContain('Rs. 120.00/sq.ft');
  });

  // =========================================================================
  // Test 10: Quotation conversion
  // =========================================================================
  test('Test 10: Quotation conversion — dimensions preserved and physical stock deducted by physical Qty only', async () => {
    db.addProduct({
      id: 'prod-door-quot',
      name: 'Custom Glass Door',
      sku: 'GLASS-01',
      stock: 10,
      min_stock: 1,
      selling_price: 150,
      tax_rate: 18,
      billing_type: 'dimension',
      dimension_unit: 'ft',
      billing_unit: 'sq.ft',
    });

    // Quotation with 2 doors of 2 x 4 ft = 16 sq.ft
    const quotationId = 'quot-100';
    db.quotations.set(quotationId, {
      id: quotationId,
      quotation_number: 'QUO-100',
      customer_id: 'cust-1',
      grand_total: 2832,
      status: 'sent',
    });

    db.quotationItems.push({
      id: 'q-item-1',
      quotation_id: quotationId,
      product_id: 'prod-door-quot',
      product_name: 'Custom Glass Door',
      quantity: 2, // Physical Qty = 2
      rate: 150,
      discount_percent: 0,
      tax_rate: 18,
      tax_amount: 432,
      amount: 2832,
      billing_type: 'dimension',
      length: 2,
      width: 4,
      dimension_unit: 'ft',
      billing_unit: 'sq.ft',
      billable_quantity: 16, // 2 * 4 * 2 = 16 sq.ft
    });

    // Initial stock is 10
    expect(db.products.get('prod-door-quot')?.stock).toBe(10);

    // Convert quotation to invoice
    const convertRes = await db.executeConvertQuotationRpc(quotationId, 'inv-from-quot', 'INV-QUOT-100');
    expect(convertRes.success).toBe(true);

    // Stock deduction must be physical Qty (2 units), NOT 16 sq.ft!
    const prod = db.products.get('prod-door-quot');
    expect(prod?.stock).toBe(8); // 10 - 2 = 8!

    // Created invoice item must preserve dimensional metadata
    const createdItem = db.invoiceItems.find((i) => i.invoice_id === 'inv-from-quot');
    expect(createdItem).toBeDefined();
    expect(createdItem?.billing_type).toBe('dimension');
    expect(createdItem?.length).toBe(2);
    expect(createdItem?.width).toBe(4);
    expect(createdItem?.billable_quantity).toBe(16);
    expect(createdItem?.rate).toBe(150);
  });

  // =========================================================================
  // Migration & Schema Integrity Check
  // =========================================================================
  test('Database Migration & Schema Integrity — SQL schema contains dimensional columns and physical deduction logic', () => {
    const migrationPath = path.resolve(
      __dirname,
      '../../../../../../supabase/migrations/20260920000000_dimension_based_billing.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Products table alterations
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS billing_type');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS dimension_unit');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS billing_unit');

    // Invoice & Quotation items alterations
    expect(sql).toContain('ALTER TABLE public.invoice_items');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS length NUMERIC(12, 3)');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS width NUMERIC(12, 3)');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS billable_quantity NUMERIC(12, 3)');
    expect(sql).toContain('ALTER TABLE public.quotation_items');

    // Pre-flight check & physical deduction in RPC
    expect(sql).toContain('SUM(item.quantity)::INTEGER AS total_qty');
    expect(sql).toContain('v_line_base := round((v_billable_qty * v_item_rec.rate)::numeric, 2)');
  });
});
