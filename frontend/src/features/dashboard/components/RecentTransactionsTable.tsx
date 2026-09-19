import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { ArrowRight, FileText, Plus } from 'lucide-react';

export const RecentTransactionsTable: React.FC = () => {
  const { invoices } = useAppState();
  const navigate = useNavigate();

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Recent Invoices</h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest sales activity and status</p>
        </div>
        {recentInvoices.length > 0 && (
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {recentInvoices.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
            <FileText className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">No Sales Invoices Generated</p>
          <p className="text-[11px] text-slate-400 mt-0.5 mb-3 max-w-xs">
            Create an invoice in Billing to issue GST-compliant bills and register revenue.
          </p>
          <button
            onClick={() => navigate('/billing')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="block sm:hidden space-y-2">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => navigate('/invoices')}
                className="p-3 bg-slate-50/70 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono font-bold text-xs text-blue-600 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {inv.invoiceNumber}
                  </span>
                  <StatusBadge status={inv.status} />
                </div>
                <p className="font-bold text-xs text-slate-900 truncate">
                  {inv.customerCompany || inv.customerName}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
                  <span>{formatDate(inv.date)}</span>
                  <span className="font-extrabold text-xs text-slate-900">{formatCurrency(inv.grandTotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 font-semibold">
                  <th className="pb-2.5">Invoice</th>
                  <th className="pb-2.5">Customer</th>
                  <th className="pb-2.5">Date</th>
                  <th className="pb-2.5 text-right">Amount</th>
                  <th className="pb-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate('/invoices')}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-semibold text-blue-600 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 text-slate-800 font-medium max-w-[140px] truncate">
                      {inv.customerCompany || inv.customerName}
                    </td>
                    <td className="py-3 text-slate-500 whitespace-nowrap">{formatDate(inv.date)}</td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
