import { Request } from 'express';

export type DocumentType = 'invoice' | 'quotation';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface DocumentUploadPayload {
  documentType: DocumentType;
  documentId: string;
  documentNumber: string;
  pdfBase64: string;
  fileName?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
