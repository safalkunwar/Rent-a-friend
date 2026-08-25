import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type FeedItem } from '../services/feedGenerator';
import { chunkFeedByHeader } from '../services/feedStabilizer';

interface UseProgressiveRevealOptions {
  feedItems: FeedItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore?: () => void;
  initialCount?: number;
}

export function useProgressiveReveal({
  feedItems,
  hasMore,
  loadingMore,
  onLoadMore,
  initialCount = 2,
}: UseProgressiveRevealOptions) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const chunks = useMemo(() => chunkFeedByHeader(feedItems), [feedItems]);

  const stateRef = useRef({ chunkCount: 0, revealed: initialCount, hasMore: false, loadingMore: false });
  stateRef.current = { chunkCount: chunks.length, revealed: visibleCount, hasMore, loadingMore };
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const advance = useCallback(() => {
    const state = stateRef.current;
    if (state.revealed < state.chunkCount) {
      setVisibleCount(prev => Math.min(prev + 1, state.chunkCount));
      return;
    }
    if (state.hasMore && !state.loadingMore) {
      onLoadMoreRef.current?.();
    }
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (typeof IntersectionObserver === 'undefined') {
      const handleScroll = () => {
        const rect = sentinel.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          advance();
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          advance();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [advance]);

  useEffect(() => {
    if (loadingMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const rect = sentinel.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200) {
      advance();
    }
  }, [feedItems, visibleCount, hasMore, loadingMore, advance]);

  const revealedItems = useMemo(
    () => chunks.slice(0, visibleCount).flatMap(chunk => [chunk.header, ...chunk.items].filter(Boolean) as FeedItem[]),
    [chunks, visibleCount]
  );

  return {
    visibleCount,
    totalChunks: chunks.length,
    revealedItems,
    sentinelRef,
  };
}
