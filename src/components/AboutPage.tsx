import React from 'react';
import { CalendarDays, Target, Info, LayoutGrid, PieChart, ShieldCheck, WalletCards, BarChart3, UserRound } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const iconSrc = `${import.meta.env.BASE_URL}ahviq-icon.svg`;

  const features = [
    { icon: WalletCards, title: 'Track Money', description: 'Income, expenses and net cash flow', tone: 'bg-emerald-50 text-emerald-600' },
    { icon: PieChart, title: 'Plan Budgets', description: 'Set limits and stay on track', tone: 'bg-violet-50 text-violet-700' },
    { icon: BarChart3, title: 'Grow Wealth', description: 'Monitor investments and net worth', tone: 'bg-blue-50 text-blue-700' },
    { icon: CalendarDays, title: 'Stay Organized', description: 'Manage recurring transactions', tone: 'bg-orange-50 text-orange-600' },
    { icon: Target, title: 'Achieve Goals', description: 'Plan and track your financial goals', tone: 'bg-pink-50 text-pink-600' },
  ];

  return (
    <section className="space-y-3 pb-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-indigo-950 via-indigo-800 to-slate-900 px-4 py-5 text-white sm:px-6 sm:py-6">
          <div className="relative flex items-center gap-4">
            <img src={iconSrc} alt="AHVIQ" className="h-20 w-20 shrink-0 rounded-2xl bg-white p-1 object-contain shadow-sm sm:h-24 sm:w-24" />
            <div className="min-w-0 pr-16">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-100">About</p>
              <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">AHVIQ</h1>
              <p className="mt-1 text-base font-bold text-white sm:text-lg">Your money. Your view.</p>
              <p className="mt-0.5 text-xs font-medium text-indigo-100 sm:text-sm">Simple. Smarter. Financially you.</p>
            </div>
            <span className="absolute right-0 top-0 rounded-full border border-white/40 bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">v1.0.0</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 p-2.5 sm:gap-3 sm:p-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-3 sm:px-3.5"><div className="flex items-center gap-2"><span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700"><UserRound className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Built for</p><p className="text-xs font-bold text-slate-900 sm:text-sm">Personal finance</p></div></div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-3 sm:px-3.5"><div className="flex items-center gap-2"><span className="rounded-lg bg-violet-50 p-1.5 text-violet-700"><Target className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Focus</p><p className="text-xs font-bold leading-4 text-slate-900 sm:text-sm">Money, budgets & wealth</p></div></div></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-3 sm:px-3.5"><div className="flex items-center gap-2"><span className="rounded-lg bg-blue-50 p-1.5 text-blue-700"><BarChart3 className="h-4 w-4" /></span><div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Version</p><p className="text-xs font-bold text-slate-900 sm:text-sm">1.0.0</p></div></div></div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><Info className="h-5 w-5" /></div><div className="min-w-0"><h2 className="text-lg font-extrabold tracking-tight text-slate-950">What is AHVIQ?</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-[15px]">AHVIQ brings everyday money management into one simple view. Track income and expenses, plan budgets, understand spending, manage recurring items, monitor investments and build a clearer picture of your financial life.</p></div></div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><LayoutGrid className="h-5 w-5" /></div><h2 className="text-lg font-extrabold tracking-tight text-slate-950">Key Features</h2></div><div className="mt-2">{features.map(({ icon: Icon, title, description, tone }, index) => (<div key={title} className={`flex items-center gap-3 py-2.5 ${index < features.length - 1 ? 'border-b border-slate-200' : ''}`}><div className={`shrink-0 rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-950 sm:text-[15px]">{title}</p><p className="text-xs font-medium leading-5 text-slate-600 sm:text-sm">{description}</p></div><span className="text-xl font-semibold leading-none text-slate-500">›</span></div>))}</div></div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm sm:p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><ShieldCheck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold tracking-tight text-emerald-700">Your Data, Your Control</h2><span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Private & Secure</span></div><p className="mt-2 text-sm font-medium leading-5 text-slate-600">Your data is stored securely in your own Firebase account. You can export or delete your data anytime.</p></div></div></div>
    </section>
  );
};
