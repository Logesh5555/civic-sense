import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homeFor } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';

export function FullPageSpinner() {
  return <div className="flex min-h-screen items-center justify-center" role="status"><Spinner className="h-8 w-8 text-navy-600" /><span className="sr-only">Loading…</span></div>;
}

/** Frontend guard for UX only — every API call is re-authorized by the backend. */
export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
