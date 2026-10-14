import React from 'react';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DiscoveryWelcome } from '../components/discovery/DiscoveryWelcome';
import { useDiscoveryFeed } from '../hooks/useDiscoveryFeed';
import type { Companion } from '../types';

const context = vi.hoisted(() => ({ currentUser: null as any, updateUserProfile: vi.fn(), openAuthModal: vi.fn() }));
vi.mock('../context/AppContext', () => ({ useAppContext: () => context }));
afterEach(cleanup);
beforeEach(() => {
  context.currentUser = { id: 'A', role: 'customer', interests: ['Hiking Partner'] };
  context.updateUserProfile.mockReset().mockResolvedValue(undefined);
  context.openAuthModal.mockReset();
});

it('routes every intent to a real discovery section', () => {
  const onExplore = vi.fn();
  render(<DiscoveryWelcome onExplore={onExplore} />);
  ['Find a Sathi', 'Activities', 'Events'].forEach(name => fireEvent.click(screen.getByRole('button', { name: new RegExp(name) })));
  expect(onExplore.mock.calls.map(call => call[0])).toEqual(['companions', 'activities', 'events']);
});

it('asks guests to sign in without attempting a profile write', () => {
  context.currentUser = null;
  render(<DiscoveryWelcome onExplore={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Make it yours' }));
  expect(context.openAuthModal).toHaveBeenCalledOnce();
  expect(context.updateUserProfile).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Save interests' })).toBeNull();
});

it('keeps failed interest selections and reports success only after acknowledged save', async () => {
  context.updateUserProfile.mockRejectedValueOnce(new Error('permission-denied'));
  render(<DiscoveryWelcome onExplore={vi.fn()} availableInterests={['Homestays']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit interests' }));
  fireEvent.click(screen.getByRole('button', { name: 'Homestays' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save interests' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: 'Homestays' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('status').textContent).toBe('');
  fireEvent.click(screen.getByRole('button', { name: 'Save interests' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Interests saved'));
  expect(context.updateUserProfile).toHaveBeenLastCalledWith({ interests: ['Hiking Partner', 'Homestays'] });
});

it('does not write cancelled edits or leak them to the next edit', () => {
  render(<DiscoveryWelcome onExplore={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit interests' }));
  fireEvent.click(screen.getByRole('button', { name: 'Coffee Buddy' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit interests' }));
  expect(screen.getByRole('button', { name: 'Coffee Buddy' }).getAttribute('aria-pressed')).toBe('false');
  expect(context.updateUserProfile).not.toHaveBeenCalled();
});

it('disables repeat submission while a save is pending', () => {
  context.updateUserProfile.mockReturnValue(new Promise(() => {}));
  render(<DiscoveryWelcome onExplore={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Edit interests' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save interests' }));
  const pending = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement;
  fireEvent.click(pending);
  expect(pending.disabled).toBe(true);
  expect(context.updateUserProfile).toHaveBeenCalledOnce();
});

it('tolerates malformed legacy interest values', () => {
  context.currentUser.interests = 'Hiking';
  render(<DiscoveryWelcome onExplore={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Make it yours' })).toBeTruthy();
});

it('reranks existing feed categories on an explicit taste edit and keeps all people', () => {
  const people = [
    { id: 'hike', name: 'H', interests: ['Hiking Partner'], location: 'Pokhara', rating: 0, hourlyRate: 500 },
    { id: 'coffee', name: 'C', interests: ['Coffee Buddy'], location: 'Pokhara', rating: 0, hourlyRate: 500 },
  ] as Companion[];
  const empty: [] = [];
  const { result, rerender } = renderHook(() => useDiscoveryFeed(people, empty, empty, empty, empty));
  const firstCategory = () => result.current.find(item => item.type === 'category-header');
  expect(firstCategory()).toMatchObject({ category: 'Hiking Partner' });
  context.currentUser = { ...context.currentUser, interests: ['Coffee Buddy'] };
  rerender();
  expect(firstCategory()).toMatchObject({ category: 'Coffee Buddy' });
  expect(result.current.filter(item => item.type === 'companion').map(item => item.data.id).sort()).toEqual(['coffee', 'hike']);
  const stable = result.current;
  rerender();
  expect(result.current).toBe(stable);
});
