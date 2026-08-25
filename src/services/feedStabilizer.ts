import { type FeedItem } from './feedGenerator';

export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const indexById = new Map<string, number>();
  existing.forEach((item, i) => indexById.set(item.id, i));
  const merged = existing.slice();
  for (const item of incoming) {
    if (!item || !item.id) continue;
    const idx = indexById.get(item.id);
    if (idx === undefined) {
      indexById.set(item.id, merged.length);
      merged.push(item);
    } else {
      merged[idx] = item;
    }
  }
  return merged;
}

export interface FeedChunk {
  headerCategory: string;
  header?: Extract<FeedItem, { type: 'category-header' }>;
  items: FeedItem[];
}

export function chunkFeedByHeader(feed: FeedItem[]): FeedChunk[] {
  const chunks: FeedChunk[] = [];
  let current: FeedChunk | null = null;
  for (const item of feed) {
    if (item.type === 'category-header') {
      if (current) chunks.push(current);
      current = { headerCategory: item.category, header: item, items: [] };
    } else if (current) {
      current.items.push(item);
    } else {
      current = { headerCategory: '', items: [item] };
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function splitIntoChunks(feed: FeedItem[]): FeedChunk[] {
  const chunks: FeedChunk[] = [];
  let current: FeedChunk | null = null;
  for (const item of feed) {
    if (item.type === 'category-header') {
      if (current) chunks.push(current);
      current = { headerCategory: item.category, header: item, items: [] };
    } else if (current) {
      current.items.push(item);
    } else {
      current = { headerCategory: '', items: [item] };
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const itemKey = (item: FeedItem): string =>
  item.type === 'category-header' ? `header:${item.category}` : `${item.type}:${item.data.id}`;

function splitIntoChunksAndTail(feed: FeedItem[]): { chunks: FeedChunk[]; tail: FeedItem[] } {
  let cut = feed.length;
  while (cut > 0 && (feed[cut - 1] as FeedItem & { _tail?: boolean })._tail === true) {
    cut--;
  }
  const chunks = cut > 0 ? splitIntoChunks(feed.slice(0, cut)) : [];
  const tail = feed.slice(cut);
  return { chunks, tail };
}

export function stabilizeFeed(prevFeed: FeedItem[], nextFeed: FeedItem[]): FeedItem[] {
  if (prevFeed.length === 0) return nextFeed;
  if (nextFeed.length === 0) return [];

  const { chunks: prevChunks, tail: prevTail } = splitIntoChunksAndTail(prevFeed);
  const { chunks: nextChunks, tail: nextTail } = splitIntoChunksAndTail(nextFeed);
  const prevTailKeys = new Set<string>(prevTail.map(item => itemKey(item)));

  const nextKeys = new Set<string>();
  nextChunks.forEach(chunk => chunk.items.forEach(item => nextKeys.add(itemKey(item))));
  nextTail.forEach(item => nextKeys.add(itemKey(item)));

  const nextByCategory = new Map<string, FeedChunk>();
  for (const chunk of nextChunks) {
    const existing = nextByCategory.get(chunk.headerCategory);
    if (existing) {
      existing.items.push(...chunk.items);
    } else {
      nextByCategory.set(chunk.headerCategory, chunk);
    }
  }

  const emitted = new Set<string>();
  const orphanGuard = new Set<string>();
  const stabilized: FeedChunk[] = [];
  const orphanAppends: Array<{ targetCategory: string; items: FeedItem[] }> = [];

  for (const prevChunk of prevChunks) {
    const match = nextByCategory.get(prevChunk.headerCategory);
    if (!match) continue;
    nextByCategory.delete(prevChunk.headerCategory);

    const matchKeys = new Set(match.items.map(itemKey));
    const kept: FeedItem[] = [];
    const orphans: FeedItem[] = [];
    for (const item of prevChunk.items) {
      if (matchKeys.has(itemKey(item))) {
        kept.push(item);
      } else {
        orphans.push(item);
      }
    }
    kept.forEach(item => emitted.add(itemKey(item)));

    const placedKeys = new Set(kept.map(itemKey));
    const added = match.items.filter(item => {
      const key = itemKey(item);
      return !placedKeys.has(key) && !emitted.has(key) && !orphanGuard.has(key) && !prevTailKeys.has(key);
    });
    added.forEach(item => emitted.add(itemKey(item)));

    stabilized.push({
      headerCategory: prevChunk.headerCategory,
      header: match.header || prevChunk.header,
      items: [...kept, ...added],
    });

    const liveOrphans = orphans.filter(item => nextKeys.has(itemKey(item)));
    liveOrphans.forEach(item => orphanGuard.add(itemKey(item)));
    if (liveOrphans.length > 0) {
      orphanAppends.push({ targetCategory: prevChunk.headerCategory, items: liveOrphans });
    }
  }

  for (const entry of orphanAppends) {
    const target = stabilized.find(chunk => chunk.headerCategory === entry.targetCategory);
    if (target) {
      const fresh = entry.items.filter(item => !emitted.has(itemKey(item)));
      fresh.forEach(item => emitted.add(itemKey(item)));
      target.items.push(...fresh);
    }
  }

  for (const unmatched of nextByCategory.values()) {
    const fresh = unmatched.items.filter(item => {
      const key = itemKey(item);
      return !emitted.has(key) && !prevTailKeys.has(key);
    });
    fresh.forEach(item => emitted.add(itemKey(item)));
    stabilized.push({ headerCategory: unmatched.headerCategory, header: unmatched.header, items: fresh });
  }

  const keptTail = prevTail.filter(item => {
    const key = itemKey(item);
    return nextKeys.has(key) && !emitted.has(key);
  });
  keptTail.forEach(item => emitted.add(itemKey(item)));

  const addedTail = nextTail.filter(item => !emitted.has(itemKey(item)));

  const flat: FeedItem[] = [];
  for (const chunk of stabilized) {
    if (chunk.header) flat.push(chunk.header);
    for (const item of chunk.items) {
      if (item.type !== 'category-header') flat.push(item);
    }
  }
  for (const item of [...keptTail, ...addedTail]) {
    if (item.type !== 'category-header') flat.push(item);
  }
  return flat;
}
