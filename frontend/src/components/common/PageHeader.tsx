import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, badge }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 mb-4 sm:mb-6 border-b border-slate-200/80">
      <div className="min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 pt-1 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
};
