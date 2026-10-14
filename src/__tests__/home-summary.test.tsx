import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { HomePage } from '../components/home/HomePage';
import { rankHomePeople } from '../services/homeRecommendations';
import type { Activity, CommunityPost, Companion, Event, Partner, User } from '../types';

afterEach(cleanup);

const person = (id: string, interests: string[], location = 'Pokhara', userId?: string) => ({
  id, userId, name: id, interests, location, imageUrl: '', hourlyRate: 500, reviewsCount: 0, rating: 5,
} as Companion);

it('ranks every explicit interest, keeps a single row per known person and explains only real matches', () => {
  const user = { interests: ['Coffee Buddy'], location: 'Pokhara' } as User;
  const people = rankHomePeople([
    person('a-hike', ['Hiking Partner'], 'Pokhara'),
    person('z-coffee', ['Hiking Partner', ' coffee buddy ', 'Coffee Buddy'], 'Pokhara', 'uid-coffee'),
    person('duplicate-coffee', ['Coffee Buddy'], 'Pokhara', 'uid-coffee'),
    person('b-elsewhere', ['Coffee Buddy'], 'Kathmandu'),
  ], user);
  expect(people.map(item => item.companion.id)).toEqual(['z-coffee', 'b-elsewhere', 'a-hike']);
  expect(people[0].reason).toContain('coffee buddy');
  expect(people[1].reason).toContain('Coffee Buddy');
  expect(people[2].reason).toBe('Also in Pokhara');
  expect(rankHomePeople([person('plain', ['Hiking Partner'], 'Pokhara')], null)[0].reason).toBeNull();
});

it('keeps Home finite and routes factual previews without inventing offers or Coin balances', () => {
  const onExplore = vi.fn();
  const onOpenEvent = vi.fn();
  const onOpenPost = vi.fn();
  render(<HomePage
    user={{ id: 'viewer', interests: ['Coffee Buddy'], location: 'Pokhara' } as User}
    companions={[person('Maya', ['Photography Guide', 'Coffee Buddy'])]}
    activities={[{ id: 'activity', title: 'Lakeside walk', location: 'Pokhara' } as Activity]}
    events={[{ id: 'old', title: 'Old gathering', date: '2000-01-01' }, { id: 'future', title: 'Photo walk', date: '2099-01-01' }] as Event[]}
    partners={[{ id: 'cafe', name: 'Lakeside Café', loc: 'Pokhara', disc: '10% off' } as Partner]}
    stories={[]}
    posts={[{ id: 'post', title: 'Morning by the lake', userName: 'Anu' } as CommunityPost]}
    bookings={[]}
    favorites={[]}
    peopleLoading={false}
    error={null}
    onRetry={vi.fn()}
    onToggleFavorite={vi.fn()}
    onViewCompanion={vi.fn()}
    onViewStory={vi.fn()}
    onCreateStory={vi.fn()}
    onExplore={onExplore}
    onOpenEvent={onOpenEvent}
    onOpenPost={onOpenPost}
    onOpenBookings={vi.fn()}
  />);
  expect(screen.getByRole('heading', { name: 'People for you' })).toBeTruthy();
  expect(screen.getByText('You both like Coffee Buddy')).toBeTruthy();
  expect(screen.queryByText('Old gathering')).toBeNull();
  expect(screen.queryByText('10% off')).toBeNull();
  expect(screen.queryByText(/coins/i)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /See places/i }));
  expect(onExplore).toHaveBeenCalledWith('places');
  fireEvent.click(screen.getByRole('button', { name: /Photo walk/i }));
  expect(onOpenEvent).toHaveBeenCalledWith('future');
  fireEvent.click(within(screen.getByRole('region', { name: 'Community moments' })).getByRole('button', { name: /Morning by the lake/i }));
  expect(onOpenPost).toHaveBeenCalledWith('post');
});
