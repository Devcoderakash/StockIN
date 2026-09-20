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
    <div className="min-h-screen bg-[#F3F2F8] text-slate-900 flex items-center justify-center p-3 sm:p-6 lg:p-10 selection:bg-indigo-500/20 selection:text-indigo-700 antialiased">
      {/* Outer Card */}
      <div
        className={`relative z-10 w-full ${cardMaxWidth} bg-white rounded-[28px] sm:rounded-[36px] shadow-[0_25px_70px_rgba(79,70,229,0.12),0_10px_30px_rgba(0,0,0,0.03)] border border-slate-100/90 p-3 sm:p-4 lg:p-4 grid grid-cols-1 lg:grid-cols-12 overflow-hidden gap-4 lg:gap-8`}
      >
        {/* Left: Aesthetic Violet/Indigo/Cyan Mesh Gradient Panel */}
        <div
          className="lg:col-span-5 rounded-[22px] sm:rounded-[28px] p-7 sm:p-9 lg:p-10 flex flex-col justify-between text-white relative overflow-hidden min-h-[300px] lg:min-h-[580px] shadow-inner"
          style={{
            background: `
              radial-gradient(circle at 88% 25%, rgba(216, 180, 254, 0.95) 0%, rgba(192, 132, 252, 0.6) 28%, transparent 58%),
              radial-gradient(circle at 12% 12%, rgba(56, 189, 248, 0.95) 0%, rgba(37, 99, 235, 0.85) 32%, transparent 62%),
              radial-gradient(circle at 20% 88%, rgba(26, 20, 68, 0.98) 0%, rgba(49, 46, 129, 0.85) 42%, transparent 72%),
              radial-gradient(circle at 82% 82%, rgba(168, 85, 247, 0.75) 0%, transparent 55%),
              linear-gradient(145deg, #1d4ed8 0%, #3730a3 38%, #581c87 75%, #6b21a8 100%)
            `,
          }}
        >
          {/* Subtle smooth blur overlay for silky gradient transition */}
          <div className="absolute inset-0 backdrop-blur-[1px] pointer-events-none" />

          {/* Top Left: Real StockIN Brand Logo */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-black/20 shrink-0 bg-blue-600/30 border border-white/25 flex items-center justify-center">
                <img src="/logo.png" alt="StockIN" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-lg font-black tracking-tight text-white drop-shadow-xs">StockIN</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100 bg-white/20 px-1.5 py-0.5 rounded-full border border-white/20 backdrop-blur-xs">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] font-semibold text-blue-100/80 tracking-wide uppercase mt-0.5">
                  Inventory & Business
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Left: StockIN Value Proposition */}
          <div className="relative z-10 mt-auto pt-8">
            <p className="text-xs sm:text-[13px] font-medium text-white/75 tracking-wide mb-2">
              {panelSubtitle}
            </p>
            <h2 className="text-2xl sm:text-[25px] lg:text-[27px] font-bold text-white leading-snug tracking-tight drop-shadow-xs mb-5">
              {panelHeadline}
            </h2>

            {/* Feature checklist */}
            <div className="hidden sm:block space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-white/90 font-medium">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
                <span>Inventory & Stock Tracking</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-white/90 font-medium">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
                <span>GST Billing & Quotations</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-white/90 font-medium">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                </div>
                <span>Customer & Supplier Ledgers</span>
              </div>
            </div>

            {/* Bottom Security Badge */}
            <div className="pt-5 mt-5 border-t border-white/15 flex items-center justify-between text-xs text-white/75">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                Enterprise Cloud Security
              </span>
              <span className="text-white/60 font-mono text-[11px]">v3.2</span>
            </div>
          </div>
        </div>

        {/* Right: Authentication Form Area */}
        <div className="lg:col-span-7 flex flex-col justify-center px-3 sm:px-8 lg:px-12 py-5 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  );
};
