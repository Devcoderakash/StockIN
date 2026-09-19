/**
 * src/hooks/index.ts
 *
 * Centralized export point for application and feature hooks
 */

export { useAuth } from '@/features/auth/hooks/useAuth';
export { useProducts } from '@/features/products/hooks/useProducts';
export { useCustomers } from '@/features/customers/hooks/useCustomers';
export { useStock } from '@/features/stock/hooks/useStock';
export { useQuotations } from '@/features/quotations/hooks/useQuotations';
export { useInvoices } from '@/features/invoices/hooks/useInvoices';
export { usePayments } from '@/features/payments/hooks/usePayments';
export { useSettings } from '@/features/settings/hooks/useSettings';
export { useAppState } from '@/context/AppStateContext';
