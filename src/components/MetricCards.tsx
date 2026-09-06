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
  const healthScore = totalIncome <= 0 ? 0 : Math.max(0,Math.min(100, Math.round(
    (savingsRate >= 20 ? 40 : savingsRate > 0 ? 25 : 5) +
    (totalBudget <= 0 ? 10 : utilization <= 70 ? 35 : utilization <= 90 ? 25 : utilization <= 100 ? 15 : 0) +
    (remaining >= 0 ? 25 : 0)
  )));
  const healthLabel = healthScore >= 80 ? 'Strong' : healthScore >= 60 ? 'Healthy' : healthScore >= 40 ? 'Watch' : 'Needs attention';
  const cards = [
    {id:'metric-total-income',label:'Income',value:formatCurrency(totalIncome),meta:'Received in cycle',badge:totalIncome>0?'On track':'Add income',icon:IndianRupee,iconClass:'bg-emerald-50 text-emerald-600 border-emerald-100'},
    {id:'metric-total-spent',label:'Expenses',value:formatCurrency(totalSpent),meta:`${transactionCount} transaction${transactionCount===1?'':'s'}`,badge:totalBudget>0?`${utilization}% of budget`:'No budget',icon:TrendingDown,iconClass:'bg-indigo-50 text-indigo-600 border-indigo-100'},
    {id:'metric-total-budget',label:'Budget',value:formatCurrency(totalBudget),meta:'Monthly spending limit',badge:totalBudget>0?(budgetRemaining>=0?`${formatCurrency(budgetRemaining)} left`:'Exceeded'):'No budget',icon:Wallet,iconClass:'bg-sky-50 text-sky-600 border-sky-100'},
    {id:'metric-available',label:'Available',value:formatCurrency(remaining),meta:'Income less expenses',badge:remaining>=0?'Positive cash flow':'Negative cash flow',icon:PiggyBank,iconClass:remaining>=0?'bg-violet-50 text-violet-600 border-violet-100':'bg-rose-50 text-rose-600 border-rose-100',valueClass:remaining<0?'text-rose-600':'text-slate-900'}
  ];
  const insights = [
    {id:'metric-health-score',label:'Financial Health',value:`${healthScore}/100`,meta:'Based on cash flow & budget',badge:healthLabel,icon:HeartPulse,iconClass:healthScore>=70?'bg-emerald-50 text-emerald-600 border-emerald-100':healthScore>=40?'bg-amber-50 text-amber-600 border-amber-100':'bg-rose-50 text-rose-600 border-rose-100',valueClass:healthScore>=70?'text-emerald-700':healthScore>=40?'text-amber-700':'text-rose-700'},
    {id:'metric-savings-rate',label:'Savings Rate',value:`${savingsRate}%`,meta:'Income retained after expenses',badge:savingsRate>=20?'Great':'Improve savings',icon:Percent,iconClass:'bg-violet-50 text-violet-600 border-violet-100'},
    {id:'metric-budget-headroom',label:'Budget Headroom',value:totalBudget>0?`${budgetHeadroom}%`:'—',meta:'Unused spending capacity',badge:totalBudget>0?(budgetHeadroom>=20?'Comfortable':'Tight'):'Set a budget',icon:Gauge,iconClass:'bg-sky-50 text-sky-600 border-sky-100'},
    {id:'metric-average-transaction',label:'Avg. Transaction',value:formatCurrency(avgTransaction),meta:'Average expense size',badge:transactionCount>0?'This cycle':'No transactions',icon:Calculator,iconClass:'bg-slate-100 text-slate-600 border-slate-200'}
  ];
  const renderCard=(card:any)=><div key={card.id} id={card.id} className="min-w-0 overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"><div className="flex min-w-0 items-center justify-between gap-1.5"><span className="min-w-0 truncate text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span><span className={`flex h-6 w-6 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border ${card.iconClass}`}><card.icon className="h-3 w-3 sm:h-4 sm:w-4"/></span></div><div className={`mt-1.5 sm:mt-2 min-w-0 overflow-hidden text-[15px] xs:text-[18px] sm:text-xl lg:text-2xl font-bold tracking-tight font-display tabular-nums whitespace-nowrap ${card.valueClass||'text-slate-900'}`}>{card.value}</div><div className="mt-1.5 sm:mt-2 min-w-0"><span className="block truncate text-[9px] sm:text-[11px] text-slate-500">{card.meta}</span><span className="mt-1 inline-flex max-w-full rounded-md bg-slate-100 px-1.5 py-0.5 text-[8px] sm:text-[10px] font-semibold text-slate-600 tabular-nums">{card.badge}</span></div>{card.id==='metric-total-budget'&&totalBudget>0&&<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${utilization>100?'bg-rose-500':utilization>85?'bg-amber-500':'bg-indigo-500'}`} style={{width:`${Math.min(utilization,100)}%`}}/></div>}{card.id==='metric-health-score'&&<div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${healthScore>=70?'bg-emerald-500':healthScore>=40?'bg-amber-500':'bg-rose-500'}`} style={{width:`${healthScore}%`}}/></div>}</div>;
  return <div className="space-y-2 sm:space-y-3"><div id="metric-summary-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">{cards.map(renderCard)}</div><div id="metric-insights-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">{insights.map(renderCard)}</div></div>;
};