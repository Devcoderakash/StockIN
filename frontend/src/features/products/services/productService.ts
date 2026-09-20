/**
 * src/features/products/services/productService.ts
 *
 * Dedicated Supabase service layer for Product operations
 */

import { supabase } from '@/lib/supabase/client';
import type { Product } from '@/types';

export interface DbProduct {
  id: string;
  user_id: string;
  name: string;
  sku: string;
  category?: string | null;
  brand?: string | null;
  unit?: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  low_stock_threshold?: number | null;
  tax_rate: number;
  gst_rate?: number | null;
  hsn_code?: string | null;
  description?: string | null;
  billing_type?: string | null;
  dimension_type?: string | null;
  dimension_unit?: string | null;
  billing_unit?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export function dbToProduct(r: DbProduct): Product {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    sku: r.sku,
    category: r.category ?? '',
    brand: r.brand ?? '',
    unit: r.unit ?? '',
    purchasePrice: Number(r.purchase_price),
    sellingPrice: Number(r.selling_price),
    stock: Number(r.stock),
    minStock: Number(r.min_stock),
    lowStockThreshold: r.low_stock_threshold != null ? Number(r.low_stock_threshold) : undefined,
    taxRate: Number(r.tax_rate),
    gstRate: r.gst_rate != null ? Number(r.gst_rate) : undefined,
    hsnCode: r.hsn_code ?? '',
    description: r.description ?? '',
    billingType: (r.billing_type as Product['billingType']) || 'standard',
    dimensionType: (r.dimension_type as Product['dimensionType']) || 'length_width',
    dimensionUnit: (r.dimension_unit as Product['dimensionUnit']) || 'ft',
    billingUnit: (r.billing_unit as Product['billingUnit']) || 'sq.ft',
    status: r.status as Product['status'],
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? new Date().toISOString().split('T')[0],
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ProductService] fetchProducts:', error.message);
    throw error;
  }
  return (data ?? []).map((r) => dbToProduct(r as DbProduct));
}

export async function insertProduct(p: Product): Promise<void> {
  const { error } = await supabase.from('products').insert({
    id:                  p.id,
    name:                p.name,
    sku:                 p.sku || ('PRD-' + Date.now().toString().slice(-7)),
    category:            p.category || null,
    brand:               p.brand || null,
    unit:                p.unit || null,
    purchase_price:      p.purchasePrice,
    selling_price:       p.sellingPrice,
    stock:               p.stock,
    min_stock:           p.minStock,
    low_stock_threshold: p.lowStockThreshold ?? p.minStock,
    tax_rate:            p.taxRate,
    gst_rate:            p.gstRate ?? p.taxRate,
    hsn_code:            p.hsnCode || null,
    description:         p.description || null,
    billing_type:        p.billingType || 'standard',
    dimension_type:      p.dimensionType || 'length_width',
    dimension_unit:      p.dimensionUnit || 'ft',
    billing_unit:        p.billingUnit || 'sq.ft',
    status:              p.status,
  });
  if (error) {
    console.error('[ProductService] insertProduct:', error.message);
    throw error;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name              !== undefined) patch.name                = updates.name;
  if (updates.sku               !== undefined) patch.sku                 = updates.sku;
  if (updates.category          !== undefined) patch.category            = updates.category || null;
  if (updates.brand             !== undefined) patch.brand               = updates.brand || null;
  if (updates.unit              !== undefined) patch.unit                = updates.unit || null;
  if (updates.purchasePrice     !== undefined) patch.purchase_price      = updates.purchasePrice;
  if (updates.sellingPrice      !== undefined) patch.selling_price       = updates.sellingPrice;
  if (updates.stock             !== undefined) patch.stock               = updates.stock;
  if (updates.minStock          !== undefined) patch.min_stock           = updates.minStock;
  if (updates.lowStockThreshold !== undefined) patch.low_stock_threshold = updates.lowStockThreshold;
  if (updates.taxRate           !== undefined) patch.tax_rate            = updates.taxRate;
  if (updates.gstRate           !== undefined) patch.gst_rate            = updates.gstRate;
  if (updates.hsnCode           !== undefined) patch.hsn_code            = updates.hsnCode || null;
  if (updates.description       !== undefined) patch.description         = updates.description || null;
  if (updates.billingType       !== undefined) patch.billing_type        = updates.billingType;
  if (updates.dimensionType     !== undefined) patch.dimension_type      = updates.dimensionType;
  if (updates.dimensionUnit     !== undefined) patch.dimension_unit      = updates.dimensionUnit;
  if (updates.billingUnit       !== undefined) patch.billing_unit        = updates.billingUnit;
  if (updates.status            !== undefined) patch.status              = updates.status;

  const { error } = await supabase.from('products').update(patch).eq('id', id);
  if (error) {
    console.error('[ProductService] updateProduct:', error.message);
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    console.error('[ProductService] deleteProduct:', error.message);
    throw error;
  }
}

export async function archiveProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[ProductService] archiveProduct:', error.message);
    throw error;
  }
}
