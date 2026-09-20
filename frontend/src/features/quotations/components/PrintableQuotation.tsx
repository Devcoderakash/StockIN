import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Quotation } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { formatCurrency, formatDate, numberToWords } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import { Printer, Download, X, FileSpreadsheet, ShieldAlert, CloudUpload, FileDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateDocumentPdf, downloadPdf } from '@/services/pdf/pdfService';
import { uploadQuotationPdf } from '@/services/storage/documentStorageService';

export interface PrintableQuotationProps {
  quotation: Quotation | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const PrintableQuotation: React.FC<PrintableQuotationProps> = ({
  quotation,
  isOpen = true,
  onClose,
}) => {
  const { settings, showToast } = useAppState();
  const [isSyncingStorage, setIsSyncingStorage] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const { blob } = generateDocumentPdf({
        type: 'quotation',
        document: quotation,
        settings,
      });
      const filename = `${quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      downloadPdf(blob, filename);
      showToast('PDF Downloaded', `Saved ${filename} to your device.`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('PDF Error', 'Could not generate PDF document.', 'error');
    }
  };

  const handleSyncStorage = async () => {
    setIsSyncingStorage(true);
    try {
      const result = await uploadQuotationPdf(quotation, settings);
      if (result.success) {
        showToast('Storage Synced', `Quotation ${quotation.quotationNumber} stored in Supabase Storage.`, 'success');
      } else {
        showToast('Storage Notice', result.error || 'Upload could not complete.', 'warning');
      }
    } catch (err) {
      showToast('Storage Error', 'Failed to store document in Supabase Storage.', 'error');
    } finally {
      setIsSyncingStorage(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      '#',
      'Item Description',
      'SKU',
      'HSN/SAC',
      'Quantity',
      'Unit Rate (₹)',
      'Discount (%)',
      'GST Rate (%)',
      'Total Amount (₹)',
    ];
    const rows = quotation.items.map((item, idx) => [
      idx + 1,
      item.productName,
      item.sku,
      item.hsnCode || '—',
      item.quantity,
      item.rate,
      item.discountPercent || 0,
      item.taxRate || 18,
      item.amount,
    ]);
    exportToCsv(`quotation_${quotation.quotationNumber}`, headers, rows);
    showToast('Exported', `Quotation ${quotation.quotationNumber} items downloaded to CSV.`);
  };

  const halfTax = quotation.taxTotal / 2;

  const getStatusBadgeColor = (status: Quotation['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-950/90 text-emerald-300 border-emerald-700';
      case 'converted':
        return 'bg-blue-950/90 text-blue-300 border-blue-700';
      case 'sent':
        return 'bg-sky-950/90 text-sky-300 border-sky-700';
      case 'rejected':
        return 'bg-rose-950/90 text-rose-300 border-rose-700';
      case 'expired':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'draft':
      default:
        return 'bg-amber-950/90 text-amber-300 border-amber-700';
    }
  };

  return createPortal(
    <div
      className="quotation-modal-root fixed inset-0 z-[100] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Quotation ${quotation.quotationNumber}`}
    >
      {/* 1. Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-slate-950/75 transition-opacity no-print"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Top-level scroll container */}
      <div className="fixed inset-0 z-[110] overflow-y-auto flex flex-col items-center justify-start p-3 sm:p-6 md:p-8 no-print:py-6">
        {/* Floating Controls Toolbar */}
        <div className="no-print w-full max-w-[860px] mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-black text-amber-400 text-sm tracking-wide">
              {quotation.quotationNumber}
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-xs text-slate-200 font-medium truncate max-w-[180px] sm:max-w-xs">
              {quotation.customerCompany || quotation.customerName}
            </span>
            <span
              className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${getStatusBadgeColor(
                quotation.status
              )}`}
            >
              {quotation.status}
            </span>

            {/* Supabase Storage Status Pill */}
            {quotation.pdfStatus === 'uploaded' || quotation.pdfStatus === ('ready' as unknown) ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Storage Synced
              </span>
            ) : quotation.pdfStatus === 'failed' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-700" title={quotation.pdfError || 'Upload failed'}>
                <AlertCircle className="w-3 h-3 text-rose-400" />
                Storage Failed
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {/* Supabase Storage Upload / Sync Button */}
            <button
              type="button"
              onClick={handleSyncStorage}
              disabled={isSyncingStorage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Store PDF in private Supabase Storage"
            >
              {isSyncingStorage ? (
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5 text-amber-400" />
              )}
              {quotation.pdfStatus === 'failed' ? 'Retry Storage' : 'Save to Storage'}
            </button>

            {/* Direct Vector PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Download A4 PDF document"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              PDF
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Download line items as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              title="Print Quotation or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Close quotation (Esc)"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            )}
          </div>
        </div>

        {/* 3. The Authentic A4 Quotation Document */}
        <div
          id="printable-quotation"
          className="w-full max-w-[860px] bg-white text-[#111827] shadow-2xl rounded-2xl border border-slate-200 p-4 sm:p-8 md:p-12 mb-10 transition-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
          style={{
            minHeight: '297mm',
            backgroundColor: '#ffffff',
            color: '#111827',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-900">
            {/* Left: Business Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold shadow-xs">
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  {settings.businessName || 'StockIN'}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600">{settings.tagline}</p>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                {settings.address ? `${settings.address}, ` : ''}
                {settings.city ? `${settings.city}, ` : ''}
                {settings.state ? `${settings.state} - ` : ''}
                {settings.pincode}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 pt-1 font-mono">
                {settings.phone && <span>Ph: {settings.phone}</span>}
                {settings.email && <span>Email: {settings.email}</span>}
              </div>
              {settings.gstin && (
                <div className="pt-1">
                  <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    GSTIN: {settings.gstin}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Quotation Metadata */}
            <div className="sm:text-right space-y-2">
              <div className="inline-block bg-amber-50 border border-amber-300 text-amber-900 px-4 py-1.5 rounded-lg">
                <h1 className="text-xl font-black tracking-wider uppercase">QUOTATION</h1>
                <p className="text-[10px] font-bold tracking-widest text-amber-700 uppercase">
                  Price Estimate & Offer
                </p>
              </div>

              <div className="text-xs space-y-1 pt-1 font-mono">
                <div>
                  <span className="text-slate-400">Quotation No: </span>
                  <span className="font-bold text-slate-900">{quotation.quotationNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400">Quotation Date: </span>
                  <span className="font-bold text-slate-800">{formatDate(quotation.quotationDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Valid Until: </span>
                  <span className="font-bold text-amber-700">{formatDate(quotation.validUntil)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Status: </span>
                  <span className="font-bold uppercase tracking-wider text-slate-800">{quotation.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Notice Banner */}
          <div className="my-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Offer & Estimate:</strong> This quotation does not reserve inventory and is subject to availability upon confirmation.
              </span>
            </div>
            <span className="font-semibold text-[10px] bg-white text-amber-800 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
              Not a Tax Invoice
            </span>
          </div>

          {/* Customer / Bill To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                Quotation Prepared For
              </p>
              <h2 className="text-sm font-bold text-slate-900">{quotation.customerName}</h2>
              {quotation.customerCompany && (
                <p className="text-xs font-semibold text-slate-700 mt-0.5">{quotation.customerCompany}</p>
              )}
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{quotation.customerAddress}</p>
              <div className="text-xs text-slate-500 space-y-0.5 mt-2 font-mono">
                {quotation.customerPhone && <p>Phone: {quotation.customerPhone}</p>}
                {quotation.customerEmail && <p>Email: {quotation.customerEmail}</p>}
              </div>
            </div>

            <div className="sm:text-right flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">
                  Customer Tax Identification
                </p>
                {quotation.customerGstin ? (
                  <p className="text-xs font-mono font-bold text-slate-800 bg-white inline-block px-2.5 py-1 rounded border border-slate-200">
                    GSTIN: {quotation.customerGstin}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Unregistered / Consumer</p>
                )}
              </div>
              <div className="mt-4 pt-2 border-t border-slate-200 sm:border-0 sm:mt-0 sm:pt-0">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Offer Validity</p>
                <p className="text-xs font-bold text-slate-800">Until {formatDate(quotation.validUntil)}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[560px] sm:min-w-0">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-900 font-black">
                  <th className="py-2.5 px-2 w-8 text-center">#</th>
                  <th className="py-2.5 px-2">Product Description</th>
                  <th className="py-2.5 px-2 w-24">SKU</th>
                  <th className="py-2.5 px-2 w-20">HSN/SAC</th>
                  <th className="py-2.5 px-2 w-14 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-24 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-2 w-16 text-center">Disc %</th>
                  <th className="py-2.5 px-2 w-16 text-center">GST %</th>
                  <th className="py-2.5 px-2 w-28 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {quotation.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-2">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      {item.billingType === 'dimension' && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <span className="font-semibold text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                            Size: {item.length} {item.dimensionUnit || 'ft'} × {item.width} {item.dimensionUnit || 'ft'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            Billable: {item.billableQuantity} {item.billingUnit || 'sq.ft'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-500">{item.sku}</td>
                    <td className="py-2.5 px-2 font-mono text-slate-500">{item.hsnCode || '—'}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                      {item.quantity}
                      {item.billingType === 'dimension' && (
                        <span className="block text-[10px] font-normal text-slate-400">
                          {item.quantity === 1 ? 'unit' : 'units'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono">
                      {formatCurrency(item.rate)}
                      {item.billingType === 'dimension' && (
                        <span className="block text-[10px] text-slate-400">
                          / {item.billingUnit || 'sq.ft'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">
                      {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono">{item.taxRate}%</td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 my-6 pt-4 border-t border-slate-200">
            {/* Left: Amount in words & Banking */}
            <div className="sm:col-span-7 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Estimated Total in Words
                </p>
                <p className="text-xs font-semibold text-slate-800 italic capitalize bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {numberToWords(quotation.grandTotal)}
                </p>
              </div>

              {settings.bankName && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Bank Details For Settlement
                  </p>
                  <p className="font-bold text-slate-900">{settings.bankName}</p>
                  {settings.accountNumber && (
                    <p className="font-mono text-slate-700">A/C: {settings.accountNumber}</p>
                  )}
                  {settings.ifscCode && (
                    <p className="font-mono text-slate-700">IFSC: {settings.ifscCode}</p>
                  )}
                  {settings.upiId && <p className="font-mono text-blue-700">UPI: {settings.upiId}</p>}
                </div>
              )}
            </div>

            {/* Right: Calculations Table */}
            <div className="sm:col-span-5 space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(quotation.subtotal)}
                </span>
              </div>

              {quotation.discountTotal > 0 && (
                <div className="flex justify-between py-1 text-emerald-700">
                  <span>Total Discount</span>
                  <span className="font-mono font-semibold">
                    - {formatCurrency(quotation.discountTotal)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1 text-slate-600">
                <span>CGST</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(quotation.cgst || halfTax)}
                </span>
              </div>

              <div className="flex justify-between py-1 text-slate-600">
                <span>SGST</span>
                <span className="font-mono font-semibold text-slate-800">
                  {formatCurrency(quotation.sgst || halfTax)}
                </span>
              </div>

              <div className="flex justify-between py-2 border-t-2 border-slate-900 text-base font-black text-slate-900">
                <span>Grand Total</span>
                <span className="font-mono text-amber-700">{formatCurrency(quotation.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Terms, Notes & Signatory Footer */}
          <div className="pt-8 border-t border-slate-200 mt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div className="space-y-3">
              <div>
                <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wider mb-1">
                  Terms & Conditions
                </p>
                <p className="text-slate-500 leading-relaxed whitespace-pre-line text-[11px]">
                  {quotation.terms ||
                    '1. Quotation prices are valid until the specified expiry date.\n2. Goods are subject to live warehouse stock availability upon confirmation.\n3. This document is a price estimate and does not constitute a sales tax invoice or reservation of inventory.'}
                </p>
              </div>

              {quotation.notes && (
                <div>
                  <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-slate-500 leading-relaxed text-[11px]">{quotation.notes}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-end items-start sm:items-end">
              <div className="text-center w-48 pt-12 border-t border-slate-300">
                <p className="font-bold text-slate-900 text-xs">{settings.ownerName || 'Authorized Signatory'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">For {settings.businessName || 'StockIN'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
