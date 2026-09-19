import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  iconBgColor?: string;
  badgeText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  iconBgColor = 'bg-blue-50 text-blue-600',
  badgeText,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs hover:border-slate-300 transition-all duration-200 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5 sm:mb-1 truncate">
            {title}
          </p>
          <h3 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 truncate">
            {value}
          </h3>
        </div>
        <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${iconBgColor}`}>{icon}</div>
      </div>

      <div className="mt-2.5 sm:mt-4 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs">
        {change && (
          <div className="flex items-center gap-1 font-medium truncate max-w-full">
            <span
              className={`inline-flex items-center text-[11px] sm:text-xs font-semibold shrink-0 ${
                change.isPositive ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {change.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              )}
              {change.value}
            </span>
            <span className="text-slate-400 font-normal hidden xs:inline truncate">vs last month</span>
          </div>
        )}

        {subtitle && !change && (
          <span className="text-slate-400 truncate text-[11px]">{subtitle}</span>
        )}

        {badgeText && (
          <span className="ml-auto text-[10px] sm:text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
};
