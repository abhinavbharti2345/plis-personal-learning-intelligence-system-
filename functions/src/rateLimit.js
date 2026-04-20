const DEFAULT_DAILY_LIMIT = 40;

export const enforceRateLimit = async (db, uid, feature, limit = DEFAULT_DAILY_LIMIT) => {
  const today = new Date().toISOString().split('T')[0];
  const usageRef = db.collection('users').doc(uid).collection('aiUsage').doc(today);
  const snap = await usageRef.get();

  const usage = snap.exists ? snap.data() : { total: 0, byFeature: {} };
  const nextTotal = (usage.total || 0) + 1;
  const nextFeatureCount = (usage.byFeature?.[feature] || 0) + 1;

  if (nextTotal > limit) {
    const err = new Error('Daily AI limit reached. Try again tomorrow.');
    err.code = 'resource-exhausted';
    throw err;
  }

  await usageRef.set({
    total: nextTotal,
    byFeature: {
      ...(usage.byFeature || {}),
      [feature]: nextFeatureCount,
    },
    updatedAt: Date.now(),
  }, { merge: true });
};
