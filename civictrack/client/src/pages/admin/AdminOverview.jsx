import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardList, CircleCheck, Clock, FileText, Loader, Percent, Search, Timer, XCircle, Inbox } from 'lucide-react';
import { EmptyState, ErrorState, KpiCard, PageHeader, SkeletonKpis, Skeleton } from '../../components/ui.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { get } from '../../services/api.js';
import { CATEGORIES, STATUS_META, categoryShort } from '../../utils/constants.js';
import { formatHours } from '../../utils/format.js';

const TEAL = '#0D9488'; const NAVY = '#163B65'; const ACCENT = '#38BDF8';

function ChartCard({ title, children, empty, loading, caption }) {
  return (
    <section className="card p-5" aria-label={title}>
      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      {caption && <p className="mb-3 text-xs text-slate-500">{caption}</p>}
      {loading ? <Skeleton className="h-64" /> : empty ? <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-slate-500"><Inbox className="mb-2 h-8 w-8 text-slate-300" aria-hidden="true" />No data for the selected period.</div> : <div className="h-64">{children}</div>}
    </section>
  );
}

export default function AdminOverview() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [preset, setPreset] = useState('');
  const applyPreset = (days) => {
    setPreset(String(days));
    if (!days) return setRange({ from: '', to: '' });
    const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    setRange({ from, to: '' });
  };
  const kpi = useFetch(() => get('/dashboard/admin', range), [range.from, range.to]);
  const an = useFetch(() => get('/analytics/complaints', range), [range.from, range.to]);
  const k = kpi.data?.kpis;
  const a = an.data;
  const statusData = (a?.byStatus || []).map((s) => ({ ...s, name: STATUS_META[s.status]?.label || s.status, fill: STATUS_META[s.status]?.color }));
  const catData = (a?.byCategory || []).map((c) => ({ name: categoryShort(c.category), count: c.count }));

  return (
    <div>
      <PageHeader title="Overview" subtitle="Live figures calculated from complaint records." actions={
        <div className="flex flex-wrap items-end gap-2">
          <div><label htmlFor="preset" className="sr-only">Quick range</label><select id="preset" className="input w-auto" value={preset} onChange={(e) => applyPreset(Number(e.target.value))}><option value="">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
          <div><label htmlFor="from" className="sr-only">From date</label><input id="from" type="date" className="input w-auto" value={range.from} onChange={(e) => { setPreset(''); setRange({ ...range, from: e.target.value }); }} /></div>
          <div><label htmlFor="to" className="sr-only">To date</label><input id="to" type="date" className="input w-auto" value={range.to} onChange={(e) => { setPreset(''); setRange({ ...range, to: e.target.value }); }} /></div>
        </div>} />
      {kpi.error ? <ErrorState message={kpi.error} onRetry={kpi.reload} /> : kpi.loading && !k ? <SkeletonKpis n={8} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total complaints" value={k.total} icon={FileText} />
          <KpiCard label="New" value={k.new} icon={ClipboardList} tone="text-slate-600" hint="Submitted, not yet reviewed" />
          <KpiCard label="Under review" value={k.underReview} icon={Search} tone="text-amber-600" />
          <KpiCard label="In progress" value={k.inProgress} icon={Loader} tone="text-indigo-600" hint="Active works undergoing resolution" />
          <KpiCard label="Resolved" value={k.resolved} icon={CircleCheck} tone="text-emerald-600" />
          <KpiCard label="Rejected" value={k.rejected} icon={XCircle} tone="text-red-600" />
          <KpiCard label="Resolution rate" value={`${k.resolutionRate}%`} icon={Percent} tone="text-teal-600" hint="Resolved ÷ (Total − Rejected)" />
          <KpiCard label="Avg. resolution time" value={formatHours(k.avgResolutionHours)} icon={Timer} tone="text-teal-600" hint="Mean of resolved − submitted time" />
        </div>
      )}
      {an.error && <div className="mt-6"><ErrorState message={an.error} onRetry={an.reload} /></div>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Complaints submitted over time" loading={an.loading && !a} empty={!a?.overTime.length}>
          <ResponsiveContainer><LineChart data={a?.overTime}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="count" name="Complaints" stroke={NAVY} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Complaints by category" loading={an.loading && !a} empty={!catData.length}>
          <ResponsiveContainer><BarChart data={catData} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="Complaints" fill={TEAL} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Complaints by status" loading={an.loading && !a} empty={!statusData.length}>
          <ResponsiveContainer><PieChart><Pie data={statusData} dataKey="count" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{statusData.map((s) => <Cell key={s.status} fill={s.fill} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" height={48} /></PieChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Resolution trends" loading={an.loading && !a} empty={!a?.resolutionTrend.length} caption="Resolved per ISO week and average hours to resolve.">
          <ResponsiveContainer><LineChart data={a?.resolutionTrend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line yAxisId="l" type="monotone" dataKey="resolved" name="Resolved" stroke={TEAL} strokeWidth={2} /><Line yAxisId="r" type="monotone" dataKey="avgHours" name="Avg hours" stroke={NAVY} strokeWidth={2} strokeDasharray="4 3" /></LineChart></ResponsiveContainer>
        </ChartCard>
        <section className="card p-5 lg:col-span-2" aria-label="Complaint volume by location">
          <h2 className="mb-1 text-base font-semibold">Volume by location</h2>
          <p className="mb-3 text-xs text-slate-500">Top areas (≈1 km grid) from geolocated complaints.</p>
          {an.loading && !a ? <Skeleton className="h-64" /> : !a?.locations.length ? <div className="flex h-64 items-center justify-center text-sm text-slate-500">Not enough geolocated complaints yet.</div> : (
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="th" scope="col">Area (lat, lng)</th><th className="th text-right" scope="col">Complaints</th></tr></thead><tbody className="divide-y">{a.locations.map((l) => <tr key={`${l.lat},${l.lng}`}><td className="td">{l.lat}, {l.lng}</td><td className="td text-right font-semibold">{l.count}</td></tr>)}</tbody></table></div>
          )}
        </section>
      </div>
    </div>
  );
}
