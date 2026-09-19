import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StockAdjustModal } from '@/components/stock/StockAdjustModal';
import { formatCurrency, formatIndianNumber } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import {
  Boxes,
  AlertTriangle,
  PackageX,
  IndianRupee,
  PlusCircle,
  Download,
  Search,
  History,
  PackagePlus,
  Layers,
} from 'lucide-react';

export const StockPage: React.FC = () => {
  const { products, stockMovements, showToast } = useAppState();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Top Cards Calculations
  const totalProducts = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.status === 'low_stock').length;
  const outOfStockCount = products.filter((p) => p.status === 'out_of_stock').length;
  const totalStockValue = products.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.reference.toLowerCase().includes(q) ||
        (m.reason && m.reason.toLowerCase().includes(q));

      const matchesType = typeFilter === 'All' || m.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [stockMovements, searchQuery, typeFilter]);

  const handleExportMovements = () => {
    const headers = [
      'Date & Time',
      'Product Name',
      'SKU',
      'Movement Type',
      'Quantity Change',
      'Reference No',
      'Previous Stock',
      'New Stock',
      'Reason / Notes',
    ];
    const rows = filteredMovements.map((m) => [
      m.date,
      m.productName,
      m.sku,
      m.type,
      m.quantity,
      m.reference,
      m.previousStock,
      m.newStock,
      m.reason || '',
    ]);
    exportToCsv('stockin_stock_movements', headers, rows);
    showToast('Exported', `Saved ${filteredMovements.length} stock movement records to CSV.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Stock & Inventory Audit"
        subtitle="Live warehouse balances, stock replenishment audit, and historical stock movement ledger."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportMovements}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Log
            </button>
            <button
              type="button"
              onClick={() => setIsAdjustModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              Stock Adjustment
            </button>
            <button
              type="button"
              onClick={() => navigate('/stock-in')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              Add Stock In
            </button>
          </div>
        }
      />

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Products"
          value={formatIndianNumber(totalProducts)}
          subtitle="Unique active items"
          icon={<Layers className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
          iconBgColor="bg-indigo-50"
        />
        <StatCard
          title="Total Units In Stock"
          value={formatIndianNumber(totalUnits)}
          subtitle="Warehouse inventory"
          icon={<Boxes className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="Stock Valuation"
          value={formatCurrency(totalStockValue)}
          subtitle="Purchase cost basis"
          icon={<IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50"
        />
        <StatCard
          title="Low Stock Items"
          value={formatIndianNumber(lowStockCount)}
          subtitle="Below buffer"
          icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
          iconBgColor="bg-amber-50"
          badgeText="Restock soon"
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            title="Out of Stock"
            value={formatIndianNumber(outOfStockCount)}
            subtitle="Zero units on hand"
            icon={<PackageX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
            iconBgColor="bg-rose-50"
            badgeText="Needs Stock In"
          />
        </div>
      </div>

      {/* Stock Movements Ledger Section */}
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, SKU or reference..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {[
              { label: 'All Movements', value: 'All' },
              { label: 'Stock In', value: 'stock_in' },
              { label: 'Stock Out', value: 'stock_out' },
              { label: 'Adjustments', value: 'adjustment' },
              { label: 'Returns', value: 'return' },
            ].map((tab) => (
              <button
                type="button"
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  typeFilter === tab.value
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Movement Cards */}
        <div className="block md:hidden space-y-3">
          {stockMovements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs">
              <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No Stock Movements Logged Yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Inventory entries will appear automatically whenever products are added, stocked in, adjusted, or invoiced.
              </p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-xs">
              No stock movement entries matching this filter.
            </div>
          ) : (
            filteredMovements.map((mov) => (
              <div
                key={mov.id}
                className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={mov.type} />
                      <span className="font-mono text-[11px] font-bold text-blue-600">{mov.reference}</span>
                    </div>
                    <p className="font-bold text-xs text-slate-900 truncate">{mov.productName}</p>
                    <p className="text-[11px] font-mono text-slate-400">{mov.sku}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-base font-black font-mono block ${
                        mov.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                    </span>
                    <span className="text-[10px] text-slate-400">Qty Change</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Previous Stock</span>
                    <span className="font-mono font-semibold text-slate-700">{mov.previousStock}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">New Stock</span>
                    <span className="font-mono font-black text-slate-900">{mov.newStock}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>{mov.date}</span>
                  <span className="font-medium text-slate-700 truncate max-w-[160px]">{mov.reason || 'Restock'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Movement Table */}
        <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Stock Movement Ledger</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredMovements.length} log entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5 min-w-[200px]">Product / SKU</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5 text-center">Change</th>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5 text-center">Prev</th>
                  <th className="p-3.5 text-center">New</th>
                  <th className="p-3.5 min-w-[180px]">Reason / Reference Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-700">No Stock Movements Logged Yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Inventory entries will appear automatically whenever products are added, stocked in, adjusted, or invoiced.
                      </p>
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No stock movement entries matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {mov.date}
                      </td>

                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{mov.productName}</p>
                        <p className="text-[11px] font-mono text-slate-400">{mov.sku}</p>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge status={mov.type} />
                      </td>

                      <td className="p-3.5 text-center font-bold whitespace-nowrap">
                        <span
                          className={
                            mov.quantity > 0
                              ? 'text-emerald-600 font-bold'
                              : 'text-rose-600 font-bold'
                          }
                        >
                          {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono font-semibold text-slate-700 whitespace-nowrap">
                        {mov.reference}
                      </td>

                      <td className="p-3.5 text-center text-slate-500 font-mono">
                        {mov.previousStock}
                      </td>

                      <td className="p-3.5 text-center font-bold text-slate-900 font-mono">
                        {mov.newStock}
                      </td>

                      <td className="p-3.5 text-slate-600 text-[11px] leading-relaxed">
                        {mov.reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
      />
    </div>
  );
};
