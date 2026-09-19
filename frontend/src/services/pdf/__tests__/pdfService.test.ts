/**
 * frontend/src/services/pdf/__tests__/pdfService.test.ts
 *
 * Vector PDF 1.4 Generation Reliability Tests (Step 4 Section 23)
 * Validates:
 * 1. Single item invoice PDF generation.
 * 2. Multi-item invoice PDF generation.
 * 3. Long product names, long customer names, and long address handling.
 * 4. Large quantities, rates, discounts, and GST taxes.
 * 5. Quotation PDF generation.
 * 6. PDF 1.4 specification compliance (magic header %PDF-1.4, xref, trailer, %%EOF, base64).
 */

import { describe, test, expect } from 'bun:test';
import { generateDocumentPdf } from '@/services/pdf/pdfService';
import type { Invoice, Quotation, BusinessSettings } from '@/types';

const defaultSettings: BusinessSettings = {
  businessName: 'StockIN Solutions Pvt Ltd',
  tagline: 'Leading Hardware & Office Automation',
  address: 'Plot 42, Sector C, Industrial Area, Govindpura',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pincode: '462023',
  ownerName: 'Admin',
  phone: '+91 755 4901234',
  email: 'billing@stockin.io',
  gstin: '23AAAAA0000A1Z5',
  pan: 'AAAAA0000A',
  currency: 'INR',
  currencySymbol: '₹',
  defaultTaxRate: 18,
  invoicePrefix: 'INV-',
  quotationPrefix: 'QUO-',
  paymentTerms: 'Due on Receipt',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  upiId: 'stockin@hdfcbank',
  footerMessage: 'Thank you for choosing StockIN. Subject to Bhopal Jurisdiction.',
  theme: 'light',
  density: 'comfortable',
};

describe('Step 4 — PDF Generation Reliability Tests', () => {
  test('Generates standard 1-item invoice with valid PDF 1.4 structure', () => {
    const invoice: Invoice = {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      customerId: 'cust-1',
      customerName: 'Anand Sharma',
      customerCompany: 'Apex Technologies',
      customerPhone: '9826012345',
      customerEmail: 'anand@apex.com',
      customerAddress: '12 Malviya Nagar, Bhopal',
      customerGstin: '23BBBBB1111B1Z2',
      date: '2026-09-18',
      dueDate: '2026-10-18',
      paymentTerms: 'Net 30',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Ergonomic Office Chair',
          sku: 'EOC-100',
          hsnCode: '94033010',
          quantity: 2,
          rate: 4500,
          discountPercent: 5,
          taxRate: 18,
          taxAmount: 1539,
          amount: 10089,
        },
      ],
      subtotal: 9000,
      discountTotal: 450,
      taxTotal: 1539,
      grandTotal: 10089,
      paidAmount: 10089,
      balance: 0,
      status: 'paid',
      notes: 'Delivered in good condition.',
    };

    const { blob, base64 } = generateDocumentPdf({
      type: 'invoice',
      document: invoice,
      settings: defaultSettings,
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(500);
    expect(blob.type).toBe('application/pdf');

    expect(base64).toBeDefined();
    expect(base64.length).toBeGreaterThan(100);

    // Decode base64 to inspect raw PDF vector stream
    const decoded = atob(base64);
    expect(decoded.startsWith('%PDF-1.4')).toBe(true);
    expect(decoded.includes('%%EOF')).toBe(true);
    expect(decoded.includes('xref')).toBe(true);
    expect(decoded.includes('trailer')).toBe(true);
    expect(decoded.includes('TAX INVOICE')).toBe(true);
    expect(decoded.includes('INV-2026-001')).toBe(true);
    expect(decoded.includes('Apex Technologies')).toBe(true);
    expect(decoded.includes('Ergonomic Office Chair')).toBe(true);
  });

  test('Generates multi-item invoice with varying taxes and discounts without layout break', () => {
    const invoice: Invoice = {
      id: 'inv-multi',
      invoiceNumber: 'INV-2026-002',
      customerId: 'cust-2',
      customerName: 'Kavita Iyer',
      customerCompany: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerGstin: '',
      date: '2026-09-18',
      dueDate: '2026-09-18',
      paymentTerms: 'Due on Receipt',
      items: [
        {
          id: 'item-1',
          productId: 'p-1',
          productName: 'Item 1 - Standard Product',
          sku: 'SKU-1',
          hsnCode: '9403',
          quantity: 5,
          rate: 1000,
          discountPercent: 10,
          taxRate: 18,
          taxAmount: 810,
          amount: 5310,
        },
        {
          id: 'item-2',
          productId: 'p-2',
          productName: 'Item 2 - Hardware Accessory',
          sku: 'SKU-2',
          hsnCode: '9403',
          quantity: 10,
          rate: 250,
          discountPercent: 0,
          taxRate: 12,
          taxAmount: 300,
          amount: 2800,
        },
        {
          id: 'item-3',
          productId: 'p-3',
          productName: 'Item 3 - Service / Labour Charge',
          sku: 'SKU-3',
          hsnCode: '9983',
          quantity: 1,
          rate: 1500,
          discountPercent: 0,
          taxRate: 18,
          taxAmount: 270,
          amount: 1770,
        },
      ],
      subtotal: 9000,
      discountTotal: 500,
      taxTotal: 1380,
      grandTotal: 9880,
      paidAmount: 5000,
      balance: 4880,
      status: 'partial',
    };

    const { base64 } = generateDocumentPdf({
      type: 'invoice',
      document: invoice,
      settings: defaultSettings,
    });

    const decoded = atob(base64);
    expect(decoded).toContain('INV-2026-002');
    expect(decoded).toContain('Item 1 - Standard Product');
    expect(decoded).toContain('Item 2 - Hardware Accessory');
    expect(decoded).toContain('Item 3 - Service / Labour Charge');
    expect(decoded).toContain('PARTIAL');
  });

  test('Handles edge cases: long product names, long customer names, and extended addresses', () => {
    const invoice: Invoice = {
      id: 'inv-long',
      invoiceNumber: 'INV-LONG-999',
      customerId: 'cust-long',
      customerName: 'Very Long Customer Name Representing An Extensive Enterprise Organization With Subdivisions',
      customerCompany: 'Enterprise Multinational Conglomerate Industrial Systems Private Limited India Operations',
      customerPhone: '',
      customerEmail: '',
      customerAddress: 'Unit 401-405, 4th Floor, Tower B, Cyber City Mega Business Park, DLF Phase 2, Gurugram, Haryana 122002',
      customerGstin: '',
      date: '2026-09-18',
      dueDate: '2026-09-18',
      paymentTerms: 'Due on Receipt',
      items: [
        {
          id: 'item-long',
          productId: 'p-long',
          productName: 'Heavy Duty Modular Multi-Function Pneumatic Actuator System with Integrated Digital Pressure Transducer and Sensor Array',
          sku: 'SKU-LONG',
          hsnCode: '8481',
          quantity: 1000,
          rate: 75000,
          discountPercent: 12.5,
          taxRate: 28,
          taxAmount: 18375000,
          amount: 84000000,
        },
      ],
      subtotal: 75000000,
      discountTotal: 9375000,
      taxTotal: 18375000,
      grandTotal: 84000000,
      paidAmount: 0,
      balance: 84000000,
      status: 'due',
    };

    const { base64 } = generateDocumentPdf({
      type: 'invoice',
      document: invoice,
      settings: defaultSettings,
    });

    const decoded = atob(base64);
    expect(decoded.startsWith('%PDF-1.4')).toBe(true);
    expect(decoded.endsWith('%%EOF')).toBe(true);
    expect(decoded).toContain('INV-LONG-999');
    // Ensure text stream escapes special chars like parentheses
    expect(decoded).not.toContain('NaN');
    expect(decoded).not.toContain('undefined');
  });

  test('Generates quotation PDF with proper QUOTATION header and Valid Until date', () => {
    const quotation: Quotation = {
      id: 'quo-1',
      quotationNumber: 'QUO-2026-101',
      customerId: 'cust-quo',
      customerName: 'Deepak Chawla',
      customerCompany: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerGstin: '',
      quotationDate: '2026-09-18',
      validUntil: '2026-10-02',
      items: [
        {
          id: 'q-item-1',
          productId: 'prod-10',
          productName: 'Commercial CCTV 8-Channel Surveillance Kit',
          sku: 'CCTV-8CH',
          hsnCode: '8525',
          quantity: 1,
          rate: 22000,
          discountPercent: 10,
          taxRate: 18,
          taxAmount: 3564,
          amount: 23364,
        },
      ],
      subtotal: 22000,
      discountTotal: 2200,
      cgst: 1782,
      sgst: 1782,
      taxTotal: 3564,
      grandTotal: 23364,
      status: 'sent',
      createdAt: '2026-09-18',
      updatedAt: '2026-09-18',
      notes: 'Price valid for 14 days from date of issue.',
    };

    const { base64 } = generateDocumentPdf({
      type: 'quotation',
      document: quotation,
      settings: defaultSettings,
    });

    const decoded = atob(base64);
    expect(decoded).toContain('QUOTATION');
    expect(decoded).toContain('QUO-2026-101');
    expect(decoded).toContain('Valid Until:');
    expect(decoded).toContain('Commercial CCTV 8-Channel Survei');
  });
});
