import React, { useState, useEffect } from 'react';
import { Expense, CategoryId, PaymentMethod, InvestmentType } from '../types';
import { InvestmentHolding } from '../services/portfolioService';
import { CATEGORIES } from '../data/categories';
import { X, IndianRupee, Calendar, Tag, CreditCard, AlignLeft, TrendingUp, Target, Users } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';
import { getTodayDateString } from '../utils/formatters';
import { firebaseAuth, firestore } from '../services/firebase';
import { CustomCategory, subscribeToCustomCategories } from '../services/categoryService';
import { collection, doc, onSnapshot } from 'firebase/firestore';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Omit<Expense, 'id' | 'createdAt'>, id?: string) => void;
  editingExpense?: Expense | null;
  defaultDate?: string;
}

type GoalOption = {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  targetDate?: string;
  scope: 'personal' | 'family';
  familyId?: string;
  familyName?: string;
};

const INVESTMENT_TYPES: Array<{ id: InvestmentType; label: string }> = [
  { id: 'ppf', label: 'PPF' },
  { id: 'mutual_funds', label: 'Mutual Fund' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'epf', label: 'EPF' },
  { id: 'nps', label: 'NPS' },
  { id: 'fixed_deposits', label: 'Fixed Deposit' },
  { id: 'gold', label: 'Gold' },
  { id: 'other_investment', label: 'Other Investment' },
];

const money = (value: number) => `₹${Math.max(0, value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, onSave, editingExpense, defaultDate }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('groceries');
  const [investmentType, setInvestmentType] = useState<InvestmentType>('mutual_funds');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [notes, setNotes] = useState('');
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [goalScope, setGoalScope] = useState<'personal' | 'family'>('personal');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [personalGoals, setPersonalGoals] = useState<GoalOption[]>([]);
  const [holdings, setHoldings] = useState<InvestmentHolding[]>([]);
  const [selectedHoldingId, setSelectedHoldingId] = useState('');
  const [familyGoals, setFamilyGoals] = useState<GoalOption[]>([]);
  const [familyId, setFamilyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid) { setCustomCategories([]); return; }
    return subscribeToCustomCategories(uid, setCustomCategories, () => setCustomCategories([]));
  }, [isOpen]);

  useEffect(() => {
    const uid = firebaseAuth.currentUser?.uid;
    if (!uid || !isOpen) {
      setPersonalGoals([]);
      setFamilyGoals([]);
      setHoldings([]);
      setSelectedHoldingId('');
      return;
    }
    let stopFamily: (() => void) | undefined;
    const stopPortfolio = onSnapshot(doc(firestore, 'users', uid, 'portfolio', 'config'), snap => {
      const snapshotData = snap.data() || {};
      const goals = Array.isArray(snapshotData.goals) ? snapshotData.goals : [];
      const savedHoldings = Array.isArray(snapshotData.holdings) ? snapshotData.holdings : [];
      setHoldings(savedHoldings.map((item: any) => ({ id: String(item.id), assetType: item.assetType === 'stock' ? 'stock' : 'mutual-fund', name: String(item.name || ''), schemeCode: item.schemeCode ? String(item.schemeCode) : undefined, units: Number(item.units) || 0, investedAmount: Number(item.investedAmount) || 0, currentPrice: Number(item.currentPrice) || 0, currentValue: Number(item.currentValue) || ((Number(item.units) || 0) * (Number(item.currentPrice) || 0)), lastUpdatedAt: Number(item.lastUpdatedAt) || Date.now(), navDate: item.navDate ? String(item.navDate) : undefined, source: item.source === 'automatic' ? 'automatic' : 'manual', goalId: item.goalId ? String(item.goalId) : undefined })));
      setPersonalGoals(goals.filter((goal: any) => (goal.scope || 'personal') === 'personal').map((goal: any) => ({
        id: String(goal.id), name: String(goal.name), currentAmount: Number(goal.currentAmount) || 0,
        targetAmount: Number(goal.targetAmount) || 0, targetDate: goal.targetDate, scope: 'personal' as const,
      })));
    });
    const stopLink = onSnapshot(doc(firestore, 'users', uid, 'family', 'link'), linkSnap => {
      stopFamily?.();
      stopFamily = undefined;
      const nextFamilyId = String(linkSnap.data()?.familyId || '');
      setFamilyId(nextFamilyId);
      if (!nextFamilyId) {
        setFamilyGoals([]);
        return;
      }
      stopFamily = onSnapshot(collection(firestore, 'families', nextFamilyId, 'goals'), goalsSnap => {
        setFamilyGoals(goalsSnap.docs.map(goalSnap => {
          const goal = goalSnap.data();
          return {
            id: goalSnap.id,
            name: String(goal.name || goalSnap.id),
            currentAmount: Number(goal.currentAmount) || 0,
            targetAmount: Number(goal.targetAmount) || 0,
            targetDate: goal.targetDate,
            scope: 'family' as const,
            familyId: nextFamilyId,
            familyName: String(goal.familyName || ''),
          };
        }));
      });
    });
    return () => { stopPortfolio(); stopLink(); stopFamily?.(); };
  }, [isOpen]);

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title); setAmount(editingExpense.amount.toString()); setCategoryId(editingExpense.categoryId);
      setInvestmentType(editingExpense.investmentType || 'mutual_funds'); setSelectedHoldingId(editingExpense.holdingId || ''); setDate(editingExpense.date); setPaymentMethod(editingExpense.paymentMethod); setNotes(editingExpense.notes || '');
      setGoalEnabled(Boolean(editingExpense.goalId)); setGoalScope(editingExpense.goalScope || 'personal'); setSelectedGoalId(editingExpense.goalId || '');
    } else {
      setTitle(''); setAmount(''); setCategoryId('groceries'); setInvestmentType('mutual_funds'); setSelectedHoldingId('');
      setDate(defaultDate || getTodayDateString()); setPaymentMethod('upi'); setNotes(''); setGoalEnabled(false); setGoalScope('personal'); setSelectedGoalId('');
    }
    setError(null);
  }, [editingExpense, isOpen, defaultDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!goalEnabled) { setSelectedGoalId(''); return; }
    const goals = goalScope === 'family' ? familyGoals : personalGoals;
    if (selectedGoalId && !goals.some(goal => goal.id === selectedGoalId)) setSelectedGoalId('');
  }, [goalEnabled, goalScope, familyGoals, personalGoals, selectedGoalId]);

  useEffect(() => {
    if (categoryId !== 'investment' || !['mutual_funds', 'stocks'].includes(investmentType)) { setSelectedHoldingId(''); return; }
    const matching = holdings.filter(item => (investmentType === 'mutual_funds' ? item.assetType === 'mutual-fund' : item.assetType === 'stock'));
    if (matching.length === 1 && !selectedHoldingId) setSelectedHoldingId(matching[0].id);
    if (selectedHoldingId && !matching.some(item => item.id === selectedHoldingId)) setSelectedHoldingId('');
  }, [categoryId, investmentType, holdings, selectedHoldingId]);

  if (!isOpen) return null;
  const allCategories = [...CATEGORIES, ...customCategories];
  const visibleGoals = goalScope === 'family' ? familyGoals : personalGoals;
  const selectedGoal = visibleGoals.find(goal => goal.id === selectedGoalId);
  const noGoals = visibleGoals.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const trimmedTitle = title.trim(); const numAmount = parseFloat(amount);
    if (!trimmedTitle) { setError('Please provide a description or merchant name.'); return; }
    if (isNaN(numAmount) || numAmount <= 0) { setError('Please enter a valid positive amount.'); return; }
    if (!date) { setError('Please select a date.'); return; }
    if (categoryId === 'investment' && ['mutual_funds', 'stocks'].includes(investmentType) && !selectedHoldingId) {
      setError(holdings.some(item => investmentType === 'mutual_funds' ? item.assetType === 'mutual-fund' : item.assetType === 'stock') ? 'Select the investment holding this transaction belongs to.' : 'Add a matching holding from Portfolio → Portfolio first, then record this investment transaction.'); return;
    }
    if (categoryId === 'investment' && goalEnabled && !selectedGoal) {
      setError(noGoals ? `No ${goalScope} goals are available. Create a goal first, or turn off Goal contribution.` : 'Select a goal before saving this transaction.'); return;
    }
    const goalData = categoryId === 'investment' && goalEnabled && selectedGoal ? {
      goalId: selectedGoal.id, goalName: selectedGoal.name, goalScope: selectedGoal.scope, goalFamilyId: selectedGoal.familyId,
    } : {};
    const holdingData = categoryId === 'investment' && selectedHoldingId ? { holdingId: selectedHoldingId } : {};
    onSave({ title: trimmedTitle, amount: Math.round(numAmount * 100) / 100, categoryId, ...(categoryId === 'investment' ? { investmentType } : {}), ...holdingData, ...goalData, date, paymentMethod, notes: notes.trim() }, editingExpense ? editingExpense.id : undefined);
    onClose();
  };

  return (
    <div id="expense-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="expense-modal-dialog" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200/90 transition-transform">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100"><div><h3 className="text-base font-bold text-slate-900 tracking-tight font-display">{editingExpense ? 'Edit Expense Record' : 'Record New Expense'}</h3><p className="text-xs text-slate-500 mt-0.5">Add details to update monthly spending charts & budget alerts</p></div><button id="btn-close-expense-modal" type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><X className="h-5 w-5" /></button></div>
        {error && <div className="mt-3.5 rounded-lg bg-rose-50 border border-rose-200/80 p-2.5 text-xs font-medium text-rose-700">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label htmlFor="input-modal-amount" className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label><div className="relative"><IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input id="input-modal-amount" type="number" step="0.01" min="0.01" required placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm font-bold text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 tabular-nums" autoFocus/></div></div><div><label htmlFor="input-modal-date" className="block text-xs font-semibold text-slate-700 mb-1">Transaction Date *</label><div className="relative"><Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input id="input-modal-date" type="date" required value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"/></div></div></div>
          <div><label htmlFor="input-modal-title" className="block text-xs font-semibold text-slate-700 mb-1">Title / Merchant *</label><input id="input-modal-title" type="text" required placeholder="e.g. Whole Foods Market, Electric Bill, SIP" value={title} onChange={e=>setTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"/></div>
          <div><label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-slate-400"/><span>Category *</span></label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1.5 border border-slate-200/80 rounded-lg bg-slate-50/50 custom-scrollbar">{allCategories.map(cat=>{const isSelected=categoryId===cat.id;return <button key={cat.id} type="button" onClick={()=>setCategoryId(cat.id as CategoryId)} className={`flex items-center gap-2 rounded-md p-1.5 text-left text-xs transition border shadow-2xs ${isSelected?'border-slate-900 bg-slate-900 font-semibold text-white':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}><div className={`flex h-5 w-5 items-center justify-center rounded-sm shrink-0 ${isSelected?'bg-white/20 text-white':''}`} style={isSelected?undefined:{backgroundColor:`${cat.color}20`,color:cat.color}}><CategoryIcon categoryId={cat.id} className="h-3 w-3"/></div><span className="truncate">{cat.name}</span></button>})}</div></div>
          {categoryId === 'investment' && <div className="space-y-3"><div><label htmlFor="select-investment-type" className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-teal-600"/><span>Investment Type *</span></label><select id="select-investment-type" value={investmentType} onChange={e=>setInvestmentType(e.target.value as InvestmentType)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900">{INVESTMENT_TYPES.map(type=><option key={type.id} value={type.id}>{type.label}</option>)}</select><p className="mt-1 text-[11px] text-slate-400">This automatically updates the matching Portfolio bucket.</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-600"/><span className="text-xs font-bold text-slate-800">Goal contribution</span></div>
            {(investmentType === 'mutual_funds' || investmentType === 'stocks') && <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-800">Investment holding</p><p className="mt-0.5 text-[11px] text-slate-500">This transaction increases invested amount and units in the selected holding. Current value comes from its latest price/NAV.</p></div><span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Linked</span></div><select value={selectedHoldingId} onChange={e=>setSelectedHoldingId(e.target.value)} className="mt-3 w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-hidden"><option value="">Select holding</option>{holdings.filter(item=>investmentType==='mutual_funds'?item.assetType==='mutual-fund':item.assetType==='stock').map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><p className="mt-1.5 text-[11px] text-slate-400">No holding? Add it in Portfolio → Portfolio → Investment holdings.</p></div>}

<p className="mt-0.5 text-[11px] text-slate-500">Link this investment to a financial goal.</p></div><button type="button" role="switch" aria-checked={goalEnabled} onClick={()=>setGoalEnabled(value=>!value)} className={`relative h-6 w-11 rounded-full transition ${goalEnabled?'bg-indigo-600':'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${goalEnabled?'left-6':'left-1'}`}/></button></div>
              {goalEnabled && <div className="mt-3 space-y-3 border-t border-slate-200 pt-3"><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>{setGoalScope('personal');setSelectedGoalId('')}} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${goalScope==='personal'?'border-indigo-600 bg-indigo-50 text-indigo-700':'border-slate-200 bg-white text-slate-600'}`}><Target className="mr-1 inline h-3.5 w-3.5"/>Personal</button><button type="button" onClick={()=>{setGoalScope('family');setSelectedGoalId('')}} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${goalScope==='family'?'border-indigo-600 bg-indigo-50 text-indigo-700':'border-slate-200 bg-white text-slate-600'}`}><Users className="mr-1 inline h-3.5 w-3.5"/>Family</button></div>{noGoals?<div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-center"><p className="text-xs font-semibold text-slate-700">No {goalScope} goals yet</p><p className="mt-1 text-[11px] text-slate-500">Create a {goalScope} goal from Portfolio → Goals, then come back to tag this investment.</p></div>:<div><label htmlFor="select-goal" className="mb-1.5 block text-xs font-semibold text-slate-700">Select {goalScope} goal</label><select id="select-goal" value={selectedGoalId} onChange={e=>setSelectedGoalId(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"><option value="">Choose a goal…</option>{visibleGoals.map(goal=><option key={goal.id} value={goal.id}>{goal.name} · {money(goal.currentAmount)} / {money(goal.targetAmount)}</option>)}</select>{selectedGoal&&<div className="mt-2 rounded-lg bg-white border border-slate-200 p-2.5"><p className="text-xs font-semibold text-slate-800">{selectedGoal.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{money(selectedGoal.currentAmount)} / {money(selectedGoal.targetAmount)} before this transaction</p><p className="mt-1 text-[11px] font-semibold text-indigo-600">After saving: {money(selectedGoal.currentAmount+(Number(amount)||0))}</p></div>}</div>}</div>}
            </div>
          </div>}
          <div><label htmlFor="select-modal-payment" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-slate-400"/><span>Payment Method</span></label><select id="select-modal-payment" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as PaymentMethod)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"><option value="upi">UPI (GPay / PhonePe / Paytm / CRED)</option><option value="credit_card">Credit Card</option><option value="debit_card">Debit Card</option><option value="digital_wallet">Digital Wallet (Apple Pay / Google Pay)</option><option value="bank_transfer">Bank Transfer / Net Banking</option><option value="cash">Cash</option></select></div>
          <div><label htmlFor="textarea-modal-notes" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1"><AlignLeft className="h-3.5 w-3.5 text-slate-400"/><span>Notes (Optional)</span></label><textarea id="textarea-modal-notes" rows={2} placeholder="Add memo or itemized notes..." value={notes} onChange={e=>setNotes(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs focus:border-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 resize-none"/></div>
          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-slate-100"><button id="btn-cancel-expense-modal" type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs">Cancel</button><button id="btn-submit-expense-modal" type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition active:scale-[0.99]">{editingExpense?'Save Changes':'Record Expense'}</button></div>
        </form>
      </div>
    </div>
  );
};
