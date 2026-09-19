/**
 * src/features/stock/services/stockService.ts
 *
 * Dedicated Supabase service layer for Stock Movement operations
 */

import { supabase } from '@/lib/supabase/client';
import type { StockMovement } from '@/types';

export interface DbStockMovement {
  id: string;
  user_id: string;
  date: string;
  product_id: string;
  product_name: string;
  sku?: string | null;
  type: string;
  quantity: number;
  reference?: string | null;
  previous_stock: number;
  new_stock: number;
  reason?: string | null;
  purchase_rate?: number | null;
  created_at?: string | null;
}

export function dbToStockMovement(r: DbStockMovement): StockMovement {
  return {
    id: r.id,
    userId: r.user_id,
    date: r.date,
    productId: r.product_id,
    productName: r.product_name,
    sku: r.sku ?? '',
    type: r.type as StockMovement['type'],
    quantity: Number(r.quantity),
    reference: r.reference ?? '',
    previousStock: Number(r.previous_stock),
    newStock: Number(r.new_stock),
    reason: r.reason ?? undefined,
    purchaseRate: r.purchase_rate != null ? Number(r.purchase_rate) : undefined,
  };
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[StockService] fetchStockMovements:', error.message);
    throw error;
  }
  return (data ?? []).map((r) => dbToStockMovement(r as DbStockMovement));
}

export async function insertStockMovement(m: StockMovement): Promise<void> {
  const { error } = await supabase.from('stock_movements').insert({
    id:             m.id,
    date:           m.date,
    product_id:     m.productId,
    product_name:   m.productName,
    sku:            m.sku || null,
    type:           m.type,
    quantity:       m.quantity,
    reference:      m.reference || null,
    previous_stock: m.previousStock,
    new_stock:      m.newStock,
    reason:         m.reason || null,
    purchase_rate:  m.purchaseRate ?? null,
  });

  if (error) {
    console.error('[StockService] insertStockMovement:', error.message);
    throw error;
  }
}
