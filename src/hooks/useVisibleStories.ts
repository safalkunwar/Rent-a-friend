import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDocsFromServer, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { ExperienceStory } from '../types';
import { MEDIA_PAGE_SIZE, visibleStory } from '../services/mediaContract';
import { visibleStoriesQuery } from '../services/mediaQueries';
export function useVisibleStories() {
  const [items,setItems] = useState<ExperienceStory[]>([]);
  const [loading,setLoading] = useState(true);
  const [loadingMore,setLoadingMore] = useState(false);
  const [hasMore,setHasMore] = useState(true);
  const [now,setNow] = useState(Date.now);
  const cursor = useRef<QueryDocumentSnapshot | undefined>(undefined);
  const epoch = useRef(0);
  const busy = useRef(false);
  const read = useCallback(async (more = false) => {
    if (!db || busy.current) { if (!db) setLoading(false); return; }
    busy.current = true;
    const version = epoch.current;
    if (more) setLoadingMore(true); else { setLoading(true); setItems([]); cursor.current = undefined; }
    try {
      const result = await getDocsFromServer(visibleStoriesQuery(db,Date.now(),MEDIA_PAGE_SIZE,more ? cursor.current : undefined));
      if (version !== epoch.current) return;
      const page = result.docs.map(document => ({...document.data(),id:document.id} as ExperienceStory));
      cursor.current = result.docs.at(-1);
      setItems(previous => more ? [...previous,...page.filter(item => !previous.some(existing => existing.id === item.id))].slice(-40) : page);
      setHasMore(result.size === MEDIA_PAGE_SIZE);
      setNow(Date.now());
    } catch {
      if (version === epoch.current) { setItems([]); setHasMore(false); }
    } finally {
      if (version === epoch.current) { busy.current = false; setLoading(false); setLoadingMore(false); }
    }
  },[]);
  useEffect(() => {
    void read();
    const focus = () => { void read(); };
    window.addEventListener('focus',focus);
    return () => { epoch.current++; busy.current = false; window.removeEventListener('focus',focus); };
  },[read]);
  useEffect(() => {
    // No one-second array churn: wake once at the next loaded Story's expiry.
    const times = items.map(item => typeof item.expiresAt === 'string' ? Date.parse(item.expiresAt) : item.expiresAt?.toMillis() ?? 0).filter(time => time > now);
    if (!times.length) return;
    const timer = window.setTimeout(() => setNow(Date.now()),Math.max(1,Math.min(...times) - Date.now() + 10));
    return () => window.clearTimeout(timer);
  },[items,now]);
  const stories = useMemo(() => items.filter(story => visibleStory(story,now)),[items,now]);
  const prependStory = useCallback((story: ExperienceStory) => setItems(previous =>
    visibleStory(story) ? [story,...previous.filter(item => item.id !== story.id)].slice(0,40) : previous),[]);
  const removeStory = useCallback((id: string) => setItems(previous => previous.filter(story => story.id !== id)),[]);
  return { stories,loading,loadingMore,hasMore,loadMore:useCallback(() => { void read(true); },[read]),prependStory,removeStory };
}
