import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type FeedItem } from '../services/feedGenerator';
import { chunkFeedByHeader } from '../services/feedStabilizer';

interface UseProgressiveRevealOptions {
  feedItems: FeedItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore?: () => void | Promise<void>;
  initialCount?: number;
  sessionKey?: string;
  enabled?: boolean;
}

export function useProgressiveReveal({
  feedItems, hasMore, loadingMore, onLoadMore, initialCount = 2,
  sessionKey = '', enabled = true,
}: UseProgressiveRevealOptions) {
  const [reveal, setReveal] = useState({ sessionKey, count: initialCount });
  const visibleCount = reveal.sessionKey === sessionKey ? reveal.count : initialCount;
  const chunks = useMemo(() => chunkFeedByHeader(feedItems), [feedItems]);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const requested = useRef<FeedItem[] | null>(null);
  const pending = useRef(false);
  const state = useRef({ chunks, visibleCount, hasMore, loadingMore, onLoadMore, enabled, feedItems, sessionKey });
  state.current = { chunks, visibleCount, hasMore, loadingMore, onLoadMore, enabled, feedItems, sessionKey };

  const advance = useCallback(() => {
    const current = state.current;
    if (!current.enabled || current.loadingMore || pending.current) return;
    if (current.visibleCount < current.chunks.length) {
      const count = current.visibleCount + 1;
      current.visibleCount = count;
      setReveal({ sessionKey: current.sessionKey, count });
    } else if (current.hasMore && current.onLoadMore && requested.current !== current.feedItems) {
      requested.current = current.feedItems;
      pending.current = true;
      // A failed/empty page must not trigger a tight automatic retry loop.
      Promise.resolve().then(() => current.onLoadMore?.()).catch(() => {}).finally(() => { pending.current = false; });
    }
  }, []);

  const nearViewport = useCallback((node: Element) => {
    // CSS-hidden responsive branches have no layout boxes.
    if (!node.isConnected || node.getClientRects().length === 0) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight + 200 && rect.bottom > -200;
  }, []);

  const checkVisible = useCallback(() => {
    if ([...nodes.current.values()].some(nearViewport)) advance();
  }, [advance, nearViewport]);

  const refs = useMemo(() => {
    const register = (surface: string) => (node: HTMLDivElement | null) => {
      const previous = nodes.current.get(surface);
      if (previous) observerRef.current?.unobserve(previous);
      if (node) {
        nodes.current.set(surface, node);
        observerRef.current?.observe(node);
      } else nodes.current.delete(surface);
    };
    return { sentinelRef: register('desktop'), mobileSentinelRef: register('mobile') };
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && nearViewport(entry.target))) advance();
      }, { rootMargin: '200px' });
      observerRef.current = observer;
      nodes.current.forEach(node => observer.observe(node));
    }
    window.addEventListener('scroll', checkVisible, { passive: true });
    window.addEventListener('resize', checkVisible);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      window.removeEventListener('scroll', checkVisible);
      window.removeEventListener('resize', checkVisible);
    };
  }, [advance, checkVisible, nearViewport]);

  useEffect(() => {
    requested.current = null;
    setReveal({ sessionKey, count: initialCount });
  }, [sessionKey, initialCount]);
  useEffect(checkVisible, [feedItems, visibleCount, hasMore, loadingMore, enabled, sessionKey, checkVisible]);

  const revealedItems = useMemo(
    () => chunks.slice(0, visibleCount).flatMap(chunk => [chunk.header, ...chunk.items].filter(Boolean) as FeedItem[]),
    [chunks, visibleCount]
  );
  return { visibleCount, totalChunks: chunks.length, revealedItems, ...refs };
}
