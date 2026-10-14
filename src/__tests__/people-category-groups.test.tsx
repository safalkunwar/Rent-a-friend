import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PeopleCategoryGroups } from '../components/discovery/PeopleCategoryGroups';
import type { Companion } from '../types';

vi.mock('../components/companions/CompanionCard', () => ({ CompanionCard: ({ companion, isFav, onToggleFavorite, onViewCompanion }: any) => <div>
  <h4>{companion.name}</h4><button onClick={() => onViewCompanion(companion)}>View {companion.name}</button>
  <button aria-pressed={isFav} onClick={() => onToggleFavorite(companion.id)}>Save {companion.name}</button>
</div> }));
afterEach(cleanup);
const person = (id: string, interests: unknown) => ({ id, name: id, interests }) as Companion;
const props = { favorites: [], onToggleFavorite: vi.fn(), onViewCompanion: vi.fn(), onShowToast: vi.fn() };

it('keeps secondary-interest matches together under the selected category without changing data', () => {
  const people = [person('A', ['Hiking Partner', 'Coffee Buddy']), person('B', ['Coffee Buddy'])];
  const { rerender } = render(<PeopleCategoryGroups {...props} companions={people} selectedCategory="Coffee Buddy" />);
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(within(screen.getByRole('region', { name: 'Coffee Buddy people' })).getAllByRole('heading', { level: 4 })).toHaveLength(2);
  expect(people[0].interests).toEqual(['Hiking Partner', 'Coffee Buddy']);
  rerender(<PeopleCategoryGroups {...props} companions={people} selectedCategory="All" />);
  expect(screen.getAllByRole('region')).toHaveLength(2);
});

it('groups by primary interest, shows counts and does not repeat multi-interest people', () => {
  render(<PeopleCategoryGroups {...props} companions={[person('A', ['Coffee Buddy', 'Hiking Partner']), person('B', ['Coffee Buddy']), person('C', ['Hiking Partner'])]} />);
  const coffee = screen.getByRole('region', { name: 'Coffee Buddy people' });
  expect(within(coffee).getAllByRole('heading', { level: 4 }).map(item => item.textContent)).toEqual(['A', 'B']);
  expect(within(coffee).getByText('2 people')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Hiking Partner people' })).getByText('1 person')).toBeTruthy();
  expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3);
});

it('keeps filtered/sorted inputs intact and merges subsequently loaded people into categories', () => {
  const initial = [person('B', ['Coffee Buddy']), person('A', ['Coffee Buddy'])];
  const { rerender } = render(<PeopleCategoryGroups {...props} companions={initial} />);
  expect(screen.getAllByRole('heading', { level: 4 }).map(item => item.textContent)).toEqual(['B', 'A']);
  rerender(<PeopleCategoryGroups {...props} companions={[...initial, person('C', ['Coffee Buddy'])]} />);
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(screen.getByText('3 people')).toBeTruthy();
  rerender(<PeopleCategoryGroups {...props} companions={[initial[1]]} />);
  expect(screen.queryByRole('heading', { name: 'B' })).toBeNull();
  expect(screen.getByText('1 person')).toBeTruthy();
});

it('places missing and malformed interests in Local Companion', () => {
  render(<PeopleCategoryGroups {...props} companions={[person('A', []), person('B', undefined), person('C', 'Coffee')]} />);
  expect(screen.getAllByRole('region')).toHaveLength(1);
  expect(screen.getByRole('region', { name: 'Local Companion people' })).toBeTruthy();
  expect(screen.getByText('3 people')).toBeTruthy();
});

it('preserves saved state and delegates profile/save actions for the exact person', () => {
  const companion = person('A', ['Coffee Buddy']);
  const save = vi.fn(), view = vi.fn();
  render(<PeopleCategoryGroups {...props} companions={[companion]} favorites={['A']} onToggleFavorite={save} onViewCompanion={view} />);
  const button = screen.getByRole('button', { name: 'Save A' });
  expect(button.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(button); fireEvent.click(screen.getByRole('button', { name: 'View A' }));
  expect(save).toHaveBeenCalledWith('A'); expect(view).toHaveBeenCalledWith(companion);
});
