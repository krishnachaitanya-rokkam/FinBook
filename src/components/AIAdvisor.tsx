import React,{useMemo,useState}from'react';
import{Bot,Send,Sparkles,TrendingDown,Wallet,Target,Lightbulb}from'lucide-react';
import{formatCurrency}from'../utils/formatters';

interface Props{available:number;income:number;spent:number;budget:number;upcomingBills:number;}

type Answer={title:string;body:string;tip?:string};

export const AIAdvisor:React.FC<Props>=({available,income,spent,budget,upcomingBills})=>{
 const[input,setInput]=useState('');const[question,setQuestion]=useState('');
 const savings=income>0?Math.max(0,(income-spent)/income*100):0;const budgetLeft=budget-spent;
 const answer=useMemo<Answer>(()=>{
  const q=question.toLowerCase();
  if(!question)return{title:'Your money, explained',body:'Ask AHVIQ about spending, budgets, savings, upcoming commitments, or whether you can afford a purchase.'};
  if(q.includes('afford')||q.includes('buy')||q.includes('purchase')||q.includes('spend')){
   const safe=Math.max(0,available-upcomingBills);
   return{title:safe>0?'You have room, with a buffer':'This purchase looks tight',body:`You currently have ${formatCurrency(available)} available and about ${formatCurrency(upcomingBills)} in upcoming commitments. That leaves roughly ${formatCurrency(safe)} before considering this purchase.`,tip:safe>0?'Keep an emergency buffer and avoid using money already committed to bills or goals.':'Consider delaying the purchase or reducing discretionary spending first.'};
  }
  if(q.includes('save')||q.includes('saving'))return{title:`Your savings rate is ${savings.toFixed(0)}%`,body:income>0?`You earned ${formatCurrency(income)} and spent ${formatCurrency(spent)} in this period. That leaves about ${formatCurrency(Math.max(0,income-spent))} before other adjustments.`:'Add your income to let AHVIQ calculate meaningful savings guidance.',tip:'A consistent savings rate matters more than one unusually good month.'};
  if(q.includes('budget')||q.includes('overspend'))return{title:budget>0?(budgetLeft>=0?'Budget is under control':'Budget needs attention'):'Budget not set',body:budget>0?`You have spent ${formatCurrency(spent)} against a ${formatCurrency(budget)} budget. ${budgetLeft>=0?`${formatCurrency(budgetLeft)} remains.`:`You are ${formatCurrency(Math.abs(budgetLeft))} over budget.`}`:'Set category budgets so AHVIQ can identify overspending earlier.',tip:'Review the categories with the fastest spending growth before cutting everything equally.'};
  if(q.includes('bill')||q.includes('upcoming'))return{title:'Upcoming commitments',body:`About ${formatCurrency(upcomingBills)} is scheduled in recurring bills or commitments over the next 30 days.`,tip:'Keep committed money separate from discretionary spending when deciding what you can afford.'};
  if(q.includes('health')||q.includes('doing')||q.includes('financial'))return{title:'Your current money snapshot',body:`Available: ${formatCurrency(available)} · Spent: ${formatCurrency(spent)} · Savings rate: ${savings.toFixed(0)}% · Upcoming commitments: ${formatCurrency(upcomingBills)}.`,tip:budget>0?(budgetLeft>=0?'You are currently within the overall budget.':'Your spending has crossed the overall budget.'):'Set a budget to unlock stronger financial health signals.'};
  return{title:'Here is what I can analyze',body:'Try asking: “Can I afford this?”, “How can I save more?”, “Am I over budget?”, or “What bills are coming up?”',tip:'AHVIQ uses the financial data already in your account for these answers.'};
 },[question,available,income,spent,budget,upcomingBills,savings,budgetLeft]);
 const ask=(q:string)=>{setQuestion(q);setInput('')};
 return <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
  <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><Bot className="h-5 w-5"/></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-900">AHVIQ AI Advisor</h3><span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[9px] font-bold text-indigo-600 ring-1 ring-indigo-100"><Sparkles className="h-3 w-3"/> Money intelligence</span></div><p className="mt-0.5 text-[11px] text-slate-500">Ask questions about your money and get answers based on your AHVIQ data.</p></div></div>
  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Sparkles className="h-4 w-4"/></div><div><p className="text-sm font-bold text-slate-800">{answer.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{answer.body}</p>{answer.tip&&<div className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-800"><Lightbulb className="h-4 w-4 shrink-0"/><span>{answer.tip}</span></div>}</div></div></div>
  <div className="mt-3 flex flex-wrap gap-2">{['Can I afford a purchase?','How can I save more?','Am I over budget?','What bills are coming up?'].map(q=><button key={q} type="button" onClick={()=>ask(q)} className="rounded-full border border-indigo-100 bg-white px-3 py-2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50">{q}</button>)}</div>
  <form onSubmit={e=>{e.preventDefault();if(input.trim())setQuestion(input.trim())}} className="mt-3 flex gap-2"><div className="relative flex-1"><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask AHVIQ about your money…" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"/><Send className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400"/></div><button type="submit" disabled={!input.trim()} className="rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Ask</button></form>
  <p className="mt-2 text-[9px] text-slate-400">AHVIQ provides informational guidance from your recorded data. Review important financial decisions independently.</p>
 </section>;
};
