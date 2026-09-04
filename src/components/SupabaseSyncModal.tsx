import React, { useState } from 'react';
import {
  Database,
  Cloud,
  CloudOff,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  ArrowUpDown,
  Code2,
  Info,
} from 'lucide-react';
import {
  SupabaseSyncStatus,
  SyncPreferences,
  saveSyncPreferences,
} from '../services/supabaseSync';
import { Expense, MonthBudgetConfig } from '../types';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseSyncStatus | null;
  onRefreshStatus: () => Promise<void>;
  onTwoWaySync: () => Promise<void>;
  onPushToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  isSyncing: boolean;
  syncPrefs: SyncPreferences;
  onUpdateSyncPrefs: (newPrefs: SyncPreferences) => void;
  expenses: Expense[];
  budgetsMap: Record<string, MonthBudgetConfig>;
  sqlSchema: string;
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  onTwoWaySync,
  onPushToCloud,
  onPullFromCloud,
  isSyncing,
  syncPrefs,
  onUpdateSyncPrefs,
  expenses,
  budgetsMap,
  sqlSchema,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlSchema);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleToggleAutoSync = () => {
    const updated = saveSyncPreferences({ autoSync: !syncPrefs.autoSync });
    onUpdateSyncPrefs(updated);
  };

  const formatLastSynced = (ts: number | null) => {
    if (!ts) return 'Never';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConfigured = status?.configured && status?.connected;
  const isMissingTables = status?.configured && status?.connected && status?.tablesExist === false;

  return (
    <div
      id="supabase-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs transition-opacity overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSyncing) onClose();
      }}
    >
      <div
        id="supabase-sync-modal-dialog"
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200/90 transition-transform my-8 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">
                Supabase Database Sync
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sync and backup your transactions and budgets with your Supabase database
              </p>
            </div>
          </div>
          <button
            id="btn-close-sync-modal"
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4 custom-scrollbar">
          {/* Status Box */}
          <div
            id="supabase-status-banner"
            className={`rounded-xl border p-4 transition ${
              isConfigured && !isMissingTables
                ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                : isMissingTables
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isConfigured && !isMissingTables ? (
                    <Cloud className="h-5 w-5 text-emerald-600" />
                  ) : isMissingTables ? (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CloudOff className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-display">
                      {isConfigured && !isMissingTables
                        ? 'Connected to Supabase'
                        : isMissingTables
                        ? 'Connected — Tables Need Setup'
                        : 'Supabase Not Configured Yet'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        isConfigured && !isMissingTables
                          ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                          : isMissingTables
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-200/70 border-slate-300 text-slate-700'
                      }`}
                    >
                      {isConfigured && !isMissingTables
                        ? 'Live'
                        : isMissingTables
                        ? 'Action Needed'
                        : 'Offline Mode'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {status?.message ||
                      (isConfigured
                        ? 'Ready to sync local transactions with your cloud database.'
                        : 'Configure your Supabase URL and Anon key in the project Settings / Secrets to enable cloud synchronization.')}
                  </p>

                  {status?.url && (
                    <div className="mt-2 text-[11px] text-slate-500 font-mono">
                      Host: <span className="font-semibold text-slate-700">{status.url}</span>
                      {status?.counts && (
                        <span className="ml-3 text-slate-600">
                          (Cloud Records: {status.counts.expenses} expenses,{' '}
                          {status.counts.budgets} monthly budget targets)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                id="btn-check-supabase-status"
                type="button"
                onClick={async () => {
                  setActionMessage('Testing connection...');
                  await onRefreshStatus();
                  setTimeout(() => setActionMessage(null), 2000);
                }}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition shrink-0"
                title="Test Supabase connection"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Test Link</span>
              </button>
            </div>
          </div>

          {actionMessage && (
            <div className="rounded-lg bg-blue-50 border border-blue-200/80 p-2 text-xs font-medium text-blue-800 text-center animate-pulse">
              {actionMessage}
            </div>
          )}

          {/* Sync Controls / Options */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-display">
              Synchronization Options
            </h4>

            {/* Option 1: Smart Two-Way Sync */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-4 hover:border-slate-300 transition shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Two-Way Smart Sync
                      </span>
                      <span className="rounded-full bg-blue-100/70 border border-blue-200 px-1.5 py-0.2 text-[9px] font-bold text-blue-700">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Merges local transactions and cloud data without losing any records. Any entries
                      unique to either side will be unified.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-two-way-sync"
                  type="button"
                  onClick={async () => {
                    setActionMessage('Synchronizing both ways...');
                    await onTwoWaySync();
                    setActionMessage(null);
                  }}
                  disabled={isSyncing || !isConfigured}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 disabled:opacity-50 transition shrink-0 active:scale-[0.99]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>

            {/* Option 2 & 3: Push & Pull */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Push */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 hover:border-slate-300 transition shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <UploadCloud className="h-4 w-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">Upload to Supabase</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Upsert your {expenses.length} local expenses and{' '}
                    {Object.keys(budgetsMap).length} budget plans directly into the cloud.
                  </p>
                </div>
                <button
                  id="btn-push-to-cloud"
                  type="button"
                  onClick={async () => {
                    setActionMessage('Pushing local data to Supabase...');
                    await onPushToCloud();
                    setActionMessage(null);
                  }}
                  disabled={isSyncing || !isConfigured}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition shadow-2xs"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Push Local to Cloud</span>
                </button>
              </div>

              {/* Pull */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 hover:border-slate-300 transition shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <DownloadCloud className="h-4 w-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">Download from Supabase</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Fetch all expenses and configurations from Supabase to replace or update local storage.
                  </p>
                </div>
                <button
                  id="btn-pull-from-cloud"
                  type="button"
                  onClick={async () => {
                    setActionMessage('Downloading data from Supabase...');
                    await onPullFromCloud();
                    setActionMessage(null);
                  }}
                  disabled={isSyncing || !isConfigured}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition shadow-2xs"
                >
                  <DownloadCloud className="h-3.5 w-3.5" />
                  <span>Pull Cloud to Local</span>
                </button>
              </div>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Automatic Background Sync
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Automatically sync changes whenever an expense is created, edited, or deleted.
                </span>
              </div>
              <button
                id="btn-toggle-auto-sync"
                type="button"
                onClick={handleToggleAutoSync}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  syncPrefs.autoSync ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    syncPrefs.autoSync ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sync Stats & Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Local Records
              </span>
              <span className="text-sm font-bold text-slate-900 font-display tabular-nums mt-0.5 block">
                {expenses.length}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Cloud Records
              </span>
              <span className="text-sm font-bold text-slate-900 font-display tabular-nums mt-0.5 block">
                {status?.counts?.expenses ?? (isConfigured ? '—' : '0')}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Last Synced
              </span>
              <span className="text-xs font-semibold text-slate-800 mt-1 block truncate">
                {formatLastSynced(syncPrefs.lastSyncedAt)}
              </span>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-2.5 text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Sync Status
              </span>
              <span
                className={`text-xs font-semibold mt-1 inline-flex items-center gap-1 ${
                  syncPrefs.lastSyncStatus === 'success'
                    ? 'text-emerald-600'
                    : syncPrefs.lastSyncStatus === 'error'
                    ? 'text-rose-600'
                    : 'text-slate-500'
                }`}
              >
                {syncPrefs.lastSyncStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Synced
                  </>
                ) : syncPrefs.lastSyncStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-3 w-3" /> Failed
                  </>
                ) : (
                  'Ready'
                )}
              </span>
            </div>
          </div>

          {/* Database Setup Helper / SQL Script */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-slate-700" />
                <span className="text-xs font-bold text-slate-900 font-display">
                  Supabase Database Setup (SQL)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-sql-schema"
                  type="button"
                  onClick={() => setShowSqlDetails(!showSqlDetails)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {showSqlDetails ? 'Hide SQL' : 'View SQL'}
                </button>
                <button
                  id="btn-copy-sql-schema"
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              If your Supabase project is new, run this SQL script in your Supabase{' '}
              <strong className="text-slate-700">SQL Editor</strong> to create the{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-800">expenses</code> and{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-800">month_budgets</code> tables
              with security policies.
            </p>

            {showSqlDetails && (
              <div className="mt-3 relative rounded-lg bg-slate-900 p-3 text-slate-100 font-mono text-[11px] max-h-48 overflow-y-auto custom-scrollbar">
                <pre className="whitespace-pre">{sqlSchema}</pre>
              </div>
            )}
          </div>

          {/* Setup Guide notice for environment variables */}
          {!isConfigured && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="text-slate-900 font-semibold">How to connect:</strong> In AI Studio, open{' '}
                <span className="font-semibold text-slate-800">Settings &rarr; Secrets</span> and define{' '}
                <code className="font-mono bg-white border border-slate-200 px-1 rounded text-slate-800">SUPABASE_URL</code> and{' '}
                <code className="font-mono bg-white border border-slate-200 px-1 rounded text-slate-800">SUPABASE_ANON_KEY</code>.
                The application will immediately recognize your database credentials.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            {syncPrefs.autoSync ? 'Auto-sync is enabled' : 'Manual sync mode'}
          </span>
          <button
            id="btn-close-sync-modal-footer"
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
