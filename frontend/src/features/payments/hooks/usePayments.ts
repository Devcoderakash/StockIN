/**
 * src/features/payments/hooks/usePayments.ts
 *
 * Feature hook providing payments ledger and payment recording
 */

import { useAppState } from '@/context/AppStateContext';

export function usePayments() {
  const {
    payments,
    addPayment,
    isDataLoading,
  } = useAppState();

  const getPaymentsByInvoiceId = (invoiceId: string) => {
    return payments.filter((p) => p.invoiceId === invoiceId);
  };

  return {
    payments,
    addPayment,
    getPaymentsByInvoiceId,
    isLoading: isDataLoading,
  };
}
