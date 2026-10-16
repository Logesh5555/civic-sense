import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Search, SearchX, FilePlus2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, EmptyState, ErrorState, Pagination, PriorityBadge, SkeletonCards, StatusBadge, Thumb, Skeleton } from '../components/ui.jsx';
import { useAuth, complaintBase } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDebounce, useFetch } from '../hooks/useFetch.js';
import { api, cleanParams, get } from '../services/api.js';
import { CATEGORIES, STATUSES, STATUS_META, PRIORITIES, categoryShort } from '../utils/constants.js';
import { errMsg, formatDate } from '../utils/format.js';
import { StatusModal } from './ComplaintActions.jsx';

const KEYS = ['q', 'status', 'category', 'priority', 'from', 'to', 'sort', 'page'];

export function useListParams() {
  const [sp, setSp] = useSearchParams();
  const params = Object.fromEntries(KEYS.map((k) => [k, sp.get(k) || '']));
  const set = (patch) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };
  return [params, set];
}

function Filters({ params, set, role }) {
  const [q, setQ] = useState(params.q);
  const dq = useDebounce(q, 400);
  useEffect(() => { setQ(params.q); }, [params.q]);
  useEffect(() => { if (dq !== params.q) set({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  const sel = 'input w-auto min-w-[9rem]';
  return (
    <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" role="search" aria-label="Filter complaints" onSubmit={(e) => e.preventDefault()}>
      <div className="min-w-[14rem] flex-1"><label htmlFor="f-q" className="label">Search</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" /><input id="f-q" className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, reference, location…" /></div></div>
      <div><label htmlFor="f-s" className="label">Status</label><select id="f-s" className={sel} value={params.status} onChange={(e) => set({ status: e.target.value })}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}</select></div>
      <div><label htmlFor="f-c" className="label">Category</label><select id="f-c" className={sel} value={params.category} onChange={(e) => set({ category: e.target.value })}><option value="">All</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.short}</option>)}</select></div>
      {role !== 'citizen' && <div><label htmlFor="f-p" className="label">Priority</label><select id="f-p" className={sel} value={params.priority} onChange={(e) => set({ priority: e.target.value })}><option value="">All</option>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>}
      <div><label htmlFor="f-f" className="label">From</label><input id="f-f" type="date" className={sel} value={params.from} onChange={(e) => set({ from: e.target.value })} /></div>
      <div><label htmlFor="f-t" className="label">To</label><input id="f-t" type="date" className={sel} value={params.to} onChange={(e) => set({ to: e.target.value })} /></div>
      <div><label htmlFor="f-o" className="label">Sort</label><select id="f-o" className={sel} value={params.sort || '-createdAt'} onChange={(e) => set({ sort: e.target.value })}><option value="-createdAt">Newest first</option><option value="createdAt">Oldest first</option>{role !== 'citizen' && <><option value="-priority">Priority (high→low)</option><option value="priority">Priority (low→high)</option></>}<option value="status">Status A→Z</option><option value="title">Title A→Z</option></select></div>
      <button type="button" className="btn-ghost" onClick={() => set(Object.fromEntries(KEYS.map((k) => [k, ''])))}>Clear</button>
    </form>
  );
}

export default function ComplaintsList({ title = 'Complaints' }) {
  const { user } = useAuth();
  const toast = useToast();
  const [params, set] = useListParams();
  const [exporting, setExporting] = useState(false);
  const [action, setAction] = useState(null); // { type, complaint }
  const base = complaintBase(user.role);
  const { data, meta, loading, error, reload } = useFetch(() => get('/complaints', { ...params, limit: 10, sort: params.sort || '-createdAt' }), [JSON.stringify(params)]);
  const hasFilters = KEYS.filter((k) => k !== 'page' && k !== 'sort').some((k) => params[k]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await api.get('/complaints/export', { params: cleanParams({ ...params, page: undefined, limit: undefined }), responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = 'complaints.csv'; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(errMsg(e)); } finally { setExporting(false); }
  };

  const isCitizen = user.role === 'citizen';
  const items = data?.items || [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-xl font-bold sm:text-2xl">{title}</h1></div>
        <div className="flex gap-2">
          {user.role === 'admin' && <Button variant="outline" onClick={exportCsv} loading={exporting}><Download className="h-4 w-4" />Export CSV</Button>}
          {isCitizen && <Link to="/report" className="btn-accent"><FilePlus2 className="h-4 w-4" />Report an issue</Link>}
        </div>
      </div>
      <Filters params={params} set={set} role={user.role} />
      {loading && !data ? (isCitizen ? <SkeletonCards n={4} /> : <div className="card space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8" />)}</div>)
        : error ? <ErrorState message={error} onRetry={reload} />
        : items.length === 0 ? (hasFilters ? <EmptyState icon={SearchX} title="No complaints match your filters" action={<button className="btn-outline" onClick={() => set(Object.fromEntries(KEYS.map((k) => [k, ''])))}>Clear filters</button>}>Try changing or clearing the filters.</EmptyState>
          : <EmptyState title={isCitizen ? 'You haven’t reported anything yet' : 'No complaints yet'} action={isCitizen && <Link to="/report" className="btn-accent">Report an issue</Link>}>{isCitizen ? 'When you report an issue it will appear here with live status updates.' : 'Complaints will appear here once they are submitted.'}</EmptyState>)
        : isCitizen ? (
          <ul className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {items.map((c, i) => (
              <motion.li
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link to={`${base}/${c.id}`} className="card-interactive flex gap-4 p-4 group">
                  <Thumb src={c.images?.[0]} alt="" className="h-20 w-20" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-teal-700">{c.referenceNumber}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <h2 className="mt-1 truncate font-semibold text-slate-main group-hover:text-primary transition-colors">{c.title}</h2>
                    <p className="text-sm text-slate-500">{categoryShort(c.category)} · {formatDate(c.createdAt)}</p>
                    <p className="truncate text-sm text-slate-500">{c.locationDescription}</p>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        ) : (
          <div className={`card overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-slate-200">
              <caption className="sr-only">Complaints</caption>
              <thead className="bg-slate-50"><tr>{['Reference', 'Title', 'Citizen', 'Category', 'Location', 'Submitted', 'Priority', 'Status', 'Actions'].map((h) => <th key={h} scope="col" className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="td whitespace-nowrap font-mono text-xs font-semibold text-teal-700">{c.referenceNumber}</td>
                    <td className="td max-w-[14rem] truncate font-medium"><Link className="hover:underline" to={`${base}/${c.id}`}>{c.title}</Link></td>
                    <td className="td whitespace-nowrap">{c.citizenId?.name || '—'}</td>
                    <td className="td whitespace-nowrap">{categoryShort(c.category)}</td>
                    <td className="td max-w-[12rem] truncate" title={c.locationDescription}>{c.locationDescription}</td>
                    <td className="td whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="td"><PriorityBadge priority={c.priority} /></td>
                    <td className="td"><StatusBadge status={c.status} /></td>
                    <td className="td whitespace-nowrap">
                      <Link className="text-teal-700 underline" to={`${base}/${c.id}`} aria-label={`View ${c.referenceNumber}`}>View</Link>
                      <button className="ml-3 text-slate-700 underline" onClick={() => setAction({ type: 'status', complaint: c })} aria-label={`Update status of ${c.referenceNumber}`}>Status</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      <Pagination meta={meta} onPage={(p) => set({ page: String(p) })} />
      {action?.type === 'status' && <StatusModal complaint={action.complaint} role={user.role} open onClose={() => setAction(null)} onDone={() => { setAction(null); reload(); }} />}
    </div>
  );
}
