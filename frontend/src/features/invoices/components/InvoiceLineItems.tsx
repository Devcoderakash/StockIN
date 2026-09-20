import React from 'react';
import { InvoiceItem } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { Plus, Trash2, AlertCircle, Ruler, Layers } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { calculateLineItem } from '@/features/invoices/utils/invoiceCalculations';

interface InvoiceLineItemsProps {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
}

export const InvoiceLineItems: React.FC<InvoiceLineItemsProps> = ({ items, onChange }) => {
  const { products } = useAppState();

  const handleAddItem = () => {
    // Pick the first product with stock > 0 if available, else first product
    const defaultProd = products.find((p) => p.stock > 0) || products[0];
    const isDim = defaultProd?.billingType === 'dimension';
    const length = isDim ? 2 : undefined;
    const width = isDim ? 4 : undefined;

    const calc = calculateLineItem(1, defaultProd?.sellingPrice || 120, 0, defaultProd?.taxRate || 18, {
      billingType: defaultProd?.billingType,
      length,
      width,
    });

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: defaultProd?.id || '',
      productName: defaultProd?.name || 'Item',
      sku: defaultProd?.sku || 'SKU-001',
      hsnCode: defaultProd?.hsnCode || '94033010',
      quantity: 1,
      rate: defaultProd?.sellingPrice || 120,
      discountPercent: 0,
      taxRate: defaultProd?.taxRate || 18,
      taxAmount: calc.taxAmount,
      amount: calc.totalAmount,
      billingType: defaultProd?.billingType || 'standard',
      dimensionUnit: defaultProd?.dimensionUnit || 'ft',
      billingUnit: defaultProd?.billingUnit || 'sq.ft',
      length,
      width,
      billableQuantity: calc.billableQuantity,
    };
    onChange([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const newItems = [...items];
    const current = { ...newItems[index], ...updates };

    // If product changed, update product properties and auto-load dimension config
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
          current.length = current.length && current.length > 0 ? current.length : 2;
          current.width = current.width && current.width > 0 ? current.width : 4;
        } else {
          current.length = undefined;
          current.width = undefined;
          current.billableQuantity = undefined;
        }
      }
    }

    // If billingType was manually changed via the mode selector
    if (updates.billingType) {
      if (updates.billingType === 'dimension') {
        current.billingType = 'dimension';
        current.dimensionUnit = current.dimensionUnit || 'ft';
        current.billingUnit = current.billingUnit || 'sq.ft';
        current.length = current.length && current.length > 0 ? current.length : 2;
        current.width = current.width && current.width > 0 ? current.width : 4;
      } else {
        current.billingType = 'standard';
        current.length = undefined;
        current.width = undefined;
        current.billableQuantity = undefined;
      }
    }

    const isDim = current.billingType === 'dimension';
    const qty = Math.max(1, current.quantity || 1);
    const rate = Math.max(0, current.rate || 0);
    const discount = Math.min(100, Math.max(0, current.discountPercent || 0));
    const taxPercent = current.taxRate !== undefined ? current.taxRate : 18;
    const len = isDim ? (current.length !== undefined ? current.length : 2) : undefined;
    const wid = isDim ? (current.width !== undefined ? current.width : 4) : undefined;

    const calc = calculateLineItem(qty, rate, discount, taxPercent, {
      billingType: current.billingType,
      length: len,
      width: wid,
    });

    current.quantity = qty;
    current.rate = rate;
    current.discountPercent = discount;
    current.taxRate = taxPercent;
    current.taxAmount = calc.taxAmount;
    current.amount = calc.totalAmount;
    current.billableQuantity = calc.billableQuantity;
    if (isDim) {
      current.length = len;
      current.width = wid;
    }

    newItems[index] = current;
    onChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Invoice Items</span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Standard products calculate Qty × Rate. Dimension-based products automatically compute Length × Width × Qty.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-xs font-medium text-slate-500">
            No items added yet. Click &ldquo;+ Add Item&rdquo; to add a product.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const prod = products.find((p) => p.id === item.productId);
            const isOverStock = prod ? item.quantity > prod.stock : false;
            const isDim = item.billingType === 'dimension';
            const hasDimError = isDim && ((item.length ?? 0) <= 0 || (item.width ?? 0) <= 0);

            return (
              <div
                key={item.id || idx}
                data-testid={`invoice-item-${idx}`}
                className={`p-4 rounded-xl border transition-all ${
                  isDim
                    ? 'border-blue-200/90 bg-slate-50/40 shadow-xs'
                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                } ${isOverStock || hasDimError ? 'ring-1 ring-rose-400 bg-rose-50/20' : ''}`}
              >
                {/* 1. Item Header: Index, Mode Selector Badge/Toggle, Remove Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>

                    {/* Mode Selector / Indicator Toggle */}
                    <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, { billingType: 'standard' })}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          !isDim
                            ? 'bg-white text-slate-800 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Standard Quantity Billing (Qty × Rate)"
                      >
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-500" />
                          Standard
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, { billingType: 'dimension' })}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          isDim
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                        title="Dimension Based Billing (Length × Width × Qty × Rate)"
                      >
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          Dimension Based
                        </span>
                      </button>
                    </div>

                    {isDim && (
                      <span className="hidden sm:inline-block text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {item.dimensionUnit || 'ft'} → {item.billingUnit || 'sq.ft'}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 2. Product Selector & Inventory Details */}
                <div className="space-y-1.5 mb-3.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Product / Item
                  </label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleUpdateItem(idx, { productId: e.target.value })}
                    className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border bg-white focus:outline-hidden focus:ring-2 ${
                      isOverStock
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-blue-500 text-slate-800'
                    }`}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Stock: {p.stock} {p.unit} • ₹{p.sellingPrice.toLocaleString('en-IN')}{p.billingType === 'dimension' ? `/${p.billingUnit || 'sq.ft'}` : ''} [{p.billingType === 'dimension' ? 'Dimension' : 'Standard'}]
                      </option>
                    ))}
                  </select>

                  {prod && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                      <span>HSN: <strong className="font-mono text-slate-700">{prod.hsnCode || '—'}</strong></span>
                      <span>•</span>
                      <span
                        className={
                          isOverStock
                            ? 'text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200'
                            : 'text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200'
                        }
                      >
                        Available: {prod.stock} {prod.unit}
                      </span>
                      {prod.brand && (
                        <>
                          <span>•</span>
                          <span>{prod.brand}</span>
                        </>
                      )}
                    </div>
                  )}

                  {isOverStock && prod && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-300 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                      <span>
                        Insufficient Stock: Only {prod.stock} {prod.unit} available in warehouse.
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. DIMENSION-BASED PRODUCT CONTROLS */}
                {isDim ? (
                  <div className="space-y-3 p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl">
                    {/* Row A: Length, Width, Qty (Physical), Rate */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Length */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Length ({item.dimensionUnit || 'ft'}) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            aria-label="Length"
                            value={item.length ?? ''}
                            onChange={(e) =>
                              handleUpdateItem(idx, { length: parseFloat(e.target.value) || 0 })
                            }
                            className={`w-full pr-7 pl-2.5 py-2 text-xs font-bold rounded-xl border bg-white focus:outline-hidden focus:ring-2 ${
                              !item.length || item.length <= 0
                                ? 'border-rose-400 ring-1 ring-rose-300'
                                : 'border-slate-300 focus:ring-blue-500 text-slate-900'
                            }`}
                            placeholder="Length"
                          />
                          <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none uppercase">
                            {item.dimensionUnit || 'ft'}
                          </span>
                        </div>
                      </div>

                      {/* Width */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Width ({item.dimensionUnit || 'ft'}) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            aria-label="Width"
                            value={item.width ?? ''}
                            onChange={(e) =>
                              handleUpdateItem(idx, { width: parseFloat(e.target.value) || 0 })
                            }
                            className={`w-full pr-7 pl-2.5 py-2 text-xs font-bold rounded-xl border bg-white focus:outline-hidden focus:ring-2 ${
                              !item.width || item.width <= 0
                                ? 'border-rose-400 ring-1 ring-rose-300'
                                : 'border-slate-300 focus:ring-blue-500 text-slate-900'
                            }`}
                            placeholder="Width"
                          />
                          <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none uppercase">
                            {item.dimensionUnit || 'ft'}
                          </span>
                        </div>
                      </div>

                      {/* Physical Quantity */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Qty ({prod?.unit || 'No.'}) <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItem(idx, { quantity: Math.max(1, item.quantity - 1) })
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer shrink-0 text-sm"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            aria-label="Quantity"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })
                            }
                            className={`w-full h-8 text-center font-bold text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 ${
                              isOverStock
                                ? 'border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-500'
                                : 'border-slate-300 text-slate-900 focus:ring-blue-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(idx, { quantity: item.quantity + 1 })}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer shrink-0 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Rate */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Rate (₹ / {item.billingUnit || 'sq.ft'}) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            aria-label="Rate"
                            value={item.rate}
                            onChange={(e) =>
                              handleUpdateItem(idx, { rate: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full pl-6 pr-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 text-right focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row B: Billable Quantity Calculation Banner */}
                    <div className="p-2.5 bg-blue-100/70 border border-blue-300/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-950">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold uppercase tracking-wide text-blue-900 text-[11px]">
                          Billable Qty:
                        </span>
                        <span className="font-mono font-black text-xs text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-300">
                          {item.billableQuantity || 0} {item.billingUnit || 'sq.ft'}
                        </span>
                        <span className="text-[11px] font-mono text-blue-800">
                          ({item.length || 0} {item.dimensionUnit} × {item.width || 0} {item.dimensionUnit} × {item.quantity} {prod?.unit || 'No.'})
                        </span>
                      </div>
                      <div className="text-[11px] font-mono font-bold text-blue-900">
                        Line Base: {item.billableQuantity || 0} {item.billingUnit} × ₹{item.rate} = ₹{Math.round(((item.billableQuantity || 0) * (item.rate || 0)) * 100) / 100}
                      </div>
                    </div>

                    {hasDimError && (
                      <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        Length and Width must both be greater than 0.
                      </p>
                    )}

                    {/* Row C: Disc %, GST %, Tax, Total */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-blue-200/60">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Disc %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          aria-label="Discount Percent"
                          value={item.discountPercent}
                          onChange={(e) =>
                            handleUpdateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2.5 py-1.5 text-xs text-center font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">GST %</label>
                        <select
                          value={item.taxRate}
                          aria-label="GST Rate"
                          onChange={(e) =>
                            handleUpdateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax</span>
                        <span className="text-xs font-bold text-slate-700">
                          {formatCurrency(item.taxAmount)}
                        </span>
                      </div>

                      <div className="flex flex-col justify-center text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                        <span className="text-sm font-black text-slate-900">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 4. STANDARD PRODUCT CONTROLS (Qty, Rate, Disc, GST, Tax, Total) */
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 items-center">
                    {/* Qty */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Qty ({prod?.unit || 'Pcs'})
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateItem(idx, { quantity: Math.max(1, item.quantity - 1) })
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer shrink-0 text-sm"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          aria-label="Quantity"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })
                          }
                          className={`w-full h-8 text-center font-bold text-xs rounded-lg border bg-white focus:outline-hidden focus:ring-2 ${
                            isOverStock
                              ? 'border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-500'
                              : 'border-slate-300 text-slate-900 focus:ring-blue-500'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(idx, { quantity: item.quantity + 1 })}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer shrink-0 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Rate (₹ / {prod?.unit || 'Pcs'})
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          aria-label="Rate"
                          value={item.rate}
                          onChange={(e) =>
                            handleUpdateItem(idx, { rate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full pl-6 pr-2 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900 text-right focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Disc % */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Disc %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        aria-label="Discount Percent"
                        value={item.discountPercent}
                        onChange={(e) =>
                          handleUpdateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* GST % */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">GST %</label>
                      <select
                        value={item.taxRate}
                        aria-label="GST Rate"
                        onChange={(e) =>
                          handleUpdateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>

                    {/* Tax */}
                    <div className="flex flex-col justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax</span>
                      <span className="text-xs font-bold text-slate-700">
                        {formatCurrency(item.taxAmount)}
                      </span>
                    </div>

                    {/* Total */}
                    <div className="flex flex-col justify-center text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
