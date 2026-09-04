import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { IndianRupee, LogOut, Plus, Target, TrendingUp, Receipt, PieChart, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Expense, MonthBudgetConfig, AuthUser } from './types';
import { getDefaultBudgetsForMonth } from './data/initialData';
import { CATEGORY_MAP, PAYMENT_METHOD_LABELS } from './data/categories';
import { computeCategoryAlerts, formatMonthKeyToName, getCurrentMonthKey, getTodayDateString } from './utils/formatters';
import { MetricCards } from './components/MetricCards';
import { ExpenseCharts } from './components/ExpenseCharts';
import { BudgetProgressList } from './components/BudgetProgressList';
import { ExpenseModal } from './components/ExpenseModal';
import { BudgetManagerModal } from './components/BudgetManagerModal';
import { ExpenseList } from './components/ExpenseList';
import { SignInPage } from './components/SignInPage';
import { firebaseAuth } from './services/firebase';
import { subscribeToUserData, removeExpense, saveBudget, saveExpense, clearUserData } from './services/firestoreData';
import { logoutUser } from './services/authService';

type Section = 'overview' | 'budgets' | 'analytics' | 'transactions';

export default function FinBookApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, MonthBudgetConfig>>({});
  const [month, setMonth] = useState(getCurrentMonthKey());
  const [section, setSection] = useState<Section>('overview');
  const [modal, setModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let unsubscribeData = () => {};

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (u) => {
      unsubscribeData();
      unsubscribeData = () => {};
      setReady(false);

      if (!u) {
        setUser(null);
        setExpenses([]);
        setBudgets({});
        setReady(true);
        return;
      }

      const mapped: AuthUser = {
        id: u.uid,
        email: u.email || '',
        name: u.displayName || u.email?.split('@')[0] || 'FinBook User',
        provider: 'email',
      };
      setUser(mapped);

      unsubscribeData = subscribeToUserData(
        u.uid,
        (data) => {
          setExpenses(data.expenses);
          setBudgets(data.budgets);
          setReady(true);
        },
        (error) => {
          console.error('Firestore sync error:', error);
          setMessage(`Cloud sync error: ${error.message}`);
          setReady(true);
        }
      );
    });

    return () => {
      unsubscribeData();
      unsubscribeAuth();
    };
  }, []);

  const monthExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(month)), [expenses, month]);
  const budget = budgets[month] || getDefaultBudgetsForMonth(month);
  const alerts = useMemo(() => computeCategoryAlerts(monthExpenses, budget), [monthExpenses, budget]);

  const toast = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(''), 3000); };

  const save = async (data: Omit<Expense, 'id'|'createdAt'>, id?: string) => {
    if (!user) return;
    const existing = id ? expenses.find(e => e.id === id) : undefined;
    const item: Expense = id && existing
      ? { ...existing, ...data, createdAt: existing.createdAt }
      : { ...data, id:`exp-${Date.now()}-${crypto.randomUUID().slice(0,8)}`, createdAt:Date.now() };

    setExpenses(prev => id ? prev.map(e => e.id===id ? item : e) : [item, ...prev]);
    try {
      await saveExpense(user.id, item);
      toast(id ? 'Transaction updated' : 'Transaction saved to cloud');
    } catch (error: any) {
      toast(`Could not save to cloud: ${error?.message || 'Please try again'}`);
    }
  };

  const remove = async (id:string) => {
    if (!user) return;
    const previous = expenses;
    setExpenses(prev=>prev.filter(e=>e.id!==id));
    try {
      await removeExpense(user.id,id);
      toast('Transaction deleted from cloud');
    } catch (error: any) {
      setExpenses(previous);
      toast(`Could not delete from cloud: ${error?.message || 'Please try again'}`);
    }
  };

  const saveB = async (b:MonthBudgetConfig) => {
    if (!user) return;
    const previous = budgets;
    setBudgets(prev=>({...prev,[b.monthKey]:b}));
    try {
      await saveBudget(user.id,b);
      toast('Budget saved to cloud');
    } catch (error: any) {
      setBudgets(previous);
      toast(`Could not save budget: ${error?.message || 'Please try again'}`);
    }
  };

  const reset = async () => {
    if (!user || !confirm('Delete all FinBook transactions and budgets? This cannot be undone.')) return;
    const previousExpenses = expenses;
    const previousBudgets = budgets;
    setExpenses([]);
    setBudgets({});
    try {
      await clearUserData(user.id);
      toast('All financial data cleared from cloud');
    } catch (error: any) {
      setExpenses(previousExpenses);
      setBudgets(previousBudgets);
      toast(`Could not clear cloud data: ${error?.message || 'Please try again'}`);
    }
  };

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading FinBook…</div>;
  if (!user) return <SignInPage onSignInSuccess={setUser} />;

  const shiftMonth=(delta:number)=>{
    const [y,m]=month.split('-').map(Number);
    const d=new Date(y,m-1+delta,1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    setFilter(null);
  };

  const handleMonthPickerChange = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    setMonth(value);
    setFilter(null);
  };

  const exportCsv=()=>{
    const rows=[
      ['Date','Title','Category','Amount','Payment Method','Notes'],
      ...monthExpenses.map(e=>[
        e.date,
        e.title,
        CATEGORY_MAP.get(e.categoryId)?.name||e.categoryId,
        e.amount.toFixed(2),
        PAYMENT_METHOD_LABELS[e.paymentMethod]||e.paymentMethod,
        e.notes||''
      ])
    ];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
    const a=document.createElement('a');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.href=url;
    a.download=`FinBook-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200"><div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0"><div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0"><IndianRupee className="h-5 w-5"/></div><div className="min-w-0"><b className="text-lg">FinBook</b><p className="text-xs text-slate-500 truncate">Personal money manager</p></div></div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={()=>shiftMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="h-4 w-4"/></button>
        <label className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 cursor-pointer min-w-28 justify-center" title="Choose month">
          <Calendar className="h-4 w-4 text-slate-500"/>
          <span className="text-sm font-semibold text-center pointer-events-none">{formatMonthKeyToName(month)}</span>
          <input type="month" value={month} onChange={(e)=>handleMonthPickerChange(e.target.value)} aria-label="Choose month" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <button onClick={()=>shiftMonth(1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Next month"><ChevronRight className="h-4 w-4"/></button>
        <button onClick={()=>{setEditing(null);setModal(true)}} className="ml-2 flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4"/><span>Add</span></button>
        <button onClick={()=>logoutUser()} title="Sign out" aria-label="Sign out" className="p-2 rounded-lg border border-slate-200"><LogOut className="h-4 w-4"/></button>
      </div>
    </div></header>
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap gap-2"><button onClick={()=>setSection('overview')} className={`px-3 py-2 rounded-lg text-sm font-semibold ${section==='overview'?'bg-slate-900 text-white':'bg-white border'}`}><TrendingUp className="inline h-4 w-4 mr-1"/>Overview</button><button onClick={()=>setSection('budgets')} className={`px-3 py-2 rounded-lg text-sm font-semibold ${section==='budgets'?'bg-slate-900 text-white':'bg-white border'}`}><Target className="inline h-4 w-4 mr-1"/>Budgets</button><button onClick={()=>setSection('analytics')} className={`px-3 py-2 rounded-lg text-sm font-semibold ${section==='analytics'?'bg-slate-900 text-white':'bg-white border'}`}><PieChart className="inline h-4 w-4 mr-1"/>Analytics</button><button onClick={()=>setSection('transactions')} className={`px-3 py-2 rounded-lg text-sm font-semibold ${section==='transactions'?'bg-slate-900 text-white':'bg-white border'}`}><Receipt className="inline h-4 w-4 mr-1"/>Transactions ({monthExpenses.length})</button></div>
      {section==='overview' && <section className="bg-white rounded-2xl border p-5"><h2 className="font-bold mb-1">Financial Overview</h2><p className="text-sm text-slate-500 mb-5">Real data for {formatMonthKeyToName(month)}</p><MetricCards totalSpent={alerts.totalSpent} totalBudget={alerts.totalBudget} monthKey={month} transactionCount={monthExpenses.length}/></section>}
      {section==='budgets' && <section className="bg-white rounded-2xl border p-5"><div className="flex justify-between items-center mb-5"><div><h2 className="font-bold">Budgets & Limits</h2><p className="text-sm text-slate-500">Set your own monthly spending limits.</p></div><button onClick={()=>setBudgetModal(true)} className="border rounded-lg px-3 py-2 text-sm font-semibold">Edit budgets</button></div><BudgetProgressList alerts={alerts.alerts} onOpenBudgetModal={()=>setBudgetModal(true)} selectedCategory={filter} onSelectCategory={setFilter}/></section>}
      {section==='analytics' && <section className="bg-white rounded-2xl border p-5"><h2 className="font-bold mb-1">Spending Analytics</h2><p className="text-sm text-slate-500 mb-5">Charts are calculated from your saved transactions.</p><ExpenseCharts currentMonthExpenses={monthExpenses} allExpenses={expenses} monthKey={month} budgetConfig={budget}/></section>}
      {section==='transactions' && <section className="bg-white rounded-2xl border p-5"><div className="flex justify-between items-center mb-5"><div><h2 className="font-bold">Transactions</h2><p className="text-sm text-slate-500">Your actual financial records.</p></div><div className="flex gap-2"><button onClick={exportCsv} className="border rounded-lg px-3 py-2 text-sm font-semibold">Export CSV</button><button onClick={()=>{setEditing(null);setModal(true)}} className="bg-slate-900 text-white rounded-lg px-3 py-2 text-sm font-semibold">Add transaction</button></div></div><ExpenseList expenses={filter?monthExpenses.filter(e=>e.categoryId===filter):monthExpenses} onAddExpense={()=>{setEditing(null);setModal(true)}} onEditExpense={e=>{setEditing(e);setModal(true)}} onDeleteExpense={remove} selectedCategory={filter} onSelectCategory={setFilter} onExportCSV={exportCsv} onResetData={reset}/></section>}
    </main>
    {message && <div className="fixed bottom-5 right-5 bg-slate-900 text-white rounded-xl px-4 py-3 text-sm shadow-xl max-w-sm">{message}</div>}
    <ExpenseModal isOpen={modal} onClose={()=>{setModal(false);setEditing(null)}} onSave={save} editingExpense={editing} defaultDate={getTodayDateString()}/>
    <BudgetManagerModal isOpen={budgetModal} onClose={()=>setBudgetModal(false)} currentBudgetConfig={budget} onSaveBudgets={saveB} monthName={formatMonthKeyToName(month)}/>
  </div>;
}
