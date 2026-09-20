import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { useAppState } from '@/context/AppStateContext';
import { Quotation, QuotationItem, QuotationStatus } from '@/types';
import { QuickCustomerModal } from '@/components/billing/QuickCustomerModal';
import { formatCurrency } from '@/utils/formatters';
import { calculateLineItem, calculateTotals } from '@/features/invoices/utils/invoiceCalculations';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationToEdit?: Quotation | null;
  onSaved?: (quotationId: string) => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  quotationToEdit,
  onSaved,
}) => {
  const {
    customers,
    products,
    addQuotation,
    updateQuotation,
    generateQuotationNumber,
    settings,
    showToast,
  } = useAppState();

  const isEditing = Boolean(quotationToEdit);

  // Form State
  const [quotationNumber, setQuotationNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

  const [quotationDate, setQuotationDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [status, setStatus] = useState<QuotationStatus>('draft');

  const [items, setItems] = useState<QuotationItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when opened
  useEffect(() => {
    if (!isOpen) return;

    if (quotationToEdit) {
      setQuotationNumber(quotationToEdit.quotationNumber);
      setCustomerId(quotationToEdit.customerId);
      setQuotationDate(quotationToEdit.quotationDate);
      setValidUntil(quotationToEdit.validUntil);
      setNotes(quotationToEdit.notes || '');
      setTerms(
        quotationToEdit.terms ||
          '1. Quotation prices are valid until the specified expiry date.\n2. Goods are subject to live warehouse stock availability upon confirmation.\n3. This document is a price estimate and does not constitute a sales tax invoice or reservation of inventory.'
      );
      setStatus(quotationToEdit.status);
      setItems(quotationToEdit.items);
    } else {
      const today = new Date();
      const expiry = new Date(today);
      expiry.setDate(expiry.getDate() + 15);

      const generatedNum = generateQuotationNumber();
      setQuotationNumber(generatedNum);

      const defaultCust = customers[0]?.id || '';
      setCustomerId(defaultCust);

      setQuotationDate(today.toISOString().split('T')[0]);
      setValidUntil(expiry.toISOString().split('T')[0]);
      setNotes('Thank you for your inquiry. Please contact us to confirm your order.');
      setTerms(
        '1. Quotation prices are valid until the specified expiry date.\n2. Goods are subject to live warehouse stock availability upon confirmation.\n3. This document is a price estimate and does not constitute a sales tax invoice or reservation of inventory.'
      );
      setStatus('draft');

      // Initial item if available
      const p1 = products[0];
      if (p1) {
        const qty = 1;
        const rate = p1.sellingPrice;
        const discount = 0;
        const taxRate = p1.taxRate || 18;
        const isDim = p1.billingType === 'dimension';
        const length = isDim ? 1 : undefined;
        const width = isDim ? 1 : undefined;
        const calc = calculateLineItem(qty, rate, discount, taxRate, {
          billingType: p1.billingType,
          length,
          width,
        });

        setItems([
          {
            id: `item-${Date.now()}-1`,
            productId: p1.id,
            productName: p1.name,
            sku: p1.sku,
            hsnCode: p1.hsnCode || '94033010',
            quantity: qty,
            rate: rate,
            discountPercent: discount,
            taxRate: taxRate,
            taxAmount: calc.taxAmount,
            amount: calc.totalAmount,
            billingType: p1.billingType || 'standard',
            dimensionUnit: p1.dimensionUnit || 'ft',
            billingUnit: p1.billingUnit || 'sq.ft',
            length,
            width,
            billableQuantity: calc.billableQuantity,
          },
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, quotationToEdit]);

  // Selected Customer Details
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Line item handlers
  const handleAddItem = () => {
    const defaultProd = products[0];
    const qty = 1;
    const rate = defaultProd ? defaultProd.sellingPrice : 1000;
    const taxRate = defaultProd ? defaultProd.taxRate || 18 : 18;
    const isDim = defaultProd?.billingType === 'dimension';
    const length = isDim ? 1 : undefined;
    const width = isDim ? 1 : undefined;

    const calc = calculateLineItem(qty, rate, 0, taxRate, {
      billingType: defaultProd?.billingType,
      length,
      width,
    });

    const newItem: QuotationItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      productId: defaultProd?.id || '',
      productName: defaultProd?.name || 'Item',
      sku: defaultProd?.sku || 'SKU-001',
      hsnCode: defaultProd?.hsnCode || '94033010',
      quantity: qty,
      rate: rate,
      discountPercent: 0,
      taxRate: taxRate,
      taxAmount: calc.taxAmount,
      amount: calc.totalAmount,
      billingType: defaultProd?.billingType || 'standard',
      dimensionUnit: defaultProd?.dimensionUnit || 'ft',
      billingUnit: defaultProd?.billingUnit || 'sq.ft',
      length,
      width,
      billableQuantity: calc.billableQuantity,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<QuotationItem>) => {
    const newItems = [...items];
    const current = { ...newItems[index], ...updates };

    // If product changed, update product details and quoted rate snapshot
    if (updates.productId) {
      const prod = products.find((p) => p.id === updates.productId);
      if (prod) {
        current.productName = prod.name;
        current.sku = prod.sku;
        current.hsnCode = prod.hsnCode;
        current.rate = prod.sellingPrice;
        current.taxRate = prod.taxRate;
        current.billingType = prod.billingType || 'standard';
        current.dimensionUnit = prod.dimensionUnit || 'ft';
        current.billingUnit = prod.billingUnit || 'sq.ft';
        if (prod.billingType === 'dimension') {
          current.length = current.length && current.length > 0 ? current.length : 1;
          current.width = current.width && current.width > 0 ? current.width : 1;
        } else {
          current.length = undefined;
          current.width = undefined;
          current.billableQuantity = undefined;
        }
      }
    }

    const isDim = current.billingType === 'dimension';
    const qty = Math.max(1, current.quantity || 1);
    const rate = Math.max(0, current.rate || 0);
    const discount = Math.min(100, Math.max(0, current.discountPercent || 0));
    const taxRate = current.taxRate || 0;
    const len = isDim ? (current.length !== undefined ? current.length : 1) : undefined;
    const wid = isDim ? (current.width !== undefined ? current.width : 1) : undefined;

    const calc = calculateLineItem(qty, rate, discount, taxRate, {
      billingType: current.billingType,
      length: len,
      width: wid,
    });

    current.quantity = qty;
    current.rate = rate;
    current.discountPercent = discount;
    current.taxAmount = calc.taxAmount;
    current.amount = calc.totalAmount;
    current.billableQuantity = calc.billableQuantity;
    if (isDim) {
      current.length = len;
      current.width = wid;
    }

    newItems[index] = current;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations Engine
  const totals = calculateTotals(items);
  const subtotal = totals.subtotal;
  const discountTotal = totals.discountTotal;
  const taxTotal = totals.taxTotal;
  const cgst = totals.cgst;
  const sgst = totals.sgst;
  const grandTotal = totals.grandTotal;

  // Check inventory warnings for all items
  const inventoryWarnings = items
    .map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && item.quantity > prod.stock) {
        return {
          productName: prod.name,
          available: prod.stock,
          requested: item.quantity,
        };
      }
      return null;
    })
    .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      showToast('Missing Customer', 'Please select or add a customer for this quotation.', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Empty Quotation', 'Please add at least one product item.', 'error');
      return;
    }
    if (!validUntil) {
      showToast('Missing Expiry', 'Please specify a valid until date.', 'error');
      return;
    }

    // Validate dimension items
    const invalidDimItem = items.find(
      (item) => item.billingType === 'dimension' && ((item.length ?? 0) <= 0 || (item.width ?? 0) <= 0)
    );
    if (invalidDimItem) {
      showToast(
        'Invalid Dimensions',
        `Item "${invalidDimItem.productName}" requires length and width greater than 0.`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    const quotationPayload = {
      quotationNumber,
      customerId,
      customerName: selectedCustomer?.name || 'Walk-in Customer',
      customerCompany: selectedCustomer?.companyName || '',
      customerPhone: selectedCustomer?.phone || '',
      customerEmail: selectedCustomer?.email || '',
      customerAddress: selectedCustomer?.address
        ? `${selectedCustomer.address}, ${selectedCustomer.city}`
        : 'Bhopal, MP',
      customerGstin: selectedCustomer?.gstin || '',
      quotationDate,
      validUntil,
      items,
      subtotal,
      discountTotal,
      cgst,
      sgst,
      taxTotal,
      grandTotal,
      notes,
      terms,
      status: isEditing && quotationToEdit ? quotationToEdit.status : status,
    };

    let resultId = '';
    if (isEditing && quotationToEdit) {
      updateQuotation(quotationToEdit.id, quotationPayload);
      resultId = quotationToEdit.id;
    } else {
      resultId = addQuotation(quotationPayload);
    }

    setIsSubmitting(false);
    onClose();
    if (onSaved) onSaved(resultId);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Quotation (${quotationNumber})` : 'Create New Quotation'}
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Prepare an estimate/offer. Does not deduct or reserve warehouse stock.
              </p>
            </div>
          </div>
        }
        maxWidth="5xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Banner Notice: Stock Invariance */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Quotation Rule:</strong> Creating or editing a quotation will{' '}
                <strong>never deduct stock</strong> or create stock out movements.
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
              {quotationNumber}
            </span>
          </div>

          {/* Customer & Quotation Meta */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Customer Picker (6 cols) */}
            <div className="md:col-span-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Customer / Client *
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  <UserPlus className="w-3 h-3" />
                  + Quick Add Customer
                </button>
              </div>

              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">Select a Customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ''} — {c.phone}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-0.5 text-slate-600">
                  <p className="font-bold text-slate-800">{selectedCustomer.name}</p>
                  {selectedCustomer.companyName && (
                    <p className="font-medium text-slate-700">{selectedCustomer.companyName}</p>
                  )}
                  <p className="text-[11px]">{selectedCustomer.address}, {selectedCustomer.city}</p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-500">
                    <span>Ph: {selectedCustomer.phone}</span>
                    {selectedCustomer.gstin && <span>GSTIN: {selectedCustomer.gstin}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Quotation Dates & Status (6 cols) */}
            <div className="md:col-span-6 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quotation Date
                  </label>
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quotation Number
                  </label>
                  <input
                    type="text"
                    value={quotationNumber}
                    readOnly
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as QuotationStatus)}
                    disabled={status === 'converted'}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                    {status === 'converted' && <option value="converted">Converted</option>}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quotation Line Items</h3>
                <p className="text-xs text-slate-500">
                  Select products, check real-time stock availability, and adjust quoted prices.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {/* Inventory Warning Banner if any item requested > available */}
            {inventoryWarnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Current Stock Notice (You may still prepare the quotation):</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700 pl-1">
                  {inventoryWarnings.map((w, idx) => (
                    <li key={idx}>
                      <strong>{w?.productName}</strong>: Available in warehouse:{' '}
                      <span className="font-bold">{w?.available}</span>, Requested in quotation:{' '}
                      <span className="font-bold">{w?.requested}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mobile Items Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              {items.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No products added yet. Tap &ldquo;+ Add Item&rdquo; above.
                </div>
              ) : (
                items.map((item, idx) => {
                  const prod = products.find((p) => p.id === item.productId);
                  const isLowStock = prod ? item.quantity > prod.stock : false;

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-4 rounded-xl border space-y-3 transition-colors ${
                        isLowStock ? 'bg-amber-50/40 border-amber-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Header: Item # and Delete */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Item #{idx + 1}
                          </span>
                          {item.billingType === 'dimension' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                              Dimension Based
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>

                      {/* Product Picker */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product</label>
                        <select
                          value={item.productId}
                          onChange={(e) => handleUpdateItem(idx, { productId: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 min-h-[44px]"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) — Avail: {p.stock} {p.unit} (₹{p.sellingPrice.toLocaleString('en-IN')}{p.billingType === 'dimension' ? `/${p.billingUnit || 'sq.ft'}` : ''})
                            </option>
                          ))}
                        </select>

                        {/* Live Stock Indicator */}
                        <div className="mt-1.5 flex items-center gap-2">
                          {prod ? (
                            isLowStock ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Available in warehouse: {prod.stock} {prod.unit}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Available ({prod.stock} in stock)
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-400">Custom Item</span>
                          )}
                        </div>

                        {/* Dimensional Controls for Mode 2 Products */}
                        {item.billingType === 'dimension' && (
                          <div className="mt-2.5 p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                                Size:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <label className="text-[11px] font-medium text-slate-600">L:</label>
                                <div className="relative w-20">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={item.length ?? ''}
                                    onChange={(e) =>
                                      handleUpdateItem(idx, { length: parseFloat(e.target.value) || 0 })
                                    }
                                    className={`w-full pr-5 pl-2 py-1 text-xs font-semibold rounded-md border bg-white focus:outline-hidden focus:ring-1 ${
                                      !item.length || item.length <= 0
                                        ? 'border-rose-400 ring-1 ring-rose-300'
                                        : 'border-slate-300 focus:ring-amber-500'
                                    }`}
                                    placeholder="Length"
                                  />
                                  <span className="absolute right-1.5 top-1 text-[10px] font-medium text-slate-400 pointer-events-none">
                                    {item.dimensionUnit || 'ft'}
                                  </span>
                                </div>

                                <span className="text-slate-400 font-bold">×</span>

                                <label className="text-[11px] font-medium text-slate-600">W:</label>
                                <div className="relative w-20">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={item.width ?? ''}
                                    onChange={(e) =>
                                      handleUpdateItem(idx, { width: parseFloat(e.target.value) || 0 })
                                    }
                                    className={`w-full pr-5 pl-2 py-1 text-xs font-semibold rounded-md border bg-white focus:outline-hidden focus:ring-1 ${
                                      !item.width || item.width <= 0
                                        ? 'border-rose-400 ring-1 ring-rose-300'
                                        : 'border-slate-300 focus:ring-amber-500'
                                    }`}
                                    placeholder="Width"
                                  />
                                  <span className="absolute right-1.5 top-1 text-[10px] font-medium text-slate-400 pointer-events-none">
                                    {item.dimensionUnit || 'ft'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Live Calculation Formula Display */}
                            <div className="text-[11px] text-amber-900 flex flex-wrap items-center gap-1.5">
                              <span className="font-mono bg-amber-100/90 text-amber-950 px-2 py-0.5 rounded text-[11px] font-semibold">
                                {item.length || 0} {item.dimensionUnit} × {item.width || 0}{' '}
                                {item.dimensionUnit} × {item.quantity} ={' '}
                                {item.billableQuantity || 0} {item.billingUnit}
                              </span>
                              <span>•</span>
                              <span className="font-mono font-semibold text-slate-700">
                                {item.billableQuantity || 0} {item.billingUnit} × ₹{item.rate} = ₹
                                {((item.billableQuantity || 0) * (item.rate || 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stepper Quantity & Quoted Rate */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity (Units)</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}
                              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-300 bg-white font-bold text-slate-700 active:bg-slate-100 cursor-pointer shrink-0 text-base"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })
                              }
                              className="w-full h-10 text-center font-bold text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(idx, { quantity: item.quantity + 1 })}
                              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-300 bg-white font-bold text-slate-700 active:bg-slate-100 cursor-pointer shrink-0 text-base"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Quoted Rate (₹){item.billingType === 'dimension' ? ` / ${item.billingUnit || 'sq.ft'}` : ''}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate}
                            onChange={(e) =>
                              handleUpdateItem(idx, { rate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full h-10 px-3 text-right font-bold text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Discount % & Tax Rate % */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Discount %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                discountPercent: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full h-9 px-3 text-center text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST Rate</label>
                          <select
                            value={item.taxRate}
                            onChange={(e) =>
                              handleUpdateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full h-9 px-2 text-center text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      </div>

                      {/* Subtotal & Tax Calculation Row */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <div className="text-slate-500">
                          GST: <span className="font-semibold text-slate-700">{formatCurrency(item.taxAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 mr-1.5">Line Total:</span>
                          <span className="font-black text-sm text-slate-900">{formatCurrency(item.amount)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Items Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 font-semibold">
                    <th className="pb-3 w-8">#</th>
                    <th className="pb-3 min-w-[280px]">Product / Live Stock</th>
                    <th className="pb-3 w-24 text-center">Qty (Units)</th>
                    <th className="pb-3 w-32 text-right">Quoted Rate (₹)</th>
                    <th className="pb-3 w-16 text-center">Disc %</th>
                    <th className="pb-3 w-16 text-center">GST %</th>
                    <th className="pb-3 w-24 text-right">GST (₹)</th>
                    <th className="pb-3 w-28 text-right">Total (₹)</th>
                    <th className="pb-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        No products added yet. Click &ldquo;Add Item&rdquo; above.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const prod = products.find((p) => p.id === item.productId);
                      const isLowStock = prod ? item.quantity > prod.stock : false;

                      return (
                        <tr
                          key={item.id || idx}
                          className={`transition-colors ${
                            isLowStock ? 'bg-amber-50/40' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3 text-slate-400 font-medium align-top pt-3">{idx + 1}</td>

                          {/* Product Selection + Stock Badge */}
                          <td className="py-3 pr-2 align-top">
                            <select
                              value={item.productId}
                              onChange={(e) => handleUpdateItem(idx, { productId: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:ring-1 focus:ring-amber-500"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku}) — Avail: {p.stock} {p.unit} (₹{p.sellingPrice.toLocaleString('en-IN')}{p.billingType === 'dimension' ? `/${p.billingUnit || 'sq.ft'}` : ''})
                                </option>
                              ))}
                            </select>

                            {/* Live Stock Indicator */}
                            <div className="mt-1 flex items-center gap-2">
                              {prod ? (
                                isLowStock ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Current stock is lower than quotation quantity (Available: {prod.stock})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    ✓ Available ({prod.stock} in stock)
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-400">Custom Product</span>
                              )}
                              {item.billingType === 'dimension' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                  Dimension Billing
                                </span>
                              )}
                            </div>

                            {/* Dimensional Controls for Mode 2 Products */}
                            {item.billingType === 'dimension' && (
                              <div className="mt-2 p-2.5 bg-amber-50/60 border border-amber-200/80 rounded-lg space-y-2">
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                                    Size:
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <label className="text-[11px] font-medium text-slate-600">L:</label>
                                    <div className="relative w-20">
                                      <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        value={item.length ?? ''}
                                        onChange={(e) =>
                                          handleUpdateItem(idx, { length: parseFloat(e.target.value) || 0 })
                                        }
                                        className={`w-full pr-5 pl-2 py-1 text-xs font-semibold rounded-md border bg-white focus:outline-hidden focus:ring-1 ${
                                          !item.length || item.length <= 0
                                            ? 'border-rose-400 ring-1 ring-rose-300'
                                            : 'border-slate-300 focus:ring-amber-500'
                                        }`}
                                        placeholder="Length"
                                      />
                                      <span className="absolute right-1.5 top-1 text-[10px] font-medium text-slate-400 pointer-events-none">
                                        {item.dimensionUnit || 'ft'}
                                      </span>
                                    </div>

                                    <span className="text-slate-400 font-bold">×</span>

                                    <label className="text-[11px] font-medium text-slate-600">W:</label>
                                    <div className="relative w-20">
                                      <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        value={item.width ?? ''}
                                        onChange={(e) =>
                                          handleUpdateItem(idx, { width: parseFloat(e.target.value) || 0 })
                                        }
                                        className={`w-full pr-5 pl-2 py-1 text-xs font-semibold rounded-md border bg-white focus:outline-hidden focus:ring-1 ${
                                          !item.width || item.width <= 0
                                            ? 'border-rose-400 ring-1 ring-rose-300'
                                            : 'border-slate-300 focus:ring-amber-500'
                                        }`}
                                        placeholder="Width"
                                      />
                                      <span className="absolute right-1.5 top-1 text-[10px] font-medium text-slate-400 pointer-events-none">
                                        {item.dimensionUnit || 'ft'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Live Calculation Formula Display */}
                                <div className="text-[11px] text-amber-900 flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono bg-amber-100/90 text-amber-950 px-2 py-0.5 rounded text-[11px] font-semibold">
                                    {item.length || 0} {item.dimensionUnit} × {item.width || 0}{' '}
                                    {item.dimensionUnit} × {item.quantity} ={' '}
                                    {item.billableQuantity || 0} {item.billingUnit}
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono font-semibold text-slate-700">
                                    {item.billableQuantity || 0} {item.billingUnit} × ₹{item.rate} = ₹
                                    {((item.billableQuantity || 0) * (item.rate || 0)).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-1 align-top pt-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })
                              }
                              className="w-full px-2 py-1.5 text-center font-bold border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* Rate Snapshot */}
                          <td className="py-3 px-1 text-right align-top pt-3">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.rate}
                              onChange={(e) =>
                                handleUpdateItem(idx, { rate: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full px-2 py-1.5 text-right font-mono font-medium border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                            />
                            {item.billingType === 'dimension' && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                per {item.billingUnit || 'sq.ft'}
                              </span>
                            )}
                          </td>

                          {/* Discount % */}
                          <td className="py-3 px-1 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) =>
                                handleUpdateItem(idx, {
                                  discountPercent: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-1.5 py-1.5 text-center font-mono border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* GST % */}
                          <td className="py-3 px-1 text-center">
                            <select
                              value={item.taxRate}
                              onChange={(e) =>
                                handleUpdateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })
                              }
                              className="w-full px-1 py-1.5 text-center font-mono border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>

                          {/* Tax Amount */}
                          <td className="py-3 px-2 text-right font-mono text-slate-600">
                            {formatCurrency(item.taxAmount)}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>

                          {/* Remove */}
                          <td className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary Row */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start gap-6">
              {/* Terms & Notes in form */}
              <div className="w-full sm:w-1/2 space-y-2.5 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Notes / Offer Details
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes for customer..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={2}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Quotation validity, terms of payment, supply conditions..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-700"
                  />
                </div>
              </div>

              {/* Totals Table */}
              <div className="w-full sm:w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-mono font-semibold">- {formatCurrency(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>CGST</span>
                  <span className="font-mono font-semibold text-slate-800">{formatCurrency(cgst)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST</span>
                  <span className="font-mono font-semibold text-slate-800">{formatCurrency(sgst)}</span>
                </div>
                <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-black text-slate-900">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-700">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isEditing ? 'Save Quotation Changes' : 'Save Quotation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Customer Creation Modal */}
      {isQuickCustomerOpen && (
        <QuickCustomerModal
          isOpen={isQuickCustomerOpen}
          onClose={() => setIsQuickCustomerOpen(false)}
          onCustomerCreated={(newCustId) => {
            setCustomerId(newCustId);
          }}
        />
      )}
    </>
  );
};
