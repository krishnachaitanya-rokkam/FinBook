import { useEffect, useMemo, useState } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Sparkles, X, MessageCircle, PiggyBank } from 'lucide-react';
import { Expense, Income } from '../types';
import { CATEGORY_MAP } from '../data/categories';
import { subscribeToUserData } from '../services/firestoreData';
import { firebaseAuth } from '../services/firebase';

const money=(n:number)=>`₹${Math.round(n).toLocaleString('en-IN')}`;
const monthKey=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const previousMonth=(key:string)=>{const [y,m]=key.split('-').map(Number);const d=new Date(y,m-2,1);return monthKey(d)};
const monthName=(key:string)=>{const [y,m]=key.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})};
const pct=(n:number)=>`${Math.round(n)}%`;

export function IntelligencePage({onClose}:{onClose:()=>void}){
  const uid=firebaseAuth.currentUser?.uid;
  const [expenses,setExpenses]=useState<Expense[]>([]);
  const [incomes,setIncomes]=useState<Income[]>([]);
  const [question,setQuestion]=useState('');
  const [answer,setAnswer]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!uid){setLoading(false);return;}
    return subscribeToUserData(uid,data=>{setExpenses(data.expenses);setIncomes(data.incomes);setLoading(false)},()=>setLoading(false));
  },[uid]);

  const current=monthKey(new Date());
  const prev=previousMonth(current);
  const currentExpenses=useMemo(()=>expenses.filter(e=>e.date.startsWith(current)),[expenses,current]);
  const prevExpenses=useMemo(()=>expenses.filter(e=>e.date.startsWith(prev)),[expenses,prev]);
  const currentIncome=useMemo(()=>incomes.filter(i=>i.date.startsWith(current)).reduce((s,i)=>s+i.amount,0),[incomes,current]);
  const prevIncome=useMemo(()=>incomes.filter(i=>i.date.startsWith(prev)).reduce((s,i)=>s+i.amount,0),[incomes,prev]);
  const spent=currentExpenses.reduce((s,e)=>s+e.amount,0);
  const prevSpent=prevExpenses.reduce((s,e)=>s+e.amount,0);
  const savings=currentIncome-spent;
  const savingsRate=currentIncome?savings/currentIncome*100:0;

  const categoryRows=useMemo(()=>{
    const map=new Map<string,number>();
    currentExpenses.forEach(e=>map.set(e.categoryId,(map.get(e.categoryId)||0)+e.amount));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  },[currentExpenses]);

  const insights=useMemo(()=>{
    const list:string[]=[];
    if(!currentIncome && spent>0) list.push(`You have ${money(spent)} of expenses recorded this month but no income recorded yet.`);
    if(currentIncome && savingsRate<20) list.push(`Your savings rate is ${pct(savingsRate)} this month. Your spending is consuming most of recorded income.`);
    if(currentIncome && savingsRate>=30) list.push(`Strong month: you're retaining ${pct(savingsRate)} of recorded income after expenses.`);
    if(prevSpent>0){const change=(spent-prevSpent)/prevSpent*100;if(change>=15)list.push(`Spending is ${pct(Math.abs(change))} higher than ${monthName(prev)}.`);else if(change<=-15)list.push(`Spending is ${pct(Math.abs(change))} lower than ${monthName(prev)}.`);}
    if(categoryRows[0]){const [id,amount]=categoryRows[0];list.push(`${CATEGORY_MAP.get(id as any)?.name||id} is your largest spending category at ${money(amount)}.`);}
    const large=currentExpenses.filter(e=>e.amount>Math.max(5000,spent*.15)).sort((a,b)=>b.amount-a.amount)[0];
    if(large)list.push(`${large.title} is a notable transaction at ${money(large.amount)}.`);
    return list.slice(0,4);
  },[currentIncome,spent,savingsRate,prevSpent,categoryRows,currentExpenses,prev]);

  const ask=()=>{
    const q=question.trim().toLowerCase(); if(!q)return;
    if(/where|category|spend.*most|most.*spend/.test(q)){const top=categoryRows[0];setAnswer(top?`Your highest spending category this month is ${CATEGORY_MAP.get(top[0] as any)?.name||top[0]} at ${money(top[1])}.`:'There is not enough expense data for this month.');return;}
    if(/save|saving/.test(q)){setAnswer(currentIncome?`You have recorded ${money(currentIncome)} income and ${money(spent)} expenses this month, leaving ${money(savings)} (${pct(savingsRate)}) before any unrecorded spending.`:`No income is recorded for ${monthName(current)} yet.`);return;}
    if(/last month|previous month/.test(q)){setAnswer(`${monthName(prev)}: ${money(prevSpent)} spent and ${money(prevIncome)} income recorded.`);return;}
    if(/income|earn/.test(q)){setAnswer(`Recorded income for ${monthName(current)} is ${money(currentIncome)}.`);return;}
    if(/expense|spent|spending/.test(q)){setAnswer(`Recorded spending for ${monthName(current)} is ${money(spent)} across ${currentExpenses.length} transactions.`);return;}
    setAnswer(`I can answer questions about spending, income, savings, categories and month-over-month changes using your FinBook data.`);
  };

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-50">
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Brain className="h-5 w-5"/></div><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">FinBook Phase 2</p><h1 className="text-xl font-bold">Intelligence</h1></div></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-5 w-5"/></button></div></header>
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      {loading?<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Analyzing your FinBook data…</div>:<>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<TrendingDown/>} label="This month spending" value={money(spent)} sub={`${currentExpenses.length} transactions`}/>
        <Metric icon={<TrendingUp/>} label="Recorded income" value={money(currentIncome)} sub={monthName(current)}/>
        <Metric icon={<PiggyBank/>} label="Available after expenses" value={money(savings)} sub={currentIncome?pct(savingsRate)+' savings rate':'Add income to calculate'}/>
        <Metric icon={<Sparkles/>} label="vs last month" value={prevSpent?`${spent>=prevSpent?'+':''}${pct((spent-prevSpent)/prevSpent*100)}`:'—'} sub={`${money(prevSpent)} last month`}/>
      </section>
      <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-indigo-600"/><h2 className="font-bold">Smart insights</h2></div><div className="space-y-3">{insights.length?insights.map((x,i)=><div key={i} className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500"/><span>{x}</span></div>):<div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Keep recording transactions and income. FinBook will surface patterns here.</div>}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="mb-4 font-bold">Top spending</h2>{categoryRows.length?<div className="space-y-4">{categoryRows.map(([id,amount])=><div key={id}><div className="mb-1 flex justify-between text-sm"><span>{CATEGORY_MAP.get(id as any)?.name||id}</span><b>{money(amount)}</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:`${Math.min(100,amount/spent*100)}%`}}/></div></div>)}</div>:<p className="text-sm text-slate-500">No expenses recorded this month.</p>}</div>
      </section>
      <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-indigo-600"/><h2 className="font-bold">Ask FinBook</h2></div><div className="flex flex-col gap-2 sm:flex-row"><input value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ask()}} placeholder="e.g. Where am I spending the most?" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"/><button onClick={ask} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">Ask</button></div>{answer&&<div className="mt-4 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950">{answer}</div>}<div className="mt-3 flex flex-wrap gap-2">{['Where am I spending the most?','How much did I spend?','How much income did I record?','What is my savings rate?'].map(q=><button key={q} onClick={()=>{setQuestion(q);setTimeout(ask,0)}} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{q}</button>)}</div></section>
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>Insights are calculated from the transactions and income currently stored in FinBook. They are informational and do not include external bank data.</div>
      </>}
    </main>
  </div>;
}

function Metric({icon,label,value,sub}:{icon:React.ReactNode;label:string;value:string;sub:string}){return <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">{icon}</div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{sub}</p></div>}
