import { useCallback, useEffect, useRef, useState } from 'react';

export interface FetchOptions {
  /** Refetch silently on this interval while the tab is visible. */
  refreshMs?: number;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  reload: () => void;
}

export function useFetch<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: FetchOptions = {},
): FetchState<T> {
  const { refreshMs } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const inFlightRef = useRef(false);
  const hasDataRef = useRef(false);

  const run = useCallback(
    async (silent: boolean) => {
      // Never stack background polls on top of each other.
      if (silent && inFlightRef.current) return;

      inFlightRef.current = true;
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await loaderRef.current();
        setData(result);
        hasDataRef.current = true;
        setError(null);
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        // A failed background refresh should not wipe out good data.
        if (!silent || !hasDataRef.current) {
          setError(normalized);
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    void run(false);
  }, [run, nonce]);

  useEffect(() => {
    if (!refreshMs) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        void run(true);
      }
    };

    const interval = window.setInterval(refreshIfVisible, refreshMs);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [run, refreshMs]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, refreshing, error, reload };
}
