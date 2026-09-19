/**
 * src/features/stock/hooks/useStock.ts
 *
 * Feature hook providing stock movements and adjustment actions
 */

import { useAppState } from '@/context/AppStateContext';

export function useStock() {
  const {
    products,
    stockMovements,
    adjustStock,
    isDataLoading,
  } = useAppState();

  const getMovementsByProductId = (productId: string) => {
    return stockMovements.filter((m) => m.productId === productId);
  };

  return {
    products,
    stockMovements,
    adjustStock,
    getMovementsByProductId,
    isLoading: isDataLoading,
  };
}
