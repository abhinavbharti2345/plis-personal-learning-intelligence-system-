/**
 * clarityEngine.js — Pure rule-based suggestion engine
 *
 * Takes an array of topic objects and returns a prioritized
 * list of actionable suggestions.
 *
 * Rules:
 *  1. accuracy < 60%          → "Revise — accuracy too low"          [HIGH]
 *  2. lastUpdated > 5 days    → "Needs revision — not studied recently" [MEDIUM]
 *  3. timeSpent > 120 + acc < 60 → "Inefficient study — change strategy" [HIGH]
 *  4. status = 'not_started'  → "Start this topic"                   [LOW]
 *  5. all children strong     → "Consider parent as complete"         [LOW]
 */

const DAYS_WITHOUT_REVIEW = 5;
const MIN_ACCURACY        = 60;
const INEFFICIENCY_TIME   = 120; // minutes

/**
 * Convert Firestore Timestamp or ISO string to JS Date.
 */
const toDate = (val) => {
  if (!val) return null;
  if (val?.toDate) return val.toDate(); // Firestore Timestamp
  return new Date(val);
};

/**
 * Days elapsed since a given date.
 */
const daysSince = (date) => {
  if (!date) return Infinity;
  const now = new Date();
  const diff = now - new Date(date);
  return diff / (1000 * 60 * 60 * 24);
};

/**
 * Compute accuracy % for a topic.
 */
export const getAccuracy = (topic) => {
  const { questionsAttempted = 0, correctAnswers = 0 } = topic;
  if (questionsAttempted === 0) return null; // no data yet
  return Math.round((correctAnswers / questionsAttempted) * 100);
};

/**
 * Determine effective status (may override stored status based on rules).
 */
export const getEffectiveStatus = (topic) => {
  // Respect explicit overrides
  if (topic.status === 'weak') return 'weak';

  const acc = getAccuracy(topic);
  const days = daysSince(toDate(topic.lastUpdated));

  // Only auto-degrade topics that aren't fresh new topics
  if (topic.status && topic.status !== 'not_started') {
    if (acc !== null && acc < MIN_ACCURACY) return 'weak';
    if (days >= 5) return 'weak'; // Un-touched for 5+ days
  }

  return topic.status || 'not_started';
};

/**
 * Main engine function.
 * @param {Array} topics  - array of topic objects from Firestore
 * @returns {Array}       - sorted suggestion objects
 *   { topicId, topicTitle, type, message, priority: 'high'|'medium'|'low', icon }
 */
export const runClarityEngine = (topics = []) => {
  const suggestions = [];

  topics.forEach((topic) => {
    const acc          = getAccuracy(topic);
    const lastUpdated  = toDate(topic.lastUpdated);
    const days         = daysSince(lastUpdated);
    const time         = topic.timeSpent || 0;

    // Rule 3 — Inefficient study (must check BEFORE rule 1 to catch double-issue)
    if (time > INEFFICIENCY_TIME && acc !== null && acc < MIN_ACCURACY) {
      suggestions.push({
        topicId:    topic.id,
        topicTitle: topic.title,
        type:       'inefficient',
        message:    `🔄 Change strategy on "${topic.title}" — spent ${time} min but accuracy is only ${acc}%`,
        priority:   'high',
        icon:       '🔄',
      });
      return; // skip lower-priority rules for same topic
    }

    // Rule 1 — Low accuracy
    if (acc !== null && acc < MIN_ACCURACY) {
      suggestions.push({
        topicId:    topic.id,
        topicTitle: topic.title,
        type:       'low_accuracy',
        message:    `⚠️ Revise "${topic.title}" — accuracy ${acc}% is below 60%`,
        priority:   'high',
        icon:       '⚠️',
      });
      return;
    }

    // Rule 2 — Needs revision (not studied in 5+ days, and was in progress)
    if (
      days > DAYS_WITHOUT_REVIEW &&
      topic.status === 'learning' &&
      acc !== null
    ) {
      suggestions.push({
        topicId:    topic.id,
        topicTitle: topic.title,
        type:       'needs_revision',
        message:    `📅 Revisit "${topic.title}" — not studied in ${Math.floor(days)} days`,
        priority:   'medium',
        icon:       '📅',
      });
      return;
    }

    // Rule 4 — Not started
    if (topic.status === 'not_started') {
      suggestions.push({
        topicId:    topic.id,
        topicTitle: topic.title,
        type:       'not_started',
        message:    `🚀 Start "${topic.title}" — ready to begin`,
        priority:   'low',
        icon:       '🚀',
      });
    }
  });

  // Sort: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => order[a.priority] - order[b.priority]);

  return suggestions;
};

/**
 * Compute overall study stats from topics array.
 */
export const computeStats = (topics = []) => {
  const total     = topics.length;
  const strong    = topics.filter((t) => t.status === 'strong').length;
  const learning  = topics.filter((t) => t.status === 'learning').length;
  const notStarted = topics.filter((t) => t.status === 'not_started').length;
  const weak      = topics.filter((t) => getEffectiveStatus(t) === 'weak').length;
  const totalTime = topics.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
  const avgAccuracy = (() => {
    const withData = topics.filter((t) => t.questionsAttempted > 0);
    if (withData.length === 0) return null;
    const sum = withData.reduce((s, t) => s + getAccuracy(t), 0);
    return Math.round(sum / withData.length);
  })();

  return { total, strong, learning, notStarted, weak, totalTime, avgAccuracy };
};
