/**
 * src/app/App.tsx
 *
 * Top-level application component
 */

import React from 'react';
import { AppProviders } from './providers/AppProviders';
import { AppRoutes } from './AppRoutes';

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
