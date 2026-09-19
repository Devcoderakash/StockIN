import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'lg',
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

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="relative z-10 flex min-h-full items-center justify-center p-2.5 sm:p-4 text-center">
        <div
          className={`w-full ${maxWidthClasses} max-w-[calc(100vw-20px)] sm:max-w-none overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-slate-200/80 my-4 sm:my-8`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 p-4 sm:p-5 gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-semibold text-slate-900">{title}</div>
              {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 max-h-[calc(88vh-130px)] overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2 sm:gap-3 border-t border-slate-100 bg-slate-50/75 px-4 py-3 sm:px-6 sm:py-4 rounded-b-2xl flex-wrap">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
