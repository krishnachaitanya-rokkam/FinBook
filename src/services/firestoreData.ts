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

export async function loadUserData(uid: string): Promise<{ expenses: Expense[]; budgets: Record<string, MonthBudgetConfig> }> {
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

  return { expenses, budgets };
}

export function subscribeToUserData(
  uid: string,
  onChange: (data: { expenses: Expense[]; budgets: Record<string, MonthBudgetConfig> }) => void,
  onError?: (error: Error) => void
): () => void {
  let expenses: Expense[] = [];
  let budgets: Record<string, MonthBudgetConfig> = {};
  let expensesReady = false;
  let budgetsReady = false;

  const publish = () => {
    if (!expensesReady || !budgetsReady) return;
    onChange({
      expenses: [...expenses],
      budgets: { ...budgets },
    });
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
  await setDoc(doc(userRoot(uid), 'expenses', expense.id), expense);
}

export async function removeExpense(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(userRoot(uid), 'expenses', id));
}

export async function saveBudget(uid: string, budget: MonthBudgetConfig): Promise<void> {
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
}
