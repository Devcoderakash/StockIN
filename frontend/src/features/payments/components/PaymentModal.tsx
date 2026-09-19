import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useAppState } from '@/context/AppStateContext';
import { PaymentMethod } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { IndianRupee, Receipt } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCustomerId?: string;
  defaultInvoiceId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  defaultCustomerId,
  defaultInvoiceId,
}) => {
  const { customers, invoices, addPayment } = useAppState();

  const [customerId, setCustomerId] = useState(defaultCustomerId || customers[0]?.id || '');
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId || '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState(
    `UTR-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [notes, setNotes] = useState('Customer invoice receipt');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const initialCustId = defaultCustomerId || customers[0]?.id || '';
      setCustomerId(initialCustId);
      setInvoiceId(defaultInvoiceId || '');
      if (defaultInvoiceId) {
        const inv = invoices.find((i) => i.id === defaultInvoiceId);
        setAmount(inv ? String(inv.balance) : '');
      } else {
        setAmount('');
      }
      setMethod('UPI');
      setDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber(`UTR-${Math.floor(100000 + Math.random() * 900000)}`);
      setNotes('Customer invoice receipt');
      setError('');
    }
  }, [defaultCustomerId, defaultInvoiceId, isOpen, invoices, customers]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const dueInvoices = invoices.filter(
    (i) => i.customerId === customerId && (i.status === 'due' || i.status === 'partial')
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!customerId) {
      setError('Please select a customer');
      return;
    }

    const partyName = selectedCustomer?.companyName || selectedCustomer?.name || 'Customer';
    const selectedInv = invoices.find((i) => i.id === invoiceId);

    addPayment({
      partyId: customerId,
      partyName,
      invoiceId: invoiceId || undefined,
      invoiceNumber: selectedInv?.invoiceNumber || undefined,
      amount: amt,
      method,
      date,
      referenceNumber,
      status: 'completed',
      notes,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Customer Receipt"
      description="Record an incoming payment from a customer and settle invoice balances."
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Record Receipt
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && <p className="text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</p>}

        {/* Customer Selector */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Select Customer Account *
          </label>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setInvoiceId('');
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
            required
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.name} — Outstanding: {formatCurrency(c.outstanding)}
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Customer Outstanding:</span>
            <span
              className={`font-bold ${
                selectedCustomer.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(selectedCustomer.outstanding)}
            </span>
          </div>
        )}

        {/* Linked Outstanding Invoice */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Settle Outstanding Invoice (Optional)
          </label>
          <select
            value={invoiceId}
            onChange={(e) => {
              const id = e.target.value;
              setInvoiceId(id);
              const inv = invoices.find((i) => i.id === id);
              if (inv) setAmount(String(inv.balance));
            }}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">-- General Account Credit (No specific invoice) --</option>
            {dueInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — Total: {formatCurrency(inv.grandTotal)} (Balance Due: {formatCurrency(inv.balance)})
              </option>
            ))}
          </select>
        </div>

        {/* Amount & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Amount Received (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-7 pr-3 py-2 font-bold rounded-xl border border-slate-300 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            >
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="Cash">Cash Receipt</option>
              <option value="Card">Credit / Debit Card (POS)</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>
        </div>

        {/* Date & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">UTR / Ref / Cheque No</label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI/260916/884102"
              className="w-full px-3 py-2 font-mono rounded-xl border border-slate-300 bg-white"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Notes & Remarks</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
          />
        </div>
      </form>
    </Modal>
  );
};
