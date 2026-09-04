import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseStatus {
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

let cachedClient: SupabaseClient | null = null;
let lastTestedUrl = '';
let lastTestedKey = '';

export function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL?.trim() || '';
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    ''
  );
  return { url, key, isConfigured: Boolean(url && key) };
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return null;
  }

  // If credentials changed, recreate client
  if (cachedClient && (url !== lastTestedUrl || key !== lastTestedKey)) {
    cachedClient = null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastTestedUrl = url;
    lastTestedKey = key;
  }

  return cachedClient;
}

export const SUPABASE_SQL_SCHEMA = `-- 1. Expenses Table
create table if not exists public.expenses (
  id text primary key,
  title text not null,
  amount numeric(12, 2) not null,
  category_id text not null,
  date text not null,
  payment_method text not null,
  notes text,
  created_at bigint not null,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 2. Monthly Budget Configurations Table
create table if not exists public.month_budgets (
  month_key text primary key,
  overall_budget numeric(12, 2) not null,
  category_budgets jsonb not null default '{}'::jsonb,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 3. Row Level Security & Access Policies
alter table public.expenses enable row level security;
alter table public.month_budgets enable row level security;

-- Allow full read/write access for authenticated and anonymous clients:
create policy "Allow all operations on expenses"
  on public.expenses for all
  using (true)
  with check (true);

create policy "Allow all operations on month_budgets"
  on public.month_budgets for all
  using (true)
  with check (true);
`;

export async function checkSupabaseConnection(): Promise<SupabaseStatus> {
  const { url, key, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return {
      configured: false,
      connected: false,
      hasKey: Boolean(key),
      url: url ? url.substring(0, 16) + '...' : undefined,
      message: 'SUPABASE_URL or SUPABASE_ANON_KEY is not defined in environment variables.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: false,
      connected: false,
      message: 'Failed to initialize Supabase client.',
    };
  }

  try {
    // Attempt to test access to expenses table
    const { count: expensesCount, error: expensesError } = await client
      .from('expenses')
      .select('*', { count: 'exact', head: true });

    if (expensesError) {
      // Check if table missing (error code 42P01 in postgres)
      const isMissingTable =
        expensesError.message?.toLowerCase().includes('does not exist') ||
        expensesError.code === '42P01';

      if (isMissingTable) {
        return {
          configured: true,
          connected: true,
          tablesExist: false,
          url: url.replace(/https?:\/\//, '').split('/')[0],
          message: 'Connected to Supabase project! Database tables need to be created.',
        };
      }

      return {
        configured: true,
        connected: false,
        tablesExist: false,
        error: expensesError.message,
        message: `Supabase query error: ${expensesError.message}`,
      };
    }

    const { count: budgetsCount } = await client
      .from('month_budgets')
      .select('*', { count: 'exact', head: true });

    return {
      configured: true,
      connected: true,
      tablesExist: true,
      url: url.replace(/https?:\/\//, '').split('/')[0],
      counts: {
        expenses: expensesCount ?? 0,
        budgets: budgetsCount ?? 0,
      },
      message: 'Connected to Supabase! All tables ready.',
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      error: err?.message || 'Network error connecting to Supabase',
      message: 'Could not reach Supabase endpoint.',
    };
  }
}
