import React from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { CategoryAlert } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  alerts: CategoryAlert[];
  onOpenBudgets: () => void;
  onSelectCategory?: (categoryId: string | null) => void;
}

export const BudgetOverviewCard: React.FC<Props> = ({ alerts, onOpenBudgets, onSelectCategory }) => {
  const visible = [...alerts].sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  const totalBudget = alerts.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = alerts.reduce((sum, item) => sum + item.spent, 0);
  const hasBudget = totalBudget > 0;
  const overallPct = hasBudget ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Budget by category</h3>
          <p className="mt-0.5 text-xs text-slate-500">See where your spending room is getting tight.</p>
        </div>
        <button type="button" onClick={onOpenBudgets} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {!hasBudget ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center">
          <SlidersHorizontal className="mx-auto h-5 w-5 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Set budgets to see your spending room</p>
          <button type="button" onClick={onOpenBudgets} className="mt-3 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white">Set my budgets</button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">{formatCurrency(totalSpent)} spent of {formatCurrency(totalBudget)}</span>
            <span className={`font-bold ${overallPct > 100 ? 'text-rose-600' : overallPct >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{overallPct}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${overallPct > 100 ? 'bg-rose-500' : overallPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(overallPct, 100)}%` }} />
          </div>
          <div className="mt-4 space-y-3">
            {visible.map(item => {
              const pct = Math.min(item.percentage, 100);
              const over = item.severity === 'exceeded';
              const tight = item.percentage >= 80;
              return (
                <button key={item.categoryId} type="button" onClick={() => onSelectCategory?.(item.categoryId)} className="block w-full text-left group">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                      <CategoryIcon categoryId={item.categoryId} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-slate-800">{item.categoryName}</span>
                        <span className={`shrink-0 text-[11px] font-bold ${over ? 'text-rose-600' : tight ? 'text-amber-600' : 'text-slate-500'}`}>{item.percentage}%</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <span className={`block h-full rounded-full ${over ? 'bg-rose-500' : tight ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                    <span className="hidden sm:block shrink-0 text-[11px] font-semibold text-slate-500 tabular-nums">{over ? `+${formatCurrency(item.overAmount)}` : `${formatCurrency(Math.max(0, item.limit - item.spent))} left`}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {alerts.length > 5 && <button type="button" onClick={onOpenBudgets} className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">View {alerts.length - 5} more categories</button>}
        </>
      )}
    </section>
  );
};
