import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useAppState } from '@/context/AppStateContext';
import { OnboardingModal } from '@/components/common/OnboardingModal';
import { Loader2 } from 'lucide-react';

export const AppShell: React.FC = () => {
  const { settings, isDataLoading } = useAppState();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);

  const showOnboarding = !settings.isConfigured && !isOnboardingDismissed && !isDataLoading;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-clip">
        <Topbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Supabase data loading indicator */}
        {isDataLoading && (
          <div className="sticky top-16 z-30 w-full">
            {/* Animated progress bar */}
            <div className="h-0.5 bg-slate-200 overflow-hidden">
              <div className="h-full bg-blue-500 animate-pulse w-3/4 rounded-full" />
            </div>
            <div className="flex items-center justify-center gap-2 py-2 bg-blue-50/80 backdrop-blur-sm border-b border-blue-100 text-xs text-blue-700 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Loading your data from StockIN cloud...</span>
            </div>
          </div>
        )}

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* First Run Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setIsOnboardingDismissed(true)}
      />
    </div>
  );
};
