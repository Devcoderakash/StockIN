import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import {
  IndianRupee,
  ArrowDownLeft,
  Plus,
  Download,
  Search,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const { payments, customers, showToast } = useAppState();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Top Card stats (Customer Inward Flows only)
  const todayStr = new Date().toISOString().split('T')[0];
  const receivedToday = useMemo(() => {
    return payments
      .filter((p) => p.date === todayStr)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, todayStr]);

  const totalReceived = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const pendingReceivables = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.outstanding, 0);
  }, [customers]);

  const totalSettledCount = payments.length;

  // Filtered transactions
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.transactionId.toLowerCase().includes(q) ||
        p.partyName.toLowerCase().includes(q) ||
        p.referenceNumber.toLowerCase().includes(q) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q));

      const matchesMethod = methodFilter === 'All' || p.method === methodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [payments, searchQuery, methodFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Transaction ID',
      'Customer Name',
      'Invoice / Ref',
      'Amount (₹)',
      'Payment Method',
      'Date',
      'UTR / Ref No',
      'Status',
    ];
    const rows = filteredPayments.map((p) => [
      p.transactionId,
      p.partyName,
      p.invoiceNumber || 'General Credit',
      p.amount,
      p.method,
      p.date,
      p.referenceNumber,
      p.status,
    ]);
    exportToCsv('stockin_payments_register', headers, rows);
    showToast('Exported', `Exported ${filteredPayments.length} payment records to CSV.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        title="Customer Payments Register"
        subtitle="Complete ledger of customer collections, invoice receipts, and settled transactions."
        badge={
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {payments.length} Receipts
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Register
            </button>
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Received Today"
          value={formatCurrency(receivedToday)}
          subtitle="Real-time inward cashflow"
          icon={<IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50"
          badgeText="Verified"
        />
        <StatCard
          title="Total Collections"
          value={formatCurrency(totalReceived)}
          subtitle="Cumulative sales receipts"
          icon={<ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(pendingReceivables)}
          subtitle="Pending customer credit"
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
          iconBgColor="bg-amber-50"
          badgeText="Receivable"
        />
        <StatCard
          title="Receipts Settled"
          value={totalSettledCount.toString()}
          subtitle="All inward receipts"
          icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
          iconBgColor="bg-indigo-50"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, invoice or UTR..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[38px]"
          />
        </div>

        {/* Payment Method Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {['All', 'UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque'].map((method) => (
            <button
              type="button"
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                methodFilter === method
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Payments Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {payments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <IndianRupee className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Payment Receipts Recorded</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Customer inward payments logged when generating invoices or receiving settlements will appear here.
            </p>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-xs text-xs">
            No payment receipts match your criteria.
          </div>
        ) : (
          filteredPayments.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-2.5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">{p.transactionId}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(p.date)}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 font-mono block">
                    +{formatCurrency(p.amount)}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {p.method}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{p.partyName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Ref: {p.referenceNumber}</p>
                </div>
                <div>
                  {p.invoiceNumber ? (
                    <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                      {p.invoiceNumber}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">General Credit</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Payments Table (>= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Transaction ID</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 min-w-[180px]">Customer Name</th>
                <th className="p-3.5">Linked Invoice</th>
                <th className="p-3.5">Method</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
                <th className="p-3.5">Reference / UTR</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                      <IndianRupee className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Payment Receipts Recorded</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Customer inward payments logged when generating invoices or receiving settlements will appear here.
                    </p>
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Record Payment
                    </button>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No payment receipts match your criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {p.transactionId}
                    </td>

                    <td className="p-3.5 text-slate-500 whitespace-nowrap">
                      {formatDate(p.date)}
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{p.partyName}</p>
                      <span className="text-[10px] text-slate-400">Customer Account</span>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700">
                      {p.invoiceNumber ? (
                        <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {p.invoiceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">General Credit</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {p.method}
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-black text-emerald-600">
                      +{formatCurrency(p.amount)}
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      {p.referenceNumber}
                    </td>

                    <td className="p-3.5 text-center">
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />
    </div>
  );
};
