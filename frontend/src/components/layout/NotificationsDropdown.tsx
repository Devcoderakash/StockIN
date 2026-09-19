import React, { useRef, useEffect } from 'react';
import { useAppState } from '@/context/AppStateContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Package, FileText, IndianRupee, ShoppingCart, CheckCheck, X } from 'lucide-react';

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, clearNotification } = useAppState();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock':
        return <Package className="w-4 h-4 text-amber-600" />;
      case 'invoice':
        return <FileText className="w-4 h-4 text-rose-600" />;
      case 'payment':
        return <IndianRupee className="w-4 h-4 text-emerald-600" />;
      case 'purchase':
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No notifications right now.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markNotificationAsRead(n.id);
                if (n.link) {
                  navigate(n.link);
                  onClose();
                }
              }}
              className={`p-3.5 flex items-start gap-3 hover:bg-slate-50/80 cursor-pointer transition-colors relative ${
                !n.read ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">{getIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{n.title}</p>
                  <span className="text-[10px] text-slate-400 shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.read && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearNotification(n.id);
                  }}
                  className="text-slate-300 hover:text-slate-500 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
