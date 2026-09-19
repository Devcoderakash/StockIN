/**
 * src/app/routes/routeConfig.ts
 *
 * Route path constants and definitions
 */

export const ROUTES = {
  // Public / Auth Routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Protected App Routes
  ROOT: '/',
  DASHBOARD: '/dashboard',
  PRODUCTS: '/products',
  STOCK: '/stock',
  STOCK_IN: '/stock-in',
  BILLING: '/billing',
  QUOTATIONS: '/quotations',
  INVOICES: '/invoices',
  CUSTOMERS: '/customers',
  PAYMENTS: '/payments',
  REPORTS: '/reports',
  HISTORY: '/history',
  SETTINGS: '/settings',
} as const;

export type AppRoute = typeof ROUTES[keyof typeof ROUTES];
