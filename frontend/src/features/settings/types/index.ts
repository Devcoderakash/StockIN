/**
 * src/features/settings/types/index.ts
 */

export interface BusinessSettings {
  userId?: string;
  isConfigured?: boolean;
  businessName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  pan: string;
  currency: string;
  currencySymbol: string;
  invoicePrefix: string;
  quotationPrefix?: string;
  defaultTaxRate: number;
  paymentTerms: string;
  footerMessage: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  theme: 'light' | 'dark';
  density: 'comfortable' | 'compact';
}
