/**
 * src/features/products/hooks/useProducts.ts
 *
 * Feature hook providing product inventory state and mutations
 */

import { useAppState } from '@/context/AppStateContext';

export function useProducts() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    isDataLoading,
  } = useAppState();

  const getProductById = (id: string) => products.find((p) => p.id === id);

  return {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    duplicateProduct,
    getProductById,
    isLoading: isDataLoading,
  };
}
