import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Mail, Phone, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/Logo.jsx';
import { useAuth, homeFor } from '../context/AuthContext.jsx';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const link = ({ isActive }) =>
    `relative px-3 py-1.5 text-sm font-medium transition-colors rounded-lg ${
      isActive
        ? 'text-secondary font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-main">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[3000] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-2 md:flex" aria-label="Main">
            <NavLink to="/" end className={link}>
              Home
            </NavLink>
            <NavLink to="/track" className={link}>
              Track Complaint
            </NavLink>
            <a href="/#faq" className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
              FAQ
            </a>

            <div className="h-4 w-px bg-slate-200 mx-2" />

            {user ? (
              <div className="flex items-center gap-2">
                <Link to={homeFor(user.role)} className="btn-primary py-2 px-4 text-xs font-semibold">
                  Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
                <button
                  onClick={async () => { await logout(); navigate('/'); }}
                  className="btn-ghost py-2 px-3 text-xs"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost py-2 px-3 text-xs font-medium">
                  Log in
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-xs font-semibold shadow-sm">
                  Sign up
                </Link>
              </div>
            )}
          </nav>

          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {open && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-slate-200 bg-white px-4 py-4 md:hidden space-y-2 shadow-lg"
              aria-label="Mobile"
            >
              <Link onClick={() => setOpen(false)} to="/" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Home
              </Link>
              <Link onClick={() => setOpen(false)} to="/track" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Track Complaint
              </Link>
              <a onClick={() => setOpen(false)} href="/#faq" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                FAQ
              </a>

              <div className="pt-2 border-t border-slate-100">
                {user ? (
                  <Link onClick={() => setOpen(false)} to={homeFor(user.role)} className="btn-primary w-full justify-center">
                    Dashboard
                  </Link>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1 justify-center py-2 text-xs">
                      Log in
                    </Link>
                    <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1 justify-center py-2 text-xs">
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="bg-primary text-slate-200 border-t border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <Logo light />
            <p className="mt-3 max-w-xs text-sm text-slate-300 leading-relaxed">
              CivicTrack empowers citizens to report public infrastructure problems and hold municipal departments accountable through end-to-end transparent workflows.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Contact & Support</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-300">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                <span>support@civictrack.example</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                <span>+91 44 2859 0000 (Toll-Free Helpline)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-accent shrink-0" />
                <span>Greater City Corporation Headquarters</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Quick Links</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>
                <Link className="hover:text-accent hover:underline transition-colors" to="/privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="hover:text-accent hover:underline transition-colors" to="/terms">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link className="hover:text-accent hover:underline transition-colors" to="/track">
                  Track Complaint by Reference ID
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} CivicTrack Smart Municipal System. OpenStreetMap contributors.
        </div>
      </footer>
    </div>
  );
}
