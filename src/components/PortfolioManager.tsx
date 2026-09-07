import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PortfolioConfig } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';
import { PortfolioManager as PortfolioManagerCore } from './PortfolioManagerCore';

interface PortfolioManagerProps { config: PortfolioConfig; onSave: (config: PortfolioConfig) => Promise<void>; }

export const PortfolioManager: React.FC<PortfolioManagerProps> = ({ config, onSave }) => {
  const [forecastVisible, setForecastVisible] = useState(false);
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
    const check = () => setForecastVisible(document.body.innerText.includes('Net Worth Forecast'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setWhatIfMonthly(currentMonthly);
  }, [currentMonthly]);

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
    {forecastVisible && <section className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/60 to-cyan-50/60 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">What-if planning</p>
            <h4 className="mt-1 text-lg font-bold text-slate-900">What-If Simulator</h4>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">See what increasing your monthly investment could do to projected wealth. This is a simulation only and does not change your actual plan.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 border border-indigo-100">SIMULATION</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-400">Current monthly investment</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(currentMonthly)}</p></div>
          <label className="rounded-xl border border-indigo-200 bg-white p-3"><span className="text-[11px] font-semibold text-indigo-600">What-if monthly investment</span><input type="number" min="0" step="1000" value={whatIfMonthly} onChange={e => setWhatIfMonthly(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-bold tabular-nums outline-none focus:border-indigo-500" /></label>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-400">Monthly difference</p><p className={`mt-1 text-lg font-bold tabular-nums ${additionalMonthly >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{additionalMonthly >= 0 ? '+' : '−'}{formatCurrency(Math.abs(additionalMonthly))}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-semibold text-slate-500">Quick add</span>{[10000, 25000, 50000].map(increase => <button key={increase} type="button" onClick={() => setWhatIfMonthly(currentMonthly + increase)} className="rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">+{formatCurrency(increase)}</button>)}<button type="button" onClick={() => setWhatIfMonthly(currentMonthly)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Reset</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-500">Simulation period</span><select value={period} onChange={e => setPeriod(Number(e.target.value) as 1 | 3 | 5)} className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold"><option value={1}>1 Year</option><option value={3}>3 Years</option><option value={5}>5 Years</option></select></label>
          <div className="rounded-xl border border-slate-200 bg-white p-3"><span className="text-[11px] font-semibold text-slate-500">Expected annual return</span><div className="mt-1 flex gap-1 rounded-lg bg-slate-100 p-1">{([8, 10, 12] as const).map(value => <button key={value} type="button" onClick={() => setRate(value)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold ${rate === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{value}%</button>)}</div></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[11px] text-slate-400">Current projection</p><p className="mt-1 text-base font-bold text-slate-900 tabular-nums">{formatCurrency(currentProjection)}</p><p className="text-[10px] text-slate-400">{period}-year</p></div>
          <div className="rounded-xl bg-indigo-600 p-3"><p className="text-[11px] text-indigo-100">What-if projection</p><p className="mt-1 text-base font-bold text-white tabular-nums">{formatCurrency(whatIfProjection)}</p><p className="text-[10px] text-indigo-100">{period}-year</p></div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3"><p className="text-[11px] text-emerald-600">Additional projected wealth</p><p className="mt-1 text-base font-bold text-emerald-700 tabular-nums">{additionalWealth >= 0 ? '+' : '−'}{formatCurrency(Math.abs(additionalWealth))}</p><p className="text-[10px] text-emerald-600">vs current plan</p></div>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-white/80 px-3 py-3 flex items-start gap-2"><ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600"/><p className="text-xs leading-5 text-slate-600">{additionalMonthly === 0 ? 'Increase the monthly investment above to see the potential impact of saving more.' : additionalMonthly > 0 ? `Increasing your monthly investment by ${formatCurrency(additionalMonthly)} could add ${formatCurrency(Math.max(0, additionalWealth))} to your projected net worth over ${period} year${period > 1 ? 's' : ''}, using the selected return assumption.` : `This scenario invests ${formatCurrency(Math.abs(additionalMonthly))} less per month and shows the potential difference under the selected assumptions.`}</p></div>
      </div>
    </section>}
  </>;
};
