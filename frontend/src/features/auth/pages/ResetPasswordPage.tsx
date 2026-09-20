import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword, user, loading, isPasswordRecovery } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/forgot-password', {
        replace: true,
        state: { message: 'Your password reset link has expired. Please request a new one.' },
      });
      return;
    }

    if (!isPasswordRecovery) {
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, isPasswordRecovery, navigate]);

  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (!password) {
      setErrorMessage('New password is required.');
      return false;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await updatePassword(password);

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to update password. The reset link may have expired.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);

      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { message: 'Password updated successfully. Please sign in with your new password.' },
        });
      }, 2500);
    } catch {
      setErrorMessage('Failed to update password. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2F8] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center text-center space-y-4 max-w-xs">
          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-xs shrink-0 border border-slate-100 animate-pulse">
            <img src="/logo.png" alt="StockIN" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">StockIN</h2>
            <p className="text-xs text-slate-500 mt-0.5">Verifying reset link...</p>
          </div>
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F2F8] text-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-indigo-500/20 selection:text-indigo-700 antialiased">
      <div className="relative z-10 w-full max-w-[440px] bg-white border border-slate-100/90 rounded-[28px] sm:rounded-[32px] shadow-[0_25px_70px_rgba(79,70,229,0.12),0_10px_30px_rgba(0,0,0,0.03)] p-6 sm:p-10">
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs shadow-blue-500/20 shrink-0 border border-slate-100">
              <img src="/logo.png" alt="StockIN" className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-slate-900">StockIN</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                PRO
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
            Create new password
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
            Your new password must be at least 6 characters long.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">Password reset successful!</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Your password has been changed. Redirecting to login in a moment...
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-xs rounded-xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] transition-all"
              >
                <span>Sign in now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4F46E5] transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4F46E5] transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm rounded-xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.45)] transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Updating password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
