import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AlertTriangle, ArrowRight, PlusCircle } from 'lucide-react';

export const LowStockTable: React.FC = () => {
  const { products } = useAppState();
  const navigate = useNavigate();

  const lowStockItems = products
    .filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock')
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Low Stock Alert</h3>
            <p className="text-xs text-slate-500 mt-0.5">Items needing replenishment</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/stock')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          Manage Stock <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mobile Card List */}
      <div className="block sm:hidden space-y-2">
        {lowStockItems.length === 0 ? (
          <p className="py-6 text-center text-slate-400 text-xs">
            All inventory items are currently above threshold levels!
          </p>
        ) : (
          lowStockItems.map((prod) => (
            <div
              key={prod.id}
              className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 truncate">{prod.name}</p>
                  <p className="text-[11px] font-mono text-slate-400">{prod.sku}</p>
                </div>
                <StatusBadge status={prod.status} />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-500 text-[11px]">Stock: </span>
                  <span className="font-bold text-rose-600">{prod.stock}</span>
                  <span className="text-slate-400 text-[11px]"> / min {prod.minStock}</span>
                </div>

                <button
                  onClick={() => navigate('/stock')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Adjust
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto -mx-5 px-5">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 font-semibold">
              <th className="pb-2.5">Product</th>
              <th className="pb-2.5">SKU</th>
              <th className="pb-2.5 text-center">Current</th>
              <th className="pb-2.5 text-center">Min</th>
              <th className="pb-2.5 text-center">Status</th>
              <th className="pb-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                  All inventory items are currently above threshold levels!
                </td>
              </tr>
            ) : (
              lowStockItems.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-semibold text-slate-900 max-w-[150px] truncate">
                    {prod.name}
                  </td>
                  <td className="py-3 text-slate-500 font-mono text-[11px]">{prod.sku}</td>
                  <td className="py-3 text-center font-bold text-rose-600">{prod.stock}</td>
                  <td className="py-3 text-center text-slate-500">{prod.minStock}</td>
                  <td className="py-3 text-center">
                    <StatusBadge status={prod.status} />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => navigate('/stock')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3 h-3" />
                      Adjust
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
