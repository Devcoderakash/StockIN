/**
 * frontend/src/features/history/services/historyService.ts
 *
 * Dedicated Supabase query and management service for the Document History system (Step 5).
 * Implements server-side filtering, search, date presets, pagination, and PDF regeneration.
 */

import { supabase } from '@/lib/supabase/client';
import type { BusinessSettings } from '@/types';
import type {
  HistoryItem,
  HistoryFilterOptions,
  HistoryQueryResult,
  DatePreset,
  DocumentType,
} from '../types';
import { dbToInvoice, DbInvoice } from '@/features/invoices/services/invoiceService';
import { dbToQuotation, DbQuotation } from '@/features/quotations/services/quotationService';
import { fetchBusinessSettings } from '@/features/settings/services/settingsService';
import { uploadInvoicePdf, uploadQuotationPdf, normalizeStoragePath } from '@/services/storage/documentStorageService';

/**
 * Computes ISO start and end timestamp boundaries for a given date preset
 */
export function getDateRangeForPreset(
  preset: DatePreset,
  customStart?: string,
  customEnd?: string
): { start?: string; end?: string } {
  const now = new Date();

  switch (preset) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'week': {
      // Last 7 days
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'month': {
      // Current month from 1st day
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'last_month': {
      // Previous month from 1st to last day
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'year': {
      // Current year from Jan 1st
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
    case 'custom': {
      const range: { start?: string; end?: string } = {};
      if (customStart) {
        const parts = customStart.split('-').map(Number);
        if (parts.length === 3) {
          const s = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
          range.start = s.toISOString();
        }
      }
      if (customEnd) {
        const parts = customEnd.split('-').map(Number);
        if (parts.length === 3) {
          const e = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
          range.end = e.toISOString();
        }
      }
      return range;
    }
    case 'all':
    default:
      return {};
  }
}

/**
 * Queries the public.documents table with server-side filters, search, and pagination (.range)
 */
export async function fetchHistory(
  options: HistoryFilterOptions
): Promise<HistoryQueryResult> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 10);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' });

  // Filter: Document Type
  if (options.documentType && options.documentType !== 'all') {
    query = query.eq('document_type', options.documentType);
  }

  // Filter: Customer
  if (options.customerId && options.customerId.trim()) {
    query = query.eq('customer_id', options.customerId.trim());
  }

  // Filter: Date Preset / Custom Range
  const { start, end } = getDateRangeForPreset(
    options.datePreset || 'all',
    options.startDate,
    options.endDate
  );
  if (start) {
    query = query.gte('created_at', start);
  }
  if (end) {
    query = query.lte('created_at', end);
  }

  // Filter: Search (document_number or customer_name)
  if (options.search && options.search.trim()) {
    const term = options.search.trim();
    // PostgREST grammar requires values containing commas, spaces, or quotes to be safely quoted
    const safeTerm = term.replace(/"/g, '""');
    const pattern = `"%${safeTerm}%"`;
    query = query.or(`document_number.ilike.${pattern},customer_name.ilike.${pattern}`);
  }

  // Sorting
  const sortBy = options.sortBy || 'created_at';
  const ascending = options.sortDirection === 'asc';
  query = query.order(sortBy, { ascending });

  // Server-side Pagination
  query = query.range(from, to);

  let { data, count, error } = await query;
  if (error) {
    console.error('[HistoryService] fetchHistory error:', error.message);
    throw error;
  }

  // If no items are indexed in public.documents yet on the initial default view,
  // automatically sync existing invoices and quotations into documents
  if (
    (!count || count === 0) &&
    page === 1 &&
    (!options.search || !options.search.trim()) &&
    (!options.documentType || options.documentType === 'all') &&
    (!options.datePreset || options.datePreset === 'all')
  ) {
    const didBackfill = await autoBackfillDocumentsFromDatabase();
    if (didBackfill) {
      const retry = await supabase
        .from('documents')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending })
        .range(from, to);
      if (retry.data && retry.data.length > 0) {
        data = retry.data;
        count = retry.count;
      }
    }
  }

  const items: HistoryItem[] = (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    document_type: row.document_type as DocumentType,
    document_id: row.document_id,
    document_number: row.document_number,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    file_path: row.file_path,
    file_size: Number(row.file_size || 0),
    mime_type: row.mime_type || 'application/pdf',
    pdf_status: row.pdf_status || 'ready',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Auto-registers existing invoices and quotations in public.documents table
 * if the user has existing records that have not yet been indexed in History.
 */
export async function autoBackfillDocumentsFromDatabase(): Promise<boolean> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return false;

    // 1. Fetch invoices for this user
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, user_id, invoice_number, customer_id, customer_name, storage_file_path, file_size, pdf_status, created_at')
      .eq('user_id', userId);

    // 2. Fetch quotations for this user
    const { data: quotations } = await supabase
      .from('quotations')
      .select('id, user_id, quotation_number, customer_id, customer_name, storage_file_path, file_size, pdf_status, created_at')
      .eq('user_id', userId);

    const docsToUpsert: Array<Record<string, unknown>> = [];

    if (invoices && invoices.length > 0) {
      for (const inv of invoices) {
        docsToUpsert.push({
          id: `invoice_${inv.id}`,
          user_id: inv.user_id,
          document_type: 'invoice',
          document_id: inv.id,
          document_number: inv.invoice_number,
          customer_id: inv.customer_id || '',
          customer_name: inv.customer_name || 'Customer',
          file_path: normalizeStoragePath(inv.storage_file_path || '', inv.user_id, 'invoice', inv.id),
          file_size: inv.file_size || 0,
          mime_type: 'application/pdf',
          pdf_status: inv.pdf_status || (inv.storage_file_path ? 'ready' : 'pending'),
          created_at: inv.created_at,
          updated_at: inv.created_at,
        });
      }
    }

    if (quotations && quotations.length > 0) {
      for (const q of quotations) {
        docsToUpsert.push({
          id: `quotation_${q.id}`,
          user_id: q.user_id,
          document_type: 'quotation',
          document_id: q.id,
          document_number: q.quotation_number,
          customer_id: q.customer_id || '',
          customer_name: q.customer_name || 'Customer',
          file_path: normalizeStoragePath(q.storage_file_path || '', q.user_id, 'quotation', q.id),
          file_size: q.file_size || 0,
          mime_type: 'application/pdf',
          pdf_status: q.pdf_status || (q.storage_file_path ? 'ready' : 'pending'),
          created_at: q.created_at,
          updated_at: q.created_at,
        });
      }
    }

    if (docsToUpsert.length > 0) {
      const { error } = await supabase
        .from('documents')
        .upsert(docsToUpsert, { onConflict: 'user_id,document_type,document_id' });
      if (!error) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn('[HistoryService] autoBackfillDocumentsFromDatabase warning:', err);
    return false;
  }
}

/**
 * Regenerates the PDF for an Invoice or Quotation, uploads to Supabase Storage, and updates metadata
 */
export async function regenerateDocumentPdf(
  documentType: DocumentType,
  documentId: string
): Promise<{ success: boolean; filePath?: string; fileSize?: number; error?: string }> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: 'User is not authenticated' };
    }

    // Load business settings
    const settings = (await fetchBusinessSettings(userId)) || createDefaultBusinessSettings();

    if (documentType === 'invoice') {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Invoice record not found' };
      }

      const invoice = dbToInvoice(data as DbInvoice);
      const uploadRes = await uploadInvoicePdf(invoice, settings);
      return uploadRes;
    } else {
      const { data, error } = await supabase
        .from('quotations')
        .select('*, quotation_items(*)')
        .eq('id', documentId)
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Quotation record not found' };
      }

      const quotation = dbToQuotation(data as DbQuotation);
      const uploadRes = await uploadQuotationPdf(quotation, settings);
      return uploadRes;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[HistoryService] regenerateDocumentPdf error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Fallback business settings if none are configured in database
 */
function createDefaultBusinessSettings(): BusinessSettings {
  return {
    isConfigured: false,
    businessName: 'StockIN Solutions',
    tagline: 'Inventory & Billing Management',
    ownerName: 'Admin',
    phone: '',
    email: '',
    address: '',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462011',
    gstin: '',
    pan: '',
    currency: 'INR',
    currencySymbol: '₹',
    invoicePrefix: 'INV-',
    quotationPrefix: 'QT-',
    defaultTaxRate: 18,
    paymentTerms: 'Due on Receipt',
    footerMessage: 'Thank you for your business. For electronic transfers, use the bank details provided.',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    theme: 'light',
    density: 'comfortable',
  };
}
