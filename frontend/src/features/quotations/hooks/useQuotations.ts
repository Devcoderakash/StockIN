/**
 * src/features/quotations/hooks/useQuotations.ts
 *
 * Feature hook providing quotations state, actions and conversion
 */

import { useAppState } from '@/context/AppStateContext';

export function useQuotations() {
  const {
    quotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    duplicateQuotation,
    updateQuotationStatus,
    generateQuotationNumber,
    convertQuotationToInvoice,
    isDataLoading,
  } = useAppState();

  const getQuotationById = (id: string) => quotations.find((q) => q.id === id);

  return {
    quotations,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    duplicateQuotation,
    updateQuotationStatus,
    generateQuotationNumber,
    convertQuotationToInvoice,
    getQuotationById,
    isLoading: isDataLoading,
  };
}
