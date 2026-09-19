/**
 * frontend/src/features/history/types/index.ts
 *
 * Types for the Document History system (Step 5).
 * Represents metadata stored in public.documents table for Invoices & Quotations.
 */

export type DocumentType = 'invoice' | 'quotation';
export type PdfStatus = 'pending' | 'ready' | 'failed';

export type DatePreset = 'today' | 'week' | 'month' | 'last_month' | 'year' | 'custom' | 'all';

export interface HistoryItem {
  id: string;
  user_id: string;
  document_type: DocumentType;
  document_id: string;
  document_number: string;
  customer_id?: string | null;
  customer_name?: string | null;
  file_path: string;
  file_size: number;
  mime_type: string;
  pdf_status: PdfStatus;
  created_at: string;
  updated_at: string;
}

export interface HistoryFilterOptions {
  documentType?: 'all' | DocumentType;
  datePreset?: DatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  customerId?: string;
  search?: string;    // Document number or customer name
  page: number;
  pageSize: number;
  sortBy?: keyof HistoryItem | 'created_at';
  sortDirection?: 'asc' | 'desc';
}

export interface HistoryQueryResult {
  items: HistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
