/**
 * src/features/settings/hooks/useSettings.ts
 *
 * Feature hook providing business settings and company profile
 */

import { useAppState } from '@/context/AppStateContext';

export function useSettings() {
  const {
    settings,
    updateSettings,
    setupBusiness,
    resetToDefaults,
    clearAllData,
    isDataLoading,
  } = useAppState();

  return {
    settings,
    updateSettings,
    setupBusiness,
    resetToDefaults,
    clearAllData,
    isLoading: isDataLoading,
  };
}
