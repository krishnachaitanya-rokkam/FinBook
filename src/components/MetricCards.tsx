import React from 'react';
import { IndianRupee, Wallet, TrendingDown, PiggyBank, HeartPulse, Percent, Gauge, Calculator } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MetricCardsProps { totalIncome:number; totalSpent:number; totalBudget:number; transactionCount:number; }

export const MetricCards: React.FC<MetricCardsProps> = ({totalIncome,totalSpent,totalBudget,transactionCount}) => {
  const remaining = totalIncome - totalSpent;
  const budgetRemaining = totalBudget - totalSpent;
  const utilization = totalBudget > 0 ? Math.round(totalSpent/totalBudget*100) : 0;
  const savingsRate = totalIncome > 0 ? Math.round((remaining/totalIncome)*100) : 0;
  const avgTransaction = transactionCount > 0 ? totalSpent/transactionCount : 0;
  const budgetHeadroom = totalBudget > 0 ? Math.max(0,100-utilization) : 0;

  // A simple directional health score is useful as a quick signal, not as financial advice.
  const savingsScore = totalIncome > 0 ? Math.max(0, Math.min(50, (savingsRate / 30) * 50)) : 0;
  const budgetScore = totalBudget <= 0 ? 0 : utilization <= 70 ? 30 : utilization <= 100 ? 30 - ((utilization - 70) / 30) * 20 : 0;
  const cashFlowScore = remaining > 0 ? 20 : remaining === 0 ? 10 : 0;
  const healthScore = totalIncome <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(savingsScore + budgetScore + cashFlowScore)));
  const healthLabel = healthScore >= 80 ? 'Strong' : healthScore >= 60 ? 'Healthy' : healthScore >= 40 ? 'Watch' : 'Needs attention';

  const summaryCards = [
    {id:'metric-total-income',label:'Income',value:formatCurrency(totalIncome),meta:'Received in cycle',badge:totalIncome>0?'On track':'Add income',icon:IndianRupee,iconClass:'bg-emerald-50 text-emerald-600 border-emerald-100'},
    {id:'metric-total-spent',label:'Spent',value:formatCurrency(totalSpent),meta:`${transactionCount} transaction${transactionCount===1?'':'s'}`,badge:totalBudget>0?`${utilization}% of budget`:'No budget',icon:TrendingDown,iconClass:'bg-indigo-50 text-indigo-600 border-indigo-100'},
    {id:'metric-total-budget',label:'Budget',value:formatCurrency(totalBudget),meta:'Spending limit',badge:totalBudget>0?(budgetRemaining>=0?`${formatCurrency(budgetRemaining)} left`:'Exceeded'):'Set a budget',icon:Wallet,iconClass:'bg-sky-50 text-sky-600 border-sky-100'}
  ];

  const insights = [
    {id:'metric-health-score',label:'Health score',value:`${healthScore}/100`,meta:'Savings + budget + cash flow',badge:healthLabel,icon:HeartPulse,iconClass:healthScore>=70?'bg-emerald-50 text-emerald-600 border-emerald-100':healthScore>=40?'bg-amber-50 text-amber-600 border-amber-100':'bg-rose-50 text-rose-600 border-rose-100',valueClass:healthScore>=70?'text-emerald-700':healthScore>=40?'text-amber-700':'text-rose-700'},
    {id:'metric-savings-rate',label:'Savings rate',value:`${savingsRate}%`,meta:'Income retained',badge:savingsRate>=20?'Great':'Improve savings',icon:Percent,iconClass:'bg-violet-50 text-violet-600 border-violet-100'},
    {id:'metric-budget-headroom',label:'Budget headroom',value:totalBudget>0?`${budgetHeadroom}%`:'—',meta:'Unused budget',badge:totalBudget>0?(budgetHeadroom>=20?'Comfortable':'Tight'):'Set a budget',icon:Gauge,iconClass:'bg-sky-50 text-sky-600 border-sky-100'},
    {id:'metric-average-transaction',label:'Avg. expense',value:formatCurrency(avgTransaction),meta:'Average expense size',badge:transactionCount>0?'This cycle':'No expenses',icon:Calculator,iconClass:'bg-slate-100 text-slate-600 border-slate-200'}
  ];

  const renderSmallCard=(card:any)=><div key={card.id} id={card.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"><div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${card.iconClass}`}><card.icon className="h-3.5 w-3.5"/></span></div><div className={`mt-2 min-w-0 overflow-hidden text-lg font-bold tracking-tight font-display tabular-nums whitespace-nowrap ${card.valueClass||'text-slate-900'}`}>{card.value}</div><div className="mt-1 flex items-center justify-between gap-2"><span className="min-w-0 truncate text-[10px] text-slate-500">{card.meta}</span><span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">{card.badge}</span></div>{card.id==='metric-health-score'&&<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${healthScore>=70?'bg-emerald-500':healthScore>=40?'bg-amber-500':'bg-rose-500'}`} style={{width:`${healthScore}%`}}/></div>}</div>;

  return <div className="space-y-3 sm:space-y-4">
    <div id="metric-available" className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${remaining>=0?'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white':'border-rose-200 bg-gradient-to-br from-rose-50 to-white'}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${remaining>=0?'bg-white text-emerald-600 border-emerald-100':'bg-white text-rose-600 border-rose-100'}`}><PiggyBank className="h-5 w-5"/></span><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Available to spend</p><p className="text-[11px] text-slate-500">Income minus expenses for this cycle</p></div></div>
          <p className={`mt-3 text-3xl sm:text-4xl font-bold tracking-tight font-display tabular-nums ${remaining<0?'text-rose-600':'text-slate-900'}`}>{formatCurrency(remaining)}</p>
        </div>
        <div className="sm:text-right"><p className="text-xs font-semibold text-slate-500">{remaining>=0?'Positive cash flow':'You have spent more than income'}</p>{totalIncome>0&&<p className="mt-1 text-sm font-bold text-slate-700">{savingsRate}% retained</p>}</div>
      </div>
    </div>

    <div id="metric-summary-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">{summaryCards.map(renderSmallCard)}</div>
    <div id="metric-insights-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">{insights.map(renderSmallCard)}</div>
  </div>;
};