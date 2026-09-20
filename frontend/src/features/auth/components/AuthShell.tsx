import React from 'react';
import { Zap, Check, ShieldCheck } from 'lucide-react';

interface AuthShellProps {
  children: React.ReactNode;
  cardMaxWidth?: string;
  panelHeadline?: string;
  panelSubtitle?: string;
  panelHighlights?: string[];
  footerBadgeText?: string;
}

export const AuthShell: React.FC<AuthShellProps> = ({
  children,
  cardMaxWidth = 'max-w-5xl',
  panelHeadline = 'Manage inventory, billing and business operations in one place.',
  panelSubtitle = 'Precision inventory movements, instant GST billing, quotations, and automated customer ledgers.',
  panelHighlights = [
    'Inventory Management',
    'GST Billing',
    'Quotations & Invoices',
  ],
  footerBadgeText = 'Enterprise Cloud Security',
}) => {
  return (
    <div className="min-h-screen text-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden selection:bg-blue-500/20 selection:text-blue-700">
      {/* Enhanced Cloudscape Background */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <picture>
          <source srcSet="/images/auth-bg.webp" type="image/webp" />
          <img
            src="/images/auth-bg.jpg"
            alt="Sky and cloud background"
            className="w-full h-full object-cover object-center transform scale-105"
          />
        </picture>
        {/* Soft atmospheric overlay: gentle gradient and subtle glass frost */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/15 via-transparent to-indigo-950/25" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
      </div>

      {/* Centered Authentication Card */}
      <div
        className={`relative z-10 w-full ${cardMaxWidth} bg-white/95 backdrop-blur-2xl rounded-3xl border border-white/80 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.25)] overflow-hidden grid grid-cols-1 lg:grid-cols-12`}
      >
        {/* Left: Brand / Gradient Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 sm:p-8 lg:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle ambient light accents inside panel */}
          <div className="absolute -top-16 -left-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Branding Section */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-white">StockIN</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 bg-white/15 px-1.5 py-0.5 rounded-full border border-white/20">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-blue-100/90 tracking-wide uppercase">
                  Inventory & Business
                </p>
              </div>
            </div>

            {/* Headline and Highlights (Full on desktop, compact on mobile) */}
            <div className="hidden lg:block mt-12 space-y-4">
              <h2 className="text-2xl font-extrabold tracking-tight text-white leading-snug">
                {panelHeadline}
              </h2>
              <p className="text-xs text-blue-100/80 leading-relaxed font-normal">
                {panelSubtitle}
              </p>

              <div className="pt-6 space-y-3">
                {panelHighlights.map((highlight, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-blue-50 font-medium">
                    <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Security / Trust indicator */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/15 flex items-center justify-between text-xs text-blue-100/80">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              {footerBadgeText}
            </span>
            <span className="text-blue-200/70 font-mono text-[11px]">v3.2</span>
          </div>
        </div>

        {/* Right: Authentication Form Area */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-10 lg:p-14 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
};
