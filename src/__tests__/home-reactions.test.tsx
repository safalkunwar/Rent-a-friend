import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFeedReaction } from '../hooks/useFeedReaction';
import { FeedPostCard } from '../components/social/FeedSocialCards';
import type { CommunityPost } from '../types';
const mocks = vi.hoisted(() => ({ user: { id: 'A' } as { id: string } | null, read: vi.fn(), like: vi.fn(), unlike: vi.fn(), auth: vi.fn() }));
vi.mock('../context/AppContext', () => ({ useAppContext: () => ({ currentUser: mocks.user, openAuthModal: mocks.auth }) }));
vi.mock('../repositories/SocialRepository', () => ({ socialRepository: { getFeedReaction: mocks.read, likePost: mocks.like, unlikePost: mocks.unlike, likeStory: mocks.like, unlikeStory: mocks.unlike } }));
vi.mock('../components/social/CommentsPanel', () => ({ CommentsPanel: () => <div>Comment panel</div> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.clearAllMocks(); mocks.user = { id: 'A' };
  mocks.read.mockResolvedValue({ liked: false, count: 4 });
  mocks.like.mockResolvedValue(undefined); mocks.unlike.mockResolvedValue(undefined);
});

it('shares one initial read and one mutation across desktop/mobile and uses confirmed count', async () => {
  const a = renderHook(() => useFeedReaction('post', 'shared', 4));
  const b = renderHook(() => useFeedReaction('post', 'shared', 4));
  await waitFor(() => expect(a.result.current.busy).toBe(false));
  expect(mocks.read).toHaveBeenCalledTimes(1);
  let finish!: () => void;
  mocks.like.mockReturnValueOnce(new Promise<void>(resolve => { finish = resolve; }));
  mocks.read.mockResolvedValueOnce({ liked: true, count: 9 });
  let pending!: Promise<boolean>;
  act(() => { pending = a.result.current.setLiked(true); void b.result.current.setLiked(true); });
  expect(mocks.like).toHaveBeenCalledTimes(1);
  expect(a.result.current.count).toBe(4);
  await act(async () => { finish(); await pending; });
  expect(a.result.current).toMatchObject({ liked: true, count: 9 });
  expect(b.result.current).toMatchObject({ liked: true, count: 9 });
  mocks.read.mockResolvedValueOnce({ liked: false, count: 8 });
  await act(async () => { await b.result.current.setLiked(false); });
  expect(a.result.current).toMatchObject({ liked: false, count: 8 });
});

it('does not read or mutate a Story when the viewer has no selected document', async () => {
  const { result } = renderHook(() => useFeedReaction('story', '', 0));
  await act(async () => { await result.current.setLiked(true); });
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.like).not.toHaveBeenCalled();
  expect(result.current.busy).toBe(false);
});

it('guest clicks prompt authentication without incrementing the card', async () => {
  mocks.user = null;
  const post = { id: 'guest', content: 'A real post', likesCount: 4 } as CommunityPost;
  render(<FeedPostCard post={post} />);
  fireEvent.click(screen.getByRole('button', { name: 'Like' }));
  expect(mocks.auth).toHaveBeenCalledTimes(1);
  expect(mocks.like).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Like' }).textContent).toBe('4');
});

it('failed writes and ambiguous confirmation never manufacture a new count', async () => {
  const { result } = renderHook(() => useFeedReaction('post', 'failed', 4));
  await waitFor(() => expect(result.current.busy).toBe(false));
  mocks.like.mockRejectedValueOnce(new Error('offline'));
  await act(async () => { expect(await result.current.setLiked(true)).toBe(false); });
  expect(result.current).toMatchObject({ count: 4, liked: false });
  expect(result.current.error).toBeTruthy();
  mocks.read.mockRejectedValueOnce(new Error('read unavailable'));
  await act(async () => { await result.current.setLiked(true); });
  expect(result.current).toMatchObject({ count: 4, liked: false });
  mocks.read.mockResolvedValueOnce({ count: 5, liked: true });
  await act(async () => { await result.current.refresh(); });
  expect(result.current).toMatchObject({ count: 5, liked: true, error: null });
});

it('late account A results cannot paint account B reactions', async () => {
  let finish!: (value: { count: number; liked: boolean }) => void;
  mocks.read.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(() => useFeedReaction('post', 'account', 4));
  mocks.user = { id: 'B' };
  rerender();
  await waitFor(() => expect(result.current.busy).toBe(false));
  await act(async () => { finish({ count: 100, liked: true }); });
  expect(result.current).toMatchObject({ count: 4, liked: false });
});

it('cancelled native share does not silently copy, and clipboard failure is visible', async () => {
  mocks.user = null;
  const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
  const writeText = vi.fn().mockRejectedValue(new Error('denied'));
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<FeedPostCard post={{ id: 'exact-id', content: 'test', likesCount: 0 } as CommunityPost} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share post' })); });
  expect(writeText).not.toHaveBeenCalled();
  expect(share.mock.calls[0][0].url).toBe(`${window.location.origin}/post/exact-id`);
  share.mockRejectedValueOnce(new Error('unsupported'));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share post' })); });
  expect(screen.getByRole('alert').textContent).toContain('Could not copy');
  expect((screen.getByRole('button', { name: 'Saving posts is unavailable' }) as HTMLButtonElement).disabled).toBe(true);
});
