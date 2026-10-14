import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppProvider, useAppContext } from '../context/AppContext';
import { CompanionCard } from '../components/companions/CompanionCard';
import type { Companion, User } from '../types';

const mocks = vi.hoisted(() => ({
  uid: 'A',
  listener: null as null | ((user: any) => Promise<void>),
  updateFavorites: vi.fn(),
  subscribe: vi.fn(() => () => {}),
}));

vi.mock('../services/auth', () => ({
  authService: { onAuthStateChanged: (listener: (user: any) => Promise<void>) => { mocks.listener = listener; return () => {}; } },
}));
vi.mock('../services/firestore', () => ({ firestore: { subscribe: mocks.subscribe } }));
vi.mock('../repositories/UserRepository', () => ({ userRepository: { updateFavorites: mocks.updateFavorites } }));
vi.mock('../services/profileBootstrap', () => ({
  loadAuthenticatedProfile: async (user: { uid: string }) => ({ id: user.uid, name: user.uid, email: '', avatar: '', role: 'customer', favorites: [] } as User),
}));
vi.mock('../services/identity', () => ({
  requireUid: (expected?: string) => {
    if (expected && expected !== mocks.uid) throw new Error('Account changed');
    return mocks.uid;
  },
}));

beforeEach(() => {
  mocks.uid = 'A';
  mocks.updateFavorites.mockReset();
  mocks.updateFavorites.mockResolvedValue(undefined);
  mocks.subscribe.mockClear();
});
afterEach(cleanup);

async function signedIn() {
  const view = renderHook(useAppContext, { wrapper: ({ children }) => <AppProvider>{children}</AppProvider> });
  await act(async () => { await mocks.listener?.({ uid: 'A', claims: {} }); });
  return view;
}

it('shows saved state only after the profile write acknowledges and preserves state on failure', async () => {
  const view = await signedIn();
  let finish!: () => void;
  mocks.updateFavorites.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  let first!: Promise<void>;
  act(() => { first = view.result.current.toggleFavorite('person-1'); });
  await waitFor(() => expect(mocks.updateFavorites).toHaveBeenCalledWith('A', ['person-1']));
  expect(view.result.current.favorites).toEqual([]);
  await act(async () => { finish(); await first; });
  expect(view.result.current.favorites).toEqual(['person-1']);
  expect(mocks.subscribe).toHaveBeenCalledTimes(3);

  mocks.updateFavorites.mockRejectedValueOnce(new Error('permission-denied'));
  await act(async () => { await expect(view.result.current.toggleFavorite('person-1')).rejects.toThrow('permission-denied'); });
  expect(view.result.current.favorites).toEqual(['person-1']);
  await act(async () => { await view.result.current.toggleFavorite('person-2'); });
  expect(view.result.current.favorites).toEqual(['person-1', 'person-2']);
});

it('serializes quick saves and does not copy an old account result into a new account', async () => {
  const view = await signedIn();
  let finish!: () => void;
  mocks.updateFavorites.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  let first!: Promise<void>;
  let second!: Promise<void>;
  act(() => {
    first = view.result.current.toggleFavorite('person-1');
    second = view.result.current.toggleFavorite('person-2');
  });
  await waitFor(() => expect(mocks.updateFavorites).toHaveBeenCalledTimes(1));
  await act(async () => { finish(); await Promise.all([first, second]); });
  expect(mocks.updateFavorites.mock.calls.map(call => call[1])).toEqual([['person-1'], ['person-1', 'person-2']]);
  expect(view.result.current.favorites).toEqual(['person-1', 'person-2']);

  let finishOld!: () => void;
  mocks.updateFavorites.mockImplementationOnce(() => new Promise<void>(resolve => { finishOld = resolve; }));
  let oldWrite!: Promise<void>;
  act(() => { oldWrite = view.result.current.toggleFavorite('person-3'); });
  await waitFor(() => expect(mocks.updateFavorites).toHaveBeenCalledTimes(3));
  mocks.uid = 'B';
  await act(async () => { await mocks.listener?.({ uid: 'B', claims: {} }); });
  await act(async () => { finishOld(); await oldWrite; });
  expect(view.result.current.currentUser?.id).toBe('B');
  expect(view.result.current.favorites).toEqual([]);
});

it('disables a favorite button during its write and surfaces a rejected write', async () => {
  let rejectWrite!: (error: Error) => void;
  const onToggleFavorite = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectWrite = reject; }));
  const onShowToast = vi.fn();
  const companion = { id: 'person-1', name: 'Maya', location: 'Pokhara', interests: [] } as unknown as Companion;
  render(<CompanionCard companion={companion} layout="home" onToggleFavorite={onToggleFavorite} onShowToast={onShowToast} />);
  const save = screen.getByRole('button', { name: 'Save Maya' });
  fireEvent.click(save);
  expect(save.hasAttribute('disabled')).toBe(true);
  fireEvent.click(save);
  expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  await act(async () => { rejectWrite(new Error('offline')); });
  expect(save.hasAttribute('disabled')).toBe(false);
  expect(onShowToast).toHaveBeenCalledWith('Could not update saved people. Please try again.', 'error');
});
