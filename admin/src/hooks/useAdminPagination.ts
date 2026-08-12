import { useState, useEffect, useCallback } from 'react';

export interface PaginatedResult<T> {
  items: T[];
  lastVisible?: unknown[];
  hasMore: boolean;
  loading: boolean;
  error?: string;
}

export function useAdminPagination<T>(
  fetchFn: (options: { startAfter?: unknown[]; limitCount: number }) => Promise<{ items: T[]; lastVisible?: unknown[]; hasMore: boolean }>,
  pageSize = 20
): PaginatedResult<T> & {
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
} {
  const [items, setItems] = useState<T[]>([]);
  const [lastVisible, setLastVisible] = useState<unknown[] | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async (startAfter?: unknown[]) => {
    setLoading(true);
    setError(undefined);
    try {
      const result = await fetchFn({ startAfter, limitCount: pageSize });
      if (startAfter) {
        setItems(prev => [...prev, ...result.items]);
      } else {
        setItems(result.items);
      }
      setLastVisible(result.lastVisible);
      setHasMore(result.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const nextPage = useCallback(() => {
    if (lastVisible && hasMore && !loading) {
      load(lastVisible);
    }
  }, [lastVisible, hasMore, loading, load]);

  const reset = useCallback(() => {
    setItems([]);
    setLastVisible(undefined);
    setHasMore(true);
    load();
  }, [load]);

  const prevPage = useCallback(() => {
    reset();
  }, [reset]);

  return { items, lastVisible, hasMore, loading, error, nextPage, prevPage, reset };
}
