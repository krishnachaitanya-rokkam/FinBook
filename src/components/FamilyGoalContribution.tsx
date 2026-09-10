import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { Plus, Target } from 'lucide-react';
import { firebaseAuth, firestore } from '../services/firebase';
import { formatCurrency } from '../utils/formatters';

type Goal = { id: string; name: string; targetAmount: number; currentAmount?: number; contributions?: Record<string, number>; investmentContributions?: Record<string, number> };
const goalsCollection = (familyId: string) => collection(firestore, 'families', familyId, 'goals');
const goalDoc = (familyId: string, goalId: string) => doc(firestore, 'families', familyId, 'goals', goalId);
const totalForGoal = (contributions: Record<string, number> = {}, investments: Record<string, number> = {}) => Object.values(contributions).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0) + Object.values(investments).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0);

export function FamilyGoalContribution() {
  const uid = firebaseAuth.currentUser?.uid || '';
  const [familyId, setFamilyId] = useState('');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyGoal, setBusyGoal] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(firestore, 'users', uid, 'family', 'link'), snap => setFamilyId(String(snap.data()?.familyId || '')));
  }, [uid]);

  // This is intentionally a full family-goal list, not a single selected goal.
  // The Family section and Portfolio section both read the same canonical family goal collection.
  useEffect(() => {
    if (!familyId) { setGoals([]); return; }
    return onSnapshot(goalsCollection(familyId), snap => {
      setGoals(snap.docs.map(item => ({ id: item.id, ...(item.data() as Omit<Goal, 'id'>) })));
    }, error => {
      console.error('Family goals live read failed:', error);
      setGoals([]);
      setMessage('Could not load family goals.');
    });
  }, [familyId]);

  const orderedGoals = useMemo(() => [...goals].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [goals]);

  const contribute = async (goal: Goal) => {
    const value = Number(amounts[goal.id]);
    if (!uid || !familyId || !Number.isFinite(value) || value <= 0) { setMessage('Enter a valid contribution.'); return; }
    const current = Math.max(0, Number(goal.currentAmount) || 0);
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    if (value > Math.max(0, target - current)) { setMessage(`Contribution cannot exceed ${formatCurrency(Math.max(0, target - current))} for ${goal.name}.`); return; }
    setBusyGoal(goal.id); setMessage('');
    try {
      await runTransaction(firestore, async transaction => {
        const ref = goalDoc(familyId, goal.id);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error('Family goal no longer exists.');
        const data = snap.data() as Goal;
        const contributions = { ...(data.contributions || {}) } as Record<string, number>;
        contributions[uid] = (Number(contributions[uid]) || 0) + value;
        transaction.update(ref, {
          currentAmount: totalForGoal(contributions, data.investmentContributions || {}),
          contributions,
          updatedAt: Date.now()
        });
      });
      setAmounts(current => ({ ...current, [goal.id]: '' }));
      setMessage(`${formatCurrency(value)} added to ${goal.name}.`);
    } catch (error: any) {
      setMessage(error?.message || 'Could not save the contribution.');
    } finally {
      setBusyGoal('');
    }
  };

  if (!familyId || !orderedGoals.length) return null;

  return <section className="mt-5 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-cyan-50/40 p-4 sm:p-5 shadow-sm">
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Target className="h-5 w-5" /></div>
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Family Goals</p><h3 className="mt-1 text-lg font-bold text-slate-900">Your family goals</h3><p className="mt-1 text-xs sm:text-sm text-slate-500">All goals created in the Family section are shown here. You can contribute to any goal from your individual dashboard.</p></div>
    </div>

    <div className="mt-4 space-y-3">
      {orderedGoals.map(goal => {
        const current = Math.max(0, Number(goal.currentAmount) || 0);
        const target = Math.max(1, Number(goal.targetAmount) || 1);
        const progress = Math.min(100, Math.round(current / target * 100));
        const myInvestment = Math.max(0, Number(goal.investmentContributions?.[uid]) || 0);
        const myManual = Math.max(0, Number(goal.contributions?.[uid]) || 0);
        const remaining = Math.max(0, target - current);
        return <div key={goal.id} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-600 shrink-0" /><h4 className="font-bold text-slate-900 truncate">{goal.name}</h4></div><p className="mt-1 text-xs text-slate-500">{formatCurrency(current)} of {formatCurrency(target)} contributed</p></div>
            <span className="text-sm font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} /></div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">Your contribution</p><p className="text-sm font-bold text-slate-900">{formatCurrency(myManual)}</p></div>
            <div className="rounded-lg bg-indigo-50 p-2.5"><p className="text-[10px] text-indigo-500">Your linked investments</p><p className="text-sm font-bold text-indigo-700">{formatCurrency(myInvestment)}</p></div>
            <div className="rounded-lg bg-emerald-50 p-2.5"><p className="text-[10px] text-emerald-600">Remaining</p><p className="text-sm font-bold text-emerald-700">{formatCurrency(remaining)}</p></div>
          </div>
          {remaining > 0 && <div className="mt-3 flex gap-2"><input type="number" min="1" max={remaining} value={amounts[goal.id] || ''} onChange={e => setAmounts(currentAmounts => ({ ...currentAmounts, [goal.id]: e.target.value }))} className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm" placeholder="Contribution" /><button type="button" disabled={busyGoal === goal.id} onClick={() => void contribute(goal)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{busyGoal === goal.id ? 'Saving…' : 'Contribute'}</button></div>}
        </div>;
      })}
    </div>
    {message && <p className="mt-3 text-xs text-slate-600">{message}</p>}
  </section>;
}
