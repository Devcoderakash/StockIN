/**
 * src/features/customers/hooks/useCustomers.ts
 *
 * Feature hook providing customer CRM state and mutations
 */

import { useAppState } from '@/context/AppStateContext';

export function useCustomers() {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    isDataLoading,
  } = useAppState();

  const getCustomerById = (id: string) => customers.find((c) => c.id === id);

  return {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    isLoading: isDataLoading,
  };
}
