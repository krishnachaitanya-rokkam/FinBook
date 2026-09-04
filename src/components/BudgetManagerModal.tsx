import React, { useState, useEffect } from 'react';
import { MonthBudgetConfig, CategoryId } from '../types';
import { CATEGORIES, DEFAULT_CATEGORY_BUDGETS } from '../data/categories';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import { X, IndianRupee, RotateCcw, ShieldAlert } from 'lucide-react';

interface BudgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBudgetConfig: MonthBudgetConfig;
  onSaveBudgets: (newConfig: MonthBudgetConfig) => void;
  monthName: string;
}

export const BudgetManagerModal: React.FC<BudgetManagerModalProps> = ({
  isOpen,
  onClose,
  currentBudgetConfig,
  onSaveBudgets,
  monthName,
}) => {
  const [budgets, setBudgets] = useState<Record<CategoryId, number>>({
    ...currentBudgetConfig.categoryBudgets,
  });
  const [resetNotice, setResetNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBudgets({ ...currentBudgetConfig.categoryBudgets });
      setResetNotice(false);
    }
  }, [isOpen, currentBudgetConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalCalculated: number = (Object.values(budgets) as number[]).reduce((sum: number, val: number) => sum + (Number(val) || 0), 0);

  const handleBudgetChange = (catId: CategoryId, valStr: string) => {
    const num = Math.max(0, parseFloat(valStr) || 0);
    setBudgets((prev) => ({
      ...prev,
      [catId]: num,
    }));
    setResetNotice(false);
  };

  const handleResetDefaults = () => {
    setBudgets({ ...DEFAULT_CATEGORY_BUDGETS });
    setResetNotice(true);
  };

  const handleSave = () => {
    onSaveBudgets({
      ...currentBudgetConfig,
      overallBudget: totalCalculated,
      categoryBudgets: { ...budgets },
    });
    onClose();
  };

  return (
    <div
      id="budget-manager-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="budget-manager-modal-dialog"
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200/90 transition-transform max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">
              Category Budgets & Alert Thresholds
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set monthly spending targets for {monthName}
            </p>
          </div>
          <button
            id="btn-close-budget-modal"
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alert Logic explanation box */}
        <div className="my-3.5 rounded-lg bg-slate-50 border border-slate-200/80 p-3 flex items-start gap-2.5 text-xs text-slate-700">
          <ShieldAlert className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">How Budget Alerts Work:</span> Alerts trigger
            automatically when spending reaches <strong className="text-amber-700">75% (Caution)</strong>, <strong className="text-amber-800">90% (Critical)</strong>,
            or <strong className="text-rose-700">100%+ (Exceeded)</strong>. Update your limits below to adjust your threshold triggers.
          </div>
        </div>

        {resetNotice && (
          <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
              <span>Default budget limits (₹0) loaded into inputs. Click <strong>Save Budget Limits</strong> to apply.</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer ml-2"
            >
              Apply Now
            </button>
          </div>
        )}

        {/* Budget list input table */}
        <div className="flex-1 overflow-y-auto pr-1 divide-y divide-slate-100 space-y-1.5 custom-scrollbar">
          {CATEGORIES.map((cat) => {
            const currentLimit = budgets[cat.id] ?? 0;

            return (
              <div
                key={cat.id}
                className="flex items-center justify-between py-2 px-2 hover:bg-slate-50/80 rounded-lg transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 border border-slate-100"
                    style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                  >
                    <CategoryIcon categoryId={cat.id} className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block truncate">
                      {cat.name}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      Default: ₹{DEFAULT_CATEGORY_BUDGETS[cat.id]}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-semibold">₹</span>
                    <input
                      id={`input-budget-${cat.id}`}
                      type="number"
                      min="0"
                      step="10"
                      value={currentLimit}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2.5 py-1.5 text-xs font-bold text-slate-900 text-right shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 tabular-nums"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with summary and buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="btn-reset-budgets-default"
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Defaults (₹0)</span>
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-600">
              Total Target: <strong className="text-slate-900 font-display tabular-nums">{formatCurrency(totalCalculated)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              id="btn-cancel-budget-modal"
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              id="btn-save-budgets-modal"
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition active:scale-[0.99]"
            >
              Save Budget Limits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
