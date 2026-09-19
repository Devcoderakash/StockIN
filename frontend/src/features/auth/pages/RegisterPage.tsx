import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Boxes,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Building2,
  User,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Check,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVerificationMessage, setSuccessVerificationMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (!businessName.trim()) {
      setErrorMessage('Business or company name is required.');
      return false;
    }

    if (!fullName.trim()) {
      setErrorMessage('Your full name is required.');
      return false;
    }

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

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
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
      const result = await signUp({
        email,
        password,
        fullName,
        businessName,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to create account. Please verify your details.');
        setIsLoading(false);
        return;
      }

      if (result.needsEmailVerification) {
        setSuccessVerificationMessage(
          'Account created successfully. A verification link has been sent to your email.'
        );
        setIsLoading(false);
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch {
      setErrorMessage('Unable to register right now. Please check your network connection.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-blue-600/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* Dot Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: `radial-gradient(#60a5fa 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Glass Container */}
      <div className="relative z-10 w-full max-w-5xl bg-slate-900/70 border border-white/10 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Side: Brand Showcase */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900/90 to-blue-950/80 p-8 sm:p-10 flex-col justify-between relative border-r border-white/10 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
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

            <div className="mt-10 space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Dedicated Business Tenant
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Empower your trade with <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                  instant cloud setup.
                </span>
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Provision your secure, isolated PostgreSQL database workspace with automatic Row Level Security and live multi-register sync.
              </p>
            </div>

            {/* Feature List */}
            <div className="mt-8 space-y-3">
              {[
                'Row Level Security (RLS) Database Isolation',
                'Quotation-to-Invoice 1-Click Conversion',
                'Real-Time Inbound & Outbound Stock Movements',
                'Client-Side Vector PDF 1.4 Generation',
                'Supabase Storage Document Archiving & History',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5 text-xs text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              100% Data Confidentiality
            </span>
            <span className="text-slate-500 font-mono">SOC-2 & RLS Compliant</span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-slate-900/40">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Create your Organization
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Enter your details to launch your StockIN workspace in seconds.
              </p>
            </div>

            {/* Verification Success View */}
            {successVerificationMessage ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-in fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Verification Link Sent</h3>
                  <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                    {successVerificationMessage}
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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

                <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                  {/* Business Name */}
                  <div>
                    <label
                      htmlFor="reg-business-name"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      Business or Store Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-business-name"
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => {
                          setBusinessName(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="e.g. Acme Timber & Hardware"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800/95 border border-slate-700/80 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-500 text-white focus:ring-4 focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="reg-full-name"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      Full Name (Owner / Admin) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-full-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800/95 border border-slate-700/80 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-500 text-white focus:ring-4 focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      Work Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="rahul@acmetimber.in"
                        className="w-full min-h-[44px] pl-10 pr-3.5 py-2 text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800/95 border border-slate-700/80 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-500 text-white focus:ring-4 focus:ring-blue-500/15"
                      />
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="reg-password"
                        className="block text-xs font-semibold text-slate-300 mb-1"
                      >
                        Password <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="Min 6 chars"
                          className="w-full min-h-[44px] pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800/95 border border-slate-700/80 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-500 text-white focus:ring-4 focus:ring-blue-500/15"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="reg-confirm-password"
                        className="block text-xs font-semibold text-slate-300 mb-1"
                      >
                        Confirm <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          id="reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errorMessage) setErrorMessage(null);
                          }}
                          placeholder="Re-enter password"
                          className="w-full min-h-[44px] pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-800/60 hover:bg-slate-800/80 focus:bg-slate-800/95 border border-slate-700/80 focus:border-blue-500 rounded-xl outline-none transition-all placeholder:text-slate-500 text-white focus:ring-4 focus:ring-blue-500/15"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[46px] mt-4 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 hover:shadow-blue-600/45 transition-all duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ring-1 ring-white/15"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Provisioning Organization...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Business Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Login */}
                <div className="mt-5 pt-5 border-t border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors ml-1"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
