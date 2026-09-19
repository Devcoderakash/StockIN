import React, { useState, useMemo, useRef } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProductModal } from '@/components/products/ProductModal';
import { ProductDetailDrawer } from '@/components/products/ProductDetailDrawer';
import { StockAdjustModal } from '@/components/stock/StockAdjustModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Product } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import {
  Plus,
  Download,
  Upload,
  Search,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Package,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { products, addProduct, duplicateProduct, deleteProduct, showToast } = useAppState();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [brandFilter, setBrandFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All');

  // Modals & Drawers state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Extract unique categories and brands
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  }, [products]);

  const brands = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map((p) => p.brand).filter(Boolean)))];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.hsnCode.includes(q);

      // Category
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;

      // Status
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

      // Brand
      const matchesBrand = brandFilter === 'All' || p.brand === brandFilter;

      // Price
      let matchesPrice = true;
      if (priceFilter === 'under_5k') matchesPrice = p.sellingPrice < 5000;
      else if (priceFilter === '5k_20k')
        matchesPrice = p.sellingPrice >= 5000 && p.sellingPrice <= 20000;
      else if (priceFilter === 'above_20k') matchesPrice = p.sellingPrice > 20000;

      return matchesSearch && matchesCategory && matchesStatus && matchesBrand && matchesPrice;
    });
  }, [products, searchQuery, categoryFilter, statusFilter, brandFilter, priceFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Product Name',
      'SKU',
      'Category',
      'Brand',
      'Purchase Price',
      'Selling Price',
      'Stock',
      'Min Stock',
      'Tax Rate',
      'HSN Code',
      'Status',
    ];
    const rows = filteredProducts.map((p) => [
      p.name,
      p.sku,
      p.category,
      p.brand,
      p.purchasePrice,
      p.sellingPrice,
      p.stock,
      p.minStock,
      `${p.taxRate}%`,
      p.hsnCode,
      p.status,
    ]);
    exportToCsv('stockin_products_export', headers, rows);
    showToast('Export complete', `Exported ${filteredProducts.length} products to CSV.`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
      if (lines.length <= 1) {
        showToast('Import Failed', 'CSV file is empty or missing data rows.', 'error');
        return;
      }

      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const getIndex = (keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));

      const nameIdx = getIndex(['name', 'product', 'title']);
      const catIdx = getIndex(['category', 'cat']);
      const brandIdx = getIndex(['brand', 'make']);
      const unitIdx = getIndex(['unit', 'uom']);
      const buyPriceIdx = getIndex(['purchase', 'buy', 'cost']);
      const sellPriceIdx = getIndex(['selling', 'sell', 'price', 'mrp']);
      const stockIdx = getIndex(['stock', 'qty', 'quantity']);
      const minStockIdx = getIndex(['minstock', 'threshold', 'min']);
      const taxIdx = getIndex(['tax', 'gst']);
      const hsnIdx = getIndex(['hsn', 'code']);
      const descIdx = getIndex(['desc', 'description']);

      if (nameIdx === -1) {
        showToast('Import Error', 'Could not find a "Product Name" column in CSV.', 'error');
        return;
      }

      let importedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length === 0 || !cols[nameIdx]) continue;

        const name = cols[nameIdx];
        const category = catIdx !== -1 && cols[catIdx] ? cols[catIdx] : 'General';
        const brand = brandIdx !== -1 && cols[brandIdx] ? cols[brandIdx] : '';
        const unit = unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx] : 'pcs';
        const purchasePrice = buyPriceIdx !== -1 ? parseFloat(cols[buyPriceIdx].replace(/[^0-9.]/g, '')) || 0 : 0;
        const sellingPrice = sellPriceIdx !== -1 ? parseFloat(cols[sellPriceIdx].replace(/[^0-9.]/g, '')) || 0 : 0;
        const stock = stockIdx !== -1 ? parseInt(cols[stockIdx].replace(/[^0-9]/g, ''), 10) || 0 : 0;
        const minStock = minStockIdx !== -1 ? parseInt(cols[minStockIdx].replace(/[^0-9]/g, ''), 10) || 5 : 5;
        const taxRate = taxIdx !== -1 ? parseFloat(cols[taxIdx].replace(/[^0-9.]/g, '')) || 18 : 18;
        const hsnCode = hsnIdx !== -1 && cols[hsnIdx] ? cols[hsnIdx] : '';
        const description = descIdx !== -1 && cols[descIdx] ? cols[descIdx] : '';

        addProduct({
          name,
          sku: '',
          category,
          brand,
          unit,
          purchasePrice,
          sellingPrice,
          stock,
          minStock,
          taxRate,
          hsnCode,
          description,
        });
        importedCount++;
      }

      if (importedCount > 0) {
        showToast('Import Complete', `Successfully imported ${importedCount} product(s) into your catalog.`, 'success');
      } else {
        showToast('Import Failed', 'No valid product rows were found in the CSV.', 'error');
      }
    } catch (err: any) {
      showToast('Import Error', err.message || 'Failed to parse CSV file', 'error');
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,text/csv"
        className="hidden"
      />

      {/* Page Header */}
      <PageHeader
        title="Products & Inventory"
        subtitle="Manage your catalog, SKUs, inventory buffers, and profit margins."
        badge={
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {products.length} Total SKUs
          </span>
        }
        actions={
          <>
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Import CSV
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, SKU, or HSN code..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Brand Filter */}
          <div className="md:col-span-2">
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === 'All' ? 'All Brands' : b}
                </option>
              ))}
            </select>
          </div>

          {/* Price Filter */}
          <div className="md:col-span-2">
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">Price: Any</option>
              <option value="under_5k">Under ₹5,000</option>
              <option value="5k_20k">₹5,000 - ₹20,000</option>
              <option value="above_20k">Above ₹20,000</option>
            </select>
          </div>
        </div>

        {/* Filter info tags */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            Showing <strong className="text-slate-800">{filteredProducts.length}</strong> of{' '}
            {products.length} catalog items
          </span>
          {(categoryFilter !== 'All' ||
            statusFilter !== 'All' ||
            brandFilter !== 'All' ||
            priceFilter !== 'All' ||
            searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setStatusFilter('All');
                setBrandFilter('All');
                setPriceFilter('All');
              }}
              className="text-blue-600 font-semibold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile Products Card List */}
      <div className="block md:hidden space-y-3">
        {products.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Products in Inventory</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Start building your product catalog by adding SKUs with purchase rates, selling prices, and stock levels.
            </p>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add First Product
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-xs">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No products matched your search and filter criteria.
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3"
              onClick={() => {
                setSelectedProduct(product);
                setIsDrawerOpen(true);
              }}
            >
              {/* Card Header: Product Name, SKU & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-extrabold text-xs border border-blue-100">
                    {product.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{product.name}</p>
                    <p className="text-[11px] font-mono text-slate-400 truncate">SKU: {product.sku}</p>
                  </div>
                </div>
                <StatusBadge status={product.status} />
              </div>

              {/* Card Body: 2-column metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Current Stock</span>
                  <span className={`font-black text-sm ${
                    product.stock === 0
                      ? 'text-rose-600'
                      : product.stock <= product.minStock
                      ? 'text-amber-600'
                      : 'text-slate-900'
                  }`}>
                    {product.stock} <span className="text-[10px] font-normal text-slate-400">{product.unit}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Selling Price</span>
                  <span className="font-black text-sm text-slate-900">{formatCurrency(product.sellingPrice)}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Category</span>
                  <span className="font-medium text-slate-700 truncate block">{product.category}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Buying Cost</span>
                  <span className="font-medium text-slate-500">{formatCurrency(product.purchasePrice)}</span>
                </div>
              </div>

              {/* Card Actions: Large touch-friendly buttons */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsDrawerOpen(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer min-h-[40px]"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  View
                </button>
                <button
                  onClick={() => {
                    setEditingProduct(product);
                    setIsProductModalOpen(true);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer min-h-[40px]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  Edit
                </button>
                <button
                  onClick={() => duplicateProduct(product.id)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Duplicate"
                  aria-label="Duplicate product"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setProductToDelete(product.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="Delete"
                  aria-label="Delete product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Products Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 min-w-[220px]">Product</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5 text-right">Purchase (₹)</th>
                <th className="p-3.5 text-right">Selling (₹)</th>
                <th className="p-3.5 text-center">Stock</th>
                <th className="p-3.5 text-center">Min Stock</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Products in Inventory</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Start building your product catalog by adding SKUs with purchase rates, selling prices, GST tax rates, and minimum stock levels.
                    </p>
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setIsProductModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Product
                    </button>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No products matched your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedProduct(product);
                      setIsDrawerOpen(true);
                    }}
                  >
                    {/* Product Name */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-[11px] border border-blue-100">
                          {product.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {product.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {product.brand} • HSN {product.hsnCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="p-3.5 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                      {product.sku}
                    </td>

                    {/* Category */}
                    <td className="p-3.5 text-slate-700 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                        {product.category}
                      </span>
                    </td>

                    {/* Purchase Price */}
                    <td className="p-3.5 text-right font-medium text-slate-500 whitespace-nowrap">
                      {formatCurrency(product.purchasePrice)}
                    </td>

                    {/* Selling Price */}
                    <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(product.sellingPrice)}
                    </td>

                    {/* Stock */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span
                        className={`font-black ${
                          product.stock === 0
                            ? 'text-rose-600'
                            : product.stock <= product.minStock
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {product.stock}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400">{product.unit}</span>
                    </td>

                    {/* Min Stock */}
                    <td className="p-3.5 text-center text-slate-500 whitespace-nowrap">
                      {product.minStock}
                    </td>

                    {/* Status */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <StatusBadge status={product.status} />
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsDrawerOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setIsProductModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateProduct(product.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductToDelete(product.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onEdit={(prod) => {
          setEditingProduct(prod);
          setIsProductModalOpen(true);
        }}
        onAdjustStock={(prod) => {
          setAdjustingProduct(prod);
          setIsAdjustModalOpen(true);
        }}
        onDelete={(id) => setProductToDelete(id)}
      />

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustingProduct(null);
        }}
        defaultProduct={adjustingProduct}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
          if (productToDelete) {
            deleteProduct(productToDelete);
            setProductToDelete(null);
          }
        }}
        title="Delete Product"
        message="Are you sure you want to delete this product from the inventory catalog? This action cannot be undone."
        confirmText="Delete Product"
      />
    </div>
  );
};
