import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { Expense, MonthBudgetConfig } from '../types';
import { firestore } from './firebase';

const userRoot = (uid: string) => doc(firestore, 'users', uid);
const cacheKey = (uid: string) => `finbook-data-${uid}-v1`;

type UserData = {
  expenses: Expense[];
  budgets: Record<string, MonthBudgetConfig>;
};

function readCache(uid: string): UserData | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.expenses) || typeof parsed?.budgets !== 'object') return null;
    return {
      expenses: parsed.expenses as Expense[],
      budgets: parsed.budgets as Record<string, MonthBudgetConfig>,
    };
  } catch {
    return null;
  }
}

function writeCache(uid: string, data: UserData): void {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(data));
  } catch {
    // Cloud remains the primary persistence layer when browser storage is unavailable.
  }
}

function updateExpenseCache(uid: string, expense: Expense): void {
  const cached = readCache(uid) || { expenses: [], budgets: {} };
  const existingIndex = cached.expenses.findIndex((item) => item.id === expense.id);
  const expenses = [...cached.expenses];
  if (existingIndex >= 0) expenses[existingIndex] = expense;
  else expenses.unshift(expense);
  expenses.sort((a, b) => b.date.localeCompare(a.date));
  writeCache(uid, { ...cached, expenses });
}

function removeExpenseFromCache(uid: string, id: string): void {
  const cached = readCache(uid);
  if (!cached) return;
  writeCache(uid, {
    ...cached,
    expenses: cached.expenses.filter((item) => item.id !== id),
  });
}

function updateBudgetCache(uid: string, budget: MonthBudgetConfig): void {
  const cached = readCache(uid) || { expenses: [], budgets: {} };
  writeCache(uid, {
    ...cached,
    budgets: { ...cached.budgets, [budget.monthKey]: budget },
  });
}

function writeFullCache(uid: string, data: UserData): void {
  writeCache(uid, data);
}

export async function loadUserData(uid: string): Promise<UserData> {
  const [expenseSnap, budgetSnap] = await Promise.all([
    getDocs(collection(userRoot(uid), 'expenses')),
    getDocs(collection(userRoot(uid), 'budgets')),
  ]);

  const expenses = expenseSnap.docs
    .map((d) => d.data() as Expense)
    .sort((a, b) => b.date.localeCompare(a.date));

  const budgets: Record<string, MonthBudgetConfig> = {};
  budgetSnap.docs.forEach((d) => {
    budgets[d.id] = d.data() as MonthBudgetConfig;
  });

  const data = { expenses, budgets };
  writeFullCache(uid, data);
  return data;
}

export function getCachedUserData(uid: string): UserData | null {
  return readCache(uid);
}

export function subscribeToUserData(
  uid: string,
  onChange: (data: UserData) => void,
  onError?: (error: Error) => void
): () => void {
  // Show the last known data immediately. This prevents a refresh from producing
  // an empty dashboard while the network/database connection is being established.
  const cached = readCache(uid);
  if (cached) onChange(cached);

  let expenses: Expense[] = cached?.expenses || [];
  let budgets: Record<string, MonthBudgetConfig> = cached?.budgets || {};
  let expensesReady = false;
  let budgetsReady = false;

  const publish = () => {
    if (!expensesReady || !budgetsReady) return;
    const data = { expenses: [...expenses], budgets: { ...budgets } };
    writeFullCache(uid, data);
    onChange(data);
  };

  const unsubscribeExpenses = onSnapshot(
    collection(userRoot(uid), 'expenses'),
    (snapshot) => {
      expenses = snapshot.docs
        .map((d) => d.data() as Expense)
        .sort((a, b) => b.date.localeCompare(a.date));
      expensesReady = true;
      publish();
    },
    (error) => onError?.(error)
  );

  const unsubscribeBudgets = onSnapshot(
    collection(userRoot(uid), 'budgets'),
    (snapshot) => {
      budgets = {};
      snapshot.docs.forEach((d) => {
        budgets[d.id] = d.data() as MonthBudgetConfig;
      });
      budgetsReady = true;
      publish();
    },
    (error) => onError?.(error)
  );

  return () => {
    unsubscribeExpenses();
    unsubscribeBudgets();
  };
}

export async function saveExpense(uid: string, expense: Expense): Promise<void> {
  updateExpenseCache(uid, expense);
  await setDoc(doc(userRoot(uid), 'expenses', expense.id), expense);
}

export async function removeExpense(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(userRoot(uid), 'expenses', id));
  removeExpenseFromCache(uid, id);
}

export async function saveBudget(uid: string, budget: MonthBudgetConfig): Promise<void> {
  updateBudgetCache(uid, budget);
  await setDoc(doc(userRoot(uid), 'budgets', budget.monthKey), budget);
}

export async function clearUserData(uid: string): Promise<void> {
  const [expenseSnap, budgetSnap] = await Promise.all([
    getDocs(collection(userRoot(uid), 'expenses')),
    getDocs(collection(userRoot(uid), 'budgets')),
  ]);

  await Promise.all([
    ...expenseSnap.docs.map((d) => deleteDoc(d.ref)),
    ...budgetSnap.docs.map((d) => deleteDoc(d.ref)),
  ]);

  writeFullCache(uid, { expenses: [], budgets: {} });
}
