import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Camera, Search, CheckCircle2, ChevronDown, Users, Clock,
  TrendingUp, FileText, Sparkles, ShieldCheck, MapPin, Wrench
} from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { CATEGORIES, categoryLabel } from '../../utils/constants.js';
import { get } from '../../services/api.js';
import { useFetch } from '../../hooks/useFetch.js';
import { Skeleton, EmptyState } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate, formatHours } from '../../utils/format.js';

const FAQS = [
  ['How do I report an issue?', 'Create a free account, choose “Report an Issue”, describe the problem, add a photo, and pin the location on the map (or type an address). You will immediately receive a unique reference number.'],
  ['Do I have to share my GPS location?', 'No. GPS is optional and only used when you click “Use my current location”. You can also click anywhere on the map or simply describe the location in words.'],
  ['How can I follow my complaint?', 'Log in to see your real-time status timeline, or enter your reference number on the Track page. Public tracking never exposes personal contact details.'],
  ['What happens after I submit?', 'An administrator reviews the report, assigns it to the responsible municipal department, and department staff post progress updates and resolution notes.'],
  ['Can I withdraw or reopen a complaint?', 'You can withdraw a complaint before review begins. If an issue recurs after being resolved, you can reopen it with a detailed reason.'],
];

function AnimatedCounter({ value, duration = 1.2 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  useEffect(() => {
    if (!inView) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(ease * numValue));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(numValue);
      }
    };
    window.requestAnimationFrame(step);
  }, [inView, numValue, duration]);

  return <span ref={ref}>{displayValue}</span>;
}

function Stat({ icon: Icon, label, value, loading, suffix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="card card-interactive p-6 text-center bg-gradient-to-b from-white to-slate-50/70 border-slate-200/80"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-secondary ring-1 ring-secondary/20 shadow-sm">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      {loading ? (
        <Skeleton className="mx-auto mt-4 h-9 w-20" />
      ) : (
        <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
          {typeof value === 'number' ? (
            <>
              <AnimatedCounter value={value} />
              {suffix}
            </>
          ) : (
            value || '—'
          )}
        </p>
      )}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
    </motion.div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stats = useFetch(() => get('/public/stats'), []);
  const resolved = useFetch(() => get('/public/resolved'), []);
  const [open, setOpen] = useState(0);
  const s = stats.data;
  const reportTo = user ? '/report' : '/login';

  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-[#163B65] text-white pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 -mr-48 -mt-48 h-[600px] w-[600px] rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 h-[500px] w-[500px] rounded-full bg-sky-400/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-500/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-teal-300 backdrop-blur-md mb-6">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <span>Smart Civic Issue Management</span>
            </div>
            <h1 className="text-4xl font-black leading-[1.1] !text-white sm:text-5xl lg:text-6xl tracking-tight">
              Report an Issue. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-sky-300 to-white">
                Improve Your Community.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-slate-200 sm:text-lg leading-relaxed font-normal">
              Notice a pothole, broken streetlight, or overflowing waste container? Report it in 60 seconds with GPS and photos, then track the municipal response in real-time until resolution.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                to={reportTo}
                state={{ from: '/report' }}
                className="btn bg-secondary hover:bg-secondary-700 text-white px-6 py-3.5 text-sm font-bold shadow-lg shadow-secondary/30 hover:shadow-secondary/50 rounded-xl"
              >
                Report an Issue <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/track"
                className="btn border border-white/20 bg-white/5 hover:bg-white/10 text-white px-6 py-3.5 text-sm font-semibold rounded-xl backdrop-blur-md shadow-sm"
              >
                Track My Complaint
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs text-slate-300 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
                <span>Verified City Departments</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-400" />
                <span>Protected Citizen Privacy</span>
              </div>
            </div>
          </motion.div>

          {/* Floating Illustrations / Showcase Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-md space-y-4">
              {/* Floating Card 1 */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl shadow-card-elevated"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/30">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Road Surface Repaired</p>
                      <p className="text-xs text-teal-200">Anna Nagar 2nd Avenue</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                    Resolved
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300 border-t border-white/10 pt-2.5">
                  <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-teal-400" /> GPS Tagged</span>
                  <span>Completed in 18 hrs</span>
                </div>
              </motion.div>

              {/* Floating Card 2 */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl shadow-card-elevated ml-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/30">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Smart Verification</p>
                      <p className="text-xs text-sky-200">Before & After Photo Evidence</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[11px] font-bold text-sky-300 ring-1 ring-sky-400/30">
                    Inspected
                  </span>
                </div>
              </motion.div>

              {/* Category Badges Preview */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {CATEGORIES.slice(0, 4).map(({ key, icon: Icon, short }) => (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur-md"
                  >
                    <Icon className="h-4 w-4 text-teal-300" />
                    <span>{short}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Category Grid Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="cats">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Broad Civic Coverage</p>
          <h2 id="cats" className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            What can you report?
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Select the category that best matches the issue. Each report is automatically routed to the responsible department.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map(({ key, icon: Icon, label }, index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <Link
                to={user ? `/report?category=${key}` : '/login'}
                className="card card-interactive group flex flex-col p-5 h-full justify-between"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-secondary transition-all duration-300 group-hover:scale-110 group-hover:bg-secondary group-hover:text-white shadow-sm">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900 group-hover:text-secondary transition-colors">
                    {label}
                  </h3>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span>Report this</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3-Step Process */}
      <section className="bg-slate-50/80 py-20 border-y border-slate-200/80" aria-labelledby="how">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-bold uppercase tracking-wider text-secondary">Effortless Workflow</p>
            <h2 id="how" className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
              How CivicTrack Works
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base">
              A transparent, accountable bridge connecting residents directly with municipal service teams.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              [Camera, '1. Report', 'Describe the issue, attach photos, and drop a location pin on our interactive map.'],
              [Search, '2. Track', 'Follow real-time status changes with full timestamps, department notes, and timeline logs.'],
              [CheckCircle2, '3. Resolve', 'Field crews complete the fix, attach inspection notes, and provide an after-photo.']
            ].map(([Icon, title, desc], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="card card-interactive p-8 text-center relative bg-white"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#163B65] text-white shadow-md shadow-primary/20">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Live Database Statistics */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="impact">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Verified Impact</p>
          <h2 id="impact" className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Community Resolution Metrics
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            Live figures calculated directly from actual records in the CivicTrack database.
          </p>
        </div>

        {stats.error ? (
          <p role="alert" className="text-center text-sm text-red-600">Statistics are temporarily unavailable.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Stat loading={stats.loading} icon={FileText} label="Issues reported" value={s?.total} />
            <Stat loading={stats.loading} icon={CheckCircle2} label="Issues resolved" value={s?.resolved} />
            <Stat loading={stats.loading} icon={TrendingUp} label="Resolution rate" value={s?.resolutionRate} suffix="%" />
            <Stat loading={stats.loading} icon={Clock} label="Avg. time to resolve" value={s ? formatHours(s.avgResolutionHours) : null} />
          </div>
        )}

        {s && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-6 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm p-4 text-xs font-semibold text-slate-600 shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" aria-hidden="true" />
              <strong className="text-slate-900">{s.citizens}</strong> registered citizen{s.citizens === 1 ? '' : 's'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <strong className="text-slate-900">{s.inProgress}</strong> active task{s.inProgress === 1 ? '' : 's'} currently in progress
            </span>
          </motion.div>
        )}
      </section>

      {/* Recently Resolved Grid */}
      <section className="bg-slate-50/80 py-20 border-t border-slate-200/80" aria-labelledby="recent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-secondary">Verified Work</p>
              <h2 id="recent" className="mt-1 text-3xl font-extrabold text-slate-900 tracking-tight">
                Recently Resolved Issues
              </h2>
            </div>
            <Link to="/track" className="btn-outline text-xs">
              Search by reference code
            </Link>
          </div>

          <div>
            {resolved.loading ? (
              <div className="grid gap-5 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : resolved.error ? (
              <p role="alert" className="text-sm text-red-600">Could not load resolved issues.</p>
            ) : resolved.data.items.length === 0 ? (
              <EmptyState title="No resolved issues yet">
                Resolved complaints will appear here once departments finish work.
              </EmptyState>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {resolved.data.items.map((c) => (
                  <motion.article
                    key={c.referenceNumber}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="card card-interactive p-5 bg-white flex flex-col justify-between"
                  >
                    <div>
                      {c.resolutionImage && (
                        <div className="overflow-hidden rounded-xl mb-4 aspect-video bg-slate-100">
                          <img
                            src={typeof c.resolutionImage === 'object' && c.resolutionImage !== null ? c.resolutionImage.url : c.resolutionImage}
                            alt={`After repair: ${c.title}`}
                            loading="lazy"
                            onError={(e) => { if (e.currentTarget.parentElement) e.currentTarget.parentElement.style.display = 'none'; }}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        </div>
                      )}
                      <span className="font-mono text-xs font-bold text-secondary">
                        {c.referenceNumber}
                      </span>
                      <h3 className="mt-1 text-base font-bold text-slate-900 line-clamp-1">{c.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 font-medium">{categoryLabel(c.category)}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Resolved {formatDate(c.resolvedAt)}</span>
                      {c.department && <span className="font-semibold text-slate-700">{c.department}</span>}
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6" aria-labelledby="faqh">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Got Questions?</p>
          <h2 id="faqh" className="mt-1 text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-slate-200/80 rounded-2xl border border-slate-200/80 bg-white shadow-card overflow-hidden">
          {FAQS.map(([q, a], i) => (
            <div key={q} className="transition-colors hover:bg-slate-50/50">
              <h3>
                <button
                  className="flex w-full items-center justify-between px-6 py-5 text-left font-bold text-slate-900 transition-colors"
                  aria-expanded={open === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  <span className="pr-4">{q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
                      open === i ? 'rotate-180 text-secondary' : ''
                    }`}
                  />
                </button>
              </h3>
              {open === i && (
                <motion.div
                  id={`faq-${i}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 pb-5 text-sm text-slate-600 leading-relaxed"
                >
                  {a}
                </motion.div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <button
            className="btn bg-primary hover:bg-primary-900 text-white px-8 py-3.5 text-sm font-bold rounded-xl shadow-md"
            onClick={() => navigate(reportTo, { state: { from: '/report' } })}
          >
            Ready? Report an Issue Now
          </button>
        </div>
      </section>
    </div>
  );
}
