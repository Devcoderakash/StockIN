import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Quotation, QuotationStatus } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  FileSpreadsheet,
  Printer,
  Copy,
  Trash2,
  Edit3,
  ArrowRightCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Check,
  XCircle,
  ExternalLink,
  CloudUpload,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { uploadQuotationPdf } from '@/services/storage/documentStorageService';

interface QuotationDetailModalProps {
  quotation: Quotation | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (quotation: Quotation) => void;
  onPrint: (quotation: Quotation) => void;
  onViewInvoice?: (invoiceId: string) => void;
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onEdit,
  onPrint,
  onViewInvoice,
}) => {
  const {
    products,
    deleteQuotation,
    duplicateQuotation,
    updateQuotationStatus,
    convertQuotationToInvoice,
    invoices,
    showToast,
    settings,
  } = useAppState();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSyncingStorage, setIsSyncingStorage] = useState(false);

  if (!isOpen || !quotation) return null;

  const handleSyncStorage = async () => {
    setIsSyncingStorage(true);
    try {
      const result = await uploadQuotationPdf(quotation, settings);
      if (result.success) {
        showToast('Storage Synced', `Quotation ${quotation.quotationNumber} stored in Supabase Storage.`, 'success');
      } else {
        showToast('Storage Notice', result.error || 'Upload could not complete.', 'warning');
      }
    } catch {
      showToast('Storage Error', 'Failed to store document in Supabase Storage.', 'error');
    } finally {
      setIsSyncingStorage(false);
    }
  };

  // Live warehouse stock verification for items in quotation
  const liveStockCheck = quotation.items.map((item) => {
    const prod = products.find((p) => p.id === item.productId);
    const available = prod ? prod.stock : 0;
    const isSufficient = available >= item.quantity;
    return {
      item,
      product: prod,
      available,
      isSufficient,
      shortage: Math.max(0, item.quantity - available),
    };
  });

  const hasAnyShortage = liveStockCheck.some((c) => !c.isSufficient);

  // Expiry check
  const isExpired =
    new Date(quotation.validUntil) < new Date(new Date().toISOString().split('T')[0]) &&
    quotation.status !== 'converted';

  const handleDuplicate = () => {
    const newId = duplicateQuotation(quotation.id);
    onClose();
  };

  const handleDelete = () => {
    deleteQuotation(quotation.id);
    setIsDeleteDialogOpen(false);
    onClose();
  };

  const handleStatusChange = (newStatus: QuotationStatus) => {
    updateQuotationStatus(quotation.id, newStatus);
  };

  const handleConvert = async () => {
    setConversionError(null);
    setIsConverting(true);

    const result = await convertQuotationToInvoice(quotation.id);
    setIsConverting(false);

    if (!result.success) {
      setConversionError(result.error || 'Failed to convert quotation.');
    } else {
      onClose();
      if (result.invoiceId && onViewInvoice) {
        onViewInvoice(result.invoiceId);
      }
    }
  };

  // Find linked invoice if converted
  const linkedInvoice = quotation.convertedInvoiceId
    ? invoices.find((inv) => inv.id === quotation.convertedInvoiceId)
    : null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {quotation.quotationNumber}
                </span>
                <StatusBadge status={quotation.status} />
                {isExpired && quotation.status !== 'expired' && quotation.status !== 'converted' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Past Expiry Date
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Created on {formatDate(quotation.quotationDate)} • Valid until {formatDate(quotation.validUntil)}
              </p>
            </div>
          </div>
        }
        maxWidth="4xl"
      >
        <div className="space-y-6 text-xs">
          {/* Conversion Error Banner if any */}
          {conversionError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-rose-800">Conversion Blocked: Insufficient Warehouse Stock</p>
                <p className="whitespace-pre-line text-xs text-rose-700">{conversionError}</p>
                <p className="text-[11px] text-rose-600 font-semibold pt-1">
                  Stock was NOT deducted and invoice was NOT created. Please stock in missing units before converting.
                </p>
              </div>
            </div>
          )}

          {/* Converted Status Banner */}
          {quotation.status === 'converted' ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-sm text-blue-950">
                    Quotation Converted into Sales Invoice
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Invoice:{' '}
                    <span className="font-mono font-bold">
                      {quotation.convertedInvoiceNumber || quotation.convertedInvoiceId}
                    </span>{' '}
                    • Converted on {quotation.convertedAt ? formatDate(quotation.convertedAt) : 'N/A'}
                  </p>
                </div>
              </div>

              {linkedInvoice && onViewInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewInvoice(linkedInvoice.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Invoice
                </button>
              )}
            </div>
          ) : (
            /* Open Quotation Conversion Action Bar */
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ArrowRightCircle className="w-4 h-4 text-amber-600" />
                  Ready to Convert to Invoice?
                </p>
                <p className="text-xs text-slate-600">
                  {hasAnyShortage
                    ? '⚠ Warning: Current stock is lower than quoted quantity for some items.'
                    : '✓ All quoted items currently have sufficient warehouse stock.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Converts quotation to an invoice and deducts stock"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isConverting ? 'Checking Stock & Converting...' : 'Convert to Invoice'}
                </button>
              </div>
            </div>
          )}

          {/* Supabase Storage Document Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <CloudUpload className="w-4 h-4 text-amber-600" />
                Document Storage
              </span>
              {quotation.pdfStatus === 'uploaded' || quotation.pdfStatus === ('ready' as unknown) ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Saved
                </span>
              ) : quotation.pdfStatus === 'failed' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  Upload Failed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Pending
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-slate-600 pt-1">
              <span className="text-[11px] font-mono truncate max-w-[180px]">
                {quotation.quotationNumber}.pdf
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncStorage}
                  disabled={isSyncingStorage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSyncingStorage ? <Loader2 className="w-3 h-3 animate-spin text-amber-600" /> : <CloudUpload className="w-3 h-3 text-amber-600" />}
                  {quotation.pdfStatus === 'failed' ? 'Retry Upload' : 'Save to Storage'}
                </button>
              </div>
            </div>
            {quotation.pdfError && (
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
                {quotation.pdfError}
              </p>
            )}
          </div>

          {/* Customer & Quotation Meta Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer Details
              </p>
              <h3 className="text-sm font-bold text-slate-900">{quotation.customerName}</h3>
              {quotation.customerCompany && (
                <p className="text-xs font-medium text-slate-700">{quotation.customerCompany}</p>
              )}
              <p className="text-xs text-slate-600">{quotation.customerAddress}</p>
              <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                {quotation.customerPhone && <span>Ph: {quotation.customerPhone}</span>}
                {quotation.customerEmail && <span>Email: {quotation.customerEmail}</span>}
                {quotation.customerGstin && <span>GSTIN: {quotation.customerGstin}</span>}
              </div>
            </div>

            {/* Quotation Validity & Meta */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quotation Specifications
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Date Issued:</span>
                  <p className="font-bold text-slate-800">{formatDate(quotation.quotationDate)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Valid Until:</span>
                  <p className={`font-bold ${isExpired ? 'text-rose-600' : 'text-slate-800'}`}>
                    {formatDate(quotation.validUntil)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Inventory Status:</span>
                  <p className="font-medium text-slate-800">
                    {quotation.status === 'converted' ? (
                      <span className="text-blue-700 font-semibold">Deducted on Invoice</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Not Reserved</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Status Control:</span>
                  {quotation.status === 'converted' ? (
                    <p className="font-bold text-blue-700">Converted (Locked)</p>
                  ) : (
                    <select
                      value={quotation.status}
                      onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
                      className="mt-0.5 px-2 py-0.5 bg-white border border-slate-300 rounded font-semibold text-slate-700 text-xs"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                      <option value="expired">Expired</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table with Live Stock Checking */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-900">Quotation Line Items & Warehouse Availability</h4>
              <span className="text-xs text-slate-500">{quotation.items.length} product(s)</span>
            </div>

            {/* Mobile Items Card View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {liveStockCheck.map(({ item, product, available, isSufficient }, idx) => (
                <div
                  key={item.id || idx}
                  className={`p-3.5 space-y-2 ${
                    !isSufficient && quotation.status !== 'converted' ? 'bg-amber-50/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-slate-900 text-xs">{item.productName}</p>
                        {item.billingType === 'dimension' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                            Dimension
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">{item.sku}</p>
                      {item.billingType === 'dimension' && (
                        <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                          Size: {item.length} {item.dimensionUnit || 'ft'} × {item.width} {item.dimensionUnit || 'ft'} • Area: {item.billableQuantity} {item.billingUnit || 'sq.ft'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm font-mono text-slate-900 block">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400">Qty: {item.quantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <div>
                      {quotation.status === 'converted' ? (
                        <span className="text-slate-500 font-mono">Current: {available}</span>
                      ) : isSufficient ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {available} in stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {available} (Needs {item.quantity})
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      Rate: <strong className="text-slate-700 font-mono">{formatCurrency(item.rate)}</strong>
                      {item.billingType === 'dimension' && <span className="text-[10px] text-slate-400 ml-0.5">/{item.billingUnit || 'sq.ft'}</span>}
                      {item.discountPercent > 0 && <span className="text-emerald-600 ml-1">(-{item.discountPercent}%)</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Items Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/30">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Product / SKU</th>
                    <th className="py-2.5 px-3 w-28">Live Stock</th>
                    <th className="py-2.5 px-3 w-16 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-24 text-right">Quoted Rate</th>
                    <th className="py-2.5 px-3 w-16 text-center">Disc %</th>
                    <th className="py-2.5 px-3 w-16 text-center">GST %</th>
                    <th className="py-2.5 px-3 w-24 text-right">GST (₹)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {liveStockCheck.map(({ item, product, available, isSufficient }, idx) => (
                    <tr
                      key={item.id || idx}
                      className={!isSufficient && quotation.status !== 'converted' ? 'bg-amber-50/30' : ''}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900">{item.productName}</p>
                          {item.billingType === 'dimension' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                              Dimension
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-slate-400">{item.sku}</p>
                        {item.billingType === 'dimension' && (
                          <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                            Size: {item.length} {item.dimensionUnit || 'ft'} × {item.width} {item.dimensionUnit || 'ft'} • Area: {item.billableQuantity} {item.billingUnit || 'sq.ft'}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {quotation.status === 'converted' ? (
                          <span className="text-[11px] text-slate-500 font-mono">Current: {available}</span>
                        ) : isSufficient ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {available} in stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            {available} (Needs {item.quantity})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        {formatCurrency(item.rate)}
                        {item.billingType === 'dimension' && (
                          <span className="block text-[10px] text-slate-400">/{item.billingUnit || 'sq.ft'}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.taxRate}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(item.taxAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatCurrency(quotation.subtotal)}
                  </span>
                </div>
                {quotation.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount Total</span>
                    <span className="font-mono font-semibold">
                      - {formatCurrency(quotation.discountTotal)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>CGST</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatCurrency(quotation.cgst)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatCurrency(quotation.sgst)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-700">
                    {formatCurrency(quotation.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {quotation.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 mb-1">Notes</p>
                <p className="text-slate-600 leading-relaxed">{quotation.notes}</p>
              </div>
            )}
            {quotation.terms && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800 mb-1">Terms & Conditions</p>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{quotation.terms}</p>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                title="Delete quotation without changing stock"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                title="Create a duplicate draft"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
            </div>

            <div className="flex items-center gap-2">
              {quotation.status !== 'converted' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(quotation);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  Edit Quotation
                </button>
              )}
              <button
                type="button"
                onClick={() => onPrint(quotation)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Quotation?"
        message={`Are you sure you want to delete quotation "${quotation.quotationNumber}"? This action cannot be undone. Inventory and stock levels will remain unchanged.`}
        confirmText="Delete Quotation"
        confirmVariant="danger"
      />
    </>
  );
};
