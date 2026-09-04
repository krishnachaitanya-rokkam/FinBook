import React, { useState } from 'react';
import { AuthUser } from '../types';
import { loginUser, signupUser } from '../services/authService';
import { IndianRupee, Lock, Mail, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface SignInPageProps { onSignInSuccess: (user: AuthUser) => void; supabaseConfigured?: boolean; }

export const SignInPage: React.FC<SignInPageProps> = ({ onSignInSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const result = isSignUp ? await signupUser(email.trim(), password, name.trim()) : await loginUser(email.trim(), password);
    setLoading(false);
    if (result.success && result.user) onSignInSuccess(result.user); else setError(result.error || 'Unable to continue.');
  };

  return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-7">
      <div className="text-center mb-7">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center"><IndianRupee className="h-6 w-6" /></div>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">FinBook</h1>
        <p className="mt-1 text-sm text-slate-500">Your personal expenses, budgets and investments.</p>
      </div>
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
        <button type="button" onClick={() => {setIsSignUp(false);setError(null)}} className={`flex-1 py-2 text-sm font-semibold rounded-lg ${!isSignUp?'bg-white shadow text-slate-900':'text-slate-500'}`}>Sign In</button>
        <button type="button" onClick={() => {setIsSignUp(true);setError(null)}} className={`flex-1 py-2 text-sm font-semibold rounded-lg ${isSignUp?'bg-white shadow text-slate-900':'text-slate-500'}`}>Create Account</button>
      </div>
      {error && <div className="mb-4 flex gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        {isSignUp && <div><label className="block text-sm font-semibold mb-1">Full Name</label><div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input required value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5" placeholder="Your name"/></div></div>}
        <div><label className="block text-sm font-semibold mb-1">Email</label><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5" placeholder="you@example.com"/></div></div>
        <div><label className="block text-sm font-semibold mb-1">Password</label><div className="relative"><Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input required type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 pl-9 pr-10 py-2.5" placeholder="At least 6 characters"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></div>
        <button disabled={loading} className="w-full rounded-xl bg-slate-900 text-white py-3 font-semibold disabled:opacity-60 flex justify-center gap-2">{loading?'Please wait…':isSignUp?'Create Account':'Sign In'}{!loading&&<ArrowRight className="h-4 w-4"/>}</button>
      </form>
      <p className="text-xs text-center text-slate-400 mt-5">Your financial data is stored under your own account.</p>
    </div>
  </div>;
};
