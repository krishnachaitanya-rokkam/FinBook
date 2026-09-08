import type { Application, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const MONTHLY_LIMIT = 100;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

type Usage = {
  month: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  failedRequests: number;
  lastUsedAt: number | null;
};

const usageByUser = new Map<string, Usage>();

const monthKey = () => new Date().toISOString().slice(0, 7);

function getUsage(userId: string): Usage {
  const month = monthKey();
  const current = usageByUser.get(userId);
  if (!current || current.month !== month) {
    const fresh: Usage = {
      month,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      failedRequests: 0,
      lastUsedAt: null,
    };
    usageByUser.set(userId, fresh);
    return fresh;
  }
  return current;
}

function usageResponse(userId: string) {
  const usage = getUsage(userId);
  return {
    success: true,
    plan: 'Free',
    model: MODEL,
    limit: MONTHLY_LIMIT,
    used: usage.requests,
    remaining: Math.max(0, MONTHLY_LIMIT - usage.requests),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    failedRequests: usage.failedRequests,
    month: usage.month,
    lastUsedAt: usage.lastUsedAt,
  };
}

function buildPrompt(question: string, context: Record<string, unknown>) {
  return `You are AHVIQ, a personal money cockpit. Answer the user's question using ONLY the financial snapshot supplied below. Do not invent transactions, balances, investments, bills, or goals. If the data is insufficient, say so clearly. Give practical, concise guidance. Do not present regulated financial advice as certainty. Use Indian rupee amounts when currency is provided.\n\nFinancial snapshot:\n${JSON.stringify(context, null, 2)}\n\nUser question:\n${question}\n\nResponse requirements:\n- Start with the direct answer.\n- Explain the key numbers briefly.\n- Give 1-3 practical next steps when useful.\n- Keep the response under 180 words.`;
}

export function registerAIAdvisorRoutes(app: Application) {
  app.get('/api/ai/usage', (req: Request, res: Response) => {
    const userId = String(req.query.userId || 'anonymous').slice(0, 128);
    res.json(usageResponse(userId));
  });

  app.post('/api/ai/advisor', async (req: Request, res: Response) => {
    const userId = String(req.body?.userId || 'anonymous').slice(0, 128);
    const question = String(req.body?.question || '').trim().slice(0, 1000);
    const context = (req.body?.context || {}) as Record<string, unknown>;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required.' });
    }

    const usage = getUsage(userId);
    if (usage.requests >= MONTHLY_LIMIT) {
      return res.status(429).json({
        success: false,
        error: 'Your AHVIQ Free AI allowance is used for this month.',
        usage: usageResponse(userId),
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: 'AI is not configured on the server yet. Add GEMINI_API_KEY to the server environment.',
        usage: usageResponse(userId),
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: buildPrompt(question, context),
        config: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      });

      const answer = response.text?.trim() || 'I could not generate an answer from the available financial data.';
      const metadata = response.usageMetadata as Record<string, unknown> | undefined;
      const inputTokens = Number(metadata?.promptTokenCount || 0);
      const outputTokens = Number(metadata?.candidatesTokenCount || 0);

      usage.requests += 1;
      usage.inputTokens += inputTokens;
      usage.outputTokens += outputTokens;
      usage.lastUsedAt = Date.now();

      return res.json({
        success: true,
        answer,
        usage: usageResponse(userId),
      });
    } catch (error: any) {
      usage.failedRequests += 1;
      return res.status(502).json({
        success: false,
        error: error?.message || 'The AI service could not answer right now.',
        usage: usageResponse(userId),
      });
    }
  });
}
