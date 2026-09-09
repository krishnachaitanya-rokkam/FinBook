import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Filter, Lightbulb, Target, TrendingUp, WalletCards } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../services/firebase';
import { formatCurrency } from '../utils/formatters';

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate: string;
  monthlyContribution: number;
  type?: 'savings' | 'investment';
  scope?: 'personal' | 'family';
  expectedAnnualReturn?: number;
};

type Expense = {
  id: string;
  amount: number;
  date: string;
  categoryId?: string;
  goalId?: string;
  goalScope?: 'personal' | 'family';
};

type Props = { goals: Goal[] };

const monthsUntil = (date: string) => {
  const target = new Date(`${date}T23:59:59`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4375)));
};

const annualReturn = (goal: Goal) =>
  goal.type === 'investment' ? Math.min(50, Math.max(0, Number(goal.expectedAnnualReturn ?? 8) || 0)) : 0;

const requiredMonthly = (goal: Goal, months: number) => {
  const target = Math.max(0, Number(goal.targetAmount) || 0);
  const current = Math.max(0, Number(goal.currentAmount) || 0);
  if (months <= 0) return Math.max(0, target - current);
  if (target <= current) return 0;
  const r = Math.pow(1 + annualReturn(goal) / 100, 1 / 12) - 1;
  if (r === 0) return Math.ceil((target - current) / months / 100) * 100;
  const growth = Math.pow(1 + r, months);
  const factor = (growth - 1) / r;
  return Math.max(0, Math.ceil((target - current * growth) / factor / 100) * 100);
};

const project = (goal: Goal, months: number) => {
  let value = Math.max(0, Number(goal.currentAmount) || 0);
  const monthly = Math.max(0, Number(goal.monthlyContribution) || 0);
  const r = Math.pow(1 + annualReturn(goal) / 100, 1 / 12) - 1;
  for (let i = 0; i < months; i += 1) value = value * (1 + r) + monthly;
  return value;
};

const monthKey = (date: string) => date.slice(0, 7);
const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
};

export const GoalIntelligence: React.FC<Props> = ({ goals }) => {
  const [filter, setFilter] = useState<'all' | 'savings' | 'investment'>('all');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [historyGoal, setHistoryGoal] = useState<string | null>(null);

  useEffect(() => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) {
      setExpenses([]);
      return;
    }
    return onSnapshot(
      collection(firestore, 'users', uid, 'expenses'),
      snap => setExpenses(snap.docs.map(d => d.data() as Expense)),
      () => setExpenses([])
    );
  }, []);

  const plans = useMemo(() => goals.map(goal => {
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    const current = Math.max(0, Number(goal.currentAmount) || 0);
    const months = monthsUntil(goal.targetDate);
    const gap = Math.max(0, target - current);
    const required = requiredMonthly(goal, months);
    const projected = project(goal, months);
    const projectedGap = Math.max(0, target - projected);
    const onTrack = gap === 0 || projected >= target;
    const extra = Math.max(0, required - (Number(goal.monthlyContribution) || 0));
    return { goal, target, current, months, gap, required, projected, projectedGap, onTrack, extra, progress: target ? Math.min(100, Math.round((current / target) * 100)) : 0 };
  }), [goals]);

  const visible = plans.filter(p => filter === 'all' || p.goal.type === filter);
  const onTrack = visible.filter(p => p.onTrack).length;
  const gap = visible.reduce((s, p) => s + p.projectedGap, 0);
  const monthly = visible.reduce((s, p) => s + p.extra, 0);
  const planned = visible.reduce((s, p) => s + (Number(p.goal.monthlyContribution) || 0), 0);
  const requiredTotal = visible.reduce((s, p) => s + p.required, 0);
  const recommendation = visible.filter(p => !p.onTrack).sort((a, b) => b.projectedGap - a.projectedGap)[0];
  const actionGoals = visible.filter(p => p.required > 0).sort((a, b) => {
    if (a.onTrack !== b.onTrack) return a.onTrack ? 1 : -1;
    return b.extra - a.extra;
  });

  const history = useMemo(() => {
    const keys = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const selected = historyGoal ? goals.find(g => g.id === historyGoal) : visible[0]?.goal;
    return {
      keys,
      selected,
      rows: keys.map(key => ({
        key,
        amount: expenses.filter(e => e.goalId === selected?.id && e.goalScope !== 'family' && e.categoryId === 'investment' && monthKey(e.date) === key).reduce((s, e) => s + (Number(e.amount) || 0), 0),
      })),
    };
  }, [expenses, historyGoal, goals, visible]);

  const historyTotal = history.rows.reduce((s, r) => s + r.amount, 0);
  const historyMonths = history.rows.filter(r => r.amount > 0).length;
  const historyAvg = historyMonths ? historyTotal / historyMonths : 0;
  const currentMonthKey = history.keys[5];
  const currentMonth = history.rows[5]?.amount || 0;
  const paceDelta = historyAvg ? ((currentMonth - historyAvg) / historyAvg) * 100 : 0;
  const maxHistory = Math.max(1, ...history.rows.map(r => r.amount));

  if (!goals.length) return null;

  return <>
    <section className="mt-5 rounded-2xl border border-indigo-100 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Goal intelligence</p><h3 className="mt-1 text-lg font-bold text-slate-900">Your goals, with a plan</h3><p className="mt-1 text-xs sm:text-sm text-slate-500">Required contributions now use each goal's return assumption and target date.</p></div>
          <Target className="h-5 w-5 text-indigo-500" />
        </div>
        <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Filter className="h-3.5 w-3.5" /> View</span>{(['all', 'savings', 'investment'] as const).map(v => <button key={v} type="button" onClick={() => setFilter(v)} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${filter === v ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{v}</button>)}</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Goals on track</p><p className="mt-1 text-lg font-bold">{onTrack}/{visible.length}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Projected gap</p><p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(gap)}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Extra needed / month</p><p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(monthly)}</p></div>
          <div className="rounded-xl bg-indigo-50 p-3"><p className="text-[10px] text-indigo-500">Active goals</p><p className="mt-1 text-lg font-bold text-indigo-700">{visible.length}</p></div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/60 p-4">
          <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-100 p-2"><WalletCards className="h-5 w-5 text-indigo-600" /></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">This month</p><h4 className="mt-0.5 text-base font-bold text-slate-900">Your goal allocation plan</h4><p className="mt-1 text-xs leading-5 text-slate-500">Based on target dates, return assumptions and current monthly plans, AHVIQ recommends allocating <strong>{formatCurrency(requiredTotal)}</strong> across these goals this month.</p></div></div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2"><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[10px] text-slate-400">Recommended / month</p><p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(requiredTotal)}</p></div><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[10px] text-slate-400">Currently planned</p><p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(planned)}</p></div><div className={`rounded-xl border p-3 ${monthly > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}><p className={`text-[10px] ${monthly > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{monthly > 0 ? 'Additional allocation needed' : 'Plan is fully funded'}</p><p className={`mt-1 text-base font-bold tabular-nums ${monthly > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{formatCurrency(monthly)}</p></div></div>
          {actionGoals.length > 0 && <div className="mt-3 space-y-2">{actionGoals.map(p => <div key={`action-${p.goal.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5"><div className="min-w-0"><p className="text-xs font-bold truncate">{p.goal.name}</p><p className="text-[10px] text-slate-500">Required {formatCurrency(p.required)} · Plan {formatCurrency(Number(p.goal.monthlyContribution) || 0)} · Return {p.goal.type === 'investment' ? `${annualReturn(p.goal)}%` : '0%'}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${p.extra > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{p.extra > 0 ? `+${formatCurrency(p.extra)}` : 'Covered'}</span></div>)}</div>}
          <p className="mt-3 text-[10px] leading-4 text-slate-400">This is a planning recommendation based only on the personal goals stored in AHVIQ. It does not move money or change your actual investments.</p>
        </div>
        {recommendation && <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p className="text-xs leading-5 text-amber-900"><strong>Priority:</strong> Increase <strong>{recommendation.goal.name}</strong> by about <strong>{formatCurrency(recommendation.extra)}</strong> per month. It currently has the largest projected shortfall.</p></div>}
        <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /><p className="text-xs leading-5 text-slate-600">Savings goals use contributions only. Investment goals use each goal's saved annual return assumption. Existing investment goals default to 8% until edited. These are planning estimates, not guarantees.</p></div>
      </div>
    </section>

    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"><div><div className="flex items-center gap-2"><div className="rounded-xl bg-slate-100 p-2"><BarChart3 className="h-5 w-5 text-slate-600" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Goal history</p><h4 className="mt-0.5 text-base font-bold text-slate-900">Contribution trend</h4></div></div><p className="mt-1 text-xs text-slate-500">Actual investment transactions linked to the selected goal, last 6 months.</p></div><select value={history.selected?.id || ''} onChange={e => setHistoryGoal(e.target.value || null)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold max-w-full">{visible.map(p => <option key={p.goal.id} value={p.goal.id}>{p.goal.name}</option>)}</select></div>
        {history.selected ? <><div className="grid grid-cols-2 sm:grid-cols-4 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">6-month contributions</p><p className="mt-1 text-sm font-bold tabular-nums">{formatCurrency(historyTotal)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Active months</p><p className="mt-1 text-sm font-bold">{historyMonths}/6</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Average active month</p><p className="mt-1 text-sm font-bold tabular-nums">{formatCurrency(historyAvg)}</p></div><div className={`rounded-xl p-3 ${paceDelta >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}><p className={`text-[10px] ${paceDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>Current vs average</p><p className={`mt-1 text-sm font-bold tabular-nums ${paceDelta >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{historyAvg ? `${paceDelta >= 0 ? '+' : ''}${Math.round(paceDelta)}%` : 'No baseline'}</p></div></div><div className="flex items-end gap-2 h-36">{history.rows.map(row => <div key={row.key} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1"><div className="w-full max-w-12 rounded-t-lg bg-indigo-500 transition-all" style={{ height: `${Math.max(row.amount ? 6 : 2, (row.amount / maxHistory) * 100)}%` }} title={`${monthLabel(row.key)}: ${formatCurrency(row.amount)}`} /><span className="text-[10px] text-slate-400">{monthLabel(row.key)}</span><span className="text-[9px] font-semibold text-slate-500 truncate max-w-full">{row.amount ? formatCurrency(row.amount) : '—'}</span></div>)}</div><div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"><div className="flex items-start gap-2"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /><p className="text-xs leading-5 text-slate-600">{currentMonthKey && currentMonth > 0 ? `You contributed ${formatCurrency(currentMonth)} to this goal this month.` : 'No linked investment contribution recorded this month.'} {historyAvg > 0 && currentMonth < historyAvg ? 'Your current pace is below your active-month average.' : 'Your current pace is at or above your active-month average.'}</p></div></div></> : <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No goal is available for the selected view.</p>}
      </div>
    </section>
  </>;
};
