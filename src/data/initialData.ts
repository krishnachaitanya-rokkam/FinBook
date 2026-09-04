import { MonthBudgetConfig } from '../types';
import { DEFAULT_CATEGORY_BUDGETS } from './categories';

export function getDefaultBudgetsForMonth(monthKey: string): MonthBudgetConfig {
  const sum = Object.values(DEFAULT_CATEGORY_BUDGETS).reduce((acc, curr) => acc + curr, 0);
  return {
    monthKey,
    overallBudget: sum,
    categoryBudgets: { ...DEFAULT_CATEGORY_BUDGETS },
  };
}
