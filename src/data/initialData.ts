import { Expense, MonthBudgetConfig } from '../types';
import { DEFAULT_CATEGORY_BUDGETS } from './categories';

// Helper to format date YYYY-MM-DD
function formatDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Generate realistic default transactions relative to current year/month
export function generateSampleExpenses(): Expense[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const todayDate = now.getDate();

  const items: Array<{
    title: string;
    amount: number;
    categoryId: any;
    offsetDays: number;
    paymentMethod: any;
    notes?: string;
  }> = [
    // Current month expenses (spaced out up to today)
    { title: 'Apartment Monthly Rent', amount: 1200, categoryId: 'housing', offsetDays: Math.min(todayDate - 1, 2), paymentMethod: 'bank_transfer', notes: 'Monthly rent split' },
    { title: 'Whole Foods Market', amount: 142.50, categoryId: 'groceries', offsetDays: 1, paymentMethod: 'credit_card', notes: 'Weekly grocery run' },
    { title: 'Sushi Bistro Dinner', amount: 88.00, categoryId: 'dining', offsetDays: 2, paymentMethod: 'credit_card', notes: 'Dinner with friends' },
    { title: 'Electric & Gas Utility', amount: 135.20, categoryId: 'utilities', offsetDays: 3, paymentMethod: 'bank_transfer', notes: 'Summer AC usage' },
    { title: 'Metro Transit Monthly Pass', amount: 95.00, categoryId: 'transport', offsetDays: 4, paymentMethod: 'debit_card', notes: 'Commuter card recharge' },
    { title: 'Trader Joe’s Market', amount: 78.40, categoryId: 'groceries', offsetDays: 5, paymentMethod: 'credit_card', notes: 'Snacks and fresh produce' },
    { title: 'Netflix & Spotify Subs', amount: 32.98, categoryId: 'entertainment', offsetDays: 6, paymentMethod: 'credit_card', notes: 'Recurring digital subscriptions' },
    { title: 'New Running Shoes', amount: 130.00, categoryId: 'shopping', offsetDays: 7, paymentMethod: 'credit_card', notes: 'Asics running sneakers' },
    { title: 'Shell Gas Station', amount: 48.60, categoryId: 'transport', offsetDays: 8, paymentMethod: 'credit_card', notes: 'Fuel refill' },
    { title: 'Gourmet Italian Dinner', amount: 112.50, categoryId: 'dining', offsetDays: 9, paymentMethod: 'credit_card', notes: 'Weekend dinner' },
    { title: 'Equinox Gym Membership', amount: 85.00, categoryId: 'health', offsetDays: 10, paymentMethod: 'credit_card', notes: 'Monthly gym fee' },
    { title: 'Target Home Supplies', amount: 64.30, categoryId: 'shopping', offsetDays: 11, paymentMethod: 'debit_card', notes: 'Kitchen essentials and cleaning' },
    { title: 'Artisan Coffee Roasters', amount: 24.50, categoryId: 'dining', offsetDays: 12, paymentMethod: 'upi', notes: 'UPI QR scan at cafe' },
    { title: 'Local Farmers Market', amount: 56.80, categoryId: 'groceries', offsetDays: 13, paymentMethod: 'upi', notes: 'Vegetables via UPI' },
    { title: 'Index Fund SIP Investment', amount: 300.00, categoryId: 'investment', offsetDays: 14, paymentMethod: 'upi', notes: 'Monthly recurring index fund SIP' },
    { title: 'Weekend Movie IMAX Tickets', amount: 42.00, categoryId: 'entertainment', offsetDays: 14, paymentMethod: 'digital_wallet', notes: 'Weekend cinema' },
    { title: 'Mobile Phone Plan', amount: 65.00, categoryId: 'utilities', offsetDays: 15, paymentMethod: 'credit_card', notes: 'Monthly 5G plan' },
    { title: 'Cocktail Lounge & Tapas', amount: 94.00, categoryId: 'dining', offsetDays: 16, paymentMethod: 'credit_card', notes: 'Friday evening drinks' },
    { title: 'Zara Clothing Sale', amount: 89.90, categoryId: 'shopping', offsetDays: 17, paymentMethod: 'credit_card', notes: 'Casual shirts' },
    { title: 'Pharmacy & Vitamins', amount: 38.20, categoryId: 'health', offsetDays: 18, paymentMethod: 'credit_card', notes: 'Supplements and allergy meds' },
    { title: 'Uber Ride to Airport', amount: 46.50, categoryId: 'transport', offsetDays: 19, paymentMethod: 'credit_card', notes: 'Business trip ride' },
  ];

  const expenses: Expense[] = [];
  let idCounter = 1;

  // Insert current month items
  items.forEach((item) => {
    const d = new Date(now);
    d.setDate(Math.max(1, now.getDate() - item.offsetDays));
    // Ensure it stays in current month
    if (d.getMonth() === currentMonth) {
      expenses.push({
        id: `exp-${idCounter++}`,
        title: item.title,
        amount: item.amount,
        categoryId: item.categoryId,
        date: formatDay(d),
        paymentMethod: item.paymentMethod,
        notes: item.notes,
        createdAt: d.getTime(),
      });
    }
  });

  // Past month 1 (Previous month)
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 15);
  const prevMonthDays = [
    { title: 'Monthly Rent', amount: 1200, categoryId: 'housing', day: 2, paymentMethod: 'bank_transfer' },
    { title: 'Costco Wholesale Bulk', amount: 260, categoryId: 'groceries', day: 6, paymentMethod: 'credit_card' },
    { title: 'Electric & Utility', amount: 128, categoryId: 'utilities', day: 8, paymentMethod: 'bank_transfer' },
    { title: 'Brunch & Dining Out', amount: 175, categoryId: 'dining', day: 12, paymentMethod: 'credit_card' },
    { title: 'Summer Festival Tickets', amount: 120, categoryId: 'entertainment', day: 15, paymentMethod: 'credit_card' },
    { title: 'Gas & Transit', amount: 180, categoryId: 'transport', day: 18, paymentMethod: 'credit_card' },
    { title: 'Supermarket Groceries', amount: 195, categoryId: 'groceries', day: 22, paymentMethod: 'debit_card' },
    { title: 'Summer Wardrobe', amount: 210, categoryId: 'shopping', day: 25, paymentMethod: 'credit_card' },
    { title: 'Health Clinic & Dental Checkup', amount: 110, categoryId: 'health', day: 28, paymentMethod: 'credit_card' },
  ];

  prevMonthDays.forEach((item) => {
    const d = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), item.day);
    expenses.push({
      id: `exp-${idCounter++}`,
      title: item.title,
      amount: item.amount,
      categoryId: item.categoryId as any,
      date: formatDay(d),
      paymentMethod: item.paymentMethod as any,
      createdAt: d.getTime(),
    });
  });

  // Past month 2
  const twoMonthsAgo = new Date(currentYear, currentMonth - 2, 15);
  const twoMonthsDays = [
    { title: 'Monthly Rent', amount: 1200, categoryId: 'housing', day: 3, paymentMethod: 'bank_transfer' },
    { title: 'Trader Joe’s Groceries', amount: 390, categoryId: 'groceries', day: 7, paymentMethod: 'credit_card' },
    { title: 'Flight & Hotel Getaway', amount: 480, categoryId: 'travel', day: 14, paymentMethod: 'credit_card' },
    { title: 'Dining & Restaurants', amount: 240, categoryId: 'dining', day: 19, paymentMethod: 'credit_card' },
    { title: 'Utilities & Internet', amount: 145, categoryId: 'utilities', day: 21, paymentMethod: 'bank_transfer' },
    { title: 'Subway & Gas', amount: 140, categoryId: 'transport', day: 26, paymentMethod: 'credit_card' },
  ];

  twoMonthsDays.forEach((item) => {
    const d = new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), item.day);
    expenses.push({
      id: `exp-${idCounter++}`,
      title: item.title,
      amount: item.amount,
      categoryId: item.categoryId as any,
      date: formatDay(d),
      paymentMethod: item.paymentMethod as any,
      createdAt: d.getTime(),
    });
  });

  // Sort descending by date
  return expenses.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getDefaultBudgetsForMonth(monthKey: string): MonthBudgetConfig {
  const sum = Object.values(DEFAULT_CATEGORY_BUDGETS).reduce((acc, curr) => acc + curr, 0);
  return {
    monthKey,
    overallBudget: sum,
    categoryBudgets: { ...DEFAULT_CATEGORY_BUDGETS },
  };
}
