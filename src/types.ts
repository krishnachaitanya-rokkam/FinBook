export type PaymentMethod = 'upi' | 'credit_card' | 'debit_card' | 'cash' | 'bank_transfer' | 'digital_wallet';

export type CategoryId = 
  | 'housing'
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'education'
  | 'travel'
  | 'investment'
  | 'other';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  bgLight: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  categoryId: CategoryId;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: number;
}

export interface Income {
  id: string;
  title: string;
  amount: number;
  date: string;
  source?: string;
  notes?: string;
  createdAt: number;
}

export interface CategoryBudget {
  categoryId: CategoryId;
  limit: number;
}

export interface MonthBudgetConfig {
  monthKey: string;
  overallBudget: number;
  categoryBudgets: Record<CategoryId, number>;
}

export type AlertSeverity = 'normal' | 'warning' | 'critical' | 'exceeded';

export interface CategoryAlert {
  categoryId: CategoryId;
  categoryName: string;
  spent: number;
  limit: number;
  percentage: number;
  overAmount: number;
  severity: AlertSeverity;
  color: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isDemo?: boolean;
  provider?: 'supabase' | 'email' | 'demo';
  lastLogin?: number;
}
