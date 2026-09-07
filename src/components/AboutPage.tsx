import React from 'react';
import { ExternalLink, Heart, ShieldCheck } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const iconSrc = `${import.meta.env.BASE_URL}ahviq-icon.svg`;

  return (
    <section className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-5 py-5 text-white sm:px-6 sm:py-6">
          <div className="flex items-center gap-4">
            <img src={iconSrc} alt="AHVIQ" className="h-16 w-16 shrink-0 rounded-2xl" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-200">About</p>
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">AHVIQ</h1>
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200">v1.0.0</span>
              </div>
              <p className="mt-1 text-sm text-slate-200">Your money. Your view.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Built for</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">Personal finance</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Focus</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">Money, budgets & wealth</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approach</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-800">Simple & user-controlled</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Heart className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="font-bold text-base">What is AHVIQ?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">AHVIQ brings everyday money management into one simple view. Track income and expenses, plan budgets, understand spending, manage recurring items, monitor investments and build a clearer picture of your financial life.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><ShieldCheck className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="font-bold text-base">Your data</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your financial records are associated with your signed-in account and synchronized through AHVIQ's cloud data service. Export transactions from Transactions or clear your financial data from Settings.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600"><ExternalLink className="h-5 w-5" /></div>
          <div>
            <h2 className="font-bold text-base">AHVIQ principles</h2>
            <p className="mt-0.5 text-sm text-slate-500">Simple, transparent and user-controlled.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Manual first</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Privacy conscious</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">Your decisions</span>
        </div>
      </div>
    </section>
  );
};
