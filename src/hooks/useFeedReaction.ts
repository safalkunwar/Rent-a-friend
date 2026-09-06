import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAppContext } from '../context/AppContext';
import { socialRepository } from '../repositories/SocialRepository';

type Snapshot = { liked: boolean; count: number; busy: boolean; error: string | null };
type Entry = { snapshot: Snapshot; listeners: Set<() => void>; started: boolean; pending?: Promise<void> };
const entries = new Map<string, Entry>();
const publish = (entry: Entry, update: Partial<Snapshot>) => {
  entry.snapshot = { ...entry.snapshot, ...update };
  entry.listeners.forEach(listener => listener());
};

/** One reaction state and in-flight action per UID/content across responsive cards. */
export function useFeedReaction(kind: 'post' | 'story', id: string, initialCount: number) {
  const { currentUser, openAuthModal } = useAppContext();
  const uid = currentUser?.id;
  const key = JSON.stringify([uid ?? null, kind, id]);
  const entry = useMemo(() => {
    let current = entries.get(key);
    if (!current) {
      current = { snapshot: { liked: false, count: initialCount, busy: !!uid && !!id, error: null }, listeners: new Set(), started: false };
      entries.set(key, current);
    }
    return current;
  }, [key]);
  const subscribe = useCallback((listener: () => void) => {
    entry.listeners.add(listener);
    return () => {
      entry.listeners.delete(listener);
      // Allow StrictMode's immediate resubscribe before releasing this window.
      queueMicrotask(() => { if (!entry.listeners.size && entries.get(key) === entry) entries.delete(key); });
    };
  }, [entry, key]);
  const snapshot = useSyncExternalStore(subscribe, () => entry.snapshot, () => entry.snapshot);

  const refresh = useCallback(async () => {
    if (!uid || !id || entry.pending) return;
    publish(entry, { busy: true, error: null });
    const pending = socialRepository.getFeedReaction(kind, uid, id)
      .then(state => { publish(entry, state); })
      .catch(() => { publish(entry, { error: 'Likes unavailable. Try again online.' }); })
      .finally(() => { entry.pending = undefined; publish(entry, { busy: false }); });
    entry.pending = pending;
    await pending;
  }, [uid, kind, id, entry]);

  useEffect(() => {
    if (!entry.started) { entry.started = true; void refresh(); }
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [entry, refresh]);

  useEffect(() => {
    // Anonymous cards have no reaction lookup; reflect refreshed feed counts.
    if (!uid) publish(entry, { count: initialCount, liked: false });
  }, [entry, uid, initialCount]);

  const setLiked = useCallback(async (liked: boolean): Promise<boolean> => {
    if (!id) return false;
    if (!uid) { openAuthModal(); return false; }
    if (entry.pending) return false;
    publish(entry, { busy: true, error: null });
    let confirmed = false;
    const pending = (async () => {
      try {
        if (kind === 'post') {
          if (liked) await socialRepository.likePost(uid, id); else await socialRepository.unlikePost(uid, id);
        } else {
          if (liked) await socialRepository.likeStory(uid, id); else await socialRepository.unlikeStory(uid, id);
        }
        const state = await socialRepository.getFeedReaction(kind, uid, id);
        publish(entry, state);
        confirmed = true;
      } catch {
        publish(entry, { error: 'Could not confirm this reaction. Refresh likes before retrying.' });
      } finally {
        entry.pending = undefined;
        publish(entry, { busy: false });
      }
    })();
    entry.pending = pending;
    await pending;
    return confirmed;
  }, [uid, kind, id, entry, openAuthModal]);
  return { ...snapshot, setLiked, refresh };
}
