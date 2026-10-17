import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';

interface AuthShellProps {
  children: React.ReactNode;
  cardMaxWidth?: string;
  panelHeadline?: string;
  panelSubtitle?: string;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  children,
  cardMaxWidth = 'max-w-[1040px]',
  panelHeadline = 'Manage inventory, billing and business operations in one place.',
  panelSubtitle = 'StockIN Business Suite',
}) => {
  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex items-center justify-center p-3 sm:p-6 lg:p-8 selection:bg-blue-600 selection:text-white antialiased">
      {/* Outer Card */}
      <div
        className={`relative z-10 w-full ${cardMaxWidth} bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-3 sm:p-4 lg:p-5 grid grid-cols-1 lg:grid-cols-12 overflow-hidden gap-4 lg:gap-8`}
      >
        {/* Left: Professional Architectural Navy Panel */}
        <div className="lg:col-span-5 rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-9 flex flex-col justify-between text-white relative overflow-hidden min-h-[300px] lg:min-h-[560px] bg-slate-900 border border-slate-800">
          {/* Subtle architectural background texture */}
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
              backgroundSize: '24px 24px',
            }}
          />

          {/* Top Left: StockIN Brand Logo */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0 bg-blue-600 flex items-center justify-center border border-white/20">
                <img src="/logo.png" alt="StockIN" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-base font-extrabold tracking-tight text-white">StockIN</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-blue-900/60 px-1.5 py-0.5 rounded border border-blue-700/60">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase mt-1">
                  Inventory & Invoicing Suite
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Left: StockIN Value Proposition */}
          <div className="relative z-10 mt-auto pt-8">
            <p className="text-xs font-semibold text-blue-400 tracking-wide uppercase mb-2">
              {panelSubtitle}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight mb-6">
              {panelHeadline}
            </h2>

            {/* Feature checklist */}
            <div className="hidden sm:block space-y-3 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-4 h-4 rounded-full bg-blue-950 flex items-center justify-center shrink-0 border border-blue-500/40 text-blue-400">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Live Warehouse Inventory & Stock Movements</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-4 h-4 rounded-full bg-blue-950 flex items-center justify-center shrink-0 border border-blue-500/40 text-blue-400">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>GST Tax Invoicing & Vector PDF Generation</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                <div className="w-4 h-4 rounded-full bg-blue-950 flex items-center justify-center shrink-0 border border-blue-500/40 text-blue-400">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>Customer Ledgers & Quotation Conversions</span>
              </div>
            </div>

            {/* Bottom Security Badge */}
            <div className="pt-5 mt-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Row-Level Security Architecture
              </span>
              <span className="text-slate-500 font-mono text-[11px]">v3.2</span>
            </div>
          </div>
        </div>

        {/* Right: Authentication Form Area */}
        <div className="lg:col-span-7 flex flex-col justify-center px-3 sm:px-8 lg:px-10 py-5 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
};
