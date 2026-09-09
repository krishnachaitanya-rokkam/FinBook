import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Target, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

type FamilyGoal = { id: string; name: string; targetAmount: number; targetDate: string; monthlyContribution: number; type?: 'savings' | 'investment'; currentAmount?: number };
interface FamilyGoalPlannerProps { goals: FamilyGoal[]; }

function monthsUntil(targetDate: string): number {
  const target = new Date(`${targetDate}T23:59:59`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.4375)));
}

function project(goal: FamilyGoal, months: number): number {
  const current = Math.max(0, Number(goal.currentAmount) || 0);
  const monthly = Math.max(0, Number(goal.monthlyContribution) || 0);
  if (goal.type !== 'investment') return current + monthly * months;
  const monthlyRate = Math.pow(1 + 0.08, 1 / 12) - 1;
  let value = current;
  for (let i = 0; i < months; i += 1) value = value * (1 + monthlyRate) + monthly;
  return value;
}

export const FamilyGoalPlanner: React.FC<FamilyGoalPlannerProps> = ({ goals }) => {
  const plans = useMemo(() => goals.map(goal => {
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    const current = Math.max(0, Number(goal.currentAmount) || 0);
    const monthly = Math.max(0, Number(goal.monthlyContribution) || 0);
    const months = monthsUntil(goal.targetDate);
    const gap = Math.max(0, target - current);
    const requiredMonthly = months > 0 ? Math.ceil(gap / months / 100) * 100 : gap;
    const projected = project(goal, months);
    const projectedGap = Math.max(0, target - projected);
    const onTrack = gap <= 0 || projected >= target;
    return { goal, target, current, monthly, months, requiredMonthly, projected, projectedGap, onTrack };
  }), [goals]);

  if (!goals.length) return null;
  const onTrack = plans.filter(p => p.onTrack).length;
  const totalGap = plans.reduce((sum, p) => sum + p.projectedGap, 0);

  return <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Goal intelligence</p><h3 className="mt-1 text-lg font-bold text-slate-900">Family goals health</h3><p className="mt-1 text-xs sm:text-sm text-slate-500">See whether the household contribution plan is enough to reach each target on time.</p></div>
      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">{onTrack}/{plans.length} ON TRACK</span>
    </div>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-400">Goals on track</p><p className="mt-1 text-lg font-bold text-slate-900">{onTrack} / {plans.length}</p></div>
      <div className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-400">Projected gap</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(totalGap)}</p></div>
    </div>
    <div className="mt-4 space-y-3">
      {plans.map(item => {
        const progress = item.target > 0 ? Math.min(100, Math.round(item.current / item.target * 100)) : 0;
        return <div key={item.goal.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Target className="h-4 w-4 shrink-0 text-indigo-600" /><p className="font-bold text-slate-900 truncate">{item.goal.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.goal.type === 'investment' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.goal.type === 'investment' ? 'INVESTMENT' : 'SAVINGS'}</span></div><p className="mt-1 text-xs text-slate-500">{item.months > 0 ? `${item.months} months remaining` : 'Target date reached'}</p></div><div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${item.onTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.onTrack ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}{item.onTrack ? 'ON TRACK' : 'NEEDS ATTENTION'}</div></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} /></div>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Current</p><p className="mt-0.5 text-sm font-bold tabular-nums">{formatCurrency(item.current)}</p></div>
            <div className="rounded-lg bg-indigo-50 p-2.5"><p className="text-[10px] text-indigo-500">Required / month</p><p className="mt-0.5 text-sm font-bold text-indigo-700 tabular-nums">{formatCurrency(item.requiredMonthly)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Family plan</p><p className="mt-0.5 text-sm font-bold tabular-nums">{formatCurrency(item.monthly)}</p></div>
            <div className={`rounded-lg p-2.5 ${item.onTrack ? 'bg-emerald-50' : 'bg-amber-50'}`}><p className="text-[10px] text-slate-500">Projected</p><p className="mt-0.5 text-sm font-bold tabular-nums">{formatCurrency(item.projected)}</p></div>
          </div>
          {!item.onTrack && <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p className="text-xs leading-5 text-amber-800">Increase the family plan by about <strong>{formatCurrency(Math.max(0, item.requiredMonthly - item.monthly))}</strong> per month to cover the target without relying on higher returns.</p></div>}
        </div>;
      })}
    </div>
    <p className="mt-3 text-[10px] text-slate-400">Investment projections use an illustrative 8% annual return. Savings goals use contributions only. Neither is a guarantee.</p>
  </section>;
};
