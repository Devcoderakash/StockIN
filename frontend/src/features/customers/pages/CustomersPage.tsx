import React, { useState, useMemo } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { CustomerModal } from '@/components/customers/CustomerModal';
import { CustomerDetailDrawer } from '@/components/customers/CustomerDetailDrawer';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Customer } from '@/types';
import { formatCurrency, formatIndianNumber } from '@/utils/formatters';
import { exportToCsv } from '@/utils/exportCsv';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Plus,
  Download,
  Search,
  Eye,
  Edit2,
  Trash2,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { customers, deleteCustomer, showToast } = useAppState();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'active' | 'inactive'>('All');

  // Modal & Drawer
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);

  // Top Card Stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstanding, 0);
  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.companyName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Customer Name',
      'Company Name',
      'Phone',
      'Email',
      'City',
      'State',
      'GSTIN',
      'Total Orders',
      'Total Spent (₹)',
      'Outstanding Balance (₹)',
      'Status',
    ];
    const rows = filteredCustomers.map((c) => [
      c.name,
      c.companyName,
      c.phone,
      c.email,
      c.city,
      c.state,
      c.gstin,
      c.totalOrders,
      c.totalSpent,
      c.outstanding,
      c.status,
    ]);
    exportToCsv('stockin_customers_directory', headers, rows);
    showToast('Exported', `Exported ${filteredCustomers.length} customer records to CSV.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Customer CRM"
        subtitle="Manage business relationships, contact profiles, sales ledgers, and credit outstanding balances."
        badge={
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {customers.length} Accounts
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
              onClick={() => {
                setEditingCustomer(null);
                setIsCustomerModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Customers"
          value={formatIndianNumber(totalCustomers)}
          subtitle="Registered accounts"
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
          iconBgColor="bg-blue-50"
        />
        <StatCard
          title="Active Clients"
          value={formatIndianNumber(activeCustomers)}
          subtitle="Recent 90-day orders"
          icon={<UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="Pending receivables"
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />}
          iconBgColor="bg-rose-50"
          badgeText="Due"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalSpentAll)}
          subtitle="Lifetime sales"
          icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
          iconBgColor="bg-purple-50"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, phone, city..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 min-h-[38px]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(['All', 'active', 'inactive'] as const).map((st) => (
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

      {/* Mobile Customers Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {customers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No Customers Added Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Create customer records with GSTIN, phone, and billing addresses to issue instant bills and track accounts receivable.
            </p>
            <button
              onClick={() => {
                setEditingCustomer(null);
                setIsCustomerModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Add First Customer
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-xs text-xs">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No customers found matching this criteria.
          </div>
        ) : (
          filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              onClick={() => {
                setSelectedCustomer(cust);
                setIsDrawerOpen(true);
              }}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs border border-slate-200">
                    {cust.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">
                      {cust.companyName || cust.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {cust.name} • {cust.city}
                    </p>
                  </div>
                </div>
                <StatusBadge status={cust.status} />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Total Spent</span>
                  <span className="font-bold text-slate-900 font-mono">{formatCurrency(cust.totalSpent)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Outstanding</span>
                  <span className={`font-bold font-mono ${cust.outstanding > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {formatCurrency(cust.outstanding)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <span>Phone: {cust.phone}</span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setIsDrawerOpen(true);
                    }}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                    title="View Profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingCustomer(cust);
                      setIsCustomerModalOpen(true);
                    }}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCustomerToDelete(cust.id)}
                    className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Customers Table (>= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 min-w-[200px]">Customer / Company</th>
                <th className="p-3.5">Contact Phone</th>
                <th className="p-3.5">Email</th>
                <th className="p-3.5 text-center">Orders</th>
                <th className="p-3.5 text-right">Total Spent (₹)</th>
                <th className="p-3.5 text-right">Outstanding (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Customers Added Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Create customer records with GSTIN, phone, and billing addresses to issue instant bills and track accounts receivable.
                    </p>
                    <button
                      onClick={() => {
                        setEditingCustomer(null);
                        setIsCustomerModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Customer
                    </button>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No customers found matching this criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomer(cust);
                      setIsDrawerOpen(true);
                    }}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs border border-slate-200">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {cust.companyName || cust.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {cust.name} • {cust.city}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 text-slate-700 whitespace-nowrap">{cust.phone}</td>

                    <td className="p-3.5 text-slate-500 whitespace-nowrap max-w-[150px] truncate">
                      {cust.email || '—'}
                    </td>

                    <td className="p-3.5 text-center font-semibold text-slate-700">
                      {cust.totalOrders}
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(cust.totalSpent)}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          cust.outstanding > 0 ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {formatCurrency(cust.outstanding)}
                      </span>
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <StatusBadge status={cust.status} />
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setIsDrawerOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View 360 Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCustomer(cust);
                            setIsCustomerModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setCustomerToDelete(cust.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Customer"
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

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        customerToEdit={editingCustomer}
      />

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onEdit={(cust) => {
          setEditingCustomer(cust);
          setIsCustomerModalOpen(true);
        }}
        onDelete={(id) => setCustomerToDelete(id)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={() => {
          if (customerToDelete) {
            deleteCustomer(customerToDelete);
            setCustomerToDelete(null);
          }
        }}
        title="Delete Customer Account"
        message="Are you sure you want to remove this customer? Associated past invoices will remain preserved in historical audit ledgers."
        confirmText="Delete Customer"
      />
    </div>
  );
};
