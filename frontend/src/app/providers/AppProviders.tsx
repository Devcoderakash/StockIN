/**
 * src/app/providers/AppProviders.tsx
 *
 * Centralized React Providers wrapping the application tree
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AppStateProvider } from '@/context/AppStateContext';
import { ToastContainer } from '@/components/common/Toast';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <AppStateProvider>
        <BrowserRouter>
          {children}
          {/* Global Toast notifications accessible anywhere */}
          <ToastContainer />
        </BrowserRouter>
      </AppStateProvider>
    </AuthProvider>
  );
};
