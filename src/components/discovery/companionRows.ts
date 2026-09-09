import type { Companion } from '../../types';
import type { FeedItem } from '../../services/feedGenerator';

/** Desktop rows use up to three real, already-loaded category matches.
 * Media keeps its relative order; a profile is emitted only once per feed.
 */
export function fillCompanionRows(items: FeedItem[], companions: Companion[]): FeedItem[] {
  const emitted = new Set<string>();
  const result: FeedItem[] = [];
  const normalize = (value: string) => value.trim().toLowerCase();
  for (const item of items) {
    if (item.type !== 'companion') { result.push(item); continue; }
    if (emitted.has(item.data.id)) continue;
    const category = item.category || item.data.interests?.[0] || 'Local Companion';
    const matches = (companion: Companion) => category === 'Local Companion'
      ? !companion.interests?.length
      : companion.interests?.some(interest => normalize(interest) === normalize(category));
    const candidates = [item.data, ...items.flatMap(entry => entry.type === 'companion' && matches(entry.data) ? [entry.data] : []), ...companions.filter(matches)];
    let count = 0;
    for (const companion of candidates) {
      if (emitted.has(companion.id)) continue;
      emitted.add(companion.id);
      result.push({ ...item, data: companion });
      if (++count === 3) break;
    }
  }
  return result;
}
