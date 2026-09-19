/**
 * src/features/stock/types/index.ts
 */

export type MovementType = 'stock_in' | 'stock_out' | 'adjustment' | 'return';

export interface StockMovement {
  id: string;
  userId?: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantity: number;
  reference: string;
  previousStock: number;
  newStock: number;
  reason?: string;
  purchaseRate?: number;
}
