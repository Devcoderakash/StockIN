/**
 * src/features/invoices/hooks/useInvoices.ts
 *
 * Feature hook providing invoice and billing operations
 */

import { useAppState } from '@/context/AppStateContext';

export function useInvoices() {
  const {
    invoices,
    addInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    generateInvoiceNumber,
    isDataLoading,
  } = useAppState();

  const getInvoiceById = (id: string) => invoices.find((i) => i.id === id);

  return {
    invoices,
    addInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    generateInvoiceNumber,
    getInvoiceById,
    isLoading: isDataLoading,
  };
}
