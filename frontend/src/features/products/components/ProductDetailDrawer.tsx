import React from 'react';
import { Drawer } from '@/components/common/Drawer';
import { Product } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  Edit2,
  Copy,
  Trash2,
  Boxes,
  TrendingUp,
  Tag,
  Calendar,
  Building,
  History,
} from 'lucide-react';

interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit: (product: Product) => void;
  onAdjustStock: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onAdjustStock,
  onDelete,
}) => {
  const { duplicateProduct, stockMovements } = useAppState();

  if (!product) return null;

  const marginPerUnit = product.sellingPrice - product.purchasePrice;
  const marginPercent =
    product.sellingPrice > 0 ? ((marginPerUnit / product.sellingPrice) * 100).toFixed(1) : '0';

  const productMovements = stockMovements
    .filter((m) => m.productId === product.id)
    .slice(0, 8);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      subtitle={`SKU: ${product.sku} • ${product.category}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => {
              onDelete(product.id);
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
                duplicateProduct(product.id);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </button>
            <button
              onClick={() => {
                onEdit(product);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Product
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status and Stock Health */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 font-medium">Inventory Availability</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {product.stock} {product.unit}
                </span>
                <StatusBadge status={product.status} />
              </div>
            </div>
            <button
              onClick={() => {
                onAdjustStock(product);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5" />
              Adjust Stock
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Threshold: {product.minStock} {product.unit}</span>
              <span>
                {product.stock <= product.minStock
                  ? 'At or below minimum threshold'
                  : 'Sufficient inventory buffer'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  product.stock === 0
                    ? 'w-0'
                    : product.stock <= product.minStock
                    ? 'w-1/4 bg-amber-500'
                    : 'w-3/4 bg-emerald-500'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Pricing & Margins */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Pricing & Commercial Margins
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500">Purchase Price</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {formatCurrency(product.purchasePrice)}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500">Selling Price</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {formatCurrency(product.sellingPrice)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
              <p className="text-[11px] text-emerald-800 font-medium">Profit Margin</p>
              <div className="flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">
                  {marginPercent}% ({formatCurrency(marginPerUnit)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Specs Table */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Specifications & Tax Info
          </h4>
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
            <div className="flex justify-between p-3">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Category
              </span>
              <span className="font-semibold text-slate-900">{product.category}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" /> Brand
              </span>
              <span className="font-semibold text-slate-900">{product.brand}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Billing Method</span>
              <span className="font-semibold text-blue-700">
                {product.billingType === 'dimension'
                  ? `Dimension Based (${product.dimensionUnit} → ${product.billingUnit})`
                  : `Standard Quantity (${product.unit})`}
              </span>
            </div>
            {product.billingType === 'dimension' && (
              <div className="flex justify-between p-3 bg-blue-50/40">
                <span className="text-slate-600">Dimension Structure</span>
                <span className="font-mono font-bold text-slate-800">
                  {product.dimensionType === 'length_width_height' ? 'Length × Width × Height' : 'Length × Width'}
                </span>
              </div>
            )}
            <div className="flex justify-between p-3">
              <span className="text-slate-500">HSN / SAC Code</span>
              <span className="font-mono text-slate-800">{product.hsnCode}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">GST Rate</span>
              <span className="font-semibold text-slate-900">{product.taxRate}%</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Last Updated
              </span>
              <span className="text-slate-700">{formatDate(product.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Description
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              {product.description}
            </p>
          </div>
        )}

        {/* Recent Stock Movements for this product */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5" /> Recent Stock Movements
          </h4>
          {productMovements.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
              No recent movements logged for this SKU yet.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs overflow-hidden">
              {productMovements.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between hover:bg-slate-50/80">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={m.type} />
                      <span className="font-semibold text-slate-800">{m.reference}</span>
                    </div>
                    {m.reason && <p className="text-[11px] text-slate-500 mt-0.5">{m.reason}</p>}
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold ${
                        m.quantity > 0 ? 'text-emerald-600' : 'text-slate-800'
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {product.unit}
                    </span>
                    <p className="text-[10px] text-slate-400">{m.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
