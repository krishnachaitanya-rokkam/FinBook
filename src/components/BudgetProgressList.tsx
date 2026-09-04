import React from 'react';
import { CategoryAlert } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { SlidersHorizontal, Check } from 'lucide-react';

interface BudgetProgressListProps {
  alerts: CategoryAlert[];
  onOpenBudgetModal: () => void;
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export const BudgetProgressList: React.FC<BudgetProgressListProps> = ({
  alerts,
  onOpenBudgetModal,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div id="category-budgets-card" className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight font-display">
            Category Budget Limits & Progress
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Spending progress relative to monthly caps
          </p>
        </div>
        <button
          id="btn-edit-category-budgets"
          type="button"
          onClick={onOpenBudgetModal}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
          <span>Edit Budgets</span>
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {alerts.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-700">
              Default budget values are set to ₹0
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Category spending progress bars will appear here once you assign monthly budget limits.
            </p>
            <button
              type="button"
              onClick={onOpenBudgetModal}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Set Category Budgets</span>
            </button>
          </div>
        ) : (
          alerts.map((item) => {
          const isSelected = selectedCategory === item.categoryId;
          const isOver = item.severity === 'exceeded';
          const isCrit = item.severity === 'critical';
          const isWarn = item.severity === 'warning';

          const barColor = isOver
            ? 'bg-rose-600'
            : isCrit
            ? 'bg-amber-500'
            : isWarn
            ? 'bg-yellow-500'
            : 'bg-emerald-500';

          const badgeClass = isOver
            ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
            : isCrit
            ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
            : isWarn
            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200/80'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';

          return (
            <div
              key={item.categoryId}
              id={`budget-row-${item.categoryId}`}
              onClick={() => onSelectCategory(isSelected ? null : item.categoryId)}
              className={`group cursor-pointer rounded-lg p-2.5 transition border ${
                isSelected
                  ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900/10'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 border border-slate-100"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    <CategoryIcon categoryId={item.categoryId} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {item.categoryName}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-800 font-bold bg-slate-200/80 px-1.5 py-0.2 rounded-xs">
                          <Check className="h-3 w-3" /> Filtered
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {formatCurrency(item.spent)} spent of {formatCurrency(item.limit)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${badgeClass}`}
                  >
                    {item.percentage}%
                  </span>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5 tabular-nums">
                    {isOver ? (
                      <span className="text-rose-600 font-semibold">
                        +{formatCurrency(item.overAmount)} over
                      </span>
                    ) : (
                      <span>{formatCurrency(item.limit - item.spent)} left</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          );
        })
      )}
      </div>

      {selectedCategory && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition hover:underline"
          >
            Clear category filter
          </button>
        </div>
      )}
    </div>
  );
};
