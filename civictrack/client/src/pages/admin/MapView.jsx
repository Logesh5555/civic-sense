import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPinOff } from 'lucide-react';
import { ComplaintsMap } from '../../components/Maps.jsx';
import { EmptyState, ErrorState, PageHeader, Skeleton, StatusBadge } from '../../components/ui.jsx';
import { useAuth, complaintBase } from '../../context/AuthContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { get } from '../../services/api.js';
import { CATEGORIES, STATUSES, STATUS_META, categoryShort } from '../../utils/constants.js';
import { formatDate } from '../../utils/format.js';

export default function MapView() {
  const { user } = useAuth();
  const [f, setF] = useState({ status: '', category: '', from: '', to: '' });
  const [view, setView] = useState('map');
  const { data, loading, error, reload } = useFetch(() => get('/complaints/map', f), [JSON.stringify(f)]);
  const base = complaintBase(user.role);
  const items = data?.items || [];
  const sel = 'input w-auto min-w-[9rem]';
  return (
    <div>
      <PageHeader title="Map view" subtitle="Geolocated complaints. Complaints submitted without GPS are not shown here." />
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" aria-label="Map filters" onSubmit={(e) => e.preventDefault()}>
        <div><label htmlFor="m-s" className="label">Status</label><select id="m-s" className={sel} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></div>
        <div><label htmlFor="m-c" className="label">Category</label><select id="m-c" className={sel} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">All</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.short}</option>)}</select></div>
        <div><label htmlFor="m-f" className="label">From</label><input id="m-f" type="date" className={sel} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
        <div><label htmlFor="m-t" className="label">To</label><input id="m-t" type="date" className={sel} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
        <div role="group" aria-label="View mode" className="ml-auto flex overflow-hidden rounded-lg border border-slate-300">
          {['map', 'list'].map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`px-4 py-2 text-sm capitalize ${view === v ? 'bg-navy-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>{v}</button>)}
        </div>
      </form>
      <div className="mb-3 flex flex-wrap gap-3 text-xs" aria-label="Legend">{STATUSES.map((s) => <span key={s} className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full border border-white shadow ring-1 ring-slate-300" style={{ background: STATUS_META[s].color }} />{STATUS_META[s].label}</span>)}</div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-[520px]" /> : items.length === 0 ? <EmptyState icon={MapPinOff} title="No geolocated complaints match">Adjust the filters, or wait for complaints that include a location pin.</EmptyState>
        : view === 'map' ? <><ComplaintsMap items={items} linkBase={base} /><p className="mt-2 text-xs text-slate-500">{items.length} complaint{items.length === 1 ? '' : 's'} shown (max 1000).</p></>
        : (
          <div className="card overflow-x-auto"><table className="min-w-full"><caption className="sr-only">Geolocated complaints</caption>
            <thead className="bg-slate-50"><tr>{['Reference', 'Title', 'Category', 'Location', 'Submitted', 'Status'].map((h) => <th key={h} className="th" scope="col">{h}</th>)}</tr></thead>
            <tbody className="divide-y">{items.map((c) => <tr key={c.id}><td className="td font-mono text-xs"><Link className="text-teal-700 underline" to={`${base}/${c.id}`}>{c.referenceNumber}</Link></td><td className="td">{c.title}</td><td className="td">{categoryShort(c.category)}</td><td className="td">{c.locationDescription}<span className="block text-xs text-slate-400">{c.location.coordinates[1]}, {c.location.coordinates[0]}</span></td><td className="td">{formatDate(c.createdAt)}</td><td className="td"><StatusBadge status={c.status} /></td></tr>)}</tbody></table></div>
        )}
    </div>
  );
}
