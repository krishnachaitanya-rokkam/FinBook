import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';

export interface PortfolioField { id: string; label: string; amount: number; color: string; goalId?: string; goalScope?: GoalScope; goalFamilyId?: string; }
export interface NetWorthItem { id: string; label: string; amount: number; kind: 'asset' | 'liability'; type: string; }
export type GoalType = 'savings' | 'investment';
export type GoalScope = 'personal' | 'family';
export interface InvestmentHolding {
  id: string;
  assetType: 'mutual-fund' | 'stock';
  name: string;
  schemeCode?: string;
  units: number;
  investedAmount: number;
  currentPrice: number;
  currentValue: number;
  lastUpdatedAt: number;
  navDate?: string;
  source?: 'manual' | 'automatic';
  goalId?: string;
  goalScope?: GoalScope;
  goalFamilyId?: string;
}
export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  type: GoalType;
  scope: GoalScope;
  expectedAnnualReturn?: number;
  familyId?: string;
  familyName?: string;
}
export interface PortfolioConfig { fields: PortfolioField[]; netWorthItems?: NetWorthItem[]; goals?: FinancialGoal[]; holdings?: InvestmentHolding[]; }
export function getHoldingAssetType(field: PortfolioField): 'mutual-fund' | 'stock' | null {
  const id = String(field.id || '').toLowerCase().replace(/[_\s]+/g, '-');
  const label = String(field.label || '').toLowerCase().replace(/[_\s]+/g, '-');
  if (id === 'mutual-funds' || id === 'mutual-fund' || id === 'mutualfunds' || label === 'mutual-funds' || label === 'mutual-fund') return 'mutual-fund';
  if (id === 'stocks' || id === 'stock' || label === 'stocks' || label === 'stock') return 'stock';
  return null;
}

export function getEffectivePortfolioFields(config: PortfolioConfig): PortfolioField[] {
  const fields = config.fields || [];
  const holdings = config.holdings || [];
  return fields.map(field => {
    const assetType = getHoldingAssetType(field);
    if (!assetType) return field;
    const matching = holdings.filter(item => item.assetType === assetType);
    return {
      ...field,
      amount: matching.reduce((sum, item) => sum + (Number(item.currentValue) || 0), 0),
    };
  });
}

export function getEffectivePortfolioTotal(config: PortfolioConfig): number {
  return getEffectivePortfolioFields(config).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export const DEFAULT_PORTFOLIO_FIELDS: PortfolioField[] = [
  { id: 'ppf', label: 'PPF', amount: 0, color: '#4f46e5' }, { id: 'mutual-funds', label: 'Mutual Funds', amount: 0, color: '#0891b2' }, { id: 'stocks', label: 'Stocks', amount: 0, color: '#0d9488' }, { id: 'epf', label: 'EPF', amount: 0, color: '#16a34a' }, { id: 'nps', label: 'NPS', amount: 0, color: '#d97706' }, { id: 'fixed-deposits', label: 'Fixed Deposits', amount: 0, color: '#db2777' }, { id: 'gold', label: 'Gold', amount: 0, color: '#7c3aed' },
];
const portfolioDoc = (uid: string) => doc(firestore, 'users', uid, 'portfolio', 'config');
const normalizeReturn = (value: unknown, type: GoalType) => type === 'investment' ? Math.min(50, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 8)) : 0;

type FamilyGoalUpdate = { ref: ReturnType<typeof doc>; data: Record<string, unknown> };

async function prepareFamilyGoalInvestmentUpdates(transaction: any, uid: string, previousHoldings: InvestmentHolding[], nextHoldings: InvestmentHolding[]): Promise<FamilyGoalUpdate[]> {
  const keys = Array.from(new Set([
    ...previousHoldings.filter(h => h.goalScope === 'family' && h.goalFamilyId && h.goalId).map(h => `${h.goalFamilyId}/${h.goalId}`),
    ...nextHoldings.filter(h => h.goalScope === 'family' && h.goalFamilyId && h.goalId).map(h => `${h.goalFamilyId}/${h.goalId}`),
  ]));
  const updates: FamilyGoalUpdate[] = [];
  for (const key of keys) {
    const [familyId, goalId] = key.split('/');
    const ref = doc(firestore, 'families', familyId, 'goals', goalId);
    const snap = await transaction.get(ref);
    if (!snap.exists()) continue;
    const data = snap.data() as { contributions?: Record<string, number>; investmentContributions?: Record<string, number> };
    const myInvestmentValue = nextHoldings
      .filter(h => h.goalScope === 'family' && h.goalFamilyId === familyId && h.goalId === goalId)
      .reduce((sum, h) => sum + Math.max(0, Number(h.currentValue) || 0), 0);
    const investmentContributions = { ...(data.investmentContributions || {}) };
    if (myInvestmentValue > 0) investmentContributions[uid] = myInvestmentValue;
    else delete investmentContributions[uid];
    const manualTotal = Object.values(data.contributions || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const investmentTotal = Object.values(investmentContributions).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    updates.push({ ref, data: { investmentContributions, currentAmount: manualTotal + investmentTotal, updatedAt: Date.now() } });
  }
  return updates;
}

export function subscribeToPortfolio(uid: string, onChange: (config: PortfolioConfig) => void, onError?: (error: Error) => void): () => void {
  return onSnapshot(portfolioDoc(uid), snapshot => {
    const data = snapshot.data() as Partial<PortfolioConfig> | undefined;
    const fields = Array.isArray(data?.fields) ? data!.fields : DEFAULT_PORTFOLIO_FIELDS;
    const netWorthItems = Array.isArray(data?.netWorthItems) ? data!.netWorthItems : [];
    const goals = Array.isArray(data?.goals) ? data!.goals : [];
    const holdings = Array.isArray(data?.holdings) ? data!.holdings : [];
    onChange({
      fields: fields.map(field => ({ id: String(field.id), label: String(field.label), amount: Number(field.amount) || 0, color: String(field.color || '#4f46e5'), goalId: field.goalId ? String(field.goalId) : undefined, goalScope: field.goalScope === 'family' ? 'family' : field.goalScope === 'personal' ? 'personal' : undefined, goalFamilyId: field.goalFamilyId ? String(field.goalFamilyId) : undefined })),
      netWorthItems: netWorthItems.map(item => ({ id: String(item.id), label: String(item.label), amount: Number(item.amount) || 0, kind: item.kind === 'liability' ? 'liability' : 'asset', type: String(item.type || 'Other') })),
      goals: goals.map(goal => {
        const type = goal.type === 'investment' ? 'investment' : 'savings';
        return { id: String(goal.id), name: String(goal.name), targetAmount: Number(goal.targetAmount) || 0, currentAmount: Number(goal.currentAmount) || 0, targetDate: String(goal.targetDate || ''), monthlyContribution: Number(goal.monthlyContribution) || 0, type, scope: goal.scope === 'family' ? 'family' : 'personal', expectedAnnualReturn: normalizeReturn((goal as any).expectedAnnualReturn, type), familyId: goal.familyId ? String(goal.familyId) : undefined, familyName: goal.familyName ? String(goal.familyName) : undefined };
      }),
      holdings: holdings.map(item => ({ id: String(item.id), assetType: item.assetType === 'stock' ? 'stock' : 'mutual-fund', name: String(item.name), schemeCode: item.schemeCode ? String(item.schemeCode) : undefined, units: Number(item.units) || 0, investedAmount: Number(item.investedAmount) || 0, currentPrice: Number(item.currentPrice) || ((Number(item.units) || 0) * (Number(item.currentPrice) || 0)), currentValue: Number(item.currentValue) || ((Number(item.units) || 0) * (Number(item.currentPrice) || 0)), lastUpdatedAt: Number(item.lastUpdatedAt) || Date.now(), navDate: item.navDate ? String(item.navDate) : undefined, source: item.source === 'automatic' ? 'automatic' : 'manual', goalId: item.goalId ? String(item.goalId) : undefined, goalScope: item.goalScope === 'family' ? 'family' : item.goalScope === 'personal' ? 'personal' : undefined, goalFamilyId: item.goalFamilyId ? String(item.goalFamilyId) : undefined })),
    });
  }, error => onError?.(error));
}
export async function savePortfolio(uid: string, config: PortfolioConfig): Promise<void> {
  const fields = config.fields.map(field => ({ id: field.id, label: field.label.trim(), amount: Number(field.amount) || 0, color: field.color, ...(field.goalId ? { goalId: field.goalId } : {}), ...(field.goalScope ? { goalScope: field.goalScope } : {}), ...(field.goalFamilyId ? { goalFamilyId: field.goalFamilyId } : {}) }));
  const netWorthItems = (config.netWorthItems || []).map(item => ({ id: item.id, label: item.label.trim(), amount: Number(item.amount) || 0, kind: item.kind, type: item.type }));
  const goals = (config.goals || []).map(goal => ({ id: goal.id, name: goal.name.trim(), targetAmount: Number(goal.targetAmount) || 0, currentAmount: Number(goal.currentAmount) || 0, monthlyContribution: Number(goal.monthlyContribution) || 0, targetDate: goal.targetDate, type: goal.type === 'investment' ? 'investment' : 'savings', scope: goal.scope === 'family' ? 'family' : 'personal', expectedAnnualReturn: normalizeReturn(goal.expectedAnnualReturn, goal.type), ...(goal.familyId ? { familyId: goal.familyId } : {}), ...(goal.familyName ? { familyName: goal.familyName } : {}) }));
  const holdings = (config.holdings || []).map(item => ({ id: item.id, assetType: item.assetType === 'stock' ? 'stock' : 'mutual-fund', name: item.name.trim(), ...(item.schemeCode ? { schemeCode: item.schemeCode } : {}), units: Number(item.units) || 0, investedAmount: Number(item.investedAmount) || 0, currentPrice: (Number(item.currentPrice) || 0), currentValue: (Number(item.units) || 0) * (Number(item.currentPrice) || 0), lastUpdatedAt: Number(item.lastUpdatedAt) || Date.now(), ...(item.navDate ? { navDate: item.navDate } : {}), source: item.source === 'automatic' ? 'automatic' : 'manual', ...(item.goalId ? { goalId: item.goalId } : {}), ...(item.goalScope ? { goalScope: item.goalScope } : {}), ...(item.goalFamilyId ? { goalFamilyId: item.goalFamilyId } : {}) }));
  await runTransaction(firestore, async transaction => {
    const portfolioRef = portfolioDoc(uid);
    const previousSnap = await transaction.get(portfolioRef);
    const previousHoldings = previousSnap.exists() && Array.isArray(previousSnap.data()?.holdings) ? previousSnap.data()!.holdings as InvestmentHolding[] : [];
    const familyGoalUpdates = await prepareFamilyGoalInvestmentUpdates(transaction, uid, previousHoldings, holdings);
    transaction.set(portfolioRef, { fields, netWorthItems, goals, holdings });
    familyGoalUpdates.forEach(update => transaction.update(update.ref, update.data));
  });
}