/**
 * src/features/quotations/types/index.ts
 */

import type { PdfDocumentStatus } from '@/features/invoices/types';
import type { BillingType, DimensionUnit, BillingAreaUnit } from '@/features/products/types';

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  taxRate: number;
  taxAmount: number;
  amount: number;
  // Dimension-based billing snapshot fields
  billingType?: BillingType;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: DimensionUnit;
  billingUnit?: BillingAreaUnit | string;
  billableQuantity?: number;
}

export interface Quotation {
  id: string;
  userId?: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  quotationDate: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: number;
  discountTotal: number;
  cgst: number;
  sgst: number;
  taxTotal: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  status: QuotationStatus;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Supabase PDF Document Storage (Step 5)
  storageFilePath?: string;
  fileSize?: number;
  pdfStatus?: PdfDocumentStatus;
  pdfUploadedAt?: string;
  pdfError?: string;
}
