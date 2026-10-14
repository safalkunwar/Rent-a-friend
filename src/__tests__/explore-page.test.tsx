import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ExplorePage, type ExploreCategory } from '../components/discovery/ExplorePage';
import type { Activity, Event, Partner } from '../types';

const map = vi.hoisted(() => ({ mounts: 0, latest: null as any }));
vi.mock('../components/maps/MapPreview', () => ({ MapPreview: (props: any) => {
  map.latest = props;
  React.useEffect(() => { map.mounts++; }, []);
  return <div data-testid="existing-map">{props.markers.map((marker: any) => <button key={marker.id} onClick={() => props.onMarkerClick(marker.id)}>{marker.title}</button>)}</div>;
} }));
beforeEach(() => { map.mounts = 0; map.latest = null; });
afterEach(cleanup);

const activities = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, title: `Lakeside walk ${i}`, category: 'Outdoors', location: 'Pokhara', duration: '2 hours', avgPrice: 500, imageUrl: `/existing-activity-${i}.jpg` })) as Activity[];
const events = Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, title: `Upcoming gathering ${i}`, date: `2099-11-${10 + i}`, time: '17:00', location: 'Pokhara', imageUrl: '/existing-event.jpg' })) as Event[];
const partners = [
  { id: 'cafe', name: 'Lakeside Café', category: 'Café', loc: 'Pokhara', imageUrl: '/existing-cafe.jpg', disc: '10% off with SATHI Companion' },
  { id: 'hotel', name: 'Hill Hotel', category: 'Hotel', loc: 'Kathmandu', imageUrl: '/existing-hotel.jpg', disc: '' },
  { id: 'resort', name: 'Lake Resort', category: 'Resort', loc: 'Pokhara', disc: 'Breakfast included' },
  { id: 'tour', name: 'Cafe View Tours', category: 'Tour Operator', loc: 'Pokhara', disc: '' },
] as Partner[];
const page = () => ({ loading: false, loadingMore: false, hasMore: true, error: null, onLoadMore: vi.fn().mockResolvedValue(undefined), onRetry: vi.fn().mockResolvedValue(undefined) });
function props() {
  return { category: 'all' as ExploreCategory, onCategory: vi.fn(), search: '', onSearch: vi.fn(), city: 'All', onCity: vi.fn(),
    activities, allActivities: activities, events, allEvents: events, partners,
    activityPage: page(), eventPage: page(), partnerPage: page(),
    markers: [
      { id: 'companion:c1', title: 'Existing person pin', type: 'companion' as const, position: { lat: 28.2, lng: 83.9 } },
      { id: 'activity:a0', title: 'Existing activity pin', type: 'activity' as const, position: { lat: 28.21, lng: 83.91 } },
      { id: 'event:e0', title: 'Existing event pin', type: 'event' as const, position: { lat: 28.22, lng: 83.92 } },
    ],
    onMarkerClick: vi.fn(), onAllActivities: vi.fn(), onAllEvents: vi.fn(), onOpenEvent: vi.fn(), onCommunity: vi.fn() };
}

it('offers only data-supported visual categories and uses existing images', () => {
  const input = props();
  const { rerender } = render(<ExplorePage {...input} />);
  const rail = screen.getByRole('navigation', { name: 'Discover by category' });
  expect(within(rail).getAllByRole('button')).toHaveLength(5);
  fireEvent.click(within(rail).getByRole('button', { name: /Eat & Drink/ }));
  expect(input.onCategory).toHaveBeenCalledWith('food');
  expect(rail.querySelector('img')?.getAttribute('src')).toBe('/existing-cafe.jpg');
  rerender(<ExplorePage {...input} partners={[]} allEvents={[]} />);
  expect(within(rail).queryByRole('button', { name: /Eat & Drink/ })).toBeNull();
  expect(within(rail).queryByRole('button', { name: /Stay Nearby/ })).toBeNull();
  expect(within(rail).queryByRole('button', { name: /SATHI Benefits/ })).toBeNull();
  expect(within(rail).queryByRole('button', { name: /Events/ })).toBeNull();
  expect(within(rail).getAllByRole('button')).toHaveLength(1);
});

it('filters food/stays by stored category rather than guessing from place names', () => {
  const input = props();
  const { rerender } = render(<ExplorePage {...input} category="food" />);
  expect(screen.getByRole('heading', { name: 'Lakeside Café' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Cafe View Tours' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Hill Hotel' })).toBeNull();
  rerender(<ExplorePage {...input} category="stays" />);
  expect(screen.getByRole('heading', { name: 'Hill Hotel' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Lake Resort' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Lakeside Café' })).toBeNull();
});

it('combines partner search/location filters and preserves shared controlled state on category selection', () => {
  const input = props();
  render(<ExplorePage {...input} category="places" search="lake" city="Pokhara" />);
  expect(screen.getAllByRole('heading', { level: 3 }).map(item => item.textContent)).toEqual(['Lakeside Café', 'Lake Resort']);
  fireEvent.click(screen.getByRole('button', { name: /Stay Nearby/ }));
  expect(input.onCategory).toHaveBeenCalledWith('stays');
  expect(input.onSearch).not.toHaveBeenCalled();
  expect(input.onCity).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search Explore' }), { target: { value: 'coffee' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Explore location' }), { target: { value: 'Kathmandu' } });
  expect(input.onSearch).toHaveBeenCalledWith('coffee');
  expect(input.onCity).toHaveBeenCalledWith('Kathmandu');
});

it('displays only supplied benefit wording with no invented ratings or redemption action', () => {
  const input = props();
  render(<ExplorePage {...input} category="benefits" />);
  expect(screen.getByText('10% off with SATHI Companion')).toBeTruthy();
  expect(screen.getByText('Breakfast included')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Hill Hotel' })).toBeNull();
  expect(screen.queryByText(/NPR 800/)).toBeNull();
  expect(screen.queryByText(/rating/i)).toBeNull();
  expect(screen.queryByRole('button', { name: /redeem|pay|book/i })).toBeNull();
});

it('keeps default previews bounded and excludes past/invalid events', () => {
  const input = props();
  render(<ExplorePage {...input} events={[{ id: 'past', title: 'Past event', date: '2020-01-01' }, { id: 'invalid', title: 'Unknown date', date: '' }, ...events] as Event[]} />);
  expect(within(screen.getByRole('region', { name: 'Activities to explore' })).getAllByRole('article')).toHaveLength(3);
  expect(within(screen.getByRole('region', { name: 'Things happening' })).getAllByRole('article')).toHaveLength(3);
  expect(screen.queryByText('Past event')).toBeNull();
  expect(screen.queryByText('Unknown date')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Load more activities' })).toBeNull();
});

it('does not promote a past event image as current discovery artwork', () => {
  const input = props();
  const past = { id: 'past', title: 'Past event', date: '2020-01-01', imageUrl: '/past-event.jpg' } as Event;
  render(<ExplorePage {...input} events={[past]} allEvents={[past]} />);
  const eventCategory = within(screen.getByRole('navigation', { name: 'Discover by category' })).getByRole('button', { name: /Events/ });
  expect(eventCategory.querySelector('img')).toBeNull();
});

it('reuses existing event, activity, community and marker actions', () => {
  const input = props();
  render(<ExplorePage {...input} />);
  fireEvent.click(screen.getByRole('button', { name: 'See all activities' }));
  fireEvent.click(screen.getByRole('button', { name: 'See all events' }));
  fireEvent.click(screen.getByRole('button', { name: 'View event: Upcoming gathering 0' }));
  fireEvent.click(screen.getByRole('button', { name: 'From the community' }));
  fireEvent.click(screen.getByRole('button', { name: 'Existing person pin' }));
  expect(input.onAllActivities).toHaveBeenCalledOnce();
  expect(input.onAllEvents).toHaveBeenCalledOnce();
  expect(input.onOpenEvent).toHaveBeenCalledWith('e0');
  expect(input.onCommunity).toHaveBeenCalledOnce();
  expect(input.onMarkerClick).toHaveBeenCalledWith('companion:c1');
});

it('updates map pins without remounting/recentering during category previews', () => {
  const input = props();
  const { rerender } = render(<ExplorePage {...input} />);
  const center = map.latest.center;
  rerender(<ExplorePage {...input} category="activities" />);
  expect(map.mounts).toBe(1);
  expect(map.latest.center).toEqual(center);
  expect(map.latest.markers.map((item: any) => item.id)).toEqual(['activity:a0']);
  rerender(<ExplorePage {...input} category="food" />);
  expect(map.mounts).toBe(1);
  expect(map.latest.center).toEqual(center);
  expect(map.latest.markers).toEqual([]);
  expect(screen.getByText(/Partner map locations are not available yet/)).toBeTruthy();
});

it('retains explicit bounded pagination and retry callbacks for places and activities', async () => {
  const input = props();
  const { rerender } = render(<ExplorePage {...input} category="places" />);
  fireEvent.click(screen.getByRole('button', { name: 'Load more places' }));
  expect(input.partnerPage.onLoadMore).toHaveBeenCalledOnce();
  rerender(<ExplorePage {...input} category="activities" />);
  fireEvent.click(screen.getByRole('button', { name: 'Load more activities' }));
  expect(input.activityPage.onLoadMore).toHaveBeenCalledOnce();
  rerender(<ExplorePage {...input} category="all" partnerPage={{ ...input.partnerPage, error: 'offline' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(input.partnerPage.onRetry).toHaveBeenCalledOnce();
});

it('clears the Explore controls together and toggles the selected category back to all', () => {
  const input = props();
  render(<ExplorePage {...input} category="food" search="coffee" city="Pokhara" />);
  fireEvent.click(screen.getByRole('button', { name: /Eat & Drink/ }));
  expect(input.onCategory).toHaveBeenCalledWith('all');
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(input.onSearch).toHaveBeenCalledWith('');
  expect(input.onCity).toHaveBeenCalledWith('All');
});
