import React from 'react';
import { ArrowDownLeft, CalendarClock, Plus, ReceiptText, Target, TrendingUp, WalletCards } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface Props {
  available: number;
  income: number;
  spent: number;
  budget: number;
  cycleEnd: string;
  onAddExpense: () => void;
  onAddIncome: () => void;
  onOpenBudgets: () => void;
  onOpenRecurring: () => void;
}

export const OverviewInsights: React.FC<Props> = ({ available, income, spent, budget, cycleEnd, onAddExpense, onAddIncome, onOpenBudgets, onOpenRecurring }) => {
  const today = new Date();
  const end = new Date(`${cycleEnd}T23:59:59`);
  const daysLeft = Math.max(1, Math.ceil((end.getTime() - today.getTime()) / 86400000));
  const safeDaily = Math.max(0, available) / daysLeft;
  const budgetLeft = budget - spent;
  const hasBudget = budget > 0;
  const hasIncome = income > 0;

  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-indigo-600">
                <WalletCards className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Safe to spend today</p>
                <p className="text-[11px] text-slate-500">Available money spread across the remaining days</p>
              </div>
            </div>
            <p className={`mt-3 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums ${available > 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(safeDaily)}
              <span className="ml-1 text-sm font-semibold text-slate-500">/ day</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-auto">
            <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Days left</p>
              <p className="mt-0.5 text-sm font-bold text-slate-800">{daysLeft}</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Budget left</p>
              <p className={`mt-0.5 text-sm font-bold ${!hasBudget ? 'text-slate-500' : budgetLeft >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{hasBudget ? formatCurrency(Math.max(0, budgetLeft)) : 'Not set'}</p>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl bg-white border border-slate-200 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <p className={`mt-0.5 text-sm font-bold ${available >= 0 && (!hasBudget || budgetLeft >= 0) ? 'text-emerald-600' : 'text-rose-600'}`}>{available >= 0 && (!hasBudget || budgetLeft >= 0) ? 'On track' : 'Needs attention'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">What do you want to do?</h3>
            <p className="mt-0.5 text-xs text-slate-500">Keep your money picture up to date.</p>
          </div>
          <Plus className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button type="button" onClick={onAddExpense} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">
            <ReceiptText className="h-4 w-4 text-indigo-600" /> Add expense
          </button>
          <button type="button" onClick={onAddIncome} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-3 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
            <ArrowDownLeft className="h-4 w-4" /> Add income
          </button>
          <button type="button" onClick={onOpenBudgets} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">
            <Target className="h-4 w-4 text-sky-600" /> Set budgets
          </button>
          <button type="button" onClick={onOpenRecurring} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">
            <CalendarClock className="h-4 w-4 text-violet-600" /> Manage recurring
          </button>
        </div>
      </div>

      {!hasIncome && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800"><span className="font-bold">Start with income.</span> Add your salary or other regular income to make your safe-to-spend number meaningful.</p>
          <button type="button" onClick={onAddIncome} className="ml-auto shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white">Add income</button>
        </div>
      )}
    </div>
  );
};
