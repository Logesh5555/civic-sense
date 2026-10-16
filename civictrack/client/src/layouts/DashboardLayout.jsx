import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell, LayoutDashboard, FilePlus2, ListChecks, User, LogOut, Menu, X, Search,
  ClipboardList, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck, Home, CheckCheck,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../components/Logo.jsx';
import { useAuth, complaintBase } from '../context/AuthContext.jsx';
import { get, patch } from '../services/api.js';
import { timeAgo } from '../utils/format.js';

const NAV = {
  citizen: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/report', label: 'Report an Issue', icon: FilePlus2 },
    { to: '/my-complaints', label: 'My Complaints', icon: ListChecks },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/complaints', label: 'Complaints', icon: ClipboardList },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ],
};

function useOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const ref = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  useOutside(ref, () => setOpen(false));

  const load = () => get('/notifications', { limit: 6 }).then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []); // eslint-disable-line

  const openItem = async (n) => {
    setOpen(false);
    if (!n.isRead) { await patch(`/notifications/${n.id}/read`).catch(() => {}); load(); }
    if (n.complaintId) navigate(`${complaintBase(user.role)}/${n.complaintId}`);
  };
  const markAll = async () => { await patch('/notifications/read-all').catch(() => {}); load(); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); load(); }}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/20"
        aria-label={`Notifications${data.unread ? `, ${data.unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {data.unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="card absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden shadow-card-elevated border border-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
              <span className="text-sm font-semibold text-slate-main">Notifications</span>
              {data.unread > 0 && (
                <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-secondary hover:underline font-medium">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {data.items.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-muted">No notifications yet.</li>
              )}
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`block w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      n.isRead ? 'bg-white' : 'bg-teal-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-secondary" />}
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-600 mt-0.5">{n.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-semibold text-secondary hover:bg-slate-50 transition-colors"
            >
              View all notifications →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('civictrack_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [q, setQ] = useState('');
  const menuRef = useRef(null);
  useOutside(menuRef, () => setMenu(false));
  const items = NAV[user.role] || NAV.citizen;
  const complaintsPath = user.role === 'admin' ? '/admin/complaints' : '/my-complaints';

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('civictrack_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!drawer) return undefined;
    const k = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [drawer]);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(`${complaintsPath}${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
    setDrawer(false);
  };
  const doLogout = async () => { await logout(); navigate('/'); };

  const renderNavLinks = (isDrawer = false) => (
    <nav aria-label="Main" className="flex-1 space-y-1.5 p-3">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => isDrawer && setDrawer(false)}
          className={({ isActive }) =>
            `relative group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            } ${collapsed && !isDrawer ? 'justify-center px-2 py-3' : ''}`
          }
          title={collapsed && !isDrawer ? label : undefined}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className={`absolute inset-0 bg-white/15 rounded-xl shadow-sm ${
                    collapsed && !isDrawer ? 'border-r-4 border-accent' : 'border-l-4 border-accent'
                  }`}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
              <AnimatePresence initial={false}>
                {(!collapsed || isDrawer) && (
                  <motion.span
                    initial={{ opacity: 0, width: 0, x: -8 }}
                    animate={{ opacity: 1, width: 'auto', x: 0 }}
                    exit={{ opacity: 0, width: 0, x: -8 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 truncate whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {collapsed && !isDrawer && (
                <span className="pointer-events-none absolute left-full ml-3 z-50 rounded-lg bg-slate-900/95 backdrop-blur px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl whitespace-nowrap opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                  {label}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[3000] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow-md">
        Skip to content
      </a>

      {/* Desktop Responsive Collapsible / Expandable Sidebar */}
      <aside
        className={`hidden shrink-0 flex-col bg-primary text-white transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex relative select-none border-r border-white/10 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div
          className={`border-b border-white/10 py-4 flex items-center transition-all ${
            collapsed ? 'px-3 justify-center' : 'px-5 justify-between'
          }`}
        >
          <Logo light to="/" compact={collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="rounded-lg p-1.5 text-slate-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              title="Minimize sidebar (Ctrl+B)"
              aria-label="Minimize sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>

        {renderNavLinks(false)}

        <div className="border-t border-white/10 p-3 space-y-2">
          <Link
            to="/"
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.98] transition-all duration-200 ${
              collapsed ? 'justify-center px-2' : ''
            }`}
            title={collapsed ? 'Public Site' : undefined}
          >
            <Home className="h-5 w-5 shrink-0 transition-transform duration-200 hover:scale-110" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Public site
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <button
            type="button"
            onClick={toggleCollapsed}
            className={`w-full flex items-center gap-2.5 rounded-xl py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 active:scale-[0.98] transition-all border border-white/10 bg-white/5 ${
              collapsed ? 'justify-center px-2' : 'px-3'
            }`}
            title={collapsed ? 'Maximize sidebar (Ctrl+B)' : 'Minimize sidebar (Ctrl+B)'}
            aria-label={collapsed ? 'Maximize sidebar' : 'Minimize sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 text-accent transition-transform duration-200 hover:scale-110" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 text-accent shrink-0 transition-transform duration-200 hover:scale-110" />
                <AnimatePresence initial={false}>
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="truncate whitespace-nowrap overflow-hidden"
                  >
                    Minimize sidebar
                  </motion.span>
                </AnimatePresence>
                <kbd className="ml-auto hidden xl:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/10 rounded text-slate-300">
                  Ctrl+B
                </kbd>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer with smooth animation */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-[1200] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-primary text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <Logo light />
                <button onClick={() => setDrawer(false)} aria-label="Close menu" className="text-white hover:bg-white/10 p-1 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>
              {renderNavLinks(true)}
              <div className="border-t border-white/10 p-3">
                <Link to="/" onClick={() => setDrawer(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
                  <Home className="h-5 w-5" /> Public site
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200/80 bg-white/95 backdrop-blur px-4 py-3 sm:px-6">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setDrawer(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors lg:hidden focus:outline-none focus:ring-2 focus:ring-secondary/20"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop minimize / maximize toggle button */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden lg:flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/20"
            title={collapsed ? 'Maximize sidebar (Ctrl+B)' : 'Minimize sidebar (Ctrl+B)'}
            aria-label={collapsed ? 'Maximize sidebar' : 'Minimize sidebar'}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5 text-secondary transition-transform hover:scale-105" />
            ) : (
              <PanelLeftClose className="h-5 w-5 transition-transform hover:scale-105" />
            )}
          </button>

          <form onSubmit={submitSearch} role="search" className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input pl-9 text-sm"
              placeholder="Search complaints by title, reference or location..."
              aria-label="Search complaints"
            />
          </form>

          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary/20"
                aria-haspopup="true"
                aria-expanded={menu}
                aria-label="Account menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-sm ring-2 ring-primary/20">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight text-slate-main">{user.name}</span>
                  <span className="block text-[11px] capitalize font-medium text-secondary">{user.role}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>

              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="card absolute right-0 z-50 mt-2 w-56 py-1.5 shadow-card-elevated border border-slate-200"
                    role="menu"
                  >
                    <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                      <p className="text-sm font-medium text-slate-main">{user.name}</p>
                      <p className="text-xs text-secondary capitalize">{user.role}</p>
                    </div>

                    <Link
                      role="menuitem"
                      to="/profile"
                      onClick={() => setMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-slate-400" /> Profile & Settings
                    </Link>

                    {user.role === 'admin' && (
                      <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500 font-medium">
                        <ShieldCheck className="h-4 w-4 text-sky-500" /> Administrator Mode
                      </div>
                    )}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      role="menuitem"
                      onClick={doLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
