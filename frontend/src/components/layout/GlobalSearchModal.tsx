import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { Search, Package, Users, FileText, ArrowRight, X } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const { products, customers, invoices } = useAppState();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchedCustomers = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.companyName.toLowerCase().includes(q) ||
          c.phone.includes(q)
      ).slice(0, 3)
    : [];

  const matchedInvoices = q
    ? invoices.filter(
        (i) =>
          i.invoiceNumber.toLowerCase().includes(q) ||
          i.customerName.toLowerCase().includes(q) ||
          i.customerCompany.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const totalResults =
    matchedProducts.length + matchedCustomers.length + matchedInvoices.length;

  const handleSelect = (url: string) => {
    navigate(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-950/60 transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-full items-start justify-center p-4 pt-16 sm:pt-24 text-center">
        <div
          className="w-full max-w-xl overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-slate-200/90"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Input Header */}
          <div className="relative flex items-center px-4 border-b border-slate-200/80">
            <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, customers, invoices... (e.g. Chair, Sharma, INV-00025)"
              className="w-full py-4 text-sm font-medium text-slate-800 placeholder-slate-400 bg-transparent focus:outline-hidden"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                ESC
              </span>
            )}
          </div>

          {/* Results Area */}
          <div className="max-h-96 overflow-y-auto p-4 space-y-4">
            {!q && (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">
                  Type to search across catalog, customer accounts, and billing ledgers.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                  <span
                    onClick={() => setQuery('Table')}
                    className="cursor-pointer text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Table
                  </span>
                  <span
                    onClick={() => setQuery('Sharma')}
                    className="cursor-pointer text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Sharma
                  </span>
                  <span
                    onClick={() => setQuery('INV-00025')}
                    className="cursor-pointer text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    INV-00025
                  </span>
                  <span
                    onClick={() => setQuery('Godrej')}
                    className="cursor-pointer text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Godrej
                  </span>
                </div>
              </div>
            )}

            {q && totalResults === 0 && (
              <div className="py-10 text-center text-slate-400 text-xs">
                No matching results found for "{query}".
              </div>
            )}

            {/* Products */}
            {matchedProducts.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  Products ({matchedProducts.length})
                </p>
                <div className="space-y-1">
                  {matchedProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelect('/products')}
                      className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          SKU: {p.sku} • {p.category} • Stock: {p.stock}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {formatCurrency(p.sellingPrice)}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customers */}
            {matchedCustomers.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  Customers ({matchedCustomers.length})
                </p>
                <div className="space-y-1">
                  {matchedCustomers.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelect('/customers')}
                      className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {c.companyName || c.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {c.name} • {c.phone} • {c.city}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                          Spent: {formatCurrency(c.totalSpent)}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices */}
            {matchedInvoices.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  Invoices ({matchedInvoices.length})
                </p>
                <div className="space-y-1">
                  {matchedInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => handleSelect('/invoices')}
                      className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {inv.invoiceNumber} — {inv.customerCompany || inv.customerName}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {inv.date} • Status: <span className="capitalize">{inv.status}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {formatCurrency(inv.grandTotal)}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
            <span>Search: Products, Customers, Invoices</span>
            <span>Press ESC to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
