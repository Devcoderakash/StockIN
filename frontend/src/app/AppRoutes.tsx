/**
 * src/app/AppRoutes.tsx
 *
 * Centralized declarative route configuration for StockIN
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { PublicOnlyRoute } from '@/features/auth/components/PublicOnlyRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ROUTES } from './routes/routeConfig';

// Auth Feature Pages
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

// Domain Feature Pages
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { ProductsPage } from '@/features/products/pages/ProductsPage';
import { StockPage } from '@/features/stock/pages/StockPage';
import { StockInPage } from '@/features/stock/pages/StockInPage';
import { BillingPage } from '@/features/invoices/pages/BillingPage';
import { QuotationsPage } from '@/features/quotations/pages/QuotationsPage';
import { InvoicesPage } from '@/features/invoices/pages/InvoicesPage';
import { CustomersPage } from '@/features/customers/pages/CustomersPage';
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage';
import { ReportsPage } from '@/features/reports/pages/ReportsPage';
import { HistoryPage } from '@/features/history/pages/HistoryPage';
import { SettingsPage } from '@/features/settings/pages/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public-only authentication routes (redirect to /dashboard if authenticated) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
      </Route>

      {/*
        /reset-password is kept outside PublicOnlyRoute:
        Supabase redirects user with an active recovery session token.
      */}
      <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

      {/* Protected application routes (redirect to /login if unauthenticated) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
          <Route path={ROUTES.STOCK} element={<StockPage />} />
          <Route path={ROUTES.STOCK_IN} element={<StockInPage />} />
          <Route path={ROUTES.BILLING} element={<BillingPage />} />
          <Route path={ROUTES.QUOTATIONS} element={<QuotationsPage />} />
          <Route path={ROUTES.INVOICES} element={<InvoicesPage />} />
          <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
          <Route path={ROUTES.PAYMENTS} element={<PaymentsPage />} />
          <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
          <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Catch-all global fallback */}
      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
};

export default AppRoutes;
