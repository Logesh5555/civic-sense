import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, User as UserIcon, Copy } from 'lucide-react';
import { ConfirmDialog, ErrorState, PageHeader, PriorityBadge, Skeleton, StatusBadge, Button, Modal, Field } from '../components/ui.jsx';
import { LocationMap } from '../components/Maps.jsx';
import { ProgressSteps, Timeline } from '../components/Timeline.jsx';
import { NoteForm, StatusModal } from './ComplaintActions.jsx';
import { useAuth, complaintBase } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { del, get, patch, post } from '../services/api.js';
import { categoryLabel } from '../utils/constants.js';
import { errMsg, formatDateTime } from '../utils/format.js';

function Section({ title, children }) { return <section className="card p-5"><h2 className="mb-3 text-base font-semibold">{title}</h2>{children}</section>; }

export default function ComplaintDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => get(`/complaints/${id}`), [id]);
  const dups = useFetch(() => (user.role === 'admin' ? get(`/complaints/${id}/duplicates`) : Promise.resolve({ data: { items: [] } })), [id, user.role]);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonErr, setReasonErr] = useState('');
  const base = complaintBase(user.role);
  const back = <Link to={base} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-navy-800"><ArrowLeft className="h-4 w-4" />Back to complaints</Link>;

  if (loading && !data) return <div>{back}<Skeleton className="h-8 w-1/2" /><div className="mt-6 grid gap-6 lg:grid-cols-3"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div></div>;
  if (error) return <div>{back}<ErrorState message={error} onRetry={reload} /></div>;
  const c = data.complaint;
  const done = () => { setModal(null); reload(); };
  const coords = c.location?.coordinates;
  const isCitizen = user.role === 'citizen';
  const canWithdraw = isCitizen && c.status === 'submitted';
  const canReopen = (isCitizen || user.role === 'admin') && ['resolved', 'rejected'].includes(c.status);

  const withdraw = async () => { setBusy(true); try { await del(`/complaints/${c.id}`); toast.success('Complaint withdrawn'); navigate(base, { replace: true }); } catch (e) { toast.error(errMsg(e)); setBusy(false); setModal(null); } };
  const reopen = async () => {
    if (reason.trim().length < 5) { setReasonErr('Please give a reason (at least 5 characters).'); return; }
    setBusy(true);
    try { await post(`/complaints/${c.id}/reopen`, { reason }); toast.success('Complaint reopened'); setReason(''); setBusy(false); done(); }
    catch (e) { setReasonErr(errMsg(e)); setBusy(false); }
  };
  const markDuplicate = async (dupId) => { try { await patch(`/complaints/${c.id}`, { duplicateOf: dupId }); toast.success('Marked as duplicate'); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const changePriority = async (priority) => { try { await patch(`/complaints/${c.id}`, { priority }); toast.success('Priority updated'); reload(); } catch (e) { toast.error(errMsg(e)); } };

  return (
    <div>
      {back}
      <PageHeader
        title={c.title}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><span className="font-mono font-semibold text-teal-700">{c.referenceNumber}</span>
          <button onClick={() => { navigator.clipboard?.writeText(c.referenceNumber); toast.info('Reference copied'); }} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Copy reference number"><Copy className="h-3.5 w-3.5" /></button></span>}
        actions={<>
          {user.role !== 'citizen' && <button className="btn-primary" onClick={() => setModal('status')}>Update status</button>}
          {canReopen && <button className="btn-outline" onClick={() => setModal('reopen')}>Reopen</button>}
          {canWithdraw && <button className="btn-danger" onClick={() => setModal('withdraw')}>Withdraw</button>}
        </>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Progress"><div className="mb-4 flex items-center gap-3"><StatusBadge status={c.status} /><PriorityBadge priority={c.priority} /></div><ProgressSteps status={c.status} /></Section>
          <Section title="Details">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{c.description}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2"><Calendar className="mt-0.5 h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Submitted</dt><dd>{formatDateTime(c.createdAt)}</dd></div></div>
              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-slate-400" /><div><dt className="text-xs text-slate-500">Location</dt><dd>{c.locationDescription}</dd></div></div>
              <div><dt className="text-xs text-slate-500">Category</dt><dd>{categoryLabel(c.category)}</dd></div>
              {!isCitizen && c.citizenId?.name && <div><dt className="text-xs text-slate-500">Citizen</dt><dd>{c.citizenId.name}{user.role === 'admin' && c.citizenId.email ? ` · ${c.citizenId.email}` : ''}</dd></div>}
            </dl>
            {c.images?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {c.images.map((img, i) => {
                  const src = typeof img === 'object' && img !== null ? img.url : img;
                  if (!src) return null;
                  return (
                    <a key={img?.publicId || src || i} href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                      <img
                        src={src}
                        alt={`Submitted photo ${i + 1}`}
                        loading="lazy"
                        className="h-40 w-40 object-cover ring-1 ring-slate-200 transition-transform hover:scale-105 duration-200"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </a>
                  );
                })}
              </div>
            )}
          </Section>
          {coords && <Section title="Location map"><LocationMap lat={coords[1]} lng={coords[0]} status={c.status} /><p className="mt-2 text-xs text-slate-500">Lat {coords[1]}, Lng {coords[0]}</p></Section>}
          {(c.resolutionDetails || c.resolutionImage || c.resolvedAt) && (
            <Section title="Resolution">
              {c.resolutionDetails && <p className="whitespace-pre-wrap text-sm">{c.resolutionDetails}</p>}
              {c.resolutionImage && (
                <img
                  src={typeof c.resolutionImage === 'object' && c.resolutionImage !== null ? c.resolutionImage.url : c.resolutionImage}
                  alt="After-repair photo"
                  loading="lazy"
                  className="mt-3 h-48 rounded-lg object-cover ring-1 ring-slate-200"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              {c.resolvedAt && <p className="mt-2 text-xs text-slate-500">Resolved {formatDateTime(c.resolvedAt)}</p>}
            </Section>
          )}
          <Section title={isCitizen ? 'Municipal updates' : 'Citizen-visible updates'}>
            {c.citizenVisibleUpdates?.length ? <ul className="space-y-3">{c.citizenVisibleUpdates.map((u, i) => <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm">{u.message}<span className="mt-1 block text-xs text-slate-500">{u.authorName} · {formatDateTime(u.at)}</span></li>)}</ul> : <p className="text-sm text-slate-500">No updates yet.</p>}
          </Section>
          {!isCitizen && (
            <Section title="Internal notes">
              {c.internalNotes?.length ? <ul className="mb-4 space-y-3">{c.internalNotes.map((u, i) => <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">{u.message}<span className="mt-1 block text-xs text-slate-500">{u.authorName} · {formatDateTime(u.at)}</span></li>)}</ul> : <p className="mb-4 text-sm text-slate-500">No internal notes.</p>}
              <NoteForm complaintId={c.id} role={user.role} onDone={reload} />
            </Section>
          )}
        </div>
        <div className="space-y-6">
          <Section title="Status timeline"><Timeline history={c.statusHistory} /></Section>
          {user.role === 'admin' && (
            <Section title="Admin controls">
              <Field as="select" label="Priority" value={c.priority} onChange={(e) => changePriority(e.target.value)}>
                {['low', 'medium', 'high', 'critical'].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
              </Field>
              {c.suggestedPriority && c.suggestedPriority !== c.priority && <p className="mt-1 text-xs text-slate-500">Category suggestion: {c.suggestedPriority}</p>}
              <h3 className="mb-2 mt-4 text-sm font-medium">Possible duplicates (within 100 m)</h3>
              {dups.data?.items?.length ? <ul className="space-y-2 text-sm">{dups.data.items.map((d) => <li key={d.id} className="flex items-center justify-between gap-2"><Link className="text-teal-700 underline" to={`/admin/complaints/${d.id}`}>{d.referenceNumber}</Link><button className="text-xs text-slate-600 underline" onClick={() => markDuplicate(d.id)}>Mark as duplicate of</button></li>)}</ul> : <p className="text-sm text-slate-500">None found.</p>}
              {c.duplicateOf && <p className="mt-2 text-xs text-amber-800">Flagged as duplicate of another complaint.</p>}
            </Section>
          )}
        </div>
      </div>

      {modal === 'status' && <StatusModal complaint={c} role={user.role} open onClose={() => setModal(null)} onDone={done} />}
      <ConfirmDialog open={modal === 'withdraw'} danger loading={busy} title="Withdraw complaint?" message="This permanently removes your complaint. You can only do this before review begins." confirmLabel="Withdraw" onConfirm={withdraw} onCancel={() => setModal(null)} />
      <Modal open={modal === 'reopen'} onClose={() => { setModal(null); setReasonErr(''); }} title="Reopen complaint" footer={<><button className="btn-outline" onClick={() => setModal(null)}>Cancel</button><Button loading={busy} onClick={reopen}>Reopen</Button></>}>
        <Field as="textarea" rows={3} label="Reason for reopening" required value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(''); }} error={reasonErr} hint="Explain why the issue is not resolved." />
      </Modal>
    </div>
  );
}
