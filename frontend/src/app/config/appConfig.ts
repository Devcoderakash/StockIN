/**
 * src/app/config/appConfig.ts
 *
 * Application environment and runtime configuration
 */

export const appConfig = {
  name: 'StockIN',
  version: '2.0.0',
  description: 'Enterprise Inventory, Stock, Quotation & Invoicing Application',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  routes: {
    home: '/',
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    dashboard: '/dashboard',
    products: '/products',
    stock: '/stock',
    stockIn: '/stock-in',
    billing: '/billing',
    quotations: '/quotations',
    invoices: '/invoices',
    customers: '/customers',
    payments: '/payments',
    reports: '/reports',
    settings: '/settings',
  },
} as const;
