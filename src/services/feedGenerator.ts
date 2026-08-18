import { Companion, Activity, Event, ExperienceStory, CommunityPost } from '../types';

export type FeedItem =
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

function getInterestMatch(companion?: Companion, userInterests?: string[]): number {
  if (!companion || !companion.interests || companion.interests.length === 0 || !userInterests || userInterests.length === 0) return 0;
  const matches = companion.interests.filter(i => userInterests.includes(i)).length;
  return matches * 2;
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

function getCompanionSection(c?: Companion): string {
  if (!c || !c.interests || c.interests.length === 0) return 'People you may like';
  const primary = c.interests[0];
  const titles = SECTION_TITLES[primary];
  if (titles) return titles.companion;
  return `More ${primary} guides`;
}

function getActivitySection(a: Activity, contextCategory?: string): string {
  if (contextCategory) {
    const titles = SECTION_TITLES[contextCategory];
    if (titles) return titles.activity;
  }
  if (a.category) return `${a.category} experiences`;
  return 'Things to do nearby';
}

function getEventSection(e: Event, contextCategory?: string): string {
  if (contextCategory) {
    const titles = SECTION_TITLES[contextCategory];
    if (titles) return titles.event;
  }
  const date = e.date ? new Date(e.date).toLocaleDateString('en-US', { weekday: 'long' }) : '';
  if (date) return `This ${date}`;
  return 'Upcoming events';
}

interface CategoryGroup {
  category: string;
  companions: Companion[];
  section: string;
}

function buildCategoryGroups(companions: Companion[], excludeIds: Set<string>, userLocation?: string): CategoryGroup[] {
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

  const result: CategoryGroup[] = [];
  const processedCategories = new Set<string>();
  const assignedIds = new Set<string>();

  for (const [category, comps] of groups) {
    if (comps.length === 0 || processedCategories.has(category)) continue;
    
    let groupComps: Companion[] = [];
    const fallbacks = getCategoryFallbacks(category);
    const usedFallbackCats = new Set<string>();
    
    for (const c of comps) {
      if (!assignedIds.has(c.id)) {
        groupComps.push(c);
        assignedIds.add(c.id);
      }
    }
    
    for (const fallbackCat of fallbacks) {
      if (groupComps.length >= 4) break;
      const fallbackComps = groups.get(fallbackCat) || [];
      for (const c of fallbackComps) {
        if (!assignedIds.has(c.id)) {
          groupComps.push(c);
          assignedIds.add(c.id);
          usedFallbackCats.add(fallbackCat);
        }
      }
    }

    if (groupComps.length > 0) {
      groupComps.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        scoreA += getLocationMatch(a, userLocation) * 3;
        scoreB += getLocationMatch(b, userLocation) * 3;
        scoreA += (a.rating || 0) * 0.5;
        scoreB += (b.rating || 0) * 0.5;
        scoreA += Math.random() * 1.5;
        scoreB += Math.random() * 1.5;
        return scoreB - scoreA;
      });

      result.push({
        category,
        companions: groupComps.slice(0, 6),
        section: getCompanionSection(groupComps[0]),
      });
      processedCategories.add(category);
      for (const fbCat of usedFallbackCats) {
        processedCategories.add(fbCat);
      }
    }
  }

  if (uncategorized.length > 0) {
    const available = uncategorized.filter(c => !excludeIds.has(c.id) && !assignedIds.has(c.id));
    if (available.length > 0) {
      available.sort((a, b) => {
        let scoreA = getLocationMatch(a, userLocation) * 3 + (a.rating || 0) * 0.5 + Math.random() * 1.5;
        let scoreB = getLocationMatch(b, userLocation) * 3 + (b.rating || 0) * 0.5 + Math.random() * 1.5;
        return scoreB - scoreA;
      });
      result.push({
        category: 'Local Companion',
        companions: available.slice(0, 6),
        section: 'People you may like',
      });
    }
  }

  return result;
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
    maxItems = 40,
  } = options;

  const seenIds = new Set<string>();
  const feed: FeedItem[] = [];
  const sessionSeed = Date.now();
  const usedCompanionIds = new Set<string>();

  function addItem(item: FeedItem): boolean {
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

  const shuffledCategories = [...categoryGroups];
  for (let i = shuffledCategories.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCategories[i], shuffledCategories[j]] = [shuffledCategories[j], shuffledCategories[i]];
  }

  const allActivities = [...activities].sort((a, b) => scoreActivity(b) - scoreActivity(a));
  const allEvents = [...events].sort((a, b) => scoreEvent(b) - scoreEvent(a));
  const allStories = [...stories].sort((a, b) => getFreshness(b) - getFreshness(a) + Math.random() * 2);
  const allPosts = [...posts].sort((a, b) => getFreshness(b) - getFreshness(a) + Math.random() * 2);

  let activityIndex = 0;
  let eventIndex = 0;
  let storyIndex = 0;
  let postIndex = 0;

  let activeContentTypes = ['companion'];
  if (allActivities.length > 0) activeContentTypes.push('activity');
  if (allEvents.length > 0) activeContentTypes.push('event');
  if (allStories.length > 0) activeContentTypes.push('story');
  if (allPosts.length > 0) activeContentTypes.push('post');

  const shuffledTypes = [...activeContentTypes];
  for (let i = shuffledTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledTypes[i], shuffledTypes[j]] = [shuffledTypes[j], shuffledTypes[i]];
  }
  let typeIndex = 0;

  const maxEmptyStreak = activeContentTypes.length * 2;
  let emptyStreak = 0;

  while (feed.length < maxItems && emptyStreak < maxEmptyStreak) {
    const contentType = shuffledTypes[typeIndex % shuffledTypes.length];
    typeIndex++;

    let hadItem = false;

    if (contentType === 'companion') {
      const group = shuffledCategories.find(g => g.companions.some(c => !usedCompanionIds.has(c.id)));
      if (group) {
        const available = group.companions.filter(c => !usedCompanionIds.has(c.id));
        const count = Math.min(2 + Math.floor(Math.random() * 2), available.length, maxItems - feed.length);
        for (let i = 0; i < count; i++) {
          if (addItem({ type: 'companion', data: available[i], section: group.section, category: group.category })) {
            hadItem = true;
          }
        }
      }
    } else if (contentType === 'activity') {
      while (activityIndex < allActivities.length) {
        const a = allActivities[activityIndex++];
        if (!seenIds.has(a.id)) {
          if (addItem({ type: 'activity', data: a, section: getActivitySection(a) })) {
            hadItem = true;
          }
          break;
        }
      }
    } else if (contentType === 'event') {
      while (eventIndex < allEvents.length) {
        const e = allEvents[eventIndex++];
        if (!seenIds.has(e.id)) {
          if (addItem({ type: 'event', data: e, section: getEventSection(e) })) {
            hadItem = true;
          }
          break;
        }
      }
    } else if (contentType === 'story') {
      while (storyIndex < allStories.length) {
        const s = allStories[storyIndex++];
        if (!seenIds.has(s.id)) {
          if (addItem({ type: 'story', data: s, section: 'Community Moments' })) {
            hadItem = true;
          }
          break;
        }
      }
    } else if (contentType === 'post') {
      while (postIndex < allPosts.length) {
        const p = allPosts[postIndex++];
        if (!seenIds.has(p.id)) {
          if (addItem({ type: 'post', data: p, section: 'Community Feed' })) {
            hadItem = true;
          }
          break;
        }
      }
    }

    if (!hadItem) {
      emptyStreak++;
    } else {
      emptyStreak = 0;
    }

    if (shuffledTypes.length > 1) {
      if (Math.random() < 0.3) {
        const swapIdx = Math.floor(Math.random() * shuffledTypes.length);
        const currentIdx = shuffledTypes.indexOf(contentType);
        if (currentIdx !== -1 && swapIdx !== currentIdx) {
          [shuffledTypes[currentIdx], shuffledTypes[swapIdx]] = [shuffledTypes[swapIdx], shuffledTypes[currentIdx]];
        }
      }
    }
  }

  const remainingCompanions = companions.filter(c => !usedCompanionIds.has(c.id));
  const remainingGroups = buildCategoryGroups(remainingCompanions, usedCompanionIds, userLocation);
  for (const group of remainingGroups) {
    if (feed.length >= maxItems) break;
    for (const c of group.companions) {
      if (feed.length >= maxItems) break;
      addItem({ type: 'companion', data: c, section: group.section, category: group.category });
    }
  }

  if (feed.length < maxItems) {
    for (const a of allActivities) {
      if (feed.length >= maxItems) break;
      if (!seenIds.has(a.id)) {
        addItem({ type: 'activity', data: a, section: getActivitySection(a) });
      }
    }
    for (const e of allEvents) {
      if (feed.length >= maxItems) break;
      if (!seenIds.has(e.id)) {
        addItem({ type: 'event', data: e, section: getEventSection(e) });
      }
    }
    for (const s of allStories) {
      if (feed.length >= maxItems) break;
      if (!seenIds.has(s.id)) {
        addItem({ type: 'story', data: s, section: 'Community Moments' });
      }
    }
    for (const p of allPosts) {
      if (feed.length >= maxItems) break;
      if (!seenIds.has(p.id)) {
        addItem({ type: 'post', data: p, section: 'Community Feed' });
      }
    }
  }

  return feed;
}
