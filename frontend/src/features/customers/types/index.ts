/**
 * src/features/customers/types/index.ts
 */

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gstin: string;
  totalOrders: number;
  totalSpent: number;
  outstanding: number;
  status: 'active' | 'inactive';
  createdAt: string;
}
