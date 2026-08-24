import { useState, useEffect, useRef, useCallback } from 'react';
import { firestore, type QueryOptions } from '../services/firestore';
import { Companion, ExperienceStory, Activity, Event, Partner, CommunityPost } from '../types';
import { offlineStorage } from '../services/storage';
import { db } from '../firebase';

export interface PaginationState {
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

interface SessionEntry<T> {
  items: T[];
  lastId?: string;
  exhausted: boolean;
}

interface PageResult<T> {
  items: T[];
  hasMore: boolean;
  failed?: boolean;
}

const sessionCache = new Map<string, SessionEntry<unknown>>();
const inflightPages = new Map<string, Promise<PageResult<unknown>>>();

const COMPANIONS_PAGE_SIZE = 15;
const DEFAULT_PAGE_SIZE = 10;

const COMPANIONS_QUERY: QueryOptions = {};
const STORIES_QUERY: QueryOptions = {};
const ACTIVITIES_QUERY: QueryOptions = {};
const EVENTS_QUERY: QueryOptions = {};
const PARTNERS_QUERY: QueryOptions = {};
const POSTS_QUERY: QueryOptions = {
  where: [{ field: 'status', operator: '==', value: 'published' }],
};

const deduplicateById = <T extends { id: string }>(arr: T[]): T[] => {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const fetchPage = <T extends { id: string }>(
  collectionName: string,
  cursorId: string | undefined,
  pageSize: number,
  baseOptions: QueryOptions
): Promise<PageResult<T>> => {
  const key = `${collectionName}|${cursorId ?? 'head'}`;
  const existing = inflightPages.get(key);
  if (existing) return existing as Promise<PageResult<T>>;
  const options: QueryOptions = {
    ...baseOptions,
    orderById: true,
    limitCount: pageSize,
    ...(cursorId ? { startAfter: [cursorId] } : {}),
  };
  const promise = firestore
    .getDocumentsPaginated<T>(collectionName, options)
    .finally(() => {
      inflightPages.delete(key);
    });
  inflightPages.set(key, promise as Promise<PageResult<unknown>>);
  return promise;
};

const usePaginatedCollection = <T extends { id: string }>(
  collectionName: string,
  pageSize: number,
  baseOptions: QueryOptions
): { items: T[]; loading: boolean; loadingMore: boolean; hasMore: boolean; loadMore: () => void } => {
  const cachedEntry = sessionCache.get(collectionName) as SessionEntry<T> | undefined;
  const [items, setItems] = useState<T[]>(() => cachedEntry?.items ?? []);
  const [hasMore, setHasMore] = useState<boolean>(() => !cachedEntry?.exhausted);
  const [loading, setLoading] = useState<boolean>(() => !cachedEntry);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (sessionCache.has(collectionName)) return;
    let cancelled = false;
    offlineStorage.getCachedCollection<T>(collectionName).then(cached => {
      if (cancelled || cached.length === 0) return;
      setItems(prev => (prev.length > 0 ? prev : deduplicateById(cached)));
    });
    return () => {
      cancelled = true;
    };
  }, [collectionName]);

  useEffect(() => {
    if (sessionCache.has(collectionName)) return;
    let cancelled = false;
    fetchPage<T>(collectionName, undefined, pageSize, baseOptions)
      .then(result => {
        if (cancelled) return;
        if (result.failed) {
          setLoading(false);
          return;
        }
        const uniqueItems = deduplicateById(result.items);
        sessionCache.set(collectionName, {
          items: uniqueItems,
          lastId: uniqueItems.length > 0 ? uniqueItems[uniqueItems.length - 1].id : undefined,
          exhausted: !result.hasMore || uniqueItems.length === 0,
        });
        setItems(prev => mergeCached(uniqueItems, prev));
        setHasMore(result.hasMore && uniqueItems.length > 0);
        setLoading(false);
        offlineStorage.cacheCollection(collectionName, uniqueItems);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionName, pageSize, baseOptions]);

  const loadMore = useCallback(() => {
    const entry = sessionCache.get(collectionName) as SessionEntry<T> | undefined;
    if (!entry || entry.exhausted) return;
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchPage<T>(collectionName, entry.lastId, pageSize, baseOptions)
      .then(result => {
        if (result.failed) return;
        const uniqueBatch = deduplicateById(result.items).filter(item => !entry.items.some(existing => existing.id === item.id));
        const merged = uniqueBatch.length > 0 ? [...entry.items, ...uniqueBatch] : entry.items;
        const nextLastId = result.items.length > 0 ? result.items[result.items.length - 1].id : entry.lastId;
        sessionCache.set(collectionName, {
          items: merged,
          lastId: nextLastId,
          exhausted: !result.hasMore,
        });
        setItems(merged);
        setHasMore(result.hasMore);
        offlineStorage.cacheCollection(collectionName, merged);
      })
      .catch(() => {})
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [collectionName, pageSize, baseOptions]);

  return { items, loading, loadingMore, hasMore, loadMore };
};

const mergeCached = <T extends { id: string }>(fetched: T[], previouslyPainted: T[]): T[] => {
  if (previouslyPainted.length === 0) return fetched;
  const fetchedIds = new Set(fetched.map(item => item.id));
  const staleExtras = previouslyPainted.filter(item => !fetchedIds.has(item.id));
  return [...fetched, ...staleExtras];
};

export const useCompanions = () => {
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<Companion>('companions', COMPANIONS_PAGE_SIZE, COMPANIONS_QUERY);
  return { companions: items, loading, loadingMore, hasMore, loadMore };
};

export const useStories = () => {
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<ExperienceStory>('stories', DEFAULT_PAGE_SIZE, STORIES_QUERY);
  return { stories: items, loading, loadingMore, hasMore, loadMore };
};

export const useActivities = () => {
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<Activity>('activities', DEFAULT_PAGE_SIZE, ACTIVITIES_QUERY);
  return { activities: items, loading, loadingMore, hasMore, loadMore };
};

export const useEvents = () => {
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<Event>('events', DEFAULT_PAGE_SIZE, EVENTS_QUERY);
  return { events: items, loading, loadingMore, hasMore, loadMore };
};

export const usePartners = () => {
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<Partner>('partners', DEFAULT_PAGE_SIZE, PARTNERS_QUERY);
  return { partners: items, loading, loadingMore, hasMore, loadMore };
};

export const useCommunityPosts = () => {
  const { items, loading, loadingMore, hasMore, loadMore } = usePaginatedCollection<CommunityPost>('community_posts', DEFAULT_PAGE_SIZE, POSTS_QUERY);
  return { posts: items, loading, loadingMore, hasMore, loadMore };
};

export const __testHooks = {
  sessionCache,
  inflightPages,
  dbPresent: !!db,
};
