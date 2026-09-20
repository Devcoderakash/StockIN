import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordReset } = useAuth();
  const location = useLocation();

  // May receive a message from ResetPasswordPage when reset link has expired
  const stateMessage = (location.state as { message?: string } | null)?.message;

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await sendPasswordReset(cleanEmail);

      if (!result.success) {
        setErrorMessage(result.error || 'Unable to send password reset link. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsSubmitted(true);
      setIsLoading(false);
    } catch {
      setErrorMessage('Unable to process your request. Please check your connection and try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F2F8] text-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-indigo-500/20 selection:text-indigo-700 antialiased">
      <div className="relative z-10 w-full max-w-[440px] bg-white border border-slate-100/90 rounded-[28px] sm:rounded-[32px] shadow-[0_25px_70px_rgba(79,70,229,0.12),0_10px_30px_rgba(0,0,0,0.03)] p-6 sm:p-10">
        {/* Header with real StockIN Logo */}
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
            Reset password
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
            Enter your email and we'll send you instructions to reset your password.
          </p>
        </div>

        {/* Expired link warning passed via state */}
        {stateMessage && !isSubmitted && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{stateMessage}</p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-medium leading-relaxed">{errorMessage}</p>
          </div>
        )}

        {isSubmitted ? (
          <div className="text-center py-4 space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-900">Check your inbox</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                If an account exists for <strong className="text-slate-800">{email}</strong>, you will receive password reset instructions shortly.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-xs rounded-xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] transition-all"
              >
                <span>Return to sign in</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-xs font-semibold text-slate-800 mb-1.5"
              >
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@business.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4F46E5] transition-all disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium text-sm rounded-xl shadow-[0_10px_25px_-5px_rgba(79,70,229,0.45)] transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending instructions...</span>
                </>
              ) : (
                <span>Send Reset Instructions</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
