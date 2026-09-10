import React, { useEffect, useMemo, useState } from 'react';
import { Plus, ShieldCheck, X } from 'lucide-react';
import { FinancialGoal, PortfolioConfig } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';
import { PortfolioManager as PortfolioManagerCore } from './PortfolioManagerCore';
import { GoalPlanner } from './GoalPlanner';
import { GoalPlanningCards } from './GoalPlanningCards';
import { FamilyGoalContribution } from './FamilyGoalContribution';
import { GoalIntelligence } from './GoalIntelligence';
import { WealthAllocation } from './WealthAllocation';
import { InvestmentHoldingsAuto } from './InvestmentHoldingsAuto';

interface PortfolioManagerProps { config: PortfolioConfig; onSave: (config: PortfolioConfig) => Promise<void>; }

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({ config, onSave }) => {
  const [forecastVisible, setForecastVisible] = useState(false);
  const [goalsVisible, setGoalsVisible] = useState(false);
  const [netWorthVisible, setNetWorthVisible] = useState(false);
  const [portfolioVisible, setPortfolioVisible] = useState(false);
  const [goalView, setGoalView] = useState<'personal' | 'family'>('personal');
  const [createGoalOpen, setCreateGoalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [createGoalDraft, setCreateGoalDraft] = useState({ name: '', targetAmount: '', currentAmount: '', targetDate: '', monthlyContribution: '', type: 'savings' as 'savings' | 'investment', expectedAnnualReturn: '8' });
  const [period, setPeriod] = useState<1 | 3 | 5>(5);
  const [rate, setRate] = useState<8 | 10 | 12>(10);
  const goals = config.goals || [];
  const fields = config.fields || [];
  const netWorthItems = config.netWorthItems || [];
  const portfolioTotal = useMemo(() => fields.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [fields]);
  const extraAssets = useMemo(() => netWorthItems.filter(item => item.kind === 'asset').reduce((sum, item) => sum + item.amount, 0), [netWorthItems]);
  const liabilities = useMemo(() => netWorthItems.filter(item => item.kind === 'liability').reduce((sum, item) => sum + item.amount, 0), [netWorthItems]);
  const netWorth = portfolioTotal + extraAssets - liabilities;
  const currentMonthly = useMemo(() => goals.reduce((sum, goal) => sum + Math.max(0, Number(goal.monthlyContribution) || 0), 0), [goals]);
  const [whatIfMonthly, setWhatIfMonthly] = useState(currentMonthly);

  useEffect(() => {
    const check = () => {
      const activePortfolio = Array.from(document.querySelectorAll('button')).filter(button => button.textContent?.trim() === 'Portfolio' && button.className.includes('bg-slate-900')).pop();
      const activeButton = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Goals' && button.className.includes('bg-slate-900'));
      const activeForecast = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Forecast' && button.className.includes('bg-slate-900'));
      const activeNetWorth = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Net Worth' && button.className.includes('bg-slate-900'));
      setPortfolioVisible(Boolean(activePortfolio));
      setGoalsVisible(Boolean(activeButton));
      setForecastVisible(Boolean(activeForecast));
      setNetWorthVisible(Boolean(activeNetWorth));
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setWhatIfMonthly(currentMonthly); }, [currentMonthly]);

  const resetGoalEditor = () => {
    setCreateGoalDraft({ name: '', targetAmount: '', currentAmount: '', targetDate: '', monthlyContribution: '', type: 'savings', expectedAnnualReturn: '8' });
    setEditingGoalId(null);
  };

  const openCreateGoal = () => { resetGoalEditor(); setCreateGoalOpen(true); };

  const openEditGoal = (goal: FinancialGoal) => {
    setEditingGoalId(goal.id);
    setCreateGoalDraft({ name: goal.name, targetAmount: String(goal.targetAmount), currentAmount: String(goal.currentAmount), targetDate: goal.targetDate, monthlyContribution: String(goal.monthlyContribution), type: goal.type || 'savings', expectedAnnualReturn: String(goal.expectedAnnualReturn ?? (goal.type === 'investment' ? 8 : 0)) });
    setCreateGoalOpen(true);
  };

  const removeGoal = async (id: string) => {
    const goal = goals.find(item => item.id === id);
    if (!goal || !window.confirm(`Delete the ${goal.name} goal?`)) return;
    await onSave({ ...config, goals: goals.filter(item => item.id !== id) });
  };

  const saveCreatedGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = createGoalDraft.name.trim();
    const targetAmount = Number(createGoalDraft.targetAmount);
    const currentAmount = Number(createGoalDraft.currentAmount || 0);
    const monthlyContribution = Number(createGoalDraft.monthlyContribution || 0);
    const expectedAnnualReturn = createGoalDraft.type === 'investment' ? Math.min(50, Math.max(0, Number(createGoalDraft.expectedAnnualReturn || 0))) : 0;
    if (!name || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(currentAmount) || currentAmount < 0 || !createGoalDraft.targetDate || !Number.isFinite(monthlyContribution) || monthlyContribution < 0 || !Number.isFinite(expectedAnnualReturn)) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const goal: FinancialGoal = { id: editingGoalId || `goal-${slug || 'item'}-${Date.now()}`, name, targetAmount, currentAmount, targetDate: createGoalDraft.targetDate, monthlyContribution, type: createGoalDraft.type, scope: 'personal', expectedAnnualReturn };
    const nextGoals = editingGoalId ? goals.map(existing => existing.id === editingGoalId ? goal : existing) : [...goals, goal];
    await onSave({ ...config, goals: nextGoals });
    resetGoalEditor();
    setCreateGoalOpen(false);
  };

  const syncGoalReturn = async (annualReturn: number) => {
    const nextGoals = goals.map(goal => goal.type === 'investment' ? { ...goal, expectedAnnualReturn: annualReturn } : goal);
    await onSave({ ...config, goals: nextGoals });
  };

  const project = (monthlyContribution: number) => {
    const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
    const months = period * 12;
    let investments = portfolioTotal;
    for (let i = 0; i < months; i += 1) investments = investments * (1 + monthlyRate) + monthlyContribution;
    return (netWorth - portfolioTotal) + investments;
  };
  const currentProjection = project(currentMonthly);
  const whatIfProjection = project(whatIfMonthly);
  const additionalWealth = whatIfProjection - currentProjection;
  const additionalMonthly = whatIfMonthly - currentMonthly;

  return <>
    <PortfolioManagerCore config={config} onSave={onSave} />
    {portfolioVisible && <InvestmentHoldingsAuto config={config} onSave={onSave} />}
    {netWorthVisible && <WealthAllocation config={config} />}
    {goalsVisible && <>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex w-full gap-1 rounded-xl bg-slate-50 p-1">
          <button type="button" onClick={() => setGoalView('personal')} className={`flex-1 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-bold transition ${goalView === 'personal' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>Personal Goals</button>
          <button type="button" onClick={() => setGoalView('family')} className={`flex-1 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-bold transition ${goalView === 'family' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>Family Goals</button>
        </div>
      </section>
      {goalView === 'personal' && <>
        <section className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Personal Goals</p><h3 className="mt-1 text-lg font-bold text-slate-900">Create a goal</h3><p className="mt-1 text-xs sm:text-sm text-slate-500">Add a new personal savings or investment goal and include it in your planning.</p></div>
            <button type="button" onClick={openCreateGoal} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" /> Create Goal</button>
          </div>
        </section>
        <GoalPlanningCards goals={goals} onEditGoal={openEditGoal} onDeleteGoal={removeGoal} />
        <GoalPlanner goals={goals} onReturnChange={syncGoalReturn} />
        <GoalIntelligence goals={goals.map(goal => ({ ...goal, scope: 'personal' as const }))} />
      </>}
      {goalView === 'family' && <>
        <section className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-cyan-50/50 p-4 sm:p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Family Goals</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">Shared household goals</h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">View and contribute to goals shared with your family. Goal creation and detailed household planning remain available in the Family section.</p>
        </section>
        <FamilyGoalContribution />
      </>}
    </>}
    {createGoalOpen && <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 p-0 sm:p-4"><div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{editingGoalId ? 'Edit personal goal' : 'Create personal goal'}</h3><button type="button" onClick={() => { setCreateGoalOpen(false); resetGoalEditor(); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={saveCreatedGoal} className="mt-5 space-y-4"><label className="block"><span className="text-xs font-semibold text-slate-600">Goal name</span><input required value={createGoalDraft.name} onChange={e => setCreateGoalDraft(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Emergency fund" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="text-xs font-semibold text-slate-600">Target amount</span><input required type="number" min="1" value={createGoalDraft.targetAmount} onChange={e => setCreateGoalDraft(c => ({ ...c, targetAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block"><span className="text-xs font-semibold text-slate-600">Current amount</span><input type="number" min="0" value={createGoalDraft.currentAmount} onChange={e => setCreateGoalDraft(c => ({ ...c, currentAmount: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label></div><div className="grid grid-cols-2 gap-3"><label className="block"><span className="text-xs font-semibold text-slate-600">Target date</span><input required type="date" value={createGoalDraft.targetDate} onChange={e => setCreateGoalDraft(c => ({ ...c, targetDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="block"><span className="text-xs font-semibold text-slate-600">Monthly contribution</span><input type="number" min="0" value={createGoalDraft.monthlyContribution} onChange={e => setCreateGoalDraft(c => ({ ...c, monthlyContribution: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label></div><div><span className="text-xs font-semibold text-slate-600">Goal type</span><div className="mt-1 grid grid-cols-2 gap-2"><button type="button" onClick={() => setCreateGoalDraft(c => ({ ...c, type: 'savings', expectedAnnualReturn: '0' }))} className={`rounded-xl px-3 py-2 text-sm font-semibold ${createGoalDraft.type === 'savings' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Savings goal</button><button type="button" onClick={() => setCreateGoalDraft(c => ({ ...c, type: 'investment', expectedAnnualReturn: c.expectedAnnualReturn === '0' ? '8' : c.expectedAnnualReturn || '8' }))} className={`rounded-xl px-3 py-2 text-sm font-semibold ${createGoalDraft.type === 'investment' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Investment goal</button></div></div>{createGoalDraft.type === 'investment' && <label className="block rounded-xl border border-violet-100 bg-violet-50/60 p-3"><span className="text-xs font-semibold text-slate-600">Expected annual return (%)</span><input type="number" min="0" step="0.1" value={createGoalDraft.expectedAnnualReturn} onChange={e => setCreateGoalDraft(c => ({ ...c, expectedAnnualReturn: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><p className="mt-1 text-[11px] text-slate-500">Planning assumption used for investment goal projection.</p></label>}<div className="flex justify-end gap-2"><button type="button" onClick={() => { setCreateGoalOpen(false); resetGoalEditor(); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">{editingGoalId ? 'Save changes' : 'Save goal'}</button></div></form></div></div>}
    {forecastVisible && <section className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-cyan-50/60 p-4 sm:p-5 shadow-sm"><div className="flex flex-col gap-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">What-if planning</p><h4 className="mt-1 text-lg font-bold text-slate-900">What-If Simulator</h4><p className="mt-1 text-xs sm:text-sm text-slate-500">See what increasing your monthly investment could do to projected wealth. This is a simulation only and does not change your actual plan.</p></div><span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 border border-indigo-100">SIMULATION</span></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-3"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-400">Current monthly investment</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(currentMonthly)}</p></div><label className="rounded-xl border border-indigo-200 bg-white p-3"><span className="text-[11px] font-semibold text-indigo-600">What-if monthly investment</span><input type="number" min="0" step="1000" value={whatIfMonthly} onChange={e => setWhatIfMonthly(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-bold tabular-nums outline-none focus:border-indigo-500" /></label><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-400">Monthly difference</p><p className={`mt-1 text-lg font-bold tabular-nums ${additionalMonthly >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{additionalMonthly >= 0 ? '+' : '−'}{formatCurrency(Math.abs(additionalMonthly))}</p></div></div><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-slate-500">Quick add</span>{[10000,25000,50000].map(increase=><button key={increase} type="button" onClick={()=>setWhatIfMonthly(currentMonthly+increase)} className="rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700">+{formatCurrency(increase)}</button>)}<button type="button" onClick={()=>setWhatIfMonthly(currentMonthly)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500">Reset</button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-500">Simulation period</span><select value={period} onChange={e=>setPeriod(Number(e.target.value) as 1|3|5)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold"><option value={1}>1 Year</option><option value={3}>3 Years</option><option value={5}>5 Years</option></select></label><div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-500">Expected annual return</span><div className="mt-1 flex gap-1 rounded-lg bg-slate-100 p-1">{([8,10,12] as const).map(value=><button key={value} type="button" onClick={()=>setRate(value)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold ${rate===value?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>{value}%</button>)}</div></div></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[11px] text-slate-400">Current projection</p><p className="mt-1 text-base font-bold text-slate-900 tabular-nums">{formatCurrency(currentProjection)}</p><p className="text-[10px] text-slate-400">{period}-year</p></div><div className="rounded-xl bg-indigo-600 p-3"><p className="text-[11px] text-indigo-100">What-if projection</p><p className="mt-1 text-base font-bold text-white tabular-nums">{formatCurrency(whatIfProjection)}</p><p className="text-[10px] text-indigo-100">{period}-year</p></div><div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p className="text-[11px] text-emerald-600">Additional projected wealth</p><p className="mt-1 text-base font-bold text-emerald-700 tabular-nums">{additionalWealth>=0?'+':'−'}{formatCurrency(Math.abs(additionalWealth))}</p><p className="text-[10px] text-emerald-600">vs current plan</p></div></div><div className="rounded-xl border border-indigo-100 bg-white/80 px-3 py-3 flex items-start gap-2"><ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600"/><p className="text-xs leading-5 text-slate-600">{additionalMonthly===0?'Increase the monthly investment above to see the potential impact of saving more.':additionalMonthly>0?`Increasing your monthly investment by ${formatCurrency(additionalMonthly)} could add ${formatCurrency(Math.max(0,additionalWealth))} to your projected net worth over ${period} year${period>1?'s':''}, using the selected return assumption.`:`This scenario invests ${formatCurrency(Math.abs(additionalMonthly))} less per month and shows the potential difference under the selected assumptions.`}</p></div></div></section>}
  </>;
};
