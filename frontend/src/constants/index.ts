/**
 * src/constants/index.ts
 *
 * Application-wide business constants for StockIN
 */

export const APP_NAME = 'StockIN';
export const APP_TAGLINE = 'Inventory, Quotation & Invoicing Suite';

export const CURRENCY = {
  SYMBOL: '₹',
  CODE: 'INR',
  LOCALE: 'en-IN',
};

export const PRODUCT_CATEGORIES = [
  'Office Furniture',
  'Living & Lounge',
  'Storage & Filing',
  'Dining & Cafe',
  'Commercial Fixtures',
  'Lighting',
  'Accessories',
  'Raw Materials',
] as const;

export const PRODUCT_UNITS = [
  'Pcs',
  'Sets',
  'Boxes',
  'Pairs',
  'Kg',
  'Mtr',
  'Ltr',
] as const;

export const GST_TAX_RATES = [0, 5, 12, 18, 28] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Cheque',
  'Card',
] as const;

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'paid',
  'partial',
  'overdue',
  'cancelled',
] as const;

export const QUOTATION_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'converted',
] as const;

export const STOCK_MOVEMENT_TYPES = [
  'stock_in',
  'stock_out',
  'adjustment',
] as const;
