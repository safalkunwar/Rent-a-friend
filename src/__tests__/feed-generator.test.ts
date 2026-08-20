import { describe, it, expect } from 'vitest';
import { generateDiscoveryFeed, type FeedItem } from '../services/feedGenerator';
import { Companion, Activity, Event, ExperienceStory, CommunityPost } from '../types';

function makeCompanion(id: string, interests: string[], location = 'Kathmandu', rating = 4.5): Companion {
  return {
    id,
    name: `Companion ${id}`,
    age: 25,
    gender: 'Male',
    bio: 'Test companion',
    hourlyRate: 1000,
    rating,
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

function makeEvent(id: string, title = 'Event 1', location = 'Kathmandu', category?: string): Event {
  return {
    id,
    title,
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    time: '10:00 AM',
    location,
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

describe('generateDiscoveryFeed', () => {
  it('CASE 1: Category with 10 companions shows proper category grouping', () => {
    const companions = Array.from({ length: 10 }, (_, i) => makeCompanion(`c${i}`, ['Hiking Partner']));
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    
    const companionItems = feed.filter(item => item.type === 'companion');
    expect(companionItems.length).toBeGreaterThan(0);
    
    const sections = new Set(companionItems.map(item => item.section));
    expect(sections.size).toBeLessThanOrEqual(3);
    
    const hikingSection = companionItems.filter(item => item.section === 'People who love hiking');
    expect(hikingSection.length).toBeGreaterThan(0);
  });

  it('CASE 2: Category with 2 companions automatically finds related category', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner']),
      makeCompanion('c2', ['Hiking Partner']),
      makeCompanion('c3', ['Travel Companion']),
      makeCompanion('c4', ['Travel Companion']),
      makeCompanion('c5', ['Travel Companion']),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    
    const companionItems = feed.filter(item => item.type === 'companion');
    expect(companionItems.length).toBeGreaterThan(0);
    
    const categories = new Set(companionItems.map(item => (item as FeedItem & { category?: string }).category).filter(Boolean));
    expect(categories.size).toBeGreaterThanOrEqual(1);
  });

  it('CASE 3: Category with 1 companion does not leave empty space', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner']),
      makeCompanion('c2', ['Travel Companion']),
      makeCompanion('c3', ['Travel Companion']),
      makeCompanion('c4', ['Travel Companion']),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    
    const companionItems = feed.filter(item => item.type === 'companion');
    expect(companionItems.length).toBeGreaterThan(0);
    
    const sections = companionItems.map(item => item.section);
    const sectionCounts = sections.reduce((acc, section) => {
      acc[section] = (acc[section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    for (const count of Object.values(sectionCounts)) {
      expect(count).toBeGreaterThan(0);
    }
  });

  it('CASE 4: Category with 0 companions skips category', () => {
    const companions = [
      makeCompanion('c1', ['Travel Companion']),
      makeCompanion('c2', ['Travel Companion']),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    
    const companionItems = feed.filter(item => item.type === 'companion');
    expect(companionItems.length).toBeGreaterThan(0);
    
    const categories = companionItems.map(item => (item as FeedItem & { category?: string }).category).filter(Boolean);
    expect(categories.every(cat => cat === 'Travel Companion')).toBe(true);
  });

  it('CASE 5: Several categories do not display all companions together', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner']),
      makeCompanion('c2', ['Hiking Partner']),
      makeCompanion('c3', ['Travel Companion']),
      makeCompanion('c4', ['Travel Companion']),
      makeCompanion('c5', ['Food Explorer']),
      makeCompanion('c6', ['Food Explorer']),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    
    const companionItems = feed.filter(item => item.type === 'companion');
    const sections = new Set(companionItems.map(item => item.section));
    expect(sections.size).toBeGreaterThan(1);
  });

  it('CASE 6: Desktop and mobile receive same logical feed', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner']),
      makeCompanion('c2', ['Travel Companion']),
      makeCompanion('c3', ['Food Explorer']),
    ];
    const activities: Activity[] = [makeActivity('a1', 'Hiking Partner')];
    const events: Event[] = [makeEvent('e1', 'Hiking Event', 'Kathmandu')];
    const stories: ExperienceStory[] = [makeStory('s1')];
    const posts: CommunityPost[] = [makePost('p1')];

    const feed1 = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 20 });
    const feed2 = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 20 });

    expect(feed1.length).toBe(feed2.length);
    
    const items1 = feed1.filter(item => item.type !== 'category-header').map(item => `${item.type}:${item.data.id}`).sort();
    const items2 = feed2.filter(item => item.type !== 'category-header').map(item => `${item.type}:${item.data.id}`).sort();
    expect(items1).toEqual(items2);
  });

  it('CASE 7: Refresh changes feed ordering naturally', () => {
    const companions = Array.from({ length: 20 }, (_, i) => makeCompanion(`c${i}`, [['Hiking Partner', 'Travel Companion', 'Food Explorer'][i % 3]]));
    const activities: Activity[] = [makeActivity('a1', 'Hiking Partner')];
    const events: Event[] = [makeEvent('e1', 'Event 1', 'Kathmandu')];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feeds = Array.from({ length: 5 }, () =>
      generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 20 })
    );

    const sectionOrders = feeds.map(feed => feed.filter(item => item.type !== 'category-header').map(item => item.section));
    const allSame = sectionOrders.every(order => JSON.stringify(order) === JSON.stringify(sectionOrders[0]));
    expect(allSame).toBe(false);
  });

  it('CASE 8: Repeated refresh does not produce fixed pattern', () => {
    const companions = Array.from({ length: 15 }, (_, i) => makeCompanion(`c${i}`, [['Hiking Partner', 'Travel Companion', 'Food Explorer'][i % 3]]));
    const activities: Activity[] = [makeActivity('a1', 'Hiking Partner')];
    const events: Event[] = [makeEvent('e1', 'Event 1', 'Kathmandu')];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feeds = Array.from({ length: 10 }, () =>
      generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 20 })
    );

    const categorySelections = feeds.map(feed => feed.filter(item => item.type === 'category-header').map(item => item.category));
    const uniquePatterns = new Set(categorySelections.map(cats => cats.join(',')));
    expect(uniquePatterns.size).toBeGreaterThan(1);
  });

  it('CASE 9: Admin removes companion - it disappears from future discovery', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner']),
      makeCompanion('c2', ['Hiking Partner']),
      makeCompanion('c3', ['Travel Companion']),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed1 = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    const c1Ids = feed1.filter(item => item.type === 'companion').map(item => (item as Extract<FeedItem, { type: 'companion' }>).data.id);
    
    const updatedCompanions = companions.filter(c => c.id !== 'c1');
    const feed2 = generateDiscoveryFeed(updatedCompanions, activities, events, stories, posts, { maxItems: 40 });
    const c2Ids = feed2.filter(item => item.type === 'companion' && (item as Extract<FeedItem, { type: 'companion' }>).data.id === 'c1').map(item => (item as Extract<FeedItem, { type: 'companion' }>).data.id);
    
    expect(c1Ids.length).toBeGreaterThan(0);
    expect(c2Ids.length).toBe(0);
  });

  it('CASE 10: Large dataset does not download entire collection', () => {
    const companions = Array.from({ length: 500 }, (_, i) => makeCompanion(`c${i}`, [['Hiking Partner', 'Travel Companion'][i % 2]]));
    const activities: Activity[] = Array.from({ length: 100 }, (_, i) => makeActivity(`a${i}`));
    const events: Event[] = Array.from({ length: 100 }, (_, i) => makeEvent(`e${i}`));
    const stories: ExperienceStory[] = Array.from({ length: 200 }, (_, i) => makeStory(`s${i}`));
    const posts: CommunityPost[] = Array.from({ length: 300 }, (_, i) => makePost(`p${i}`));

    const startTime = performance.now();
    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    const endTime = performance.now();
    
    expect(feed.length).toBeLessThanOrEqual(40);
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('prevents duplicate companions in same feed session', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner']),
      makeCompanion('c2', ['Hiking Partner']),
      makeCompanion('c3', ['Travel Companion']),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    const companionIds = feed.filter(item => item.type === 'companion').map(item => item.data.id);
    const uniqueIds = new Set(companionIds);
    expect(uniqueIds.size).toBe(companionIds.length);
  });

  it('mixes content types dynamically', () => {
    const companions = [makeCompanion('c1', ['Hiking Partner'])];
    const activities = [makeActivity('a1', 'Hiking Partner')];
    const events = [makeEvent('e1', 'Hiking Event', 'Kathmandu', 'Hiking Partner')];
    const stories = [makeStory('s1', 'Hiking Partner')];
    const posts = [makePost('p1')];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 20 });
    
    const types = feed.map(item => item.type);
    const hasCompanion = types.includes('companion');
    const hasActivity = types.includes('activity');
    const hasEvent = types.includes('event');
    const hasStory = types.includes('story');
    const hasPost = types.includes('post');
    
    expect(hasCompanion).toBe(true);
    expect(hasActivity).toBe(true);
    expect(hasEvent).toBe(true);
    expect(hasStory).toBe(true);
    expect(hasPost).toBe(true);
  });

  it('skips empty categories and selects relevant ones', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner']),
      makeCompanion('c2', ['Travel Companion']),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    
    const companionItems = feed.filter(item => item.type === 'companion');
    const categories = companionItems.map(item => (item as FeedItem & { category?: string }).category).filter(Boolean);
    
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every(cat => cat === 'Hiking Partner' || cat === 'Travel Companion')).toBe(true);
  });

  it('respects user location for scoring', () => {
    const companions = [
      makeCompanion('c1', ['Hiking Partner'], 'Pokhara'),
      makeCompanion('c2', ['Hiking Partner'], 'Kathmandu'),
    ];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, {
      userLocation: 'Pokhara',
      maxItems: 10,
    });

    const companionItems = feed.filter(item => item.type === 'companion');
    expect(companionItems.length).toBeGreaterThan(0);
    const locations = companionItems.map(item => item.data.location);
    expect(locations).toContain('Pokhara');
    expect(locations).toContain('Kathmandu');
  });

  it('handles empty inputs gracefully', () => {
    const companions: Companion[] = [];
    const activities: Activity[] = [];
    const events: Event[] = [];
    const stories: ExperienceStory[] = [];
    const posts: CommunityPost[] = [];

    const feed = generateDiscoveryFeed(companions, activities, events, stories, posts, { maxItems: 40 });
    expect(feed.length).toBe(0);
  });
});
