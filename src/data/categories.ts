import { Category, CategoryId } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'housing',
    name: 'Housing & Rent',
    icon: 'Home',
    color: '#0284c7', // sky-600
    bgLight: '#e0f2fe',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    icon: 'ShoppingCart',
    color: '#16a34a', // green-600
    bgLight: '#dcfce7',
  },
  {
    id: 'dining',
    name: 'Dining & Cafes',
    icon: 'Utensils',
    color: '#ea580c', // orange-600
    bgLight: '#ffedd5',
  },
  {
    id: 'transport',
    name: 'Transportation',
    icon: 'Car',
    color: '#2563eb', // blue-600
    bgLight: '#dbeafe',
  },
  {
    id: 'utilities',
    name: 'Bills & Utilities',
    icon: 'Zap',
    color: '#d97706', // amber-600
    bgLight: '#fef3c7',
  },
  {
    id: 'entertainment',
    name: 'Entertainment & Subs',
    icon: 'Tv',
    color: '#9333ea', // purple-600
    bgLight: '#f3e8ff',
  },
  {
    id: 'shopping',
    name: 'Shopping & Retail',
    icon: 'ShoppingBag',
    color: '#db2777', // pink-600
    bgLight: '#fce7f3',
  },
  {
    id: 'health',
    name: 'Health & Wellness',
    icon: 'HeartPulse',
    color: '#059669', // emerald-600
    bgLight: '#d1fae5',
  },
  {
    id: 'education',
    name: 'Education & Books',
    icon: 'BookOpen',
    color: '#4f46e5', // indigo-600
    bgLight: '#e0e7ff',
  },
  {
    id: 'travel',
    name: 'Travel & Vacation',
    icon: 'Plane',
    color: '#0891b2', // cyan-600
    bgLight: '#cffafe',
  },
  {
    id: 'investment',
    name: 'Investment',
    icon: 'TrendingUp',
    color: '#0d9488', // teal-600
    bgLight: '#ccfbf1',
  },
  {
    id: 'other',
    name: 'Miscellaneous',
    icon: 'Layers',
    color: '#64748b', // slate-500
    bgLight: '#f1f5f9',
  },
];

export const CATEGORY_MAP = new Map<CategoryId, Category>(
  CATEGORIES.map((cat) => [cat.id, cat])
);

export const DEFAULT_CATEGORY_BUDGETS: Record<CategoryId, number> = {
  housing: 0,
  groceries: 0,
  dining: 0,
  transport: 0,
  utilities: 0,
  entertainment: 0,
  shopping: 0,
  health: 0,
  education: 0,
  travel: 0,
  investment: 0,
  other: 0,
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: 'UPI (GPay / PhonePe / Paytm / CRED)',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  digital_wallet: 'Digital Wallet (Apple/Google Pay)',
};
