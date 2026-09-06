import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useDiscoveryFeed } from '../hooks/useDiscoveryFeed';
import { useProgressiveReveal } from '../hooks/useProgressiveReveal';
import { stabilizeFeed } from '../services/feedStabilizer';
import type { FeedItem } from '../services/feedGenerator';
import type { CommunityPost, Companion } from '../types';

const context = vi.hoisted(() => ({ currentUser: { id: 'A', location: 'Kathmandu' } }));
vi.mock('../context/AppContext', () => ({ useAppContext: () => context }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); document.body.innerHTML = ''; context.currentUser.id = 'A'; });
const post = (id: string, content = 'old') => ({ id, content, status: 'published', category: 'Travel' } as CommunityPost);
const entry = (id: string, content = 'old'): FeedItem => ({ type: 'post', data: post(id, content), section: 'Community' });
const companion = (id: string): FeedItem => ({ type: 'companion', data: { id, interests: ['Hiking Partner'] } as Companion, section: 'Hiking Partner', category: 'Hiking Partner' });
const keys = (items: FeedItem[]) => items.filter(i => i.type !== 'category-header').map(i => `${i.type}:${i.data.id}`);

it('refreshes a same-ID payload through the actual hook without reordering', () => {
  const { result, rerender } = renderHook(({ posts }) => useDiscoveryFeed([], [], [], [], posts), { initialProps: { posts: [post('p'), post('q')] } });
  const before = keys(result.current);
  rerender({ posts: [post('p', 'edited'), post('q')] });
  expect(keys(result.current)).toEqual(before);
  expect(result.current.find(i => i.type === 'post' && i.data.id === 'p')).toMatchObject({ data: { content: 'edited' } });
});

it('keeps the old content as a strict prefix even when regenerated sections move', () => {
  const previous: FeedItem[] = [{ type: 'category-header', category: 'A' }, entry('p'), { type: 'category-header', category: 'B' }, entry('q')];
  const next: FeedItem[] = [{ type: 'category-header', category: 'B' }, entry('new'), entry('q'), entry('p', 'edited')];
  const result = stabilizeFeed(previous, next);
  expect(keys(result)).toEqual(['post:p', 'post:q', 'post:new']);
  expect(result.find(i => i.type === 'post' && i.data.id === 'p')).toMatchObject({ data: { content: 'edited' } });
});

it('does not mistake ranking omission for source deletion', () => {
  expect(keys(stabilizeFeed([entry('old')], [entry('new')], [entry('old'), entry('new')]))).toEqual(['post:old', 'post:new']);
  expect(keys(stabilizeFeed([entry('old')], [entry('new')], [entry('new')]))).toEqual(['post:new']);
});

it('mixes only unseen additions at the append boundary and defers excess companions', () => {
  const old = [companion('1'), companion('2'), companion('3')];
  const next = [...old, companion('4'), companion('5'), companion('6'), companion('7'), entry('p')];
  expect(keys(stabilizeFeed(old, next))).toEqual(['companion:1', 'companion:2', 'companion:3', 'post:p', 'companion:4', 'companion:5', 'companion:6']);
});

it('starts a new composition session on account change', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const posts = [post('p'), post('q')];
  const { result, rerender } = renderHook(() => useDiscoveryFeed([], [], [], [], posts));
  const first = result.current;
  context.currentUser.id = 'B';
  rerender();
  expect(result.current).not.toBe(first);
  expect(new Set(keys(result.current))).toEqual(new Set(keys(first)));
  vi.restoreAllMocks();
});

function node(visible: boolean, top = 20) {
  const element = document.createElement('div');
  document.body.append(element);
  const rect = { width: 100, height: 30, top, bottom: top + 30 } as DOMRect;
  element.getClientRects = () => (visible ? [rect] : []) as unknown as DOMRectList;
  element.getBoundingClientRect = () => rect;
  return element;
}

it('ignores a hidden mobile sentinel and coalesces repeated desktop scroll callbacks', async () => {
  const load = vi.fn(() => new Promise<void>(() => {}));
  const feedItems = [entry('p')];
  const { result } = renderHook(() => useProgressiveReveal({ feedItems, hasMore: true, loadingMore: false, onLoadMore: load }));
  act(() => { result.current.sentinelRef(node(false)); result.current.mobileSentinelRef(node(false)); window.dispatchEvent(new Event('scroll')); });
  expect(load).not.toHaveBeenCalled();
  await act(async () => {
    result.current.sentinelRef(node(true));
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('scroll'));
  });
  expect(load).toHaveBeenCalledTimes(1);
});

it('observes both mounted surfaces and follows resize without attaching to only the last ref', async () => {
  const observe = vi.fn(), unobserve = vi.fn(), disconnect = vi.fn();
  let callback!: IntersectionObserverCallback;
  vi.stubGlobal('IntersectionObserver', class { constructor(cb: IntersectionObserverCallback) { callback = cb; } observe = observe; unobserve = unobserve; disconnect = disconnect; });
  const load = vi.fn().mockResolvedValue(undefined);
  const feedItems = [entry('p')];
  const { result, unmount } = renderHook(() => useProgressiveReveal({ feedItems, hasMore: true, loadingMore: false, onLoadMore: load }));
  const desktop = node(false), mobile = node(true);
  act(() => { result.current.sentinelRef(desktop); result.current.mobileSentinelRef(mobile); });
  expect(observe).toHaveBeenCalledWith(desktop);
  expect(observe).toHaveBeenCalledWith(mobile);
  await act(async () => { callback([{ target: desktop, isIntersecting: true }] as unknown as IntersectionObserverEntry[], {} as IntersectionObserver); });
  expect(load).not.toHaveBeenCalled();
  await act(async () => { window.dispatchEvent(new Event('resize')); });
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => { window.dispatchEvent(new Event('resize')); });
  expect(load).toHaveBeenCalledTimes(1);
  act(() => result.current.mobileSentinelRef(null));
  expect(unobserve).toHaveBeenCalledWith(mobile);
  unmount();
  expect(disconnect).toHaveBeenCalled();
});

it('does not fetch when exhausted or outside Home, or from a sentinel above the viewport', async () => {
  const load = vi.fn();
  const feedItems = [entry('p')];
  const { result, rerender } = renderHook(({ enabled, hasMore }) => useProgressiveReveal({ feedItems, hasMore, enabled, loadingMore: false, onLoadMore: load }), { initialProps: { enabled: false, hasMore: true } });
  await act(async () => { result.current.sentinelRef(node(true)); window.dispatchEvent(new Event('scroll')); });
  rerender({ enabled: true, hasMore: false });
  await act(async () => { window.dispatchEvent(new Event('scroll')); });
  act(() => result.current.sentinelRef(node(true, -500)));
  rerender({ enabled: true, hasMore: true });
  await act(async () => { window.dispatchEvent(new Event('scroll')); });
  expect(load).not.toHaveBeenCalled();
});
