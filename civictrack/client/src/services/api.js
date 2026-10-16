import axios from 'axios';

export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20000 });

/** Normalizes API failures into { message, details, status }. */
export function parseError(err) {
  if (err?.response) {
    const e = err.response.data?.error;
    return { message: e?.message || 'Something went wrong', details: e?.details, status: err.response.status };
  }
  if (err?.code === 'ECONNABORTED') return { message: 'The request timed out. Please try again.', status: 0 };
  return { message: 'Cannot reach the server. Check your connection and try again.', status: 0 };
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/me') && onUnauthorized) onUnauthorized();
    const parsed = parseError(err);
    return Promise.reject(Object.assign(err, { parsed }));
  }
);

export const unwrap = (p) => p.then((r) => r.data);

export const get = (url, params) => unwrap(api.get(url, { params: cleanParams(params) }));
export const post = (url, body, cfg) => unwrap(api.post(url, body, cfg));
export const patch = (url, body, cfg) => unwrap(api.patch(url, body, cfg));
export const del = (url, params) => unwrap(api.delete(url, { params }));

export function cleanParams(p = {}) {
  return Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));
}
