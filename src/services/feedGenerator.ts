import { Companion, Activity, Event, ExperienceStory, CommunityPost } from '../types';

export type FeedItem =
  | { type: 'category-header'; category: string; emoji?: string }
  | { type: 'companion'; data: Companion; section: string; category?: string }
  | { type: 'activity'; data: Activity; section: string; category?: string }
  | { type: 'event'; data: Event; section: string; category?: string }
  | { type: 'story'; data: ExperienceStory; section: string }
  | { type: 'post'; data: CommunityPost; section: string };

export interface FeedOptions {
  userLocation?: string;
  userInterests?: string[];
  savedCompanionIds?: string[];
  viewedCompanionIds?: string[];
  bookedCompanionIds?: string[];
  joinedEventIds?: string[];
  maxItems?: number;
  categoriesPerFeed?: number;
  itemsPerCategory?: number;
  rng?: () => number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledBy<T>(items: T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const CATEGORY_RELATIONS: Record<string, string[]> = {
  'Hiking Partner': ['Travel Companion', 'Adventure Companion', 'Photography Guide', 'Local Host'],
  'Travel Companion': ['Hiking Partner', 'Tour Operator', 'Photography Guide', 'Local Host'],
  'Coffee Buddy': ['Food Explorer', 'Study Partner', 'Shopping Buddy', 'Local Host'],
  'Photography Guide': ['Travel Companion', 'Hiking Partner', 'Food Explorer', 'Cultural Guide'],
  'Food Explorer': ['Coffee Buddy', 'Travel Companion', 'Shopping Buddy', 'Local Host'],
  'Cultural Guide': ['Photography Guide', 'Heritage Walk Guide', 'Local Host', 'Museum Guide'],
  'Local Host': ['Hiking Partner', 'Travel Companion', 'Food Explorer', 'Coffee Buddy'],
  'Tour Operator': ['Travel Companion', 'Hiking Partner', 'Adventure Companion', 'Local Host'],
  'Cycling Guide': ['Hiking Partner', 'Adventure Companion', 'Photography Guide', 'Nature'],
  'Yoga Instructor': ['Meditation', 'Wellness', 'Nature', 'Local Host'],
  'Bird Watching Guide': ['Hiking Partner', 'Nature', 'Wildlife', 'Photography Guide'],
  'Heritage Walk Guide': ['Cultural Guide', 'Museum Guide', 'Local Host', 'Photography Guide'],
  'Adventure Companion': ['Hiking Partner', 'Cycling Guide', 'Paragliding', 'Travel Companion'],
  'Festival Guide': ['Cultural Guide', 'Local Host', 'Food Explorer', 'Heritage Walk Guide'],
  'Language Exchange Partner': ['Cultural Guide', 'Local Host', 'Coffee Buddy', 'Study Partner'],
};

const CATEGORY_EMOJIS: Record<string, string> = {
  'Hiking Partner': '🥾',
  'Travel Companion': '✈️',
  'Coffee Buddy': '☕',
  'Photography Guide': '📷',
  'Food Explorer': '🍜',
  'Cultural Guide': '🏛️',
  'Local Host': '✨',
  'Tour Operator': '🗺️',
  'Cycling Guide': '🚴',
  'Yoga Instructor': '🧘',
  'Bird Watching Guide': '🦅',
  'Heritage Walk Guide': '🚶',
  'Adventure Companion': '🎯',
  'Festival Guide': '🎉',
  'Language Exchange Partner': '🗣️',
  'Museum Guide': '🏛️',
  'Shopping Buddy': '🛍️',
  'Study Partner': '📚',
  'Nightlife': '🌙',
  'Photography Walk': '📷',
  'Local Companion': '✨',
};

const SECTION_TITLES: Record<string, { companion: string; activity: string; event: string }> = {
  'Hiking Partner': {
    companion: 'People who love hiking',
    activity: 'Hiking experiences nearby',
    event: 'Hiking events this weekend',
  },
  'Travel Companion': {
    companion: 'Travel buddies',
    activity: 'Adventure experiences',
    event: 'Upcoming trips',
  },
  'Coffee Buddy': {
    companion: 'Coffee companions',
    activity: 'Food & drink experiences',
    event: 'Food events',
  },
  'Photography Guide': {
    companion: 'Photography guides',
    activity: 'Photography experiences',
    event: 'Photo walks',
  },
  'Food Explorer': {
    companion: 'Food lovers',
    activity: 'Food experiences',
    event: 'Food events',
  },
  'Cultural Guide': {
    companion: 'Culture guides',
    activity: 'Cultural experiences',
    event: 'Cultural events',
  },
  'Local Host': {
    companion: 'Local companions',
    activity: 'Local experiences',
    event: 'Local events',
  },
  'Tour Operator': {
    companion: 'Tour operators',
    activity: 'Sightseeing experiences',
    event: 'Group tours',
  },
  'Cycling Guide': {
    companion: 'Cycling guides',
    activity: 'Cycling experiences',
    event: 'Cycling events',
  },
  'Yoga Instructor': {
    companion: 'Yoga instructors',
    activity: 'Yoga experiences',
    event: 'Yoga events',
  },
  'Bird Watching Guide': {
    companion: 'Bird watching guides',
    activity: 'Nature experiences',
    event: 'Wildlife events',
  },
  'Heritage Walk Guide': {
    companion: 'Heritage walk guides',
    activity: 'Heritage experiences',
    event: 'Heritage events',
  },
  'Adventure Companion': {
    companion: 'Adventure companions',
    activity: 'Adventure experiences',
    event: 'Adventure events',
  },
  'Festival Guide': {
    companion: 'Festival guides',
    activity: 'Festival experiences',
    event: 'Festival events',
  },
  'Language Exchange Partner': {
    companion: 'Language partners',
    activity: 'Language experiences',
    event: 'Language meetups',
  },
};

function getLocationMatch(item: { location?: string }, userLocation?: string): number {
  if (!userLocation || !item.location) return 0;
  const ul = userLocation.toLowerCase();
  const il = item.location.toLowerCase();
  if (il.includes(ul) || ul.includes(il)) return 3;
  return 0;
}

function getFreshness(item: any): number {
  const ts = item.createdAt || item.date || item.appliedDate;
  if (!ts) return 0;
  const age = Date.now() - new Date(ts).getTime();
  const days = age / (1000 * 60 * 60 * 24);
  if (days < 1) return 5;
  if (days < 7) return 3;
  if (days < 30) return 1;
  return 0;
}

export function weaveCompanionsIntoStream(
  companionEntries: ContentItem[],
  stream: ContentItem[],
  rng: () => number = Math.random
): ContentItem[] {
  const result: ContentItem[] = [];
  const gapCount = stream.length + 1;
  if (gapCount <= 0) return companionEntries.slice();

  const alloc = new Array<number>(gapCount).fill(0);
  let remaining = companionEntries.length;
  let guard = 0;
  while (remaining > 0 && guard++ < 10000) {
    let placedThisPass = 0;
    for (let g = 0; g < gapCount && remaining > 0; g++) {
      if (alloc[g] < 2) {
        alloc[g]++;
        remaining--;
        placedThisPass++;
      }
    }
    if (placedThisPass === 0) break;
  }

  const startOffset = gapCount > 0 ? Math.floor(rng() * gapCount) : 0;
  let companionIdx = 0;
  let streamIdx = 0;
  for (let k = 0; k < gapCount; k++) {
    const gap = (startOffset + k) % gapCount;
    for (let j = 0; j < alloc[gap] && companionIdx < companionEntries.length; j++) {
      result.push(companionEntries[companionIdx++]);
    }
    if (streamIdx < stream.length) {
      result.push(stream[streamIdx++]);
    }
  }
  return result;
}

function getCategoryFallbacks(category: string): string[] {
  return CATEGORY_RELATIONS[category] || ['Local Host', 'Travel Companion', 'Hiking Partner'];
}

type ContentItem = Exclude<FeedItem, { type: 'category-header' }>;

const TYPE_WEIGHTS: Record<string, number> = {
  companion: 0.30,
  activity: 0.20,
  event: 0.20,
  story: 0.15,
  post: 0.15,
};

export function interleaveByType(
  groups: ContentItem[][],
  rng: () => number = Math.random,
  initialLastType: string | null = null
): ContentItem[] {
  const queues = groups.map(group => group.slice());
  const result: ContentItem[] = [];
  let lastType: string | null = initialLastType;
  let safety = 0;
  while (queues.some(queue => queue.length > 0) && safety++ < 10000) {
    let candidates = queues.filter(queue => queue.length > 0);
    const differentFromLast = candidates.filter(queue => queue[0].type !== lastType);
    if (differentFromLast.length > 0) candidates = differentFromLast;
    const weights = candidates.map(queue => (TYPE_WEIGHTS[queue[0].type] ?? 0.2) * (0.75 + rng() * 0.5));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = rng() * totalWeight;
    let chosenIdx = candidates.length - 1;
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        chosenIdx = i;
        break;
      }
    }
    const chosen = candidates[chosenIdx];
    result.push(chosen.shift()!);
    lastType = chosen[0]?.type ?? lastType;
  }
  return result;
}

function scoreActivity(a: Activity, contextCategory?: string): number {
  let score = 0;
  score += getLocationMatch(a, contextCategory);
  if (contextCategory && a.category === contextCategory) score += 3;
  score += getFreshness(a);
  return score;
}

function scoreEvent(e: Event, contextCategory?: string): number {
  let score = 0;
  score += getLocationMatch(e, contextCategory);
  score += getFreshness(e);
  return score;
}

function buildCategoryGroups(companions: Companion[], excludeIds: Set<string>, userLocation?: string): Map<string, Companion[]> {
  const groups = new Map<string, Companion[]>();
  const uncategorized: Companion[] = [];

  for (const c of companions) {
    if (excludeIds.has(c.id)) continue;
    const cat = c.interests?.[0];
    if (cat) {
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(c);
    } else {
      uncategorized.push(c);
    }
  }

  if (uncategorized.length > 0) {
    groups.set('Local Companion', uncategorized);
  }

  return groups;
}

export function generateDiscoveryFeed(
  companions: Companion[],
  activities: Activity[],
  events: Event[],
  stories: ExperienceStory[],
  posts: CommunityPost[],
  options: FeedOptions = {}
): FeedItem[] {
  const {
    userLocation,
    userInterests = [],
    savedCompanionIds = [],
    viewedCompanionIds = [],
    joinedEventIds = [],
    maxItems = 60,
    categoriesPerFeed = 3,
    itemsPerCategory = 6,
    rng: optionsRng,
  } = options;
  const rng = optionsRng ?? Math.random;

  const seenIds = new Set<string>();
  const feed: FeedItem[] = [];
  const usedCompanionIds = new Set<string>();
  const typeCounts: Record<string, number> = {};

  const TYPE_MAX_RATIO: Record<string, number> = {
    companion: 0.30,
    activity: 0.20,
    event: 0.20,
    story: 0.15,
    post: 0.15,
  };

  function addItem(item: FeedItem): boolean {
    if (item.type === 'category-header') return false;
    if (seenIds.has(item.data.id)) return false;
    if (feed.length >= maxItems) return false;

    const currentCount = typeCounts[item.type] || 0;
    const ratio = TYPE_MAX_RATIO[item.type] || 0.25;
    const maxForType = Math.max(1, Math.floor(maxItems * ratio));
    if (currentCount >= maxForType) return false;

    seenIds.add(item.data.id);
    typeCounts[item.type] = currentCount + 1;
    if (item.type === 'companion') {
      usedCompanionIds.add(item.data.id);
    }
    feed.push(item);
    return true;
  }

  const categoryGroups = buildCategoryGroups(companions, usedCompanionIds, userLocation);
  const sortedCategories = shuffledBy(Array.from(categoryGroups.keys()), rng);
  const selectedCategories = sortedCategories.slice(0, categoriesPerFeed);

  const allActivities = [...activities].sort((a, b) => scoreActivity(b) - scoreActivity(a));
  const allEvents = [...events].sort((a, b) => scoreEvent(b) - scoreEvent(a));
  const allStories = [...stories].sort((a, b) => getFreshness(b) - getFreshness(a));
  const allPosts = [...posts];

  let carryLastType: string | null = null;
  for (const category of selectedCategories) {
    const groupCompanions = categoryGroups.get(category) || [];
    const sectionTitles = SECTION_TITLES[category] || { companion: category, activity: category, event: category };

    feed.push({ type: 'category-header', category, emoji: CATEGORY_EMOJIS[category] });

    const relatedActivities = allActivities
      .filter(a => !seenIds.has(a.id) && (a.category === category || getCategoryFallbacks(category).includes(a.category || '')))
      .slice(0, 2);
    const relatedEvents = allEvents
      .filter(e => !seenIds.has(e.id) && (e.category === category || getCategoryFallbacks(category).includes(e.category || '')))
      .slice(0, 2);
    const relatedStories = allStories
      .filter(s => !seenIds.has(s.id) && (s.category === category || (!!s.tags && s.tags.includes(category.toLowerCase().replace(' ', '_')))))
      .slice(0, 1);
    const relatedPosts = allPosts
      .filter(p => !seenIds.has(p.id) && (!p.category || p.category.toLowerCase() === category.toLowerCase() || getCategoryFallbacks(category).includes(p.category || '')))
      .slice(0, 2);

    const shuffledCompanions = [...groupCompanions].slice(0, itemsPerCategory);

    const companionEntries: ContentItem[] = shuffledCompanions.map(c => ({ type: 'companion', data: c, section: sectionTitles.companion, category }));
    const activityEntries: ContentItem[] = relatedActivities.map(a => ({ type: 'activity', data: a, section: sectionTitles.activity, category }));
    const eventEntries: ContentItem[] = relatedEvents.map(e => ({ type: 'event', data: e, section: sectionTitles.event, category }));
    const storyEntries: ContentItem[] = relatedStories.map(s => ({ type: 'story', data: s, section: `${category} stories` }));
    const postEntries: ContentItem[] = relatedPosts.map(p => ({ type: 'post', data: p, section: 'Community Feed' }));

    const relatedNonCompanionCount =
      activityEntries.length +
      eventEntries.length +
      storyEntries.length +
      postEntries.length;
    const companionBudget = Math.min(
      companionEntries.length,
      itemsPerCategory,
      relatedNonCompanionCount * 2 + 3
    );
    const nonCompanionStream = interleaveByType(
      [activityEntries, eventEntries, storyEntries, postEntries],
      rng,
      carryLastType
    );
    const orderedCategoryItems = weaveCompanionsIntoStream(
      companionEntries.slice(0, companionBudget),
      nonCompanionStream
    );

    for (const item of orderedCategoryItems) {
      addItem(item);
    }

    if (orderedCategoryItems.length > 0) {
      carryLastType = orderedCategoryItems[orderedCategoryItems.length - 1].type;
    }
  }

  const leftoverCompanionEntries: ContentItem[] = companions
    .filter(c => !usedCompanionIds.has(c.id))
    .map(c => {
      const fallbackCategory = c.interests?.[0] || 'Local Companion';
      return { type: 'companion' as const, data: c, section: SECTION_TITLES[fallbackCategory]?.companion || fallbackCategory, category: fallbackCategory };
    });
  const leftoverActivityEntries: ContentItem[] = activities
    .filter(a => !seenIds.has(a.id))
    .map(a => ({ type: 'activity' as const, data: a, section: SECTION_TITLES[a.category || '']?.activity || a.category || 'Discover More', category: a.category || 'Discover More' }));
  const leftoverEventEntries: ContentItem[] = events
    .filter(e => !seenIds.has(e.id))
    .map(e => ({ type: 'event' as const, data: e, section: SECTION_TITLES[e.category || '']?.event || e.category || 'Discover More', category: e.category || 'Discover More' }));
  const leftoverStoryEntries: ContentItem[] = stories
    .filter(s => !seenIds.has(s.id))
    .map(s => ({ type: 'story' as const, data: s, section: `${s.category || 'SATHI'} stories` }));
  const leftoverPostEntries: ContentItem[] = posts
    .filter(p => !seenIds.has(p.id))
    .map(p => ({ type: 'post' as const, data: p, section: 'Community Feed' }));

  const otherTailCount =
    leftoverPostEntries.length +
    leftoverActivityEntries.length +
    leftoverEventEntries.length +
    leftoverStoryEntries.length;
  const tailCompanions: ContentItem[] = leftoverCompanionEntries
    .slice(0, otherTailCount * 2)
    .map(entry => ({ ...entry, _tail: true }));
  const tailStream: ContentItem[] = interleaveByType(
    [
      leftoverPostEntries.map(entry => ({ ...entry, _tail: true as const })),
      leftoverActivityEntries.map(entry => ({ ...entry, _tail: true as const })),
      leftoverEventEntries.map(entry => ({ ...entry, _tail: true as const })),
      leftoverStoryEntries.map(entry => ({ ...entry, _tail: true as const })),
    ],
    rng,
    carryLastType
  );
  const tailItems = weaveCompanionsIntoStream(tailCompanions, tailStream, rng);

  for (const item of tailItems) {
    addItem(item);
  }

  return feed;
}
