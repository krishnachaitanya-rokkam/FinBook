import { Expense, MonthBudgetConfig } from '../types';

export interface SupabaseSyncStatus {
  configured: boolean;
  connected: boolean;
  url?: string;
  hasKey?: boolean;
  error?: string;
  message?: string;
  tablesExist?: boolean;
  counts?: {
    expenses: number;
    budgets: number;
  };
}

export interface SyncResult {
  success: boolean;
  error?: string;
  mergedExpenses?: Expense[];
  mergedBudgets?: Record<string, MonthBudgetConfig>;
  stats?: {
    totalExpenses?: number;
    pushedExpenses?: number;
    pulledExpenses?: number;
    timestamp?: number;
    expensesPushed?: number;
    budgetsPushed?: number;
  };
  lastSyncedAt?: number;
}

const SYNC_PREFS_KEY = 'expense_tracker_sync_prefs_v1';

export interface SyncPreferences {
  autoSync: boolean;
  lastSyncedAt: number | null;
  lastSyncStatus: 'success' | 'error' | null;
  lastSyncMessage: string | null;
}

export function getSyncPreferences(): SyncPreferences {
  try {
    const raw = localStorage.getItem(SYNC_PREFS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return {
    autoSync: false,
    lastSyncedAt: null,
    lastSyncStatus: null,
    lastSyncMessage: null,
  };
}

export function saveSyncPreferences(prefs: Partial<SyncPreferences>) {
  try {
    const current = getSyncPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(SYNC_PREFS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save sync preferences:', e);
    return getSyncPreferences();
  }
}

export async function fetchSupabaseStatus(): Promise<SupabaseSyncStatus> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        configured: false,
        connected: false,
        error: data.error || `HTTP ${res.status}`,
        message: data.message || 'Error communicating with Supabase status API',
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: false,
      connected: false,
      error: err.message,
      message: 'Network error contacting local server backend.',
    };
  }
}

export async function fetchSupabaseSqlSchema(): Promise<string> {
  try {
    const res = await fetch('/api/supabase/schema');
    const data = await res.json();
    return data.sql || '';
  } catch (err) {
    console.error('Failed to get schema:', err);
    return '';
  }
}

export async function pullFromSupabase(): Promise<SyncResult> {
  try {
    const res = await fetch('/api/supabase/pull');
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to pull data from Supabase',
      };
    }
    return {
      success: true,
      mergedExpenses: data.expenses,
      mergedBudgets: data.budgetsMap,
      lastSyncedAt: Date.now(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error during pull operation',
    };
  }
}

export async function pushToSupabase(
  expenses: Expense[],
  budgetsMap: Record<string, MonthBudgetConfig>
): Promise<SyncResult> {
  try {
    const res = await fetch('/api/supabase/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses, budgetsMap }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to push data to Supabase',
      };
    }
    return {
      success: true,
      stats: data.stats,
      lastSyncedAt: Date.now(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error during push operation',
    };
  }
}

export async function twoWaySyncSupabase(
  localExpenses: Expense[],
  localBudgets: Record<string, MonthBudgetConfig>
): Promise<SyncResult> {
  try {
    const res = await fetch('/api/supabase/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localExpenses, localBudgets }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed during two-way synchronization',
      };
    }
    return {
      success: true,
      mergedExpenses: data.mergedExpenses,
      mergedBudgets: data.mergedBudgets,
      stats: data.stats,
      lastSyncedAt: Date.now(),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error during two-way sync',
    };
  }
}
