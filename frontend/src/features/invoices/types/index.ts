/**
 * src/features/invoices/types/index.ts
 */

export type PaymentStatus = 'paid' | 'partial' | 'due';
export type PdfDocumentStatus = 'pending' | 'uploaded' | 'failed';

export interface InvoiceItem {
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
}

export interface Invoice {
  id: string;
  userId?: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerGstin: string;
  date: string;
  dueDate: string;
  paymentTerms: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  status: PaymentStatus;
  notes?: string;
  // Supabase PDF Document Storage (Step 5)
  storageFilePath?: string;
  fileSize?: number;
  pdfStatus?: PdfDocumentStatus;
  pdfUploadedAt?: string;
  pdfError?: string;
}
