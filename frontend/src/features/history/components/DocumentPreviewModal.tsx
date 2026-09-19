/**
 * frontend/src/features/history/components/DocumentPreviewModal.tsx
 *
 * Secure PDF preview modal for Invoices & Quotations stored in Supabase Storage.
 * Generates an authenticated, time-limited signed URL on open.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { HistoryItem } from '../types';
import { createDocumentSignedUrl, downloadDocumentPdf } from '@/services/storage/documentStorageService';
import { formatFileSize, formatDate } from '@/utils/formatters';
import { Download, ExternalLink, Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: HistoryItem | null;
  onRegenerate?: (item: HistoryItem) => Promise<void>;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  item,
  onRegenerate,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const loadUrl = async () => {
      setLoading(true);
      setError(null);
      const docCtx = { userId: item.user_id, type: item.document_type, docId: item.document_id };
      try {
        let res = await createDocumentSignedUrl(item.file_path, 600, docCtx); // 10 min signed URL
        if (!isMounted) return;
        if (!res.success && onRegenerate) {
          try {
            await onRegenerate(item);
            if (!isMounted) return;
            res = await createDocumentSignedUrl(item.file_path, 600, docCtx);
          } catch {}
        }
        if (res.success && res.signedUrl) {
          setSignedUrl(res.signedUrl);
        } else {
          setError(res.error || 'Failed to generate secure preview URL.');
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unexpected error loading document preview.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadUrl();
    return () => {
      isMounted = false;
    };
  }, [isOpen, item, onRegenerate]);

  if (!item) return null;

  const handleDownload = async () => {
    if (!item) return;
    setDownloading(true);
    try {
      const fileName = `${item.document_number || item.document_id}.pdf`;
      const docCtx = { userId: item.user_id, type: item.document_type, docId: item.document_id };
      await downloadDocumentPdf(item.file_path, fileName, docCtx);
    } finally {
      setDownloading(false);
    }
  };

  const handleRegenerateClick = async () => {
    if (!item || !onRegenerate) return;
    setRegenerating(true);
    try {
      await onRegenerate(item);
      // Reload signed URL
      const res = await createDocumentSignedUrl(item.file_path, 600);
      if (res.success && res.signedUrl) {
        setSignedUrl(res.signedUrl);
        setError(null);
      }
    } finally {
      setRegenerating(false);
    }
  };

  const isInvoice = item.document_type === 'invoice';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isInvoice ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {item.document_number}
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                  isInvoice
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {item.document_type}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  item.pdf_status === 'ready'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.pdf_status === 'failed'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {item.pdf_status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {item.customer_name ? `Customer: ${item.customer_name} • ` : ''}
              {formatDate(item.created_at)} • Size: {formatFileSize(item.file_size)}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400 font-mono truncate max-w-[240px] sm:max-w-md">
            {item.file_path}
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                type="button"
                onClick={handleRegenerateClick}
                disabled={regenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                title="Regenerate vector PDF and update storage"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Tab
              </a>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !signedUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      }
    >
      <div className="w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex flex-col min-h-[520px] max-h-[75vh]">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-3" />
            <p className="text-sm font-medium">Generating secure temporary access token...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
            <h4 className="text-base font-semibold text-slate-900 mb-1">
              Could not preview document
            </h4>
            <p className="text-sm text-slate-600 max-w-md mb-6">{error}</p>
            {onRegenerate && (
              <button
                type="button"
                onClick={handleRegenerateClick}
                disabled={regenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate PDF Now
              </button>
            )}
          </div>
        )}

        {signedUrl && !loading && !error && (
          <iframe
            src={`${signedUrl}#toolbar=1&navpanes=0`}
            title={`Preview of ${item.document_number}`}
            className="w-full h-[540px] sm:h-[620px] border-0 rounded-xl"
          />
        )}
      </div>
    </Modal>
  );
};
