import { Link } from 'react-router-dom';
import { CircleCheck, ClipboardList, Inbox, Loader } from 'lucide-react';
import { ErrorState, KpiCard, PageHeader, SkeletonKpis } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { get } from '../../services/api.js';
import { formatHours, timeAgo } from '../../utils/format.js';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => get('/dashboard/department'), []);
  const t = data?.totals;
  return (
    <div>
      <PageHeader title="Department overview" subtitle={`Welcome, ${user.name}.`} actions={<Link to="/staff/complaints" className="btn-primary">View assigned complaints</Link>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !t ? <SkeletonKpis /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Assigned complaints" value={t.assigned} icon={ClipboardList} />
            <KpiCard label="New assignments" value={t.newAssignments} icon={Inbox} tone="text-blue-600" hint="Assigned or reopened, not started" />
            <KpiCard label="In progress" value={t.inProgress} icon={Loader} tone="text-indigo-600" />
            <KpiCard label="Completed" value={t.completed} icon={CircleCheck} tone="text-emerald-600" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <KpiCard label="Resolution rate" value={`${t.resolutionRate}%`} hint="Resolved ÷ (assigned − rejected)" />
            <KpiCard label="Avg. resolution time" value={formatHours(t.avgResolutionHours)} />
          </div>
          <section className="mt-8" aria-labelledby="n"><h2 id="n" className="mb-3 text-lg font-semibold">Recent notifications</h2>
            <div className="card divide-y">{data.notifications.items.length === 0 ? <p className="p-4 text-sm text-slate-500">No notifications.</p> : data.notifications.items.map((n) => <Link key={n.id} to={n.complaintId ? `/staff/complaints/${n.complaintId}` : '/notifications'} className="block px-4 py-3 hover:bg-slate-50"><p className={`text-sm ${n.isRead ? '' : 'font-semibold'}`}>{n.title}</p><p className="text-xs text-slate-500">{n.message}</p><p className="text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p></Link>)}</div></section>
        </>
      )}
    </div>
  );
}
