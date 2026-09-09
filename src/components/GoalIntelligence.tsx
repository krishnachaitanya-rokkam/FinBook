import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Filter, Lightbulb, Target, TrendingUp, WalletCards } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

type Goal = { id:string; name:string; targetAmount:number; currentAmount?:number; targetDate:string; monthlyContribution:number; type?:'savings'|'investment'; scope?:'personal'|'family'; };
type Props = { goals: Goal[] };

const monthsUntil = (date:string) => {
  const target = new Date(`${date}T23:59:59`);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime()-Date.now())/(1000*60*60*24*30.4375)));
};

const project = (goal:Goal, months:number) => {
  let value=Math.max(0,Number(goal.currentAmount)||0);
  const monthly=Math.max(0,Number(goal.monthlyContribution)||0);
  if(goal.type==='investment'){
    const r=Math.pow(1.08,1/12)-1;
    for(let i=0;i<months;i++) value=value*(1+r)+monthly;
  } else value += monthly*months;
  return value;
};

export const GoalIntelligence:React.FC<Props>=({goals})=>{
  const [filter,setFilter]=useState<'all'|'savings'|'investment'|'family'>('all');
  const plans=useMemo(()=>goals.map(goal=>{
    const target=Math.max(0,Number(goal.targetAmount)||0);
    const current=Math.max(0,Number(goal.currentAmount)||0);
    const months=monthsUntil(goal.targetDate);
    const gap=Math.max(0,target-current);
    const required=months?Math.ceil(gap/months/100)*100:gap;
    const projected=project(goal,months);
    const projectedGap=Math.max(0,target-projected);
    const onTrack=gap===0||projected>=target;
    const extra=Math.max(0,required-(Number(goal.monthlyContribution)||0));
    return {goal,target,current,months,gap,required,projected,projectedGap,onTrack,extra,progress:target?Math.min(100,Math.round(current/target*100)):0};
  }),[goals]);
  const visible=plans.filter(p=>filter==='all'||(filter==='family'?p.goal.scope==='family':p.goal.type===filter));
  const onTrack=visible.filter(p=>p.onTrack).length;
  const gap=visible.reduce((s,p)=>s+p.projectedGap,0);
  const monthly=visible.reduce((s,p)=>s+p.extra,0);
  const planned=visible.reduce((s,p)=>s+(Number(p.goal.monthlyContribution)||0),0);
  const requiredTotal=visible.reduce((s,p)=>s+p.required,0);
  const recommendation=visible.filter(p=>!p.onTrack).sort((a,b)=>b.projectedGap-a.projectedGap)[0];
  const actionGoals=visible.filter(p=>p.required>0).sort((a,b)=>{
    if(a.onTrack!==b.onTrack) return a.onTrack?1:-1;
    return b.extra-a.extra;
  });

  if(!goals.length)return null;
  return <section className="mt-5 rounded-2xl border border-indigo-100 bg-white p-4 sm:p-5 shadow-sm">
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Goal intelligence</p><h3 className="mt-1 text-lg font-bold text-slate-900">Your goals, with a plan</h3><p className="mt-1 text-xs sm:text-sm text-slate-500">See what needs attention and how much to allocate to stay on schedule.</p></div><Target className="h-5 w-5 text-indigo-500"/></div>
      <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Filter className="h-3.5 w-3.5"/> View</span>{(['all','savings','investment','family'] as const).map(v=><button key={v} type="button" onClick={()=>setFilter(v)} className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${filter===v?'bg-slate-900 text-white':'border border-slate-200 bg-white text-slate-600'}`}>{v}</button>)}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Goals on track</p><p className="mt-1 text-lg font-bold">{onTrack}/{visible.length}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Projected gap</p><p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(gap)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-400">Extra needed / month</p><p className="mt-1 text-lg font-bold tabular-nums">{formatCurrency(monthly)}</p></div><div className="rounded-xl bg-indigo-50 p-3"><p className="text-[10px] text-indigo-500">Active goals</p><p className="mt-1 text-lg font-bold text-indigo-700">{visible.length}</p></div></div>
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-indigo-50/60 p-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-indigo-100 p-2"><WalletCards className="h-5 w-5 text-indigo-600"/></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">This month</p><h4 className="mt-0.5 text-base font-bold text-slate-900">Your goal allocation plan</h4><p className="mt-1 text-xs leading-5 text-slate-500">Based on target dates and your current monthly plans, AHVIQ recommends allocating <strong>{formatCurrency(requiredTotal)}</strong> across these goals this month.</p></div></div><div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2"><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[10px] text-slate-400">Recommended / month</p><p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(requiredTotal)}</p></div><div className="rounded-xl bg-white border border-slate-200 p-3"><p className="text-[10px] text-slate-400">Currently planned</p><p className="mt-1 text-base font-bold tabular-nums">{formatCurrency(planned)}</p></div><div className={`rounded-xl border p-3 ${monthly>0?'bg-amber-50 border-amber-100':'bg-emerald-50 border-emerald-100'}`}><p className={`text-[10px] ${monthly>0?'text-amber-600':'text-emerald-600'}`}>{monthly>0?'Additional allocation needed':'Plan is fully funded'}</p><p className={`mt-1 text-base font-bold tabular-nums ${monthly>0?'text-amber-800':'text-emerald-700'}`}>{formatCurrency(monthly)}</p></div></div>{actionGoals.length>0&&<div className="mt-3 space-y-2">{actionGoals.map(p=><div key={`action-${p.goal.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2.5"><div className="min-w-0"><p className="text-xs font-bold truncate">{p.goal.name}</p><p className="text-[10px] text-slate-500">Required {formatCurrency(p.required)} · Plan {formatCurrency(Number(p.goal.monthlyContribution)||0)}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${p.extra>0?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}>{p.extra>0?`+${formatCurrency(p.extra)}`:'Covered'}</span></div>)}</div>}<p className="mt-3 text-[10px] leading-4 text-slate-400">This is a planning recommendation based only on the goals stored in AHVIQ. It does not move money or change your actual investments.</p></div>
      {recommendation&&<div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"/><p className="text-xs leading-5 text-amber-900"><strong>Priority:</strong> Increase <strong>{recommendation.goal.name}</strong> by about <strong>{formatCurrency(recommendation.extra)}</strong> per month. It currently has the largest projected shortfall.</p></div>}
      <div className="space-y-3">{visible.map(p=><div key={`${p.goal.scope||'personal'}-${p.goal.id}`} className="rounded-xl border border-slate-200 p-3 sm:p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Target className="h-4 w-4 text-indigo-500"/><p className="font-bold truncate">{p.goal.name}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.goal.type==='investment'?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}>{p.goal.type==='investment'?'INVESTMENT':'SAVINGS'}</span>{p.goal.scope==='family'&&<span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">FAMILY</span>}</div><p className="mt-1 text-xs text-slate-500">{p.months} months remaining · Target {formatCurrency(p.target)}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${p.onTrack?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{p.onTrack?<CheckCircle2 className="h-3.5 w-3.5"/>:<AlertTriangle className="h-3.5 w-3.5"/>}{p.onTrack?'ON TRACK':'NEEDS ATTENTION'}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${p.progress}%`}}/></div><div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2"><div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Current</p><p className="text-sm font-bold tabular-nums">{formatCurrency(p.current)}</p></div><div className="rounded-lg bg-indigo-50 p-2.5"><p className="text-[10px] text-indigo-500">Required / month</p><p className="text-sm font-bold text-indigo-700 tabular-nums">{formatCurrency(p.required)}</p></div><div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Plan</p><p className="text-sm font-bold tabular-nums">{formatCurrency(Number(p.goal.monthlyContribution)||0)}</p></div><div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Projected</p><p className="text-sm font-bold tabular-nums">{formatCurrency(p.projected)}</p></div></div></div>)}</div>
      <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"/><p className="text-xs leading-5 text-slate-600">Savings goals use contributions only. Investment goals use an illustrative 8% annual return. These are planning estimates, not guarantees.</p></div>
    </div>
  </section>;
};
