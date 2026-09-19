import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Boxes,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  TrendingUp,
  Receipt,
  LockKeyhole,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read message from route state (e.g. redirected after password reset)
  const stateMessage = (location.state as { message?: string } | null)?.message;

  const validateForm = (): boolean => {
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Email address is required.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (!password) {
      setErrorMessage('Password is required.');
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
      const result = await signIn(email, password);

      if (!result.success) {
        setErrorMessage(result.error || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      // Navigate to intended destination or default to dashboard
      const destination =
        (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch {
      setErrorMessage('Unable to sign in right now. Please verify your connection.');
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@stockin.io');
    setPassword('StockIN@Demo2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Ambient background glows & mesh grid */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* Subtle geometric dot grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(#60a5fa 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Glassmorphic Container */}
      <div className="relative z-10 w-full max-w-5xl bg-slate-900/70 border border-white/10 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Brand & Interactive Showcase Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900/90 to-blue-950/80 p-8 sm:p-10 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
          {/* Subtle accent sheen */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Logo & Version Pill */}
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
                  <Boxes className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                    StockIN
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  </span>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-slate-400">
                    Enterprise ERP Suite
                  </p>
                </div>
              </div>

              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>v3.2 Production</span>
              </div>
            </div>

            {/* Tagline & Pitch */}
            <div className="mt-10 space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Sub-10ms Atomic Operations
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Precision Inventory & <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                  Automated GST Billing
                </span>
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seamlessly unify live warehouse movements, quotation estimates, tax invoices, and payment tracking with zero overselling risk.
              </p>
            </div>

            {/* Floating Telemetry Showcase Card */}
            <div className="mt-8 space-y-3">
              {/* Live Invoice Preview Micro-card */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-inner space-y-2.5 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-400" />
                    <span className="font-mono font-bold text-slate-200">INV-2026-089</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    PAID
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <p className="text-[11px] text-slate-400">Apex Global Logistics</p>
                    <p className="text-[10px] font-mono text-slate-500">GSTIN: 27AABCA1234B1Z</p>
                  </div>
                  <span className="text-sm font-bold text-white tracking-tight">₹1,48,250.00</span>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" /> Stock Deducted Atomically
                  </span>
                  <span>Vector PDF 1.4 Ready</span>
                </div>
              </div>

              {/* Real-time Metric Pill */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] text-slate-300">Live Inventory Telemetry</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-emerald-400">
                  99.98% Accuracy
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Row Level Security Enforced
            </span>
            <span className="text-slate-500 font-mono">256-Bit SSL</span>
          </div>
        </div>

        {/* Right Side: High-Performance Sign-In Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/40">
          <div className="max-w-md w-full mx-auto">
            {/* Header with Quick Fill Button */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Welcome Back
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Access your enterprise dashboard and live registers.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDemoFill}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Fill demo credentials"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fill Demo</span>
              </button>
            </div>

            {/* Success notification banner from previous flow */}
            {stateMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{stateMessage}</span>
              </div>
            )}

            {/* Error Alert Banner */}
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
              {/* Email Address */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
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

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full min-h-[46px] pl-10 pr-11 py-2.5 text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800/95 border border-slate-700/80 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-500 text-white focus:ring-4 focus:ring-blue-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Demo Fill Link (Mobile) */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">Keep me signed in</span>
                </label>

                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="sm:hidden text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Fill Demo Credentials
                </button>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[48px] mt-3 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/45 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ring-1 ring-white/15"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to StockIN</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Help Note */}
            <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <LockKeyhole className="w-3.5 h-3.5 text-blue-400" />
                Testing? Click &quot;Fill Demo&quot; to populate.
              </span>
              <button
                type="button"
                onClick={handleDemoFill}
                className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
              >
                Auto-fill
              </button>
            </div>

            {/* Switch to Register */}
            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Don&apos;t have an account yet?{' '}
                <Link
                  to="/register"
                  className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors ml-1"
                >
                  Create free organization
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
