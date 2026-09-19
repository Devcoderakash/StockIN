import React from 'react';
import { InvoiceItem } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface InvoiceLineItemsProps {
  items: InvoiceItem[];
  onChange: (items: InvoiceItem[]) => void;
}

export const InvoiceLineItems: React.FC<InvoiceLineItemsProps> = ({ items, onChange }) => {
  const { products } = useAppState();

  const handleAddItem = () => {
    // Pick the first product with stock > 0 if available, else first product
    const defaultProd = products.find((p) => p.stock > 0) || products[0];
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      productId: defaultProd?.id || '',
      productName: defaultProd?.name || 'Custom Item',
      sku: defaultProd?.sku || 'SKU-001',
      hsnCode: defaultProd?.hsnCode || '94033010',
      quantity: 1,
      rate: defaultProd?.sellingPrice || 1000,
      discountPercent: 0,
      taxRate: defaultProd?.taxRate || 18,
      taxAmount: ((defaultProd?.sellingPrice || 1000) * (defaultProd?.taxRate || 18)) / 100,
      amount:
        (defaultProd?.sellingPrice || 1000) +
        ((defaultProd?.sellingPrice || 1000) * (defaultProd?.taxRate || 18)) / 100,
    };
    onChange([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const newItems = [...items];
    const current = { ...newItems[index], ...updates };

    // If product changed, update name, sku, hsn, rate, taxRate
    if (updates.productId) {
      const prod = products.find((p) => p.id === updates.productId);
      if (prod) {
        current.productName = prod.name;
        current.sku = prod.sku;
        current.hsnCode = prod.hsnCode;
        current.rate = prod.sellingPrice;
        current.taxRate = prod.taxRate;
      }
    }

    // Recalculate line totals
    const qty = Math.max(1, current.quantity || 1);
    const rate = Math.max(0, current.rate || 0);
    const discount = Math.min(100, Math.max(0, current.discountPercent || 0));
    const taxPercent = current.taxRate || 0;

    const baseTotal = qty * rate;
    const discountedBase = baseTotal - (baseTotal * discount) / 100;
    const taxAmount = (discountedBase * taxPercent) / 100;
    const lineTotal = discountedBase + taxAmount;

    current.quantity = qty;
    current.rate = rate;
    current.discountPercent = discount;
    current.taxAmount = taxAmount;
    current.amount = lineTotal;

    newItems[index] = current;
    onChange(newItems);
  };

  const handleRemoveItem = (index: number) => {
    onChange(items.filter((_, idx) => idx !== index));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Invoice Items</h3>
          <p className="text-xs text-slate-500 mt-0.5">Select products, verify warehouse availability, and adjust rates</p>
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

      {/* Mobile Items Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No items added yet. Tap &ldquo;+ Add Item&rdquo; above to start adding products.
          </div>
        ) : (
          items.map((item, idx) => {
            const prod = products.find((p) => p.id === item.productId);
            const isOverStock = prod ? item.quantity > prod.stock : false;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border space-y-3 transition-colors ${
                  isOverStock ? 'bg-rose-50/40 border-rose-300' : 'bg-white border-slate-200/80 shadow-xs'
                }`}
              >
                {/* Card Header: Item Number and Remove Button */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Item #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>

                {/* Product Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleUpdateItem(idx, { productId: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 min-h-[44px] ${
                      isOverStock
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500'
                        : 'border-slate-300 bg-white focus:ring-blue-500'
                    }`}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Avail: {p.stock} {p.unit}
                      </option>
                    ))}
                  </select>

                  {prod && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>HSN: {prod.hsnCode}</span>
                        <span>•</span>
                        <span
                          className={
                            isOverStock
                              ? 'text-rose-600 font-bold'
                              : 'text-emerald-600 font-semibold'
                          }
                        >
                          Available: {prod.stock} {prod.unit}
                        </span>
                      </div>

                      {isOverStock && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2.5 py-1.5 rounded-lg border border-rose-300">
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                          <span>
                            Only {prod.stock} available. Quantity exceeds stock!
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stepper Quantity & Rate */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-700 active:bg-slate-200 cursor-pointer shrink-0 text-base"
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
                        className={`w-full h-10 text-center font-bold text-sm rounded-xl border focus:outline-hidden focus:ring-2 ${
                          isOverStock
                            ? 'border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-500'
                            : 'border-slate-300 bg-white text-slate-900 focus:ring-blue-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(idx, { quantity: item.quantity + 1 })}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-700 active:bg-slate-200 cursor-pointer shrink-0 text-base"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={(e) =>
                        handleUpdateItem(idx, { rate: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full h-10 px-3 text-right font-bold text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                        handleUpdateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full h-9 px-3 text-center text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">GST Rate</label>
                    <select
                      value={item.taxRate}
                      onChange={(e) =>
                        handleUpdateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full h-9 px-2 text-center text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-slate-500">
                    Tax: <span className="font-semibold text-slate-700">{formatCurrency(item.taxAmount)}</span>
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
              <th className="pb-3 w-10">#</th>
              <th className="pb-3 min-w-[260px]">Product / SKU</th>
              <th className="pb-3 w-24 text-center">Qty</th>
              <th className="pb-3 w-28 text-right">Rate (₹)</th>
              <th className="pb-3 w-20 text-center">Disc %</th>
              <th className="pb-3 w-24 text-center">GST %</th>
              <th className="pb-3 w-28 text-right">Tax (₹)</th>
              <th className="pb-3 w-28 text-right">Total (₹)</th>
              <th className="pb-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                  No items added yet. Click &ldquo;Add Item&rdquo; above to start adding products.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                const isOverStock = prod ? item.quantity > prod.stock : false;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isOverStock ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3 text-slate-400 font-medium">{idx + 1}</td>

                    {/* Product Selector */}
                    <td className="py-3 pr-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleUpdateItem(idx, { productId: e.target.value })}
                        className={`w-full px-2.5 py-1.5 rounded-lg border font-medium text-slate-800 focus:outline-hidden focus:ring-1 ${
                          isOverStock
                            ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-500'
                            : 'border-slate-300 bg-white focus:ring-blue-500'
                        }`}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — Avail: {p.stock} {p.unit} (₹{p.sellingPrice.toLocaleString('en-IN')})
                          </option>
                        ))}
                      </select>

                      {prod && (
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>HSN: {prod.hsnCode}</span>
                            <span>•</span>
                            <span
                              className={
                                isOverStock
                                  ? 'text-rose-600 font-bold'
                                  : 'text-emerald-600 font-semibold'
                              }
                            >
                              Available: {prod.stock} {prod.unit}
                            </span>
                          </div>

                          {/* Insufficient Stock Inline Warning */}
                          {isOverStock && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-1 rounded-md border border-rose-300 animate-pulse">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                              <span>
                                Insufficient Stock: Only {prod.stock} units available. You are trying to sell {item.quantity} units.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-1 text-center align-top pt-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })
                        }
                        className={`w-20 px-2 py-1.5 text-center font-bold rounded-lg border focus:outline-hidden focus:ring-1 ${
                          isOverStock
                            ? 'border-rose-500 bg-rose-50 text-rose-700 focus:ring-rose-500'
                            : 'border-slate-300 bg-white text-slate-900 focus:ring-blue-500'
                        }`}
                      />
                    </td>

                    {/* Unit Rate */}
                    <td className="py-3 px-1 text-right align-top pt-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={(e) =>
                          handleUpdateItem(idx, { rate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-24 px-2 py-1.5 text-right font-semibold rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Discount % */}
                    <td className="py-3 px-1 text-center align-top pt-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent}
                        onChange={(e) =>
                          handleUpdateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })
                        }
                        className="w-16 px-2 py-1.5 text-center rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </td>

                    {/* Tax Rate % */}
                    <td className="py-3 px-1 text-center align-top pt-3">
                      <select
                        value={item.taxRate}
                        onChange={(e) =>
                          handleUpdateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1.5 text-center rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </td>

                    {/* Tax Amount */}
                    <td className="py-3 px-1 text-right font-medium text-slate-500 align-top pt-4">
                      {formatCurrency(item.taxAmount)}
                    </td>

                    {/* Line Total */}
                    <td className="py-3 px-1 text-right font-bold text-slate-900 align-top pt-4">
                      {formatCurrency(item.amount)}
                    </td>

                    {/* Remove Action */}
                    <td className="py-3 text-center align-top pt-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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
    </div>
  );
};
