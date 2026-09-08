const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { GoogleGenAI } = require('@google/genai');

initializeApp();
const db = getFirestore();
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const MONTHLY_LIMIT = 100;
const MODEL = 'gemini-2.5-flash-lite';

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function usageRef(uid) {
  return db.collection('aiUsage').doc(`${uid}_${monthKey()}`);
}

function usagePayload(data = {}) {
  const used = Number(data.used || 0);
  return {
    success: true,
    plan: 'Free',
    model: MODEL,
    limit: MONTHLY_LIMIT,
    used,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    inputTokens: Number(data.inputTokens || 0),
    outputTokens: Number(data.outputTokens || 0),
    failedRequests: Number(data.failedRequests || 0),
    month: monthKey(),
    lastUsedAt: data.lastUsedAt || null,
  };
}

exports.getAIUsage = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Please sign in to use AHVIQ AI.');
  }

  const snap = await usageRef(request.auth.uid).get();
  return usagePayload(snap.exists ? snap.data() : {});
});

exports.askAIAdvisor = onCall({
  region: 'us-central1',
  secrets: [GEMINI_API_KEY],
  enforceAppCheck: false,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Please sign in to use AHVIQ AI.');
  }

  const question = String(request.data?.question || '').trim();
  const context = request.data?.context || {};

  if (!question) {
    throw new HttpsError('invalid-argument', 'Please enter a question.');
  }
  if (question.length > 500) {
    throw new HttpsError('invalid-argument', 'Question is too long. Please keep it under 500 characters.');
  }

  const ref = usageRef(request.auth.uid);
  let reserved = false;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? snap.data() : {};
      const used = Number(current.used || 0);
      if (used >= MONTHLY_LIMIT) {
        throw new HttpsError('resource-exhausted', 'Your AHVIQ free AI allowance is used up for this month.', usagePayload(current));
      }
      tx.set(ref, {
        used: used + 1,
        inputTokens: Number(current.inputTokens || 0),
        outputTokens: Number(current.outputTokens || 0),
        failedRequests: Number(current.failedRequests || 0),
        month: monthKey(),
        lastUsedAt: Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      reserved = true;
    });

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const prompt = `You are AHVIQ, a personal money cockpit assistant. Give concise, practical, non-regulated financial guidance based only on the user's supplied financial snapshot. Do not invent balances, transactions, investments, debts, or facts that are not present. If the question needs missing information, say what is missing. Avoid definitive investment, tax, lending, or legal instructions.\n\nFinancial snapshot:\n${JSON.stringify(context)}\n\nUser question:\n${question}\n\nAnswer in 2-5 short paragraphs or bullets. Include a concrete next step when useful.`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    });

    const answer = String(response.text || '').trim();
    if (!answer) throw new Error('Gemini returned an empty response.');

    const usage = response.usageMetadata || {};
    const inputTokens = Number(usage.promptTokenCount || 0);
    const outputTokens = Number(usage.candidatesTokenCount || 0);

    await ref.set({
      inputTokens: FieldValue.increment(inputTokens),
      outputTokens: FieldValue.increment(outputTokens),
      lastUsedAt: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    const finalSnap = await ref.get();
    return { answer, usage: usagePayload(finalSnap.data()) };
  } catch (error) {
    if (reserved) {
      try {
        await ref.set({
          used: FieldValue.increment(-1),
          failedRequests: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      } catch (_) {}
    }

    if (error instanceof HttpsError) throw error;
    console.error('AHVIQ AI error:', error);
    throw new HttpsError('internal', 'AHVIQ AI could not complete the request. Your credit was returned.');
  }
});
