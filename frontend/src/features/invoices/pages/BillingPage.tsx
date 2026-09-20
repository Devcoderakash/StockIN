import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { InvoiceLineItems } from '@/components/billing/InvoiceLineItems';
import { InvoiceSummary } from '@/components/billing/InvoiceSummary';
import { QuickCustomerModal } from '@/components/billing/QuickCustomerModal';
import { PrintableInvoice } from '@/components/invoices/PrintableInvoice';
import { Modal } from '@/components/common/Modal';
import { InvoiceItem, PaymentStatus, Invoice } from '@/types';
import { UserPlus, Receipt, AlertCircle, Save } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { calculateTotals, calculateLineItem } from '@/features/invoices/utils/invoiceCalculations';

export const BillingPage: React.FC = () => {
  const { customers, products, addInvoice, generateInvoiceNumber, settings, showToast } = useAppState();
  const navigate = useNavigate();

  // Generate a unique invoice number once on mount
  const invoiceNumberRef = useRef<string>(generateInvoiceNumber());
  const invoiceNumber = invoiceNumberRef.current;

  // Selected Customer
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

  // Invoice Meta
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState(settings.paymentTerms || 'Due on Receipt');

  // Helper to create an InvoiceItem from a product
  const createItemFromProduct = (prod?: (typeof products)[0], defaultQty = 1): InvoiceItem => {
    const isDim = prod?.billingType === 'dimension';
    const length = isDim ? 2 : undefined;
    const width = isDim ? 4 : undefined;
    const rate = prod?.sellingPrice ?? 120;
    const taxRate = prod?.taxRate ?? 18;
    const calc = calculateLineItem(defaultQty, rate, 0, taxRate, {
      billingType: prod?.billingType,
      length,
      width,
    });

    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: prod?.id || '',
      productName: prod?.name || 'Custom Item',
      sku: prod?.sku || 'SKU-001',
      hsnCode: prod?.hsnCode || '94033010',
      quantity: defaultQty,
      rate,
      discountPercent: 0,
      taxRate,
      taxAmount: calc.taxAmount,
      amount: calc.totalAmount,
      billingType: prod?.billingType || 'standard',
      dimensionUnit: prod?.dimensionUnit || 'ft',
      billingUnit: prod?.billingUnit || 'sq.ft',
      length,
      width,
      billableQuantity: calc.billableQuantity,
    };
  };

  // Items
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    const p1 = products.find((p) => p.stock > 0) || products[0];
    if (p1) {
      return [createItemFromProduct(p1, 1)];
    }
    return [
      {
        id: `item-${Date.now()}-1`,
        productId: '',
        productName: 'Select Item',
        sku: 'SKU-001',
        hsnCode: '94033010',
        quantity: 1,
        rate: 120,
        discountPercent: 0,
        taxRate: 18,
        taxAmount: 21.6,
        amount: 141.6,
        billingType: 'standard',
        dimensionUnit: 'ft',
        billingUnit: 'sq.ft',
      },
    ];
  });

  // Auto-synchronize items when products arrive asynchronously from Supabase
  useEffect(() => {
    if (products.length > 0) {
      setItems((prevItems) => {
        if (
          prevItems.length === 0 ||
          !prevItems[0].productId ||
          !products.some((p) => p.id === prevItems[0].productId)
        ) {
          const p1 = products.find((p) => p.stock > 0) || products[0];
          return [createItemFromProduct(p1, 1)];
        }
        return prevItems;
      });
    }
  }, [products]);

  // Auto-synchronize customer when customers arrive asynchronously
  useEffect(() => {
    if (customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
    }
  }, [customers, customerId]);

  // Settlement state — default to 'due' (not 'paid') so status is calculated properly
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('due');
  const [notes, setNotes] = useState(settings.footerMessage || 'Thank you for your business.');

  // Preview Modal — holds the saved invoice for print preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [savedInvoiceForPreview, setSavedInvoiceForPreview] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected customer object
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Stock Validation Engine
  const stockErrors: { productName: string; available: number; requested: number }[] = [];
  items.forEach((item) => {
    const prod = products.find((p) => p.id === item.productId);
    if (prod && item.quantity > prod.stock) {
      stockErrors.push({
        productName: prod.name,
        available: prod.stock,
        requested: item.quantity,
      });
    }
  });

  const hasStockError = stockErrors.length > 0;
  const stockErrorMessage = hasStockError
    ? `Only ${stockErrors[0].available} units are available for ${stockErrors[0].productName}. You are trying to sell ${stockErrors[0].requested} units.`
    : '';

  // Calculations via central financial engine
  const { subtotal, discountTotal, taxTotal, grandTotal } = calculateTotals(items);

  // Determine effective paid amount: if status is 'paid', full amount; otherwise use paidAmount
  const effectivePaid =
    paidAmount !== null
      ? paidAmount
      : status === 'paid'
      ? grandTotal
      : 0;

  const balance = Math.max(0, grandTotal - effectivePaid);

  // Auto-calculate status from amounts
  const calculatedStatus: PaymentStatus = balance === 0 ? 'paid' : effectivePaid > 0 ? 'partial' : 'due';

  const buildInvoiceData = () => ({
    invoiceNumber,
    customerId,
    customerName: selectedCustomer?.name || 'Walk-in Customer',
    customerCompany: selectedCustomer?.companyName || '',
    customerPhone: selectedCustomer?.phone || '',
    customerEmail: selectedCustomer?.email || '',
    customerAddress: selectedCustomer?.address
      ? `${selectedCustomer.address}, ${selectedCustomer.city}`
      : 'Bhopal, MP',
    customerGstin: selectedCustomer?.gstin || '',
    date,
    dueDate,
    paymentTerms,
    items,
    subtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    paidAmount: effectivePaid,
    balance,
    status: calculatedStatus,
    notes,
  });

  const validateBeforeSave = (): boolean => {
    if (items.length === 0) {
      showToast('No items', 'Add at least one product to the invoice.', 'error');
      return false;
    }
    if (!customerId) {
      showToast('No customer', 'Please select a customer.', 'error');
      return false;
    }
    if (hasStockError) {
      showToast(
        'Insufficient Stock',
        stockErrorMessage || 'Reduce item quantities to available stock before billing.',
        'error'
      );
      return false;
    }

    const invalidDimItem = items.find(
      (item) => item.billingType === 'dimension' && ((item.length ?? 0) <= 0 || (item.width ?? 0) <= 0)
    );
    if (invalidDimItem) {
      showToast(
        'Invalid Dimensions',
        `Length and width must both be greater than 0 for "${invalidDimItem.productName}".`,
        'error'
      );
      return false;
    }

    return true;
  };

  const handleSaveInvoice = async () => {
    if (!validateBeforeSave() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const savedId = await addInvoice(buildInvoiceData());
      if (savedId) {
        navigate('/invoices');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!validateBeforeSave() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const invData = buildInvoiceData();
      const savedId = await addInvoice(invData);
      if (savedId) {
        // Build a complete invoice object with the real ID for the print preview
        const fullInvoice: Invoice = { ...invData, id: savedId };
        setSavedInvoiceForPreview(fullInvoice);
        setIsPreviewOpen(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentInvoiceForPreview: Invoice = savedInvoiceForPreview || {
    ...buildInvoiceData(),
    id: 'preview-draft',
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-12">
      {/* Page Header */}
      <PageHeader
        title="Create Tax Invoice (POS)"
        subtitle="Issue compliant GST invoices with automated stock deduction and customer account settlement."
        badge={
          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            {invoiceNumber}
          </span>
        }
      />

      {/* Global Insufficient Stock Alert Banner if any item exceeds available units */}
      {hasStockError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-800">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-xs">Insufficient Stock: Sale Blocked</p>
              <p className="text-xs text-rose-700 mt-0.5">{stockErrorMessage}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-2.5 py-1 rounded-md border border-rose-200">
            Fix quantity to proceed
          </span>
        </div>
      )}

      {/* Invoice Meta & Customer Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Invoice Metadata (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3.5 text-xs">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900">Invoice Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                readOnly
                className="w-full px-3 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="50% Advance">50% Advance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Right: Customer Information (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Billed To (Customer Account)</h3>
            <button
              type="button"
              onClick={() => setIsQuickCustomerOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Quick Add Customer
            </button>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 font-medium rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName ? `${c.companyName} (${c.name})` : c.name} — {c.phone}
                </option>
              ))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <p className="font-bold text-slate-900 text-xs">{selectedCustomer.companyName || selectedCustomer.name}</p>
                <p>{selectedCustomer.address}, {selectedCustomer.city}</p>
                <p>Phone: {selectedCustomer.phone}</p>
              </div>
              <div className="sm:text-right">
                <p><span className="font-semibold text-slate-700">GSTIN:</span> <span className="font-mono font-bold text-slate-800">{selectedCustomer.gstin || 'Unregistered'}</span></p>
                <p className="mt-1">
                  Outstanding Due:{' '}
                  <strong className={selectedCustomer.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    ₹{selectedCustomer.outstanding.toLocaleString('en-IN')}
                  </strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Line Items and Summary Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Line Items Table (8 Cols) */}
        <div className="lg:col-span-8">
          <InvoiceLineItems items={items} onChange={setItems} />
        </div>

        {/* Summary Card (4 Cols) */}
        <div className="lg:col-span-4">
          <InvoiceSummary
            subtotal={subtotal}
            discountTotal={discountTotal}
            taxTotal={taxTotal}
            grandTotal={grandTotal}
            paidAmount={effectivePaid}
            balance={balance}
            status={calculatedStatus}
            notes={notes}
            onPaidAmountChange={setPaidAmount}
            onStatusChange={setStatus}
            onNotesChange={setNotes}
            onSave={handleSaveInvoice}
            onSaveAndPrint={handleSaveAndPrint}
            onPreview={() => setIsPreviewOpen(true)}
            isSubmitting={isSubmitting}
            hasStockError={hasStockError}
            stockErrorMessage={stockErrorMessage}
          />
        </div>
      </div>

      {/* Quick Add Customer Modal */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        onCustomerCreated={(newId) => setCustomerId(newId)}
      />

      {/* Printable Invoice Modal Preview */}
      <PrintableInvoice
        isOpen={isPreviewOpen}
        invoice={currentInvoiceForPreview}
        onClose={() => {
          setIsPreviewOpen(false);
          if (savedInvoiceForPreview) navigate('/invoices');
        }}
      />

      {/* Mobile Sticky Summary & Action Bar (< 1024px) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
              {items.length} {items.length === 1 ? 'Item' : 'Items'} • Grand Total
            </span>
            <span className="text-lg font-black text-blue-600 font-mono leading-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={isSubmitting || grandTotal <= 0 || hasStockError}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
};
