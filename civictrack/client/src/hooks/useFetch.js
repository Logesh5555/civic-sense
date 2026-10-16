import { useCallback, useEffect, useRef, useState } from 'react';

/** Fetches on mount and whenever `deps` change; ignores stale responses. */
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const seq = useRef(0);
  const run = useCallback(() => {
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    return fn()
      .then((r) => { if (my === seq.current) setState({ data: r.data, meta: r.meta || null, loading: false, error: null }); })
      .catch((e) => { if (my === seq.current) setState((s) => ({ ...s, loading: false, error: e?.parsed?.message || 'Failed to load data' })); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

export function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
