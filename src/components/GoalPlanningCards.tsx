import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Pencil, Target, Trash2 } from 'lucide-react';
import { FinancialGoal } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';

interface Props { goals: FinancialGoal[]; onEditGoal?: (goal: FinancialGoal) => void; onDeleteGoal?: (id: string) => void; }

const monthsUntil = (date: string) => {
  const target = new Date(`${date}T23:59:59`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4375)));
};

const annualReturn = (goal: FinancialGoal) =>
  goal.type === 'investment' ? Math.min(50, Math.max(0, Number(goal.expectedAnnualReturn ?? 8) || 0)) : 0;

const requiredMonthly = (goal: FinancialGoal, months: number) => {
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

const project = (goal: FinancialGoal, months: number) => {
  let value = Math.max(0, Number(goal.currentAmount) || 0);
  const monthly = Math.max(0, Number(goal.monthlyContribution) || 0);
  const r = Math.pow(1 + annualReturn(goal) / 100, 1 / 12) - 1;
  for (let i = 0; i < months; i += 1) value = value * (1 + r) + monthly;
  return value;
};

export const GoalPlanningCards: React.FC<Props> = ({ goals, onEditGoal, onDeleteGoal }) => {
  const plans = useMemo(() => goals.map(goal => {
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    const current = Math.max(0, Number(goal.currentAmount) || 0);
    const months = monthsUntil(goal.targetDate);
    const required = requiredMonthly(goal, months);
    const projected = project(goal, months);
    const onTrack = current >= target || projected >= target;
    return { goal, target, current, months, required, projected, onTrack, progress: target ? Math.min(100, Math.round((current / target) * 100)) : 0 };
  }), [goals]);

  if (!plans.length) return null;

  return <section className="mt-5 space-y-3">
    {plans.map(p => <div key={p.goal.id} className="rounded-2xl border border-indigo-100 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><Target className="h-5 w-5 text-indigo-500" /><p className="font-bold text-slate-900 truncate">{p.goal.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.goal.type === 'investment' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{p.goal.type === 'investment' ? 'INVESTMENT' : 'SAVINGS'}</span></div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">{p.months} months remaining · Target {formatCurrency(p.target)} · Return {p.goal.type === 'investment' ? `${annualReturn(p.goal)}%` : '0%'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${p.onTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.onTrack ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{p.onTrack ? 'ON TRACK' : 'NEEDS ATTENTION'}</span>{onEditGoal && <button type="button" onClick={() => onEditGoal(p.goal)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600" aria-label={`Edit ${p.goal.name}`} title="Edit goal"><Pencil className="h-4 w-4" /></button>}{onDeleteGoal && <button type="button" onClick={() => onDeleteGoal(p.goal.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${p.goal.name}`} title="Delete goal"><Trash2 className="h-4 w-4" /></button>}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.progress}%` }} /></div>
      <div className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-2">
        <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Current</p><p className="text-sm font-bold tabular-nums">{formatCurrency(p.current)}</p></div>
        <div className="rounded-lg bg-indigo-50 p-2.5"><p className="text-[10px] text-indigo-500">Required / month</p><p className="text-sm font-bold text-indigo-700 tabular-nums">{formatCurrency(p.required)}</p></div>
        <div className="rounded-lg bg-violet-50 p-2.5"><p className="text-[10px] text-violet-500">Return</p><p className="text-sm font-bold text-violet-700 tabular-nums">{annualReturn(p.goal)}%</p></div>
        <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Plan</p><p className="text-sm font-bold tabular-nums">{formatCurrency(p.goal.monthlyContribution)}</p></div>
        <div className={`rounded-lg p-2.5 ${p.onTrack ? 'bg-emerald-50' : 'bg-amber-50'}`}><p className={`text-[10px] ${p.onTrack ? 'text-emerald-600' : 'text-amber-600'}`}>Projected</p><p className={`text-sm font-bold tabular-nums ${p.onTrack ? 'text-emerald-700' : 'text-amber-700'}`}>{formatCurrency(p.projected)}</p></div>
      </div>
    </div>)}
  </section>;
};
