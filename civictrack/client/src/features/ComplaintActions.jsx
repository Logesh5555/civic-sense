import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Field, Modal } from '../components/ui.jsx';
import { patch, post } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { STATUS_META, TRANSITIONS } from '../utils/constants.js';
import { errMsg } from '../utils/format.js';

/** Status update: shows only transitions the backend would allow for this role; backend re-validates. */
export function StatusModal({ complaint, role, open, onClose, onDone }) {
  const toast = useToast();
  const allowed = (TRANSITIONS[complaint.status] || []).filter((s) => s !== 'reopened');
  const [status, setStatus] = useState(allowed[0] || '');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const needsReason = status === 'rejected';
  const resolving = status === 'resolved';

  const submit = async (v) => {
    setError('');
    try {
      const fd = new FormData();
      fd.append('status', status);
      if (v.reason) fd.append('reason', v.reason);
      if (resolving && file) fd.append('afterPhoto', file);
      await patch(`/complaints/${complaint.id || complaint._id}/status`, fd);
      toast.success(`Status updated to ${STATUS_META[status].label}`);
      onDone();
    } catch (e) { setError(e?.parsed?.details ? Object.values(e.parsed.details).join(' ') : errMsg(e)); }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Update status · ${complaint.referenceNumber}`}
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><Button loading={isSubmitting} disabled={!allowed.length} onClick={handleSubmit(submit)}>Update status</Button></>}>
      {allowed.length === 0 ? <p className="text-sm text-slate-600">No status changes are available for a complaint that is “{STATUS_META[complaint.status].label}”.</p> : (
        <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
          {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
          <p className="text-sm text-slate-600">Current status: <strong>{STATUS_META[complaint.status].label}</strong></p>
          <Field as="select" label="New status" required value={status} onChange={(e) => setStatus(e.target.value)}>
            {allowed.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </Field>
          {needsReason && <Field as="textarea" rows={3} label="Reason for rejection" required hint="Shown to the citizen." error={errors.reason?.message} {...register('reason', { required: 'A reason is required', minLength: { value: 5, message: 'At least 5 characters' } })} />}
          {resolving && (
            <div>
              <label htmlFor="after" className="label">After-photo (optional)</label>
              <input id="after" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm" />
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}

export function NoteForm({ complaintId, role, onDone }) {
  const toast = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { visibility: 'internal' } });
  const [error, setError] = useState('');
  const submit = async (v) => {
    setError('');
    try {
      await post(`/complaints/${complaintId}/notes`, { message: v.message, visibility: v.visibility, requestInfo: v.requestInfo || undefined });
      toast.success(v.visibility === 'citizen' ? 'Update sent to citizen' : 'Internal note saved');
      reset({ visibility: v.visibility, message: '' });
      onDone();
    } catch (e) { setError(errMsg(e)); }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
      {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
      <Field as="textarea" rows={3} label="Add note" required error={errors.message?.message} {...register('message', { required: 'Enter a message', minLength: { value: 2, message: 'Too short' }, maxLength: { value: 1000, message: 'At most 1000 characters' } })} />
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">Visibility</legend>
        <label className="flex items-center gap-2"><input type="radio" value="internal" {...register('visibility')} /> Internal only</label>
        <label className="flex items-center gap-2"><input type="radio" value="citizen" {...register('visibility')} /> Visible to citizen</label>
        {role === 'admin' && <label className="flex items-center gap-2"><input type="checkbox" {...register('requestInfo')} /> Request more information</label>}
      </fieldset>
      <Button type="submit" loading={isSubmitting} variant="outline">Add note</Button>
    </form>
  );
}
