/**
 * src/features/customers/services/customerService.ts
 *
 * Dedicated Supabase service layer for Customer operations
 */

import { supabase } from '@/lib/supabase/client';
import type { Customer } from '@/types';

export interface DbCustomer {
  id: string;
  user_id: string;
  name: string;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  gstin?: string | null;
  total_orders: number;
  total_spent: number;
  outstanding: number;
  status: string;
  created_at?: string | null;
}

export function dbToCustomer(r: DbCustomer): Customer {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    companyName: r.company_name ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    address: r.address ?? '',
    city: r.city ?? '',
    state: r.state ?? '',
    gstin: r.gstin ?? '',
    totalOrders: Number(r.total_orders),
    totalSpent: Number(r.total_spent),
    outstanding: Number(r.outstanding),
    status: r.status as Customer['status'],
    createdAt: r.created_at ?? new Date().toISOString().split('T')[0],
  };
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[CustomerService] fetchCustomers:', error.message);
    throw error;
  }
  return (data ?? []).map((r) => dbToCustomer(r as DbCustomer));
}

export async function insertCustomer(c: Customer): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = c.userId || userData.user?.id;

  const { error } = await supabase.from('customers').insert({
    id:           c.id,
    user_id:      userId,
    name:         c.name,
    company_name: c.companyName || null,
    phone:        c.phone || null,
    email:        c.email || null,
    address:      c.address || null,
    city:         c.city || null,
    state:        c.state || null,
    gstin:        c.gstin || null,
    total_orders: c.totalOrders,
    total_spent:  c.totalSpent,
    outstanding:  c.outstanding,
    status:       c.status,
  });
  if (error) {
    console.error('[CustomerService] insertCustomer:', error.message);
    throw error;
  }
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.name         !== undefined) patch.name         = updates.name;
  if (updates.companyName  !== undefined) patch.company_name = updates.companyName || null;
  if (updates.phone        !== undefined) patch.phone        = updates.phone || null;
  if (updates.email        !== undefined) patch.email        = updates.email || null;
  if (updates.address      !== undefined) patch.address      = updates.address || null;
  if (updates.city         !== undefined) patch.city         = updates.city || null;
  if (updates.state        !== undefined) patch.state        = updates.state || null;
  if (updates.gstin        !== undefined) patch.gstin        = updates.gstin || null;
  if (updates.totalOrders  !== undefined) patch.total_orders = updates.totalOrders;
  if (updates.totalSpent   !== undefined) patch.total_spent  = updates.totalSpent;
  if (updates.outstanding  !== undefined) patch.outstanding  = updates.outstanding;
  if (updates.status       !== undefined) patch.status       = updates.status;

  const { error } = await supabase.from('customers').update(patch).eq('id', id);
  if (error) {
    console.error('[CustomerService] updateCustomer:', error.message);
    throw error;
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) {
    console.error('[CustomerService] deleteCustomer:', error.message);
    throw error;
  }
}

export async function deactivateCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers')
    .update({ status: 'inactive' })
    .eq('id', id);
  if (error) {
    console.error('[CustomerService] deactivateCustomer:', error.message);
    throw error;
  }
}
