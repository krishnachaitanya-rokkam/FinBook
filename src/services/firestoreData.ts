import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { Expense, Income, MonthBudgetConfig } from '../types';
import { firestore } from './firebase';

const userRoot = (uid: string) => doc(firestore, 'users', uid);
const cacheKey = (uid: string) => `finbook-data-${uid}-v2`;

type UserData = { expenses: Expense[]; incomes: Income[]; budgets: Record<string, MonthBudgetConfig> };
type RecurringItem = { id: string; title: string; type: 'income' | 'expense' | 'bill'; amount: number; day: number; month?: number; frequency: 'monthly' | 'yearly'; autoRecord: boolean; active: boolean };

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => stripUndefined(item)) as T;
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => { if (item !== undefined) result[key] = stripUndefined(item); });
    return result as T;
  }
  return value;
}
const normalizeExpense = (expense: Expense) => stripUndefined(expense);
const normalizeIncome = (income: Income) => stripUndefined(income);

function readCache(uid: string): UserData | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.expenses) || !Array.isArray(parsed?.incomes) || typeof parsed?.budgets !== 'object') return null;
    return { expenses: parsed.expenses, incomes: parsed.incomes, budgets: parsed.budgets };
  } catch { return null; }
}
function writeCache(uid: string, data: UserData) { try { localStorage.setItem(cacheKey(uid), JSON.stringify(stripUndefined(data))); } catch {} }

const dateString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function getDueDate(item: RecurringItem, now = new Date()): string | null {
  if (!item.active || !item.autoRecord || !Number.isFinite(item.amount) || item.amount <= 0) return null;
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (item.frequency === 'monthly') {
    const day = Math.min(Math.max(1, item.day || 1), new Date(year, month, 0).getDate());
    if (now.getDate() < day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const targetMonth = Math.min(Math.max(1, item.month || 1), 12);
  const targetDay = Math.min(Math.max(1, item.day || 1), new Date(year, targetMonth, 0).getDate());
  if (month < targetMonth || (month === targetMonth && now.getDate() < targetDay)) return null;
  return `${year}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}

async function processDueRecurringItems(uid: string) {
  try {
    const recurringSnap = await getDocs(collection(userRoot(uid), 'recurring'));
    const writes: Promise<void>[] = [];
    const today = new Date();
    recurringSnap.docs.forEach((snap) => {
      const item = { id: snap.id, ...snap.data() } as RecurringItem;
      const dueDate = getDueDate(item, today);
      if (!dueDate) return;

      // Deterministic ID makes the operation idempotent across multiple devices/tabs.
      const occurrenceId = `recurring-${item.id}-${dueDate}`;
      const ref = doc(userRoot(uid), item.type === 'income' ? 'incomes' : 'expenses', occurrenceId);
      const createdAt = Date.now();

      if (item.type === 'income') {
        const income: Income = {
          id: occurrenceId,
          title: item.title,
          amount: item.amount,
          date: dueDate,
          source: 'Recurring',
          notes: `Automatically recorded from recurring item: ${item.title}`,
          createdAt,
        };
        writes.push(setDoc(ref, stripUndefined(income), { merge: false }));
      } else {
        const title = item.title.toLowerCase();
        const categoryId: Expense['categoryId'] = item.type === 'bill'
          ? 'utilities'
          : /(sip|mutual fund|investment|stocks|nps|ppf|epf)/i.test(title) ? 'investment' : 'other';
        const expense: Expense = {
          id: occurrenceId,
          title: item.title,
          amount: item.amount,
          categoryId,
          date: dueDate,
          paymentMethod: 'bank_transfer',
          notes: `Automatically recorded from recurring item: ${item.title}`,
          createdAt,
        };
        writes.push(setDoc(ref, stripUndefined(expense), { merge: false }));
      }
    });
    await Promise.all(writes);
  } catch (error) {
    console.error('Recurring auto-record error:', error);
  }
}

export function subscribeToUserData(uid: string, onChange: (data: UserData) => void, onError?: (error: Error) => void): () => void {
  const cached = readCache(uid);
  if (cached) onChange(cached);
  let expenses: Expense[] = cached?.expenses || [];
  let incomes: Income[] = cached?.incomes || [];
  let budgets: Record<string, MonthBudgetConfig> = cached?.budgets || {};
  let expensesReady = false, incomesReady = false, budgetsReady = false;
  let recurringProcessed = false;
  const publish = () => {
    if (!expensesReady || !incomesReady || !budgetsReady) return;
    const data: UserData = {
      expenses: expenses.map(normalizeExpense).sort((a,b)=>b.date.localeCompare(a.date)),
      incomes: incomes.map(normalizeIncome).sort((a,b)=>b.date.localeCompare(a.date)),
      budgets: stripUndefined(budgets),
    };
    writeCache(uid, data); onChange(data);
    if (!recurringProcessed) {
      recurringProcessed = true;
      void processDueRecurringItems(uid);
    }
  };
  const unsubscribeExpenses = onSnapshot(collection(userRoot(uid), 'expenses'), snapshot => {
    expenses = snapshot.docs.map(d => normalizeExpense(d.data() as Expense)).sort((a,b)=>b.date.localeCompare(a.date));
    expensesReady = true; publish();
  }, error => onError?.(error));
  const unsubscribeIncomes = onSnapshot(collection(userRoot(uid), 'incomes'), snapshot => {
    incomes = snapshot.docs.map(d => normalizeIncome(d.data() as Income)).sort((a,b)=>b.date.localeCompare(a.date));
    incomesReady = true; publish();
  }, error => onError?.(error));
  const unsubscribeBudgets = onSnapshot(collection(userRoot(uid), 'budgets'), snapshot => {
    budgets = {}; snapshot.docs.forEach(d => { budgets[d.id] = d.data() as MonthBudgetConfig; });
    budgetsReady = true; publish();
  }, error => onError?.(error));
  return () => { unsubscribeExpenses(); unsubscribeIncomes(); unsubscribeBudgets(); };
}

export async function saveExpense(uid: string, expense: Expense) { const normalized=normalizeExpense(expense); await setDoc(doc(userRoot(uid),'expenses',normalized.id),normalized); }
export async function removeExpense(uid: string, id: string) { await deleteDoc(doc(userRoot(uid),'expenses',id)); }
export async function saveIncome(uid: string, income: Income) { const normalized=normalizeIncome(income); await setDoc(doc(userRoot(uid),'incomes',normalized.id),normalized); }
export async function removeIncome(uid: string, id: string) { await deleteDoc(doc(userRoot(uid),'incomes',id)); }
export async function saveBudget(uid: string, budget: MonthBudgetConfig) { await setDoc(doc(userRoot(uid),'budgets',budget.monthKey),stripUndefined(budget)); }
export async function clearUserData(uid: string) {
  const [expenseSnap, incomeSnap, budgetSnap] = await Promise.all([
    getDocs(collection(userRoot(uid),'expenses')), getDocs(collection(userRoot(uid),'incomes')), getDocs(collection(userRoot(uid),'budgets')),
  ]);
  await Promise.all([...expenseSnap.docs.map(d=>deleteDoc(d.ref)), ...incomeSnap.docs.map(d=>deleteDoc(d.ref)), ...budgetSnap.docs.map(d=>deleteDoc(d.ref))]);
  writeCache(uid,{expenses:[],incomes:[],budgets:{}});
}
