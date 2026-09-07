import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { firestore, type QueryOptions } from '../services/firestore';
import { Companion, Activity, Event, Partner, CommunityPost } from '../types';
import { db } from '../firebase';
import { useVisibleStories } from './useVisibleStories';
import { visibleEventImage } from '../services/mediaContract';
import { getDocsFromServer } from 'firebase/firestore';
import { eventSummaryQuery } from '../services/mediaQueries';
import { mergeById } from '../services/feedStabilizer';

interface PageResult<T> { items: T[]; hasMore: boolean; failed?: boolean }
export interface PaginationState {
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}
const inflightPages = new Map<string, Promise<PageResult<unknown>>>();
const EMPTY_QUERY: QueryOptions = {};
const PUBLIC_EVENTS_QUERY: QueryOptions = { where: [{ field: 'moderationStatus', operator: '==', value: 'ACTIVE' }, { field: 'visibilityStatus', operator: '==', value: 'PUBLIC' }] };
const POSTS_QUERY: QueryOptions = { where: [{ field: 'status', operator: '==', value: 'published' }] };

const fetchPage = <T extends { id: string }>(
  collectionName: string, cursorId: string | undefined, pageSize: number, baseOptions: QueryOptions
): Promise<PageResult<T>> => {
  const key = JSON.stringify([collectionName, cursorId ?? null, pageSize, baseOptions]);
  const existing = inflightPages.get(key);
  if (existing) return existing as Promise<PageResult<T>>;
  const options: QueryOptions = {
    ...baseOptions, orderById: true, limitCount: pageSize,
    ...(cursorId ? { startAfter: [cursorId] } : {}),
  };
  const source: Promise<PageResult<T>> = collectionName === 'events' && db
    ? getDocsFromServer(eventSummaryQuery(db, pageSize, cursorId)).then(snapshot => ({
        items: snapshot.docs.map(document => ({ ...document.data(), id: document.id } as T)),
        hasMore: snapshot.size === pageSize,
      }))
    : firestore.getDocumentsPaginated<T>(collectionName, options);
  const promise = source.catch(() => ({ items: [], hasMore: false, failed: true }))
    .finally(() => { inflightPages.delete(key); });
  inflightPages.set(key, promise as Promise<PageResult<unknown>>);
  return promise;
};

const usePaginatedCollection = <T extends { id: string }>(
  collectionName: string, pageSize: number, baseOptions: QueryOptions
) => {
  // A session/offline cache is not evidence that a post is still published or
  // media is still visible. Remounts revalidate a bounded head page.
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lifecycle = useRef(0);
  const page = useRef({ cursor: undefined as string | undefined, ready: false, exhausted: false, busy: false });

  const read = useCallback(async (more: boolean) => {
    const state = page.current;
    if (state.busy || (more && (!state.ready || state.exhausted))) return;
    state.busy = true;
    const version = lifecycle.current;
    setError(null);
    if (more) setLoadingMore(true);
    else { setLoading(true); setItems([]); }
    try {
      const result = await fetchPage<T>(collectionName, more ? state.cursor : undefined, pageSize, baseOptions);
      if (version !== lifecycle.current) return;
      if (result.failed) throw new Error('Content unavailable. Try again online.');
      const batch = mergeById([], result.items);
      const cursor = result.items.at(-1)?.id;
      const hasNext = result.hasMore && !!cursor && (!more || cursor !== state.cursor);
      state.cursor = cursor ?? state.cursor;
      state.exhausted = !hasNext;
      state.ready = true;
      setItems(previous => more ? mergeById(previous, batch) : batch);
      setHasMore(hasNext);
    } catch {
      if (version === lifecycle.current) setError('Content unavailable. Try again online.');
    } finally {
      if (version === lifecycle.current) {
        state.busy = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [collectionName, pageSize, baseOptions]);

  useEffect(() => {
    page.current = { cursor: undefined, ready: false, exhausted: false, busy: false };
    void read(false);
    return () => { lifecycle.current++; };
  }, [read]);

  const loadMore = useCallback(() => read(true), [read]);
  const refresh = useCallback(() => read(false), [read]);
  const retry = useCallback(() => read(page.current.ready), [read]);
  return { items, loading, loadingMore, hasMore, loadMore, refresh, retry, error };
};

export const useCompanions = () => {
  const { items, ...state } = usePaginatedCollection<Companion>('companions', 15, EMPTY_QUERY);
  return { companions: items, ...state };
};
export const useStories = useVisibleStories;
export const useActivities = () => {
  const { items, ...state } = usePaginatedCollection<Activity>('activities', 10, EMPTY_QUERY);
  return { activities: items, ...state };
};
export const useEvents = () => {
  const { items, ...state } = usePaginatedCollection<Event>('events', 10, PUBLIC_EVENTS_QUERY);
  const events = useMemo(() => items.map(event => ({ ...event, imageUrl: visibleEventImage(event), image: visibleEventImage(event) })), [items]);
  return { events, ...state };
};
export const usePartners = () => {
  const { items, ...state } = usePaginatedCollection<Partner>('partners', 10, EMPTY_QUERY);
  return { partners: items, ...state };
};
export const useCommunityPosts = () => {
  const { items, ...state } = usePaginatedCollection<CommunityPost>('community_posts', 10, POSTS_QUERY);
  return { posts: items, ...state };
};
