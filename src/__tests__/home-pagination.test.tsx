import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useCompanions, useCommunityPosts } from '../hooks/useFirestoreData';
const mocks = vi.hoisted(() => ({ page: vi.fn() }));
vi.mock('../services/firestore', () => ({ firestore: { getDocumentsPaginated: mocks.page } }));
afterEach(cleanup);
beforeEach(() => mocks.page.mockReset());

it('uses bounded cursor queries, merges overlapping payloads, coalesces bursts and stops at exhaustion', async () => {
  mocks.page.mockResolvedValueOnce({ items: [{ id: 'a', name: 'old' }], hasMore: true });
  const { result } = renderHook(useCompanions);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(mocks.page).toHaveBeenCalledWith('companions', { orderById: true, limitCount: 15 });
  let finish!: (value: unknown) => void;
  mocks.page.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = result.current.loadMore(); void result.current.loadMore(); void result.current.loadMore(); });
  expect(mocks.page).toHaveBeenCalledTimes(2);
  expect(mocks.page).toHaveBeenLastCalledWith('companions', { orderById: true, limitCount: 15, startAfter: ['a'] });
  await act(async () => { finish({ items: [{ id: 'a', name: 'fresh' }, { id: 'b' }], hasMore: false }); await pending; });
  expect(result.current.companions).toEqual([{ id: 'a', name: 'fresh' }, { id: 'b' }]);
  await act(async () => { await result.current.loadMore(); });
  expect(mocks.page).toHaveBeenCalledTimes(2);
});

it('deduplicates simultaneous mounted consumers but revalidates after remount instead of replaying stale posts', async () => {
  let finish!: (value: unknown) => void;
  mocks.page.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = renderHook(useCommunityPosts), second = renderHook(useCommunityPosts);
  expect(mocks.page).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ items: [{ id: 'deleted-later' }], hasMore: false }); });
  expect(second.result.current.posts).toHaveLength(1);
  first.unmount(); second.unmount();
  mocks.page.mockResolvedValueOnce({ items: [], hasMore: false });
  const next = renderHook(useCommunityPosts);
  expect(next.result.current.posts).toEqual([]);
  await waitFor(() => expect(next.result.current.loading).toBe(false));
  expect(next.result.current.posts).toEqual([]);
  expect(mocks.page).toHaveBeenCalledTimes(2);
  expect(mocks.page.mock.calls[1][1]).toMatchObject({ limitCount: 10, where: [{ field: 'status', operator: '==', value: 'published' }] });
});

it('retains the cursor on failure and retries it without false exhaustion', async () => {
  mocks.page.mockResolvedValueOnce({ items: [{ id: 'a' }], hasMore: true });
  const { result } = renderHook(useCompanions);
  await waitFor(() => expect(result.current.loading).toBe(false));
  mocks.page.mockResolvedValueOnce({ items: [], hasMore: false, failed: true });
  await act(async () => { await result.current.loadMore(); });
  expect(result.current.error).toBeTruthy();
  expect(result.current.hasMore).toBe(true);
  expect(result.current.companions).toEqual([{ id: 'a' }]);
  mocks.page.mockResolvedValueOnce({ items: [{ id: 'b' }], hasMore: false });
  await act(async () => { await result.current.retry(); });
  expect(result.current.error).toBeNull();
  expect(result.current.companions).toEqual([{ id: 'a' }, { id: 'b' }]);
  expect(mocks.page.mock.calls[2][1].startAfter).toEqual(['a']);
});

it('does not let an unmounted page completion contaminate a new consumer', async () => {
  mocks.page.mockResolvedValueOnce({ items: [{ id: 'a' }], hasMore: true });
  const first = renderHook(useCompanions);
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  let finish!: (value: unknown) => void;
  mocks.page.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = first.result.current.loadMore(); });
  first.unmount();
  mocks.page.mockResolvedValueOnce({ items: [{ id: 'fresh-head' }], hasMore: false });
  const second = renderHook(useCompanions);
  await waitFor(() => expect(second.result.current.loading).toBe(false));
  await act(async () => { finish({ items: [{ id: 'late-old-page' }], hasMore: false }); await pending; });
  expect(second.result.current.companions).toEqual([{ id: 'fresh-head' }]);
});
