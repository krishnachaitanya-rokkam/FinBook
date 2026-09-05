import React from 'react';
import { IndianRupee, Wallet, TrendingDown, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface MetricCardsProps { totalIncome:number; totalSpent:number; totalBudget:number; transactionCount:number; }

export const MetricCards: React.FC<MetricCardsProps> = ({totalIncome,totalSpent,totalBudget,transactionCount}) => {
  const remaining = totalIncome - totalSpent;
  const budgetRemaining = totalBudget - totalSpent;
  const utilization = totalBudget > 0 ? Math.round(totalSpent/totalBudget*100) : 0;
  const cards = [
    {id:'metric-total-income',label:'Income',value:formatCurrency(totalIncome),meta:'Received in cycle',badge:totalIncome>0?'On track':'Add income',icon:IndianRupee,iconClass:'bg-emerald-50 text-emerald-600 border-emerald-100'},
    {id:'metric-total-spent',label:'Expenses',value:formatCurrency(totalSpent),meta:`${transactionCount} transaction${transactionCount===1?'':'s'}`,badge:totalBudget>0?`${utilization}% of budget`:'No budget',icon:TrendingDown,iconClass:'bg-indigo-50 text-indigo-600 border-indigo-100'},
    {id:'metric-total-budget',label:'Budget',value:formatCurrency(totalBudget),meta:'Monthly spending limit',badge:totalBudget>0?(budgetRemaining>=0?`${formatCurrency(budgetRemaining)} left`:'Exceeded'):'No budget',icon:Wallet,iconClass:'bg-sky-50 text-sky-600 border-sky-100'},
    {id:'metric-available',label:'Available',value:formatCurrency(remaining),meta:'Income less expenses',badge:remaining>=0?'Positive cash flow':'Negative cash flow',icon:PiggyBank,iconClass:remaining>=0?'bg-violet-50 text-violet-600 border-violet-100':'bg-rose-50 text-rose-600 border-rose-100',valueClass:remaining<0?'text-rose-600':'text-slate-900'}
  ];
  return <div id="metric-summary-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">{cards.map(card=>{const Icon=card.icon;return <div key={card.id} id={card.id} className="min-w-0 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"><div className="flex min-w-0 items-center justify-between gap-1.5"><span className="min-w-0 truncate text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span><span className={`flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border ${card.iconClass}`}><Icon className="h-3 w-3 sm:h-4 sm:w-4"/></span></div><div className={`mt-1.5 sm:mt-2 min-w-0 overflow-hidden text-[15px] xs:text-[18px] sm:text-xl lg:text-2xl font-bold tracking-tight font-display tabular-nums whitespace-nowrap ${card.valueClass||'text-slate-900'}`}>{card.value}</div><div className="mt-1.5 sm:mt-2 min-w-0"><span className="block truncate text-[9px] sm:text-[11px] text-slate-500">{card.meta}</span><span className="mt-1 inline-flex max-w-full rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] sm:text-[10px] font-semibold text-slate-600 tabular-nums">{card.badge}</span></div>{card.id==='metric-total-budget'&&totalBudget>0&&<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${utilization>100?'bg-rose-500':utilization>85?'bg-amber-500':'bg-indigo-500'}`} style={{width:`${Math.min(utilization,100)}%`}}/></div>}</div>})}</div>;
};