import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl' | '2xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="relative z-10 fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div
          className={`w-screen max-w-full ${widthClasses} bg-white shadow-2xl flex flex-col border-l border-slate-200/80 animate-in slide-in-from-right duration-200`}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-5 bg-slate-50/50 gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 truncate">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-2 sm:gap-3 flex-wrap">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
