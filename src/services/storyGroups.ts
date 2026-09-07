import type { ExperienceStory } from '../types';
import { mediaTime, visibleStory } from './mediaContract';

/** One presentation group per authenticated owner; documents remain independent. */
export function groupStories(stories: ExperienceStory[], now = Date.now()) {
  const groups = new Map<string, ExperienceStory[]>();
  const seen = new Set<string>();
  for (const story of stories) {
    if (!story.userId || seen.has(story.id) || !visibleStory(story, now)) continue;
    seen.add(story.id);
    const group = groups.get(story.userId) ?? [];
    group.push(story); groups.set(story.userId, group);
  }
  return [...groups].map(([ownerId, items]) => ({ ownerId, stories: items.sort((a, b) =>
    mediaTime(a.createdAt) - mediaTime(b.createdAt) || a.id.localeCompare(b.id)) }));
}
