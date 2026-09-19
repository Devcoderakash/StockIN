import React from 'react';
import { formatCurrency } from '@/utils/formatters';
import { PaymentStatus } from '@/types';
import { Printer, Save, Eye, AlertTriangle } from 'lucide-react';

interface InvoiceSummaryProps {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  balance: number;
  status: PaymentStatus;
  notes: string;
  onPaidAmountChange: (amount: number) => void;
  onStatusChange: (status: PaymentStatus) => void;
  onNotesChange: (notes: string) => void;
  onSave: () => void;
  onSaveAndPrint: () => void;
  onPreview: () => void;
  isSubmitting?: boolean;
  hasStockError?: boolean;
  stockErrorMessage?: string;
}

export const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({
  subtotal,
  discountTotal,
  taxTotal,
  grandTotal,
  paidAmount,
  balance,
  status,
  notes,
  onPaidAmountChange,
  onStatusChange,
  onNotesChange,
  onSave,
  onSaveAndPrint,
  onPreview,
  isSubmitting = false,
  hasStockError = false,
  stockErrorMessage = '',
}) => {
  const halfTax = taxTotal / 2;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
        Invoice Summary & Settlement
      </h3>

      {/* Insufficient Stock Warning Card */}
      {hasStockError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
          <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Insufficient Stock Detected</span>
          </div>
          <p className="text-[11px] text-rose-600 font-medium">
            {stockErrorMessage || 'You cannot complete this sale because one or more item quantities exceed available warehouse inventory.'}
          </p>
          <p className="text-[10px] text-rose-500 italic pt-0.5">
            Adjust line quantities or add stock via Stock In before proceeding.
          </p>
        </div>
      )}

      {/* Financial Calculations */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal (Base Value)</span>
          <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
        </div>

        {discountTotal > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Item Discounts</span>
            <span className="font-semibold">-{formatCurrency(discountTotal)}</span>
          </div>
        )}

        <div className="flex justify-between text-slate-500">
          <span>CGST (Central Tax)</span>
          <span className="font-medium text-slate-700">+{formatCurrency(halfTax)}</span>
        </div>

        <div className="flex justify-between text-slate-500">
          <span>SGST (State Tax)</span>
          <span className="font-medium text-slate-700">+{formatCurrency(halfTax)}</span>
        </div>

        <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
          <span className="text-sm font-extrabold text-slate-900">Grand Total</span>
          <span className="text-xl font-black text-blue-600">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Settlement Inputs */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        {/* Payment Status Toggle */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Payment Status
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['paid', 'partial', 'due'] as PaymentStatus[]).map((st) => (
              <button
                type="button"
                key={st}
                onClick={() => {
                  onStatusChange(st);
                  if (st === 'paid') onPaidAmountChange(grandTotal);
                  if (st === 'due') onPaidAmountChange(0);
                }}
                className={`py-1.5 text-xs font-bold rounded-lg border capitalize transition-all cursor-pointer ${
                  status === st
                    ? st === 'paid'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                      : st === 'partial'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500'
                      : 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Paid */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-slate-700">Amount Paid (₹)</span>
            <span className="text-slate-400 text-[11px]">
              {paidAmount >= grandTotal ? 'Fully Settled' : 'Partial / Pending'}
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
            <input
              type="number"
              min="0"
              max={grandTotal}
              value={paidAmount}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                onPaidAmountChange(val);
                if (val >= grandTotal) onStatusChange('paid');
                else if (val > 0) onStatusChange('partial');
                else onStatusChange('due');
              }}
              className="w-full pl-7 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Balance Due */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Balance Due:</span>
          <span
            className={`font-extrabold text-sm ${
              balance > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(balance)}
          </span>
        </div>

        {/* Notes & Terms */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notes & Payment Terms</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="e.g. Thanks for your business. Payment received via UPI."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting || grandTotal <= 0 || hasStockError}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {hasStockError ? 'Cannot Save (Insufficient Stock)' : 'Save Invoice'}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSaveAndPrint}
            disabled={isSubmitting || grandTotal <= 0 || hasStockError}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Save & Print
          </button>

          <button
            type="button"
            onClick={onPreview}
            disabled={grandTotal <= 0}
            className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>
    </div>
  );
};
