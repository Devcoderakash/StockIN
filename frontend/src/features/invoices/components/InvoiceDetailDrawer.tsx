import React from 'react';
import { Drawer } from '@/components/common/Drawer';
import { Invoice } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Printer, CheckCircle, Trash2, User, Phone, MapPin, CloudUpload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadInvoicePdf } from '@/services/storage/documentStorageService';

interface InvoiceDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onOpenPrintModal: (invoice: Invoice) => void;
}

export const InvoiceDetailDrawer: React.FC<InvoiceDetailDrawerProps> = ({
  isOpen,
  onClose,
  invoice,
  onOpenPrintModal,
}) => {
  const { updateInvoiceStatus, deleteInvoice, settings, showToast } = useAppState();
  const [isSyncingStorage, setIsSyncingStorage] = React.useState(false);

  if (!invoice) return null;

  const handleSyncStorage = async () => {
    setIsSyncingStorage(true);
    try {
      const result = await uploadInvoicePdf(invoice, settings);
      if (result.success) {
        showToast('Storage Synced', `Invoice ${invoice.invoiceNumber} stored in Supabase Storage.`, 'success');
      } else {
        showToast('Storage Notice', result.error || 'Upload could not complete.', 'warning');
      }
    } catch {
      showToast('Storage Error', 'Failed to save document to storage.', 'error');
    } finally {
      setIsSyncingStorage(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice: ${invoice.invoiceNumber}`}
      subtitle={`Created on ${formatDate(invoice.date)} • Due on ${formatDate(invoice.dueDate)}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => {
              deleteInvoice(invoice.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onOpenPrintModal(invoice);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            {invoice.status !== 'paid' && (
              <button
                onClick={() => {
                  updateInvoiceStatus(invoice.id, 'paid');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Settlement Status Banner */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Payment Settlement</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900">
                {formatCurrency(invoice.grandTotal)}
              </span>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-500">Balance Outstanding</p>
            <p
              className={`text-base font-extrabold ${
                invoice.balance > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(invoice.balance)}
            </p>
          </div>
        </div>

        {/* Supabase Storage Document Card */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CloudUpload className="w-4 h-4 text-primary-600" />
              Document Storage
            </span>
            {invoice.pdfStatus === 'uploaded' || invoice.pdfStatus === ('ready' as unknown) ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Saved
              </span>
            ) : invoice.pdfStatus === 'failed' ? (
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
              {invoice.invoiceNumber}.pdf
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncStorage}
                disabled={isSyncingStorage}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSyncingStorage ? <Loader2 className="w-3 h-3 animate-spin text-primary-600" /> : <CloudUpload className="w-3 h-3 text-primary-600" />}
                {invoice.pdfStatus === 'failed' ? 'Retry Upload' : 'Save to Storage'}
              </button>
            </div>
          </div>
          {invoice.pdfError && (
            <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
              {invoice.pdfError}
            </p>
          )}
        </div>

        {/* Customer Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Customer Information
          </h4>
          <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">
                  {invoice.customerCompany || invoice.customerName}
                </p>
                <p className="text-slate-600">{invoice.customerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{invoice.customerPhone}</span>
            </div>
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
              <span>{invoice.customerAddress}</span>
            </div>
            {invoice.customerGstin && (
              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <span className="text-slate-500">GSTIN:</span>
                <span className="font-mono font-bold text-slate-800">{invoice.customerGstin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Line Items ({invoice.items.length})
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {invoice.items.map((item) => (
              <div key={item.id} className="p-3 flex items-start justify-between hover:bg-slate-50 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{item.productName}</p>
                    {item.billingType === 'dimension' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Dimension Based
                      </span>
                    )}
                  </div>
                  {item.billingType === 'dimension' ? (
                    <div className="text-[11px] text-slate-600 font-mono space-y-0.5">
                      <p>
                        Size: <span className="font-semibold text-slate-800">{item.length} {item.dimensionUnit || 'ft'} × {item.width} {item.dimensionUnit || 'ft'}</span>
                        {' '}• Area: <span className="font-semibold text-slate-800">{item.billableQuantity} {item.billingUnit || 'sq.ft'}</span>
                      </p>
                      <p className="text-slate-500">
                        Qty: {item.quantity} unit(s) • Rate: {formatCurrency(item.rate)}/{item.billingUnit || 'sq.ft'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      SKU: {item.sku} • Qty: {item.quantity} × {formatCurrency(item.rate)}
                    </p>
                  )}
                  {item.taxRate > 0 && (
                    <span className="text-[10px] text-slate-400 block">
                      Tax: {item.taxRate}% ({formatCurrency(item.taxAmount)})
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Breakdown */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discounts</span>
              <span>-{formatCurrency(invoice.discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>GST Tax</span>
            <span>+{formatCurrency(invoice.taxTotal)}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
            <span>Total</span>
            <span>{formatCurrency(invoice.grandTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Paid</span>
            <span className="text-emerald-600 font-semibold">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900">
            <span>Balance</span>
            <span className={invoice.balance > 0 ? 'text-rose-600' : 'text-slate-800'}>
              {formatCurrency(invoice.balance)}
            </span>
          </div>
        </div>

        {invoice.notes && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Notes</h4>
            <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
              {invoice.notes}
            </p>
          </div>
        )}
      </div>
    </Drawer>
  );
};
