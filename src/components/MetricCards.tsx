import React from 'react';
import { IndianRupee, Wallet, TrendingDown, PiggyBank, HeartPulse, Percent, Gauge, Calculator } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MetricCardsProps { totalIncome:number; totalSpent:number; totalBudget:number; transactionCount:number; }

export const MetricCards: React.FC<MetricCardsProps> = ({totalIncome,totalSpent,totalBudget,transactionCount}) => {
  const remaining=totalIncome-totalSpent;
  const budgetRemaining=totalBudget-totalSpent;
  const utilization=totalBudget>0?Math.round(totalSpent/totalBudget*100):0;
  const savingsRate=totalIncome>0?Math.round(remaining/totalIncome*100):0;
  const avgTransaction=transactionCount>0?totalSpent/transactionCount:0;
  const budgetHeadroom=totalBudget>0?Math.max(0,100-utilization):0;
  const savingsScore=totalIncome>0?Math.max(0,Math.min(50,(savingsRate/30)*50)):0;
  const budgetScore=totalBudget<=0?0:utilization<=70?30:utilization<=100?30-((utilization-70)/30)*20:0;
  const cashFlowScore=remaining>0?20:remaining===0?10:0;
  const healthScore=totalIncome<=0?0:Math.max(0,Math.min(100,Math.round(savingsScore+budgetScore+cashFlowScore)));
  const healthLabel=healthScore>=80?'Strong':healthScore>=60?'Healthy':healthScore>=40?'Watch':'Needs attention';

  const card=(id:string,label:string,value:string,meta:string,badge:string,Icon:any,iconClass:string,valueClass='text-slate-900')=><div id={id} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)]"><div className="flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl border bg-slate-50 text-slate-600"> <Icon className="h-4 w-4"/></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">{badge}</span></div><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className={`mt-1 truncate text-xl font-extrabold tracking-tight tabular-nums ${valueClass}`}>{value}</p><p className="mt-1 text-[10px] text-slate-400">{meta}</p></div>;

  return <div className="space-y-4">
    <div id="metric-available" className={`relative overflow-hidden rounded-[22px] border p-5 sm:p-6 ${remaining>=0?'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-cyan-50':'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50'} shadow-[0_8px_30px_rgba(15,23,42,0.045)]`}>
      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-emerald-100/50 blur-2xl"/><div className="absolute bottom-0 right-20 h-20 w-48 rounded-full bg-cyan-100/40 blur-2xl"/>
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${remaining>=0?'border-emerald-100 bg-white text-emerald-600':'border-rose-100 bg-white text-rose-600'}`}><PiggyBank className="h-5 w-5"/></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Available to spend</p><p className="mt-0.5 text-[11px] text-slate-500">Income minus expenses for this cycle</p></div></div><p className={`mt-3 text-4xl font-extrabold tracking-[-0.04em] tabular-nums sm:text-5xl ${remaining<0?'text-rose-600':'text-slate-900'}`}>{formatCurrency(remaining)}</p><div className="mt-3 h-2 max-w-xl overflow-hidden rounded-full bg-slate-200/70"><div className={`h-full rounded-full ${remaining>=0?'bg-emerald-500':'bg-rose-500'}`} style={{width:`${Math.min(100,Math.max(0,totalIncome?remaining/totalIncome*100:0))}%`}}/></div></div><div className="sm:min-w-40 sm:text-right"><p className={`text-sm font-bold ${remaining>=0?'text-emerald-700':'text-rose-700'}`}>{remaining>=0?'Positive cash flow':'Attention needed'}</p>{totalIncome>0&&<p className="mt-1 text-xs font-semibold text-slate-500">{savingsRate}% of income retained</p>}<p className="mt-2 text-[10px] text-slate-400">{remaining>=0?'A healthy cushion for this cycle.':'Review spending before the cycle closes.'}</p></div></div>
    </div>
    <div id="metric-summary-grid" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{card('metric-total-income','Income',formatCurrency(totalIncome),'Received in cycle',totalIncome>0?'On track':'Add income',IndianRupee,'bg-emerald-50 text-emerald-600')}{card('metric-total-spent','Spent',formatCurrency(totalSpent),`${transactionCount} transaction${transactionCount===1?'':'s'}`,totalBudget>0?`${utilization}% of budget`:'No budget',TrendingDown,'bg-rose-50 text-rose-600')}{card('metric-total-budget','Budget',formatCurrency(totalBudget),'Spending limit',totalBudget>0?(budgetRemaining>=0?`${formatCurrency(budgetRemaining)} left`:'Exceeded'):'Set budget',Wallet,'bg-sky-50 text-sky-600')}{card('metric-savings-rate','Savings rate',`${savingsRate}%`,'Income retained',savingsRate>=20?'Great':'Improve',Percent,'bg-violet-50 text-violet-600')}</div>
    <div id="metric-insights-grid" className="grid grid-cols-1 gap-3 md:grid-cols-3">{card('metric-health-score','Health score',`${healthScore}/100`,'Savings + budget + cash flow',healthLabel,HeartPulse,'bg-amber-50 text-amber-600',healthScore>=70?'text-emerald-700':healthScore>=40?'text-amber-700':'text-rose-700')}{card('metric-budget-headroom','Budget headroom',totalBudget>0?`${budgetHeadroom}%`:'—','Unused budget',totalBudget>0?(budgetHeadroom>=20?'Comfortable':'Tight'):'Set budget',Gauge,'bg-blue-50 text-blue-600')}{card('metric-average-transaction','Avg. expense',formatCurrency(avgTransaction),'Average expense size',transactionCount>0?'This cycle':'No expenses',Calculator,'bg-slate-50 text-slate-600')}</div>
  </div>;
};