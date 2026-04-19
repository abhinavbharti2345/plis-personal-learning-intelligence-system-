/**
 * keywordDetector.js — Detects sentiment from reflection text
 *
 * Returns { keywords: string[], sentiment: 'positive' | 'negative' | 'neutral' }
 */

const NEGATIVE_KEYWORDS = [
  'distracted', 'instagram', 'youtube', 'tired', 'bored', 'lazy',
  'confused', 'stuck', 'frustrated', 'slow', 'wasted', 'unfocused',
  'procrastinate', 'phone', 'scrolling', 'gaming', 'netflix',
];

const POSITIVE_KEYWORDS = [
  'focused', 'productive', 'completed', 'understood', 'clear',
  'breakthrough', 'great', 'excellent', 'efficient', 'progress',
  'mastered', 'confident', 'solved', 'flow', 'consistent',
];

/**
 * Analyze free-text reflection and return detected keywords + sentiment score.
 */
export const detectKeywords = (text = '') => {
  const lower = text.toLowerCase();

  const foundNegative = NEGATIVE_KEYWORDS.filter((kw) => lower.includes(kw));
  const foundPositive = POSITIVE_KEYWORDS.filter((kw) => lower.includes(kw));

  const allKeywords = [
    ...foundNegative.map((kw) => ({ word: kw, type: 'negative' })),
    ...foundPositive.map((kw) => ({ word: kw, type: 'positive' })),
  ];

  let sentiment = 'neutral';
  if (foundPositive.length > foundNegative.length) sentiment = 'positive';
  else if (foundNegative.length > foundPositive.length) sentiment = 'negative';

  return { keywords: allKeywords, sentiment };
};

/**
 * Emoji for sentiment.
 */
export const sentimentEmoji = (sentiment) => {
  if (sentiment === 'positive') return '🟢';
  if (sentiment === 'negative') return '🔴';
  return '🟡';
};

/**
 * Generate insight strings from a list of reflections.
 */
export const generateInsights = (reflections = []) => {
  if (reflections.length === 0) return [];

  const recent = reflections.slice(0, 7); // last 7 entries
  const negCount = recent.filter((r) => r.sentiment === 'negative').length;
  const posCount = recent.filter((r) => r.sentiment === 'positive').length;

  const topDistractors = {};
  recent.forEach((r) => {
    (r.keywords || [])
      .filter((k) => k.type === 'negative')
      .forEach((k) => {
        topDistractors[k.word] = (topDistractors[k.word] || 0) + 1;
      });
  });

  const insights = [];

  if (negCount >= 3) {
    insights.push({
      icon: '🔴',
      text: `You had ${negCount} low-focus sessions this week. Consider shorter study blocks.`,
      type: 'warning',
    });
  }
  if (posCount >= 4) {
    insights.push({
      icon: '🟢',
      text: `Great week! You had ${posCount} highly productive sessions.`,
      type: 'success',
    });
  }

  const topDistractor = Object.entries(topDistractors).sort((a, b) => b[1] - a[1])[0];
  if (topDistractor) {
    insights.push({
      icon: '📱',
      text: `"${topDistractor[0]}" appeared ${topDistractor[1]}x as a distraction this week.`,
      type: 'warning',
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: '📓',
      text: 'Keep logging reflections to unlock personalized insights.',
      type: 'info',
    });
  }

  return insights;
};
