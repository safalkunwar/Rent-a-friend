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

export const splitIntoChunks = chunkFeedByHeader;

const itemKey = (item: FeedItem): string =>
  item.type === 'category-header' ? `header:${item.category}` : `${item.type}:${item.data.id}`;

/**
 * Keep surviving content in global display order, not regenerated category order.
 * availableItems is the authoritative current source window: omission from a
 * ranked/capped nextFeed is not a deletion. New selections append only.
 */
export function stabilizeFeed(
  prevFeed: FeedItem[],
  nextFeed: FeedItem[],
  availableItems: FeedItem[] = nextFeed
): FeedItem[] {
  if (prevFeed.length === 0) return nextFeed;
  const latest = new Map(availableItems.filter(item => item.type !== 'category-header').map(item => [itemKey(item), item]));
  const emitted = new Set<string>();
  const result: FeedItem[] = [];
  let companionRun = 0;

  const appendChunk = (chunk: FeedChunk, items: FeedItem[]) => {
    if (!items.length) return;
    if (chunk.header) result.push(chunk.header);
    result.push(...items);
  };

  // Keep the original section placement, but never keep its obsolete payload.
  for (const chunk of chunkFeedByHeader(prevFeed)) {
    const kept: FeedItem[] = [];
    for (const old of chunk.items) {
      const key = itemKey(old);
      const current = latest.get(key);
      if (!current || emitted.has(key)) continue;
      // If an interleaver was deleted/expired, defer overflow without moving
      // surviving cards ahead of one another or retaining invisible content.
      if (current.type === 'companion' && companionRun >= 3) continue;
      kept.push({ ...current, section: old.type === 'category-header' ? current.section : old.section });
      emitted.add(key);
      companionRun = current.type === 'companion' ? companionRun + 1 : 0;
    }
    appendChunk(chunk, kept);
  }

  const pending = chunkFeedByHeader(nextFeed).flatMap(chunk =>
    chunk.items.filter(item => !emitted.has(itemKey(item))).map(item => ({ chunk, item }))
  );
  let activeChunk: FeedChunk | undefined;
  while (pending.length) {
    // Only unseen content may move to bridge a run at the append boundary.
    let index = 0;
    if (companionRun >= 3 && pending[0].item.type === 'companion') {
      index = pending.findIndex(entry => entry.item.type !== 'companion');
      if (index < 0) break; // Defer extra companions; never invent filler.
    }
    const { chunk, item } = pending.splice(index, 1)[0];
    const key = itemKey(item);
    if (emitted.has(key)) continue;
    if (activeChunk !== chunk && chunk.header) result.push(chunk.header);
    activeChunk = chunk;
    result.push(item);
    emitted.add(key);
    companionRun = item.type === 'companion' ? companionRun + 1 : 0;
  }
  return result;
}
