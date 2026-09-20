/**
 * src/features/products/types/index.ts
 */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'archived';
export type BillingType = 'standard' | 'dimension';
export type DimensionType = 'length_width' | 'length_width_height';
export type DimensionUnit = 'ft' | 'in' | 'm' | 'cm';
export type BillingAreaUnit = 'sq.ft' | 'sq.in' | 'sq.m' | 'sq.cm';

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
  billingType?: BillingType;
  dimensionType?: DimensionType;
  dimensionUnit?: DimensionUnit;
  billingUnit?: BillingAreaUnit | string;
  createdAt?: string;
  updatedAt: string;
}
