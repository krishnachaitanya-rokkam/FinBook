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
      setDate(defaultDate || getTodayDateString());
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-slate-900/50 p-3 backdrop-blur-xs sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div id="income-modal-dialog" className="box-border flex w-full max-w-md min-w-0 max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
        <div className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{editingIncome ? 'Edit Income' : 'Record Income'}</h3>
            <p className="mt-0.5 text-xs text-slate-500 whitespace-normal break-words sm:text-sm">Add salary or any other income received.</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1.5 hover:bg-slate-100" aria-label="Close income dialog">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mt-3 shrink-0 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 break-words">{error}</div>}

        <form onSubmit={submit} className="mt-4 min-w-0 space-y-3.5 overflow-y-auto">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block min-w-0 text-xs font-semibold text-slate-700">
              Amount (₹) *
              <div className="relative mt-1 min-w-0">
                <IndianRupee className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input autoFocus type="number" inputMode="decimal" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputClass} pl-9 font-bold`} placeholder="0.00" />
              </div>
            </label>
            <label className="block min-w-0 text-xs font-semibold text-slate-700">
              Received date *
              <div className="relative mt-1 min-w-0">
                <Calendar className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 text-slate-400" />
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inputClass} appearance-none pl-9 pr-2`} />
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

          <div className="flex min-w-0 shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="box-border w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold sm:w-auto">Cancel</button>
            <button type="submit" className="box-border w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto">{editingIncome ? 'Save Changes' : 'Record Income'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};