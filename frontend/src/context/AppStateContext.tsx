/**
 * src/context/AppStateContext.tsx
 *
 * StockIN — Central Application State + Supabase DB Integration
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE:
 *  - On login: fetchAllUserData() from Supabase → hydrates React state
 *  - All mutations: update React state immediately (optimistic) + async DB write
 *  - convertQuotationToInvoice: async, delegates to Supabase RPC (atomic)
 *  - Notifications: React state only (ephemeral per session)
 *  - Settings: Supabase business_settings table (JSONB)
 *
 * NO localStorage is used for business data persistence.
 * Supabase Auth handles session persistence via secure cookies/storage.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  Product,
  Customer,
  Invoice,
  Payment,
  StockMovement,
  Notification,
  BusinessSettings,
  ToastMessage,
  MovementType,
  PaymentStatus,
  Quotation,
  QuotationStatus,
  InvoiceItem,
} from '../types';
import {
  fetchAllUserData,
  dbInsertProduct,
  dbUpdateProduct,
  dbDeleteProduct,
  dbArchiveProduct,
  dbInsertCustomer,
  dbUpdateCustomer,
  dbDeleteCustomer,
  dbDeactivateCustomer,
  dbCreateInvoiceAtomic,
  dbUpdateInvoiceFinancials,
  dbDeleteInvoice,
  dbInsertQuotation,
  dbUpdateQuotation,
  dbDeleteQuotation,
  dbInsertStockMovement,
  dbInsertPayment,
  dbUpsertSettings,
  dbConvertQuotation,
} from '../lib/db';
import { uploadInvoicePdf, uploadQuotationPdf } from '@/services/storage/documentStorageService';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface StockInData {
  productId: string;
  quantity: number;
  purchaseRate?: number;
  date: string;
  reason: string;
  reference?: string;
  notes?: string;
}

interface AppStateContextType {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  quotations: Quotation[];
  stockMovements: StockMovement[];
  payments: Payment[];
  notifications: Notification[];
  settings: BusinessSettings;
  toasts: ToastMessage[];
  isDataLoading: boolean;

  // Products
  addProduct: (product: Omit<Product, 'id' | 'updatedAt' | 'status'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;

  // Customers
  addCustomer: (customer: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'outstanding' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Invoices & Billing
  addInvoice: (invoice: Omit<Invoice, 'id'>, paymentMethod?: string) => Promise<string | null>;
  updateInvoiceStatus: (id: string, status: PaymentStatus, paidAmount?: number) => void;
  deleteInvoice: (id: string) => void;
  generateInvoiceNumber: () => string;

  // Quotations
  addQuotation: (quotation: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  duplicateQuotation: (id: string) => string;
  updateQuotationStatus: (id: string, status: QuotationStatus) => void;
  generateQuotationNumber: () => string;
  // Async — delegates to atomic Supabase RPC
  convertQuotationToInvoice: (quotationId: string) => Promise<{ success: boolean; invoiceId?: string; error?: string }>;

  // Stock Management
  addStockIn: (data: StockInData) => void;
  adjustStock: (productId: string, quantity: number, type: MovementType, reason?: string) => void;

  // Payments
  addPayment: (payment: Omit<Payment, 'id' | 'transactionId' | 'type' | 'partyType'>) => void;

  // Notifications
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;

  // Settings
  updateSettings: (updates: Partial<BusinessSettings>) => void;
  setupBusiness: (setupData: Partial<BusinessSettings>) => void;
  resetToDefaults: () => void;
  clearAllData: () => void;

  // Toasts
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

export const defaultBusinessSettings: BusinessSettings = {
  isConfigured: false,
  businessName: '',
  tagline: 'Inventory & Billing Management',
  ownerName: 'Admin',
  phone: '',
  email: '',
  address: '',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pincode: '462011',
  gstin: '',
  pan: '',
  currency: 'INR',
  currencySymbol: '₹',
  invoicePrefix: 'INV-',
  quotationPrefix: 'QT-',
  defaultTaxRate: 18,
  paymentTerms: 'Due on Receipt',
  footerMessage: 'Thank you for your business. For electronic transfers, use the bank details provided.',
  bankName: 'HDFC Bank Ltd',
  accountNumber: '',
  ifscCode: '',
  upiId: '',
  theme: 'light',
  density: 'comfortable',
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const currentUserId = user ? user.id : null;

  // ── React State ──────────────────────────────────────────────────────────
  const [products, setProducts]               = useState<Product[]>([]);
  const [customers, setCustomers]             = useState<Customer[]>([]);
  const [invoices, setInvoices]               = useState<Invoice[]>([]);
  const [quotations, setQuotations]           = useState<Quotation[]>([]);
  const [stockMovements, setStockMovements]   = useState<StockMovement[]>([]);
  const [payments, setPayments]               = useState<Payment[]>([]);
  const [notifications, setNotifications]     = useState<Notification[]>([]);
  const [settings, setSettings]               = useState<BusinessSettings>(defaultBusinessSettings);
  const [toasts, setToasts]                   = useState<ToastMessage[]>([]);
  const [isDataLoading, setIsDataLoading]     = useState<boolean>(false);

  // ── Initial Data Load (Supabase fetch on login / user change) ────────────
  useEffect(() => {
    if (!currentUserId) {
      // User logged out — clear all state
      setProducts([]);
      setCustomers([]);
      setInvoices([]);
      setQuotations([]);
      setStockMovements([]);
      setPayments([]);
      setNotifications([]);
      setSettings(defaultBusinessSettings);
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);

    fetchAllUserData()
      .then((data) => {
        setProducts(data.products);
        setCustomers(data.customers);
        setInvoices(data.invoices);
        setQuotations(data.quotations);
        setStockMovements(data.stockMovements);
        setPayments(data.payments);

        if (data.settings && data.settings.businessName) {
          // Saved settings found — use them
          setSettings({
            ...defaultBusinessSettings,
            ...data.settings,
            isConfigured: true,
            userId: currentUserId,
          });
        } else {
          // No saved settings yet — seed from auth user metadata
          const meta = user?.user_metadata || {};
          setSettings({
            ...defaultBusinessSettings,
            businessName: meta.business_name || meta.businessName || '',
            ownerName: meta.full_name || meta.fullName || user?.email?.split('@')[0] || 'Admin',
            email: user?.email || '',
            isConfigured: Boolean(meta.business_name || meta.businessName),
            userId: currentUserId,
          });
        }
      })
      .catch((err) => {
        console.error('[AppState] fetchAllUserData failed:', err);
        showToast('Load error', 'Could not load your data. Please check your connection.', 'error');
      })
      .finally(() => {
        setIsDataLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ─────────────────────────────────────────────────────────────────────────
  // TOAST HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const showToast = (title: string, description?: string, type: ToastMessage['type'] = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => dismissToast(id), 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: stock status
  // ─────────────────────────────────────────────────────────────────────────

  const calcStockStatus = (stock: number, minStock: number): Product['status'] => {
    if (stock <= 0) return 'out_of_stock';
    if (stock <= minStock) return 'low_stock';
    return 'in_stock';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NUMBER GENERATORS
  // ─────────────────────────────────────────────────────────────────────────

  const generateInvoiceNumber = (): string => {
    const prefix = settings.invoicePrefix || 'INV-';
    const nums = invoices
      .map((inv) => parseInt(inv.invoiceNumber.replace(prefix, '').replace(/\D/g, ''), 10) || 0)
      .filter((n) => !isNaN(n));
    const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  };

  const generateQuotationNumber = (): string => {
    const prefix = settings.quotationPrefix || 'QT-';
    const nums = quotations
      .map((q) => parseInt(q.quotationNumber.replace(prefix, '').replace(/\D/g, ''), 10) || 0)
      .filter((n) => !isNaN(n));
    const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PRODUCTS
  // ─────────────────────────────────────────────────────────────────────────

  const addProduct = (productData: Omit<Product, 'id' | 'updatedAt' | 'status'>) => {
    const id = `prod-${Date.now().toString().slice(-6)}`;
    const status = calcStockStatus(productData.stock, productData.minStock);
    const now = new Date().toISOString().split('T')[0];
    const newProduct: Product = {
      ...productData,
      sku: productData.sku || `PRD-${Date.now().toString().slice(-7)}`,
      id,
      userId: currentUserId || undefined,
      status,
      lowStockThreshold: productData.lowStockThreshold || productData.minStock,
      gstRate: productData.gstRate || productData.taxRate,
      updatedAt: now,
      createdAt: now,
    };

    // 1. Optimistic state update
    setProducts((prev) => [newProduct, ...prev]);

    // 2. Opening stock movement (in memory only if > 0)
    if (productData.stock > 0) {
      const movement: StockMovement = {
        id: `mov-${Date.now().toString().slice(-6)}-open`,
        userId: currentUserId || undefined,
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        productId: id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'stock_in',
        quantity: newProduct.stock,
        reference: 'Opening Stock',
        previousStock: 0,
        newStock: newProduct.stock,
        reason: 'Initial catalog creation',
        purchaseRate: newProduct.purchasePrice,
      };
      setStockMovements((prev) => [movement, ...prev]);
      // Async DB write
      dbInsertStockMovement(movement);
    }

    // 3. Async DB write
    dbInsertProduct(newProduct).catch(() => {
      showToast('Sync error', `${newProduct.name} could not be saved to the database.`, 'error');
    });

    showToast('Product added', `${newProduct.name} has been added to StockIN.`);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const existing = products.find((p) => p.id === id);

    // Generate adjustment movement if stock changed
    if (existing && updates.stock !== undefined && updates.stock !== existing.stock) {
      const diff = updates.stock - existing.stock;
      const movement: StockMovement = {
        id: `mov-${Date.now().toString().slice(-6)}-adj`,
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        productId: id,
        productName: updates.name || existing.name,
        sku: updates.sku || existing.sku,
        type: 'adjustment',
        quantity: diff,
        reference: 'MANUAL-ADJ',
        previousStock: existing.stock,
        newStock: updates.stock,
        reason: 'Direct quantity adjustment in product catalog',
        purchaseRate: updates.purchasePrice || existing.purchasePrice,
      };
      setStockMovements((prev) => [movement, ...prev]);
      dbInsertStockMovement(movement);
    }

    setProducts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates, updatedAt: new Date().toISOString().split('T')[0] };
          const minS = updates.minStock ?? updates.lowStockThreshold ?? item.minStock;
          updated.status = calcStockStatus(updates.stock ?? item.stock, minS);
          return updated;
        }
        return item;
      })
    );

    dbUpdateProduct(id, updates).catch(() =>
      showToast('Sync error', 'Product changes could not be saved to the database.', 'error')
    );

    showToast('Product updated', 'Changes have been saved successfully.');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    const hasInvoices = invoices.some((inv) => inv.items.some((it) => it.productId === id));

    if (hasInvoices) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'archived' as const } : p))
      );
      dbArchiveProduct(id);
      showToast(
        'Product archived',
        `${prod?.name || 'Product'} has invoice records and was archived to protect billing history.`,
        'info'
      );
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      dbDeleteProduct(id);
      showToast('Product removed', prod ? `${prod.name} was removed from inventory.` : 'Product removed.');
    }
  };

  const duplicateProduct = (id: string) => {
    const source = products.find((p) => p.id === id);
    if (!source) return;
    const newId = `prod-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString().split('T')[0];
    const dup: Product = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      sku: `${source.sku}-COPY`,
      stock: 0,
      status: 'out_of_stock',
      createdAt: now,
      updatedAt: now,
    };
    setProducts((prev) => [dup, ...prev]);
    dbInsertProduct(dup);
    showToast('Product duplicated', `Created copy "${dup.name}".`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMERS
  // ─────────────────────────────────────────────────────────────────────────

  const addCustomer = async (
    data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'outstanding' | 'createdAt'>
  ): Promise<Customer> => {
    const id = `cust-${Date.now().toString().slice(-6)}`;
    const newCust: Customer = {
      ...data,
      id,
      userId: currentUserId || undefined,
      totalOrders: 0,
      totalSpent: 0,
      outstanding: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers((prev) => [newCust, ...prev]);
    try {
      await dbInsertCustomer(newCust);
      showToast('Customer added', `${newCust.name} added to customer directory.`);
      return newCust;
    } catch (err) {
      console.error('[AppState] dbInsertCustomer error:', err);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      showToast('Sync error', `${newCust.name} could not be saved to the database.`, 'error');
      throw err;
    }
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    dbUpdateCustomer(id, updates).catch(() =>
      showToast('Sync error', 'Customer changes could not be saved to the database.', 'error')
    );
    showToast('Customer updated', 'Customer details saved.');
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    const hasInvoices = invoices.some((inv) => inv.customerId === id);

    if (hasInvoices) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'inactive' as const } : c))
      );
      dbDeactivateCustomer(id);
      showToast(
        'Customer marked inactive',
        `${cust?.name || 'Customer'} has billing history and was marked inactive to preserve records.`,
        'info'
      );
    } else {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      dbDeleteCustomer(id);
      showToast('Customer removed', cust ? `${cust.name} has been removed.` : 'Customer removed.');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // INVOICES & BILLING  (direct invoice from Billing page)
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // INVOICES & BILLING  (direct invoice from Billing page)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * addInvoice
   * 
   * Atomically generates direct invoice via PostgreSQL RPC (create_invoice_rpc).
   * Eliminates client-side multi-request inconsistencies and race conditions.
   * On success: authoritatively refreshes products, stock movements, customers,
   * payments, and invoices directly from Supabase.
   */
  const addInvoice = async (
    invoiceData: Omit<Invoice, 'id'>,
    paymentMethod: string = 'UPI'
  ): Promise<string | null> => {
    const id = `inv-${Date.now().toString().slice(-6)}`;
    const balance = Math.max(0, invoiceData.grandTotal - invoiceData.paidAmount);
    const autoStatus: PaymentStatus =
      balance === 0 ? 'paid' : invoiceData.paidAmount > 0 ? 'partial' : 'due';

    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      userId: currentUserId || undefined,
      balance,
      status: autoStatus,
    };

    // ── Pre-flight local validation for instant UI feedback ───────────────
    // The database RPC remains the authoritative gatekeeper with row locking.
    const stockErrors: string[] = [];
    const aggregatedReq = new Map<string, number>();
    for (const item of newInvoice.items) {
      aggregatedReq.set(
        item.productId,
        (aggregatedReq.get(item.productId) || 0) + item.quantity
      );
    }

    for (const [prodId, reqQty] of aggregatedReq.entries()) {
      const prod = products.find((p) => p.id === prodId);
      if (!prod) {
        stockErrors.push(`Product not found in current inventory.`);
      } else if (prod.stock < reqQty) {
        stockErrors.push(`"${prod.name}" (Required: ${reqQty}, Available: ${prod.stock})`);
      }
    }

    if (stockErrors.length > 0) {
      showToast(
        'Insufficient Stock',
        `Cannot generate invoice:\n${stockErrors.join('\n')}`,
        'error'
      );
      return null;
    }

    // ── Execute Atomic Supabase RPC ──────────────────────────────────────
    const result = await dbCreateInvoiceAtomic(newInvoice, paymentMethod);

    if (!result.success) {
      const isStockError = result.errorCode === 'INSUFFICIENT_STOCK';
      showToast(
        isStockError ? 'Insufficient Stock (Server)' : 'Invoice Creation Failed',
        result.error || 'The invoice transaction was aborted by the database.',
        'error'
      );
      return null;
    }

    const createdId = result.invoiceId || id;
    const createdNumber = result.invoiceNumber || newInvoice.invoiceNumber;

    // ── RPC succeeded — authoritatively re-sync all user data from DB ─────
    fetchAllUserData()
      .then((data) => {
        setProducts(data.products);
        setCustomers(data.customers);
        setInvoices(data.invoices);
        setQuotations(data.quotations);
        setStockMovements(data.stockMovements);
        setPayments(data.payments);
      })
      .catch((err) => console.error('[AppState] post-invoice sync error:', err));

    // Background decoupled PDF generation & storage archival
    uploadInvoicePdf({ ...newInvoice, id: createdId, invoiceNumber: createdNumber }, settings)
      .catch((err) => console.warn('[AppState] Background PDF invoice storage upload warning:', err));

    showToast(
      'Invoice created',
      `${createdNumber} generated for ${newInvoice.customerName}. Inventory & ledger updated atomically.`,
      'success'
    );

    return createdId;
  };

  const updateInvoiceStatus = (id: string, status: PaymentStatus, paidAmount?: number) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== id) return inv;

        const finalPaid =
          paidAmount !== undefined
            ? paidAmount
            : status === 'paid'
            ? inv.grandTotal
            : inv.paidAmount;
        const finalBalance = Math.max(0, inv.grandTotal - finalPaid);
        const finalStatus: PaymentStatus =
          finalBalance === 0 ? 'paid' : finalPaid > 0 ? 'partial' : 'due';
        const additionalPayment = finalPaid - inv.paidAmount;

        // Adjust customer outstanding
        const balanceDiff = finalBalance - inv.balance;
        if (balanceDiff !== 0) {
          setCustomers((cList) =>
            cList.map((c) =>
              c.id === inv.customerId
                ? { ...c, outstanding: Math.max(0, c.outstanding + balanceDiff) }
                : c
            )
          );
          const cust = customers.find((c) => c.id === inv.customerId);
          if (cust) {
            dbUpdateCustomer(inv.customerId, {
              outstanding: Math.max(0, cust.outstanding + balanceDiff),
            });
          }
        }

        // Create payment record for the new amount collected
        if (additionalPayment > 0) {
          const payRec: Payment = {
            id: `pay-${Date.now().toString().slice(-6)}-upd`,
            transactionId: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
            type: 'inward',
            partyType: 'customer',
            partyId: inv.customerId,
            partyName: inv.customerCompany || inv.customerName,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: additionalPayment,
            method: 'Cash',
            date: new Date().toISOString().split('T')[0],
            referenceNumber: `SETTLE-${inv.invoiceNumber}`,
            status: 'completed',
            notes:
              finalStatus === 'paid'
                ? 'Full payment — invoice settled'
                : 'Partial payment received',
          };
          setPayments((prev) => [payRec, ...prev]);
          dbInsertPayment(payRec);
        }

        // Async: update invoice in DB
        dbUpdateInvoiceFinancials(inv.id, finalStatus, finalPaid, finalBalance);

        return { ...inv, paidAmount: finalPaid, balance: finalBalance, status: finalStatus };
      })
    );
    showToast('Invoice updated', 'Payment status adjusted.');
  };

  const deleteInvoice = (id: string, restoreStock = true) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    setInvoices((prev) => prev.filter((i) => i.id !== id));

    // Restore customer balance
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === inv.customerId
          ? {
              ...c,
              outstanding: Math.max(0, c.outstanding - inv.balance),
              totalSpent: Math.max(0, c.totalSpent - inv.grandTotal),
              totalOrders: Math.max(0, c.totalOrders - 1),
            }
          : c
      )
    );

    // Restore stock
    if (restoreStock && inv.items.length > 0) {
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
      const restoreMovements: StockMovement[] = [];

      setProducts((prev) =>
        prev.map((prod) => {
          const item = inv.items.find((i) => i.productId === prod.id);
          if (item) {
            const newStock = prod.stock + item.quantity;
            restoreMovements.push({
              id: `mov-${Date.now().toString().slice(-6)}-rst-${item.id}`,
              date: timestamp,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              type: 'return',
              quantity: item.quantity,
              reference: `VOID-${inv.invoiceNumber}`,
              previousStock: prod.stock,
              newStock,
              reason: `Cancelled Invoice ${inv.invoiceNumber}`,
            });
            dbUpdateProduct(prod.id, { stock: newStock, status: calcStockStatus(newStock, prod.minStock) });
            return { ...prod, stock: newStock, status: calcStockStatus(newStock, prod.minStock) };
          }
          return prod;
        })
      );

      setStockMovements((prev) => [...restoreMovements, ...prev]);
      restoreMovements.forEach((m) => dbInsertStockMovement(m));
    }

    // Async DB delete (cascade removes invoice_items)
    dbDeleteInvoice(id);

    // Update customer in DB
    const cust = customers.find((c) => c.id === inv.customerId);
    if (cust) {
      dbUpdateCustomer(inv.customerId, {
        outstanding: Math.max(0, cust.outstanding - inv.balance),
        totalSpent: Math.max(0, cust.totalSpent - inv.grandTotal),
        totalOrders: Math.max(0, cust.totalOrders - 1),
      });
    }

    showToast('Invoice deleted', `${inv.invoiceNumber} removed and stock restored.`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // QUOTATIONS
  // ─────────────────────────────────────────────────────────────────────────

  const addQuotation = (quotationData: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = `quot-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString().split('T')[0];
    const newQ: Quotation = {
      ...quotationData,
      id,
      userId: currentUserId || undefined,
      createdAt: now,
      updatedAt: now,
    };
    setQuotations((prev) => [newQ, ...prev]);
    dbInsertQuotation(newQ).catch(() =>
      showToast('Sync error', 'Quotation could not be saved to the database.', 'error')
    );

    // Background decoupled PDF generation & storage archival
    uploadQuotationPdf(newQ, settings)
      .catch((err) => console.warn('[AppState] Background PDF quotation storage upload warning:', err));

    showToast('Quotation created', `${newQ.quotationNumber} saved for ${newQ.customerName}.`);
    return id;
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    const now = new Date().toISOString().split('T')[0];
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates, updatedAt: now } : q))
    );
    dbUpdateQuotation(id, { ...updates, updatedAt: now }).catch(() =>
      showToast('Sync error', 'Quotation changes could not be saved to the database.', 'error')
    );
    showToast('Quotation updated', 'Quotation details saved successfully.');
  };

  const deleteQuotation = (id: string) => {
    const q = quotations.find((item) => item.id === id);
    setQuotations((prev) => prev.filter((item) => item.id !== id));
    dbDeleteQuotation(id);
    showToast('Quotation deleted', q ? `${q.quotationNumber} has been removed.` : 'Quotation deleted.');
  };

  const duplicateQuotation = (id: string): string => {
    const source = quotations.find((q) => q.id === id);
    if (!source) return '';
    const newNumber = generateQuotationNumber();
    const newId = `quot-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString().split('T')[0];
    const dup: Quotation = {
      ...source,
      id: newId,
      userId: currentUserId || undefined,
      quotationNumber: newNumber,
      status: 'draft',
      convertedInvoiceId: undefined,
      convertedInvoiceNumber: undefined,
      convertedAt: undefined,
      createdAt: now,
      updatedAt: now,
    };
    setQuotations((prev) => [dup, ...prev]);
    dbInsertQuotation(dup);
    showToast('Quotation duplicated', `Created draft ${newNumber} from ${source.quotationNumber}.`);
    return newId;
  };

  const updateQuotationStatus = (id: string, status: QuotationStatus) => {
    const now = new Date().toISOString().split('T')[0];
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status, updatedAt: now } : q))
    );
    dbUpdateQuotation(id, { status, updatedAt: now });
    showToast('Status updated', `Quotation status marked as ${status.toUpperCase()}.`);
  };

  /**
   * convertQuotationToInvoice
   *
   * ASYNC — delegates to the Supabase `convert_quotation_to_invoice_rpc` function.
   * The RPC is a single PostgreSQL transaction:
   *   1. Validate quotation & check stock
   *   2. Create invoice + invoice_items
   *   3. Deduct product stock (exactly once per item)
   *   4. Create STOCK_OUT movements
   *   5. Update customer financials
   *   6. Set quotation status = 'converted'
   *
   * On success: refresh React state from returned data.
   * On failure: no changes persist (entire transaction rolled back).
   */
  const convertQuotationToInvoice = async (
    quotationId: string
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> => {
    const quotation = quotations.find((q) => q.id === quotationId);
    if (!quotation) {
      return { success: false, error: 'Quotation not found.' };
    }
    if (quotation.status === 'converted') {
      return {
        success: false,
        error: `Quotation ${quotation.quotationNumber} is already converted to Invoice ${
          quotation.convertedInvoiceNumber || quotation.convertedInvoiceId || 'unknown'
        }.`,
      };
    }

    // Pre-flight local stock check (fast feedback before hitting the DB)
    const stockErrors: string[] = [];
    for (const item of quotation.items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        stockErrors.push(`"${item.productName}" not found in current inventory.`);
      } else if (prod.stock < item.quantity) {
        stockErrors.push(
          `"${item.productName}" (Required: ${item.quantity}, Available: ${prod.stock})`
        );
      }
    }
    if (stockErrors.length > 0) {
      const error = `Insufficient warehouse stock:\n${stockErrors.join('\n')}`;
      showToast('Conversion Blocked', 'Current stock is insufficient to fulfill this quotation.', 'error');
      return { success: false, error };
    }

    // Generate IDs/number client-side (deterministic, server validates ownership)
    const newInvoiceNumber = generateInvoiceNumber();
    const newInvoiceId = `inv-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    // ── Call the atomic Supabase RPC ──────────────────────────────────────
    const result = await dbConvertQuotation(
      quotationId,
      newInvoiceId,
      newInvoiceNumber,
      today,
      settings.paymentTerms || 'Due on Receipt'
    );

    if (!result.success) {
      showToast('Conversion Failed', result.error || 'Failed to convert quotation.', 'error');
      return { success: false, error: result.error };
    }

    // ── RPC succeeded — refresh all state from the DB ─────────────────────
    // This ensures React state exactly mirrors what the DB committed.
    fetchAllUserData()
      .then((data) => {
        setProducts(data.products);
        setCustomers(data.customers);
        setInvoices(data.invoices);
        setQuotations(data.quotations);
        setStockMovements(data.stockMovements);
        setPayments(data.payments);
      })
      .catch((err) => console.error('[AppState] post-conversion refresh failed:', err));

    if (result.invoiceId && result.invoiceNumber) {
      const convertedInvoice: Invoice = {
        id: result.invoiceId,
        userId: currentUserId || undefined,
        invoiceNumber: result.invoiceNumber,
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        customerCompany: quotation.customerCompany,
        customerPhone: quotation.customerPhone,
        customerEmail: quotation.customerEmail,
        customerAddress: quotation.customerAddress,
        customerGstin: quotation.customerGstin,
        date: today,
        dueDate: today,
        paymentTerms: settings.paymentTerms || 'Due on Receipt',
        items: quotation.items.map((it) => ({ ...it })),
        subtotal: quotation.subtotal,
        discountTotal: quotation.discountTotal,
        taxTotal: quotation.taxTotal,
        grandTotal: quotation.grandTotal,
        paidAmount: 0,
        balance: quotation.grandTotal,
        status: 'due',
      };
      uploadInvoicePdf(convertedInvoice, settings)
        .catch((err) => console.warn('[AppState] Background converted invoice storage upload warning:', err));
    }

    showToast(
      'Quotation Converted!',
      `Created Invoice ${result.invoiceNumber}. Stock deducted once. Customer account updated.`,
      'success'
    );

    return { success: true, invoiceId: result.invoiceId };
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STOCK IN
  // ─────────────────────────────────────────────────────────────────────────

  const addStockIn = (data: StockInData) => {
    const prod = products.find((p) => p.id === data.productId);
    if (!prod) return;

    const previousStock = prod.stock;
    const intakeQty = Math.max(1, data.quantity);
    const newStock = previousStock + intakeQty;
    const newStatus = calcStockStatus(newStock, prod.minStock);

    // 1. Update product
    setProducts((prev) =>
      prev.map((p) =>
        p.id === data.productId
          ? {
              ...p,
              stock: newStock,
              status: newStatus,
              purchasePrice:
                data.purchaseRate !== undefined && data.purchaseRate > 0
                  ? data.purchaseRate
                  : p.purchasePrice,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : p
      )
    );

    const timestamp = data.date
      ? data.date.includes(' ')
        ? data.date
        : `${data.date} ${new Date().toTimeString().slice(0, 5)}`
      : new Date().toISOString().replace('T', ' ').slice(0, 16);

    const ref = data.reference || `STK-IN-${Math.floor(1000 + Math.random() * 9000)}`;

    const movement: StockMovement = {
      id: `mov-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3)}`,
      userId: currentUserId || undefined,
      date: timestamp,
      productId: data.productId,
      productName: prod.name,
      sku: prod.sku,
      type: 'stock_in',
      quantity: intakeQty,
      reference: ref,
      previousStock,
      newStock,
      reason: data.reason || 'New Inventory Intake',
      purchaseRate: data.purchaseRate || prod.purchasePrice,
    };

    // 2. Persist movement
    setStockMovements((prev) => [movement, ...prev]);
    dbInsertStockMovement(movement);

    // 3. Update product in DB
    dbUpdateProduct(data.productId, {
      stock: newStock,
      status: newStatus,
      ...(data.purchaseRate && data.purchaseRate > 0 ? { purchasePrice: data.purchaseRate } : {}),
    });

    // 4. Notification
    const notif: Notification = {
      id: `notif-${Date.now().toString().slice(-6)}`,
      title: 'Stock Added (Stock In)',
      message: `+${intakeQty} units of ${prod.name} (${prod.sku}) added. Current stock: ${newStock}.`,
      time: 'Just now',
      type: 'stock',
      read: false,
      link: '/stock',
    };
    setNotifications((prev) => [notif, ...prev]);

    showToast(
      'Stock In Successful',
      `Added +${intakeQty} ${prod.unit || 'units'} of ${prod.name}. New Stock: ${newStock}.`
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STOCK ADJUSTMENT
  // ─────────────────────────────────────────────────────────────────────────

  const adjustStock = (productId: string, quantity: number, type: MovementType, reason?: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    let newStock = prod.stock;
    let qtyChange = quantity;

    if (type === 'stock_in' || type === 'return') {
      newStock += Math.abs(quantity);
      qtyChange = Math.abs(quantity);
    } else if (type === 'stock_out') {
      newStock = Math.max(0, prod.stock - Math.abs(quantity));
      qtyChange = -Math.abs(quantity);
    } else if (type === 'adjustment') {
      newStock = Math.max(0, prod.stock + quantity);
      qtyChange = quantity;
    }

    const previousStock = prod.stock;
    const newStatus = calcStockStatus(newStock, prod.minStock);

    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock: newStock, status: newStatus, updatedAt: new Date().toISOString().split('T')[0] }
          : p
      )
    );

    const movement: StockMovement = {
      id: `mov-${Date.now().toString().slice(-6)}`,
      userId: currentUserId || undefined,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      productId,
      productName: prod.name,
      sku: prod.sku,
      type,
      quantity: qtyChange,
      reference: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
      previousStock,
      newStock,
      reason: reason || 'Manual stock adjustment',
    };

    setStockMovements((prev) => [movement, ...prev]);
    dbInsertStockMovement(movement);
    dbUpdateProduct(productId, { stock: newStock, status: newStatus });

    showToast('Stock updated', `${prod.name} quantity adjusted to ${newStock}.`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PAYMENTS
  // ─────────────────────────────────────────────────────────────────────────

  const addPayment = (
    paymentData: Omit<Payment, 'id' | 'transactionId' | 'type' | 'partyType'>
  ) => {
    const id = `pay-${Date.now().toString().slice(-6)}`;
    const transactionId = `TXN-${Math.floor(10000 + Math.random() * 90000)}`;
    const newPayment: Payment = {
      ...paymentData,
      id,
      userId: currentUserId || undefined,
      transactionId,
      type: 'inward',
      partyType: 'customer',
    };

    setPayments((prev) => [newPayment, ...prev]);
    dbInsertPayment(newPayment);

    // Update linked invoice
    if (newPayment.invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id !== newPayment.invoiceId) return inv;
          const paid = inv.paidAmount + newPayment.amount;
          const balance = Math.max(0, inv.grandTotal - paid);
          const status: PaymentStatus = balance === 0 ? 'paid' : 'partial';
          dbUpdateInvoiceFinancials(inv.id, status, paid, balance);
          return { ...inv, paidAmount: paid, balance, status };
        })
      );
    }

    // Reduce customer outstanding
    setCustomers((prev) =>
      prev.map((cust) => {
        if (cust.id !== newPayment.partyId) return cust;
        const updated = { outstanding: Math.max(0, cust.outstanding - newPayment.amount) };
        dbUpdateCustomer(cust.id, updated);
        return { ...cust, ...updated };
      })
    );

    showToast(
      'Payment recorded',
      `Receipt of ₹${newPayment.amount.toLocaleString('en-IN')} logged.`
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS (session-only, no DB)
  // ─────────────────────────────────────────────────────────────────────────

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('Notifications cleared', 'All notifications marked as read.');
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────────────────

  const updateSettings = (updates: Partial<BusinessSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      if (currentUserId) {
        dbUpsertSettings(currentUserId, updated);
      }
      return updated;
    });
    showToast('Settings saved', 'Your business preferences have been updated.');
  };

  const setupBusiness = (businessData: Partial<BusinessSettings>) => {
    setSettings((prev) => {
      const updated: BusinessSettings = {
        ...prev,
        ...businessData,
        userId: currentUserId || undefined,
        isConfigured: true,
      };
      if (currentUserId) {
        dbUpsertSettings(currentUserId, updated);
      }
      return updated;
    });
    showToast('Business Setup Complete', 'Your business profile is now active.', 'success');
  };

  const clearAllData = () => {
    setProducts([]);
    setCustomers([]);
    setInvoices([]);
    setQuotations([]);
    setStockMovements([]);
    setPayments([]);
    setNotifications([]);
    setSettings({ ...defaultBusinessSettings, userId: currentUserId || undefined });
    showToast('All data cleared', 'StockIN workspace has been reset.', 'info');
    // Note: clearing DB data requires user confirmation in a future UX flow.
    // For now, the DB is not wiped — only local React state is reset.
  };

  const resetToDefaults = () => clearAllData();

  // ─────────────────────────────────────────────────────────────────────────
  // PROVIDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppStateContext.Provider
      value={{
        products,
        customers,
        invoices,
        quotations,
        stockMovements,
        payments,
        notifications,
        settings,
        toasts,
        isDataLoading,
        addProduct,
        updateProduct,
        deleteProduct,
        duplicateProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        generateInvoiceNumber,
        addQuotation,
        updateQuotation,
        deleteQuotation,
        duplicateQuotation,
        updateQuotationStatus,
        generateQuotationNumber,
        convertQuotationToInvoice,
        addStockIn,
        adjustStock,
        addPayment,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotification,
        updateSettings,
        setupBusiness,
        clearAllData,
        resetToDefaults,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
