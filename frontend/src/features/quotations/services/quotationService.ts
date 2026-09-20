/**
 * src/features/quotations/services/quotationService.ts
 *
 * Dedicated Supabase service layer for Quotation operations
 */

import { supabase } from '@/lib/supabase/client';
import type { Quotation, QuotationItem } from '@/types';

export interface DbQuotationItem {
  id: string;
  quotation_id: string;
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

export interface DbQuotation {
  id: string;
  user_id: string;
  quotation_number: string;
  customer_id: string;
  customer_name: string;
  customer_company?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  customer_gstin?: string | null;
  quotation_date: string;
  valid_until?: string | null;
  subtotal: number;
  discount_total: number;
  cgst?: number | null;
  sgst?: number | null;
  tax_total: number;
  grand_total: number;
  notes?: string | null;
  terms?: string | null;
  status: string;
  converted_invoice_id?: string | null;
  converted_invoice_number?: string | null;
  converted_at?: string | null;
  storage_file_path?: string | null;
  file_size?: number | null;
  pdf_status?: string | null;
  pdf_uploaded_at?: string | null;
  pdf_error?: string | null;
  created_at?: string | null;
  quotation_items?: DbQuotationItem[];
}

export function dbToQuotationItem(r: DbQuotationItem): QuotationItem {
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
    billingType: (r.billing_type as QuotationItem['billingType']) || 'standard',
    length: r.length != null ? Number(r.length) : undefined,
    width: r.width != null ? Number(r.width) : undefined,
    height: r.height != null ? Number(r.height) : undefined,
    dimensionUnit: (r.dimension_unit as QuotationItem['dimensionUnit']) || undefined,
    billingUnit: r.billing_unit || undefined,
    billableQuantity: r.billable_quantity != null ? Number(r.billable_quantity) : undefined,
  };
}

export function dbToQuotation(r: DbQuotation): Quotation {
  return {
    id: r.id,
    userId: r.user_id,
    quotationNumber: r.quotation_number,
    customerId: r.customer_id,
    customerName: r.customer_name,
    customerCompany: r.customer_company ?? '',
    customerPhone: r.customer_phone ?? '',
    customerEmail: r.customer_email ?? '',
    customerAddress: r.customer_address ?? '',
    customerGstin: r.customer_gstin ?? '',
    quotationDate: r.quotation_date,
    validUntil: r.valid_until ?? '',
    items: (r.quotation_items ?? []).map(dbToQuotationItem),
    subtotal: Number(r.subtotal),
    discountTotal: Number(r.discount_total),
    cgst: r.cgst != null ? Number(r.cgst) : 0,
    sgst: r.sgst != null ? Number(r.sgst) : 0,
    taxTotal: Number(r.tax_total),
    grandTotal: Number(r.grand_total),
    notes: r.notes ?? undefined,
    terms: r.terms ?? undefined,
    status: r.status as Quotation['status'],
    convertedInvoiceId: r.converted_invoice_id ?? undefined,
    convertedInvoiceNumber: r.converted_invoice_number ?? undefined,
    convertedAt: r.converted_at ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString().split('T')[0],
    updatedAt: (r as unknown as { updated_at?: string }).updated_at ?? new Date().toISOString().split('T')[0],
    storageFilePath: r.storage_file_path ?? undefined,
    fileSize: r.file_size != null ? Number(r.file_size) : undefined,
    pdfStatus: (r.pdf_status as Quotation['pdfStatus']) ?? 'pending',
    pdfUploadedAt: r.pdf_uploaded_at ?? undefined,
    pdfError: r.pdf_error ?? undefined,
  };
}

export async function fetchQuotations(): Promise<Quotation[]> {
  const { data, error } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[QuotationService] fetchQuotations:', error.message);
    throw error;
  }
  return (data ?? []).map((r) => dbToQuotation(r as DbQuotation));
}

export async function insertQuotation(q: Quotation): Promise<void> {
  const { error: hErr } = await supabase.from('quotations').insert({
    id:               q.id,
    quotation_number: q.quotationNumber,
    customer_id:      q.customerId,
    customer_name:    q.customerName,
    customer_company: q.customerCompany || null,
    customer_phone:   q.customerPhone || null,
    customer_email:   q.customerEmail || null,
    customer_address: q.customerAddress || null,
    customer_gstin:   q.customerGstin || null,
    quotation_date:   q.quotationDate,
    valid_until:      q.validUntil || null,
    subtotal:         q.subtotal,
    discount_total:   q.discountTotal,
    cgst:             q.cgst ?? 0,
    sgst:             q.sgst ?? 0,
    tax_total:        q.taxTotal,
    grand_total:      q.grandTotal,
    notes:            q.notes || null,
    terms:            q.terms || null,
    status:           q.status,
  });
  if (hErr) {
    console.error('[QuotationService] insertQuotation header:', hErr.message);
    throw hErr;
  }

  if (q.items.length > 0) {
    const rows = q.items.map((item) => ({
      id:               item.id,
      quotation_id:     q.id,
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
    const { error: iErr } = await supabase.from('quotation_items').insert(rows);
    if (iErr) {
      console.error('[QuotationService] insertQuotationItems:', iErr.message);
      throw iErr;
    }
  }
}

export async function updateQuotation(id: string, updates: Partial<Quotation>): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.quotationNumber         !== undefined) patch.quotation_number         = updates.quotationNumber;
  if (updates.customerId              !== undefined) patch.customer_id              = updates.customerId;
  if (updates.customerName            !== undefined) patch.customer_name            = updates.customerName;
  if (updates.customerCompany         !== undefined) patch.customer_company         = updates.customerCompany || null;
  if (updates.customerPhone           !== undefined) patch.customer_phone           = updates.customerPhone || null;
  if (updates.customerEmail           !== undefined) patch.customer_email           = updates.customerEmail || null;
  if (updates.customerAddress         !== undefined) patch.customer_address         = updates.customerAddress || null;
  if (updates.customerGstin           !== undefined) patch.customer_gstin           = updates.customerGstin || null;
  if (updates.quotationDate           !== undefined) patch.quotation_date           = updates.quotationDate;
  if (updates.validUntil              !== undefined) patch.valid_until              = updates.validUntil || null;
  if (updates.subtotal                !== undefined) patch.subtotal                 = updates.subtotal;
  if (updates.discountTotal           !== undefined) patch.discount_total           = updates.discountTotal;
  if (updates.cgst                    !== undefined) patch.cgst                     = updates.cgst;
  if (updates.sgst                    !== undefined) patch.sgst                     = updates.sgst;
  if (updates.taxTotal                !== undefined) patch.tax_total                = updates.taxTotal;
  if (updates.grandTotal              !== undefined) patch.grand_total              = updates.grandTotal;
  if (updates.notes                   !== undefined) patch.notes                    = updates.notes || null;
  if (updates.terms                   !== undefined) patch.terms                    = updates.terms || null;
  if (updates.status                  !== undefined) patch.status                   = updates.status;
  if (updates.convertedInvoiceId      !== undefined) patch.converted_invoice_id     = updates.convertedInvoiceId || null;
  if (updates.convertedInvoiceNumber  !== undefined) patch.converted_invoice_number = updates.convertedInvoiceNumber || null;
  if (updates.convertedAt             !== undefined) patch.converted_at             = updates.convertedAt || null;

  const { error } = await supabase.from('quotations').update(patch).eq('id', id);
  if (error) {
    console.error('[QuotationService] updateQuotation:', error.message);
    throw error;
  }

  if (updates.items !== undefined) {
    await supabase.from('quotation_items').delete().eq('quotation_id', id);
    if (updates.items.length > 0) {
      const rows = updates.items.map((item) => ({
        id:               item.id,
        quotation_id:     id,
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
      const { error: iErr } = await supabase.from('quotation_items').insert(rows);
      if (iErr) {
        console.error('[QuotationService] replaceQuotationItems:', iErr.message);
        throw iErr;
      }
    }
  }
}

export async function deleteQuotation(id: string): Promise<void> {
  const { error } = await supabase.from('quotations').delete().eq('id', id);
  if (error) {
    console.error('[QuotationService] deleteQuotation:', error.message);
    throw error;
  }
}

export interface ConvertResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
}

export async function convertQuotationToInvoice(
  quotationId: string,
  invoiceId: string,
  invoiceNumber: string,
  today: string,
  paymentTerms: string,
): Promise<ConvertResult> {
  const { data, error } = await supabase.rpc('convert_quotation_to_invoice_rpc', {
    p_quotation_id:   quotationId,
    p_invoice_id:     invoiceId,
    p_invoice_number: invoiceNumber,
    p_today:          today,
    p_payment_terms:  paymentTerms,
  });

  if (error) {
    console.error('[QuotationService] convertQuotation RPC error:', error.message);
    return { success: false, error: 'Conversion failed — please try again.' };
  }

  const result = data as {
    success: boolean;
    invoice_id?: string;
    invoice_number?: string;
    error?: string;
  };

  if (!result.success) {
    return { success: false, error: result.error || 'Conversion failed.' };
  }

  return {
    success: true,
    invoiceId: result.invoice_id,
    invoiceNumber: result.invoice_number,
  };
}

export async function updateQuotationStorageMetadata(
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

  const { error } = await supabase.from('quotations').update(patch).eq('id', id);
  if (error) {
    console.error('[QuotationService] updateQuotationStorageMetadata:', error.message);
    throw error;
  }
}

