import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Boxes } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center text-center space-y-4 max-w-xs animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Boxes className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">StockIN</h2>
            <p className="text-xs text-slate-500 mt-0.5">Checking session...</p>
          </div>
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    // Preserve the target URL in location state so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
