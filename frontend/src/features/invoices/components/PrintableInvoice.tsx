import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Invoice } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { formatCurrency, formatDate, numberToWords } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import { Printer, Download, X, Boxes, ShieldCheck, CloudUpload, FileDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { generateDocumentPdf, downloadPdf } from '@/services/pdf/pdfService';
import { uploadInvoicePdf } from '@/services/storage/documentStorageService';

export interface PrintableInvoiceProps {
  invoice: Invoice | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  invoice,
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

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const { blob } = generateDocumentPdf({
        type: 'invoice',
        document: invoice,
        settings,
      });
      const filename = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
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
      const result = await uploadInvoicePdf(invoice, settings);
      if (result.success) {
        showToast('Storage Synced', `Invoice ${invoice.invoiceNumber} stored in Supabase Storage.`, 'success');
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
    const rows = invoice.items.map((item, idx) => [
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
    exportToCsv(`invoice_${invoice.invoiceNumber}`, headers, rows);
    showToast('Exported', `Invoice ${invoice.invoiceNumber} items downloaded to CSV.`);
  };

  const halfTax = invoice.taxTotal / 2;

  return createPortal(
    <div
      className="invoice-modal-root fixed inset-0 z-[100] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Tax Invoice ${invoice.invoiceNumber}`}
    >
      {/* 1. Backdrop: Pure solid dimming overlay - NEVER apply blur/filter here */}
      <div
        className="fixed inset-0 z-[100] bg-slate-950/75 transition-opacity no-print"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Top-level scroll container - strictly elevated above the backdrop */}
      <div className="fixed inset-0 z-[110] overflow-y-auto flex flex-col items-center justify-start p-3 sm:p-6 md:p-8 no-print:py-6">
        
        {/* Floating Controls Toolbar (Screen Only - hidden in print) */}
        <div className="no-print w-full max-w-[860px] mb-4 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-black text-blue-400 text-sm tracking-wide">
              {invoice.invoiceNumber}
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-xs text-slate-200 font-medium truncate max-w-[180px] sm:max-w-xs">
              {invoice.customerCompany || invoice.customerName}
            </span>
            <span
              className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                invoice.status === 'paid'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                  : invoice.status === 'partial'
                  ? 'bg-amber-950/90 text-amber-300 border-amber-700'
                  : 'bg-rose-950/90 text-rose-300 border-rose-700'
              }`}
            >
              {invoice.status}
            </span>

            {/* Supabase Storage Status Pill */}
            {invoice.pdfStatus === 'uploaded' || invoice.pdfStatus === ('ready' as unknown) ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Storage Synced
              </span>
            ) : invoice.pdfStatus === 'failed' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-700" title={invoice.pdfError || 'Storage upload failed'}>
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
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5 text-blue-400" />
              )}
              {invoice.pdfStatus === 'failed' ? 'Retry Storage' : 'Save to Storage'}
            </button>

            {/* Direct Vector PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Download A4 PDF document"
            >
              <FileDown className="w-3.5 h-3.5 text-blue-400" />
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              title="Print Tax Invoice or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                title="Close invoice (Esc)"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            )}
          </div>
        </div>

        {/* 3. The Authentic A4 Tax Invoice Document (Pristine White, Crisp Typography, 100% Sharp) */}
        <div
          id="printable-invoice"
          className="w-full max-w-[860px] bg-white text-[#111827] shadow-2xl rounded-2xl border border-slate-200 p-4 sm:p-8 md:p-12 mb-10 transition-none print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none"
          style={{
            minHeight: '297mm', // Authentic A4 proportion
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
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                  <Boxes className="w-4 h-4 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">StockIN</span>
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                {settings.businessName}
              </h2>
              {settings.tagline && (
                <p className="text-[11px] text-slate-500 font-medium">{settings.tagline}</p>
              )}
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                {settings.address}
                <br />
                {settings.city}, {settings.state} - {settings.pincode}
              </p>
              <div className="pt-2 text-xs space-y-0.5 text-slate-700">
                <p>
                  <span className="font-bold text-slate-900">GSTIN:</span>{' '}
                  <span className="font-mono font-bold text-blue-700">{settings.gstin}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-900">PAN:</span>{' '}
                  <span className="font-mono font-semibold text-slate-800">{settings.pan}</span>
                </p>
                <p>
                  <span className="font-semibold text-slate-600">Phone:</span> {settings.phone}{' '}
                  <span className="text-slate-400 mx-1">|</span>{' '}
                  <span className="font-semibold text-slate-600">Email:</span> {settings.email}
                </p>
              </div>
            </div>

            {/* Right: Invoice Metadata */}
            <div className="text-left sm:text-right space-y-1 self-stretch sm:self-auto">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-widest mb-1">
                TAX INVOICE
              </div>
              <p className="text-[10px] text-slate-500 italic">
                (Original for Recipient • Rule 48 CGST)
              </p>
              <p className="font-mono text-xl font-black text-blue-600 pt-1">
                {invoice.invoiceNumber}
              </p>

              <div className="pt-2 text-xs space-y-1 text-slate-700">
                <p>
                  <span className="text-slate-500">Invoice Date:</span>{' '}
                  <strong className="text-slate-900 font-bold">{formatDate(invoice.date)}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Payment Due:</span>{' '}
                  <strong className="text-slate-900 font-bold">{formatDate(invoice.dueDate)}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Payment Terms:</span>{' '}
                  <span className="font-medium text-slate-800">{invoice.paymentTerms || 'Immediate / Due on Receipt'}</span>
                </p>
                <p>
                  <span className="text-slate-500">Settlement Status:</span>{' '}
                  <span
                    className={`font-black uppercase text-[11px] px-2 py-0.5 rounded border inline-block ${
                      invoice.status === 'paid'
                        ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                        : invoice.status === 'partial'
                        ? 'border-amber-600 text-amber-700 bg-amber-50'
                        : 'border-rose-600 text-rose-700 bg-rose-50'
                    }`}
                  >
                    {invoice.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Billed To / Consignee Section */}
          <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Billed To (Customer Details):
              </p>
              <h3 className="text-sm font-extrabold text-slate-900">
                {invoice.customerCompany || invoice.customerName}
              </h3>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                Contact: {invoice.customerName}
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {invoice.customerAddress || 'Address on record'}
              </p>
              <p className="text-xs text-slate-700 mt-1">
                <span className="font-semibold text-slate-500">Phone:</span> {invoice.customerPhone}
              </p>
            </div>

            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Tax & Supply Credentials:
              </p>
              <p className="text-xs">
                <span className="font-semibold text-slate-600">Customer GSTIN:</span>{' '}
                <span className="font-mono font-bold text-slate-900">
                  {invoice.customerGstin || 'URP / Consumer'}
                </span>
              </p>
              <p className="text-xs text-slate-600 mt-1">
                <span className="font-semibold text-slate-500">State:</span> Madhya Pradesh (State Code: 23)
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                <span className="font-semibold text-slate-500">Place of Supply:</span> {settings.city}, {settings.state}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                <span className="font-semibold text-slate-500">Reverse Charge:</span> No
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="my-6 border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[540px] sm:min-w-0">
              <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3 text-center">HSN/SAC</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Rate</th>
                  <th className="p-3 text-center">Disc</th>
                  <th className="p-3 text-center">GST %</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/70">
                    <td className="p-3 text-slate-400 font-mono text-center">{idx + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                        <span>SKU: {item.sku}</span>
                        {item.billingType === 'dimension' && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Size: {item.length} {item.dimensionUnit || 'ft'} × {item.width} {item.dimensionUnit || 'ft'}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              Billable: {item.billableQuantity} {item.billingUnit || 'sq.ft'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">{item.hsnCode || '—'}</td>
                    <td className="p-3 text-center font-black text-slate-900">
                      {item.quantity}
                      {item.billingType === 'dimension' && (
                        <span className="block text-[10px] font-normal text-slate-400">
                          {item.quantity === 1 ? 'unit' : 'units'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-800">
                      {formatCurrency(item.rate)}
                      {item.billingType === 'dimension' && (
                        <span className="block text-[10px] text-slate-400">
                          / {item.billingUnit || 'sq.ft'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center text-slate-600">
                      {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                    </td>
                    <td className="p-3 text-center text-slate-600">{item.taxRate || 18}%</td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Totals, Bank Details & Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-6">
            {/* Left Column: Words and Bank Details */}
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1">
                  Amount Chargeable (in words):
                </p>
                <p className="text-xs font-bold text-slate-900 italic bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                  INR {numberToWords(invoice.grandTotal)} Only
                </p>
              </div>

              {/* Electronic Bank Transfer Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold border-b border-slate-200 pb-1 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Electronic Bank Settlement Details</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-slate-700 text-[11px]">
                  <span className="text-slate-500">Bank Name:</span>
                  <span className="font-semibold text-slate-900">{settings.bankName}</span>
                  <span className="text-slate-500">Account No:</span>
                  <span className="font-mono font-bold text-slate-900">{settings.accountNumber}</span>
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="font-mono font-bold text-slate-900">{settings.ifscCode}</span>
                  <span className="text-slate-500">UPI ID / VPA:</span>
                  <span className="font-mono font-bold text-blue-600">{settings.upiId}</span>
                </div>
              </div>

              {invoice.notes && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-0.5">Notes & Terms:</p>
                  <p className="text-xs text-slate-600 italic bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Calculations */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 py-1.5 border-b border-slate-100">
                <span>Subtotal (Base Value)</span>
                <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 py-1.5 border-b border-slate-100">
                  <span>Item Discounts</span>
                  <span className="font-semibold">-{formatCurrency(invoice.discountTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600 py-1.5 border-b border-slate-100">
                <span>Central GST (CGST)</span>
                <span className="font-semibold text-slate-800">+{formatCurrency(halfTax)}</span>
              </div>

              <div className="flex justify-between text-slate-600 py-1.5 border-b border-slate-100">
                <span>State GST (SGST)</span>
                <span className="font-semibold text-slate-800">+{formatCurrency(halfTax)}</span>
              </div>

              <div className="flex justify-between items-baseline text-base font-black text-slate-900 py-2.5 border-t-2 border-slate-900">
                <span>Grand Total</span>
                <span className="text-xl text-blue-600 font-black">{formatCurrency(invoice.grandTotal)}</span>
              </div>

              <div className="flex justify-between text-slate-700 py-1.5 border-t border-slate-100">
                <span className="font-medium">Amount Received / Paid</span>
                <span className="font-bold text-emerald-600">+{formatCurrency(invoice.paidAmount)}</span>
              </div>

              <div className="flex justify-between items-baseline text-sm font-black text-slate-900 py-2 border-t-2 border-slate-200">
                <span>Balance Due</span>
                <span className={`text-base font-black ${invoice.balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(invoice.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Signatures Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <p className="font-bold text-slate-800 mb-1">Terms & Conditions:</p>
              <ol className="list-decimal pl-4 text-slate-500 space-y-0.5 text-[11px] leading-relaxed">
                <li>Goods once sold will not be taken back without original warranty seal and packaging.</li>
                <li>Interest @ 18% p.a. will be charged on overdue amounts past agreed credit terms.</li>
                <li>All disputes are subject to {settings.city} (M.P.) Jurisdiction only.</li>
              </ol>
            </div>

            <div className="flex flex-col justify-end items-end text-right">
              <div className="w-52 h-14 border-b border-slate-400 mb-1.5 flex items-end justify-center text-[11px] text-slate-400 italic">
                Authorized Signatory
              </div>
              <p className="text-xs font-bold text-slate-900">For {settings.businessName}</p>
              <p className="text-[10px] text-slate-400">Computer Generated Tax Invoice</p>
            </div>
          </div>

          {settings.footerMessage && (
            <div className="mt-6 pt-3 border-t border-slate-100 text-center">
              <p className="text-xs font-medium text-slate-500 italic">
                {settings.footerMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
