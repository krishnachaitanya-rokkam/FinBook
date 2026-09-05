import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { IndianRupee, LogOut, Plus, Target, TrendingUp, Receipt, PieChart, ChevronLeft, ChevronRight, Calendar, CalendarRange, WalletCards, Menu, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
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
import { PortfolioManager } from './components/PortfolioManager';
import { SettingsPage } from './components/SettingsPage';
import { SignInPage } from './components/SignInPage';
import { firebaseAuth } from './services/firebase';
import { subscribeToUserData, removeExpense, saveBudget, saveExpense, clearUserData } from './services/firestoreData';
import { subscribeToPortfolio, savePortfolio, DEFAULT_PORTFOLIO_FIELDS, PortfolioConfig } from './services/portfolioService';
import { logoutUser } from './services/authService';

type Section = 'cashflow' | 'portfolio' | 'settings';
type CashFlowView = 'overview' | 'budgets' | 'analytics' | 'transactions';

const getMonthBounds = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${String(month).padStart(2, '0')}-01`,
    end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
};

const formatDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function FinBookApp() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Record<string, MonthBudgetConfig>>({});
  const [portfolio, setPortfolio] = useState<PortfolioConfig>({ fields: DEFAULT_PORTFOLIO_FIELDS });
  const [month, setMonth] = useState(getCurrentMonthKey());
  const [section, setSection] = useState<Section>('cashflow');
  const [cashFlowView, setCashFlowView] = useState<CashFlowView>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeEnabled, setRangeEnabled] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const monthPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let unsubscribeData = () => {};
    let unsubscribePortfolio = () => {};

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (u) => {
      unsubscribeData();
      unsubscribePortfolio();
      unsubscribeData = () => {};
      unsubscribePortfolio = () => {};
      setReady(false);

      if (!u) {
        setUser(null);
        setExpenses([]);
        setBudgets({});
        setPortfolio({ fields: DEFAULT_PORTFOLIO_FIELDS });
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

      unsubscribePortfolio = subscribeToPortfolio(
        u.uid,
        (data) => setPortfolio(data),
        (error) => console.error('Portfolio sync error:', error)
      );
    });

    return () => {
      unsubscribeData();
      unsubscribePortfolio();
      unsubscribeAuth();
    };
  }, []);

  const monthExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(month)), [expenses, month]);
  const budget = budgets[month] || getDefaultBudgetsForMonth(month);
  const alerts = useMemo(() => computeCategoryAlerts(monthExpenses, budget), [monthExpenses, budget]);

  const rangeExpenses = useMemo(() => {
    if (!rangeEnabled || !rangeStart || !rangeEnd) return monthExpenses;
    return expenses.filter(e => e.date >= rangeStart && e.date <= rangeEnd);
  }, [expenses, monthExpenses, rangeEnabled, rangeStart, rangeEnd]);

  const cashFlowExpenses = rangeEnabled ? rangeExpenses : monthExpenses;
  const periodAlerts = useMemo(() => computeCategoryAlerts(cashFlowExpenses, budget), [cashFlowExpenses, budget]);

  const toast = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3000);
  };

  const clearRange = () => {
    setRangeEnabled(false);
    setRangeOpen(false);
    setRangeStart('');
    setRangeEnd('');
    setFilter(null);
  };

  const openRangePicker = () => {
    if (!rangeEnabled) {
      const bounds = getMonthBounds(month);
      setRangeStart(bounds.start);
      setRangeEnd(bounds.end);
    }
    setRangeOpen(v => !v);
  };

  const applyRange = () => {
    if (!rangeStart || !rangeEnd) {
      toast('Choose both start and end dates');
      return;
    }
    if (rangeStart > rangeEnd) {
      toast('Start date must be before end date');
      return;
    }
    setRangeEnabled(true);
    setRangeOpen(false);
    setFilter(null);
  };

  const updateRangeStart = (value: string) => {
    setRangeStart(value);
    if (rangeEnd && value > rangeEnd) setRangeEnd(value);
  };

  const updateRangeEnd = (value: string) => {
    setRangeEnd(value);
    if (rangeStart && value < rangeStart) setRangeStart(value);
  };

  const navigate = (nextSection: Section) => {
    setSection(nextSection);
    setMobileNavOpen(false);
  };

  const selectCashFlowView = (view: CashFlowView) => {
    setSection('cashflow');
    setCashFlowView(view);
  };

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

  const saveP = async (nextPortfolio: PortfolioConfig) => {
    if (!user) return;
    const previous = portfolio;
    setPortfolio(nextPortfolio);
    try {
      await savePortfolio(user.id, nextPortfolio);
      toast('Portfolio saved to cloud');
    } catch (error: any) {
      setPortfolio(previous);
      toast(`Could not save portfolio: ${error?.message || 'Please try again'}`);
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
    clearRange();
  };

  const openMonthPicker = () => {
    const picker = monthPickerRef.current;
    if (!picker) return;
    try {
      if (typeof picker.showPicker === 'function') picker.showPicker();
      else picker.focus();
    } catch {
      picker.focus();
    }
  };

  const handleMonthPickerChange = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    setMonth(value);
    setFilter(null);
    clearRange();
  };

  const exportCsv=()=>{
    const rows=[
      ['Date','Title','Category','Amount','Payment Method','Notes'],
      ...cashFlowExpenses.map(e=>[
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
    a.download=`FinBook-${rangeEnabled ? `${rangeStart}-to-${rangeEnd}` : month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sidebar = (mobile = false) => (
    <aside className={`${mobile ? 'w-64' : sidebarCollapsed ? 'w-[76px]' : 'w-64'} h-full bg-white border-r border-slate-200 px-3 py-5 flex flex-col shadow-sm transition-[width] duration-200 overflow-hidden`}>
      <div className={`px-2 pb-5 mb-2 border-b border-slate-100 ${sidebarCollapsed && !mobile ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0"><IndianRupee className="h-5 w-5"/></div>
          {(!sidebarCollapsed || mobile) && <div className="min-w-0"><b className="text-lg">FinBook</b><p className="text-xs text-slate-500 truncate">Personal money manager</p></div>}
        </div>
      </div>

      <nav className="space-y-2">
        <button onClick={()=>navigate('cashflow')} title={sidebarCollapsed && !mobile ? 'Cash Flow' : undefined} className={`w-full flex items-center ${sidebarCollapsed && !mobile ? 'justify-center' : 'gap-2'} rounded-xl px-3 py-3 text-sm font-bold ${section==='cashflow'?'bg-indigo-50 text-indigo-700':'text-slate-700 hover:bg-slate-50'}`}>
          <TrendingUp className="h-4 w-4 shrink-0"/>
          {(!sidebarCollapsed || mobile) && <span>Cash Flow</span>}
        </button>
        <button onClick={()=>navigate('portfolio')} title={sidebarCollapsed && !mobile ? 'Portfolio' : undefined} className={`w-full flex items-center ${sidebarCollapsed && !mobile ? 'justify-center' : 'gap-2'} rounded-xl px-3 py-3 text-sm font-bold ${section==='portfolio'?'bg-slate-900 text-white':'text-slate-700 hover:bg-slate-50'}`}>
          <WalletCards className="h-4 w-4 shrink-0"/>
          {(!sidebarCollapsed || mobile) && <span>Portfolio</span>}
        </button>
        <button onClick={()=>navigate('settings')} title={sidebarCollapsed && !mobile ? 'Settings' : undefined} className={`w-full flex items-center ${sidebarCollapsed && !mobile ? 'justify-center' : 'gap-2'} rounded-xl px-3 py-3 text-sm font-bold ${section==='settings'?'bg-slate-900 text-white':'text-slate-700 hover:bg-slate-50'}`}>
          <Settings className="h-4 w-4 shrink-0"/>
          {(!sidebarCollapsed || mobile) && <span>Settings</span>}
        </button>
      </nav>

      <div className="mt-auto">
        {!mobile && <button onClick={()=>setSidebarCollapsed(v=>!v)} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-end'} gap-2 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-50`} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4"/> : <><PanelLeftClose className="h-4 w-4"/><span>Collapse</span></>}
        </button>}
        {(!sidebarCollapsed || mobile) && <div className="px-2 pt-3 text-xs text-slate-400">Manage cash flow and investments in one place.</div>}
      </div>
    </aside>
  );

  const cashFlowTabs = [
    { id: 'overview' as CashFlowView, label: 'Overview', icon: TrendingUp },
    { id: 'budgets' as CashFlowView, label: 'Budgets', icon: Target },
    { id: 'analytics' as CashFlowView, label: 'Analytics', icon: PieChart },
    { id: 'transactions' as CashFlowView, label: `Transactions (${cashFlowExpenses.length})`, icon: Receipt },
  ];

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="hidden md:block fixed left-0 top-0 bottom-0 z-40">{sidebar()}</div>
    {mobileNavOpen && <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 md:hidden" onClick={()=>setMobileNavOpen(false)} />
      <div className="fixed left-0 top-0 bottom-0 z-50 md:hidden">{sidebar(true)}</div>
    </>}

    <div className={`${sidebarCollapsed ? 'md:pl-[76px]' : 'md:pl-64'} transition-[padding] duration-200`}>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={()=>setMobileNavOpen(true)} className="md:hidden p-2 rounded-lg border border-slate-200" aria-label="Open menu"><Menu className="h-4 w-4"/></button>
            <div className="md:hidden min-w-0"><b className="text-lg">FinBook</b></div>
            <div className="hidden md:block text-sm font-semibold text-slate-500">{section==='portfolio'?'Portfolio':section==='settings'?'Settings':'Cash Flow'}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {section!=='settings' && <>
              <button onClick={()=>shiftMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="h-4 w-4"/></button>
              <button type="button" onClick={openMonthPicker} className="relative flex items-center gap-1.5 rounded-lg px-2.5 py-2 hover:bg-slate-100 cursor-pointer min-w-28 justify-center border border-transparent hover:border-slate-200" title="Choose month" aria-label={`Choose month, currently ${formatMonthKeyToName(month)}`}>
                <Calendar className="h-4 w-4 text-slate-500 shrink-0"/>
                <span className="text-sm font-semibold text-center pointer-events-none">{formatMonthKeyToName(month)}</span>
                <input ref={monthPickerRef} type="month" value={month} onChange={(e)=>handleMonthPickerChange(e.target.value)} aria-label="Choose month" className="absolute pointer-events-none opacity-0 w-px h-px" tabIndex={-1} />
              </button>
              <button onClick={()=>shiftMonth(1)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Next month"><ChevronRight className="h-4 w-4"/></button>
              <button onClick={()=>{setEditing(null);setModal(true)}} className="ml-1 flex items-center gap-1.5 rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4"/><span className="hidden sm:inline">Add</span></button>
            </>}
            <button onClick={()=>logoutUser()} title="Sign out" aria-label="Sign out" className="p-2 rounded-lg border border-slate-200"><LogOut className="h-4 w-4"/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {section==='cashflow' && <>
          <div className="bg-white rounded-2xl border p-2 flex flex-wrap gap-2">
            {cashFlowTabs.map(tab => {
              const Icon = tab.icon;
              const active = cashFlowView === tab.id;
              return <button key={tab.id} onClick={()=>selectCashFlowView(tab.id)} className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${active?'bg-slate-900 text-white shadow-sm':'text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="h-4 w-4" />{tab.label}
              </button>;
            })}
          </div>

          <div className="bg-white rounded-2xl border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Period</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                  {rangeEnabled ? `${formatDate(rangeStart)} – ${formatDate(rangeEnd)}` : formatMonthKeyToName(month)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {rangeEnabled && <button onClick={clearRange} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Reset</button>}
                <button onClick={openRangePicker} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border ${rangeEnabled ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <CalendarRange className="h-4 w-4" />
                  {rangeEnabled ? 'Edit date range' : 'Custom date range'}
                </button>
              </div>
            </div>

            {rangeOpen && <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block min-w-0">
                  <span className="block text-xs font-semibold text-slate-500 mb-1.5">Start date</span>
                  <input type="date" value={rangeStart} onChange={e=>updateRangeStart(e.target.value)} className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white" />
                </label>
                <label className="block min-w-0">
                  <span className="block text-xs font-semibold text-slate-500 mb-1.5">End date</span>
                  <input type="date" value={rangeEnd} onChange={e=>updateRangeEnd(e.target.value)} className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white" />
                </label>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-slate-500">Example: 25 Aug 2026 to 24 Sep 2026. The range can span multiple months.</p>
                <button onClick={applyRange} className="w-full sm:w-auto rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold">Apply range</button>
              </div>
            </div>}
          </div>

          {cashFlowView==='overview' && <section className="bg-white rounded-2xl border p-5">
            <h2 className="font-bold mb-1">Financial Overview</h2>
            <p className="text-sm text-slate-500 mb-5">Real data for {rangeEnabled ? `${formatDate(rangeStart)} to ${formatDate(rangeEnd)}` : formatMonthKeyToName(month)}</p>
            <MetricCards totalSpent={periodAlerts.totalSpent} totalBudget={periodAlerts.totalBudget} monthKey={month} transactionCount={cashFlowExpenses.length}/>
          </section>}

          {cashFlowView==='budgets' && <section className="bg-white rounded-2xl border p-5">
            <div className="flex justify-between items-center mb-5 gap-3">
              <div><h2 className="font-bold">Budgets & Limits</h2><p className="text-sm text-slate-500">Set your own monthly spending limits.</p></div>
              <button onClick={()=>setBudgetModal(true)} className="border rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap">Edit budgets</button>
            </div>
            <BudgetProgressList alerts={alerts.alerts} onOpenBudgetModal={()=>setBudgetModal(true)} selectedCategory={filter} onSelectCategory={setFilter}/>
          </section>}

          {cashFlowView==='analytics' && <section className="bg-white rounded-2xl border p-5">
            <h2 className="font-bold mb-1">Spending Analytics</h2>
            <p className="text-sm text-slate-500 mb-5">Charts are calculated from your saved transactions for the selected period.</p>
            <ExpenseCharts currentMonthExpenses={cashFlowExpenses} allExpenses={cashFlowExpenses} monthKey={month} budgetConfig={budget}/>
          </section>}

          {cashFlowView==='transactions' && <section className="bg-white rounded-2xl border p-5">
            <div className="flex justify-between items-center mb-5 gap-3">
              <div><h2 className="font-bold">Transactions</h2><p className="text-sm text-slate-500">Your actual financial records for the selected period.</p></div>
              <div className="flex gap-2 shrink-0"><button onClick={exportCsv} className="border rounded-lg px-3 py-2 text-sm font-semibold">Export CSV</button><button onClick={()=>{setEditing(null);setModal(true)}} className="bg-slate-900 text-white rounded-lg px-3 py-2 text-sm font-semibold">Add transaction</button></div>
            </div>
            <ExpenseList expenses={filter?cashFlowExpenses.filter(e=>e.categoryId===filter):cashFlowExpenses} onAddExpense={()=>{setEditing(null);setModal(true)}} onEditExpense={e=>{setEditing(e);setModal(true)}} onDeleteExpense={remove} selectedCategory={filter} onSelectCategory={setFilter} onExportCSV={exportCsv} onResetData={reset}/>
          </section>}
        </>}

        {section==='portfolio' && <PortfolioManager config={portfolio} onSave={saveP}/>} 
        {section==='settings' && <SettingsPage userName={user.name} email={user.email} onClearData={reset} onExportData={exportCsv}/>} 
      </main>
    </div>

    {message && <div className="fixed bottom-5 right-5 bg-slate-900 text-white rounded-xl px-4 py-3 text-sm shadow-xl max-w-sm z-[70]">{message}</div>}
    <ExpenseModal isOpen={modal} onClose={()=>{setModal(false);setEditing(null)}} onSave={save} editingExpense={editing} defaultDate={getTodayDateString()}/>
    <BudgetManagerModal isOpen={budgetModal} onClose={()=>setBudgetModal(false)} currentBudgetConfig={budget} onSaveBudgets={saveB} monthName={formatMonthKeyToName(month)}/>
  </div>;
}
