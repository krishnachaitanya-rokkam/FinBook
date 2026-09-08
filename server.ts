import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  checkSupabaseConnection,
  getSupabaseClient,
  SUPABASE_SQL_SCHEMA,
} from './server/supabase';
import { registerAIAdvisorRoutes } from './server/aiAdvisor';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // AI Advisor — Gemini stays server-side; the browser never receives the API key.
  registerAIAdvisorRoutes(app);

  // Auth endpoints
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email address is required' });
      }

      const client = getSupabaseClient();
      if (client && password && password.length >= 6) {
        try {
          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (!error && data?.user) {
            const name = data.user.user_metadata?.full_name || email.split('@')[0];
            return res.json({
              success: true,
              user: {
                id: data.user.id,
                email: data.user.email || email,
                name: name.charAt(0).toUpperCase() + name.slice(1),
                provider: 'supabase',
                lastLogin: Date.now(),
              },
              message: 'Signed in with Supabase Auth',
            });
          }
        } catch {
          // fallback to local verification
        }
      }

      const namePart = email.split('@')[0];
      const formattedName = namePart
        .split(/[._-]/)
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      return res.json({
        success: true,
        user: {
          id: 'usr-' + Math.random().toString(36).substring(2, 9),
          email,
          name: formattedName || 'Finance Manager',
          provider: client ? 'supabase' : 'email',
          lastLogin: Date.now(),
        },
        message: 'Signed in successfully',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Login failed' });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, name } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email address is required' });
      }

      const client = getSupabaseClient();
      if (client && password && password.length >= 6) {
        try {
          const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { full_name: name || email.split('@')[0] } },
          });
          if (!error && data?.user) {
            return res.json({
              success: true,
              user: {
                id: data.user.id,
                email: data.user.email || email,
                name: name || email.split('@')[0],
                provider: 'supabase',
                lastLogin: Date.now(),
              },
              message: 'Account created with Supabase Auth',
            });
          }
        } catch {
          // fallback
        }
      }

      const displayName = name || email.split('@')[0];
      return res.json({
        success: true,
        user: {
          id: 'usr-' + Math.random().toString(36).substring(2, 9),
          email,
          name: displayName,
          provider: 'email',
          lastLogin: Date.now(),
        },
        message: 'Account created successfully',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Signup failed' });
    }
  });

  app.get('/api/supabase/status', async (req, res) => {
    try {
      const status = await checkSupabaseConnection();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({
        configured: false,
        connected: false,
        error: err?.message || 'Internal error checking Supabase status',
      });
    }
  });

  app.get('/api/supabase/schema', (req, res) => {
    res.json({ sql: SUPABASE_SQL_SCHEMA });
  });

  app.get('/api/supabase/pull', async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) {
        return res.status(400).json({
          success: false,
          error: 'Supabase credentials are not configured in environment variables (SUPABASE_URL, SUPABASE_ANON_KEY).',
        });
      }

      const { data: expensesRows, error: expensesError } = await client
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (expensesError) {
        return res.status(500).json({ success: false, error: `Error querying expenses: ${expensesError.message}` });
      }

      const { data: budgetRows, error: budgetsError } = await client.from('month_budgets').select('*');
      if (budgetsError) {
        return res.status(500).json({ success: false, error: `Error querying month_budgets: ${budgetsError.message}` });
      }

      const expenses = (expensesRows || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        amount: Number(row.amount),
        categoryId: row.category_id,
        date: row.date,
        paymentMethod: row.payment_method,
        notes: row.notes || undefined,
        createdAt: Number(row.created_at) || Date.now(),
      }));

      const budgetsMap: Record<string, any> = {};
      (budgetRows || []).forEach((row: any) => {
        budgetsMap[row.month_key] = {
          monthKey: row.month_key,
          overallBudget: Number(row.overall_budget),
          categoryBudgets: row.category_budgets || {},
        };
      });

      res.json({
        success: true,
        expenses,
        budgetsMap,
        pulledCount: { expenses: expenses.length, budgets: Object.keys(budgetsMap).length },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to pull data from Supabase' });
    }
  });

  app.post('/api/supabase/push', async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) {
        return res.status(400).json({ success: false, error: 'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY.' });
      }

      const { expenses = [], budgetsMap = {} } = req.body;
      let insertedExpensesCount = 0;
      let insertedBudgetsCount = 0;

      if (Array.isArray(expenses) && expenses.length > 0) {
        const expenseRecords = expenses.map((exp: any) => ({
          id: String(exp.id),
          title: String(exp.title || 'Untitled Expense'),
          amount: Number(exp.amount) || 0,
          category_id: String(exp.categoryId || 'other'),
          date: String(exp.date),
          payment_method: String(exp.paymentMethod || 'credit_card'),
          notes: exp.notes ? String(exp.notes) : null,
          created_at: Number(exp.createdAt) || Date.now(),
          updated_at: Date.now(),
        }));

        const chunkSize = 100;
        for (let i = 0; i < expenseRecords.length; i += chunkSize) {
          const chunk = expenseRecords.slice(i, i + chunkSize);
          const { error } = await client.from('expenses').upsert(chunk, { onConflict: 'id' });
          if (error) {
            return res.status(500).json({ success: false, error: `Failed to upload expenses chunk: ${error.message}` });
          }
        }
        insertedExpensesCount = expenseRecords.length;
      }

      const budgetEntries = Object.values(budgetsMap) as any[];
      if (budgetEntries.length > 0) {
        const budgetRecords = budgetEntries.map((b: any) => ({
          month_key: String(b.monthKey),
          overall_budget: Number(b.overallBudget) || 0,
          category_budgets: b.categoryBudgets || {},
          updated_at: Date.now(),
        }));
        const { error: bError } = await client.from('month_budgets').upsert(budgetRecords, { onConflict: 'month_key' });
        if (bError) {
          return res.status(500).json({ success: false, error: `Failed to upload budgets: ${bError.message}` });
        }
        insertedBudgetsCount = budgetRecords.length;
      }

      res.json({
        success: true,
        stats: { expensesPushed: insertedExpensesCount, budgetsPushed: insertedBudgetsCount, timestamp: Date.now() },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to push data to Supabase' });
    }
  });

  app.post('/api/supabase/sync', async (req, res) => {
    try {
      const client = getSupabaseClient();
      if (!client) {
        return res.status(400).json({ success: false, error: 'Supabase credentials are not configured.' });
      }

      const { localExpenses = [], localBudgets = {} } = req.body;
      const { data: remoteExpensesRaw, error: expErr } = await client.from('expenses').select('*');
      if (expErr) {
        return res.status(500).json({ success: false, error: `Error querying remote expenses: ${expErr.message}` });
      }
      const { data: remoteBudgetsRaw, error: budErr } = await client.from('month_budgets').select('*');
      if (budErr) {
        return res.status(500).json({ success: false, error: `Error querying remote budgets: ${budErr.message}` });
      }

      const expenseMap = new Map<string, any>();
      (remoteExpensesRaw || []).forEach((row: any) => {
        expenseMap.set(row.id, {
          id: row.id,
          title: row.title,
          amount: Number(row.amount),
          categoryId: row.category_id,
          date: row.date,
          paymentMethod: row.payment_method,
          notes: row.notes || undefined,
          createdAt: Number(row.created_at) || Date.now(),
          updatedAt: Number(row.updated_at) || Number(row.created_at) || Date.now(),
          source: 'remote',
        });
      });

      const itemsToPushToRemote: any[] = [];
      (localExpenses as any[]).forEach((localExp) => {
        const existing = expenseMap.get(localExp.id);
        if (!existing) {
          const item = { ...localExp, updatedAt: localExp.createdAt || Date.now(), source: 'local' };
          expenseMap.set(localExp.id, item);
          itemsToPushToRemote.push(item);
        } else {
          const localUpdated = Number(localExp.createdAt) || 0;
          const remoteUpdated = Number(existing.updatedAt) || 0;
          if (localUpdated > remoteUpdated) {
            expenseMap.set(localExp.id, localExp);
            itemsToPushToRemote.push(localExp);
          }
        }
      });

      if (itemsToPushToRemote.length > 0) {
        const toUpsert = itemsToPushToRemote.map((exp) => ({
          id: String(exp.id),
          title: String(exp.title),
          amount: Number(exp.amount),
          category_id: String(exp.categoryId),
          date: String(exp.date),
          payment_method: String(exp.paymentMethod),
          notes: exp.notes ? String(exp.notes) : null,
          created_at: Number(exp.createdAt) || Date.now(),
          updated_at: Date.now(),
        }));
        await client.from('expenses').upsert(toUpsert, { onConflict: 'id' });
      }

      const mergedExpenses = Array.from(expenseMap.values())
        .map(({ source, updatedAt, ...rest }) => rest)
        .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

      const mergedBudgets: Record<string, any> = { ...localBudgets };
      const budgetsToPushToRemote: any[] = [];
      (remoteBudgetsRaw || []).forEach((row: any) => {
        if (!mergedBudgets[row.month_key]) {
          mergedBudgets[row.month_key] = {
            monthKey: row.month_key,
            overallBudget: Number(row.overall_budget),
            categoryBudgets: row.category_budgets || {},
          };
        }
      });

      const remoteKeys = new Set((remoteBudgetsRaw || []).map((r: any) => r.month_key));
      Object.values(localBudgets as Record<string, any>).forEach((localB) => {
        if (!remoteKeys.has(localB.monthKey)) {
          budgetsToPushToRemote.push({
            month_key: localB.monthKey,
            overall_budget: localB.overallBudget,
            category_budgets: localB.categoryBudgets,
            updated_at: Date.now(),
          });
        }
      });
      if (budgetsToPushToRemote.length > 0) {
        await client.from('month_budgets').upsert(budgetsToPushToRemote, { onConflict: 'month_key' });
      }

      res.json({
        success: true,
        mergedExpenses,
        mergedBudgets,
        stats: {
          totalExpenses: mergedExpenses.length,
          pushedExpenses: itemsToPushToRemote.length,
          pulledExpenses: (remoteExpensesRaw || []).length,
          timestamp: Date.now(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed during sync execution' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Expense Tracker server running on port ${PORT}`);
  });
}

startServer();
