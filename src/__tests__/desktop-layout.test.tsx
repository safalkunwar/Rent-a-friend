import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DiscoveryFeed } from '../components/discovery/DiscoveryFeed';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../components/social/FeedSocialCards', () => ({
  FeedStoryCard: ({ story }: any) => <div data-media>{story.title}</div>,
  FeedPostCard: ({ post }: any) => <div data-media>{post.title}</div>,
}));
afterEach(cleanup);

it('presentation families retain exact input order and never duplicate records to fill a row', () => {
  const item = (type: string, id: string) => ({ type, section: 'Coffee', data: { id, name: id, title: id, interests: [], location: 'Nepal', rating: 0 } });
  const items = [{ type: 'category-header', category: 'Coffee' }, item('companion', 'A'), item('companion', 'B'), item('activity', 'Walk'), item('event', 'Meetup'), item('post', 'Post'), item('companion', 'C')];
  const { container } = render(<DiscoveryFeed stories={[]} favorites={[]} feedItems={items as any} visibleCategoryCount={5} sentinelRef={null}
    onToggleFavorite={vi.fn()} onViewCompanion={vi.fn()} onShowToast={vi.fn()} onNavigateExplore={vi.fn()}
    onCreateStory={vi.fn()} onApplyAsCompanion={vi.fn()} onViewStory={vi.fn()} />);
  const feed = container.querySelector('.desktop-feed-grid')!;
  expect([...feed.querySelectorAll('h3,h4,[data-media]')].map(el => el.textContent)).toEqual(['Coffee', 'A', 'B', 'Walk', 'Meetup', 'Post', 'C']);
  expect(feed.querySelectorAll('.feed-compact-card')).toHaveLength(3);
  expect(feed.querySelectorAll('.feed-standard-item')).toHaveLength(2);
  expect(feed.querySelectorAll('.feed-media-item')).toHaveLength(1);
});

it('layout stays desktop-scoped and the Story backdrop does not inherit transparent theme aliases', () => {
  const css = readFileSync('src/desktop-polish.css', 'utf8');
  const beforeDesktop = css.split('@media (min-width: 1024px)')[0];
  expect(beforeDesktop).not.toContain('.desktop-');
  expect(beforeDesktop).toContain('rgba(0, 0, 0, .72)');
  expect(css).not.toMatch(/grid-auto-flow:\s*dense|\border:\s*\d/);
  const composer = readFileSync('src/components/modals/CreateStoryModal.tsx', 'utf8');
  expect(composer.match(/story-composer-backdrop/g)).toHaveLength(2);
  expect(composer).toContain('lg:object-contain');
});
