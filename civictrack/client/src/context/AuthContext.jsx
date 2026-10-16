import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post, setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    get('/auth/me')
      .then((r) => alive && setUser(r.data.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    setUnauthorizedHandler(() => setUser(null));
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (body) => { const r = await post('/auth/login', body); setUser(r.data.user); return r.data.user; }, []);
  const register = useCallback(async (body) => { const r = await post('/auth/register', body); setUser(r.data.user); return r.data.user; }, []);
  const logout = useCallback(async () => { try { await post('/auth/logout'); } finally { setUser(null); } }, []);

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const homeFor = (role) => (role === 'admin' ? '/admin' : '/dashboard');
export const complaintBase = (role) => (role === 'admin' ? '/admin/complaints' : '/my-complaints');
