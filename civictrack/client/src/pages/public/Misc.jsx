import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Button, ErrorState, StatusBadge } from '../../components/ui.jsx';
import { ProgressSteps, Timeline } from '../../components/Timeline.jsx';
import { get } from '../../services/api.js';
import { categoryLabel } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/format.js';
import { useEffect } from 'react';

export function TrackPage() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(ref || '');
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (!ref) { setState({ loading: false, data: null, error: null }); return; }
    setState({ loading: true, data: null, error: null });
    get(`/complaints/reference/${encodeURIComponent(ref)}`)
      .then((r) => setState({ loading: false, data: r.data.complaint, error: null }))
      .catch((e) => setState({ loading: false, data: null, error: e?.parsed?.status === 404 ? 'No complaint found with that reference number. Check it and try again.' : (e?.parsed?.message || 'Lookup failed') }));
  }, [ref]);

  const submit = (e) => { e.preventDefault(); if (input.trim()) navigate(`/track/${encodeURIComponent(input.trim().toUpperCase())}`); };
  const c = state.data;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold">Track a complaint</h1>
      <p className="mt-1 text-slate-600">Enter the reference number you received when you submitted (for example <span className="font-mono">CT-2026-000123</span>). Public tracking shows progress only — no personal details.</p>
      <form onSubmit={submit} className="mt-6 flex gap-2" role="search">
        <label htmlFor="ref" className="sr-only">Reference number</label>
        <input id="ref" className="input font-mono uppercase" placeholder="CT-YYYY-000000" value={input} onChange={(e) => setInput(e.target.value)} maxLength={30} />
        <Button type="submit" loading={state.loading}><Search className="h-4 w-4" />Track</Button>
      </form>
      <div className="mt-8" aria-live="polite">
        {state.error && <ErrorState message={state.error} />}
        {c && (
          <div className="card space-y-6 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-mono text-sm font-semibold text-teal-700">{c.referenceNumber}</p><h2 className="text-lg font-semibold">{c.title}</h2><p className="text-sm text-slate-500">{categoryLabel(c.category)} · submitted {formatDateTime(c.createdAt)}</p></div>
              <StatusBadge status={c.status} />
            </div>
            <ProgressSteps status={c.status} />
            {c.department && <p className="text-sm"><span className="font-medium">Department:</span> {c.department}</p>}
            {c.updates.length > 0 && <div><h3 className="mb-2 font-semibold">Updates</h3><ul className="space-y-2">{c.updates.map((u, i) => <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">{u.message}<span className="block text-xs text-slate-500">{formatDateTime(u.at)}</span></li>)}</ul></div>}
            <div><h3 className="mb-3 font-semibold">Timeline</h3><Timeline history={c.timeline} /></div>
            <p className="text-xs text-slate-500">Want full details? <Link to="/login" className="underline">Log in</Link> to see your own complaints.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const Legal = ({ title, children }) => (
  <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6"><h1 className="text-2xl font-bold">{title}</h1><div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">{children}</div>
    <p className="mt-8 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">This is template text provided for development. Replace it with your organisation’s reviewed legal content before launch.</p></div>
);

export const Privacy = () => (
  <Legal title="Privacy Policy">
    <p>CivicTrack collects the information you provide (name, email, optional phone) and the details of complaints you submit (description, photographs, location) to deliver municipal services.</p>
    <p>Location is collected only when you choose to use your device location or place a marker on the map. Coordinates are shown on OpenStreetMap tiles in your browser; they are not sent to other third-party services.</p>
    <p>Public tracking by reference number reveals only the complaint title, category, status and updates — never your identity, contact details, or exact location.</p>
    <p>Passwords are stored only as salted hashes. You may request correction or deletion of your account data through the contact details in the footer.</p>
  </Legal>
);
export const Terms = () => (
  <Legal title="Terms of Use">
    <p>Use CivicTrack to report genuine public infrastructure problems. Do not submit false, abusive, or unlawful content, or personal information about others.</p>
    <p>Reports may be reviewed, rejected, or reassigned by administrators. Submission does not guarantee a specific response time. For emergencies, contact your local emergency services directly.</p>
    <p>Accounts may be deactivated for misuse.</p>
  </Legal>
);

export function NotFound() {
  return <div className="mx-auto max-w-md px-4 py-24 text-center"><h1 className="text-4xl font-bold">404</h1><p className="mt-2 text-slate-600">We couldn’t find that page.</p><Link to="/" className="btn-primary mt-6">Go home</Link></div>;
}
