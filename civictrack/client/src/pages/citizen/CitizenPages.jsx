import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, FilePlus2, Clock, Loader, CircleCheck, FileText, Bell, Check, ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, EmptyState, ErrorState, Field, KpiCard, PageHeader, Pagination, SkeletonCards, SkeletonKpis, StatusBadge, Thumb } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { get, patch, post } from '../../services/api.js';
import { applyServerErrors, errMsg, formatDate, timeAgo } from '../../utils/format.js';
import { categoryShort } from '../../utils/constants.js';
import { PasswordField } from '../public/AuthPages.jsx';

export function CitizenDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(() => get('/dashboard/citizen'), []);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hello, ${user.name.split(' ')[0]}`}
        subtitle="Track your reported issues, updates from municipal dispatch, and community resolutions."
        actions={
          <Link to="/report" className="btn-primary">
            <FilePlus2 className="h-4 w-4 mr-1.5" /> Report a new issue
          </Link>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <SkeletonKpis />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total submitted" value={data.totals.total} icon={FileText} />
          <KpiCard label="Pending" value={data.totals.pending} icon={Clock} tone="text-amber-600" hint="Submitted, in review or assigned" />
          <KpiCard label="In progress" value={data.totals.inProgress} icon={Loader} tone="text-indigo-600" />
          <KpiCard label="Resolved" value={data.totals.resolved} icon={CircleCheck} tone="text-emerald-600" />
        </div>
      )}

      {data && (
        <section aria-labelledby="recent">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="recent" className="text-lg font-bold text-slate-main">Recent Complaints</h2>
            <Link to="/my-complaints" className="text-xs font-semibold text-secondary hover:underline">
              View all ({data.totals.total}) →
            </Link>
          </div>

          {data.recent.length === 0 ? (
            <EmptyState title="No complaints yet" action={<Link to="/report" className="btn-primary">Report your first issue</Link>}>
              Spot a problem in your neighbourhood? Let municipal authorities know.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {data.recent.map((c, i) => (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/my-complaints/${c.id}`}
                    className="card-interactive flex gap-4 p-4 items-center group"
                  >
                    <Thumb src={c.images?.[0]} className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-secondary">{c.referenceNumber}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="truncate font-semibold text-slate-main group-hover:text-primary transition-colors">
                        {c.title}
                      </p>
                      <p className="text-xs text-slate-muted mt-0.5">
                        {categoryShort(c.category)} · {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export function ReportSuccess() {
  const { ref } = useParams();
  const { state } = useLocation();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const c = state?.complaint;

  const copyRef = () => {
    navigator.clipboard?.writeText(ref);
    setCopied(true);
    toast.info('Reference number copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-xl py-10 px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="card p-8 sm:p-10 border border-slate-200/80 shadow-card-elevated"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl font-extrabold text-slate-main tracking-tight">
          Complaint Successfully Submitted!
        </h1>
        <p className="mt-2 text-sm text-slate-muted max-w-md mx-auto leading-relaxed">
          Thank you for taking civic action. Your report has entered the municipal dispatch queue and is awaiting triage.
        </p>

        <div className="mx-auto mt-6 flex max-w-sm items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 shadow-inner">
          <div className="text-left">
            <span className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400">Reference Number</span>
            <span className="font-mono text-base font-bold text-primary tracking-wide" data-testid="ref">
              {ref}
            </span>
          </div>
          <button
            onClick={copyRef}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors text-slate-700"
            aria-label="Copy reference number"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {c && (
          <p className="mt-4 text-xs text-slate-500 italic">
            "{c.title}" · Status: Submitted
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {c && (
            <Link to={`/my-complaints/${c.id}`} className="btn-primary">
              View Complaint Details
            </Link>
          )}
          <Link to="/my-complaints" className="btn-outline">
            All My Complaints
          </Link>
          <Link to="/report" className="btn-outline">
            Report Another Issue
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const prof = useForm({ defaultValues: { name: user.name, phone: user.phone || '' } });
  const pw = useForm();
  const [perr, setPerr] = useState('');

  const saveProfile = async (v) => {
    setPerr('');
    try {
      const r = await patch('/auth/me', { name: v.name, phone: v.phone });
      setUser(r.data.user);
      toast.success('Profile updated');
    } catch (e) {
      if (!applyServerErrors(e, prof.setError, ['name', 'phone'])) setPerr(errMsg(e));
    }
  };

  const savePw = async (v) => {
    try {
      await post('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
      toast.success('Password changed');
      pw.reset();
    } catch (e) {
      if (!applyServerErrors(e, pw.setError, ['currentPassword', 'newPassword'])) toast.error(errMsg(e));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Profile Settings" subtitle={`${user.email} · Role: ${user.role}`} />

      <form onSubmit={prof.handleSubmit(saveProfile)} className="card space-y-4 p-6 border border-slate-200/80 shadow-card" noValidate>
        <h2 className="font-bold text-slate-main text-base">Contact Information</h2>
        {perr && <p role="alert" className="text-sm text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200">{perr}</p>}
        <Field
          label="Full name"
          required
          error={prof.formState.errors.name?.message}
          {...prof.register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
        />
        <Field
          label="Phone number"
          type="tel"
          error={prof.formState.errors.phone?.message}
          {...prof.register('phone', { pattern: { value: /^$|^[0-9+()\-\s]{7,20}$/, message: 'Enter a valid phone number' } })}
        />
        <Field label="Email" value={user.email} disabled readOnly hint="Email address is permanent and cannot be altered." onChange={() => {}} />
        <div className="pt-2">
          <Button type="submit" loading={prof.formState.isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>

      <form onSubmit={pw.handleSubmit(savePw)} className="card space-y-4 p-6 border border-slate-200/80 shadow-card" noValidate>
        <h2 className="font-bold text-slate-main text-base">Security & Password</h2>
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          error={pw.formState.errors.currentPassword?.message}
          registerProps={pw.register('currentPassword', { required: 'Enter your current password' })}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={pw.formState.errors.newPassword?.message}
          registerProps={pw.register('newPassword', {
            required: 'Enter a new password',
            minLength: { value: 8, message: 'At least 8 characters' },
            validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Must include a letter and a number'
          })}
        />
        <div className="pt-2">
          <Button type="submit" loading={pw.formState.isSubmitting}>
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, meta, loading, error, reload } = useFetch(() => get('/notifications', { page, limit: 15 }), [page]);
  const base = user.role === 'admin' ? '/admin/complaints' : user.role === 'staff' ? '/staff/complaints' : '/my-complaints';

  const markAll = async () => {
    await patch('/notifications/read-all');
    reload();
  };

  const markOne = async (n) => {
    if (!n.isRead) {
      await patch(`/notifications/${n.id}/read`);
      reload();
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications Center"
        subtitle="Real-time alerts on your submitted complaints and municipal status updates."
        actions={
          data?.unread > 0 && (
            <button className="btn-outline text-xs" onClick={markAll}>
              Mark all as read
            </button>
          )
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <SkeletonCards n={4} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications">
          You'll be notified immediately whenever your complaints progress or receive official updates.
        </EmptyState>
      ) : (
        <ul className="card divide-y divide-slate-100 border border-slate-200/80 shadow-card">
          {data.items.map((n) => (
            <li key={n.id} className={`flex items-start gap-3 p-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-teal-50/50'}`}>
              {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-secondary" aria-label="Unread" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-main">{n.title}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs">
                {n.complaintId && (
                  <Link to={`${base}/${n.complaintId}`} onClick={() => markOne(n)} className="text-secondary font-semibold hover:underline">
                    View
                  </Link>
                )}
                {!n.isRead && (
                  <button onClick={() => markOne(n)} className="text-slate-400 hover:text-slate-600">
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={meta} onPage={setPage} />
    </div>
  );
}
