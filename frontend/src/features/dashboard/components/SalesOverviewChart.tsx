import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppState } from '@/context/AppStateContext';
import { formatCurrency } from '@/utils/formatters';
import { TrendingUp, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SalesOverviewChartProps {
  timeframe: string;
}

export const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({ timeframe }) => {
  const { invoices } = useAppState();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<'sales' | 'orders'>('sales');

  const chartData = useMemo(() => {
    const now = new Date();

    if (timeframe === 'Today') {
      const todayStr = now.toISOString().split('T')[0];
      const hours = ['09:00', '12:00', '15:00', '18:00', '21:00'];
      const buckets = hours.map((h) => ({ date: h, sales: 0, orders: 0 }));

      const todayInvoices = invoices.filter((i) => i.date === todayStr);
      todayInvoices.forEach((inv, idx) => {
        const bucketIndex = idx % buckets.length;
        buckets[bucketIndex].sales += inv.grandTotal;
        buckets[bucketIndex].orders += 1;
      });
      return buckets;
    }

    if (timeframe === '7 Days') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

        const dayInvs = invoices.filter((inv) => inv.date === dateStr);
        const daySales = dayInvs.reduce((sum, inv) => sum + inv.grandTotal, 0);
        days.push({ date: label, sales: daySales, orders: dayInvs.length });
      }
      return days;
    }

    if (timeframe === '30 Days') {
      const weeks = [
        { date: 'Week 1', sales: 0, orders: 0, minDays: 22, maxDays: 30 },
        { date: 'Week 2', sales: 0, orders: 0, minDays: 15, maxDays: 21 },
        { date: 'Week 3', sales: 0, orders: 0, minDays: 8, maxDays: 14 },
        { date: 'Week 4', sales: 0, orders: 0, minDays: 0, maxDays: 7 },
      ];

      invoices.forEach((inv) => {
        const invDate = new Date(inv.date);
        const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 3600 * 24));
        const week = weeks.find((w) => diffDays >= w.minDays && diffDays <= w.maxDays);
        if (week) {
          week.sales += inv.grandTotal;
          week.orders += 1;
        }
      });
      return weeks.map(({ date, sales, orders }) => ({ date, sales, orders }));
    }

    // Custom / Default: Last 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = monthNames[d.getMonth()];

      const monthInvs = invoices.filter((inv) => inv.date.startsWith(ym));
      const mSales = monthInvs.reduce((sum, inv) => sum + inv.grandTotal, 0);
      months.push({ date: label, sales: mSales, orders: monthInvs.length });
    }
    return months;
  }, [invoices, timeframe]);

  const hasSales = invoices.some((i) => i.grandTotal > 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 sm:pb-4 mb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Sales Overview</h3>
          <p className="text-xs text-slate-500 mt-0.5">Revenue trend across {timeframe.toLowerCase()}</p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setMetric('sales')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              metric === 'sales'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Revenue (₹)
          </button>
          <button
            onClick={() => setMetric('orders')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              metric === 'orders'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoices
          </button>
        </div>
      </div>

      {!hasSales ? (
        <div className="h-56 sm:h-64 flex flex-col items-center justify-center text-center p-4 sm:p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-2">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Sales Activity Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
            Once you generate invoices in the Billing module, revenue and order volume will graph here automatically in real time.
          </p>
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create First Invoice
          </button>
        </div>
      ) : (
        <div className="h-56 sm:h-64 w-full min-w-0 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(val) =>
                  metric === 'sales'
                    ? val >= 100000
                      ? `₹${(val / 100000).toFixed(1)}L`
                      : val >= 1000
                      ? `₹${(val / 1000).toFixed(0)}k`
                      : `₹${val}`
                    : String(val)
                }
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs">
                        <p className="font-semibold mb-1 text-slate-300">{label}</p>
                        <p className="font-bold text-blue-400">
                          {metric === 'sales'
                            ? formatCurrency(payload[0].value as number)
                            : `${payload[0].value} Invoices`}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
