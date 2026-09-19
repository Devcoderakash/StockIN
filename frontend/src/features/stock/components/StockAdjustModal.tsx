import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { useAppState } from '@/context/AppStateContext';
import { Product, MovementType } from '@/types';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProduct?: Product | null;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  defaultProduct,
}) => {
  const { products, adjustStock } = useAppState();

  const [productId, setProductId] = useState('');
  const [type, setType] = useState<MovementType>('stock_in');
  const [quantity, setQuantity] = useState('5');
  const [reason, setReason] = useState('Stock count discrepancy adjustment');
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultProduct) {
      setProductId(defaultProduct.id);
    } else if (products.length > 0 && !productId) {
      setProductId(products[0].id);
    }
  }, [defaultProduct, products, isOpen]);

  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }
    if (!productId) {
      setError('Please select a product');
      return;
    }

    if (type === 'stock_out' && selectedProduct && qty > selectedProduct.stock) {
      setError(`Cannot reduce by ${qty} units. Available stock is only ${selectedProduct.stock} ${selectedProduct.unit}.`);
      return;
    }

    adjustStock(productId, qty, type, reason);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Stock Inventory"
      description="Update warehouse quantities and log audit trail entry."
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            Confirm Adjustment
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Product <span className="text-rose-500">*</span>
          </label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — Current Stock: {p.stock} {p.unit}
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
            <span className="text-blue-900 font-medium">Current Stock Level:</span>
            <span className="font-bold text-blue-700">
              {selectedProduct.stock} {selectedProduct.unit} (Min: {selectedProduct.minStock})
            </span>
          </div>
        )}

        {/* Adjustment Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Adjustment Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Stock In (Add)', value: 'stock_in' },
              { label: 'Stock Out (Reduce)', value: 'stock_out' },
              { label: 'Inventory Correction', value: 'adjustment' },
              { label: 'Return / Exchange', value: 'return' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => setType(opt.value as MovementType)}
                className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-left ${
                  type === opt.value
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Adjustment Quantity <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setError('');
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          {selectedProduct && (
            <p className="text-[11px] text-slate-500 mt-1">
              Projected Stock:{' '}
              <strong
                className={
                  (type === 'stock_out'
                    ? selectedProduct.stock - (parseInt(quantity, 10) || 0)
                    : selectedProduct.stock + (parseInt(quantity, 10) || 0)) < 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }
              >
                {type === 'stock_out'
                  ? selectedProduct.stock - (parseInt(quantity, 10) || 0)
                  : selectedProduct.stock + (parseInt(quantity, 10) || 0)}{' '}
                {selectedProduct.unit}
              </strong>
            </p>
          )}
          {error && <p className="text-[11px] text-rose-600 mt-1">{error}</p>}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Notes</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Audit variance, showroom sample, scrap damage"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>
    </Modal>
  );
};
