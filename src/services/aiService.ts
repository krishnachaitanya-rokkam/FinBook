import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'us-central1');

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

const getUsageCall = httpsCallable<void, AIUsage>(functions, 'getAIUsage');
const askCall = httpsCallable<
  { question: string; context: AIContext },
  { answer: string; usage: AIUsage }
>(functions, 'askAIAdvisor');

export async function getAIUsage(): Promise<AIUsage> {
  const result = await getUsageCall();
  return result.data;
}

export async function askAIAdvisor(question: string, context: AIContext) {
  const result = await askCall({ question, context });
  return result.data;
}
