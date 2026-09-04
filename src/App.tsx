import { useState, useEffect, useMemo } from 'react';
import { Expense, MonthBudgetConfig, AuthUser } from './types';
import { generateSampleExpenses, getDefaultBudgetsForMonth } from './data/initialData';
import {
  computeCategoryAlerts,
  formatMonthKeyToName,
  getCurrentMonthKey,
  getTodayDateString,
} from './utils/formatters';
import { CATEGORY_MAP, PAYMENT_METHOD_LABELS } from './data/categories';
import { MetricCards } from './components/MetricCards';
import { BudgetAlertsBanner } from './components/BudgetAlertsBanner';
import { ExpenseCharts } from './components/ExpenseCharts';
import { BudgetProgressList } from './components/BudgetProgressList';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseModal } from './components/ExpenseModal';
import { BudgetManagerModal } from './components/BudgetManagerModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import {
  fetchSupabaseStatus,
  fetchSupabaseSqlSchema,
  pullFromSupabase,
  pushToSupabase,
  twoWaySyncSupabase,
  getSyncPreferences,
  saveSyncPreferences,
  SupabaseSyncStatus,
  SyncPreferences,
} from './services/supabaseSync';
import { SignInPage } from './components/SignInPage';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { getStoredUser, logoutUser } from './services/authService';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Calendar,
  Layers,
  PieChart,
  Receipt,
  RotateCcw,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LayoutGrid,
  TrendingUp,
  Target,
} from 'lucide-react';

const EXPENSES_STORAGE_KEY = 'expense_tracker_records_v1';
const BUDGETS_STORAGE_KEY = 'expense_tracker_budgets_v1';

type SectionId = 'all' | 'overview' | 'budgets' | 'analytics' | 'transactions';

export default function App() {
  // Authentication user state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Segregated active section: 'all' | 'overview' | 'budgets' | 'analytics' | 'transactions'
  const [activeSection, setActiveSection] = useState<SectionId>('all');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Supabase Sync state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPrefs, setSyncPrefs] = useState<SyncPreferences>(() => getSyncPreferences());
  const [sqlSchema, setSqlSchema] = useState<string>('');
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Show temporary toast message
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setSyncToast({ message, type });
    setTimeout(() => {
      setSyncToast((cur) => (cur?.message === message ? null : cur));
    }, 4500);
  };

  // Initial load of Supabase status and SQL schema
  const refreshSupabaseStatus = async () => {
    const status = await fetchSupabaseStatus();
    setSupabaseStatus(status);
    return status;
  };

  useEffect(() => {
    refreshSupabaseStatus();
    fetchSupabaseSqlSchema().then((sql) => {
      if (sql) setSqlSchema(sql);
    });
  }, []);

  // Initialize expenses from localStorage
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const stored = localStorage.getItem(EXPENSES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return generateSampleExpenses();
  });

  // Save expenses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to persist expenses:', e);
    }
  }, [expenses]);

  // Initialize budget configs map
  const [budgetsMap, setBudgetsMap] = useState<Record<string, MonthBudgetConfig>>(() => {
    try {
      const stored = localStorage.getItem(BUDGETS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return {};
  });

  // Save budgets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgetsMap));
    } catch (e) {
      console.error('Failed to persist budgets:', e);
    }
  }, [budgetsMap]);

  // Current month budget config
  const currentMonthBudget = useMemo(() => {
    if (budgetsMap[selectedMonthKey]) {
      return budgetsMap[selectedMonthKey];
    }
    return getDefaultBudgetsForMonth(selectedMonthKey);
  }, [budgetsMap, selectedMonthKey]);

  // Filter expenses for selected month
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((exp) => exp.date.startsWith(selectedMonthKey));
  }, [expenses, selectedMonthKey]);

  // Compute category alerts and statistics
  const alertAnalysis = useMemo(() => {
    return computeCategoryAlerts(currentMonthExpenses, currentMonthBudget);
  }, [currentMonthExpenses, currentMonthBudget]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const [year, month] = selectedMonthKey.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonthKey(`${y}-${m}`);
    setSelectedCategoryFilter(null);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonthKey.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    setSelectedMonthKey(`${y}-${m}`);
    setSelectedCategoryFilter(null);
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonthKey(getCurrentMonthKey());
    setSelectedCategoryFilter(null);
  };

  // Supabase Two-Way Sync
  const handleTwoWaySync = async () => {
    setIsSyncing(true);
    try {
      const result = await twoWaySyncSupabase(expenses, budgetsMap);
      if (result.success && result.mergedExpenses && result.mergedBudgets) {
        setExpenses(result.mergedExpenses);
        setBudgetsMap(result.mergedBudgets);
        const updatedPrefs = saveSyncPreferences({
          lastSyncedAt: result.lastSyncedAt || Date.now(),
          lastSyncStatus: 'success',
          lastSyncMessage: `Unified ${result.mergedExpenses.length} total records`,
        });
        setSyncPrefs(updatedPrefs);
        showToast(`Successfully synced with Supabase (${result.mergedExpenses.length} records unified)`, 'success');
        await refreshSupabaseStatus();
      } else {
        const updatedPrefs = saveSyncPreferences({
          lastSyncStatus: 'error',
          lastSyncMessage: result.error || 'Failed during sync',
        });
        setSyncPrefs(updatedPrefs);
        showToast(result.error || 'Sync failed. Check Supabase connection and tables.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Sync failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Push local data to Supabase
  const handlePushToCloud = async () => {
    setIsSyncing(true);
    try {
      const result = await pushToSupabase(expenses, budgetsMap);
      if (result.success) {
        const updatedPrefs = saveSyncPreferences({
          lastSyncedAt: result.lastSyncedAt || Date.now(),
          lastSyncStatus: 'success',
          lastSyncMessage: `Uploaded ${expenses.length} expenses to Supabase`,
        });
        setSyncPrefs(updatedPrefs);
        showToast(`Uploaded ${expenses.length} expenses to Supabase!`, 'success');
        await refreshSupabaseStatus();
      } else {
        showToast(result.error || 'Push failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Push failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull data from Supabase
  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    try {
      const result = await pullFromSupabase();
      if (result.success && result.mergedExpenses && result.mergedBudgets) {
        setExpenses(result.mergedExpenses);
        setBudgetsMap(result.mergedBudgets);
        const updatedPrefs = saveSyncPreferences({
          lastSyncedAt: result.lastSyncedAt || Date.now(),
          lastSyncStatus: 'success',
          lastSyncMessage: `Downloaded ${result.mergedExpenses.length} expenses`,
        });
        setSyncPrefs(updatedPrefs);
        showToast(`Downloaded ${result.mergedExpenses.length} expenses from Supabase!`, 'success');
        await refreshSupabaseStatus();
      } else {
        showToast(result.error || 'Pull failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Pull failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper to trigger background auto-sync if enabled
  const triggerAutoSyncIfEnabled = (updatedExpenses: Expense[], updatedBudgets: Record<string, MonthBudgetConfig>) => {
    if (syncPrefs.autoSync && supabaseStatus?.configured && supabaseStatus?.connected && supabaseStatus?.tablesExist !== false) {
      pushToSupabase(updatedExpenses, updatedBudgets).then((res) => {
        if (res.success) {
          const updated = saveSyncPreferences({
            lastSyncedAt: Date.now(),
            lastSyncStatus: 'success',
            lastSyncMessage: 'Auto-synced',
          });
          setSyncPrefs(updated);
        }
      }).catch(() => {});
    }
  };

  // Add / Edit expense handler
  const handleSaveExpense = (
    expenseData: Omit<Expense, 'id' | 'createdAt'>,
    editId?: string
  ) => {
    let nextExpenses: Expense[];
    if (editId) {
      nextExpenses = expenses.map((item) =>
        item.id === editId ? { ...item, ...expenseData } : item
      );
      setExpenses(nextExpenses);
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      nextExpenses = [newExpense, ...expenses];
      setExpenses(nextExpenses);

      // If user logs expense in a different month, switch to it automatically so they see it
      const expMonth = expenseData.date.substring(0, 7);
      if (expMonth !== selectedMonthKey) {
        setSelectedMonthKey(expMonth);
      }
    }

    triggerAutoSyncIfEnabled(nextExpenses, budgetsMap);
  };

  // Delete expense
  const handleDeleteExpense = (id: string) => {
    const nextExpenses = expenses.filter((item) => item.id !== id);
    setExpenses(nextExpenses);
    triggerAutoSyncIfEnabled(nextExpenses, budgetsMap);
  };

  // Save budget configuration
  const handleSaveBudgetConfig = (newConfig: MonthBudgetConfig) => {
    const nextBudgets = {
      ...budgetsMap,
      [newConfig.monthKey]: newConfig,
    };
    setBudgetsMap(nextBudgets);
    triggerAutoSyncIfEnabled(expenses, nextBudgets);
  };

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['ID', 'Date', 'Merchant / Title', 'Category', 'Amount (INR ₹)', 'Payment Method', 'Notes'],
      ...currentMonthExpenses.map((exp) => [
        exp.id,
        exp.date,
        `"${exp.title.replace(/"/g, '""')}"`,
        CATEGORY_MAP.get(exp.categoryId)?.name || exp.categoryId,
        exp.amount.toFixed(2),
        PAYMENT_METHOD_LABELS[exp.paymentMethod] || exp.paymentMethod,
        `"${(exp.notes || '').replace(/"/g, '""')}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expenses_${selectedMonthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open reset confirmation dialog
  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  // Perform full reset to default data and limits
  const handlePerformReset = () => {
    const sample = generateSampleExpenses();
    setExpenses(sample);
    setBudgetsMap({});
    setSelectedCategoryFilter(null);
    setSelectedMonthKey(getCurrentMonthKey());
    try {
      localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(sample));
      localStorage.removeItem(BUDGETS_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset localStorage data:', e);
    }
    setIsResetConfirmOpen(false);
    showToast('Successfully restored default sample transactions and category budgets.', 'success');
  };

  // Sign out handler
  const handleSignOut = () => {
    logoutUser();
    setCurrentUser(null);
    showToast('You have been signed out successfully.', 'info');
  };

  const isCurrentMonthActive = selectedMonthKey === getCurrentMonthKey();

  // Show Sign In page if no authenticated user session
  if (!currentUser) {
    return (
      <SignInPage
        onSignInSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.name}!`, 'success');
        }}
        supabaseConfigured={Boolean(supabaseStatus?.configured)}
      />
    );
  }

  return (
    <div id="expense-tracker-app" className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Application Header */}
      <header id="app-header" className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-[0_1px_2px_0_rgba(0,0,0,0.03)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs ring-1 ring-slate-900/10">
                <Layers className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[15px] font-bold tracking-tight text-slate-900 font-display">
                    FinBook
                  </h1>
                  {alertAnalysis.exceededCount > 0 && (
                    <span className="hidden sm:inline-flex items-center rounded-full bg-rose-50 border border-rose-200/80 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      {alertAnalysis.exceededCount} Overrun{alertAnalysis.exceededCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 hidden sm:block font-normal">
                  Spending patterns & real-time budget thresholds
                </p>
              </div>
            </div>

            {/* Month Selector Bar */}
            <div id="month-navigator" className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100/70 p-1 shadow-2xs">
              <button
                id="btn-prev-month"
                type="button"
                onClick={handlePrevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition cursor-pointer"
                title="Previous Month"
                aria-label="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="h-3.5 w-3.5 text-slate-700" />
                <span className="text-xs font-semibold text-slate-900 min-w-28 text-center font-display tabular-nums">
                  {formatMonthKeyToName(selectedMonthKey)}
                </span>
              </div>

              <button
                id="btn-next-month"
                type="button"
                onClick={handleNextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-2xs transition cursor-pointer"
                title="Next Month"
                aria-label="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {!isCurrentMonthActive && (
                <button
                  id="btn-jump-current-month"
                  type="button"
                  onClick={handleResetToCurrentMonth}
                  className="hidden md:inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition ml-1 shadow-2xs cursor-pointer"
                >
                  Current
                </button>
              )}
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              {/* Supabase Sync Button */}
              <button
                id="btn-header-supabase-sync"
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer ${
                  supabaseStatus?.configured && supabaseStatus?.connected && supabaseStatus?.tablesExist !== false
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/70'
                    : supabaseStatus?.configured && supabaseStatus?.tablesExist === false
                    ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
                title="Configure and manage Supabase database sync"
              >
                <div className="relative">
                  <Database className="h-3.5 w-3.5 text-slate-600" />
                  <span
                    className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-white ${
                      supabaseStatus?.configured && supabaseStatus?.connected && supabaseStatus?.tablesExist !== false
                        ? 'bg-emerald-500'
                        : supabaseStatus?.configured
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                </div>
                <span className="hidden sm:inline">
                  {isSyncing ? 'Syncing...' : 'Supabase Sync'}
                </span>
                <span className="sm:hidden">Sync</span>
                {syncPrefs.autoSync && (
                  <span className="hidden md:inline text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1 rounded">
                    Auto
                  </span>
                )}
              </button>

              <button
                id="btn-header-manage-budgets"
                type="button"
                onClick={() => setIsBudgetModalOpen(true)}
                className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span>Budgets</span>
              </button>

              <button
                id="btn-header-add-expense"
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setIsExpenseModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs hover:shadow transition active:scale-[0.98] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Log Expense</span>
              </button>

              {/* User Profile Info & Prominent Sign Out Button */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden xl:flex items-center gap-2 py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-[11px]">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left leading-none max-w-[120px]">
                    <div className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
                  </div>
                </div>

                <button
                  id="btn-header-signout"
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-[0.98] cursor-pointer"
                  title={`Sign out (${currentUser.email})`}
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="app-main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Bar */}
        <div id="navigation-tab-bar" className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="tab-view-all"
              type="button"
              onClick={() => setActiveSection('all')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeSection === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>All</span>
            </button>

            <button
              id="tab-view-overview"
              type="button"
              onClick={() => setActiveSection('overview')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeSection === 'overview'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Overview & Metrics</span>
            </button>

            <button
              id="tab-view-budgets"
              type="button"
              onClick={() => setActiveSection('budgets')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeSection === 'budgets'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>Budgets & Limits</span>
              {alertAnalysis.exceededCount > 0 && (
                <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                  {alertAnalysis.exceededCount}
                </span>
              )}
            </button>

            <button
              id="tab-view-analytics"
              type="button"
              onClick={() => setActiveSection('analytics')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeSection === 'analytics'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              <span>Spending Analytics</span>
            </button>

            <button
              id="tab-view-transactions"
              type="button"
              onClick={() => setActiveSection('transactions')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                activeSection === 'transactions'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Transactions</span>
              <span className="rounded-md bg-slate-100 text-slate-700 px-1.5 py-0.2 text-[10px] font-bold border border-slate-200/60">
                {currentMonthExpenses.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-quick-reset"
              type="button"
              onClick={handleResetData}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-transparent hover:border-slate-200 cursor-pointer"
              title="Reset all expenses and budgets to defaults"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Reset to Default</span>
            </button>
          </div>
        </div>

        {/* Financial Overview & Key Metrics */}
        {(activeSection === 'all' || activeSection === 'overview') && (
          <section id="view-overview" className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <TrendingUp className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Financial Overview & Key Metrics
                  </h2>
                  <p className="text-xs text-slate-500">
                    Expenditure summary, monthly target, and budget headroom for {formatMonthKeyToName(selectedMonthKey)}
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/60">
                Executive Summary
              </span>
            </div>

            <MetricCards
              totalSpent={alertAnalysis.totalSpent}
              totalBudget={alertAnalysis.totalBudget}
              monthKey={selectedMonthKey}
              transactionCount={currentMonthExpenses.length}
            />
          </section>
        )}

        {/* Category Budgets & Alert Monitoring */}
        {(activeSection === 'all' || activeSection === 'budgets') && (
          <section id="view-budgets" className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                  <Target className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Category Budgets & Alert Monitoring
                  </h2>
                  <p className="text-xs text-slate-500">
                    Active thresholds, category limits, and real-time overspend alerts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-adjust-budgets"
                  type="button"
                  onClick={() => setIsBudgetModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
                >
                  <SlidersHorizontal className="h-3 w-3 text-slate-500" />
                  <span>Adjust Budgets</span>
                </button>
                <span className="hidden sm:inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/60">
                  Limits & Thresholds
                </span>
              </div>
            </div>

            {/* Budget Alert Banner */}
            <BudgetAlertsBanner
              alerts={alertAnalysis.alerts}
              exceededCount={alertAnalysis.exceededCount}
              criticalCount={alertAnalysis.criticalCount}
              warningCount={alertAnalysis.warningCount}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              onFilterByCategory={(catId) => {
                setSelectedCategoryFilter(catId);
                setActiveSection('transactions');
              }}
            />

            {/* Category Budget Progress Grid */}
            <BudgetProgressList
              alerts={alertAnalysis.alerts}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              selectedCategory={selectedCategoryFilter}
              onSelectCategory={(catId) => {
                setSelectedCategoryFilter(catId);
                if (catId) {
                  setActiveSection('transactions');
                }
              }}
            />
          </section>
        )}

        {/* Spending Analytics & Insights */}
        {(activeSection === 'all' || activeSection === 'analytics') && (
          <section id="view-analytics" className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <PieChart className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Spending Analytics & Visual Patterns
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cumulative pace velocity, category breakdown, multi-month trends & weekday patterns
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200/60">
                Visual Analytics
              </span>
            </div>

            <ExpenseCharts
              currentMonthExpenses={currentMonthExpenses}
              allExpenses={expenses}
              monthKey={selectedMonthKey}
              budgetConfig={currentMonthBudget}
            />
          </section>
        )}

        {/* Transaction Ledger & Records */}
        {(activeSection === 'all' || activeSection === 'transactions') && (
          <section id="view-transactions" className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Receipt className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 font-display">
                    Transaction Ledger & Records
                  </h2>
                  <p className="text-xs text-slate-500">
                    Filter, search, record, and export individual transactions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-add-expense"
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setIsExpenseModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Expense</span>
                </button>
                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                  {currentMonthExpenses.length} Records
                </span>
              </div>
            </div>

            <ExpenseList
              expenses={currentMonthExpenses}
              onAddExpense={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onEditExpense={(exp) => {
                setEditingExpense(exp);
                setIsExpenseModalOpen(true);
              }}
              onDeleteExpense={handleDeleteExpense}
              selectedCategory={selectedCategoryFilter}
              onSelectCategory={setSelectedCategoryFilter}
              onExportCSV={handleExportCSV}
              onResetData={handleResetData}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>FinBook — Monthly Spending Analytics & Budget Alerts</span>
          <div className="flex items-center gap-3">
            <span>
              {supabaseStatus?.configured && supabaseStatus?.connected && supabaseStatus?.tablesExist !== false
                ? 'Synced with Supabase Cloud DB'
                : 'Local browser storage'}
            </span>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="text-blue-600 hover:text-blue-800 font-semibold transition hover:underline"
            >
              Sync Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Sync Toast Notification */}
      {syncToast && (
        <div
          id="sync-toast-notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg transition-all"
        >
          {syncToast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : syncToast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          ) : (
            <RefreshCw className="h-4 w-4 text-blue-600 shrink-0 animate-spin" />
          )}
          <span className="text-xs font-semibold text-slate-800">{syncToast.message}</span>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="ml-2 rounded-md p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
        defaultDate={getTodayDateString()}
      />

      {/* Budget Manager Modal */}
      <BudgetManagerModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudgetConfig={currentMonthBudget}
        onSaveBudgets={handleSaveBudgetConfig}
        monthName={formatMonthKeyToName(selectedMonthKey)}
      />

      {/* Supabase Sync Modal */}
      <SupabaseSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        status={supabaseStatus}
        onRefreshStatus={refreshSupabaseStatus}
        onTwoWaySync={handleTwoWaySync}
        onPushToCloud={handlePushToCloud}
        onPullFromCloud={handlePullFromCloud}
        isSyncing={isSyncing}
        syncPrefs={syncPrefs}
        onUpdateSyncPrefs={setSyncPrefs}
        expenses={expenses}
        budgetsMap={budgetsMap}
        sqlSchema={sqlSchema}
      />

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handlePerformReset}
      />
    </div>
  );
}
