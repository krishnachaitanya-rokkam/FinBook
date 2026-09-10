import React, { useMemo } from 'react';
import { Landmark, Target, TrendingUp, WalletCards } from 'lucide-react';
import { PortfolioConfig, getEffectivePortfolioFields } from '../services/portfolioService';
import { formatCurrency } from '../utils/formatters';

interface Props { config: PortfolioConfig; }

const BarRow = ({ label, amount, total, icon: Icon, tone }: { label: string; amount: number; total: number; icon: React.ElementType; tone: string }) => {
  const share = total > 0 ? Math.min(100, Math.max(0, (amount / total) * 100)) : 0;
  return <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
      <div className="flex min-w-0 items-center gap-2"><Icon className={`h-4 w-4 shrink-0 ${tone}`} /><span className="truncate font-medium text-slate-700">{label}</span></div>
      <div className="shrink-0 text-right"><span className="font-bold text-slate-900 tabular-nums">{formatCurrency(amount)}</span><span className="ml-2 text-[10px] text-slate-400">{Math.round(share)}%</span></div>
    </div>
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone.replace('text-', 'bg-')}`} style={{ width: `${share}%` }} /></div>
  </div>;
};

export const WealthAllocation: React.FC<Props> = ({ config }) => {
  const fields = useMemo(() => getEffectivePortfolioFields(config), [config.fields, config.holdings]);
  const items = config.netWorthItems || [];
  const goals = config.goals || [];
  const portfolioTotal = useMemo(() => fields.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [fields]);
  const otherAssets = useMemo(() => items.filter(item => item.kind === 'asset').reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);
  const liabilities = useMemo(() => items.filter(item => item.kind === 'liability').reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);
  const totalAssets = portfolioTotal + otherAssets;
  const netWorth = totalAssets - liabilities;
  const goalLinkedInvestments = useMemo(() => Math.min(portfolioTotal, goals.filter(goal => goal.type === 'investment').reduce((sum, goal) => sum + Math.max(0, Number(goal.currentAmount) || 0), 0)), [goals, portfolioTotal]);
  const unallocatedInvestments = Math.max(0, portfolioTotal - goalLinkedInvestments);

  if (totalAssets <= 0 && liabilities <= 0) return null;

  return <section className="mt-5 rounded-2xl border border-indigo-100 bg-white p-4 sm:p-5 shadow-sm">
    <div className="flex flex-col gap-1"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Wealth allocation</p><h3 className="text-lg font-bold text-slate-900">Where your net worth sits</h3><p className="text-xs sm:text-sm text-slate-500">A simple breakdown of total assets, goal-linked investments and other wealth.</p></div>
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[11px] text-slate-500">Total assets</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(totalAssets)}</p></div>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"><p className="text-[11px] text-indigo-600">Goal-linked investments</p><p className="mt-1 text-lg font-bold text-indigo-700 tabular-nums">{formatCurrency(goalLinkedInvestments)}</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] text-slate-500">Net worth</p><p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(netWorth)}</p></div>
    </div>
    <div className="mt-5 space-y-4">
      <BarRow label="Goal-linked investments" amount={goalLinkedInvestments} total={totalAssets} icon={Target} tone="text-indigo-600" />
      <BarRow label="Other investments" amount={unallocatedInvestments} total={totalAssets} icon={TrendingUp} tone="text-cyan-600" />
      <BarRow label="Other assets" amount={otherAssets} total={totalAssets} icon={Landmark} tone="text-emerald-600" />
      {liabilities > 0 && <BarRow label="Liabilities" amount={liabilities} total={Math.max(totalAssets, liabilities)} icon={WalletCards} tone="text-rose-600" />}
    </div>
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5"><p className="text-[11px] leading-5 text-slate-500">Goal-linked investments are based on the current amounts recorded against investment goals. The allocation bars are mutually exclusive, so total assets are not double-counted.</p></div>
  </section>;
};
