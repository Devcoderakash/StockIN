import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppState } from '@/context/AppStateContext';
import { formatCurrency } from '@/utils/formatters';
import { Package, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#cbd5e1', '#64748b'];

export const InventoryDonutChart: React.FC = () => {
  const { products } = useAppState();
  const navigate = useNavigate();

  // Aggregate inventory value by category
  const activeProducts = products.filter((p) => p.status !== 'archived');
  const categoryMap = activeProducts.reduce((acc, p) => {
    const value = p.stock * p.purchasePrice;
    acc[p.category] = (acc[p.category] || 0) + value;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  }));

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div className="pb-4 mb-2 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Inventory Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">Asset valuation by category</p>
        </div>
        <span className="text-xs font-bold text-slate-900">{formatCurrency(totalValue)}</span>
      </div>

      {activeProducts.length === 0 ? (
        <div className="h-52 flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-2">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">No Catalog Products</p>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3 max-w-[200px]">
            Add products to see asset valuation by category.
          </p>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>
      ) : (
        <>
          <div className="h-52 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      const percent = totalValue > 0 ? (((item.value as number) / totalValue) * 100).toFixed(1) : 0;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs">
                          <p className="font-semibold text-slate-300">{item.name}</p>
                          <p className="font-bold text-blue-400 mt-0.5">
                            {formatCurrency(item.value as number)} ({percent}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={data}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-semibold text-slate-400 uppercase">Valuation</span>
              <span className="text-sm font-bold text-slate-800">
                {totalValue >= 100000 ? `₹${(totalValue / 100000).toFixed(2)}L` : formatCurrency(totalValue)}
              </span>
            </div>
          </div>

          {/* Legend list */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
            {data.slice(0, 4).map((item, idx) => {
              const percent = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center gap-1.5 text-xs truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span className="text-slate-600 truncate">{item.name}</span>
                  <span className="ml-auto font-semibold text-slate-800 text-[11px]">{percent}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
