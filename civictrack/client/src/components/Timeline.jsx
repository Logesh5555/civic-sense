import { Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { STATUS_META } from '../utils/constants.js';
import { formatDateTime } from '../utils/format.js';

/** Chronological status history, oldest → newest */
export function Timeline({ history = [] }) {
  if (!history.length) return <p className="text-sm text-slate-500">No history yet.</p>;
  return (
    <ol className="relative space-y-6 border-l-2 border-slate-200/80 ml-3 pl-6" aria-label="Status timeline">
      {history.map((h, i) => {
        const m = STATUS_META[h.to] || { label: h.to, color: '#64748B' };
        const isLatest = i === history.length - 1;
        return (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="relative group"
          >
            <span
              className={`absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white shadow-sm transition-transform duration-200 group-hover:scale-110 ${
                isLatest ? 'ring-teal-100 ring-offset-1' : ''
              }`}
              style={{ background: m.color }}
              aria-hidden="true"
            >
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5]" />
            </span>
            <div className="rounded-xl border border-slate-200/60 bg-white/70 p-3.5 shadow-sm transition-all hover:shadow-card hover:border-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <p className="text-sm font-bold text-slate-900">{m.label}</p>
                <time className="text-xs text-slate-400 font-medium">{formatDateTime(h.at)}</time>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {h.actorName ? <span>By <strong className="text-slate-700 font-semibold">{h.actorName}</strong></span> : null}
                {h.from ? <span className="ml-1.5 text-slate-400">· transitioned from {STATUS_META[h.from]?.label || h.from}</span> : null}
              </p>
              {h.reason && (
                <div className="mt-2.5 rounded-lg border border-amber-200/60 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold text-amber-800">Reason:</span> {h.reason}
                </div>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

const STEPS = ['submitted', 'under_review', 'in_progress', 'resolved'];

/** Horizontal progress through the standard resolution workflow */
export function ProgressSteps({ status }) {
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm font-medium text-red-900">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
        <div>
          <p className="font-bold">This complaint was rejected.</p>
          <p className="text-xs text-red-700 mt-0.5">Check the timeline below for the documented reason from municipal administrators.</p>
        </div>
      </div>
    );
  }

  const idx = status === 'reopened' ? 1 : STEPS.indexOf(status);

  return (
    <div className="w-full py-2">
      <ol className="flex items-center" aria-label="Progress">
        {STEPS.map((s, i) => {
          const isCompleted = i < idx;
          const isCurrent = i === idx;
          return (
            <li key={s} className="flex flex-1 items-center last:flex-none" aria-current={isCurrent ? 'step' : undefined}>
              <div className="flex flex-col items-center">
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 shadow-sm ${
                    isCompleted
                      ? 'bg-secondary text-white'
                      : isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary/20 scale-110'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4 stroke-[2.5]" /> : i + 1}
                </span>
                <span
                  className={`mt-2 hidden text-center text-xs tracking-tight sm:block transition-colors duration-200 ${
                    isCurrent
                      ? 'font-bold text-primary'
                      : isCompleted
                      ? 'font-semibold text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {STATUS_META[s].label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded-full transition-all duration-500 ${
                    i < idx ? 'bg-secondary' : 'bg-slate-200'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
