import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PeopleDirectory, type PeopleView } from '../components/discovery/PeopleDirectory';
import { CompanionCard } from '../components/companions/CompanionCard';
import type { Companion } from '../types';

vi.mock('../components/ui/SafeImage', () => ({ SafeImage: ({ alt }: { alt: string }) => <img alt={alt} /> }));
afterEach(cleanup);
const companion = { id: 'A', name: 'Asha', age: 25, interests: ['Coffee Buddy', 'Cultural Guide'], hourlyRate: 0, rating: 5, reviewsCount: 0, isVerified: true, location: 'Pokhara' } as Companion;
const props = () => ({ mode: 'all' as PeopleView, onMode: vi.fn(), categoryStep: 0, onCategoryStep: vi.fn(), companions: [companion], search: '', onSearch: vi.fn(), category: 'All', categories: ['Coffee Buddy', 'Cultural Guide'], onCategory: vi.fn(), onFilters: vi.fn(), activeFilters: 0, onReset: vi.fn(), savedOnly: false, onSavedOnly: vi.fn(), favorites: [], onToggleFavorite: vi.fn(), onViewCompanion: vi.fn(), loading: false, pagination: <button>Load more people</button> });

it('keeps the current directory people-only with category grouping and bounded pagination', () => {
  render(<PeopleDirectory {...props()} />);
  expect(screen.getByRole('heading', { name: 'People', level: 1 })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Coffee Buddy people' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Load more people' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Events' })).toBeNull();
});

it('delegates search, category, filters and saved controls to the existing shared pipeline', () => {
  const callbacks = props();
  render(<PeopleDirectory {...callbacks} />);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search people' }), { target: { value: 'Pokhara' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Interest' }), { target: { value: 'Coffee Buddy' } });
  fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Saved only' }));
  expect(callbacks.onSearch).toHaveBeenCalledWith('Pokhara');
  expect(callbacks.onCategory).toHaveBeenCalledWith('Coffee Buddy');
  expect(callbacks.onFilters).toHaveBeenCalledOnce();
  expect(callbacks.onSavedOnly).toHaveBeenCalledWith(true);
});

it('never promotes legacy free rates, guide interests or approval flags to new service modes', () => {
  function ControlledDirectory() {
    const [mode, setMode] = React.useState<PeopleView>('types');
    const [step, setStep] = React.useState(0);
    return <PeopleDirectory {...props()} mode={mode} onMode={setMode} categoryStep={step} onCategoryStep={setStep} />;
  }
  render(<ControlledDirectory />);
  for (const name of ['Free Friends', 'Local Hosts', 'Guides']) {
    fireEvent.click(screen.getByRole('button', { name: `Select ${name}`, pressed: false }));
    fireEvent.click(screen.getByRole('button', { name: `Explore ${name}` }));
    expect(screen.getByRole('status').textContent).toContain('not available yet');
    expect(screen.queryByRole('button', { name: "View Asha's profile" })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Load more people' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Browse current people' }));
    expect(screen.getByRole('button', { name: "View Asha's profile" })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All Companion Types' }));
  }
});

it('retains the parent-selected service mode when responsive presentation remounts', () => {
  const callbacks = props();
  const { rerender } = render(<PeopleDirectory key="desktop" {...callbacks} mode="guide" />);
  expect(screen.getByRole('status').textContent).toContain('agency listings are not available');
  rerender(<PeopleDirectory key="mobile" {...callbacks} mode="guide" />);
  expect(screen.getByRole('heading', { name: 'Guides' })).toBeTruthy();
  expect(screen.queryByRole('searchbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Browse current people' }));
  expect(callbacks.onMode).toHaveBeenCalledWith('all');
});

it('opens only the category entry and preserves its preview through responsive remounts', () => {
  const callbacks = props();
  const { rerender } = render(<PeopleDirectory key="desktop" {...callbacks} mode="types" categoryStep={-1} />);
  expect(screen.getByRole('button', { name: 'View Guides' })).toBeTruthy();
  expect(screen.queryByRole('searchbox')).toBeNull();
  expect(screen.queryByRole('button', { name: "View Asha's profile" })).toBeNull();
  rerender(<PeopleDirectory key="mobile" {...callbacks} mode="types" categoryStep={-1} />);
  fireEvent.click(screen.getByRole('button', { name: 'Explore Guides' }));
  expect(callbacks.onMode).toHaveBeenCalledWith('guide');
  expect(callbacks.onSearch).not.toHaveBeenCalled();
  expect(callbacks.onCategory).not.toHaveBeenCalled();
});

it('preserves empty/loading/reset states without fallback profiles', () => {
  const callbacks = props();
  const { rerender } = render(<PeopleDirectory {...callbacks} companions={[]} loading />);
  expect(screen.getByRole('status').textContent).toContain('Loading people');
  rerender(<PeopleDirectory {...callbacks} companions={[]} search="nothing" />);
  expect(screen.getByRole('status').textContent).toContain('No matches');
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(callbacks.onReset).toHaveBeenCalledOnce();
  expect(screen.queryByRole('heading', { level: 4 })).toBeNull();
});

it('uses explicit accessible profile/save actions without fabricated trust, reviews or save acknowledgments', async () => {
  const view = vi.fn(), save = vi.fn(), toast = vi.fn();
  render(<CompanionCard companion={companion} layout="compact" onViewCompanion={view} onToggleFavorite={save} onShowToast={toast} />);
  fireEvent.click(screen.getByRole('button', { name: "View Asha's profile" }));
  fireEvent.click(screen.getByRole('button', { name: 'Save Asha' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Asha' }).hasAttribute('disabled')).toBe(false));
  expect(view).toHaveBeenCalledWith(companion);
  expect(save).toHaveBeenCalledWith('A');
  expect(toast).not.toHaveBeenCalled();
  expect(screen.queryByText('APPLICATION APPROVED')).toBeNull();
  expect(screen.queryByText('5 (0)')).toBeNull();
  expect(screen.getByText('Listed rate · NPR 0/hr')).toBeTruthy();
});
