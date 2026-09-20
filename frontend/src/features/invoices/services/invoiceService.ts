/**
 * src/features/invoices/services/invoiceService.ts
 *
 * Dedicated Supabase service layer for Invoice operations
 */

import { supabase } from '@/lib/supabase/client';
import type { Invoice, InvoiceItem } from '@/types';

export interface DbInvoiceItem {
  id: string;
  invoice_id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  sku?: string | null;
  hsn_code?: string | null;
  quantity: number;
  rate: number;
  discount_percent: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  billing_type?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimension_unit?: string | null;
  billing_unit?: string | null;
  billable_quantity?: number | null;
  created_at?: string | null;
}

export interface DbInvoice {
  id: string;
  user_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_company?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  customer_gstin?: string | null;
  date: string;
  due_date?: string | null;
  payment_terms?: string | null;
  subtotal: number;
  discount_total: number;
  cgst?: number | null;
  sgst?: number | null;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  balance: number;
  status: string;
  notes?: string | null;
  storage_file_path?: string | null;
  file_size?: number | null;
  pdf_status?: string | null;
  pdf_uploaded_at?: string | null;
  pdf_error?: string | null;
  created_at?: string | null;
  invoice_items?: DbInvoiceItem[];
}

export function dbToInvoiceItem(r: DbInvoiceItem): InvoiceItem {
  return {
    id: r.id,
    productId: r.product_id,
    productName: r.product_name,
    sku: r.sku ?? '',
    hsnCode: r.hsn_code ?? '',
    quantity: Number(r.quantity),
    rate: Number(r.rate),
    discountPercent: Number(r.discount_percent),
    taxRate: Number(r.tax_rate),
    taxAmount: Number(r.tax_amount),
    amount: Number(r.amount),
    billingType: (r.billing_type as InvoiceItem['billingType']) || 'standard',
    length: r.length != null ? Number(r.length) : undefined,
    width: r.width != null ? Number(r.width) : undefined,
    height: r.height != null ? Number(r.height) : undefined,
    dimensionUnit: (r.dimension_unit as InvoiceItem['dimensionUnit']) || undefined,
    billingUnit: r.billing_unit || undefined,
    billableQuantity: r.billable_quantity != null ? Number(r.billable_quantity) : undefined,
  };
}

export function dbToInvoice(r: DbInvoice): Invoice {
  return {
    id: r.id,
    userId: r.user_id,
    invoiceNumber: r.invoice_number,
    customerId: r.customer_id,
    customerName: r.customer_name,
    customerCompany: r.customer_company ?? '',
    customerPhone: r.customer_phone ?? '',
    customerEmail: r.customer_email ?? '',
    customerAddress: r.customer_address ?? '',
    customerGstin: r.customer_gstin ?? '',
    date: r.date,
    dueDate: r.due_date ?? '',
    paymentTerms: r.payment_terms ?? '',
    items: (r.invoice_items ?? []).map(dbToInvoiceItem),
    subtotal: Number(r.subtotal),
    discountTotal: Number(r.discount_total),
    taxTotal: Number(r.tax_total),
    grandTotal: Number(r.grand_total),
    paidAmount: Number(r.paid_amount),
    balance: Number(r.balance),
    status: r.status as Invoice['status'],
    notes: r.notes ?? undefined,
    storageFilePath: r.storage_file_path ?? undefined,
    fileSize: r.file_size != null ? Number(r.file_size) : undefined,
    pdfStatus: (r.pdf_status as Invoice['pdfStatus']) ?? 'pending',
    pdfUploadedAt: r.pdf_uploaded_at ?? undefined,
    pdfError: r.pdf_error ?? undefined,
  };
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[InvoiceService] fetchInvoices:', error.message);
    throw error;
  }
  return (data ?? []).map((r) => dbToInvoice(r as DbInvoice));
}

export async function insertInvoice(inv: Invoice): Promise<void> {
  const { error: hErr } = await supabase.from('invoices').insert({
    id:               inv.id,
    invoice_number:   inv.invoiceNumber,
    customer_id:      inv.customerId,
    customer_name:    inv.customerName,
    customer_company: inv.customerCompany || null,
    customer_phone:   inv.customerPhone || null,
    customer_email:   inv.customerEmail || null,
    customer_address: inv.customerAddress || null,
    customer_gstin:   inv.customerGstin || null,
    date:             inv.date,
    due_date:         inv.dueDate || null,
    payment_terms:    inv.paymentTerms || null,
    subtotal:         inv.subtotal,
    discount_total:   inv.discountTotal,
    tax_total:        inv.taxTotal,
    grand_total:      inv.grandTotal,
    paid_amount:      inv.paidAmount,
    balance:          inv.balance,
    status:           inv.status,
    notes:            inv.notes || null,
  });
  if (hErr) {
    console.error('[InvoiceService] insertInvoice header:', hErr.message);
    throw hErr;
  }

  if (inv.items.length > 0) {
    const rows = inv.items.map((item) => ({
      id:               item.id,
      invoice_id:       inv.id,
      product_id:       item.productId,
      product_name:     item.productName,
      sku:              item.sku || null,
      hsn_code:         item.hsnCode || null,
      quantity:         item.quantity,
      rate:             item.rate,
      discount_percent: item.discountPercent,
      tax_rate:         item.taxRate,
      tax_amount:       item.taxAmount,
      amount:           item.amount,
      billing_type:      item.billingType || 'standard',
      length:            item.length ?? null,
      width:             item.width ?? null,
      height:            item.height ?? null,
      dimension_unit:    item.dimensionUnit ?? null,
      billing_unit:      item.billingUnit ?? null,
      billable_quantity: item.billableQuantity ?? null,
    }));
    const { error: iErr } = await supabase.from('invoice_items').insert(rows);
    if (iErr) {
      console.error('[InvoiceService] insertInvoiceItems:', iErr.message);
      throw iErr;
    }
  }
}

export async function updateInvoiceFinancials(
  id: string,
  status: string,
  paidAmount: number,
  balance: number,
): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ status, paid_amount: paidAmount, balance })
    .eq('id', id);

  if (error) {
    console.error('[InvoiceService] updateInvoiceFinancials:', error.message);
    throw error;
  }
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) {
    console.error('[InvoiceService] deleteInvoice:', error.message);
    throw error;
  }
}

export async function updateInvoiceStorageMetadata(
  id: string,
  metadata: {
    storageFilePath?: string;
    fileSize?: number;
    pdfStatus: 'pending' | 'uploaded' | 'failed';
    pdfError?: string | null;
  }
): Promise<void> {
  const patch: Record<string, unknown> = {
    pdf_status: metadata.pdfStatus,
    pdf_uploaded_at: metadata.pdfStatus === 'uploaded' ? new Date().toISOString() : undefined,
    pdf_error: metadata.pdfError ?? null,
  };
  if (metadata.storageFilePath) patch.storage_file_path = metadata.storageFilePath;
  if (metadata.fileSize != null) patch.file_size = metadata.fileSize;

  const { error } = await supabase.from('invoices').update(patch).eq('id', id);
  if (error) {
    console.error('[InvoiceService] updateInvoiceStorageMetadata:', error.message);
    throw error;
  }
}

export interface CreateInvoiceAtomicResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  grandTotal?: number;
  balance?: number;
  customerId?: string;
  errorCode?: string;
  error?: string;
}

/**
 * Executes atomic invoice creation via PostgreSQL create_invoice_rpc.
 * 
 * Runs a single database transaction:
 * 1. Authenticates auth.uid()
 * 2. Locks product rows deterministically
 * 3. Validates warehouse stock across all line items
 * 4. Inserts invoice header and invoice items
 * 5. Deducts inventory and inserts STOCK_OUT audit movements
 * 6. Updates customer ledger and financial aggregates
 * 7. Records automatic payment entry if paidAmount > 0
 * 
 * ALL SUCCESS -> COMMIT | ANY FAILURE -> ROLLBACK
 */
export async function createInvoiceAtomic(
  inv: Omit<Invoice, 'id'> & { id?: string },
  paymentMethod: string = 'UPI'
): Promise<CreateInvoiceAtomicResult> {
  const invoicePayload = {
    id:               inv.id || undefined,
    invoice_number:   inv.invoiceNumber,
    customer_id:      inv.customerId,
    customer_name:    inv.customerName,
    customer_company: inv.customerCompany || null,
    customer_phone:   inv.customerPhone || null,
    customer_email:   inv.customerEmail || null,
    customer_address: inv.customerAddress || null,
    customer_gstin:   inv.customerGstin || null,
    date:             inv.date,
    due_date:         inv.dueDate || null,
    payment_terms:    inv.paymentTerms || null,
    subtotal:         inv.subtotal,
    discount_total:   inv.discountTotal,
    cgst:             (inv as unknown as { cgst?: number }).cgst || 0,
    sgst:             (inv as unknown as { sgst?: number }).sgst || 0,
    tax_total:        inv.taxTotal,
    grand_total:      inv.grandTotal,
    paid_amount:      inv.paidAmount,
    balance:          inv.balance,
    status:           inv.status,
    notes:            inv.notes || null,
  };

  const itemsPayload = inv.items.map((item) => ({
    id:               item.id || undefined,
    product_id:       item.productId,
    product_name:     item.productName,
    sku:              item.sku || null,
    hsn_code:         item.hsnCode || null,
    quantity:         item.quantity,
    rate:             item.rate,
    discount_percent: item.discountPercent,
    tax_rate:         item.taxRate,
    tax_amount:       item.taxAmount,
    amount:           item.amount,
    billing_type:      item.billingType || 'standard',
    length:            item.length ?? null,
    width:             item.width ?? null,
    height:            item.height ?? null,
    dimension_unit:    item.dimensionUnit ?? null,
    billing_unit:      item.billingUnit ?? null,
    billable_quantity: item.billableQuantity ?? null,
  }));

  const paymentPayload =
    inv.paidAmount > 0
      ? {
          method: paymentMethod || 'UPI',
          reference_number: `INV-SETTLE-${inv.invoiceNumber}`,
          notes: 'Payment recorded on invoice generation',
        }
      : null;

  const { data, error } = await supabase.rpc('create_invoice_rpc', {
    p_invoice: invoicePayload,
    p_items:   itemsPayload,
    p_payment: paymentPayload,
  });

  if (error) {
    console.error('[InvoiceService] create_invoice_rpc network/server error:', error.message);
    return {
      success: false,
      errorCode: 'RPC_ERROR',
      error: error.message || 'Invoice creation transaction failed on server.',
    };
  }

  const result = data as {
    success: boolean;
    invoice_id?: string;
    invoice_number?: string;
    grand_total?: number;
    balance?: number;
    customer_id?: string;
    error_code?: string;
    error?: string;
  };

  if (!result.success) {
    return {
      success: false,
      errorCode: result.error_code || 'TRANSACTION_ABORTED',
      error: result.error || 'Invoice transaction aborted.',
    };
  }

  return {
    success: true,
    invoiceId: result.invoice_id,
    invoiceNumber: result.invoice_number,
    grandTotal: result.grand_total,
    balance: result.balance,
    customerId: result.customer_id,
  };
}

