import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessagesTab } from '../components/messages/MessagesTab';

const mocks = vi.hoisted(() => ({
  user: { id: 'A' } as { id: string } | null,
  peers: [{ id: 'B', name: 'Peer B', interests: [] }, { id: 'C', name: 'Peer C', interests: [] }],
  conversationId: 'A_B',
  rows: [] as Record<string, unknown>[],
  update: vi.fn(), set: vi.fn(), get: vi.fn(), subscribe: vi.fn(), toast: vi.fn(),
  conversationIdFor: vi.fn(),
}));
vi.mock('../context/AppContext', () => ({ useAppContext: () => ({
  currentUser: mocks.user, getConversationId: mocks.conversationIdFor, bookings: [],
}) }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ showToast: mocks.toast }) }));
vi.mock('../hooks/useFirestoreData', () => ({ useCompanions: () => ({ companions: mocks.peers }) }));
vi.mock('../services/messaging', () => ({ messagingService: {
  sendMessage: vi.fn(),
  resolveConversationForPeer: async () => ({ id: mocks.conversationId, participantIds: [mocks.user?.id, 'B'], exists: false }),
} }));
vi.mock('../services/firestore', () => ({ firestore: {
  subscribe: mocks.subscribe, updateDocument: mocks.update, setDocument: mocks.set, getDocument: mocks.get,
} }));
vi.mock('../components/ui/SafeImage', () => ({ SafeImage: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'A' };
  mocks.rows = [];
  mocks.conversationId = 'A_B';
  mocks.conversationIdFor.mockImplementation(() => mocks.conversationId);
  mocks.update.mockReset().mockResolvedValue('updated');
  mocks.subscribe.mockImplementation((name: string, _options: unknown, receive: (rows: unknown[]) => void) => {
    receive(name === 'conversations' ? mocks.rows : []);
    return vi.fn();
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe('actual MessagesTab unread-reset writer', () => {
  it.each([
    ['canonical', 'A_B', 'A', ['A', 'B']],
    ['opaque', 'historical-opaque', 'A', ['A', 'B']],
    ['underscore UID', 'A_B_C', 'A_B', ['A_B', 'C']],
    ['historical member order', 'A_B', 'A', ['B', 'A']],
  ])('updates only unread fields for %s', async (_label, id, uid, members) => {
    mocks.user = { id: uid as string };
    const stored = Object.freeze({
      id, participantIds: Object.freeze(members), unreadCount: 3, createdAt: '2020-01-01T00:00:00.000Z',
    });
    mocks.rows = [stored];
    render(<MessagesTab />);
    fireEvent.click(await screen.findByText('Tap to chat'));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const [path, payload] = mocks.update.mock.calls[0];
    expect(path).toBe(`conversations/${id}`);
    expect(Object.keys(payload).sort()).toEqual(['unreadCount', 'updatedAt']);
    expect(payload.unreadCount).toBe(0);
    expect(new Date(payload.updatedAt).toISOString()).toBe(payload.updatedAt);
    expect(mocks.set).not.toHaveBeenCalled();
    expect(stored.unreadCount).toBe(3);
    expect(stored.participantIds).toEqual(members);
    expect(stored.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('skips an already-read conversation', async () => {
    mocks.rows = [{ id: 'A_B', participantIds: ['A', 'B'], unreadCount: 0 }];
    render(<MessagesTab />);
    fireEvent.click(await screen.findByText('Tap to chat'));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('does not create a missing parent for a virtual deep-linked conversation', async () => {
    render(<MessagesTab initialCompanionId="B" />);
    await screen.findByText('Start your conversation');
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });

  it.each(['not-found', 'permission-denied'])('handles %s without a merge/create fallback', async code => {
    const error = Object.assign(new Error(code), { code });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      mocks.rows = [{ id: 'A_B', participantIds: ['A', 'B'], unreadCount: 1 }];
      mocks.update.mockRejectedValueOnce(error);
      render(<MessagesTab />);
      fireEvent.click(await screen.findByText('Tap to chat'));
      await waitFor(() => expect(log).toHaveBeenCalledWith(
        '[SATHI Messages] Error marking conversation as read:', error));
      expect(mocks.update).toHaveBeenCalledTimes(1);
      expect(mocks.set).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });

  it('does not write while signed out', async () => {
    mocks.user = null;
    await act(async () => { render(<MessagesTab />); });
    expect(screen.getByText('Log in to view messages.')).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
