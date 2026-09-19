import React from 'react';
import { StockStatus, PaymentStatus } from '@/types';

type BadgeType = StockStatus | PaymentStatus | 'active' | 'inactive' | 'stock_in' | 'stock_out' | 'adjustment' | 'return' | 'completed' | 'pending' | 'failed' | string;

interface StatusBadgeProps {
  status: BadgeType;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      // Stock statuses
      case 'in_stock':
        return {
          text: label || 'In Stock',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500',
        };
      case 'low_stock':
        return {
          text: label || 'Low Stock',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dotColor: 'bg-amber-500',
        };
      case 'out_of_stock':
        return {
          text: label || 'Out of Stock',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dotColor: 'bg-rose-500',
        };

      // Payment statuses
      case 'paid':
      case 'completed':
        return {
          text: label || 'Paid',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500',
        };
      case 'partial':
      case 'pending':
        return {
          text: label || 'Partial',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dotColor: 'bg-amber-500',
        };
      case 'due':
      case 'failed':
        return {
          text: label || 'Due',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dotColor: 'bg-rose-500',
        };

      // Generic active/inactive
      case 'active':
        return {
          text: label || 'Active',
          className: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dotColor: 'bg-blue-500',
        };
      case 'inactive':
        return {
          text: label || 'Inactive',
          className: 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: 'bg-slate-400',
        };

      // Stock movements
      case 'stock_in':
        return {
          text: label || 'Stock In',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500',
        };
      case 'stock_out':
        return {
          text: label || 'Stock Out',
          className: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dotColor: 'bg-blue-500',
        };
      case 'adjustment':
        return {
          text: label || 'Adjustment',
          className: 'bg-purple-50 text-purple-700 border-purple-200/80',
          dotColor: 'bg-purple-500',
        };
      // Quotation statuses
      case 'draft':
        return {
          text: label || 'Draft',
          className: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dotColor: 'bg-amber-500',
        };
      case 'sent':
        return {
          text: label || 'Sent',
          className: 'bg-sky-50 text-sky-700 border-sky-200/80',
          dotColor: 'bg-sky-500',
        };
      case 'accepted':
        return {
          text: label || 'Accepted',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500',
        };
      case 'rejected':
        return {
          text: label || 'Rejected',
          className: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dotColor: 'bg-rose-500',
        };
      case 'expired':
        return {
          text: label || 'Expired',
          className: 'bg-slate-100 text-slate-600 border-slate-300',
          dotColor: 'bg-slate-400',
        };
      case 'converted':
        return {
          text: label || 'Converted',
          className: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dotColor: 'bg-blue-500',
        };

      default:
        return {
          text: label || String(status),
          className: 'bg-slate-100 text-slate-700 border-slate-200',
          dotColor: 'bg-slate-500',
        };
    }
  };

  const config = getBadgeConfig();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.className} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotColor}`} />
      {config.text}
    </span>
  );
};
