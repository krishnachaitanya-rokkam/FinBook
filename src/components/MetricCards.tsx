import React from 'react';
import { IndianRupee, Wallet, TrendingUp, AlertOctagon } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MetricCardsProps {
  totalSpent: number;
  totalBudget: number;
  monthKey: string;
  transactionCount: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalSpent,
  totalBudget,
  monthKey,
  transactionCount,
}) => {
  const hasBudget = totalBudget > 0;
  const remainingBudget = totalBudget - totalSpent;
  const isOverBudget = hasBudget && remainingBudget < 0;
  const budgetUtilization = hasBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Compute daily average for the month
  const [year, month] = monthKey.split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  
  // Total days in that month
  const daysInMonth = new Date(year, month, 0).getDate();
  const elapsedDays = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
  const dailyAverage = totalSpent / elapsedDays;
  const projectedMonthTotal = dailyAverage * daysInMonth;

  return (
    <div id="metric-summary-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Total Spent */}
      <div
        id="metric-total-spent"
        className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition duration-150 hover:shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Spent
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-display tabular-nums">
            {formatCurrency(totalSpent)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{transactionCount} transaction{transactionCount === 1 ? '' : 's'}</span>
          <span className="inline-flex items-center rounded-md bg-slate-100/90 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 tabular-nums">
            {hasBudget ? `${budgetUtilization}% of budget` : 'No budget set'}
          </span>
        </div>
      </div>

      {/* Metric 2: Total Budget */}
      <div
        id="metric-total-budget"
        className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition duration-150 hover:shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Monthly Target
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100 text-blue-700">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-display tabular-nums">
            {formatCurrency(totalBudget)}
          </span>
        </div>
        <div className="mt-3">
          {!hasBudget ? (
            <span className="text-[11px] text-slate-400 font-medium">Default ₹0 (Uncapped)</span>
          ) : (
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetUtilization > 100
                    ? 'bg-rose-500'
                    : budgetUtilization > 85
                    ? 'bg-amber-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Metric 3: Remaining Balance */}
      <div
        id="metric-remaining-budget"
        className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition duration-150 hover:shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {!hasBudget ? 'Remaining Budget' : isOverBudget ? 'Budget Deficit' : 'Remaining Budget'}
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              !hasBudget
                ? 'bg-slate-50 border-slate-200/80 text-slate-600'
                : isOverBudget
                ? 'bg-rose-50 border-rose-200/80 text-rose-700'
                : 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
            }`}
          >
            {isOverBudget ? <AlertOctagon className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold tracking-tight font-display tabular-nums ${
              !hasBudget
                ? 'text-slate-900'
                : isOverBudget
                ? 'text-rose-600'
                : 'text-emerald-600'
            }`}
          >
            {!hasBudget
              ? formatCurrency(0)
              : isOverBudget
              ? `-${formatCurrency(Math.abs(remainingBudget))}`
              : formatCurrency(remainingBudget)}
          </span>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {!hasBudget ? (
            <span className="text-slate-400 text-[11px]">No budget cap set</span>
          ) : isOverBudget ? (
            <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
              Over budget limit
            </span>
          ) : (
            <span>Available for remaining days</span>
          )}
        </div>
      </div>

      {/* Metric 4: Daily Average & Projection */}
      <div
        id="metric-daily-average"
        className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition duration-150 hover:shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Daily Spend Pace
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 font-display tabular-nums">
            {formatCurrency(dailyAverage)}
          </span>
          <span className="text-xs text-slate-500 font-normal">/ day</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{isCurrentMonth ? `Day ${elapsedDays} of ${daysInMonth}` : 'Full month'}</span>
          <span className="font-semibold text-slate-700 tabular-nums">
            Est. {formatCurrency(projectedMonthTotal)}
          </span>
        </div>
      </div>
    </div>
  );
};
