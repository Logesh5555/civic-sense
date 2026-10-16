import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Inbox, AlertTriangle, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATUS_META, PRIORITY_META } from '../utils/constants.js';

export function Spinner({ className = 'h-4 w-4' }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

export function Button({ loading, children, variant = 'primary', className = '', disabled, ...rest }) {
  return (
    <button
      className={`btn-${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, cls: 'bg-slate-100 text-slate-700 ring-slate-300', color: '#64748B' };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${m.cls}`}>
      <span className="relative flex h-2 w-2">
        {['in_progress', 'assigned'].includes(status) && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: m.color }}
          />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
      </span>
      {m.label}
    </span>
  );
};

export const PriorityBadge = ({ priority }) => {
  const metaClass = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${metaClass}`}>
      {priority}
    </span>
  );
};

/** Labelled form field with animated focus and hint/error wiring for accessibility */
export const Field = forwardRef(function Field({ label, error, hint, as = 'input', children, className = '', required, ...rest }, ref) {
  const id = useId();
  const Tag = as;
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label flex items-center justify-between">
        <span>{label}{required && <span className="text-red-500" aria-hidden="true"> *</span>}</span>
      </label>
      <Tag
        id={id}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={`input ${error ? 'input-error' : ''}`}
        {...rest}
      >
        {children}
      </Tag>
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600 animate-fade-in-up">{error}</p>}
    </div>
  );
});

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonCards({ n = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card flex gap-4 p-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function SkeletonKpis({ n = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300/80 bg-white/60 backdrop-blur-sm px-6 py-12 text-center shadow-subtle transition-all">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-800">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/70 backdrop-blur-sm px-6 py-10 text-center shadow-subtle">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-red-800">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-4 hover:bg-red-50 text-red-700 border-red-200">
          Try again
        </button>
      )}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) {
    return meta ? <p className="px-1 pt-3 text-xs text-slate-500 font-medium">{meta.total} result{meta.total === 1 ? '' : 's'}</p> : null;
  }
  return (
    <nav className="flex items-center justify-between pt-5" aria-label="Pagination">
      <p className="text-xs font-medium text-slate-500">
        Page <span className="font-semibold text-slate-800">{meta.page}</span> of <span className="font-semibold text-slate-800">{meta.pages}</span> · {meta.total} total
      </p>
      <div className="flex items-center gap-1.5">
        <button
          className="btn-outline px-3 py-1.5 text-xs rounded-lg"
          disabled={meta.page <= 1}
          onClick={() => onPage(meta.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <button
          className="btn-outline px-3 py-1.5 text-xs rounded-lg"
          disabled={meta.page >= meta.pages}
          onClick={() => onPage(meta.page + 1)}
          aria-label="Next page"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </nav>
  );
}

/** Accessible, animated modal: focus trap, Esc to close, backdrop blur, spring scale */
export function Modal({ open, onClose, title, children, footer, size = 'max-w-lg' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const el = ref.current;
    const focusables = () => el?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [];
    const elements = focusables();
    (elements[1] || elements[0])?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const f = [...focusables()].filter((x) => !x.disabled);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[1500] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`card flex max-h-[92vh] w-full flex-col ${size} rounded-b-none sm:rounded-2xl shadow-card-elevated border-slate-200`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 id={titleId} className="text-base font-bold text-slate-900">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 text-sm">{children}</div>
            {footer && <div className="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-6 py-3.5 rounded-b-2xl">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl text-primary">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Thumb({ src, alt = '', className = 'h-16 w-16' }) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = typeof src === 'object' && src !== null ? src.url : src;

  return resolvedUrl && !hasError ? (
    <img
      src={resolvedUrl}
      alt={alt}
      loading="lazy"
      onError={() => setHasError(true)}
      className={`${className} shrink-0 rounded-xl object-cover ring-1 ring-slate-200 transition-transform hover:scale-105 duration-200`}
    />
  ) : (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/60`}
      aria-hidden="true"
    >
      <MapPin className="h-5 w-5 text-slate-400" />
    </div>
  );
}

export function KpiCard({ label, value, hint, icon: Icon, tone = 'text-primary' }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="card card-interactive p-5 bg-gradient-to-br from-white to-slate-50/50"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80">
            <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
          </div>
        )}
      </div>
      <p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 font-medium">{hint}</p>}
    </motion.div>
  );
}
