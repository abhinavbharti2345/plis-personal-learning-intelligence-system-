import crypto from 'node:crypto';

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6;

const toStableJson = (value) => JSON.stringify(value, Object.keys(value || {}).sort());

export const buildCacheKey = (feature, payload) => {
  const hash = crypto.createHash('sha256').update(toStableJson(payload)).digest('hex');
  return `${feature}_${hash}`;
};

export const getCachedResult = async (db, uid, key) => {
  const ref = db.collection('users').doc(uid).collection('aiCache').doc(key);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data?.expiresAt || Date.now() > data.expiresAt) return null;
  return data.response || null;
};

export const saveCachedResult = async (db, uid, key, response, ttlMs = DEFAULT_TTL_MS) => {
  const ref = db.collection('users').doc(uid).collection('aiCache').doc(key);
  await ref.set({
    response,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  }, { merge: true });
};

export const saveAiHistory = async (db, uid, feature, payload, response, cacheHit) => {
  const ref = db.collection('users').doc(uid).collection('aiHistory').doc();
  await ref.set({
    feature,
    payload,
    response,
    cacheHit,
    createdAt: Date.now(),
  });
};
