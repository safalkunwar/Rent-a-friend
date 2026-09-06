import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DiscoveryPageControl } from '../components/discovery/DiscoveryPageControl';
import { filterCompanions, homeSourceError } from '../services/discoverySearch';
import { useCompanions } from '../hooks/useFirestoreData';
import { useCompanionCategories } from '../hooks/useCompanionCategories';
import type { Companion } from '../types';

const mocks = vi.hoisted(() => ({ page: vi.fn() }));
vi.mock('../services/firestore', () => ({ firestore: { getDocumentsPaginated: mocks.page } }));
afterEach(cleanup);
beforeEach(() => { mocks.page.mockReset(); });
const filters = { query: '', category: 'All', city: 'All', language: 'All', maxRate: 3000,
  minRating: 0, savedOnly: false, favorites: [], sort: 'recommended' as const };
const profile = (fields: Record<string, unknown>) => ({ id: 'a', hourlyRate: 500, ...fields }) as unknown as Companion;

it('ignores malformed legacy text and arrays without creating searchable claims', () => {
  const records = [profile({ name: 42, location: {}, bio: null, interests: 'Hiking', languages: [null, 9, 'Nepali'] })];
  expect(filterCompanions(records, { ...filters, query: 'Nepali' })).toEqual(records);
  expect(filterCompanions(records, { ...filters, query: '42' })).toEqual([]);
  expect(filterCompanions(records, { ...filters, query: 'Hiking' })).toEqual([]);
  expect(filterCompanions(records, { ...filters, city: 'Kathmandu' })).toEqual([]);
});

it('does not treat unknown or invalid prices as free and puts unknown ratings last', () => {
  expect(filterCompanions([undefined, NaN, -1, '50'].map(hourlyRate => profile({ hourlyRate })), filters)).toEqual([]);
  const zero = profile({ id: 'zero', rating: 0, hourlyRate: 0 });
  const unknown = profile({ id: 'unknown' });
  const rated = profile({ id: 'rated', rating: 4 });
  expect(filterCompanions([unknown, zero, rated], { ...filters, sort: 'rating' }).map(c => c.id)).toEqual(['rated', 'zero', 'unknown']);
  expect(filterCompanions([unknown, zero, rated], { ...filters, minRating: 1 })).toEqual([rated]);
});

it('preserves saved, price, language and category filters without mutating source order', () => {
  const records = [profile({ id: 'b', hourlyRate: 900, interests: ['Hiking'], languages: ['Nepali'] }), profile({ id: 'a', hourlyRate: 500 })];
  expect(filterCompanions(records, { ...filters, sort: 'priceAsc' }).map(c => c.id)).toEqual(['a', 'b']);
  expect(records[0].id).toBe('b');
  expect(filterCompanions(records, { ...filters, category: 'hiking', language: 'nepali', savedOnly: true, favorites: ['b'] })).toEqual([records[0]]);
});

it('groups missing interests safely including prototype-shaped category names', () => {
  const { result } = renderHook(() => useCompanionCategories([profile({}), profile({ interests: ['__proto__'] })]));
  expect(result.current.map(c => c.category)).toEqual(['Local Companion', '__proto__']);
});

it('names failed Home sources without exposing backend error details', () => {
  expect(homeSourceError({ Stories: 'permission denied', events: null, companions: 'internal' }))
    .toBe('Could not load: Stories, companions. Loaded content remains available.');
  expect(homeSourceError({ Stories: null })).toBeNull();
});

it('finds a second-page match only after an explicit bounded load, shared by search consumers', async () => {
  mocks.page.mockResolvedValueOnce({ items: [profile({ id: 'a', location: 'Pokhara' })], hasMore: true });
  function Search() {
    const state = useCompanions();
    const matches = filterCompanions(state.companions, { ...filters, query: 'Kathmandu' });
    return <DiscoveryPageControl source="companions" loaded={state.companions.length} matches={matches.length}
      {...state} onLoadMore={state.loadMore} onRetry={state.retry} />;
  }
  render(<Search />);
  await screen.findByText('0 matches in 1 loaded companions.');
  expect(mocks.page).toHaveBeenCalledTimes(1);
  let finish!: (value: unknown) => void;
  mocks.page.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const button = screen.getByRole('button', { name: 'Load more companions' });
  fireEvent.click(button); fireEvent.click(button);
  expect(mocks.page).toHaveBeenCalledTimes(2);
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.page).toHaveBeenLastCalledWith('companions', { orderById: true, limitCount: 15, startAfter: ['a'] });
  await act(async () => { finish({ items: [profile({ id: 'b', location: 'Kathmandu' })], hasMore: false }); });
  await screen.findByText('1 matches in 2 loaded companions.');
  expect(screen.queryByRole('button')).toBeNull();
});

it('offers retry on initial failure even with hasMore false and no successful page', async () => {
  const retry = vi.fn().mockResolvedValue(undefined), loadMore = vi.fn();
  render(<DiscoveryPageControl source="events" loaded={0} matches={0} loading={false} loadingMore={false}
    hasMore={false} error="failed" onRetry={retry} onLoadMore={loadMore} />);
  expect(screen.getByRole('alert').textContent).toContain('Results may be incomplete');
  fireEvent.click(screen.getByRole('button', { name: 'Retry events' }));
  await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
  expect(loadMore).not.toHaveBeenCalled();
  expect(screen.queryByText('End of available pages.')).toBeNull();
});

it('handles rejected actions without an unhandled promise and permits retry', async () => {
  const loadMore = vi.fn().mockRejectedValue(new Error('offline')), retry = vi.fn().mockResolvedValue(undefined);
  render(<DiscoveryPageControl source="activities" loaded={1} matches={0} loading={false} loadingMore={false}
    hasMore error={null} onRetry={retry} onLoadMore={loadMore} />);
  fireEvent.click(screen.getByRole('button', { name: 'Load more activities' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry activities' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(retry).toHaveBeenCalledTimes(1);
});
