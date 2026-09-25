import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Loads data whenever the screen gains focus (and on demand via `reload`).
 * Responses that arrive after a newer request started are discarded.
 */
export function useFocusedQuery<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps);

  const run = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      const id = ++requestId.current;
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await load();
        if (id === requestId.current) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (id === requestId.current) setError((err as Error).message);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [load],
  );

  useFocusEffect(
    useCallback(() => {
      void run('silent');
    }, [run]),
  );

  return {
    data,
    setData,
    error,
    loading: loading && data === null,
    refreshing,
    refresh: () => run('refresh'),
    reload: () => run('silent'),
  };
}
