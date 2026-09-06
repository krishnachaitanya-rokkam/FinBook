import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore } from './firebase';

export interface PortfolioField {
  id: string;
  label: string;
  amount: number;
  color: string;
}

export interface NetWorthItem {
  id: string;
  label: string;
  amount: number;
  kind: 'asset' | 'liability';
  type: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
}

export interface PortfolioConfig {
  fields: PortfolioField[];
  netWorthItems?: NetWorthItem[];
  goals?: FinancialGoal[];
}

export const DEFAULT_PORTFOLIO_FIELDS: PortfolioField[] = [
  { id: 'ppf', label: 'PPF', amount: 0, color: '#4f46e5' },
  { id: 'mutual-funds', label: 'Mutual Funds', amount: 0, color: '#0891b2' },
  { id: 'stocks', label: 'Stocks', amount: 0, color: '#0d9488' },
  { id: 'epf', label: 'EPF', amount: 0, color: '#16a34a' },
  { id: 'nps', label: 'NPS', amount: 0, color: '#d97706' },
  { id: 'fixed-deposits', label: 'Fixed Deposits', amount: 0, color: '#db2777' },
  { id: 'gold', label: 'Gold', amount: 0, color: '#7c3aed' },
];

const portfolioDoc = (uid: string) => doc(firestore, 'users', uid, 'portfolio', 'config');

export function subscribeToPortfolio(
  uid: string,
  onChange: (config: PortfolioConfig) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    portfolioDoc(uid),
    (snapshot) => {
      const data = snapshot.data() as Partial<PortfolioConfig> | undefined;
      const fields = Array.isArray(data?.fields) ? data!.fields : DEFAULT_PORTFOLIO_FIELDS;
      const netWorthItems = Array.isArray(data?.netWorthItems) ? data!.netWorthItems : [];
      const goals = Array.isArray(data?.goals) ? data!.goals : [];
      onChange({
        fields: fields.map((field) => ({
          id: String(field.id),
          label: String(field.label),
          amount: Number(field.amount) || 0,
          color: String(field.color || '#4f46e5'),
        })),
        netWorthItems: netWorthItems.map((item) => ({
          id: String(item.id),
          label: String(item.label),
          amount: Number(item.amount) || 0,
          kind: item.kind === 'liability' ? 'liability' : 'asset',
          type: String(item.type || 'Other'),
        })),
        goals: goals.map((goal) => ({
          id: String(goal.id),
          name: String(goal.name),
          targetAmount: Number(goal.targetAmount) || 0,
          currentAmount: Number(goal.currentAmount) || 0,
          targetDate: String(goal.targetDate || ''),
          monthlyContribution: Number(goal.monthlyContribution) || 0,
        })),
      });
    },
    (error) => onError?.(error),
  );
}

export async function savePortfolio(uid: string, config: PortfolioConfig): Promise<void> {
  const fields = config.fields.map((field) => ({
    id: field.id,
    label: field.label.trim(),
    amount: Number(field.amount) || 0,
    color: field.color,
  }));
  const netWorthItems = (config.netWorthItems || []).map((item) => ({
    id: item.id,
    label: item.label.trim(),
    amount: Number(item.amount) || 0,
    kind: item.kind,
    type: item.type,
  }));
  const goals = (config.goals || []).map((goal) => ({
    id: goal.id,
    name: goal.name.trim(),
    targetAmount: Number(goal.targetAmount) || 0,
    currentAmount: Number(goal.currentAmount) || 0,
    targetDate: goal.targetDate,
    monthlyContribution: Number(goal.monthlyContribution) || 0,
  }));
  await setDoc(portfolioDoc(uid), { fields, netWorthItems, goals });
}
