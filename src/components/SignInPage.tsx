import React, { useState } from 'react';
import { AuthUser } from '../types';
import { loginUser, signupUser, loginDemoUser } from '../services/authService';
import {
  IndianRupee,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Database,
  PieChart,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SignInPageProps {
  onSignInSuccess: (user: AuthUser) => void;
  supabaseConfigured?: boolean;
}

export const SignInPage: React.FC<SignInPageProps> = ({
  onSignInSuccess,
  supabaseConfigured = false,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('chaitu.krishna580@gmail.com');
  const [password, setPassword] = useState('pass1234');
  const [name, setName] = useState('Chaitu Krishna');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 4) {
      setErrorMessage('Please enter a password with at least 4 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const res = await signupUser(trimmedEmail, password, name.trim());
        if (res.success && res.user) {
          onSignInSuccess(res.user);
        } else {
          setErrorMessage(res.error || 'Failed to create account.');
        }
      } else {
        const res = await loginUser(trimmedEmail, password);
        if (res.success && res.user) {
          onSignInSuccess(res.user);
        } else {
          setErrorMessage(res.error || 'Invalid credentials or sign-in error.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (userEmail = 'chaitu.krishna580@gmail.com', userName = 'Chaitu Krishna') => {
    setIsLoading(true);
    const user = loginDemoUser(userEmail, userName);
    setTimeout(() => {
      onSignInSuccess(user);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-radial-[at_top_right] from-slate-50 via-slate-100/60 to-slate-200/40 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Title */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md shadow-slate-900/10">
            <IndianRupee className="h-6 w-6 text-white" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display">
          FinBook
        </h1>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Monthly Spending Analytics, Category Budget Alerts & Supabase Cloud Sync
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200/60">
            <button
              id="tab-mode-signin"
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                !isSignUp
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-mode-signup"
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                isSignUp
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label
                  htmlFor="input-auth-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="input-auth-name"
                    type="text"
                    required={isSignUp}
                    placeholder="e.g. Chaitu Krishna"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="input-auth-email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="input-auth-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => handleQuickDemo()}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition"
                  >
                    Quick fill credentials
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id="input-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition active:scale-[0.99] disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account & Continue' : 'Sign In to Tracker'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Access for Seamless Testing */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Or Fast 1-Click Sign In
            </div>

            <div className="space-y-2">
              <button
                id="btn-auth-quick-chaitu"
                type="button"
                onClick={() => handleQuickDemo('chaitu.krishna580@gmail.com', 'Chaitu Krishna')}
                className="w-full flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-left text-xs font-semibold text-emerald-900 hover:bg-emerald-100/70 transition shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                    CK
                  </div>
                  <div>
                    <div className="font-bold text-emerald-950">Chaitu Krishna</div>
                    <div className="text-[11px] text-emerald-700 font-normal">chaitu.krishna580@gmail.com</div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-600 text-white px-2 py-1 text-[10px] font-bold">
                  Continue <ArrowRight className="h-3 w-3" />
                </span>
              </button>

              <button
                id="btn-auth-demo-guest"
                type="button"
                onClick={() => handleQuickDemo('guest@expensetracker.local', 'Demo Guest')}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Explore as Demo Guest</span>
              </button>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Rupee (₹) Analytics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>Encrypted Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <PieChart className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Budget Limit Alerts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-700 shrink-0" />
              <span>Supabase Cloud Sync</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-400">
          {supabaseConfigured ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Cloud Database & Auth Connected
            </span>
          ) : (
            <span>Data stored securely with local persistence & cloud sync options</span>
          )}
        </div>
      </div>
    </div>
  );
};
