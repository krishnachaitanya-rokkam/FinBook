import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { Expense, Income, MonthBudgetConfig } from '../types';
import { firestore } from './firebase';

const userRoot = (uid: string) => doc(firestore, 'users', uid);
const cacheKey = (uid: string) => `finbook-data-${uid}-v2`;

type UserData = { expenses: Expense[]; incomes: Income[]; budgets: Record<string, MonthBudgetConfig> };

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

export function subscribeToUserData(uid: string, onChange: (data: UserData) => void, onError?: (error: Error) => void): () => void {
  const cached = readCache(uid);
  if (cached) onChange(cached);
  let expenses: Expense[] = cached?.expenses || [];
  let incomes: Income[] = cached?.incomes || [];
  let budgets: Record<string, MonthBudgetConfig> = cached?.budgets || {};
  let expensesReady = false, incomesReady = false, budgetsReady = false;
  const publish = () => {
    if (!expensesReady || !incomesReady || !budgetsReady) return;
    const data: UserData = {
      expenses: expenses.map(normalizeExpense).sort((a,b)=>b.date.localeCompare(a.date)),
      incomes: incomes.map(normalizeIncome).sort((a,b)=>b.date.localeCompare(a.date)),
      budgets: stripUndefined(budgets),
    };
    writeCache(uid, data); onChange(data);
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
