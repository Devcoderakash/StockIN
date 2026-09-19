/**
 * src/features/products/types/index.ts
 */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'archived';

export interface Product {
  id: string;
  userId?: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  lowStockThreshold?: number;
  taxRate: number; // GST % (0, 5, 12, 18, 28)
  gstRate?: number;
  hsnCode: string;
  description: string;
  status: StockStatus;
  createdAt?: string;
  updatedAt: string;
}
