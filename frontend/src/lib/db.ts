
/**
 * src/lib/db.ts
 *
 * StockIN Unified Database Service Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Composes specialized feature services and provides backward compatibility.
 * All domain-specific DB logic is modularized under src/features/<feature>/services/.
 */

import { supabase } from './supabase/client';
import type {
  Product,
  Customer,
  Invoice,
  Quotation,
  StockMovement,
  Payment,
  BusinessSettings,
} from '@/types';

// Re-export feature services
export {
  fetchProducts,
  insertProduct as dbInsertProduct,
  updateProduct as dbUpdateProduct,
  deleteProduct as dbDeleteProduct,
  archiveProduct as dbArchiveProduct,
  dbToProduct,
} from '@/features/products/services/productService';

export {
  fetchCustomers,
  insertCustomer as dbInsertCustomer,
  updateCustomer as dbUpdateCustomer,
  deleteCustomer as dbDeleteCustomer,
  deactivateCustomer as dbDeactivateCustomer,
  dbToCustomer,
} from '@/features/customers/services/customerService';

export {
  fetchInvoices,
  insertInvoice as dbInsertInvoice,
  createInvoiceAtomic as dbCreateInvoiceAtomic,
  type CreateInvoiceAtomicResult,
  updateInvoiceFinancials as dbUpdateInvoiceFinancials,
  deleteInvoice as dbDeleteInvoice,
  updateInvoiceStorageMetadata as dbUpdateInvoiceStorageMetadata,
  dbToInvoice,
  dbToInvoiceItem,
} from '@/features/invoices/services/invoiceService';

export {
  fetchQuotations,
  insertQuotation as dbInsertQuotation,
  updateQuotation as dbUpdateQuotation,
  deleteQuotation as dbDeleteQuotation,
  convertQuotationToInvoice as dbConvertQuotation,
  updateQuotationStorageMetadata as dbUpdateQuotationStorageMetadata,
  dbToQuotation,
  dbToQuotationItem,
  type ConvertResult,
} from '@/features/quotations/services/quotationService';

export {
  fetchStockMovements,
  insertStockMovement as dbInsertStockMovement,
  dbToStockMovement,
} from '@/features/stock/services/stockService';

export {
  fetchPayments,
  insertPayment as dbInsertPayment,
  deletePayment as dbDeletePayment,
  dbToPayment,
} from '@/features/payments/services/paymentService';

export {
  fetchBusinessSettings,
  upsertBusinessSettings as dbUpsertSettings,
  dbToSettings,
} from '@/features/settings/services/settingsService';

import { dbToProduct, type DbProduct } from '@/features/products/services/productService';
import { dbToCustomer, type DbCustomer } from '@/features/customers/services/customerService';
import { dbToInvoice, type DbInvoice } from '@/features/invoices/services/invoiceService';
import { dbToQuotation, type DbQuotation } from '@/features/quotations/services/quotationService';
import { dbToStockMovement, type DbStockMovement } from '@/features/stock/services/stockService';
import { dbToPayment, type DbPayment } from '@/features/payments/services/paymentService';

export interface AllUserData {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  quotations: Quotation[];
  stockMovements: StockMovement[];
  payments: Payment[];
  settings: BusinessSettings | null;
}

/**
 * High-performance parallel fetch for all initial user data on app load/login
 */
export async function fetchAllUserData(): Promise<AllUserData> {
  const [
    { data: products,       error: e1 },
    { data: customers,      error: e2 },
    { data: invoices,       error: e3 },
    { data: quotations,     error: e4 },
    { data: movements,      error: e5 },
    { data: payments,       error: e6 },
    { data: settingsRows,   error: e7 },
  ] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('customers').select('*').order('created_at', { ascending: false }),
    supabase.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: false }),
    supabase.from('quotations').select('*, quotation_items(*)').order('created_at', { ascending: false }),
    supabase.from('stock_movements').select('*').order('created_at', { ascending: false }),
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
    supabase.from('business_settings').select('*').limit(1),
  ]);

  if (e1) console.error('[DB] products:', e1.message);
  if (e2) console.error('[DB] customers:', e2.message);
  if (e3) console.error('[DB] invoices:', e3.message);
  if (e4) console.error('[DB] quotations:', e4.message);
  if (e5) console.error('[DB] stock_movements:', e5.message);
  if (e6) console.error('[DB] payments:', e6.message);
  if (e7) console.error('[DB] business_settings:', e7.message);

  let settings: BusinessSettings | null = null;
  if (settingsRows && settingsRows.length > 0 && settingsRows[0].settings) {
    settings = settingsRows[0].settings as BusinessSettings;
  }

  return {
    products:       (products ?? []).map((r) => dbToProduct(r as DbProduct)),
    customers:      (customers ?? []).map((r) => dbToCustomer(r as DbCustomer)),
    invoices:       (invoices ?? []).map((r) => dbToInvoice(r as DbInvoice)),
    quotations:     (quotations ?? []).map((r) => dbToQuotation(r as DbQuotation)),
    stockMovements: (movements ?? []).map((r) => dbToStockMovement(r as DbStockMovement)),
    payments:       (payments ?? []).map((r) => dbToPayment(r as DbPayment)),
    settings,
  };
}
