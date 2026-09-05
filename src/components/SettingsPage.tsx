import { useEffect, useState } from 'react';
import { User, SlidersHorizontal, Tags, Database, Palette, Cloud, Save, Download, Trash2, CalendarDays, RefreshCw } from 'lucide-react';
import { firebaseAuth } from '../services/firebase';
import { CloudStorageUsage, getApproximateStorageUsage } from '../services/firestoreData';

interface SettingsPageProps { userName:string; email:string; incomeDay:number; onIncomeDayChange:(day:number)=>void; onClearData:()=>Promise<void>; onExportData:()=>void; }

const FREE_STORAGE_BYTES = 1024 * 1024 * 1024;

function formatBytes(bytes:number){
  if(bytes < 1024) return `${bytes} B`;
  if(bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  if(bytes < 1024*1024*1024) return `${(bytes/(1024*1024)).toFixed(bytes < 10*1024*1024 ? 1 : 0)} MB`;
  return `${(bytes/(1024*1024*1024)).toFixed(2)} GB`;
}

export function SettingsPage({userName,email,incomeDay,onIncomeDayChange,onClearData,onExportData}:SettingsPageProps){
  const [name,setName]=useState(userName); const [currency,setCurrency]=useState('INR (₹)'); const [fy,setFy]=useState('April – March'); const [day,setDay]=useState(String(incomeDay)); const [saved,setSaved]=useState(false);
  const [usage,setUsage]=useState<CloudStorageUsage|null>(null); const [usageLoading,setUsageLoading]=useState(false); const [usageError,setUsageError]=useState('');
  useEffect(()=>setDay(String(incomeDay)),[incomeDay]);

  const loadUsage=async()=>{
    const uid=firebaseAuth.currentUser?.uid;
    if(!uid){setUsageError('Sign in to view cloud storage usage.');return;}
    setUsageLoading(true); setUsageError('');
    try{setUsage(await getApproximateStorageUsage(uid));}catch{setUsageError('Could not read cloud storage usage. Please try again.');}
    finally{setUsageLoading(false);}
  };
  useEffect(()=>{void loadUsage();},[]);

  const savePreferences=()=>{const parsed=Math.min(31,Math.max(1,Number(day)||25));setDay(String(parsed));onIncomeDayChange(parsed);localStorage.setItem('finbook-settings',JSON.stringify({name,currency,financialYear:fy,incomeDay:parsed}));setSaved(true);window.setTimeout(()=>setSaved(false),2500);};
  const fieldClass='block w-full min-w-0 max-w-full box-border mt-1.5 rounded-lg border px-3 py-2.5 text-base outline-none';
  const sectionHeader=(icon:React.ReactNode,title:string,description:string,iconClass:string)=><div className="flex items-start gap-3 mb-5 min-w-0 w-full"><div className={`h-10 w-10 rounded-xl ${iconClass} flex items-center justify-center shrink-0`}>{icon}</div><div className="min-w-0 flex-1 pt-0.5 overflow-hidden"><h2 className="font-bold leading-5 whitespace-normal break-words">{title}</h2><p className="text-xs text-slate-500 mt-1 leading-4 whitespace-normal break-words [overflow-wrap:anywhere] max-w-full">{description}</p></div></div>;
  const breakdown: Array<[string,number]> = usage ? [['Transactions',usage.expenses],['Income',usage.incomes],['Budgets',usage.budgets],['Recurring',usage.recurring],['Portfolio',usage.portfolio]] : [];
  const usagePercent=usage ? Math.min(100,(usage.totalBytes/FREE_STORAGE_BYTES)*100) : 0;

  return <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-5 overflow-hidden">
    <div><h1 className="text-xl sm:text-2xl font-bold">Settings</h1><p className="text-sm text-slate-500 mt-1">Manage your FinBook preferences and data.</p></div>
    <section className="bg-white rounded-2xl border p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">{sectionHeader(<User className="h-5 w-5"/>,'Profile','Your FinBook account','bg-indigo-50 text-indigo-600')}<div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-sm font-medium">Name<input value={name} onChange={e=>setName(e.target.value)} className={`${fieldClass} focus:ring-2 focus:ring-indigo-200`}/></label><label className="text-sm font-medium">Email<input value={email} disabled className={`${fieldClass} bg-slate-50 text-slate-500`}/></label></div></section>
    <section className="bg-white rounded-2xl border p-4 sm:p-5 w-full min-w-0 max-w-full overflow-hidden">{sectionHeader(<SlidersHorizontal className="h-5 w-5"/>,'Financial Preferences','Define the cycle used for income and cash-flow reporting.','bg-violet-50 text-violet-600')}<div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="text-sm font-medium">Currency<select value={currency} onChange={e=>setCurrency(e.target.value)} className={`${fieldClass} bg-white`}><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option><option>GBP (£)</option></select></label><label className="text-sm font-medium">Financial year<select value={fy} onChange={e=>setFy(e.target.value)} className={`${fieldClass} bg-white`}><option>April – March</option><option>January – December</option></select></label><label className="text-sm font-medium sm:col-span-2"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-slate-500"/>Income day of month</span><select value={day} onChange={e=>setDay(e.target.value)} className={`${fieldClass} bg-white`}>{Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}{i+1===1?'st':i+1===2?'nd':i+1===3?'rd':'th'} of every month</option>)}</select><span className="block mt-1.5 text-xs text-slate-500">Example: 25th means your financial cycle is 25 Aug → 24 Sep.</span></label></div><button onClick={savePreferences} className="mt-5 w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold"><Save className="h-4 w-4"/>{saved?'Saved':'Save preferences'}</button></section>
    <section className="bg-white rounded-2xl border p-4 sm:p-5 overflow-hidden">{sectionHeader(<Tags className="h-5 w-5"/>,'Categories','Manage custom categories from the transaction workflow.','bg-amber-50 text-amber-600')}<p className="text-sm text-slate-600 leading-5">Built-in categories remain available, including Investments.</p></section>
    <section className="bg-white rounded-2xl border p-4 sm:p-5 overflow-hidden">{sectionHeader(<Cloud className="h-5 w-5"/>,'Cloud & Sync','Your transactions, income and portfolio are synced with your account.','bg-emerald-50 text-emerald-600')}<div className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"/>Cloud sync enabled</div><div className="mt-4 rounded-xl border bg-slate-50 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-medium text-slate-500">Approximate FinBook data used</p><p className="text-2xl font-bold mt-1">{usage?formatBytes(usage.totalBytes):usageLoading?'Calculating…':'—'}</p></div><div className="text-right"><p className="text-xs text-slate-500">Free Firestore storage</p><p className="font-semibold">1 GiB</p></div></div>{usage&&<><div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:`${Math.max(usagePercent,usage.totalBytes>0?0.15:0)}%`}}/></div><div className="mt-1.5 flex justify-between text-xs text-slate-500"><span>{usagePercent<0.01?'<0.01%':`${usagePercent.toFixed(2)}%`} used</span><span>{formatBytes(Math.max(0,FREE_STORAGE_BYTES-usage.totalBytes))} remaining</span></div><div className="mt-4 space-y-2">{breakdown.map(([label,bytes])=><div key={label} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">{label}</span><span className="font-medium">{formatBytes(bytes)}</span></div>)}</div></>} {usageError&&<p className="mt-3 text-xs text-red-600">{usageError}</p>}<button onClick={()=>void loadUsage()} disabled={usageLoading} className="mt-4 flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${usageLoading?'animate-spin':''}`}/>{usageLoading?'Refreshing…':'Refresh usage'}</button><p className="mt-3 text-[11px] leading-4 text-slate-500">This is an estimate of your FinBook documents, not the exact project-wide Firestore billing size. Firebase's console is authoritative for actual storage usage.</p></div></section>
    <section className="bg-white rounded-2xl border p-4 sm:p-5 overflow-hidden">{sectionHeader(<Database className="h-5 w-5"/>,'Data & Backup','Export or permanently clear your FinBook data.','bg-sky-50 text-sky-600')}<div className="flex flex-col sm:flex-row gap-2"><button onClick={onExportData} className="w-full sm:w-auto flex items-center justify-center gap-2 border rounded-lg px-4 py-2.5 text-sm font-semibold"><Download className="h-4 w-4"/>Export CSV</button><button onClick={onClearData} className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-red-200 text-red-600 px-4 py-2.5 text-sm font-semibold"><Trash2 className="h-4 w-4"/>Clear financial data</button></div></section>
    <section className="bg-white rounded-2xl border p-4 sm:p-5 overflow-hidden">{sectionHeader(<Palette className="h-5 w-5"/>,'Appearance','FinBook currently uses the default light theme.','bg-slate-100 text-slate-600')}</section>
  </div>;
}
