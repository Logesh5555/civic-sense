import { useEffect, useState } from 'react';
import { Users as UsersIcon } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Pagination, Skeleton } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useDebounce, useFetch } from '../../hooks/useFetch.js';
import { get, patch } from '../../services/api.js';
import { errMsg, formatDate } from '../../utils/format.js';

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ q: '', role: '', active: '', page: 1 });
  const dq = useDebounce(f.q, 400);
  const { data, meta, loading, error, reload } = useFetch(() => get('/users', { ...f, q: dq, limit: 10 }), [dq, f.role, f.active, f.page]);
  const [roleModal, setRoleModal] = useState(null);
  const [role, setRole] = useState('citizen');
  const [rerr, setRerr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  useEffect(() => { setF((x) => ({ ...x, page: 1 })); }, [dq]); // eslint-disable-line

  const openRole = (u) => { setRoleModal(u); setRole(u.role); setRerr(''); };
  const saveRole = async () => {
    setBusy(true); setRerr('');
    try { await patch(`/users/${roleModal.id}/role`, { role }); toast.success('Role updated'); setRoleModal(null); reload(); }
    catch (e) { setRerr(e?.parsed?.details ? Object.values(e.parsed.details).join(' ') : errMsg(e)); } finally { setBusy(false); }
  };
  const toggleActive = async () => {
    setBusy(true);
    try { await patch(`/users/${confirm.id}`, { isActive: !confirm.isActive }); toast.success(confirm.isActive ? 'Account deactivated' : 'Account activated'); setConfirm(null); reload(); }
    catch (e) { toast.error(errMsg(e)); setConfirm(null); } finally { setBusy(false); }
  };
  const items = data?.items || [];
  const sel = 'input w-auto min-w-[9rem]';

  return (
    <div>
      <PageHeader title="Users" subtitle="Search accounts, change roles and activate or deactivate access." />
      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="min-w-[14rem] flex-1"><label htmlFor="u-q" className="label">Search</label><input id="u-q" className="input" placeholder="Name or email" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <div><label htmlFor="u-r" className="label">Role</label><select id="u-r" className={sel} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, page: 1 })}><option value="">All</option><option value="citizen">Citizen</option><option value="admin">Admin</option></select></div>
        <div><label htmlFor="u-a" className="label">Status</label><select id="u-a" className={sel} value={f.active} onChange={(e) => setF({ ...f, active: e.target.value, page: 1 })}><option value="">All</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
      </form>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-64" /> : items.length === 0 ? <EmptyState icon={UsersIcon} title="No users found">Try a different search.</EmptyState> : (
        <div className="card overflow-x-auto"><table className="min-w-full"><caption className="sr-only">Users</caption>
          <thead className="bg-slate-50"><tr>{['Name', 'Email', 'Role', 'Region', 'Joined', 'Status', 'Actions'].map((h) => <th key={h} scope="col" className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{items.map((u) => (
            <tr key={u.id}>
              <td className="td font-medium">{u.name}{u.id === me.id && <span className="ml-2 text-xs text-slate-500">(you)</span>}</td><td className="td">{u.email}</td>
              <td className="td capitalize">{u.role}</td><td className="td">{u.role === 'admin' ? (u.region || '—') : '—'}</td><td className="td">{formatDate(u.createdAt)}</td>
              <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="td whitespace-nowrap space-x-3">
                <button className="underline disabled:no-underline disabled:opacity-40" disabled={u.id === me.id} onClick={() => openRole(u)}>Change role</button>
                <button className="underline disabled:no-underline disabled:opacity-40" disabled={u.id === me.id} onClick={() => setConfirm(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
              </td></tr>))}</tbody></table></div>
      )}
      <Pagination meta={meta} onPage={(p) => setF({ ...f, page: p })} />
      <Modal open={!!roleModal} onClose={() => setRoleModal(null)} title={`Change role · ${roleModal?.name || ''}`} footer={<><button className="btn-outline" onClick={() => setRoleModal(null)}>Cancel</button><Button loading={busy} onClick={saveRole}>Save role</Button></>}>
        <div className="space-y-4">
          {rerr && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{rerr}</p>}
          <Field as="select" label="Role" value={role} onChange={(e) => setRole(e.target.value)}><option value="citizen">Citizen</option><option value="admin">Administrator</option></Field>
          {role === 'admin' && <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">Administrators have regional and administrative authority to triage and resolve issues.</p>}
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} danger={confirm?.isActive} loading={busy} title={confirm?.isActive ? 'Deactivate account?' : 'Activate account?'} message={confirm?.isActive ? `${confirm?.name} will be signed out and unable to log in.` : `${confirm?.name} will be able to log in again.`} confirmLabel={confirm?.isActive ? 'Deactivate' : 'Activate'} onConfirm={toggleActive} onCancel={() => setConfirm(null)} />
    </div>
  );
}
