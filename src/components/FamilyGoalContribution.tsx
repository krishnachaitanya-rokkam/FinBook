import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { firebaseAuth, firestore } from '../services/firebase';
import { formatCurrency } from '../utils/formatters';

type Goal = { id: string; name: string; targetAmount: number; currentAmount?: number; contributions?: Record<string, number>; contributorNames?: Record<string, string> };
const goalsCollection = (familyId: string) => collection(firestore, 'families', familyId, 'goals');
const goalDoc = (familyId: string, goalId: string) => doc(firestore, 'families', familyId, 'goals', goalId);

export function FamilyGoalContribution() {
  const uid = firebaseAuth.currentUser?.uid || '';
  const [familyId, setFamilyId] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalId, setGoalId] = useState('');
  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { if (!uid) return; return onSnapshot(doc(firestore, 'users', uid, 'family', 'link'), snap => setFamilyId(String(snap.data()?.familyId || ''))); }, [uid]);
  useEffect(() => { if (!familyId) { setGoals([]); setGoalId(''); return; } return onSnapshot(goalsCollection(familyId), snap => { const next = snap.docs.map(item => ({ id: item.id, ...(item.data() as Omit<Goal, 'id'>) })); setGoals(next); setGoalId(current => current && next.some(g => g.id === current) ? current : next[0]?.id || ''); }); }, [familyId]);
  if (!familyId || !goals.length) return null;
  const selected = goals.find(g => g.id === goalId);
  const current = Math.max(0, Number(selected?.currentAmount) || 0);
  const myContribution = Math.max(0, Number(selected?.contributions?.[uid]) || 0);
  const remaining = Math.max(0, Number(selected?.targetAmount || 0) - current);
  const maxEditableContribution = remaining + myContribution;

  const resetContributionEditor = () => { setAmount(''); setEditing(false); setMessage(''); };

  const saveContribution = async () => {
    const wasEditing = editing;
    const value = Number(amount);
    if (!selected || !uid || !Number.isFinite(value) || value <= 0) { setMessage('Enter a valid contribution.'); return; }
    if (wasEditing ? value > maxEditableContribution : value > remaining) { setMessage(`Maximum contribution for this goal is ${formatCurrency(wasEditing ? maxEditableContribution : remaining)}.`); return; }
    setBusy(true); setMessage('');
    try {
      await runTransaction(firestore, async transaction => {
        const ref = goalDoc(familyId, selected.id); const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Family goal no longer exists.');
        const data = snap.data() as Goal;
        const contributions = { ...(data.contributions || {}) };
        contributions[uid] = wasEditing ? value : (Number(contributions[uid]) || 0) + value;
        const contributorNames = { ...(data.contributorNames || {}) };
        contributorNames[uid] = firebaseAuth.currentUser?.displayName || firebaseAuth.currentUser?.email?.split('@')[0] || 'You';
        const nextCurrent = Object.values(contributions).reduce((sum, item) => sum + (Number(item) || 0), 0);
        transaction.update(ref, { currentAmount: nextCurrent, contributions, contributorNames, updatedAt: Date.now() });
      });
      setAmount('');
      setEditing(false);
      setMessage(wasEditing ? `${formatCurrency(value)} is now your contribution to ${selected.name}.` : `${formatCurrency(value)} added to ${selected.name}.`);
    } catch (e: any) { setMessage(e?.message || 'Could not save the contribution.'); } finally { setBusy(false); }
  };

  const deleteContribution = async () => {
    if (!selected || !uid || myContribution <= 0) return;
    if (!window.confirm(`Delete your ${formatCurrency(myContribution)} contribution to ${selected.name}?`)) return;
    setBusy(true); setMessage('');
    try {
      await runTransaction(firestore, async transaction => {
        const ref = goalDoc(familyId, selected.id); const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Family goal no longer exists.');
        const data = snap.data() as Goal;
        const contributions = { ...(data.contributions || {}) };
        delete contributions[uid];
        const contributorNames = { ...(data.contributorNames || {}) };
        delete contributorNames[uid];
        const nextCurrent = Object.values(contributions).reduce((sum, item) => sum + (Number(item) || 0), 0);
        transaction.update(ref, { currentAmount: nextCurrent, contributions, contributorNames, updatedAt: Date.now() });
      });
      resetContributionEditor();
      setMessage(`Your contribution to ${selected.name} was deleted.`);
    } catch (e: any) { setMessage(e?.message || 'Could not delete the contribution.'); } finally { setBusy(false); }
  };

  const startEdit = () => { setAmount(String(myContribution)); setEditing(true); setMessage(''); };

  return <section className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/40 p-4 sm:p-5 shadow-sm"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Target className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Family Goals</p><h3 className="mt-1 text-lg font-bold text-slate-900">Contribute from your dashboard</h3><p className="mt-1 text-xs sm:text-sm text-slate-500">Your contribution updates the shared family goal and your member total. It does not expose your other transactions.</p></div></div><div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2"><select value={goalId} onChange={e => { setGoalId(e.target.value); resetContributionEditor(); }} className="rounded-xl border bg-white px-3 py-2.5 text-sm font-semibold">{goals.map(goal => <option key={goal.id} value={goal.id}>{goal.name} · {formatCurrency(Number(goal.currentAmount) || 0)} / {formatCurrency(Number(goal.targetAmount) || 0)}</option>)}</select><input type="number" min="1" max={editing ? maxEditableContribution || undefined : remaining || undefined} value={amount} onChange={e => setAmount(e.target.value)} className="rounded-xl border bg-white px-3 py-2.5 text-sm" placeholder={editing ? 'Your contribution' : 'Contribution'} /><div className="flex gap-2"><button type="button" disabled={busy || (!editing && remaining <= 0)} onClick={() => void saveContribution()} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{busy ? 'Saving…' : editing ? 'Update' : 'Contribute'}</button>{editing && <button type="button" disabled={busy} onClick={resetContributionEditor} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 disabled:opacity-50">Cancel</button>}</div></div>{selected && <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-white border border-slate-100 p-3"><div><p className="text-[10px] text-slate-400">Your contribution</p><p className="text-sm font-bold text-slate-900">{formatCurrency(myContribution)}</p></div><div className="flex items-center gap-2 sm:ml-auto"><button type="button" disabled={busy || myContribution <= 0} onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><Pencil className="h-3.5 w-3.5" /> Edit</button><button type="button" disabled={busy || myContribution <= 0} onClick={() => void deleteContribution()} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Delete</button></div><div className="text-left sm:text-right"><p className="text-[10px] text-slate-400">Family goal remaining</p><p className="text-sm font-bold text-emerald-700">{formatCurrency(remaining)}</p></div></div>}{message && <p className="mt-2 text-xs text-slate-600">{message}</p>}</section>;
}
