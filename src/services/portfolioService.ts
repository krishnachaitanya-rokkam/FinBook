import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';

export interface PortfolioField { id: string; label: string; amount: number; color: string; }
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
export function getEffectivePortfolioFields(config: PortfolioConfig): PortfolioField[] {
  const fields = config.fields || [];
  const holdings = config.holdings || [];
  return fields.map(field => {
    if (field.id !== 'mutual-funds' && field.id !== 'stocks') return field;
    const assetType = field.id === 'mutual-funds' ? 'mutual-fund' : 'stock';
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
export function subscribeToPortfolio(uid: string, onChange: (config: PortfolioConfig) => void, onError?: (error: Error) => void): () => void {
  return onSnapshot(portfolioDoc(uid), snapshot => {
    const data = snapshot.data() as Partial<PortfolioConfig> | undefined;
    const fields = Array.isArray(data?.fields) ? data!.fields : DEFAULT_PORTFOLIO_FIELDS;
    const netWorthItems = Array.isArray(data?.netWorthItems) ? data!.netWorthItems : [];
    const goals = Array.isArray(data?.goals) ? data!.goals : [];
    const holdings = Array.isArray(data?.holdings) ? data!.holdings : [];
    onChange({
      fields: fields.map(field => ({ id: String(field.id), label: String(field.label), amount: Number(field.amount) || 0, color: String(field.color || '#4f46e5') })),
      netWorthItems: netWorthItems.map(item => ({ id: String(item.id), label: String(item.label), amount: Number(item.amount) || 0, kind: item.kind === 'liability' ? 'liability' : 'asset', type: String(item.type || 'Other') })),
      goals: goals.map(goal => {
        const type = goal.type === 'investment' ? 'investment' : 'savings';
        return { id: String(goal.id), name: String(goal.name), targetAmount: Number(goal.targetAmount) || 0, currentAmount: Number(goal.currentAmount) || 0, targetDate: String(goal.targetDate || ''), monthlyContribution: Number(goal.monthlyContribution) || 0, type, scope: goal.scope === 'family' ? 'family' : 'personal', expectedAnnualReturn: normalizeReturn((goal as any).expectedAnnualReturn, type), familyId: goal.familyId ? String(goal.familyId) : undefined, familyName: goal.familyName ? String(goal.familyName) : undefined };
      }),
      holdings: holdings.map(item => ({ id: String(item.id), assetType: item.assetType === 'stock' ? 'stock' : 'mutual-fund', name: String(item.name), schemeCode: item.schemeCode ? String(item.schemeCode) : undefined, units: Number(item.units) || 0, investedAmount: Number(item.investedAmount) || 0, currentPrice: Number(item.currentPrice) || 0, currentValue: Number(item.currentValue) || ((Number(item.units) || 0) * (Number(item.currentPrice) || 0)), lastUpdatedAt: Number(item.lastUpdatedAt) || Date.now(), navDate: item.navDate ? String(item.navDate) : undefined, source: item.source === 'automatic' ? 'automatic' : 'manual', goalId: item.goalId ? String(item.goalId) : undefined })),
    });
  }, error => onError?.(error));
}
export async function savePortfolio(uid: string, config: PortfolioConfig): Promise<void> {
  const fields = config.fields.map(field => ({ id: field.id, label: field.label.trim(), amount: Number(field.amount) || 0, color: field.color }));
  const netWorthItems = (config.netWorthItems || []).map(item => ({ id: item.id, label: item.label.trim(), amount: Number(item.amount) || 0, kind: item.kind, type: item.type }));
  const goals = (config.goals || []).map(goal => ({ id: goal.id, name: goal.name.trim(), targetAmount: Number(goal.targetAmount) || 0, currentAmount: Number(goal.currentAmount) || 0, monthlyContribution: Number(goal.monthlyContribution) || 0, targetDate: goal.targetDate, type: goal.type === 'investment' ? 'investment' : 'savings', scope: goal.scope === 'family' ? 'family' : 'personal', expectedAnnualReturn: normalizeReturn(goal.expectedAnnualReturn, goal.type), ...(goal.familyId ? { familyId: goal.familyId } : {}), ...(goal.familyName ? { familyName: goal.familyName } : {}) }));
  const holdings = (config.holdings || []).map(item => ({ id: item.id, assetType: item.assetType === 'stock' ? 'stock' : 'mutual-fund', name: item.name.trim(), ...(item.schemeCode ? { schemeCode: item.schemeCode } : {}), units: Number(item.units) || 0, investedAmount: Number(item.investedAmount) || 0, currentPrice: Number(item.currentPrice) || 0, currentValue: (Number(item.units) || 0) * (Number(item.currentPrice) || 0), lastUpdatedAt: Number(item.lastUpdatedAt) || Date.now(), ...(item.navDate ? { navDate: item.navDate } : {}), source: item.source === 'automatic' ? 'automatic' : 'manual', ...(item.goalId ? { goalId: item.goalId } : {}) }));
  await setDoc(portfolioDoc(uid), { fields, netWorthItems, goals, holdings });
}
