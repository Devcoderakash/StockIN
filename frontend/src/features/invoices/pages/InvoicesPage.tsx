import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { InvoiceDetailDrawer } from '@/components/invoices/InvoiceDetailDrawer';
import { PrintableInvoice } from '@/components/invoices/PrintableInvoice';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Invoice, PaymentStatus } from '@/types';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import {
  Plus,
  Download,
  Search,
  Eye,
  Printer,
  FileText,
  CheckCircle,
  Trash2,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const { invoices, updateInvoiceStatus, deleteInvoice, showToast } = useAppState();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');

  // Drawer and Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerCompany.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Totals for current filter
  const totalBilled = filteredInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalReceived = filteredInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const totalDue = filteredInvoices.reduce((sum, i) => sum + i.balance, 0);

  const handleExportCsv = () => {
    const headers = [
      'Invoice Number',
      'Customer',
      'Date',
      'Items Count',
      'Total Amount',
      'Paid Amount',
      'Balance Due',
      'Status',
    ];
    const rows = filteredInvoices.map((i) => [
      i.invoiceNumber,
      i.customerCompany || i.customerName,
      i.date,
      i.items.length,
      i.grandTotal,
      i.paidAmount,
      i.balance,
      i.status,
    ]);
    exportToCsv('stockin_invoices_ledger', headers, rows);
    showToast('Export complete', `Exported ${filteredInvoices.length} invoices to CSV.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Sales Invoices"
        subtitle="Manage billing transactions, customer receivables, and GST tax invoice receipts."
        badge={
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {invoices.length} Invoices
          </span>
        }
        actions={
          <>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export
            </button>
            <button
              onClick={() => navigate('/billing')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </>
        }
      />

      {/* Mini Financial Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400">Total Billed</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(totalBilled)}</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            {filteredInvoices.length} bills
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400">Total Collected</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(totalReceived)}</p>
          </div>
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200/80">
            Settled
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase text-slate-400">Receivable Due</p>
            <p className="text-lg font-bold text-rose-600 mt-0.5">{formatCurrency(totalDue)}</p>
          </div>
          <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200/80">
            Outstanding
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice number or customer..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(['all', 'paid', 'partial', 'due'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Invoices Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Sales Invoices Issued Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Generate your first professional GST-compliant bill in the Billing terminal with automatic stock deduction.
            </p>
            <button
              onClick={() => navigate('/billing')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Create First Invoice
            </button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-xs text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No invoices found matching current search/filter.
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => {
                setSelectedInvoice(inv);
                setIsDrawerOpen(true);
              }}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3"
            >
              {/* Card Header: Invoice # + Status + Date */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-blue-600 text-xs">
                      {inv.invoiceNumber}
                    </span>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(inv.date)}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-900 font-mono block">
                    {formatCurrency(inv.grandTotal)}
                  </span>
                  <span className="text-[10px] text-slate-400">{inv.items.length} items</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                <p className="font-bold text-slate-900">{inv.customerCompany || inv.customerName}</p>
                {inv.customerCompany && (
                  <p className="text-[11px] text-slate-500">{inv.customerName}</p>
                )}
                <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-500">
                    Paid: <strong className="text-emerald-600 font-mono">{formatCurrency(inv.paidAmount)}</strong>
                  </span>
                  <span className="text-slate-500">
                    Due: <strong className={inv.balance > 0 ? 'text-rose-600 font-mono' : 'text-slate-700 font-mono'}>
                      {formatCurrency(inv.balance)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Actions Row */}
              <div
                className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setIsDrawerOpen(true);
                  }}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="View Invoice Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setPrintInvoice(inv);
                    setIsPrintModalOpen(true);
                  }}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                {inv.status !== 'paid' && (
                  <button
                    onClick={() => updateInvoiceStatus(inv.id, 'paid')}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                    title="Mark as Paid"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setInvoiceToDelete(inv.id)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete Invoice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Invoices Table (>= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5 min-w-[180px]">Customer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-center">Items</th>
                <th className="p-3.5 text-right">Total (₹)</th>
                <th className="p-3.5 text-right">Paid (₹)</th>
                <th className="p-3.5 text-right">Balance (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right min-w-[130px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Sales Invoices Issued Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Generate your first professional GST-compliant bill in the Billing terminal with automatic stock deduction and invoice numbering.
                    </p>
                    <button
                      onClick={() => navigate('/billing')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Invoice
                    </button>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No invoices found matching current search/filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setIsDrawerOpen(true);
                    }}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="p-3.5 font-bold font-mono text-blue-600 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {inv.customerCompany || inv.customerName}
                      </p>
                      {inv.customerCompany && (
                        <p className="text-[11px] text-slate-400 truncate">{inv.customerName}</p>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(inv.date)}
                    </td>

                    <td className="p-3.5 text-center text-slate-600 font-medium">
                      {inv.items.length}
                    </td>

                    <td className="p-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(inv.grandTotal)}
                    </td>

                    <td className="p-3.5 text-right font-medium text-emerald-600 whitespace-nowrap">
                      {formatCurrency(inv.paidAmount)}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          inv.balance > 0 ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {formatCurrency(inv.balance)}
                      </span>
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <StatusBadge status={inv.status} />
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDrawerOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Invoice Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setPrintInvoice(inv);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => updateInvoiceStatus(inv.id, 'paid')}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setInvoiceToDelete(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Invoice"
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

      {/* Invoice Detail Drawer */}
      <InvoiceDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onOpenPrintModal={(inv) => {
          setPrintInvoice(inv);
          setIsPrintModalOpen(true);
        }}
      />

      {/* Printable Invoice Modal */}
      <PrintableInvoice
        isOpen={isPrintModalOpen}
        invoice={printInvoice}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintInvoice(null);
        }}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={() => {
          if (invoiceToDelete) {
            deleteInvoice(invoiceToDelete);
            setInvoiceToDelete(null);
          }
        }}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice record? The client outstanding balance will be adjusted accordingly."
        confirmText="Delete Invoice"
      />
    </div>
  );
};
