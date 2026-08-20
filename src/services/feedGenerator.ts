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

function getCategoryFallbacks(category: string): string[] {
  return CATEGORY_RELATIONS[category] || ['Local Host', 'Travel Companion', 'Hiking Partner'];
}

function scoreActivity(a: Activity, contextCategory?: string): number {
  let score = 0;
  score += getLocationMatch(a, contextCategory);
  if (contextCategory && a.category === contextCategory) score += 3;
  score += getFreshness(a);
  score += Math.random() * 2;
  return score;
}

function scoreEvent(e: Event, contextCategory?: string): number {
  let score = 0;
  score += getLocationMatch(e, contextCategory);
  score += getFreshness(e);
  score += Math.random() * 2;
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
  } = options;

  const seenIds = new Set<string>();
  const feed: FeedItem[] = [];
  const usedCompanionIds = new Set<string>();

  function addItem(item: FeedItem): boolean {
    if (item.type === 'category-header') return false;
    if (seenIds.has(item.data.id)) return false;
    if (feed.length >= maxItems) return false;
    seenIds.add(item.data.id);
    if (item.type === 'companion') {
      usedCompanionIds.add(item.data.id);
    }
    feed.push(item);
    return true;
  }

  const categoryGroups = buildCategoryGroups(companions, usedCompanionIds, userLocation);
  const sortedCategories = Array.from(categoryGroups.keys()).sort(() => Math.random() - 0.5);
  const selectedCategories = sortedCategories.slice(0, categoriesPerFeed);

  const allActivities = [...activities].sort((a, b) => scoreActivity(b) - scoreActivity(a));
  const allEvents = [...events].sort((a, b) => scoreEvent(b) - scoreEvent(a));
  const allStories = [...stories].sort((a, b) => getFreshness(b) - getFreshness(a) + Math.random() * 2);
  const allPosts = [...posts].sort((a, b) => getFreshness(b) - getFreshness(a) + Math.random() * 2);

  for (const category of selectedCategories) {
    const groupCompanions = categoryGroups.get(category) || [];
    const sectionTitles = SECTION_TITLES[category] || { companion: category, activity: category, event: category };

    feed.push({ type: 'category-header', category, emoji: CATEGORY_EMOJIS[category] });

    const shuffledGroup = [...groupCompanions].sort(() => Math.random() - 0.5);
    for (const companion of shuffledGroup.slice(0, itemsPerCategory)) {
      addItem({ type: 'companion', data: companion, section: sectionTitles.companion, category });
    }

    const relatedActivities = allActivities
      .filter(a => a.category === category || getCategoryFallbacks(category).includes(a.category || ''))
      .slice(0, 2);
    for (const activity of relatedActivities) {
      addItem({ type: 'activity', data: activity, section: sectionTitles.activity, category });
    }

    const relatedEvents = allEvents
      .filter(e => e.category === category || getCategoryFallbacks(category).includes(e.category || ''))
      .slice(0, 2);
    for (const event of relatedEvents) {
      addItem({ type: 'event', data: event, section: sectionTitles.event, category });
    }

    const relatedStories = allStories
      .filter(s => s.category === category || (s.tags && s.tags.includes(category.toLowerCase().replace(' ', '_'))))
      .slice(0, 1);
    for (const story of relatedStories) {
      addItem({ type: 'story', data: story, section: `${category} stories` });
    }
  }

  for (const post of allPosts) {
    if (feed.length >= maxItems) break;
    if (!seenIds.has(post.id)) {
      addItem({ type: 'post', data: post, section: 'Community Feed' });
    }
  }

  return feed;
}
