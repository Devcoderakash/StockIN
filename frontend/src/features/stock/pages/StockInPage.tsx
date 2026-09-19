import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { exportToCsv } from '@/utils/exportCsv';
import { formatCurrency, formatDate } from '@/utils/formatters';
import {
  PackagePlus,
  ArrowDownRight,
  TrendingUp,
  Boxes,
  CheckCircle2,
  Calendar,
  Search,
  Download,
  FileText,
  AlertCircle,
  Hash,
  Plus,
} from 'lucide-react';

export const StockInPage: React.FC = () => {
  const { products, stockMovements, addStockIn } = useAppState();
  const navigate = useNavigate();

  // Selected Product & Form State
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [purchaseRate, setPurchaseRate] = useState<number>(() => products[0]?.purchasePrice || 0);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('New Inventory');
  const [reference, setReference] = useState<string>(
    () => `STK-IN-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
      setPurchaseRate(products[0].purchasePrice);
    }
  }, [products, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Sync purchase rate when product selection changes
  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setPurchaseRate(prod.purchasePrice);
    }
  };

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) return;

    addStockIn({
      productId: selectedProductId,
      quantity: Number(quantity),
      purchaseRate: Number(purchaseRate),
      date,
      reason,
      reference: reference || `STK-IN-${Math.floor(1000 + Math.random() * 9000)}`,
      notes,
    });

    // Reset reference for next entry
    setReference(`STK-IN-${Math.floor(1000 + Math.random() * 9000)}`);
    setNotes('');
  };

  // Stock in movements ledger
  const stockInMovements = stockMovements.filter((m) => m.type === 'stock_in');
  const filteredMovements = stockInMovements.filter(
    (m) =>
      m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.reason && m.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Top KPIs
  const totalInwardUnits = stockInMovements.reduce((acc, m) => acc + Math.abs(m.quantity), 0);
  const totalInwardValuation = stockInMovements.reduce(
    (acc, m) => acc + Math.abs(m.quantity) * (m.purchaseRate || 0),
    0
  );
  const uniqueProductsRestocked = new Set(stockInMovements.map((m) => m.productId)).size;

  const handleExportCsv = () => {
    const headers = [
      'Date',
      'Reference',
      'Product Name',
      'SKU',
      'Inward Quantity',
      'Purchase Rate',
      'Previous Stock',
      'New Stock',
      'Reason',
    ];
    const rows = filteredMovements.map((m) => [
      m.date,
      m.reference,
      `"${m.productName.replace(/"/g, '""')}"`,
      m.sku,
      m.quantity,
      m.purchaseRate || 0,
      m.previousStock,
      m.newStock,
      `"${(m.reason || '').replace(/"/g, '""')}"`,
    ]);
    exportToCsv('stockin_intake_ledger', headers, rows);
  };

  const currentStock = selectedProduct?.stock ?? 0;
  const nextStock = currentStock + (Number(quantity) || 0);
  const intakeTotalCost = (Number(quantity) || 0) * (Number(purchaseRate) || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Stock In — Inventory Intake"
        subtitle="Add incoming inventory shipments, record unit purchase rates, and automatically update warehouse stock."
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Intake Ledger
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Inward Units</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
              {totalInwardUnits.toLocaleString('en-IN')}
            </p>
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
              <TrendingUp className="w-3 h-3 shrink-0" /> Cumulative intake
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 ml-2">
            <PackagePlus className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Intake Valuation</p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1 truncate">
              {formatCurrency(totalInwardValuation)}
            </p>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 inline-flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
              At buying rates
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 ml-2">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Products Restocked</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
              {uniqueProductsRestocked}
            </p>
            <span className="text-[10px] sm:text-[11px] font-semibold text-blue-600 inline-flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
              Unique items
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 ml-2">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Intake Records</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
              {stockInMovements.length}
            </p>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 inline-flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
              Audit trail logged
            </span>
          </div>
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 ml-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Stock In Form (5 cols) & Live Preview / Calculator + Recent Ledger (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stock In Entry Form */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PackagePlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Add Stock In</h3>
                <p className="text-[11px] text-slate-500">Incoming inventory intake entry</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {reference}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">No Catalog Products Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
                You must create products in your inventory catalog before receiving stock intake.
              </p>
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Go to Products
              </button>
            </div>
          ) : (
            <form onSubmit={handleStockInSubmit} className="space-y-4 text-xs">
              {/* Product Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2.5 font-medium rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs min-h-[44px]"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Available: {p.stock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

            {/* SKU and Current Stock Preview */}
            {selectedProduct && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-bold text-slate-800">{selectedProduct.sku}</span>
                  <span className="text-slate-400">•</span>
                  <span>{selectedProduct.category}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Current: </span>
                  <span className="font-bold text-slate-900">{selectedProduct.stock} {selectedProduct.unit}</span>
                </div>
              </div>
            )}

            {/* Quantity and Purchase Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2.5 font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Purchase Rate (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={purchaseRate}
                  onChange={(e) => setPurchaseRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  required
                />
              </div>
            </div>

            {/* Date and Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Inward Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason / Source *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                >
                  <option value="New Inventory">New Inventory</option>
                  <option value="Warehouse Restock">Warehouse Restock</option>
                  <option value="Customer Return">Customer Return</option>
                  <option value="Opening Stock">Opening Stock</option>
                  <option value="Audit Intake">Audit Intake</option>
                  <option value="Bulk Inward Stock">Bulk Inward Stock</option>
                </select>
              </div>
            </div>

            {/* Reference Number and Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference Code
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2.5 font-mono font-medium rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="e.g. STK-IN-1024"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes / Batch
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="e.g. Rack A2, Batch 4"
                />
              </div>
            </div>

            {/* Inventory Impact Summary Banner */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Current Warehouse Stock:</span>
                <span className="font-bold text-slate-900">{currentStock} units</span>
              </div>
              <div className="flex items-center justify-between text-blue-700 font-semibold">
                <span>+ Inward Quantity:</span>
                <span className="font-bold">+{quantity} units</span>
              </div>
              <div className="pt-2 border-t border-blue-200 flex items-center justify-between text-slate-900 font-bold">
                <span>Updated Warehouse Stock:</span>
                <span className="text-sm font-black text-blue-600">{nextStock} units</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                <span>Total Inward Value:</span>
                <span className="font-semibold text-slate-700">{formatCurrency(intakeTotalCost)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
            >
              <PackagePlus className="w-4 h-4" />
              Add Stock to Warehouse
            </button>
          </form>
          )}
        </div>

        {/* Right Column: Recent Stock In Audit Ledger */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Stock In Movement History</h3>
                <p className="text-[11px] text-slate-500">Verified log of all inward inventory entries</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search product, SKU, ref..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 min-h-[38px]"
                />
              </div>
            </div>

            {/* Mobile Cards View (< 768px) */}
            <div className="block md:hidden divide-y divide-slate-100 mt-2">
              {stockInMovements.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No Stock In intake movements recorded yet.
                </div>
              ) : filteredMovements.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No Stock In records match your search.
                </div>
              ) : (
                filteredMovements.slice(0, 10).map((m) => (
                  <div key={m.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {m.reference}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500">{formatDate(m.date)}</span>
                      </div>
                      <span className="inline-flex items-center font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
                        +{Math.abs(m.quantity)}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{m.productName}</p>
                        <p className="font-mono text-[10px] text-slate-400">{m.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-500">Stock: </span>
                        <span className="font-mono text-xs text-slate-600">{m.previousStock}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-mono text-xs font-bold text-slate-900">{m.newStock}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                        {m.reason || 'Restock'}
                      </span>
                      {m.purchaseRate ? (
                        <span>Rate: <strong className="text-slate-700">{formatCurrency(m.purchaseRate)}</strong></span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-200">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">Product / SKU</th>
                    <th className="pb-2.5 text-center">Inward</th>
                    <th className="pb-2.5 text-center">Prev → New</th>
                    <th className="pb-2.5">Reason / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockInMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No Stock In intake movements recorded yet.
                      </td>
                    </tr>
                  ) : filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No Stock In records match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.slice(0, 10).map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 text-slate-500 whitespace-nowrap">
                          {formatDate(m.date)}
                        </td>
                        <td className="py-2.5">
                          <p className="font-semibold text-slate-900">{m.productName}</p>
                          <p className="font-mono text-[10px] text-slate-400">{m.sku}</p>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                            +{Math.abs(m.quantity)}
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-slate-600 font-mono text-[11px]">
                          {m.previousStock} → <strong className="text-slate-900">{m.newStock}</strong>
                        </td>
                        <td className="py-2.5">
                          <p className="font-medium text-slate-800">{m.reason || 'Restock'}</p>
                          <p className="font-mono text-[10px] text-blue-600">{m.reference}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Showing {Math.min(10, filteredMovements.length)} of {stockInMovements.length} inward movements</span>
            <span className="font-medium">Direct live database updates</span>
          </div>
        </div>
      </div>
    </div>
  );
};
