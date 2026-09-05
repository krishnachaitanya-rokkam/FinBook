import React, { useEffect, useState } from 'react';
import { Income } from '../types';
import { X, IndianRupee, Calendar, Briefcase, AlignLeft } from 'lucide-react';
import { getTodayDateString } from '../utils/formatters';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Income, 'id' | 'createdAt'>, id?: string) => void;
  editingIncome?: Income | null;
  defaultDate?: string;
}

const getPreviousMonthStart = (dateString?: string) => {
  const base = dateString ? new Date(`${dateString}T12:00:00`) : new Date();
  const previousMonth = new Date(base.getFullYear(), base.getMonth() - 1, 1);
  return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}-01`;
};

const inputClass = 'box-border block w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

export const IncomeModal: React.FC<IncomeModalProps> = ({ isOpen, onClose, onSave, editingIncome, defaultDate }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [source, setSource] = useState('Salary');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingIncome) {
      setTitle(editingIncome.title);
      setAmount(editingIncome.amount.toString());
      setDate(editingIncome.date);
      setSource(editingIncome.source || 'Salary');
      setNotes(editingIncome.notes || '');
    } else {
      setTitle('Salary');
      setAmount('');
      setDate(getPreviousMonthStart(defaultDate || getTodayDateString()));
      setSource('Salary');
      setNotes('');
    }
    setError(null);
  }, [editingIncome, isOpen, defaultDate]);

  if (!isOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!title.trim()) {
      setError('Please provide an income description.');
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }
    onSave({
      title: title.trim(),
      amount: Math.round(n * 100) / 100,
      date,
      source: source.trim(),
      notes: notes.trim(),
    }, editingIncome?.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div id="income-modal-dialog" className="box-border w-full max-w-md min-w-0 rounded-2xl bg-white p-4 sm:p-5 shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 min-w-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{editingIncome ? 'Edit Income' : 'Record Income'}</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 whitespace-normal break-words">Add salary or any other income received.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0" aria-label="Close income dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 break-words">{error}</div>}

        <form onSubmit={submit} className="mt-4 space-y-3.5 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <label className="block min-w-0 text-xs font-semibold text-slate-700">
              Amount (₹) *
              <div className="relative mt-1">
                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input autoFocus type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputClass} pl-9 font-bold`} placeholder="0.00" />
              </div>
            </label>
            <label className="block min-w-0 text-xs font-semibold text-slate-700">
              Received date *
              <div className="relative mt-1 min-w-0">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inputClass} pl-9 text-sm`} />
              </div>
            </label>
          </div>

          <label className="block min-w-0 text-xs font-semibold text-slate-700">
            Description *
            <input value={title} onChange={e => setTitle(e.target.value)} className={`${inputClass} mt-1`} placeholder="Salary, bonus, freelance income" />
          </label>

          <label className="block min-w-0 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 shrink-0" />Source</span>
            <input value={source} onChange={e => setSource(e.target.value)} className={`${inputClass} mt-1`} placeholder="Salary, business, interest..." />
          </label>

          <label className="block min-w-0 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1"><AlignLeft className="h-3.5 w-3.5 shrink-0" />Notes</span>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} mt-1 resize-none`} />
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 min-w-0">
            <button type="button" onClick={onClose} className="w-full sm:w-auto rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button>
            <button type="submit" className="w-full sm:w-auto rounded-lg bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold">{editingIncome ? 'Save Changes' : 'Record Income'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
