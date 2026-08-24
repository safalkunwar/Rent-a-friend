import { describe, it, expect } from 'vitest';
import { generateDiscoveryFeed, mulberry32, type FeedItem } from '../services/feedGenerator';
import { mergeById, splitIntoChunks, stabilizeFeed } from '../services/feedStabilizer';
import { Companion, Activity, Event as EventType, ExperienceStory, CommunityPost } from '../types';

function makeCompanion(id: string, interests: string[], location = 'Kathmandu'): Companion {
  return {
    id,
    name: `Companion ${id}`,
    age: 25,
    gender: 'Male',
    bio: 'Test companion',
    hourlyRate: 1000,
    rating: 4.5,
    reviewsCount: 10,
    isVerified: true,
    location,
    languages: ['Nepali', 'English'],
    interests,
    imageUrl: 'https://example.com/avatar.jpg',
  };
}

function makeActivity(id: string, category = 'Hiking Partner'): Activity {
  return {
    id,
    title: `Activity ${id}`,
    duration: '2 hours',
    avgPrice: 1500,
    companionCount: 5,
    category,
    location: 'Kathmandu',
    imageUrl: 'https://example.com/activity.jpg',
  };
}

function makeEvent(id: string, category?: string): EventType {
  return {
    id,
    title: `Event ${id}`,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00 AM',
    location: 'Kathmandu',
    spots: 10,
    description: 'Test event',
    imageUrl: 'https://example.com/event.jpg',
    category,
  };
}

function makeStory(id: string, category?: string): ExperienceStory {
  return {
    id,
    userId: 'u1',
    imageUrl: 'https://example.com/story.jpg',
    caption: 'Test story',
    userName: 'Test User',
    userAvatar: 'https://example.com/user.jpg',
    companionName: 'Companion 1',
    timeAgo: '2 hours ago',
    likes: 5,
    comments: 2,
    createdAt: new Date().toISOString(),
    category,
    tags: category ? [category.toLowerCase().replace(' ', '_')] : [],
  };
}

function makePost(id: string): CommunityPost {
  return {
    id,
    userId: 'u1',
    userName: 'Test User',
    userAvatar: 'https://example.com/user.jpg',
    title: `Post ${id}`,
    content: 'Test post content',
    category: 'Travel',
    status: 'published',
    likesCount: 10,
    commentsCount: 2,
    sharesCount: 0,
    reportsCount: 0,
    location: 'Kathmandu',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const contentKeys = (feed: FeedItem[]): string[] =>
  feed.filter(i => i.type !== 'category-header').map(i => `${i.type}:${i.data.id}`);

function assertAppendOnlyStability(feed1: FeedItem[], feed2: FeedItem[], label = ''): void {
  const stabilized = stabilizeFeed(feed1, feed2);
  const beforeKeys = contentKeys(feed1);
  const afterKeys = contentKeys(stabilized);

  const beforeSet = new Set(beforeKeys);
  expect(beforeSet.size).toBe(beforeKeys.length);

  let cursor = -1;
  let failedKey: string | null = null;
  for (const key of beforeKeys) {
    const found = afterKeys.indexOf(key, cursor + 1);
    if (found <= cursor) {
      failedKey = key;
      break;
    }
    cursor = found;
  }
  if (failedKey !== null) {
    const seq = (f: FeedItem[]) => f.map(i => i.type === 'category-header' ? `<<${i.category}>>` : `${i.type}:${i.data.id}`).join(' | ');
    console.log(`APPEND-ONLY VIOLATION [${label}] for key:`, failedKey);
    console.log('PREV :', seq(feed1));
    console.log('NEXT :', seq(feed2));
    console.log('STAB :', seq(stabilized));
  }
  expect(failedKey).toBeNull();

  const missing = beforeKeys.filter(key => !afterKeys.includes(key));
  expect(missing).toEqual([]);
}

const contentTypes = (feed: FeedItem[]): string[] =>
  feed.filter(i => i.type !== 'category-header').map(i => i.type);

const makeUncategorizedPost = (id: string): CommunityPost => ({ ...makePost(id), category: undefined } as unknown as CommunityPost);

describe('mixed feed composition rules', () => {
  function assertNoLongSameTypeRunsWhileAlternativesRemain(types: string[], placedPools: Record<string, number>) {
    const remaining = { ...placedPools };
    let runType: string | null = null;
    let runLength = 0;
    for (const type of types) {
      if (type === runType) {
        runLength += 1;
      } else {
        runType = type;
        runLength = 1;
      }
      if (runLength >= 3) {
        const otherTypeAvailable = Object.keys(remaining).some(key => key !== type && remaining[key] > 0);
        expect(otherTypeAvailable).toBe(false);
      }
      remaining[type] = (remaining[type] ?? 0) - 1;
      expect(remaining[type]).toBeGreaterThanOrEqual(0);
    }
  }

  it('never repeats a content type back-to-back while another type still has content', () => {
    for (let trial = 0; trial < 10; trial++) {
      const companions = Array.from({ length: 12 }, (_, i) => makeCompanion(`c${i}`, ['Hiking Partner']));
      const activities = Array.from({ length: 6 }, (_, i) => makeActivity(`a${i}`, 'Hiking Partner'));
      const events = Array.from({ length: 4 }, (_, i) => makeEvent(`e${i}`, 'Hiking Partner'));
      const stories = Array.from({ length: 3 }, (_, i) => makeStory(`s${i}`, 'Hiking Partner'));
      const posts = Array.from({ length: 6 }, (_, i) => makeUncategorizedPost(`p${i}`));

      const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, {
        maxItems: 60,
        itemsPerCategory: 12,
      });

      assertNoLongSameTypeRunsWhileAlternativesRemain(contentTypes(feed), {
        companion: 12,
        activity: 6,
        event: 4,
        story: 3,
        post: 6,
      });
    }
  });

  it('caps consecutive companions at the rule limit even with a heavy companion database', () => {
    for (let trial = 0; trial < 10; trial++) {
      const companions = Array.from({ length: 40 }, (_, i) => makeCompanion(`hc${i}`, ['Hiking Partner']));
      const activities = [makeActivity('ha1', 'Hiking Partner'), makeActivity('ha2', 'Hiking Partner')];
      const events = [makeEvent('he1', 'Hiking Partner')];

      const feed = generateDiscoveryFeed(companions, activities, events, [], [], { maxItems: 60, itemsPerCategory: 24 });
      const types = contentTypes(feed);

      let run = 0;
      for (let i = 0; i < types.length; i++) {
        if (types[i] === 'companion') {
          run += 1;
          const othersLeft = types.slice(i + 1).some(t => t !== 'companion');
          if (othersLeft) expect(run).toBeLessThan(3);
        } else {
          run = 0;
        }
      }
    }
  });

  it('places scarce content near the top of the feed instead of dumping it last', () => {
    for (let trial = 0; trial < 25; trial++) {
      const companions = Array.from({ length: 10 }, (_, i) => makeCompanion(`sc${i}`, ['Hiking Partner']));
      const activities = [makeActivity('sa1', 'Hiking Partner'), makeActivity('sa2', 'Hiking Partner')];
      const events = [makeEvent('se1', 'Hiking Partner')];

      const feed = generateDiscoveryFeed(companions, activities, events, [], [], { maxItems: 40 });
      const eventIndex = contentTypes(feed).indexOf('event');
      expect(eventIndex).toBeGreaterThanOrEqual(0);
      expect(eventIndex).toBeLessThanOrEqual(8);
    }
  });

  it('keeps every displayed document unique within one generated batch', () => {
    const companions = Array.from({ length: 15 }, (_, i) => makeCompanion(`dc${i}`, [['Hiking Partner', 'Food Explorer'][i % 2]]));
    const activities = Array.from({ length: 5 }, (_, i) => makeActivity(`da${i}`, ['Hiking Partner', 'Food Explorer'][i % 2]));
    const events = Array.from({ length: 4 }, (_, i) => makeEvent(`de${i}`, ['Hiking Partner', 'Food Explorer'][i % 2]));
    const posts = Array.from({ length: 5 }, (_, i) => makeUncategorizedPost(`dp${i}`));

    const feed = generateDiscoveryFeed(companions, activities, events, [], posts, { maxItems: 60 });
    const keys = contentKeys(feed);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('mergeById (paginated collection merge)', () => {
  it('appends unseen documents and preserves existing order', () => {
    const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
    expect(mergeById([a, b], [c])).toEqual([a, b, c]);
  });

  it('never produces duplicate ids even when batches overlap', () => {
    const a = { id: 'a' }, b = { id: 'b' }, v2 = { id: 'a', updated: true }, c = { id: 'c' };
    const merged = mergeById([a, b], [v2, c]);
    const ids = merged.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['a', 'b', 'c']);
    expect((merged[0] as any).updated).toBe(true);

    const again = mergeById(merged, [v2, b]);
    expect(again.map(i => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('updates in place without reordering on refetch of same window', () => {
    const first = { id: 'x', rating: 4 }, second = { id: 'y', rating: 5 };
    const refetched = [{ id: 'y', rating: 4.9 }];
    const merged = mergeById([first, second], refetched);
    expect(merged.map(i => i.id)).toEqual(['x', 'y']);
    expect(merged[1].rating).toBe(4.9);
  });
});

describe('stabilizeFeed (append-only Home feed)', () => {
  it('returns the fresh feed untouched on the first render of a session', () => {
    const companions = Array.from({ length: 12 }, (_, i) => makeCompanion(`c${i}`, ['Hiking Partner']));
    const fresh = generateDiscoveryFeed(companions, [], [], [], [], { maxItems: 40 });
    expect(stabilizeFeed([], fresh)).toBe(fresh);
  });

  it('preserves previously displayed content in exact order when more data arrives within a session', () => {
    const batch1Companions = Array.from({ length: 5 }, (_, i) => makeCompanion(`c${i}`, ['Hiking Partner']));
    const batch2Companions = [...batch1Companions, ...Array.from({ length: 5 }, (_, i) => makeCompanion(`n${i}`, ['Food Explorer']))];
    const batch3Companions = [...batch2Companions, ...Array.from({ length: 4 }, (_, i) => makeCompanion(`t${i}`, ['Coffee Buddy']))];

    for (let session = 0; session < 15; session++) {
      const rng = mulberry32(session * 31 + 3);
      const f1 = generateDiscoveryFeed(batch1Companions, [makeActivity('a1')], [makeEvent('e1')], [makeStory('s1')], [makePost('p1')], { maxItems: 60, rng });
      const f2 = generateDiscoveryFeed(batch2Companions, [makeActivity('a1'), makeActivity('a2')], [makeEvent('e1'), makeEvent('e2')], [makeStory('s1'), makeStory('s2')], [makePost('p1'), makePost('p2')], { maxItems: 120, rng });
      const f3 = generateDiscoveryFeed(batch3Companions, [makeActivity('a1'), makeActivity('a2'), makeActivity('a3', 'Coffee Buddy')], [makeEvent('e1'), makeEvent('e2'), makeEvent('e3')], [makeStory('s1'), makeStory('s2'), makeStory('s3')], [makePost('p1'), makePost('p2'), makePost('p3')], { maxItems: 180, rng });

      assertAppendOnlyStability(f1, f2, `session ${session} f1→f2`);
      assertAppendOnlyStability(f2, f3, `session ${session} f2→f3`);
      assertAppendOnlyStability(f1, f3, `session ${session} f1→f3`);
    }
  });

  it('never displays the same document twice across appended batches', () => {
    const batch1 = Array.from({ length: 10 }, (_, i) => makeCompanion(`c${i}`, ['Hiking Partner']));
    const feed1 = generateDiscoveryFeed(batch1, [], [], [], [], { maxItems: 60 });
    const batch2 = [...batch1.slice(3), ...Array.from({ length: 6 }, (_, i) => makeCompanion(`d${i}`, ['Coffee Buddy']))];
    const feed2 = generateDiscoveryFeed(batch2, [], [], [], [], { maxItems: 60 });

    const stabilized = stabilizeFeed(feed1, feed2);
    const keys = contentKeys(stabilized);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('drops removed documents without reshuffling survivors', () => {
    const companions = Array.from({ length: 10 }, (_, i) => makeCompanion(`c${i}`, ['Hiking Partner']));
    const feed1 = generateDiscoveryFeed(companions, [], [], [], [], { maxItems: 40 });
    const remaining = companions.filter(c => c.id !== 'c0');
    const feed2 = generateDiscoveryFeed(remaining, [], [], [], [], { maxItems: 40 });

    const stabilized = stabilizeFeed(feed1, feed2);
    const stabilizedCompanionKeys = contentKeys(stabilized).filter(k => k.startsWith('companion:'));
    expect(stabilizedCompanionKeys).not.toContain('companion:c0');

    const survivorOrder = contentKeys(feed1)
      .filter(k => k.startsWith('companion:') && k !== 'companion:c0')
      .filter(k => stabilizedCompanionKeys.includes(k));
    let cursor = -1;
    for (const key of survivorOrder) {
      const found = stabilizedCompanionKeys.indexOf(key, cursor + 1);
      expect(found).toBeGreaterThan(cursor);
      cursor = found;
    }
  });

  it('keeps chunk headers aligned with their categories for single-source sections', () => {
    const companions = [
      ...Array.from({ length: 6 }, (_, i) => makeCompanion(`h${i}`, ['Hiking Partner'])),
      ...Array.from({ length: 6 }, (_, i) => makeCompanion(`f${i}`, ['Food Explorer'])),
    ];
    const feed1 = generateDiscoveryFeed(companions, [], [], [], [], { maxItems: 60 });
    const feed2 = generateDiscoveryFeed([...companions, ...Array.from({ length: 4 }, (_, i) => makeCompanion(`t${i}`, ['Coffee Buddy']))], [], [], [], [], { maxItems: 90 });

    const stabilized = stabilizeFeed(feed1, feed2);
    const chunks = splitIntoChunks(stabilized);

    for (const chunk of chunks) {
      if (!chunk.header) continue;
      const companionItems = chunk.items.filter((item): item is Extract<FeedItem, { type: 'companion' }> => item.type === 'companion');
      const primary = companionItems.filter(item => item.category === chunk.headerCategory);
      expect(primary.length).toBeGreaterThan(0);
    }
  });

  it('labels every companion, activity and event with a truthful category even when mixed', () => {
    const companions = Array.from({ length: 8 }, (_, i) => makeCompanion(`m${i}`, [['Hiking Partner', 'Food Explorer'][i % 2]]));
    const activities = Array.from({ length: 4 }, (_, i) => makeActivity(`ma${i}`, ['Hiking Partner', 'Food Explorer'][i % 2]));
    const events = Array.from({ length: 3 }, (_, i) => makeEvent(`me${i}`, ['Hiking Partner', 'Food Explorer'][i % 2]));

    const feed = generateDiscoveryFeed(companions, activities, events, [], [], { maxItems: 60 });
    for (const item of feed) {
      if (item.type === 'companion') {
        expect(['Hiking Partner', 'Food Explorer']).toContain(item.category);
      } else if (item.type === 'activity' || item.type === 'event') {
        expect(['Hiking Partner', 'Food Explorer']).toContain(item.category);
      }
    }
  });
});
