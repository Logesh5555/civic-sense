import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, Plus, UserPlus } from 'lucide-react';
import { Button, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, SkeletonCards } from '../../components/ui.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { del, get, patch, post } from '../../services/api.js';
import { applyServerErrors, errMsg, formatHours } from '../../utils/format.js';

function DeptForm({ dept, onClose, onDone }) {
  const toast = useToast();
  const [error, setError] = useState('');
  const { register, handleSubmit, setError: setFE, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: dept?.name || '', description: dept?.description || '', email: dept?.contact?.email || '', phone: dept?.contact?.phone || '' } });
  const submit = async (v) => {
    setError('');
    const body = { name: v.name, description: v.description, contact: { email: v.email, phone: v.phone } };
    try { dept ? await patch(`/departments/${dept.id}`, body) : await post('/departments', body); toast.success(dept ? 'Department updated' : 'Department created'); onDone(); }
    catch (e) { if (!applyServerErrors(e, setFE, ['name'])) setError(errMsg(e)); }
  };
  return (
    <Modal open onClose={onClose} title={dept ? 'Edit department' : 'New department'} footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><Button loading={isSubmitting} onClick={handleSubmit(submit)}>Save</Button></>}>
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <Field label="Name" required error={errors.name?.message} {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })} />
        <Field as="textarea" rows={2} label="Description" {...register('description', { maxLength: 500 })} />
        <Field label="Contact email" type="email" error={errors.email?.message} {...register('email', { pattern: { value: /^$|^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })} />
        <Field label="Contact phone" type="tel" {...register('phone')} />
      </form>
    </Modal>
  );
}

function StaffForm({ dept, onClose, onDone }) {
  const toast = useToast();
  const [error, setError] = useState('');
  const { register, handleSubmit, setError: setFE, formState: { errors, isSubmitting } } = useForm();
  const submit = async (v) => {
    setError('');
    try { await post('/users/staff', { ...v, phone: v.phone || undefined, departmentId: dept.id }); toast.success('Staff account created'); onDone(); }
    catch (e) { if (!applyServerErrors(e, setFE, ['name', 'email', 'password', 'phone'])) setError(errMsg(e)); }
  };
  return (
    <Modal open onClose={onClose} title={`Add staff to ${dept.name}`} footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><Button loading={isSubmitting} onClick={handleSubmit(submit)}>Create account</Button></>}>
      <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
        {error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{error}</p>}
        <Field label="Full name" required error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
        <Field label="Email" type="email" required error={errors.email?.message} {...register('email', { required: 'Email is required' })} />
        <Field label="Phone (optional)" type="tel" error={errors.phone?.message} {...register('phone')} />
        <Field label="Temporary password" type="password" autoComplete="new-password" required hint="At least 8 characters with a letter and number. Ask the staff member to change it." error={errors.password?.message} {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
      </form>
    </Modal>
  );
}

export default function Departments() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => get('/departments'), []);
  const [modal, setModal] = useState(null); // {type, dept}
  const [reassign, setReassign] = useState('');
  const [busy, setBusy] = useState(false);
  const [delErr, setDelErr] = useState('');
  const items = data?.items || [];

  const toggle = async (d) => { try { await patch(`/departments/${d.id}`, { isActive: !d.isActive }); toast.success(d.isActive ? 'Department deactivated' : 'Department activated'); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const remove = async () => {
    setBusy(true); setDelErr('');
    try { await del(`/departments/${modal.dept.id}`, reassign ? { reassignTo: reassign } : undefined); toast.success('Department deleted'); setModal(null); setReassign(''); reload(); }
    catch (e) { setDelErr(errMsg(e)); } finally { setBusy(false); }
  };
  const done = () => { setModal(null); reload(); };

  return (
    <div>
      <PageHeader title="Departments" subtitle="Manage municipal departments and their staff." actions={<button className="btn-primary" onClick={() => setModal({ type: 'edit' })}><Plus className="h-4 w-4" />New department</button>} />
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <SkeletonCards /> : items.length === 0 ? <EmptyState icon={Building2} title="No departments yet" action={<button className="btn-primary" onClick={() => setModal({ type: 'edit' })}>Create department</button>}>Create departments before assigning complaints.</EmptyState> : (
        <div className="card overflow-x-auto"><table className="min-w-full">
          <caption className="sr-only">Departments</caption>
          <thead className="bg-slate-50"><tr>{['Department', 'Contact', 'Staff', 'Active complaints', 'Total', 'Status', 'Actions'].map((h) => <th key={h} scope="col" className="th">{h}</th>)}</tr></thead>
          <tbody className="divide-y">{items.map((d) => (
            <tr key={d.id}>
              <td className="td"><p className="font-medium">{d.name}</p><p className="max-w-xs truncate text-xs text-slate-500">{d.description}</p></td>
              <td className="td text-xs">{d.contact?.email || '—'}<br />{d.contact?.phone || ''}</td>
              <td className="td">{d.staffCount}</td><td className="td">{d.activeCount}</td><td className="td">{d.complaintCount}</td>
              <td className="td"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
              <td className="td whitespace-nowrap space-x-3">
                <button className="underline" onClick={() => setModal({ type: 'edit', dept: d })}>Edit</button>
                <button className="underline" onClick={() => toggle(d)}>{d.isActive ? 'Deactivate' : 'Activate'}</button>
                <button className="underline" onClick={() => setModal({ type: 'staff', dept: d })}><UserPlus className="mr-1 inline h-3.5 w-3.5" />Add staff</button>
                <button className="text-red-700 underline" onClick={() => { setDelErr(''); setReassign(''); setModal({ type: 'delete', dept: d }); }}>Delete</button>
              </td>
            </tr>))}</tbody></table></div>
      )}
      {modal?.type === 'edit' && <DeptForm dept={modal.dept} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'staff' && <StaffForm dept={modal.dept} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === 'delete' && (
        <Modal open onClose={() => setModal(null)} title={`Delete ${modal.dept.name}?`} footer={<><button className="btn-outline" onClick={() => setModal(null)}>Cancel</button><Button variant="danger" loading={busy} onClick={remove}>Delete department</Button></>}>
          <p className="text-sm text-slate-600">{modal.dept.activeCount} active complaint(s) and {modal.dept.staffCount} staff member(s) belong to this department. To delete it, move them to another active department. Deactivating is safer if you only want to stop new assignments.</p>
          {delErr && <p role="alert" className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">{delErr}</p>}
          <Field as="select" className="mt-4" label="Reassign everything to" value={reassign} onChange={(e) => setReassign(e.target.value)}>
            <option value="">Nothing (only allowed if department is unused)</option>
            {items.filter((d) => d.isActive && d.id !== modal.dept.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Field>
        </Modal>
      )}
    </div>
  );
}

export { formatHours };
