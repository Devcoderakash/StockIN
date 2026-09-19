import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/common/StatCard';
import { SalesOverviewChart } from '@/components/dashboard/SalesOverviewChart';
import { StockInSalesChart } from '@/components/dashboard/StockInSalesChart';
import { InventoryDonutChart } from '@/components/dashboard/InventoryDonutChart';
import { RecentTransactionsTable } from '@/components/dashboard/RecentTransactionsTable';
import { LowStockTable } from '@/components/dashboard/LowStockTable';
import { formatCurrency, formatIndianNumber } from '@/utils/formatters';
import {
  Boxes,
  Package,
  TrendingUp,
  Clock,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

type Timeframe = 'Today' | '7 Days' | '30 Days' | 'Custom';

function getDateThreshold(timeframe: Timeframe): string {
  const now = new Date();
  if (timeframe === 'Today') {
    return now.toISOString().split('T')[0];
  } else if (timeframe === '7 Days') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  } else if (timeframe === '30 Days') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }
  // Custom: all time
  return '2000-01-01';
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardPage: React.FC = () => {
  const { products, invoices, customers } = useAppState();
  const { userDisplayName } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('7 Days');

  // Date threshold for filtering
  const dateThreshold = useMemo(() => getDateThreshold(timeframe), [timeframe]);

  // Filter invoices by selected timeframe
  const filteredInvoices = useMemo(
    () => invoices.filter((i) => i.date >= dateThreshold),
    [invoices, dateThreshold]
  );

  // Dynamic calculations based on state
  const totalStockValue = products.reduce((acc, p) => acc + p.stock * p.purchasePrice, 0);
  const totalProductsCount = products.length;
  const lowStockCount = products.filter((p) => p.status === 'low_stock').length;
  const outOfStockCount = products.filter((p) => p.status === 'out_of_stock').length;

  // Receivables from customers (always real total)
  const totalOutstanding = customers.reduce((acc, c) => acc + c.outstanding, 0);

  // Sales within selected timeframe
  const periodSales = filteredInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
  const periodInvoiceCount = filteredInvoices.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Greeting and Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              {getTimeGreeting()}, {userDisplayName}
            </h1>
            <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Here&apos;s what&apos;s happening with your business{timeframe === 'Today' ? ' today' : ` in the last ${timeframe}`}.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-stretch sm:self-auto overflow-x-auto no-scrollbar">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
          {(['Today', '7 Days', '30 Days', 'Custom'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                timeframe === period
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* 6 KPI Cards Grid (2 cols on mobile, 3 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {/* 1. Sales */}
        <StatCard
          title={timeframe === 'Today' ? "Today's Sales" : `Sales (${timeframe})`}
          value={formatCurrency(periodSales)}
          change={{ value: `${periodInvoiceCount} invoice${periodInvoiceCount !== 1 ? 's' : ''} billed`, isPositive: true }}
          icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50"
          badgeText="Revenue"
        />

        {/* 2. Total Stock Value */}
        <StatCard
          title="Total Stock Value"
          value={formatCurrency(totalStockValue)}
          change={{ value: 'At purchase cost', isPositive: true }}
          icon={<Boxes className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          iconBgColor="bg-blue-50"
          badgeText="Inventory"
        />

        {/* 3. Total Products */}
        <StatCard
          title="Total Products"
          value={formatIndianNumber(totalProductsCount)}
          change={{ value: `${totalProductsCount} active SKUs`, isPositive: true }}
          icon={<Package className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
          iconBgColor="bg-indigo-50"
          badgeText="Catalog"
        />

        {/* 4. Low Stock */}
        <StatCard
          title="Low Stock Items"
          value={formatIndianNumber(lowStockCount)}
          change={{ value: lowStockCount > 0 ? 'Needs reorder' : 'Stock healthy', isPositive: lowStockCount === 0 }}
          icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
          iconBgColor="bg-amber-50"
          badgeText={lowStockCount > 0 ? 'Action' : 'OK'}
        />

        {/* 5. Outstanding (Receivables) */}
        <StatCard
          title="Outstanding Receivables"
          value={formatCurrency(totalOutstanding)}
          change={{ value: totalOutstanding > 0 ? 'Pending' : 'All clear', isPositive: totalOutstanding === 0 }}
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
          iconBgColor="bg-rose-50"
          badgeText={totalOutstanding > 0 ? 'Due' : 'Clear'}
        />

        {/* 6. Out of Stock */}
        <StatCard
          title="Out of Stock"
          value={formatIndianNumber(outOfStockCount)}
          change={{ value: outOfStockCount > 0 ? 'Unavailable' : 'Available', isPositive: outOfStockCount === 0 }}
          icon={<Boxes className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
          iconBgColor="bg-rose-50"
          badgeText={outOfStockCount > 0 ? 'Restock' : 'Good'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {/* A. Sales Overview Area Chart (2 Cols) */}
        <div className="lg:col-span-2 min-w-0">
          <SalesOverviewChart timeframe={timeframe} />
        </div>

        {/* C. Inventory Distribution Donut (1 Col) */}
        <div className="lg:col-span-1 min-w-0">
          <InventoryDonutChart />
        </div>
      </div>

      {/* Stock In vs Sales Bar Chart */}
      <div className="min-w-0">
        <StockInSalesChart />
      </div>

      {/* Quick Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        {/* D. Recent Invoices / Transactions */}
        <div className="min-w-0">
          <RecentTransactionsTable />
        </div>

        {/* E. Low Stock Products */}
        <div className="min-w-0">
          <LowStockTable />
        </div>
      </div>
    </div>
  );
};
