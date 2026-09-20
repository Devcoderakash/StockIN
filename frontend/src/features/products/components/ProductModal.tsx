import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Product } from '@/types';
import type { BillingType, DimensionType, DimensionUnit, BillingAreaUnit } from '@/features/products/types';
import { useAppState } from '@/context/AppStateContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct, products } = useAppState();

  const [formData, setFormData] = useState({
    name: '',
    category: 'Office Furniture',
    brand: 'StockIN Standard',
    unit: 'Pcs',
    purchasePrice: '',
    sellingPrice: '',
    stock: '',
    minStock: '5',
    taxRate: '18',
    hsnCode: '94033010',
    description: '',
    billingType: 'standard' as BillingType,
    dimensionType: 'length_width' as DimensionType,
    dimensionUnit: 'ft' as DimensionUnit,
    billingUnit: 'sq.ft' as BillingAreaUnit,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        category: productToEdit.category,
        brand: productToEdit.brand,
        unit: productToEdit.unit,
        purchasePrice: String(productToEdit.purchasePrice),
        sellingPrice: String(productToEdit.sellingPrice),
        stock: String(productToEdit.stock),
        minStock: String(productToEdit.minStock),
        taxRate: String(productToEdit.taxRate),
        hsnCode: productToEdit.hsnCode,
        description: productToEdit.description || '',
        billingType: productToEdit.billingType || 'standard',
        dimensionType: productToEdit.dimensionType || 'length_width',
        dimensionUnit: productToEdit.dimensionUnit || 'ft',
        billingUnit: (productToEdit.billingUnit || 'sq.ft') as BillingAreaUnit,
      });
    } else {
      setFormData({
        name: '',
        category: 'Office Furniture',
        brand: 'StockIN Standard',
        unit: 'Pcs',
        purchasePrice: '',
        sellingPrice: '',
        stock: '10',
        minStock: '4',
        taxRate: '18',
        hsnCode: '94033010',
        description: '',
        billingType: 'standard',
        dimensionType: 'length_width',
        dimensionUnit: 'ft',
        billingUnit: 'sq.ft',
      });
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Product name is required';

    const pPrice = parseFloat(formData.purchasePrice);
    if (isNaN(pPrice) || pPrice < 0) {
      errs.purchasePrice = 'Valid purchase price is required';
    }

    const sPrice = parseFloat(formData.sellingPrice);
    if (isNaN(sPrice) || sPrice < 0) {
      errs.sellingPrice = 'Valid selling price is required';
    } else if (pPrice && sPrice < pPrice) {
      errs.sellingPrice = 'Selling price should normally be >= purchase price';
    }

    const stock = parseInt(formData.stock, 10);
    if (isNaN(stock) || stock < 0) {
      errs.stock = 'Stock quantity cannot be negative';
    }

    const minStock = parseInt(formData.minStock, 10);
    if (isNaN(minStock) || minStock < 0) {
      errs.minStock = 'Minimum stock threshold cannot be negative';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: formData.name.trim(),
      // Auto-generate unique SKU internally (not shown to user)
      sku: productToEdit?.sku || `PRD-${Date.now().toString().slice(-7)}`,
      category: formData.category,
      brand: formData.brand.trim() || 'VoltCraft',
      unit: formData.unit,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      sellingPrice: parseFloat(formData.sellingPrice) || 0,
      stock: parseInt(formData.stock, 10) || 0,
      minStock: parseInt(formData.minStock, 10) || 0,
      taxRate: parseFloat(formData.taxRate) || 18,
      hsnCode: formData.hsnCode.trim() || '94033010',
      description: formData.description.trim(),
      billingType: formData.billingType,
      dimensionType: formData.dimensionType,
      dimensionUnit: formData.dimensionUnit,
      billingUnit: formData.billingUnit,
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, payload);
    } else {
      addProduct(payload);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product' : 'Add New Product'}
      description="Enter product details, pricing, inventory thresholds and tax rates."
      maxWidth="2xl"
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
            {productToEdit ? 'Update Product' : 'Save Product'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Name — full width */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Product Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Ergonomic High-Back Mesh Chair"
            className={`w-full px-3 py-2 text-xs rounded-xl border bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-300'
            }`}
          />
          {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
        </div>

        {/* Category & Brand & Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Office Furniture">Office Furniture</option>
              <option value="Living & Lounge">Living & Lounge</option>
              <option value="Storage & Filing">Storage & Filing</option>
              <option value="Dining & Cafe">Dining & Cafe</option>
              <option value="Commercial Fixtures">Commercial Fixtures</option>
              <option value="Lighting">Lighting</option>
              <option value="Accessories">Accessories</option>
              <option value="Raw Materials">Raw Materials</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Brand / Maker</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="VoltCraft, Godrej, Durian"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="Pcs">Pcs (Pieces)</option>
              <option value="Set">Set</option>
              <option value="Box">Box</option>
              <option value="Kg">Kg</option>
              <option value="Mtr">Mtr</option>
            </select>
          </div>
        </div>

        {/* Billing Method (Mode 1 vs Mode 2) */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Billing Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, billingType: 'standard' })}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                  formData.billingType === 'standard'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Standard Quantity (Qty × Rate)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, billingType: 'dimension' })}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-center transition-all cursor-pointer ${
                  formData.billingType === 'dimension'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Dimension Based (L × W × Qty × Rate)
              </button>
            </div>
          </div>

          {formData.billingType === 'dimension' && (
            <div className="pt-2 border-t border-slate-200/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Dimension Formula
                  </label>
                  <select
                    value={formData.dimensionType}
                    onChange={(e) => setFormData({ ...formData, dimensionType: e.target.value as DimensionType })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="length_width">Length × Width (Area)</option>
                    <option value="length_width_height">Length × Width × Height (Volume)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Dimension Unit
                  </label>
                  <select
                    value={formData.dimensionUnit}
                    onChange={(e) => setFormData({ ...formData, dimensionUnit: e.target.value as DimensionUnit })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ft">Feet (ft)</option>
                    <option value="in">Inches (in)</option>
                    <option value="m">Meters (m)</option>
                    <option value="cm">Centimeters (cm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rate / Area Unit
                  </label>
                  <select
                    value={formData.billingUnit}
                    onChange={(e) => setFormData({ ...formData, billingUnit: e.target.value as BillingAreaUnit })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sq.ft">Square Feet (sq.ft)</option>
                    <option value="sq.in">Square Inches (sq.in)</option>
                    <option value="sq.m">Square Meters (sq.m)</option>
                    <option value="sq.cm">Square Centimeters (sq.cm)</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-blue-700 bg-blue-50/80 p-2.5 rounded-lg border border-blue-200">
                💡 <strong>Inventory Note:</strong> Physical warehouse inventory is counted in <strong>{formData.unit}</strong>.
                During invoice creation, the billable amount is computed as:
                <span className="font-mono block mt-0.5 font-semibold text-blue-900">
                  Length × Width × Quantity × Rate (₹ per {formData.billingUnit})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {formData.billingType === 'dimension'
                ? `Purchase Rate (₹ / ${formData.billingUnit})`
                : 'Purchase Price (₹)'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                placeholder="0"
                className={`w-full pl-7 pr-3 py-2 text-xs font-semibold rounded-xl border bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                  errors.purchasePrice ? 'border-rose-300' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.purchasePrice && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.purchasePrice}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {formData.billingType === 'dimension'
                ? `Selling Rate (₹ / ${formData.billingUnit})`
                : 'Selling Price (₹)'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                placeholder="0"
                className={`w-full pl-7 pr-3 py-2 text-xs font-semibold rounded-xl border bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                  errors.sellingPrice ? 'border-rose-300' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.sellingPrice && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.sellingPrice}</p>
            )}
          </div>
        </div>

        {/* Stock & Thresholds */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {productToEdit ? 'Current Stock' : 'Opening Stock'}
            </label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {errors.stock && <p className="text-[11px] text-rose-600 mt-1">{errors.stock}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Minimum Stock
            </label>
            <input
              type="number"
              value={formData.minStock}
              onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
              placeholder="5"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GST Tax Slab</label>
            <select
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">0% (Exempt)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST (Standard)</option>
              <option value="28">28% GST</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">HSN/SAC</label>
            <input
              type="text"
              value={formData.hsnCode}
              onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
              placeholder="94033010"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Material specs, warranty, finish, dimensions..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>
    </Modal>
  );
};
