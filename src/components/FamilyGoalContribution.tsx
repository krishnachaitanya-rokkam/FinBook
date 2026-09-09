import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { firebaseAuth, firestore } from '../services/firebase';
import { formatCurrency } from '../utils/formatters';
import { Expense } from '../types';
import { removeExpense, saveExpense } from '../services/firestoreData';

type Goal = { id: string; name: string; targetAmount: number; currentAmount?: number; contributions?: Record<string, number>; contributorNames?: Record<string, string> };
const goalsCollection = (familyId: string) => collection(firestore, 'families', familyId, 'goals');
const goalDoc = (familyId: string, goalId: string) => doc(firestore, 'families', familyId, 'goals', goalId);

export function FamilyGoalContribution() {
  const uid = firebaseAuth.currentUser?.uid || '';
  const [familyId, setFamilyId] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goalId, setGoalId] = useState('');
  const [amount, setAmount] = useState('');
  const [editingManual, setEditingManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(firestore, 'users', uid, 'family', 'link'), snap => setFamilyId(String(snap.data()?.familyId || '')));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(collection(firestore, 'users', uid, 'expenses'), snap => {
      setExpenses(snap.docs.map(item => item.data() as Expense));
    });
  }, [uid]);

  useEffect(() => {
    if (!familyId) { setGoals([]); setGoalId(''); return; }
    return onSnapshot(goalsCollection(familyId), snap => {
      const next = snap.docs.map(item => ({ id: item.id, ...(item.data() as Omit<Goal, 'id'>) }));
      setGoals(next);
      setGoalId(current => current && next.some(g => g.id === current) ? current : next[0]?.id || '');
    });
  }, [familyId]);

  const selected = goals.find(g => g.id === goalId);
  const familyTransactions = useMemo(() => expenses
    .filter(expense => expense.categoryId === 'investment' && expense.goalId === goalId && expense.goalScope === 'family' && expense.goalFamilyId === familyId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.createdAt || 0) - Number(a.createdAt || 0)), [expenses, goalId, familyId]);

  if (!familyId || !goals.length) return null;

  const current = Math.max(0, Number(selected?.currentAmount) || 0);
  const myContribution = Math.max(0, Number(selected?.contributions?.[uid]) || 0);
  const transactionContribution = familyTransactions.reduce((sum, expense) => sum + Math.max(0, Number(expense.amount) || 0), 0);
  const manualContribution = Math.max(0, myContribution - transactionContribution);
  const remaining = Math.max(0, Number(selected?.targetAmount || 0) - current);
  const maxManualContribution = remaining + manualContribution;

  const resetEditor = () => { setAmount(''); setEditingManual(false); setMessage(''); };

  const saveManualContribution = async () => {
    const value = Number(amount);
    if (!selected || !uid || !Number.isFinite(value) || value <= 0) { setMessage('Enter a valid contribution.'); return; }
    if (editingManual ? value > maxManualContribution : value > remaining) { setMessage(`Maximum contribution for this goal is ${formatCurrency(editingManual ? maxManualContribution : remaining)}.`); return; }
    setBusy(true); setMessage('');
    try {
      await runTransaction(firestore, async transaction => {
        const ref = goalDoc(familyId, selected.id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Family goal no longer exists.');
        const data = snap.data() as Goal;
        const contributions = { ...(data.contributions || {}) } as Record<string, number>;
        contributions[uid] = editingManual ? transactionContribution + value : (Number(contributions[uid]) || 0) + value;
        const contributorNames = { ...(data.contributorNames || {}) } as Record<string, string>;
        contributorNames[uid] = firebaseAuth.currentUser?.displayName || firebaseAuth.currentUser?.email?.split('@')[0] || 'You';
        const nextCurrent = Object.values(contributions).reduce((sum, item) => sum + Math.max(0, Number(item) || 0), 0);
        transaction.update(ref, { currentAmount: nextCurrent, contributions, contributorNames, updatedAt: Date.now() });
      });
      setAmount(''); setEditingManual(false);
      setMessage(`${formatCurrency(value)} ${editingManual ? 'set as your manual contribution to' : 'added to'} ${selected.name}.`);
    } catch (e: any) { setMessage(e?.message || 'Could not save the contribution.'); } finally { setBusy(false); }
  };

  const deleteManualContribution = async () => {
    if (!selected || !uid || manualContribution <= 0) return;
    if (!window.confirm(`Delete your manual ${formatCurrency(manualContribution)} contribution to ${selected.name}?`)) return;
    setBusy(true); setMessage('');
    try {
      await runTransaction(firestore, async transaction => {
        const ref = goalDoc(familyId, selected.id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Family goal no longer exists.');
        const data = snap.data() as Goal;
        const contributions = { ...(data.contributions || {}) } as Record<string, number>;
        if (transactionContribution > 0) contributions[uid] = transactionContribution;
        else delete contributions[uid];
        const contributorNames = { ...(data.contributorNames || {}) } as Record<string, string>;
        if (!contributions[uid]) delete contributorNames[uid];
        const nextCurrent = Object.values(contributions).reduce((sum, item) => sum + Math.max(0, Number(item) || 0), 0);
        transaction.update(ref, { currentAmount: nextCurrent, contributions, contributorNames, updatedAt: Date.now() });
      });
      resetEditor(); setMessage(`Your manual contribution to ${selected.name} was deleted.`);
    } catch (e: any) { setMessage(e?.message || 'Could not delete the contribution.'); } finally { setBusy(false); }
  };

  const editTransaction = async (expense: Expense) => {
    const nextValue = window.prompt(`Update contribution for ${expense.title}`, String(expense.amount));
    if (nextValue === null) return;
    const value = Number(nextValue);
    if (!Number.isFinite(value) || value <= 0) { setMessage('Enter a valid positive amount.'); return; }
    const availableForThisTransaction = remaining + Number(expense.amount || 0);
    if (value > availableForThisTransaction) { setMessage(`Maximum contribution for this transaction is ${formatCurrency(availableForThisTransaction)}.`); return; }
    setBusy(true); setMessage('');
    try {
      await saveExpense(uid, { ...expense, amount: Math.round(value * 100) / 100 }, expense);
      setMessage(`${formatCurrency(value)} contribution saved for ${expense.title}.`);
    } catch (e: any) { setMessage(e?.message || 'Could not update the transaction.'); } finally { setBusy(false); }
  };

  const deleteTransaction = async (expense: Expense) => {
    if (!window.confirm(`Delete the ${formatCurrency(Number(expense.amount) || 0)} investment transaction “${expense.title}”? This will also remove its contribution from the family goal.`)) return;
    setBusy(true); setMessage('');
    try {
      await removeExpense(uid, expense.id, expense);
      setMessage(`Transaction “${expense.title}” was deleted and the family contribution was reversed.`);
    } catch (e: any) { setMessage(e?.message || 'Could not delete the transaction.'); } finally { setBusy(false); }
  };

  const startManualEdit = () => { setAmount(String(manualContribution)); setEditingManual(true); setMessage(''); };

  return <section className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/40 p-4 sm:p-5 shadow-sm">
    <div className="flex items-start gap-3"><div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Target className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Family Goals</p><h3 className="mt-1 text-lg font-bold text-slate-900">Contribute from your dashboard</h3><p className="mt-1 text-xs sm:text-sm text-slate-500">Transaction-linked investments stay connected to your personal expense record.</p></div></div>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2"><select value={goalId} onChange={e => { setGoalId(e.target.value); resetEditor(); }} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold">{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.name} · {formatCurrency(Number(goal.currentAmount) || 0)} / {formatCurrency(Number(goal.targetAmount) || 0)}</option>)}</select><input type="number" min="1" max={editingManual ? maxManualContribution || undefined : remaining || undefined} value={amount} onChange={e => setAmount(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm" placeholder={editingManual ? 'Manual contribution' : 'Contribution'} /><div className="flex gap-2"><button type="button" disabled={busy || (!editingManual && remaining <= 0)} onClick={() => void saveManualContribution()} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{busy ? 'Saving…' : editingManual ? 'Update' : 'Contribute'}</button>{editingManual && <button type="button" disabled={busy} onClick={resetEditor} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50">Cancel</button>}</div></div>
    {selected && <div className="mt-3 rounded-xl bg-white border border-slate-100 p-3"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p className="text-[10px] text-slate-400">Your contribution</p><p className="text-sm font-bold text-slate-900">{formatCurrency(myContribution)}</p></div><div className="text-left sm:text-right"><p className="text-[10px] text-slate-400">Family goal remaining</p><p className="text-sm font-bold text-emerald-700">{formatCurrency(remaining)}</p></div></div>
      {familyTransactions.length > 0 && <div className="mt-3 border-t border-slate-100 pt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Linked investment transactions</p><div className="mt-2 space-y-2">{familyTransactions.map(expense => <div key={expense.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{expense.title}</p><p className="text-[10px] text-slate-400">{expense.date} · {expense.investmentType || 'Investment'}</p></div><p className="text-xs font-bold text-slate-900">{formatCurrency(Number(expense.amount) || 0)}</p><button type="button" disabled={busy} onClick={() => void editTransaction(expense)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40"><Pencil className="h-3 w-3" /> Edit</button><button type="button" disabled={busy} onClick={() => void deleteTransaction(expense)} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-600 disabled:opacity-40"><Trash2 className="h-3 w-3" /> Delete</button></div>)}</div></div>}
      {manualContribution > 0 && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 bg-white p-2.5"><div><p className="text-[10px] text-slate-400">Manual contribution</p><p className="text-xs font-bold text-slate-800">{formatCurrency(manualContribution)}</p></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={startManualEdit} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-40"><Pencil className="h-3 w-3" /> Edit</button><button type="button" disabled={busy} onClick={() => void deleteManualContribution()} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1.5 text-[10px] font-semibold text-rose-600 disabled:opacity-40"><Trash2 className="h-3 w-3" /> Delete</button></div></div>}
    </div>}
    {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
  </section>;
}
