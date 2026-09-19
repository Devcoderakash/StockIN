import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  HelpCircle,
  Plus,
  RotateCcw,
  Settings,
  LogOut,
  User as UserIcon,
  Loader2,
} from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';
import { NotificationsDropdown } from './NotificationsDropdown';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface TopbarProps {
  onToggleMobileSidebar: () => void;
  onOpenSearch: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onToggleMobileSidebar, onOpenSearch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, resetToDefaults, showToast } = useAppState();
  const { userDisplayName, userEmail, signOut } = useAuth();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/products':
        return 'Products';
      case '/stock':
        return 'Stock & Inventory';
      case '/stock-in':
        return 'Stock In';
      case '/billing':
        return 'Billing & POS';
      case '/quotations':
        return 'Quotations';
      case '/invoices':
        return 'Invoices';
      case '/customers':
        return 'Customers';
      case '/payments':
        return 'Payments & Transactions';
      case '/reports':
        return 'Reports & Analytics';
      case '/history':
        return 'Document History';
      case '/settings':
        return 'Settings';
      default:
        return 'StockIN';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile hamburger & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight truncate">
              {getPageTitle(location.pathname)}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Bhopal Branch • FY 2026-27
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Global Search Trigger */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 min-h-[38px] text-xs font-medium text-slate-500 bg-slate-100/80 hover:bg-slate-200/80 hover:text-slate-800 rounded-xl border border-slate-200/60 transition-all cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="hidden md:inline">Search anything...</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Quick Create Invoice */}
          <button
            onClick={() => navigate('/billing')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Invoice
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
              )}
            </button>

            <NotificationsDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
            />
          </div>

          {/* Help Button - hidden on narrow mobile to keep header clean */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="hidden sm:flex min-w-[40px] min-h-[40px] items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Help & Quick Tips"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 min-h-[40px] rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="User profile"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {(userDisplayName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:block text-left pr-1 max-w-[140px]">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate">{userDisplayName}</p>
                <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
              </div>
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">{userDisplayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    Business Settings
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      navigate('/billing');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                    Create Invoice
                  </button>
                </div>

                <div className="my-1 border-t border-slate-100" />

                <div className="py-1">
                  <button
                    disabled={isSigningOut}
                    onClick={async () => {
                      setIsSigningOut(true);
                      try {
                        const result = await signOut();
                        if (result.success) {
                          showToast('Signed Out', 'You have been safely signed out.', 'info');
                          navigate('/login', { replace: true });
                        } else {
                          showToast('Sign out error', result.error, 'error');
                          setIsSigningOut(false);
                        }
                      } catch {
                        setIsSigningOut(false);
                        navigate('/login', { replace: true });
                      }
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSigningOut ? (
                      <Loader2 className="w-3.5 h-3.5 text-rose-500 animate-spin" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    )}
                    <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsResetConfirmOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    Reset Workspace Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Help Modal */}
      <Modal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        title="StockIN System Overview"
        description="Production inventory, quotation, and GST invoicing system connected to Supabase."
      >
        <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-blue-900">
            <p className="font-semibold mb-1">Production Architecture Highlights</p>
              <ul className="list-disc pl-4 space-y-1 text-blue-800">
                <li><strong>Cloud Database</strong>: All data is saved directly to Supabase PostgreSQL and isolated with Row Level Security (RLS).</li>
                <li><strong>Atomic Conversions</strong>: Converting quotations to invoices decrements stock and logs movements in a single transactional RPC.</li>
                <li><strong>Supabase PDF Storage & History</strong>: Invoices and quotations are securely archived in private Supabase Storage with time-limited signed access and complete audit history.</li>
                <li><strong>Search (Cmd+K)</strong>: Instant global search across products, customers, and invoices.</li>
                <li><strong>Real-time Ledger</strong>: Invoicing and payments update customer outstanding balances automatically.</li>
              </ul>
          </div>

          <div>
            <h5 className="font-bold text-slate-900 mb-1">Company Settings & Preferences</h5>
            <p>
              Visit <strong>Settings</strong> to update your business profile, GSTIN, bank account numbers, invoice prefix, and default payment terms.
            </p>
          </div>
        </div>
      </Modal>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={resetToDefaults}
        title="Reset Configuration"
        message="This will reset your local business settings to their default values. Your saved database records will not be deleted."
        confirmText="Reset Configuration"
      />
    </>
  );
};
