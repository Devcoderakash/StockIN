import { DocumentUploadPayload } from '../types';

export function validateDocumentUpload(body: Partial<DocumentUploadPayload>): string | null {
  if (!body.documentType || !['invoice', 'quotation'].includes(body.documentType)) {
    return 'Invalid or missing documentType. Must be "invoice" or "quotation".';
  }
  if (!body.documentId || typeof body.documentId !== 'string') {
    return 'Invalid or missing documentId.';
  }
  if (!body.pdfBase64 || typeof body.pdfBase64 !== 'string') {
    return 'Invalid or missing pdfBase64 payload.';
  }
  return null;
}
