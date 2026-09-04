import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { CategoryAlert } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';

interface BudgetAlertsBannerProps {
  alerts: CategoryAlert[];
  exceededCount: number;
  criticalCount: number;
  warningCount: number;
  onOpenBudgetModal: () => void;
  onFilterByCategory?: (categoryId: string) => void;
}

export const BudgetAlertsBanner: React.FC<BudgetAlertsBannerProps> = ({
  alerts,
  exceededCount,
  criticalCount,
  warningCount,
  onOpenBudgetModal,
  onFilterByCategory,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const attentionAlerts = alerts.filter(
    (a) => a.severity === 'exceeded' || a.severity === 'critical' || a.severity === 'warning'
  );

  if (alerts.length === 0) {
    return (
      <div
        id="budget-alerts-none"
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/90 px-5 py-4 text-slate-800 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-600 shadow-2xs">
            <Settings className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900 font-display">
              Default Budgets Set to ₹0
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Category budget values currently default to ₹0. Set custom monthly targets to enable threshold monitoring.
            </p>
          </div>
        </div>
        <button
          id="btn-manage-budgets-zero"
          type="button"
          onClick={onOpenBudgetModal}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Set Category Limits</span>
        </button>
      </div>
    );
  }

  if (attentionAlerts.length === 0) {
    return (
      <div
        id="budget-alerts-healthy"
        className="flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-200/90 px-5 py-4 text-emerald-950 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100/90 border border-emerald-200 text-emerald-800 shadow-2xs">
            <CheckCircle className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-emerald-950 font-display">
              Budgets on Track
            </h2>
            <p className="text-xs text-emerald-800 mt-0.5">
              All categories are within safe spending thresholds (under 75% of monthly target).
            </p>
          </div>
        </div>
        <button
          id="btn-manage-budgets-healthy"
          type="button"
          onClick={onOpenBudgetModal}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-50/60 shadow-2xs"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Adjust Limits</span>
        </button>
      </div>
    );
  }

  const isCriticalOrExceeded = exceededCount > 0 || criticalCount > 0;

  return (
    <div
      id="budget-alerts-container"
      className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] ${
        exceededCount > 0
          ? 'bg-rose-50/60 border-rose-200 text-rose-950'
          : isCriticalOrExceeded
          ? 'bg-amber-50/60 border-amber-200 text-amber-950'
          : 'bg-yellow-50/60 border-yellow-200 text-yellow-950'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-2xs ${
              exceededCount > 0
                ? 'bg-rose-100 border-rose-200 text-rose-700'
                : 'bg-amber-100 border-amber-200 text-amber-700'
            }`}
          >
            {exceededCount > 0 ? (
              <AlertCircle className="h-4.5 w-4.5" />
            ) : (
              <AlertTriangle className="h-4.5 w-4.5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight font-display">
                {exceededCount > 0
                  ? `${exceededCount} Budget Alert${exceededCount > 1 ? 's' : ''}: Limit Exceeded!`
                  : `${attentionAlerts.length} Budget Alert${attentionAlerts.length > 1 ? 's' : ''}: Approaching Limit`}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${
                  exceededCount > 0
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-amber-500 text-white border-amber-500'
                }`}
              >
                {exceededCount > 0 ? 'Over Budget' : 'Caution'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {exceededCount > 0
                ? `${exceededCount} category has exceeded maximum allocated spend.`
                : `${attentionAlerts.length} categories have consumed over 75% of their monthly limit.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-adjust-budgets-alert"
            type="button"
            onClick={onOpenBudgetModal}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span>Manage Budgets</span>
          </button>
          <button
            id="btn-toggle-alert-expansion"
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
            aria-label={isExpanded ? 'Collapse alerts' : 'Expand alerts'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200/70 bg-white/80 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {attentionAlerts.map((alert) => {
              const isOver = alert.severity === 'exceeded';
              const isCrit = alert.severity === 'critical';

              return (
                <div
                  key={alert.categoryId}
                  id={`alert-card-${alert.categoryId}`}
                  className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-col justify-between transition shadow-2xs hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-md shrink-0"
                        style={{ backgroundColor: `${alert.color}15`, color: alert.color }}
                      >
                        <CategoryIcon categoryId={alert.categoryId} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {alert.categoryName}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {formatCurrency(alert.spent)} of {formatCurrency(alert.limit)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums shrink-0 border ${
                        isOver
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isCrit
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {alert.percentage}%
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? 'bg-rose-600'
                            : isCrit
                            ? 'bg-amber-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-600 tabular-nums">
                        {isOver
                          ? `Over by ${formatCurrency(alert.overAmount)}`
                          : `${formatCurrency(alert.limit - alert.spent)} left`}
                      </span>
                      {onFilterByCategory && (
                        <button
                          type="button"
                          onClick={() => onFilterByCategory(alert.categoryId)}
                          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline text-[11px]"
                        >
                          View transactions
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
