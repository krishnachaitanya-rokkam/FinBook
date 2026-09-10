import { collection, doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth, firestore } from './firebase';

type Holding = { goalId?: string; goalScope?: 'personal' | 'family'; goalFamilyId?: string; currentValue?: number; units?: number; currentPrice?: number };
type PortfolioField = { id?: string; label?: string; amount?: number; goalId?: string; goalScope?: 'personal' | 'family'; goalFamilyId?: string };
type GoalData = { contributions?: Record<string, number>; investmentContributions?: Record<string, number>; currentAmount?: number };

const familyLinkDoc = (uid: string) => doc(firestore, 'users', uid, 'family', 'link');
const portfolioDoc = (uid: string) => doc(firestore, 'users', uid, 'portfolio', 'config');
const familyGoals = (familyId: string) => collection(firestore, 'families', familyId, 'goals');
const familyGoalDoc = (familyId: string, goalId: string) => doc(firestore, 'families', familyId, 'goals', goalId);
const total = (values: Record<string, number> = {}) => Object.values(values).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
const holdingValue = (h: Holding) => Math.max(0, Number(h.currentValue) || ((Number(h.units) || 0) * (Number(h.currentPrice) || 0)));
const fieldValue = (field: PortfolioField) => Math.max(0, Number(field.amount) || 0);
const sameNumber = (a: unknown, b: unknown) => Math.abs(Number(a) - Number(b)) < 0.01;
const sameMap = (a: Record<string, number> = {}, b: Record<string, number> = {}) => { const keys = new Set([...Object.keys(a), ...Object.keys(b)]); for (const key of keys) if (!sameNumber(a[key] || 0, b[key] || 0)) return false; return true; };

const isHoldingAsset = (field: PortfolioField, asset: 'mutual-fund' | 'stock') => {
  const id = String(field.id || '').toLowerCase().replace(/[_\s]+/g, '-');
  const label = String(field.label || '').toLowerCase().replace(/[_\s]+/g, '-');
  if (asset === 'mutual-fund') return id === 'mutual-funds' || id === 'mutual-fund' || id === 'mutualfunds' || label === 'mutual-funds' || label === 'mutual-fund';
  return id === 'stocks' || id === 'stock' || label === 'stocks' || label === 'stock';
};

// A family goal can receive value from both dedicated holdings (MF/Stocks)
// and manually tracked portfolio categories (PPF/NPS/EPF/FD/Gold/custom).
// Explicit personal tags are always excluded. Legacy records containing only
// goalId are supported because the goal itself belongs to the active family.
const isLinked = (item: { goalId?: string; goalScope?: 'personal' | 'family'; goalFamilyId?: string }, familyId: string, goalId: string) =>
  item.goalId === goalId &&
  item.goalScope !== 'personal' &&
  (!item.goalFamilyId || item.goalFamilyId === familyId);

export function startFamilyGoalInvestmentSync(): () => void {
  let stopFamilyLink = () => {}; let stopPortfolio = () => {}; let stopGoals = () => {};
  let activeUid = ''; let activeFamilyId = ''; let holdings: Holding[] = []; let fields: PortfolioField[] = []; let goals: string[] = []; let running = false; let rerun = false;

  const reconcile = async () => {
    if (!activeUid || !activeFamilyId || !goals.length) return;
    if (running) { rerun = true; return; }
    running = true;
    try {
      for (const goalId of goals) {
        const holdingTotal = holdings
          .filter(h => isLinked(h, activeFamilyId, goalId))
          .reduce((sum, h) => sum + holdingValue(h), 0);
        const otherInvestmentTotal = fields
          .filter(field => !isHoldingAsset(field, 'mutual-fund') && !isHoldingAsset(field, 'stock') && isLinked(field, activeFamilyId, goalId))
          .reduce((sum, field) => sum + fieldValue(field), 0);
        const linkedValue = holdingTotal + otherInvestmentTotal;
        const ref = familyGoalDoc(activeFamilyId, goalId);
        await runTransaction(firestore, async transaction => {
          const snap = await transaction.get(ref);
          if (!snap.exists()) return;
          const data = snap.data() as GoalData;
          const investmentContributions = { ...(data.investmentContributions || {}) };
          if (linkedValue > 0) investmentContributions[activeUid] = linkedValue;
          else delete investmentContributions[activeUid];
          const currentAmount = total(data.contributions || {}) + total(investmentContributions);
          if (sameMap(data.investmentContributions || {}, investmentContributions) && sameNumber(data.currentAmount || 0, currentAmount)) return;
          transaction.update(ref, { investmentContributions, currentAmount, updatedAt: Date.now() });
        });
      }
    } catch (error) {
      console.error('Family goal investment sync failed:', error);
    } finally {
      running = false;
      if (rerun) { rerun = false; void reconcile(); }
    }
  };

  const subscribeForUser = (uid: string) => {
    activeUid = uid;
    stopFamilyLink(); stopPortfolio(); stopGoals();
    stopFamilyLink = () => {}; stopPortfolio = () => {}; stopGoals = () => {};
    stopFamilyLink = onSnapshot(familyLinkDoc(uid), linkSnap => {
      const nextFamilyId = String(linkSnap.data()?.familyId || '');
      if (nextFamilyId === activeFamilyId && nextFamilyId) { void reconcile(); return; }
      activeFamilyId = nextFamilyId;
      holdings = []; fields = []; goals = [];
      stopPortfolio(); stopGoals(); stopPortfolio = () => {}; stopGoals = () => {};
      if (!activeFamilyId) return;
      stopPortfolio = onSnapshot(portfolioDoc(uid), snap => {
        const data = snap.data() || {};
        holdings = Array.isArray(data.holdings) ? data.holdings as Holding[] : [];
        fields = Array.isArray(data.fields) ? data.fields as PortfolioField[] : [];
        void reconcile();
      }, error => console.error('Family goal portfolio sync read failed:', error));
      stopGoals = onSnapshot(familyGoals(activeFamilyId), snap => {
        goals = snap.docs.map(item => item.id);
        void reconcile();
      }, error => console.error('Family goal sync read failed:', error));
    }, error => console.error('Family link sync failed:', error));
  };

  const stopAuth = onAuthStateChanged(firebaseAuth, user => {
    stopFamilyLink(); stopPortfolio(); stopGoals();
    stopFamilyLink = () => {}; stopPortfolio = () => {}; stopGoals = () => {};
    activeUid = user?.uid || ''; activeFamilyId = ''; holdings = []; fields = []; goals = [];
    if (user) subscribeForUser(user.uid);
  });
  return () => { stopAuth(); stopFamilyLink(); stopPortfolio(); stopGoals(); };
}
