// Formerly deferred red acceptance cases, now part of the normal main-app gate.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { generateDiscoveryFeed, mulberry32, type FeedItem } from '../services/feedGenerator';
import { stabilizeFeed } from '../services/feedStabilizer';
import type { Companion, CommunityPost } from '../types';
const companion = (id: string, interest = 'Hiking Partner'): Companion => ({
  id, name: id, age: 25, gender: '', bio: '', hourlyRate: 1000, rating: 0,
  reviewsCount: 0, isVerified: false, location: 'Kathmandu', languages: [], interests: [interest], imageUrl: '',
});
const post = (id: string, content = 'OLD'): CommunityPost => ({
  id, userId: 'A', userName: 'A', userAvatar: '', title: id, content, category: 'Travel',
  status: 'published', likesCount: 0, commentsCount: 0, sharesCount: 0, reportsCount: 0,
  location: 'Kathmandu', createdAt: '2026-09-05T00:00:00Z', updatedAt: '2026-09-05T00:00:00Z',
});
test('Home freshness: a retained post must receive its latest payload', () => {
  const previous: FeedItem[] = [{ type: 'post', data: post('p'), section: '' }];
  const next: FeedItem[] = [{ type: 'post', data: post('p', 'EDITED'), section: '' }];
  const result = stabilizeFeed(previous, next).find(item => item.type === 'post');
  assert.equal(result?.data.content, 'EDITED');
});
test('Home identity: overlapping collection IDs must both survive', () => {
  const feed = generateDiscoveryFeed([companion('same')], [], [], [], [post('same')], { rng: mulberry32(1) });
  const keys = feed.filter(item => item.type !== 'category-header').map(item => `${item.type}:${item.data.id}`);
  assert.ok(keys.includes('companion:same'));
  assert.ok(keys.includes('post:same'), `Missing cross-collection entity: ${keys}`);
});
test('Home mixing: final composition must not emit a long companion-only run', () => {
  const interests = ['Hiking Partner', 'Travel Companion', 'Coffee Buddy'];
  const companions = Array.from({ length: 90 }, (_, index) => companion(`c${index}`, interests[index % interests.length]));
  const posts = Array.from({ length: 30 }, (_, index) => post(`p${index}`));
  const feed = generateDiscoveryFeed(companions, [], [], [], posts, { rng: mulberry32(1), maxItems: 120, categoriesPerFeed: 16, itemsPerCategory: 24 });
  let run = 0, maximum = 0;
  for (const item of feed) {
    if (item.type === 'category-header') continue;
    run = item.type === 'companion' ? run + 1 : 0;
    maximum = Math.max(maximum, run);
  }
  assert.ok(maximum <= 3, `Maximum consecutive companions was ${maximum}; acceptance bound is 3.`);
});
