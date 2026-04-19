/**
 * dateUtils.js — Date formatting helpers
 */

/**
 * Format a Firestore Timestamp or Date object to readable string.
 */
export const formatDate = (val) => {
  if (!val) return '—';
  const date = val?.toDate ? val.toDate() : new Date(val);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Relative time: "2 days ago", "just now", etc.
 */
export const timeAgo = (val) => {
  if (!val) return '—';
  const date = val?.toDate ? val.toDate() : new Date(val);
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);

  if (days > 30) return formatDate(val);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
};

/**
 * Format minutes to "Xh Ym" or "Zm" string.
 */
export const formatMinutes = (minutes = 0) => {
  if (minutes === 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
