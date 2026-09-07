import React, { useMemo } from 'react';
import { Target, TrendingUp, ShieldCheck } from 'lucide-react';
import { FinancialGoal } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';

interface GoalPlannerProps {
  goals: FinancialGoal[];
}

function monthsUntil(targetDate: string): number {
  const target = new Date(`${targetDate}T23:59:59`);
  if (Number.isNaN(target.getTime())) return 0;
  const now = new Date();
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
}

function projectGoal(goal: FinancialGoal, months: number, annualReturn = 8): number {
  const monthlyRate = Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
  let value = Math.max(0, Number(goal.currentAmount) || 0);
  const contribution = Math.max(0, Number(goal.monthlyContribution) || 0);
  for (let i = 0; i < months; i += 1) value = value * (1 + monthlyRate) + contribution;
  return value;
}

export const GoalPlanner: React.FC<GoalPlannerProps> = ({ goals }) => {
  const plans = useMemo(() => goals.map(goal => {
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    const current = Math.min(target, Math.max(0, Number(goal.currentAmount) || 0));
    const monthly = Math.max(0, Number(goal.monthlyContribution) || 0);
    const months = monthsUntil(goal.targetDate);
    const gap = Math.max(0, target - current);
    const requiredMonthly = months > 0 ? Math.ceil(gap / months / 100) * 100 : gap;
    const projected = projectGoal({ ...goal, currentAmount: current }, months);
    const projectedGap = Math.max(0, target - projected);
    const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    const onTrack = projected >= target || gap <= 0;
    return { goal, target, current, monthly, months, gap, requiredMonthly, projected, projectedGap, progress, onTrack };
  }), [goals]);

  const onTrackCount = plans.filter(item => item.onTrack).length;
  const totalGap = plans.reduce((sum, item) => sum + item.projectedGap, 0);

  if (!goals.length) {
    return <section className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-cyan-50/60 p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-100 p-2"><Target className="h-5 w-5 text-indigo-600" /></div><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Goal Planning</p><h4 className="mt-1 text-lg font-bold text-slate-900">Turn goals into a plan</h4><p className="mt-1 text-sm text-slate-500">Add a financial goal above to see the monthly amount needed, projected progress and whether you are on track.</p></div></div>
    </section>;
  }

  return <section className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-cyan-50/60 p-4 sm:p-5 shadow-sm">
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Goal Planning</p><h4 className="mt-1 text-lg font-bold text-slate-900">Goal Planner</h4><p className="mt-1 text-xs sm:text-sm text-slate-500">See how much each goal needs and whether your current contribution is likely to get you there.</p></div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 border border-indigo-100">PLANNING</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-400">Goals on track</p><p className="mt-1 text-lg font-bold text-slate-900">{onTrackCount} / {plans.length}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-400">Projected gap</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(totalGap)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-400">Planning assumption</p><p className="mt-1 text-lg font-bold text-slate-900">8% annual return</p></div>
      </div>

      <div className="space-y-3">
        {plans.map(item => <div key={item.goal.id} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0"><div className="flex items-center gap-2"><Target className="h-4 w-4 shrink-0 text-indigo-600" /><h5 className="font-bold text-slate-900 truncate">{item.goal.name}</h5><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.onTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.onTrack ? 'ON TRACK' : 'NEEDS ATTENTION'}</span></div><p className="mt-1 text-xs text-slate-500">Target {formatCurrency(item.target)} · {item.months > 0 ? `${item.months} months remaining` : 'target date reached'}</p></div>
            <div className="text-left sm:text-right"><p className="text-[11px] text-slate-400">Current / target</p><p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(item.current)} / {formatCurrency(item.target)}</p></div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.progress}%` }} /></div>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Current monthly</p><p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(item.monthly)}</p></div>
            <div className="rounded-lg bg-indigo-50 p-2.5"><p className="text-[10px] text-indigo-500">Required monthly*</p><p className="mt-0.5 text-sm font-bold text-indigo-700 tabular-nums">{formatCurrency(item.requiredMonthly)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Projected at 8%</p><p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(item.projected)}</p></div>
            <div className={`rounded-lg p-2.5 ${item.onTrack ? 'bg-emerald-50' : 'bg-amber-50'}`}><p className={`text-[10px] ${item.onTrack ? 'text-emerald-600' : 'text-amber-600'}`}>{item.onTrack ? 'Expected surplus' : 'Expected gap'}</p><p className={`mt-0.5 text-sm font-bold tabular-nums ${item.onTrack ? 'text-emerald-700' : 'text-amber-700'}`}>{item.onTrack ? formatCurrency(Math.max(0, item.projected - item.target)) : formatCurrency(item.projectedGap)}</p></div>
          </div>
          {!item.onTrack && <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p className="text-xs leading-5 text-amber-800">Consider increasing this goal's monthly contribution by about <strong>{formatCurrency(Math.max(0, item.requiredMonthly - item.monthly))}</strong> to cover the target without relying on higher returns.</p></div>}
        </div>)}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p className="text-xs leading-5 text-slate-600"><strong className="text-emerald-700">Planning only.</strong> AHVIQ does not move money or change your goal contributions automatically. The 8% return is an illustrative assumption, not a guarantee.</p></div>
      <p className="text-[10px] text-slate-400">*Required monthly is a simple target-gap calculation and does not assume investment returns.</p>
    </div>
  </section>;
};
