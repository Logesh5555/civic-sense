/**
 * Dashboard metric definitions (documented in README):
 *  - Resolution rate = resolved / (total - rejected) * 100, using each complaint's CURRENT status.
 *    Rejected complaints are excluded because they were never actionable. 0 when the denominator is 0.
 *  - Average resolution time = mean(resolvedAt - createdAt), in hours, over complaints currently
 *    in `resolved` status that have a resolvedAt. null when none exist.
 */
export function resolutionRate(total, resolved, rejected) {
  const denom = total - rejected;
  return denom > 0 ? Math.round((resolved / denom) * 1000) / 10 : 0;
}

export const AVG_RESOLUTION_STAGE = (match = {}) => [
  { $match: { ...match, status: 'resolved', resolvedAt: { $exists: true } } },
  { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } }, count: { $sum: 1 } } },
];

export const msToHours = (ms) => (ms == null ? null : Math.round((ms / 36e5) * 10) / 10);

export function statusCounts(rows) {
  const out = { submitted: 0, under_review: 0, assigned: 0, in_progress: 0, resolved: 0, rejected: 0, reopened: 0 };
  for (const r of rows) out[r._id] = r.count;
  return out;
}

export function buildDateRange(from, to) {
  if (!from && !to) return undefined;
  const r = {};
  if (from) r.$gte = from;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); r.$lte = t; }
  return r;
}
