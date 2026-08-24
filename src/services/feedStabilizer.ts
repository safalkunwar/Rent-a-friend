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

export function stabilizeFeed(prevFeed: FeedItem[], nextFeed: FeedItem[]): FeedItem[] {
  if (prevFeed.length === 0) return nextFeed;
  if (nextFeed.length === 0) return [];

  const prevChunks = splitIntoChunks(prevFeed);
  const nextChunks = splitIntoChunks(nextFeed);

  const prevByKey = new Map<string, number>();
  prevChunks.forEach(chunk => {
    chunk.items.forEach((item, i) => prevByKey.set(itemKey(item), i));
  });

  const nextByCategory = new Map<string, FeedChunk>();
  for (const chunk of nextChunks) {
    const existing = nextByCategory.get(chunk.headerCategory);
    if (existing) {
      existing.items.push(...chunk.items);
    } else {
      nextByCategory.set(chunk.headerCategory, chunk);
    }
  }

  const stabilized: FeedChunk[] = [];
  for (const prevChunk of prevChunks) {
    const match = nextByCategory.get(prevChunk.headerCategory);
    if (!match) continue;
    nextByCategory.delete(prevChunk.headerCategory);

    const newKeys = new Set(match.items.map(itemKey));
    const kept = prevChunk.items.filter(item => newKeys.has(itemKey(item)));
    const keptKeys = new Set(kept.map(itemKey));
    const added = match.items.filter(item => !keptKeys.has(itemKey(item)));
    stabilized.push({ headerCategory: prevChunk.headerCategory, header: match.header || prevChunk.header, items: [...kept, ...added] });
  }

  for (const unmatched of nextByCategory.values()) {
    stabilized.push(unmatched);
  }

  const flat: FeedItem[] = [];
  for (const chunk of stabilized) {
    if (chunk.header) flat.push(chunk.header);
    for (const item of chunk.items) {
      if (item.type !== 'category-header') flat.push(item);
    }
  }
  return flat;
}
