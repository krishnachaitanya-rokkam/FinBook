import { AlertSeverity, CategoryAlert, CategoryId, Expense, MonthBudgetConfig } from '../types';
import { CATEGORY_MAP } from '../data/categories';

export const CURRENCY_SYMBOL = '₹';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(amount)}`;
}

export function formatMonthKeyToName(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatShortMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeCategoryAlerts(
  expenses: Expense[],
  budgetConfig: MonthBudgetConfig
): {
  alerts: CategoryAlert[];
  exceededCount: number;
  criticalCount: number;
  warningCount: number;
  totalSpent: number;
  totalBudget: number;
  overallPercentage: number;
} {
  // Aggregate spending per category
  const spendByCategory: Record<CategoryId, number> = {} as any;
  let totalSpent = 0;

  for (const exp of expenses) {
    spendByCategory[exp.categoryId] = (spendByCategory[exp.categoryId] || 0) + exp.amount;
    totalSpent += exp.amount;
  }

  const alerts: CategoryAlert[] = [];
  let exceededCount = 0;
  let criticalCount = 0;
  let warningCount = 0;

  const categoryBudgets = budgetConfig.categoryBudgets;

  for (const [catId, limit] of Object.entries(categoryBudgets)) {
    const categoryId = catId as CategoryId;
    const spent = spendByCategory[categoryId] || 0;
    const categoryInfo = CATEGORY_MAP.get(categoryId);
    const categoryName = categoryInfo ? categoryInfo.name : catId;
    const color = categoryInfo ? categoryInfo.color : '#64748b';

    if (limit <= 0) continue;

    const percentage = Math.round((spent / limit) * 100);
    const overAmount = Math.max(0, spent - limit);

    let severity: AlertSeverity = 'normal';
    if (spent > limit) {
      severity = 'exceeded';
      exceededCount++;
    } else if (percentage >= 90) {
      severity = 'critical';
      criticalCount++;
    } else if (percentage >= 75) {
      severity = 'warning';
      warningCount++;
    }

    // Include if there's any spend or budget
    if (spent > 0 || severity !== 'normal') {
      alerts.push({
        categoryId,
        categoryName,
        spent,
        limit,
        percentage,
        overAmount,
        severity,
        color,
      });
    }
  }

  // Sort: highest severity first, then by percentage descending
  const severityScore: Record<AlertSeverity, number> = {
    exceeded: 4,
    critical: 3,
    warning: 2,
    normal: 1,
  };

  alerts.sort((a, b) => {
    const diff = severityScore[b.severity] - severityScore[a.severity];
    if (diff !== 0) return diff;
    return b.percentage - a.percentage;
  });

  const totalBudget: number = (Object.values(categoryBudgets) as number[]).reduce((a: number, b: number) => a + b, 0);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return {
    alerts,
    exceededCount,
    criticalCount,
    warningCount,
    totalSpent,
    totalBudget,
    overallPercentage,
  };
}
