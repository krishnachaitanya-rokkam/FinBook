import { jwtVerify, createRemoteJWKSet } from 'jose';

const MODEL = 'gemini-3.1-flash-lite';
const MONTHLY_LIMIT = 100;
const FIREBASE_PROJECT_ID = 'expense-tracker-8745f';
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_KEYS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);
const ALLOWED_ORIGIN = 'https://krishnachaitanya-rokkam.github.io';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function usagePayload(row = {}) {
  const used = Number(row.used || 0);
  return {
    success: true,
    plan: 'Free',
    model: MODEL,
    limit: MONTHLY_LIMIT,
    used,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    inputTokens: Number(row.input_tokens || 0),
    outputTokens: Number(row.output_tokens || 0),
    failedRequests: Number(row.failed_requests || 0),
    month: monthKey(),
    lastUsedAt: row.last_used_at || null,
  };
}

async function authenticate(request) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) throw new Error('UNAUTHENTICATED');
  const token = header.slice(7).trim();
  if (!token) throw new Error('UNAUTHENTICATED');
  const { payload } = await jwtVerify(token, FIREBASE_KEYS, {
    issuer: FIREBASE_ISSUER,
    audience: FIREBASE_PROJECT_ID,
    algorithms: ['RS256'],
  });
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('UNAUTHENTICATED');
  return payload.sub;
}

async function getUsage(env, uid) {
  const row = await env.DB.prepare(
    'SELECT used, input_tokens, output_tokens, failed_requests, last_used_at FROM ai_usage WHERE uid = ? AND month = ?'
  ).bind(uid, monthKey()).first();
  return row || {};
}

async function reserveCredit(env, uid) {
  const row = await env.DB.prepare(
    'INSERT INTO ai_usage (uid, month, used, input_tokens, output_tokens, failed_requests, last_used_at) VALUES (?, ?, 1, 0, 0, 0, ?) ON CONFLICT(uid, month) DO UPDATE SET used = used + 1, last_used_at = excluded.last_used_at WHERE used < ? RETURNING used, input_tokens, output_tokens, failed_requests, last_used_at'
  ).bind(uid, monthKey(), Date.now(), MONTHLY_LIMIT).first();

  if (!row) throw new Error('LIMIT');
  return row;
}

async function refundCredit(env, uid) {
  await env.DB.prepare(
    'UPDATE ai_usage SET used = CASE WHEN used > 0 THEN used - 1 ELSE 0 END, failed_requests = failed_requests + 1 WHERE uid = ? AND month = ?'
  ).bind(uid, monthKey()).run();
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

    let uid;
    try {
      uid = await authenticate(request);
    } catch {
      return json({ error: 'Please sign in to use AHVIQ AI.' }, 401, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid request.' }, 400, origin);
    }

    if (body?.action === 'usage') {
      const row = await getUsage(env, uid);
      return json(usagePayload(row), 200, origin);
    }

    if (body?.action !== 'ask') return json({ error: 'Unknown action.' }, 400, origin);

    const question = String(body?.question || '').trim();
    const context = body?.context && typeof body.context === 'object' ? body.context : {};
    if (!question) return json({ error: 'Please enter a question.' }, 400, origin);
    if (question.length > 500) return json({ error: 'Question is too long. Please keep it under 500 characters.' }, 400, origin);

    let reserved = false;
    try {
      await reserveCredit(env, uid);
      reserved = true;

      const prompt = `You are AHVIQ, a personal money cockpit assistant. Give concise, practical, non-regulated financial guidance based only on the user's supplied financial snapshot. Do not invent balances, transactions, investments, debts, or facts that are not present. If the question needs missing information, say what is missing. Avoid definitive investment, tax, lending, or legal instructions.\n\nFinancial snapshot:\n${JSON.stringify(context)}\n\nUser question:\n${question}\n\nAnswer in 2-5 short paragraphs or bullets. Include a concrete next step when useful.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(`Gemini ${response.status}`);
      const answer = String(
        data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
      ).trim();
      if (!answer) throw new Error('EMPTY_RESPONSE');

      const inputTokens = Number(data?.usageMetadata?.promptTokenCount || 0);
      const outputTokens = Number(data?.usageMetadata?.candidatesTokenCount || 0);
      await env.DB.prepare(
        'UPDATE ai_usage SET input_tokens = input_tokens + ?, output_tokens = output_tokens + ?, last_used_at = ? WHERE uid = ? AND month = ?'
      ).bind(inputTokens, outputTokens, Date.now(), uid, monthKey()).run();

      const finalRow = await getUsage(env, uid);
      return json({ answer, usage: usagePayload(finalRow) }, 200, origin);
    } catch (error) {
      if (reserved) {
        try { await refundCredit(env, uid); } catch (_) {}
      }
      if (error?.message === 'LIMIT') {
        const row = await getUsage(env, uid);
        return json({ error: 'Your AHVIQ free AI allowance is used up for this month.', usage: usagePayload(row) }, 429, origin);
      }
      console.error('AHVIQ AI error:', error);
      return json({ error: 'AHVIQ AI could not complete the request. Your credit was returned.' }, 500, origin);
    }
  },
};
