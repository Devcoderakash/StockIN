/**
 * src/features/payments/types/index.ts
 */

export type PaymentMethod = 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque';

export interface Payment {
  id: string;
  userId?: string;
  transactionId: string;
  type: 'inward';
  partyType: 'customer';
  partyId: string;
  partyName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  referenceNumber: string;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
}
