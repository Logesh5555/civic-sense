export const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const formatDateTime = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function formatHours(h) {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h} h`;
  return `${Math.round((h / 24) * 10) / 10} days`;
}

export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export const imgUrl = (u) => u || null;

/** Maps API validation details onto react-hook-form fields. */
export function applyServerErrors(err, setError, fields = []) {
  const details = err?.parsed?.details;
  if (!details) return false;
  let any = false;
  for (const [k, msg] of Object.entries(details)) {
    if (fields.includes(k)) { setError(k, { type: 'server', message: msg }); any = true; }
  }
  return any;
}

export const errMsg = (e) => e?.parsed?.message || e?.message || 'Something went wrong';
