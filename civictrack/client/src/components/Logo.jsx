import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function Logo({ light = false, to = '/', compact = false, className = '' }) {
  return (
    <Link to={to} className={`inline-flex items-center rounded transition-all ${className}`} aria-label="CivicTrack home">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0 transition-transform duration-200 hover:scale-105" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill={light ? '#fff' : '#17305a'} />
        <path d="M16 6a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" fill="#14a39a" />
        <circle cx="16" cy="13" r="2.6" fill={light ? '#17305a' : '#fff'} />
      </svg>
      <AnimatePresence initial={false}>
        {!compact && (
          <motion.span
            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
            animate={{ opacity: 1, width: 'auto', marginLeft: 10 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden ${light ? 'text-white' : 'text-navy-800'}`}
          >
            Civic<span className="text-teal-400">Track</span>
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
