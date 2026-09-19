/**
 * src/types/index.ts
 *
 * Centralized entry point for TypeScript types.
 * Domain-specific types are modularized inside their respective feature folders.
 */

// Domain Feature Types
export * from '@/features/products/types';
export * from '@/features/customers/types';
export * from '@/features/invoices/types';
export * from '@/features/quotations/types';
export * from '@/features/history/types';
export * from '@/features/stock/types';
export * from '@/features/payments/types';
export * from '@/features/settings/types';
export * from '@/features/auth/types';

// Global Cross-Cutting Types
export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'stock' | 'invoice' | 'payment' | 'system';
  read: boolean;
  link?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
}
