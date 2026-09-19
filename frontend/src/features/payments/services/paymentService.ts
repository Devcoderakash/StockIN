/**
 * src/features/payments/services/paymentService.ts
 *
 * Dedicated Supabase service layer for Payment operations
 */

import { supabase } from '@/lib/supabase/client';
import type { Payment } from '@/types';

export interface DbPayment {
  id: string;
  user_id: string;
  transaction_id: string;
  type: string;
  party_type: string;
  party_id?: string | null;
  party_name: string;
  invoice_id?: string | null;
  invoice_number?: string | null;
  amount: number;
  method: string;
  date: string;
  reference_number?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string | null;
}

export function dbToPayment(r: DbPayment): Payment {
  return {
    id: r.id,
    userId: r.user_id,
    transactionId: r.transaction_id,
    type: r.type as Payment['type'],
    partyType: r.party_type as Payment['partyType'],
    partyId: r.party_id ?? '',
    partyName: r.party_name,
    invoiceId: r.invoice_id ?? undefined,
    invoiceNumber: r.invoice_number ?? undefined,
    amount: Number(r.amount),
    method: r.method as Payment['method'],
    date: r.date,
    referenceNumber: r.reference_number ?? '',
    status: r.status as Payment['status'],
    notes: r.notes ?? undefined,
  };
}

export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[PaymentService] fetchPayments:', error.message);
    throw error;
  }
  return (data ?? []).map((r) => dbToPayment(r as DbPayment));
}

export async function insertPayment(p: Payment): Promise<void> {
  const { error } = await supabase.from('payments').insert({
    id:               p.id,
    transaction_id:   p.transactionId,
    type:             p.type,
    party_type:       p.partyType,
    party_id:         p.partyId || null,
    party_name:       p.partyName,
    invoice_id:       p.invoiceId || null,
    invoice_number:   p.invoiceNumber || null,
    amount:           p.amount,
    method:           p.method,
    date:             p.date,
    reference_number: p.referenceNumber || null,
    status:           p.status,
    notes:            p.notes || null,
  });

  if (error) {
    console.error('[PaymentService] insertPayment:', error.message);
    throw error;
  }
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) {
    console.error('[PaymentService] deletePayment:', error.message);
    throw error;
  }
}
