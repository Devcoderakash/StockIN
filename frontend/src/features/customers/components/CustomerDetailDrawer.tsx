import React from 'react';
import { Drawer } from '@/components/common/Drawer';
import { Customer } from '@/types';
import { useAppState } from '@/context/AppStateContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { Edit2, Plus, Trash2, Phone, Mail, MapPin, FileText, IndianRupee } from 'lucide-react';

interface CustomerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  isOpen,
  onClose,
  customer,
  onEdit,
  onDelete,
}) => {
  const { invoices, payments } = useAppState();
  const navigate = useNavigate();

  if (!customer) return null;

  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const customerPayments = payments.filter((p) => p.partyId === customer.id);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={customer.companyName || customer.name}
      subtitle={`Customer Account #${customer.id.toUpperCase()}`}
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => {
              onDelete(customer.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onEdit(customer);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            <button
              onClick={() => {
                navigate('/billing');
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Financial KPI Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-500 font-medium">Total Orders</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{customer.totalOrders}</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-500 font-medium">Total Spent</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              {formatCurrency(customer.totalSpent)}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] text-slate-500 font-medium">Outstanding</p>
            <p
              className={`text-lg font-bold mt-0.5 ${
                customer.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {formatCurrency(customer.outstanding)}
            </p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="p-4 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="font-bold text-slate-900">Contact Details</h4>
            <StatusBadge status={customer.status} />
          </div>
          <div className="space-y-2 text-slate-600">
            <p className="font-semibold text-slate-800">Contact Person: {customer.name}</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{customer.phone}</span>
            </div>
            {customer.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer.email}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
              <span>
                {customer.address}, {customer.city}, {customer.state}
              </span>
            </div>
            {customer.gstin && (
              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <span className="text-slate-500">GSTIN:</span>
                <span className="font-mono font-bold text-slate-800">{customer.gstin}</span>
              </div>
            )}
          </div>
        </div>

        {/* Linked Invoices */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Invoice History ({customerInvoices.length})
            </h4>
          </div>

          {customerInvoices.length === 0 ? (
            <p className="text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
              No invoices generated for this client yet.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {customerInvoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => {
                    navigate('/invoices');
                    onClose();
                  }}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">{inv.invoiceNumber}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(inv.date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm">
                      {formatCurrency(inv.grandTotal)}
                    </span>
                    {inv.balance > 0 && (
                      <p className="text-[11px] text-rose-600">
                        Due: {formatCurrency(inv.balance)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Payments */}
        <div>
          <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> Payment Receipts ({customerPayments.length})
          </h4>

          {customerPayments.length === 0 ? (
            <p className="text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
              No payments recorded yet.
            </p>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
              {customerPayments.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{p.transactionId}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                        {p.method}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(p.date)}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600">
                      +{formatCurrency(p.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
