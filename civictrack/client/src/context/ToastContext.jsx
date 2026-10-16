import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);
let id = 0;

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const STYLES = {
  success: 'border-emerald-200/80 bg-white/95 text-emerald-950 shadow-card-hover ring-1 ring-emerald-500/20',
  error: 'border-red-200/80 bg-white/95 text-red-950 shadow-card-hover ring-1 ring-red-500/20',
  info: 'border-sky-200/80 bg-white/95 text-slate-900 shadow-card-hover ring-1 ring-sky-500/20',
};
const ICON_STYLES = {
  success: 'text-emerald-600 bg-emerald-50',
  error: 'text-red-600 bg-red-50',
  info: 'text-sky-600 bg-sky-50',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((tid) => setToasts((t) => t.filter((x) => x.id !== tid)), []);
  const push = useCallback((type, message) => {
    const tid = ++id;
    setToasts((t) => [...t.slice(-3), { id: tid, type, message }]);
    setTimeout(() => dismiss(tid), 5000);
  }, [dismiss]);
  const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 right-5 z-[2000] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2.5"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                role={t.type === 'error' ? 'alert' : 'status'}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 backdrop-blur-md ${STYLES[t.type]}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${ICON_STYLES[t.type]}`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.type}</p>
                  <p className="mt-0.5 text-sm font-medium leading-snug">{t.message}</p>
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
