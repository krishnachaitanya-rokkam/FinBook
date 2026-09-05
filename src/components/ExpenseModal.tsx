import React, { useState, useEffect } from 'react';
import { Expense, CategoryId, PaymentMethod } from '../types';
import { CATEGORIES } from '../data/categories';
import { X, IndianRupee, Calendar, Tag, CreditCard, AlignLeft } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { getTodayDateString } from '../utils/formatters';
import { firebaseAuth } from '../services/firebase';
import { CustomCategory, subscribeToCustomCategories } from '../services/categoryService';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Omit<Expense, 'id' | 'createdAt'>, id?: string) => void;
  editingExpense?: Expense | null;
  defaultDate?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSave, editingExpense, defaultDate }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('groceries');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) { setCustomCategories([]); return; }
    return subscribeToCustomCategories(uid, setCustomCategories, () => setCustomCategories([]));
  }, [isOpen]);

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setCategoryId(editingExpense.categoryId);
      setDate(editingExpense.date);
      setPaymentMethod(editingExpense.paymentMethod);
      setNotes(editingExpense.notes || '');
    } else {
      setTitle(''); setAmount(''); setCategoryId('groceries');
      setDate(defaultDate || getTodayDateString()); setPaymentMethod('upi'); setNotes('');
    }
    setError(null);
  }, [editingExpense, isOpen, defaultDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allCategories = [...CATEGORIES, ...customCategories];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError('Please provide a description or merchant name.'); return; }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) { setError('Please enter a valid positive amount.'); return; }
    if (!date) { setError('Please select a date.'); return; }
    onSave({ title: trimmedTitle, amount: Math.round(numAmount * 100) / 100, categoryId, date, paymentMethod, notes: notes.trim() }, editingExpense ? editingExpense.id : undefined);
    onClose();
  };

  return (
    <div id="expense-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="expense-modal-dialog" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200/90 transition-transform">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div><h3 className="text-base font-bold text-slate-900 tracking-tight font-display">{editingExpense ? 'Edit Expense Record' : 'Record New Expense'}</h3><p className="text-xs text-slate-500 mt-0.5">Add details to update monthly spending charts & budget alerts</p></div>
          <button id="btn-close-expense-modal" type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mt-3.5 rounded-lg bg-rose-50 border border-rose-200/80 p-2.5 text-xs font-medium text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="input-modal-amount" className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label><div className="relative"><IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input id="input-modal-amount" type="number" step="0.01" min="0.01" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 tabular-nums" autoFocus /></div></div>
            <div><label htmlFor="input-modal-date" className="block text-xs font-semibold text-slate-700 mb-1">Transaction Date *</label><div className="relative"><Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input id="input-modal-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900" /></div></div>
          </div>
          <div><label htmlFor="input-modal-title" className="block text-xs font-semibold text-slate-700 mb-1">Title / Merchant *</label><input id="input-modal-title" type="text" required placeholder="e.g. Whole Foods Market, Electric Bill, Coffee" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900" /></div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-slate-400" /><span>Category *</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1.5 border border-slate-200/80 rounded-lg bg-slate-50/50 custom-scrollbar">
              {allCategories.map((cat) => { const isSelected = categoryId === cat.id; return <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id as CategoryId)} className={`flex items-center gap-2 rounded-md p-1.5 text-left text-xs transition border shadow-2xs ${isSelected ? 'border-slate-900 bg-slate-900 font-semibold text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><div className={`flex h-5 w-5 items-center justify-center rounded-sm shrink-0 ${isSelected ? 'bg-white/20 text-white' : ''}`} style={isSelected ? undefined : { backgroundColor: `${cat.color}20`, color: cat.color }}><CategoryIcon categoryId={cat.id} className="h-3 w-3" /></div><span className="truncate">{cat.name}</span></button>; })}
            </div>
          </div>
          <div><label htmlFor="select-modal-payment" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-slate-400" /><span>Payment Method</span></label><select id="select-modal-payment" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"><option value="upi">UPI (GPay / PhonePe / Paytm / CRED)</option><option value="credit_card">Credit Card</option><option value="debit_card">Debit Card</option><option value="digital_wallet">Digital Wallet (Apple Pay / Google Pay)</option><option value="bank_transfer">Bank Transfer / Net Banking</option><option value="cash">Cash</option></select></div>
          <div><label htmlFor="textarea-modal-notes" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><AlignLeft className="h-3.5 w-3.5 text-slate-400" /><span>Notes (Optional)</span></label><textarea id="textarea-modal-notes" rows={2} placeholder="Add memo or itemized notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 resize-none" /></div>
          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100"><button id="btn-cancel-expense-modal" type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs">Cancel</button><button id="btn-submit-expense-modal" type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition active:scale-[0.99]">{editingExpense ? 'Save Changes' : 'Record Expense'}</button></div>
        </form>
      </div>
    </div>
  );
};
