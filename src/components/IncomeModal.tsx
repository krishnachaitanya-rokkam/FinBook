import React, { useEffect, useState } from 'react';
import { Income } from '../types';
import { X, IndianRupee, Calendar, Briefcase, AlignLeft } from 'lucide-react';
import { getTodayDateString } from '../utils/formatters';

interface IncomeModalProps { isOpen:boolean; onClose:()=>void; onSave:(data:Omit<Income,'id'|'createdAt'>,id?:string)=>void; editingIncome?:Income|null; defaultDate?:string; }

export const IncomeModal: React.FC<IncomeModalProps> = ({isOpen,onClose,onSave,editingIncome,defaultDate}) => {
  const [title,setTitle]=useState(''); const [amount,setAmount]=useState(''); const [date,setDate]=useState(''); const [source,setSource]=useState('Salary'); const [notes,setNotes]=useState(''); const [error,setError]=useState<string|null>(null);
  useEffect(()=>{ if(editingIncome){setTitle(editingIncome.title);setAmount(editingIncome.amount.toString());setDate(editingIncome.date);setSource(editingIncome.source||'Salary');setNotes(editingIncome.notes||'');} else {setTitle('Salary');setAmount('');setDate(defaultDate||getTodayDateString());setSource('Salary');setNotes('');} setError(null); },[editingIncome,isOpen,defaultDate]);
  if(!isOpen) return null;
  const submit=(e:React.FormEvent)=>{e.preventDefault();const n=Number(amount);if(!title.trim()){setError('Please provide an income description.');return;}if(!Number.isFinite(n)||n<=0){setError('Please enter a valid positive amount.');return;}if(!date){setError('Please select a date.');return;}onSave({title:title.trim(),amount:Math.round(n*100)/100,date,source:source.trim(),notes:notes.trim()},editingIncome?.id);onClose();};
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div id="income-modal-dialog" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-slate-200">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100"><div><h3 className="font-bold">{editingIncome?'Edit Income':'Record Income'}</h3><p className="text-xs text-slate-500 mt-0.5">Add salary or any other income received.</p></div><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
      {error&&<div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">{error}</div>}
      <form onSubmit={submit} className="mt-4 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-xs font-semibold">Amount (₹) *<div className="relative mt-1"><IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input autoFocus type="number" step="0.01" min="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full rounded-lg border px-9 py-2 text-sm font-bold"/></div></label><label className="text-xs font-semibold">Received date *<div className="relative mt-1"><Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-lg border pl-9 pr-2 py-2 text-xs"/></div></label></div>
        <label className="block text-xs font-semibold">Description *<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Salary, bonus, freelance income"/></label>
        <label className="block text-xs font-semibold"><span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5"/>Source</span><input value={source} onChange={e=>setSource(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Salary, business, interest..."/></label>
        <label className="block text-xs font-semibold"><span className="flex items-center gap-1"><AlignLeft className="h-3.5 w-3.5"/>Notes</span><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm resize-none"/></label>
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100"><button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button><button type="submit" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold">{editingIncome?'Save Changes':'Record Income'}</button></div>
      </form>
    </div>
  </div>;
};
