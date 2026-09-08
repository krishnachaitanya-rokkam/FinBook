import { firebaseAuth } from './firebase';

export type AIUsage = {
  success: boolean;
  plan: string;
  model: string;
  limit: number;
  used: number;
  remaining: number;
  inputTokens: number;
  outputTokens: number;
  failedRequests: number;
  month: string;
  lastUsedAt: number | null;
};

export type AIContext = {
  available: number;
  income: number;
  spent: number;
  budget: number;
  budgetRemaining: number;
  upcomingBills: number;
  savingsRate: number;
};

const AI_API_URL = import.meta.env.VITE_AI_API_URL || '';

type AIError = Error & { details?: AIUsage };

async function callAI<T>(payload: unknown): Promise<T> {
  if (!AI_API_URL) {
    throw new Error('AHVIQ AI backend is not configured yet.');
  }

  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Please sign in to use AHVIQ AI.');
  }

  const token = await user.getIdToken();
  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'AHVIQ AI request failed.') as AIError;
    if (data?.usage) error.details = data.usage;
    throw error;
  }
  return data as T;
}

export async function getAIUsage(): Promise<AIUsage> {
  return callAI<AIUsage>({ action: 'usage' });
}

export async function askAIAdvisor(question: string, context: AIContext) {
  return callAI<{ answer: string; usage: AIUsage }>({
    action: 'ask',
    question,
    context,
  });
}
