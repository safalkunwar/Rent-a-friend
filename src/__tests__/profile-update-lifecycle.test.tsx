import React from 'react';
import { renderHook, act, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AppProvider, useAppContext } from '../context/AppContext';
import type { User } from '../types';
const mocks = vi.hoisted(() => ({ update: vi.fn(), uid: 'A' }));
vi.mock('../services/auth', () => ({ authService: { onAuthStateChanged: () => () => {} } }));
vi.mock('../services/firestore', () => ({ firestore: { subscribe: () => () => {} } }));
vi.mock('../repositories/UserRepository', () => ({ userRepository: { updateUserProfile: mocks.update } }));
vi.mock('../services/identity', () => ({ requireUid: (uid?: string) => {
  if (uid && uid !== mocks.uid) throw new Error('Account changed');
  return mocks.uid;
} }));
afterEach(cleanup);
it('does not apply a delayed profile update to a newly signed-in account', async () => {
  const user = (id: string): User => ({ id, name: id, email: '', avatar: '', role: 'customer', favorites: [] });
  let resolve!: () => void;
  mocks.update.mockReturnValue(new Promise<void>(done => { resolve = done; }));
  const { result } = renderHook(useAppContext, { wrapper: ({ children }) => <AppProvider>{children}</AppProvider> });
  act(() => result.current.setCurrentUser(user('A')));
  const pending = result.current.updateUserProfile({ name: 'Old account edit' });
  mocks.uid = 'B';
  act(() => result.current.setCurrentUser(user('B')));
  await act(async () => { resolve(); await pending.catch(() => {}); });
  expect(result.current.currentUser).toMatchObject({ id: 'B', name: 'B' });
});
