import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Package,
  TrendingUp,
  Receipt,
  Users,
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

type ReportType =
  | 'sales'
  | 'inventory'
  | 'profit'
  | 'customer'
  | 'tax'
  | 'stock_movement'
  | 'quotations';

export const ReportsPage: React.FC = () => {
  const { products, invoices, customers, stockMovements, quotations, showToast } = useAppState();

  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [dateRange, setDateRange] = useState('This Quarter');

  // Date-filtered invoices
  const filteredInvoices = useMemo(() => {
    if (dateRange === 'All Time') return invoices;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateRange === 'Today') {
      return invoices.filter((i) => i.date === todayStr);
    }

    if (dateRange === 'This Week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      const weekStr = weekAgo.toISOString().split('T')[0];
      return invoices.filter((i) => i.date >= weekStr);
    }

    if (dateRange === 'This Month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      return invoices.filter((i) => i.date >= monthStart);
    }

    if (dateRange === 'This Quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
        .toISOString()
        .split('T')[0];
      return invoices.filter((i) => i.date >= quarterStart);
    }

    return invoices;
  }, [invoices, dateRange]);

  // Date-filtered stock movements
  const filteredStockMovements = useMemo(() => {
    if (dateRange === 'All Time') return stockMovements;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateRange === 'Today') {
      return stockMovements.filter((m) => m.date.startsWith(todayStr));
    }

    if (dateRange === 'This Week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      const weekStr = weekAgo.toISOString().split('T')[0];
      return stockMovements.filter((m) => m.date >= weekStr);
    }

    if (dateRange === 'This Month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      return stockMovements.filter((m) => m.date >= monthStart);
    }

    if (dateRange === 'This Quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
        .toISOString()
        .split('T')[0];
      return stockMovements.filter((m) => m.date >= quarterStart);
    }

    return stockMovements;
  }, [stockMovements, dateRange]);

  // Aggregations
  const totalSales = filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalInvoices = filteredInvoices.length;
  const totalItemsSold = filteredInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, item) => s + item.quantity, 0),
    0
  );

  // COGS Calculation (Cost of Goods Sold based on Product purchasePrice)
  const totalCOGS = filteredInvoices.reduce((sum, inv) => {
    return (
      sum +
      inv.items.reduce((itemSum, item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cost = prod ? prod.purchasePrice : item.rate * 0.7;
        return itemSum + item.quantity * cost;
      }, 0)
    );
  }, 0);

  const totalGrossProfit = totalSales - totalCOGS;
  const grossMarginPercent =
    totalSales > 0 ? ((totalGrossProfit / totalSales) * 100).toFixed(1) : '0';

  const totalInventoryValuation = products.reduce(
    (sum, p) => sum + p.stock * p.purchasePrice,
    0
  );
  const totalRetailValuation = products.reduce(
    (sum, p) => sum + p.stock * p.sellingPrice,
    0
  );

  const totalGstCollected = filteredInvoices.reduce((sum, i) => sum + i.taxTotal, 0);

  // Stock In vs Stock Out Aggregations
  const totalStockInUnits = filteredStockMovements
    .filter((m) => m.type === 'stock_in')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
  const totalStockOutUnits = filteredStockMovements
    .filter((m) => m.type === 'stock_out')
    .reduce((sum, m) => sum + Math.abs(m.quantity), 0);
  const totalAdjustments = filteredStockMovements
    .filter((m) => m.type === 'adjustment' || m.type === 'return')
    .reduce((sum, m) => sum + m.quantity, 0);

  // GST Breakdown by slab
  const gstBreakdown = useMemo(() => {
    const slabs: { [key: string]: { taxable: number; cgst: number; sgst: number; totalGst: number } } = {
      '0%': { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
      '5%': { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
      '12%': { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
      '18%': { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
      '28%': { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 },
    };

    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const slabKey = `${item.taxRate || 18}%`;
        if (!slabs[slabKey]) {
          slabs[slabKey] = { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 };
        }
        const itemTaxable = item.rate * item.quantity * (1 - (item.discountPercent || 0) / 100);
        slabs[slabKey].taxable += itemTaxable;
        slabs[slabKey].cgst += item.taxAmount / 2;
        slabs[slabKey].sgst += item.taxAmount / 2;
        slabs[slabKey].totalGst += item.taxAmount;
      });
    });

    return slabs;
  }, [filteredInvoices]);

  // Dynamic monthly performance series based on actual invoices
  const performanceData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const monthsMap: Record<string, { month: string; yearMonth: string; sales: number; cogs: number; profit: number }> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = monthNames[d.getMonth()];
      monthsMap[ym] = { month: name, yearMonth: ym, sales: 0, cogs: 0, profit: 0 };
    }

    invoices.forEach((inv) => {
      const ym = inv.date.slice(0, 7);
      if (monthsMap[ym]) {
        monthsMap[ym].sales += inv.grandTotal;
        const invCogs = inv.items.reduce((itemSum, item) => {
          const prod = products.find((p) => p.id === item.productId);
          const cost = prod ? prod.purchasePrice : item.rate * 0.7;
          return itemSum + item.quantity * cost;
        }, 0);
        monthsMap[ym].cogs += invCogs;
        monthsMap[ym].profit = monthsMap[ym].sales - monthsMap[ym].cogs;
      }
    });

    return Object.values(monthsMap);
  }, [invoices, products]);

  const handleExportCsv = () => {
    if (activeReport === 'sales') {
      const headers = ['Invoice #', 'Customer', 'Date', 'Subtotal', 'Tax (GST)', 'Grand Total', 'Status'];
      const rows = filteredInvoices.map((i) => [i.invoiceNumber, i.customerName, i.date, i.subtotal, i.taxTotal, i.grandTotal, i.status]);
      exportToCsv('stockin_sales_report', headers, rows);
    } else if (activeReport === 'inventory') {
      const headers = ['Product Name', 'SKU', 'Category', 'Unit', 'Stock', 'Purchase Price', 'Selling Price', 'Inventory Cost Value'];
      const rows = products.map((p) => [p.name, p.sku, p.category, p.unit, p.stock, p.purchasePrice, p.sellingPrice, p.stock * p.purchasePrice]);
      exportToCsv('stockin_inventory_valuation', headers, rows);
    } else if (activeReport === 'profit') {
      const headers = ['Month', 'Gross Sales', 'Cost of Goods Sold (COGS)', 'Gross Margin (₹)'];
      const rows = performanceData.map((d) => [d.month, d.sales, d.cogs, d.profit]);
      exportToCsv('stockin_pnl_report', headers, rows);
    } else if (activeReport === 'customer') {
      const headers = ['Customer Name', 'Company', 'Phone', 'Total Invoices', 'Total Billed', 'Outstanding Balance'];
      const rows = customers.map((c) => [c.name, c.companyName, c.phone, c.totalOrders, c.totalSpent, c.outstanding]);
      exportToCsv('stockin_customer_sales', headers, rows);
    } else if (activeReport === 'tax') {
      const headers = ['GST Slab', 'Taxable Turnover', 'CGST (Central)', 'SGST (State)', 'Total GST Collected'];
      const rows = Object.entries(gstBreakdown).map(([slab, d]) => [slab, Math.round(d.taxable), Math.round(d.cgst), Math.round(d.sgst), Math.round(d.totalGst)]);
      exportToCsv('stockin_gst_summary', headers, rows);
    } else if (activeReport === 'stock_movement') {
      const headers = ['Date', 'Product', 'SKU', 'Movement Type', 'Quantity', 'Previous Stock', 'New Stock', 'Reference', 'Reason'];
      const rows = filteredStockMovements.map((m) => [m.date, m.productName, m.sku, m.type, m.quantity, m.previousStock, m.newStock, m.reference, m.reason || '']);
      exportToCsv('stockin_stock_movements_report', headers, rows);
    } else if (activeReport === 'quotations') {
      const headers = ['Quotation No.', 'Customer', 'Date', 'Valid Until', 'Items', 'Grand Total', 'Status', 'Converted Invoice'];
      const rows = quotations.map((q) => [q.quotationNumber, q.customerName, q.quotationDate, q.validUntil, q.items.length, q.grandTotal, q.status, q.convertedInvoiceNumber || '—']);
      exportToCsv('stockin_quotations_report', headers, rows);
    }
    showToast('Report Exported', 'CSV report downloaded successfully.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Business Reports & Inventory Analytics"
        subtitle="Detailed financial statements, inventory valuation, profitability metrics, and audit movements."
        actions={
          <div className="no-print flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              Print Report
            </button>
          </div>
        }
      />

      {/* Report Switcher Tabs & Date Selector */}
      <div className="no-print bg-white rounded-xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar min-w-0">
          {[
            { id: 'sales', label: 'Sales Report', icon: <Receipt className="w-3.5 h-3.5" /> },
            { id: 'quotations', label: 'Quotations Pipeline', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
            { id: 'inventory', label: 'Inventory Valuation', icon: <Boxes className="w-3.5 h-3.5" /> },
            { id: 'profit', label: 'Profit & Loss', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'customer', label: 'Customer Sales', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'tax', label: 'GST Summary', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
            { id: 'stock_movement', label: 'Stock Movements', icon: <Layers className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[38px] ${
                activeReport === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 self-stretch sm:self-auto justify-end">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 min-h-[36px]"
          >
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="This Quarter">This Quarter</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      {/* ================= REPORT 1: SALES REPORT ================= */}
      {activeReport === 'sales' && (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Gross Sales Revenue</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalSales)}</p>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-1 font-semibold">Across {totalInvoices} invoices</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Units Dispatched (Sold)</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{totalItemsSold} Units</p>
              <p className="text-[10px] sm:text-[11px] text-blue-600 mt-1 font-semibold">Verified stock out fulfillment</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Average Order Value</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(totalInvoices > 0 ? Math.round(totalSales / totalInvoices) : 0)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Per sales invoice</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Sales Ledger Register</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">Items</th>
                    <th className="p-3 text-right">Subtotal (₹)</th>
                    <th className="p-3 text-right">GST (₹)</th>
                    <th className="p-3 text-right">Total (₹)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No sales invoices found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-slate-800">{inv.customerName}</td>
                        <td className="p-3 text-slate-500">{formatDate(inv.date)}</td>
                        <td className="p-3 text-center text-slate-600">{inv.items.length}</td>
                        <td className="p-3 text-right text-slate-700">{formatCurrency(inv.subtotal)}</td>
                        <td className="p-3 text-right text-slate-500">{formatCurrency(inv.taxTotal)}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                        <td className="p-3 text-center">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT 2: INVENTORY VALUATION ================= */}
      {activeReport === 'inventory' && (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Valuation at Cost (Purchase)</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(totalInventoryValuation)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Warehouse balance asset value</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Valuation at Retail (Selling)</p>
              <p className="text-lg sm:text-2xl font-black text-blue-600 mt-1">
                {formatCurrency(totalRetailValuation)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-blue-600 mt-1">Expected gross turnover</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Unrealized Potential Margin</p>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1">
                {formatCurrency(totalRetailValuation - totalInventoryValuation)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-1">
                {(
                  ((totalRetailValuation - totalInventoryValuation) /
                    (totalRetailValuation || 1)) *
                  100
                ).toFixed(1)}
                % potential return
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Catalog Valuation Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[620px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Stock Level</th>
                    <th className="p-3 text-right">Cost Price (₹)</th>
                    <th className="p-3 text-right">Selling Price (₹)</th>
                    <th className="p-3 text-right">Total Cost Basis (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="p-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="p-3 text-slate-600">{p.category}</td>
                      <td className="p-3 text-center font-bold text-slate-800">
                        {p.stock} {p.unit}
                      </td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(p.purchasePrice)}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(p.sellingPrice)}</td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {formatCurrency(p.stock * p.purchasePrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT 3: PROFIT & LOSS ================= */}
      {activeReport === 'profit' && (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Gross Sales Revenue</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalSales)}</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</p>
              <p className="text-lg sm:text-2xl font-black text-rose-600 mt-1">{formatCurrency(totalCOGS)}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Based on purchase price</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Gross Profit (Margin)</p>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1">
                {formatCurrency(totalGrossProfit)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-1">
                {grossMarginPercent}% Gross Margin
              </p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200/80 shadow-xs min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Monthly Revenue vs COGS Margin</h3>
            <p className="text-xs text-slate-500 mb-4">Historical margin performance across quarters</p>
            <div className="h-64 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorSalesP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfitP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(value: any) => (value !== undefined ? formatCurrency(Number(value)) : '')} />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    name="Revenue"
                    stroke="#2563eb"
                    fill="url(#colorSalesP)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Gross Profit"
                    stroke="#10b981"
                    fill="url(#colorProfitP)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT 4: CUSTOMER SALES ================= */}
      {activeReport === 'customer' && (
        <div className="space-y-6 min-w-0">
          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Customer Account Sales Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Company / Business</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-center">Orders</th>
                    <th className="p-3 text-right">Total Billed (₹)</th>
                    <th className="p-3 text-right">Outstanding (₹)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{c.name}</td>
                      <td className="p-3 text-slate-700">{c.companyName || '—'}</td>
                      <td className="p-3 font-mono text-slate-500">{c.phone}</td>
                      <td className="p-3 text-center font-bold text-blue-600">{c.totalOrders}</td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600">
                        {formatCurrency(c.outstanding)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT 5: GST SUMMARY ================= */}
      {activeReport === 'tax' && (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Total GST Collected</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalGstCollected)}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Output tax on tax invoices</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">CGST (Central)</p>
              <p className="text-lg sm:text-2xl font-black text-blue-600 mt-1">{formatCurrency(totalGstCollected / 2)}</p>
              <p className="text-[10px] sm:text-[11px] text-blue-600 mt-1">50% share</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">SGST (State / UT)</p>
              <p className="text-lg sm:text-2xl font-black text-indigo-600 mt-1">{formatCurrency(totalGstCollected / 2)}</p>
              <p className="text-[10px] sm:text-[11px] text-indigo-600 mt-1">50% share</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-4">GST Slabs Breakdown (Output Tax)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[560px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">GST Rate Slab</th>
                    <th className="p-3 text-right">Taxable Turnover (₹)</th>
                    <th className="p-3 text-right">CGST (₹)</th>
                    <th className="p-3 text-right">SGST (₹)</th>
                    <th className="p-3 text-right">Total Tax Collected (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(gstBreakdown).map(([slab, d]) => (
                    <tr key={slab} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-bold text-slate-900 font-mono">{slab}</td>
                      <td className="p-3 text-right font-medium text-slate-800">{formatCurrency(d.taxable)}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(d.cgst)}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(d.sgst)}</td>
                      <td className="p-3 text-right font-black text-blue-600">{formatCurrency(d.totalGst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT 6: STOCK MOVEMENT REPORT ================= */}
      {activeReport === 'stock_movement' && (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Total Stock In (Inward)</p>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 mt-1">+{totalStockInUnits}</p>
              <p className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold mt-1">Added to warehouse</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Total Stock Out (Sold)</p>
              <p className="text-lg sm:text-2xl font-black text-rose-600 mt-1">-{totalStockOutUnits}</p>
              <p className="text-[10px] sm:text-[11px] text-rose-700 font-semibold mt-1">Dispatched via invoices</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Net Inventory Delta</p>
              <p className="text-lg sm:text-2xl font-black text-blue-600 mt-1">
                {totalStockInUnits - totalStockOutUnits > 0 ? '+' : ''}
                {totalStockInUnits - totalStockOutUnits}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Overall units balance</p>
            </div>
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Audit Log Entries</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">{stockMovements.length}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Verified movement records</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs min-w-0">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Complete Stock Movement Ledger</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-center">Qty Change</th>
                    <th className="p-3 text-center">Prev → New</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Reason / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No stock movement audit records found for the selected date range.
                      </td>
                    </tr>
                  ) : (
                    filteredStockMovements.slice(0, 50).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-slate-500 whitespace-nowrap">{formatDate(m.date)}</td>
                      <td className="p-3 font-semibold text-slate-900">{m.productName}</td>
                      <td className="p-3 font-mono text-slate-500">{m.sku}</td>
                      <td className="p-3">
                        <span
                          className={`capitalize px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'stock_in'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.type === 'stock_out'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold font-mono">
                        <span className={m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {m.previousStock} → <strong className="text-slate-900">{m.newStock}</strong>
                      </td>
                      <td className="p-3 font-mono text-slate-700">{m.reference}</td>
                      <td className="p-3 text-slate-600">{m.reason || '—'}</td>
                    </tr>
                  )))
                }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT 7: QUOTATIONS PIPELINE REPORT ================= */}
      {activeReport === 'quotations' && (
        <div className="space-y-6 min-w-0">
          {/* Important Rule Callout: Quotations ≠ Sales */}
          <div className="p-3.5 sm:p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Quotation Accounting Separation:</strong> Quotation values represent expected/offered estimates only and are <strong>strictly separated</strong> from actual sales revenue and balance sheets.
              </span>
            </div>
            <span className="font-semibold text-[10px] bg-white text-amber-800 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider self-start sm:self-auto shrink-0">
              Estimates Pipeline
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Pipeline Value</p>
              <p className="text-lg sm:text-2xl font-black text-amber-700 mt-1 font-mono">
                {formatCurrency(quotations.reduce((sum, q) => sum + q.grandTotal, 0))}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Across {quotations.length} total quotations</p>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Actual Realized Sales</p>
              <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-1 font-mono">
                {formatCurrency(totalSales)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-1 font-semibold">From {totalInvoices} confirmed invoices</p>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Converted Invoices</p>
              <p className="text-lg sm:text-2xl font-black text-blue-700 mt-1">
                {quotations.filter((q) => q.status === 'converted').length}
              </p>
              <p className="text-[10px] sm:text-[11px] text-blue-600 mt-1 font-semibold">
                {quotations.length > 0
                  ? `${Math.round(
                      (quotations.filter((q) => q.status === 'converted').length / quotations.length) * 100
                    )}% conversion`
                  : '0% conversion'}
              </p>
            </div>

            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500">Active Offers</p>
              <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1">
                {quotations.filter((q) => q.status === 'draft' || q.status === 'sent' || q.status === 'accepted').length}
              </p>
              <p className="text-[10px] sm:text-[11px] text-amber-600 mt-1 font-semibold">Pending customer fulfillment</p>
            </div>
          </div>

          {/* Quotations Ledger in Reports */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs min-w-0">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Quotations Register</h3>
                <p className="text-xs text-slate-500">Complete log of issued quotes and conversion milestones</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[660px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold">
                    <th className="p-3">Quotation No.</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Valid Until</th>
                    <th className="p-3 text-center">Items</th>
                    <th className="p-3 text-right">Quoted Value</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Linked Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {quotations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No quotations registered in the system yet.
                      </td>
                    </tr>
                  ) : (
                    quotations.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-amber-700">{q.quotationNumber}</td>
                        <td className="p-3 font-semibold text-slate-900">{q.customerName}</td>
                        <td className="p-3 text-slate-500">{formatDate(q.quotationDate)}</td>
                        <td className="p-3 text-slate-500">{formatDate(q.validUntil)}</td>
                        <td className="p-3 text-center font-semibold">{q.items.length}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(q.grandTotal)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              q.status === 'converted'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : q.status === 'accepted'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : q.status === 'sent'
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {q.convertedInvoiceNumber || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

