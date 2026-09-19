/**
 * frontend/src/features/history/pages/HistoryPage.tsx
 *
 * Full Document History & Audit view (Step 5).
 * Connects to public.documents table with server-side queries, date presets,
 * customer filtering, search, pagination (.range), preview modal, and PDF regeneration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import {
  HistoryItem,
  DocumentType,
  DatePreset,
  HistoryFilterOptions,
} from '../types';
import {
  fetchHistory,
  regenerateDocumentPdf,
} from '../services/historyService';
import { downloadDocumentPdf } from '@/services/storage/documentStorageService';
import { formatFileSize, formatDate } from '@/utils/formatters';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';

export const HistoryPage: React.FC = () => {
  const { showToast } = useAppState();

  // Filter states
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | DocumentType>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Data & Loading states
  const [loading, setLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Preview Modal state
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Action states
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Load history data from server
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const options: HistoryFilterOptions = {
        documentType: docTypeFilter,
        datePreset,
        startDate: datePreset === 'custom' ? startDate : undefined,
        endDate: datePreset === 'custom' ? endDate : undefined,
        search: searchQuery.trim() || undefined,
        page: currentPage,
        pageSize,
        sortBy: 'created_at',
        sortDirection: 'desc',
      };

      const result = await fetchHistory(options);
      setHistoryItems(result.items);
      setTotalCount(result.totalCount);
      setTotalPages(result.totalPages);
    } catch (err: unknown) {
      console.error('[HistoryPage] loadHistory error:', err);
      showToast(
        'Error loading history',
        err instanceof Error ? err.message : 'Could not fetch document history.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [docTypeFilter, datePreset, startDate, endDate, searchQuery, currentPage, pageSize, showToast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset to page 1 whenever any filter changes
  const handleFilterChange = (updater: () => void) => {
    updater();
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDocTypeFilter('all');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    docTypeFilter !== 'all' ||
    datePreset !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchQuery);

  // Quick download action
  const handleDownload = async (item: HistoryItem) => {
    setActionInProgressId(`dl_${item.id}`);
    try {
      const fileName = `${item.document_number || item.document_id}.pdf`;
      const docCtx = { userId: item.user_id, type: item.document_type, docId: item.document_id };
      let res = await downloadDocumentPdf(item.file_path, fileName, docCtx);
      if (!res.success) {
        // Automatically attempt on-demand PDF generation if not yet in storage
        const regen = await regenerateDocumentPdf(item.document_type, item.document_id);
        if (regen.success && regen.filePath) {
          res = await downloadDocumentPdf(regen.filePath, fileName, docCtx);
          loadHistory();
        }
      }
      if (res.success) {
        showToast(
          'Download complete',
          `Downloaded ${fileName}`,
          'success'
        );
      } else {
        showToast(
          'Download failed',
          res.error || 'Could not download document.',
          'error'
        );
      }
    } catch (err: unknown) {
      showToast(
        'Download error',
        err instanceof Error ? err.message : 'Unknown download error',
        'error'
      );
    } finally {
      setActionInProgressId(null);
    }
  };

  // PDF Regeneration action
  const handleRegenerate = async (item: HistoryItem) => {
    setActionInProgressId(`regen_${item.id}`);
    try {
      const res = await regenerateDocumentPdf(item.document_type, item.document_id);
      if (res.success) {
        showToast(
          'PDF Regenerated',
          `Successfully updated storage for ${item.document_number}`,
          'success'
        );
        await loadHistory();
      } else {
        showToast(
          'Regeneration failed',
          res.error || 'Could not regenerate PDF.',
          'error'
        );
      }
    } catch (err: unknown) {
      showToast(
        'Regeneration error',
        err instanceof Error ? err.message : 'Error regenerating document',
        'error'
      );
    } finally {
      setActionInProgressId(null);
    }
  };

  // Open preview modal
  const handleOpenPreview = (item: HistoryItem) => {
    setPreviewItem(item);
    setIsPreviewOpen(true);
  };

  // Calculate storage usage for current items
  const totalBytesCurrent = historyItems.reduce((sum, item) => sum + (item.file_size || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Document History"
        subtitle="Audit trail of invoices and quotations stored securely in Supabase Storage with direct signed download access."
        actions={
          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Documents</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Page Storage Usage</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatFileSize(totalBytesCurrent)}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Storage Bucket</p>
            <p className="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              documents (Private)
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current View</p>
            <p className="text-sm font-semibold text-slate-800 mt-1 capitalize">
              {docTypeFilter === 'all' ? 'All Document Types' : `${docTypeFilter}s`}
            </p>
            <p className="text-xs text-slate-500">
              Preset: {datePreset.replace('_', ' ')}
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Document Type Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => handleFilterChange(() => setDocTypeFilter('all'))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                docTypeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange(() => setDocTypeFilter('invoice'))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                docTypeFilter === 'invoice'
                  ? 'bg-white text-primary-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Invoices
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange(() => setDocTypeFilter('quotation'))}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                docTypeFilter === 'quotation'
                  ? 'bg-white text-amber-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quotations
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by document # or customer name..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleFilterChange(() => setSearchQuery(''))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date presets and extra filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Date Preset:
          </span>

          {(['all', 'today', 'week', 'month', 'last_month', 'year', 'custom'] as DatePreset[]).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleFilterChange(() => setDatePreset(preset))}
              className={`px-2.5 py-1 text-xs rounded-md capitalize font-medium transition-colors ${
                datePreset === preset
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset === 'all'
                ? 'All Time'
                : preset === 'week'
                ? 'Last 7 Days'
                : preset === 'month'
                ? 'This Month'
                : preset === 'last_month'
                ? 'Last Month'
                : preset === 'year'
                ? 'This Year'
                : preset}
            </button>
          ))}

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange(() => setStartDate(e.target.value))}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                title="Start Date"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleFilterChange(() => setEndDate(e.target.value))}
                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                title="End Date"
              />
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto text-xs text-rose-600 hover:text-rose-700 font-medium underline flex items-center gap-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Table & Content */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Generated Date</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary-600 mb-2" />
                      <p className="text-sm font-medium">Loading document history...</p>
                    </div>
                  </td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <FileText className="w-10 h-10 text-slate-300 mb-2" />
                      <p className="text-base font-semibold text-slate-700">No documents found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {hasActiveFilters
                          ? 'No documents match your current filter criteria. Try resetting or broadening your filters.'
                          : 'Generated invoice and quotation PDFs will be cataloged here automatically.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-4 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                historyItems.map((item) => {
                  const isInvoice = item.document_type === 'invoice';
                  const isDownloading = actionInProgressId === `dl_${item.id}`;
                  const isRegenerating = actionInProgressId === `regen_${item.id}`;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Document # */}
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(item)}
                          className="hover:text-primary-600 hover:underline flex items-center gap-1.5 text-left font-semibold"
                        >
                          <FileText className="w-4 h-4 text-slate-400 group-hover:text-primary-500 shrink-0" />
                          {item.document_number}
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono block sm:hidden truncate max-w-[140px]">
                          {item.file_path.split('/').pop()}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            isInvoice
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.document_type}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 text-slate-700">
                        {item.customer_name ? (
                          <span className="font-medium">{item.customer_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Generated Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(item.created_at)}
                      </td>

                      {/* File Size */}
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {formatFileSize(item.file_size)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            item.pdf_status === 'ready'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.pdf_status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.pdf_status === 'ready' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : item.pdf_status === 'failed' ? (
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                          ) : null}
                          {item.pdf_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Preview Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(item)}
                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Preview Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download Button */}
                          <button
                            type="button"
                            onClick={() => handleDownload(item)}
                            disabled={isDownloading}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            <Download className={`w-4 h-4 ${isDownloading ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Regenerate Button */}
                          <button
                            type="button"
                            onClick={() => handleRegenerate(item)}
                            disabled={isRegenerating}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                            title="Regenerate PDF"
                          >
                            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-semibold text-slate-700">
                {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{totalCount}</span> documents
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <span className="text-xs font-medium text-slate-600 px-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewItem(null);
        }}
        item={previewItem}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
};
