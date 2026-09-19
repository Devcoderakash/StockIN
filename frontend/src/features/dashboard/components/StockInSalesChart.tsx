import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAppState } from '@/context/AppStateContext';
import { formatCurrency } from '@/utils/formatters';
import { ArrowLeftRight, ArrowDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StockInSalesChart: React.FC = () => {
  const { invoices, stockMovements, products } = useAppState();
  const navigate = useNavigate();

  const comparisonData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthsMap: Record<string, { month: string; sales: number; stockIn: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap[ym] = { month: monthNames[d.getMonth()], sales: 0, stockIn: 0 };
    }

    invoices.forEach((inv) => {
      const ym = inv.date.slice(0, 7);
      if (monthsMap[ym]) {
        monthsMap[ym].sales += inv.grandTotal;
      }
    });

    stockMovements.forEach((mov) => {
      if (mov.type === 'stock_in') {
        const ym = mov.date.slice(0, 7);
        if (monthsMap[ym]) {
          const prod = products.find((p) => p.id === mov.productId);
          const rate = mov.purchaseRate || (prod ? prod.purchasePrice : 0);
          monthsMap[ym].stockIn += mov.quantity * rate;
        }
      }
    });

    return Object.values(monthsMap);
  }, [invoices, stockMovements, products]);

  const totalSales = comparisonData.reduce((s, c) => s + c.sales, 0);
  const totalStockIn = comparisonData.reduce((s, c) => s + c.stockIn, 0);
  const hasData = totalSales > 0 || totalStockIn > 0;
  const isProfitable = totalSales >= totalStockIn;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      <div className="pb-4 mb-2 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Sales vs Stock In</h3>
          <p className="text-xs text-slate-500 mt-0.5">Monthly inventory intake compared to gross sales revenue</p>
        </div>
        {hasData && (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
              isProfitable
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80'
                : 'text-amber-700 bg-amber-50 border-amber-200/80'
            }`}
          >
            {isProfitable ? 'Profitable' : 'High Intake'}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Inflow / Sales History</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Receive items through Stock In and sell items via Invoices to see comparative monthly inventory throughput.
          </p>
          <button
            onClick={() => navigate('/stock-in')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Stock In Intake
          </button>
        </div>
      ) : (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const salesVal = (payload[0]?.value as number) || 0;
                    const stockInVal = (payload[1]?.value as number) || 0;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs space-y-1">
                        <p className="font-semibold text-slate-300 mb-1">{label} History</p>
                        <p className="text-blue-400 font-medium">
                          Sales: {formatCurrency(salesVal)}
                        </p>
                        <p className="text-slate-300 font-medium">
                          Stock In: {formatCurrency(stockInVal)}
                        </p>
                        <p className="text-emerald-400 font-semibold pt-1 border-t border-slate-700">
                          Gross Margin: {formatCurrency(salesVal - stockInVal)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
              />
              <Bar dataKey="sales" name="Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stockIn" name="Stock In" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
