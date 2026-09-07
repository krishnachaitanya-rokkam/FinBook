import React from 'react';
import { ExternalLink, Heart, ShieldCheck, Sparkles } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800 px-6 py-8 text-white sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">About</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">AHVIQ</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200">Your money. Your view.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Built for</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Personal finance</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Focus</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Money, budgets & wealth</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Version</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">1.0.0</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Heart className="h-5 w-5" /></div>
            <h2 className="font-bold">What is AHVIQ?</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">AHVIQ brings everyday money management into one simple view. Track income and expenses, plan budgets, understand spending, manage recurring items, monitor investments and build a clearer picture of your financial life.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><ShieldCheck className="h-5 w-5" /></div>
            <h2 className="font-bold">Your data</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">Your AHVIQ financial records are associated with your signed-in account and synchronized through the app's cloud data service. You can export your transaction data from the Transactions view and clear your financial data from Settings.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">AHVIQ principles</h2>
            <p className="mt-1 text-sm text-slate-500">Simple, transparent and user-controlled.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1.5">Manual first</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">Privacy conscious</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">Your decisions</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="font-semibold">Need help or want to share feedback?</p>
          <p className="mt-1 text-sm text-slate-500">We can add a dedicated feedback channel as AHVIQ grows.</p>
        </div>
        <ExternalLink className="hidden h-5 w-5 text-slate-400 sm:block" />
      </div>
    </section>
  );
};
