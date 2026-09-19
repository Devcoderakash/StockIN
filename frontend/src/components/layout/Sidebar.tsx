import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  PackagePlus,
  Receipt,
  FileText,
  FileSpreadsheet,
  Users,
  IndianRupee,
  BarChart3,
  History,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAppState } from '@/context/AppStateContext';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { products, invoices, quotations, settings } = useAppState();
  const { businessName, userDisplayName } = useAuth();

  const lowStockCount = products.filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock').length;
  const dueInvoicesCount = invoices.filter((i) => i.status === 'due').length;
  const openQuotationsCount = quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length;

  const navGroups: NavGroup[] = [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Inventory',
      items: [
        { label: 'Products', path: '/products', icon: <Package className="w-4 h-4" /> },
        {
          label: 'Stock',
          path: '/stock',
          icon: <Boxes className="w-4 h-4" />,
          badge: lowStockCount > 0 ? String(lowStockCount) : undefined,
        },
        { label: 'Stock In', path: '/stock-in', icon: <PackagePlus className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Sales',
      items: [
        { label: 'Billing', path: '/billing', icon: <Receipt className="w-4 h-4" /> },
        {
          label: 'Quotations',
          path: '/quotations',
          icon: <FileSpreadsheet className="w-4 h-4" />,
          badge: openQuotationsCount > 0 ? String(openQuotationsCount) : undefined,
        },
        {
          label: 'Invoices',
          path: '/invoices',
          icon: <FileText className="w-4 h-4" />,
          badge: dueInvoicesCount > 0 ? String(dueInvoicesCount) : undefined,
        },
        { label: 'Customers', path: '/customers', icon: <Users className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Finance',
      items: [
        { label: 'Payments', path: '/payments', icon: <IndianRupee className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Analytics',
      items: [
        { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'History', path: '/history', icon: <History className="w-4 h-4" /> },
      ],
    },
    {
      group: 'System',
      items: [
        { label: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <NavLink
          to="/dashboard"
          onClick={onCloseMobile}
          className="flex items-center gap-3 overflow-hidden group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0 group-hover:bg-blue-700 transition-colors">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          {!isCollapsed && (
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">StockIN</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                  PRO
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 truncate">Inventory & Business</p>
            </div>
          )}
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.group}>
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {group.group}
              </p>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                        }`}
                      >
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="flex-1 truncate tracking-tight">{item.label}</span>
                      )}
                      {!isCollapsed && item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* Business Profile Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <NavLink
          to="/settings"
          onClick={onCloseMobile}
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 transition-colors ${
            isCollapsed ? 'justify-center p-1' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {(settings.businessName || businessName || 'SI').slice(0, 2).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-slate-900 truncate">
                {settings.businessName || businessName}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {userDisplayName || 'Business Owner'}
              </p>
            </div>
          )}
        </NavLink>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 z-30 h-screen sticky top-0 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
