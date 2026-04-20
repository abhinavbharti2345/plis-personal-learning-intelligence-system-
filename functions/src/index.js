import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import admin from 'firebase-admin';
import crypto from 'node:crypto';
import { buildStudyCoachPrompt, buildReflectionPrompt, buildGeneratePlanPrompt } from './prompts.js';
import { callGroqJson } from './groqService.js';
import { buildCacheKey, getCachedResult, saveCachedResult, saveAiHistory } from './cacheService.js';
import { enforceRateLimit } from './rateLimit.js';

admin.initializeApp();
const db = admin.firestore();
const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 30,
  memory: '512MiB',
});

const getTodayStr = () => new Date().toISOString().split('T')[0];
const GENERATE_PLAN_CACHE_TTL_MS = 1000 * 60 * 30;

const minuteBucket = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
};

const getUserContext = async (uid) => {
  const [topicsSnap, dailySnap, reflectionsSnap] = await Promise.all([
    db.collection('users').doc(uid).collection('topics').get(),
    db.collection('users').doc(uid).collection('planner_daily').where('date', '==', getTodayStr()).get(),
    db.collection('users').doc(uid).collection('reflections').orderBy('timestamp', 'desc').limit(5).get(),
  ]);

  return {
    topics: topicsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    todayTasks: dailySnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    recentReflections: reflectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
};

const runFeature = async ({ uid, feature, promptPayload, promptBuilder, bypassCache, apiKey }) => {
  const cacheKey = buildCacheKey(feature, promptPayload);

  if (!bypassCache) {
    const cached = await getCachedResult(db, uid, cacheKey);
    if (cached) {
      await saveAiHistory(db, uid, feature, promptPayload, cached, true);
      return { ...cached, _meta: { cacheHit: true } };
    }
  }

  await enforceRateLimit(db, uid, feature);

  const prompt = promptBuilder(promptPayload);
  const response = await callGroqJson({ apiKey, prompt });

  await Promise.all([
    saveCachedResult(db, uid, cacheKey, response),
    saveAiHistory(db, uid, feature, promptPayload, response, false),
  ]);

  return { ...response, _meta: { cacheHit: false } };
};

const ensureAuth = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  return request.auth.uid;
};

const requireGroqApiKey = () => {
  const apiKey = GROQ_API_KEY.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'Groq API key is missing in Firebase Functions secrets.');
  }
  return apiKey;
};

const plannerPayloadFromRequest = (requestData, fallbackContext) => {
  const mode = String(requestData?.mode || 'daily');
  if (!['daily', 'weekly', 'monthly'].includes(mode)) {
    throw new HttpsError('invalid-argument', 'Mode must be daily, weekly, or monthly.');
  }

  const topics = Array.isArray(requestData?.topics) && requestData.topics.length > 0
    ? requestData.topics
    : fallbackContext.topics;

  const currentPlans = Array.isArray(requestData?.context?.currentPlans)
    ? requestData.context.currentPlans
    : fallbackContext.todayTasks;

  return { mode, topics, currentPlans };
};

const enforcePerMinuteLimit = async (uid, feature = 'generate_plan', limit = 5) => {
  const bucket = minuteBucket();
  const ref = db.collection('users').doc(uid).collection('aiRateLimitMinute').doc(`${feature}_${bucket}`);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? (snap.data().count || 0) : 0;
    if (count >= limit) {
      throw new HttpsError('resource-exhausted', 'Rate limit exceeded. Max 5 AI calls per minute.');
    }

    tx.set(ref, {
      count: count + 1,
      updatedAt: Date.now(),
      bucket,
      feature,
    }, { merge: true });
  });
};

const normalizePlanResponse = (result) => {
  const items = Array.isArray(result?.items)
    ? result.items.filter((item) => item && typeof item === 'object')
    : [];

  const planText = typeof result?.planText === 'string'
    ? result.planText
    : '';

  return { planText, items };
};

const getGeneratePlanCache = async (uid, inputHash) => {
  const cacheKey = crypto.createHash('sha256').update(`${uid}:${inputHash}`).digest('hex');
  const ref = db.collection('ai_cache').doc(cacheKey);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data?.createdAt || Date.now() - data.createdAt > GENERATE_PLAN_CACHE_TTL_MS) {
    return null;
  }

  return data;
};

const saveGeneratePlanCache = async (uid, inputHash, response) => {
  const cacheKey = crypto.createHash('sha256').update(`${uid}:${inputHash}`).digest('hex');
  const ref = db.collection('ai_cache').doc(cacheKey);
  await ref.set({
    userId: uid,
    type: 'study_plan',
    inputHash,
    response,
    createdAt: Date.now(),
  }, { merge: true });
};

export const studyCoach = onCall({ secrets: [GROQ_API_KEY] }, async (request) => {
  try {
    const uid = ensureAuth(request);
    const apiKey = requireGroqApiKey();
    const bypassCache = Boolean(request.data?.regenerate);

    const context = await getUserContext(uid);
    return await runFeature({
      uid,
      feature: 'studyCoach',
      promptPayload: context,
      promptBuilder: buildStudyCoachPrompt,
      bypassCache,
      apiKey,
    });
  } catch (error) {
    console.error('studyCoach error:', error);
    throw new HttpsError(error.code || 'internal', error.message || 'Study coach failed.');
  }
});

export const reflectionAnalyze = onCall({ secrets: [GROQ_API_KEY] }, async (request) => {
  try {
    const uid = ensureAuth(request);
    const apiKey = requireGroqApiKey();
    const bypassCache = Boolean(request.data?.regenerate);

    const context = await getUserContext(uid);
    const reflectionText = String(request.data?.reflectionText || '').trim();
    if (!reflectionText) {
      throw new HttpsError('invalid-argument', 'Reflection text is required.');
    }

    return await runFeature({
      uid,
      feature: 'reflectionAnalyze',
      promptPayload: {
        reflectionText,
        recentReflections: context.recentReflections,
      },
      promptBuilder: buildReflectionPrompt,
      bypassCache,
      apiKey,
    });
  } catch (error) {
    console.error('reflectionAnalyze error:', error);
    throw new HttpsError(error.code || 'internal', error.message || 'Reflection analysis failed.');
  }
});

const generatePlanHandler = async (request) => {
  try {
    const uid = ensureAuth(request);
    const apiKey = requireGroqApiKey();
    const bypassCache = Boolean(request.data?.regenerate);

    const context = await getUserContext(uid);
    const payload = plannerPayloadFromRequest(request.data, context);
    const plannerContext = {
      ...(request.data?.context || {}),
      currentPlans: payload.currentPlans,
    };
    const inputHash = JSON.stringify({
      mode: payload.mode,
      topics: payload.topics,
      context: plannerContext,
    });

    console.log('Incoming data:', {
      uid,
      mode: payload.mode,
      topicsCount: payload.topics.length,
      currentPlansCount: payload.currentPlans.length,
      regenerate: bypassCache,
    });

    if (!bypassCache) {
      const cached = await getGeneratePlanCache(uid, inputHash);
      if (cached?.response) {
        return {
          ...normalizePlanResponse(cached.response),
          _meta: { cacheHit: true },
        };
      }
    }

    await enforcePerMinuteLimit(uid, 'study_plan', 5);

    const prompt = buildGeneratePlanPrompt({
      topics: payload.topics,
      context: plannerContext,
      mode: payload.mode,
    });

    const generated = await callGroqJson({
      apiKey,
      prompt,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const response = normalizePlanResponse(generated);

    await saveGeneratePlanCache(uid, inputHash, response);

    console.log('Groq response:', {
      mode: payload.mode,
      itemsCount: response.items.length,
      planTextLength: response.planText.length,
    });

    return {
      ...response,
      _meta: { cacheHit: false },
    };
  } catch (error) {
    console.error('generatePlan error:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'AI generation failed');
  }
};

export const generatePlan = onCall({ secrets: [GROQ_API_KEY] }, generatePlanHandler);

// Backward compatibility during rollout.
export const plannerGenerate = onCall({ secrets: [GROQ_API_KEY] }, generatePlanHandler);
