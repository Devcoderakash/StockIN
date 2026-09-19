import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { QuotationModal } from '@/components/quotations/QuotationModal';
import { QuotationDetailModal } from '@/components/quotations/QuotationDetailModal';
import { PrintableQuotation } from '@/components/quotations/PrintableQuotation';
import { PrintableInvoice } from '@/components/invoices/PrintableInvoice';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Quotation, QuotationStatus } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Download,
  Eye,
  Printer,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  ArrowRightCircle,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';

export const QuotationsPage: React.FC = () => {
  const {
    quotations,
    products,
    deleteQuotation,
    duplicateQuotation,
    convertQuotationToInvoice,
    invoices,
    showToast,
  } = useAppState();

  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null);
  const [printQuotation, setPrintQuotation] = useState<Quotation | null>(null);
  const [deletingQuotationId, setDeletingQuotationId] = useState<string | null>(null);

  // Invoice print modal if user clicks "View Invoice" on converted quotation
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

  // Filtered Quotations
  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      const qNum = q.quotationNumber.toLowerCase();
      const cName = (q.customerName || '').toLowerCase();
      const cComp = (q.customerCompany || '').toLowerCase();
      const cPhone = (q.customerPhone || '').toLowerCase();
      const s = searchQuery.toLowerCase();

      const matchesSearch =
        !searchQuery ||
        qNum.includes(s) ||
        cName.includes(s) ||
        cComp.includes(s) ||
        cPhone.includes(s);

      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter]);

  // Dynamic KPI Metrics calculated from real state
  const totalQuotationsCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === 'draft').length;
  const sentCount = quotations.filter((q) => q.status === 'sent').length;
  const acceptedCount = quotations.filter((q) => q.status === 'accepted').length;
  const convertedCount = quotations.filter((q) => q.status === 'converted').length;
  const totalQuotationValue = quotations.reduce((sum, q) => sum + q.grandTotal, 0);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Quotation No.',
      'Customer Name',
      'Customer Company',
      'Phone',
      'Quotation Date',
      'Valid Until',
      'Items Count',
      'Subtotal',
      'GST',
      'Grand Total',
      'Status',
      'Converted Invoice',
    ];
    const rows = filteredQuotations.map((q) => [
      q.quotationNumber,
      q.customerName,
      q.customerCompany || '',
      q.customerPhone || '',
      q.quotationDate,
      q.validUntil,
      q.items.length,
      q.subtotal,
      q.taxTotal,
      q.grandTotal,
      q.status,
      q.convertedInvoiceNumber || q.convertedInvoiceId || '—',
    ]);
    exportToCsv('stockin_quotations_register', headers, rows);
    showToast('Export complete', `Exported ${filteredQuotations.length} quotations to CSV.`);
  };

  const handleConvertDirect = async (quotation: Quotation) => {
    const result = await convertQuotationToInvoice(quotation.id);
    if (!result.success) {
      // Open detail modal to show the full stock error breakdown
      setDetailQuotation(quotation);
    }
  };

  const quotationToDelete = deletingQuotationId
    ? quotations.find((q) => q.id === deletingQuotationId)
    : null;

  const invoiceToPrint = viewInvoiceId
    ? invoices.find((inv) => inv.id === viewInvoiceId) || null
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Quotation Management"
        subtitle="Prepare customer offers and price estimates without deducting or reserving warehouse stock."
        badge={
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {quotations.length} Quotations
          </span>
        }
        actions={
          <>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Quotation
            </button>
          </>
        }
      />

      {/* Dynamic KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Quotations</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{totalQuotationsCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">All created estimates</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Draft</p>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{draftCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">In preparation</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Sent</p>
          <p className="text-xl font-extrabold text-sky-700 mt-1">{sentCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Dispatched to client</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Accepted</p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{acceptedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Ready for invoice</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Converted</p>
          <p className="text-xl font-extrabold text-blue-700 mt-1">{convertedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Invoiced & stock deducted</p>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quotation Value</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 font-mono truncate">
            {formatCurrency(totalQuotationValue)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pipeline estimate</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by quotation #, customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 min-h-[40px]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs overflow-x-auto no-scrollbar text-xs">
          {[
            { key: 'all', label: 'All' },
            { key: 'draft', label: 'Draft' },
            { key: 'sent', label: 'Sent' },
            { key: 'accepted', label: 'Accepted' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'expired', label: 'Expired' },
            { key: 'converted', label: 'Converted' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Quotations Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {filteredQuotations.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 shadow-xs">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-600 text-xs">No quotations found</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {quotations.length === 0
                ? 'Tap "+ Create Quotation" above to prepare your first customer offer.'
                : 'No quotations match your active search or status filters.'}
            </p>
          </div>
        ) : (
          filteredQuotations.map((quotation) => {
            const isExpired =
              new Date(quotation.validUntil) <
                new Date(new Date().toISOString().split('T')[0]) &&
              quotation.status !== 'converted';

            const hasStockShortage = quotation.items.some((it) => {
              const prod = products.find((p) => p.id === it.productId);
              return !prod || prod.stock < it.quantity;
            });

            return (
              <div
                key={quotation.id}
                className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3"
                onClick={() => setDetailQuotation(quotation)}
              >
                {/* Header: Quotation No + Status Badge + Date */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-700 text-xs">
                        {quotation.quotationNumber}
                      </span>
                      <StatusBadge status={quotation.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(quotation.quotationDate)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 font-mono block">
                      {formatCurrency(quotation.grandTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400">{quotation.items.length} items</span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                  <p className="font-bold text-slate-900">{quotation.customerName}</p>
                  {quotation.customerCompany && (
                    <p className="text-[11px] text-slate-500">{quotation.customerCompany}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 mt-1 border-t border-slate-200/60">
                    <span>
                      Valid until:{' '}
                      <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
                        {formatDate(quotation.validUntil)}
                      </span>
                    </span>
                    {isExpired && quotation.status !== 'converted' && (
                      <span className="text-rose-600 font-bold text-[10px]">Expired</span>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div
                  className="flex items-center justify-between pt-1 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    {quotation.status === 'converted' ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {quotation.convertedInvoiceNumber || 'Converted'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConvertDirect(quotation)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer min-h-[38px] ${
                          hasStockShortage
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                        Convert
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDetailQuotation(quotation)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title="View quotation details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintQuotation(quotation)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Print quotation"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {quotation.status !== 'converted' && (
                      <button
                        type="button"
                        onClick={() => setEditingQuotation(quotation)}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit quotation"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => duplicateQuotation(quotation.id)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Duplicate quotation"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingQuotationId(quotation.id)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete quotation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Quotations Ledger Table (>= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/50">
                <th className="py-3 px-4">Quotation No.</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No quotations found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {quotations.length === 0
                        ? 'Click "+ Create Quotation" above to prepare your first customer offer.'
                        : 'No quotations match your active search or status filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quotation) => {
                  const isExpired =
                    new Date(quotation.validUntil) <
                      new Date(new Date().toISOString().split('T')[0]) &&
                    quotation.status !== 'converted';

                  // Live stock shortage check for row
                  const hasStockShortage = quotation.items.some((it) => {
                    const prod = products.find((p) => p.id === it.productId);
                    return !prod || prod.stock < it.quantity;
                  });

                  return (
                    <tr
                      key={quotation.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setDetailQuotation(quotation)}
                    >
                      {/* Quotation No */}
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                        {quotation.quotationNumber}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{quotation.customerName}</p>
                        {quotation.customerCompany && (
                          <p className="text-[11px] text-slate-500">{quotation.customerCompany}</p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(quotation.quotationDate)}
                      </td>

                      {/* Valid Until */}
                      <td className="py-3.5 px-4">
                        <span className={isExpired ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                          {formatDate(quotation.validUntil)}
                        </span>
                        {isExpired && quotation.status !== 'converted' && (
                          <span className="block text-[10px] text-rose-500 font-bold">Expired</span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                        {quotation.items.length}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(quotation.grandTotal)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={quotation.status} />
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Convert Button */}
                          {quotation.status === 'converted' ? (
                            <span
                              className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200"
                              title={`Converted to ${quotation.convertedInvoiceNumber || quotation.convertedInvoiceId}`}
                            >
                              {quotation.convertedInvoiceNumber || 'Converted'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConvertDirect(quotation)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                                hasStockShortage
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                              title={
                                hasStockShortage
                                  ? 'Click to review warehouse stock before converting'
                                  : 'Convert to Invoice and deduct inventory'
                              }
                            >
                              <ArrowRightCircle className="w-3 h-3" />
                              Convert
                            </button>
                          )}

                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => setDetailQuotation(quotation)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View quotation details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Print */}
                          <button
                            type="button"
                            onClick={() => setPrintQuotation(quotation)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Print / Save PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit (if not converted) */}
                          {quotation.status !== 'converted' && (
                            <button
                              type="button"
                              onClick={() => setEditingQuotation(quotation)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit quotation"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => duplicateQuotation(quotation.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate as new draft"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeletingQuotationId(quotation.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete quotation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Create / Edit Quotation Modal */}
      {(isCreateModalOpen || editingQuotation) && (
        <QuotationModal
          isOpen={isCreateModalOpen || Boolean(editingQuotation)}
          quotationToEdit={editingQuotation}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingQuotation(null);
          }}
          onSaved={(savedId) => {
            const savedQ = quotations.find((q) => q.id === savedId);
            if (savedQ) {
              setDetailQuotation(savedQ);
            }
          }}
        />
      )}

      {/* Quotation Detail View Modal */}
      {detailQuotation && (
        <QuotationDetailModal
          isOpen={Boolean(detailQuotation)}
          quotation={quotations.find((q) => q.id === detailQuotation.id) || detailQuotation}
          onClose={() => setDetailQuotation(null)}
          onEdit={(q) => {
            setDetailQuotation(null);
            setEditingQuotation(q);
          }}
          onPrint={(q) => {
            setPrintQuotation(q);
          }}
          onViewInvoice={(invId) => {
            setDetailQuotation(null);
            setViewInvoiceId(invId);
          }}
        />
      )}

      {/* Clean A4 Printable Quotation */}
      {printQuotation && (
        <PrintableQuotation
          isOpen={Boolean(printQuotation)}
          quotation={printQuotation}
          onClose={() => setPrintQuotation(null)}
        />
      )}

      {/* Invoice Viewer if converted */}
      {viewInvoiceId && invoiceToPrint && (
        <PrintableInvoice
          isOpen={Boolean(viewInvoiceId)}
          invoice={invoiceToPrint}
          onClose={() => setViewInvoiceId(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingQuotationId)}
        onClose={() => setDeletingQuotationId(null)}
        onConfirm={() => {
          if (deletingQuotationId) {
            deleteQuotation(deletingQuotationId);
            setDeletingQuotationId(null);
          }
        }}
        title="Delete Quotation?"
        message={`Are you sure you want to delete quotation "${quotationToDelete?.quotationNumber || ''}"? This action cannot be undone. Inventory and stock levels will remain unchanged.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
};
