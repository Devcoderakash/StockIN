import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Product } from '@/types';
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

        {/* Pricing */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purchase Price (₹) <span className="text-rose-500">*</span>
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
              Selling Price (₹) <span className="text-rose-500">*</span>
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
