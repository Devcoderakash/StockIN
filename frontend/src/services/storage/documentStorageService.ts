/**
 * frontend/src/services/storage/documentStorageService.ts
 *
 * Dedicated Supabase Storage service for Invoices and Quotations (Step 5).
 *
 * ARCHITECTURAL GUARANTEES:
 * 1. Multi-tenant path isolation: {user_id}/invoices/{id}.pdf & {user_id}/quotations/{id}.pdf.
 * 2. Idempotent uploads: upsert: true replaces existing files without duplicates.
 * 3. Decoupled resilience: Storage failures NEVER roll back or break database transactions.
 * 4. Secure signed URLs: Private bucket access with time-limited signed download tokens.
 * 5. Document metadata tracking: Persists file size and path to public.documents table.
 */

import { supabase } from '@/lib/supabase/client';
import type { Invoice, Quotation, BusinessSettings } from '@/types';
import { generateDocumentPdf, downloadPdf } from '@/services/pdf/pdfService';

export const STORAGE_BUCKET = 'documents';

export interface StorageUploadResult {
  success: boolean;
  filePath?: string;
  fileSize?: number;
  signedUrl?: string;
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

/**
 * Normalizes and validates a document storage path.
 * Guarantees no leading/trailing slashes and handles bare filenames.
 *
 * Pattern: {userId}/{invoices|quotations}/{docId}.pdf
 */
export function normalizeStoragePath(
  rawPath: string,
  userId?: string,
  documentType: 'invoice' | 'quotation' = 'invoice',
  documentId?: string
): string {
  if (!rawPath && !documentId) {
    return '';
  }

  // Strip leading and trailing slashes and multiple consecutive slashes
  let cleaned = (rawPath || '').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');

  // If path doesn't contain directory structure (e.g. "inv-664119.pdf")
  if (!cleaned.includes('/')) {
    const folder = documentType === 'invoice' ? 'invoices' : 'quotations';
    const id = documentId || cleaned.replace(/\.pdf$/i, '');
    if (userId) {
      return `${userId}/${folder}/${id}.pdf`;
    }
  }

  // If path starts with "invoices/" or "quotations/" without userId
  const parts = cleaned.split('/');
  if (parts.length === 2 && (parts[0] === 'invoices' || parts[0] === 'quotations') && userId) {
    return `${userId}/${cleaned}`;
  }

  return cleaned;
}

/**
 * Builds deterministic, tenant-isolated storage path
 */
export function getDocumentStoragePath(
  userId: string,
  type: 'invoice' | 'quotation',
  documentId: string
): string {
  const folder = type === 'invoice' ? 'invoices' : 'quotations';
  const cleanId = documentId.replace(/^\/+|\/+$/g, '').replace(/\.pdf$/i, '');
  return `${userId}/${folder}/${cleanId}.pdf`;
}

/**
 * Uploads an Invoice PDF to Supabase Storage and records metadata
 */
export async function uploadInvoicePdf(
  invoice: Invoice,
  settings: BusinessSettings
): Promise<StorageUploadResult> {
  try {
    // 1. Generate client-side vector PDF 1.4
    const { blob } = generateDocumentPdf({
      type: 'invoice',
      document: invoice,
      settings,
    });
    const fileSize = blob.size;

    // 2. Identify current authenticated tenant
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || invoice.userId;
    if (!userId) {
      throw new Error('Authentication required for document storage.');
    }

    const filePath = getDocumentStoragePath(userId, 'invoice', invoice.id);

    // 3. Upload to private Supabase Storage bucket (idempotent upsert)
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.warn('[DocumentStorage] Storage upload warning:', uploadErr.message);
      await markInvoiceStorageFailure(invoice.id, uploadErr.message);
      return { success: false, error: uploadErr.message };
    }

    // 4. Upsert document metadata in public.documents table
    await supabase.from('documents').upsert(
      {
        id: `invoice_${invoice.id}`,
        user_id: userId,
        document_type: 'invoice',
        document_id: invoice.id,
        document_number: invoice.invoiceNumber,
        customer_id: invoice.customerId,
        customer_name: invoice.customerName,
        file_path: filePath,
        file_size: fileSize,
        mime_type: 'application/pdf',
        pdf_status: 'ready',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,document_type,document_id' }
    );

    // 5. Update invoice record with storage metadata
    await supabase
      .from('invoices')
      .update({
        storage_file_path: filePath,
        file_size: fileSize,
        pdf_status: 'ready',
        pdf_uploaded_at: new Date().toISOString(),
        pdf_error: null,
      })
      .eq('id', invoice.id);

    return {
      success: true,
      filePath,
      fileSize,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[DocumentStorage] uploadInvoicePdf error:', errorMsg);
    await markInvoiceStorageFailure(invoice.id, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Uploads a Quotation PDF to Supabase Storage and records metadata
 */
export async function uploadQuotationPdf(
  quotation: Quotation,
  settings: BusinessSettings
): Promise<StorageUploadResult> {
  try {
    // 1. Generate client-side vector PDF 1.4
    const { blob } = generateDocumentPdf({
      type: 'quotation',
      document: quotation,
      settings,
    });
    const fileSize = blob.size;

    // 2. Identify current authenticated tenant
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id || quotation.userId;
    if (!userId) {
      throw new Error('Authentication required for document storage.');
    }

    const filePath = getDocumentStoragePath(userId, 'quotation', quotation.id);

    // 3. Upload to private Supabase Storage bucket (idempotent upsert)
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadErr) {
      console.warn('[DocumentStorage] Storage upload warning:', uploadErr.message);
      await markQuotationStorageFailure(quotation.id, uploadErr.message);
      return { success: false, error: uploadErr.message };
    }

    // 4. Upsert document metadata in public.documents table
    await supabase.from('documents').upsert(
      {
        id: `quotation_${quotation.id}`,
        user_id: userId,
        document_type: 'quotation',
        document_id: quotation.id,
        document_number: quotation.quotationNumber,
        customer_id: quotation.customerId,
        customer_name: quotation.customerName,
        file_path: filePath,
        file_size: fileSize,
        mime_type: 'application/pdf',
        pdf_status: 'ready',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,document_type,document_id' }
    );

    // 5. Update quotation record with storage metadata
    await supabase
      .from('quotations')
      .update({
        storage_file_path: filePath,
        file_size: fileSize,
        pdf_status: 'ready',
        pdf_uploaded_at: new Date().toISOString(),
        pdf_error: null,
      })
      .eq('id', quotation.id);

    return {
      success: true,
      filePath,
      fileSize,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[DocumentStorage] uploadQuotationPdf error:', errorMsg);
    await markQuotationStorageFailure(quotation.id, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Creates a time-limited signed URL for viewing or downloading private documents
 */
export async function createDocumentSignedUrl(
  filePath: string,
  expiresInSeconds = 300,
  context?: { userId?: string; type?: 'invoice' | 'quotation'; docId?: string }
): Promise<SignedUrlResult> {
  const normalized = normalizeStoragePath(filePath, context?.userId, context?.type, context?.docId);
  if (!normalized) {
    return { success: false, error: 'Invalid document storage path' };
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(normalized, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { success: false, error: error?.message || 'Failed to generate signed URL' };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Direct file download from Supabase Storage using authorized download
 */
export async function downloadDocumentPdf(
  filePath: string,
  fileName: string,
  context?: { userId?: string; type?: 'invoice' | 'quotation'; docId?: string }
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizeStoragePath(filePath, context?.userId, context?.type, context?.docId);
  if (!normalized) {
    return { success: false, error: 'Invalid document storage path' };
  }

  try {
    const { data: blob, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(normalized);

    if (error || !blob) {
      // Fallback: try signed URL
      const signedRes = await createDocumentSignedUrl(normalized, 60);
      if (signedRes.success && signedRes.signedUrl) {
        const link = document.createElement('a');
        link.href = signedRes.signedUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return { success: true };
      }
      return { success: false, error: error?.message || 'Download failed' };
    }

    downloadPdf(blob, fileName);
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

// Helper: Graceful error recording on invoices
async function markInvoiceStorageFailure(invoiceId: string, errorMsg: string) {
  try {
    await supabase
      .from('invoices')
      .update({
        pdf_status: 'failed',
        pdf_error: errorMsg,
      })
      .eq('id', invoiceId);
  } catch {}
}

// Helper: Graceful error recording on quotations
async function markQuotationStorageFailure(quotationId: string, errorMsg: string) {
  try {
    await supabase
      .from('quotations')
      .update({
        pdf_status: 'failed',
        pdf_error: errorMsg,
      })
      .eq('id', quotationId);
  } catch {}
}
