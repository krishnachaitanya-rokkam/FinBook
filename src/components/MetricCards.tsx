import React from 'react';
import { IndianRupee, Wallet, TrendingUp, AlertOctagon } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MetricCardsProps {
  totalSpent: number;
  totalBudget: number;
  monthKey: string;
  transactionCount: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ totalSpent, totalBudget, monthKey, transactionCount }) => {
  const hasBudget = totalBudget > 0;
  const remainingBudget = totalBudget - totalSpent;
  const isOverBudget = hasBudget && remainingBudget < 0;
  const budgetUtilization = hasBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const [year, month] = monthKey.split('-').map(Number);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysInMonth = new Date(year, month, 0).getDate();
  const elapsedDays = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
  const dailyAverage = totalSpent / elapsedDays;
  const projectedMonthTotal = dailyAverage * daysInMonth;

  const cards = [
    {
      id: 'metric-total-spent',
      label: 'Spent',
      value: formatCurrency(totalSpent),
      meta: `${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`,
      badge: hasBudget ? `${budgetUtilization}% of budget` : 'No budget',
      icon: IndianRupee,
      iconClass: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      id: 'metric-total-budget',
      label: 'Budget',
      value: formatCurrency(totalBudget),
      meta: hasBudget ? 'Monthly spending limit' : 'No cap configured',
      badge: hasBudget ? `${Math.max(0, 100 - budgetUtilization)}% remaining` : 'Uncapped',
      icon: Wallet,
      iconClass: 'bg-sky-50 text-sky-600 border-sky-100',
    },
    {
      id: 'metric-remaining-budget',
      label: isOverBudget ? 'Over budget' : 'Remaining',
      value: !hasBudget ? formatCurrency(0) : isOverBudget ? `-${formatCurrency(Math.abs(remainingBudget))}` : formatCurrency(remainingBudget),
      meta: !hasBudget ? 'Set a monthly budget to track this' : isOverBudget ? 'Budget limit exceeded' : 'Available within budget',
      badge: !hasBudget ? 'No cap' : isOverBudget ? 'Action needed' : 'On track',
      icon: isOverBudget ? AlertOctagon : IndianRupee,
      iconClass: isOverBudget ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100',
      valueClass: isOverBudget ? 'text-rose-600' : 'text-slate-900',
    },
    {
      id: 'metric-daily-average',
      label: 'Daily pace',
      value: formatCurrency(dailyAverage),
      meta: isCurrentMonth ? `Day ${elapsedDays} of ${daysInMonth}` : 'Full month',
      badge: `Est. ${formatCurrency(projectedMonthTotal)}`,
      icon: TrendingUp,
      iconClass: 'bg-violet-50 text-violet-600 border-violet-100',
    },
  ];

  return (
    <div id="metric-summary-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.id} id={card.id} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
              <span className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border ${card.iconClass}`}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </span>
            </div>
            <div className={`mt-2 text-[18px] sm:text-xl lg:text-2xl font-bold tracking-tight font-display tabular-nums truncate ${card.valueClass || 'text-slate-900'}`} title={card.value}>
              {card.value}
            </div>
            <div className="mt-2 flex min-w-0 items-center justify-between gap-1.5">
              <span className="min-w-0 truncate text-[10px] sm:text-[11px] text-slate-500">{card.meta}</span>
              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-600 tabular-nums">{card.badge}</span>
            </div>
            {card.id === 'metric-total-budget' && hasBudget && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all ${budgetUtilization > 100 ? 'bg-rose-500' : budgetUtilization > 85 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(budgetUtilization, 100)}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
