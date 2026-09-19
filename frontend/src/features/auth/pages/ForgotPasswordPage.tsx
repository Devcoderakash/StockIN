import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Boxes, Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[130px] pointer-events-none" />

      {/* Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(#60a5fa 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 w-full max-w-md bg-slate-900/70 border border-white/10 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl p-6 sm:p-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-white">StockIN</span>
            <p className="text-[10px] uppercase font-semibold text-slate-400">Account Recovery</p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Reset your password
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your registered email address and we&apos;ll dispatch a secure recovery link.
          </p>
        </div>

        {/* State message (e.g. from expired token) */}
        {stateMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{stateMessage}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Recovery Email Dispatched</h2>
              <p className="text-xs text-emerald-200 mt-1.5 leading-relaxed">
                We sent instructions to <strong className="font-semibold text-white">{email}</strong>. Please check your inbox and spam folder.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="name@company.com"
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800/95 border border-slate-700/80 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-500 text-white focus:ring-4 focus:ring-blue-500/15"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[46px] mt-2 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/45 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ring-1 ring-white/15"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Dispatching Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted cryptographic recovery token</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
