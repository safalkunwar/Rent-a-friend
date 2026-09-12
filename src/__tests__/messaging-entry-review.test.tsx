// Real component and service; mocked Firestore transport. Not live acceptance.
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MessagesTab } from '../components/messages/MessagesTab';
import { messagingService } from '../services/messaging';

const state = vi.hoisted(() => ({
  user: { id: 'A' }, peers: [{ id: 'B', name: 'Peer B', interests: [] }],
  rows: [] as any[], documents: new Map<string, any>(),
  subscribe: vi.fn(), get: vi.fn(), set: vi.fn(), update: vi.fn(),
  transactionGet: vi.fn(), transactionSet: vi.fn(), transactionUpdate: vi.fn(), pages: vi.fn(), profile: vi.fn(), toast: vi.fn(),
  authUser: { uid: 'A', isAnonymous: false },
  bookings: [] as any[], messages: [] as any[],
  conversationIdFor: () => 'A_B',
}));
vi.mock('../context/AppContext', () => ({ useAppContext: () => ({
  currentUser: state.user, getConversationId: state.conversationIdFor, bookings: state.bookings,
}) }));
vi.mock('../components/ui/Toast', () => ({ useToast: () => ({ showToast: state.toast }) }));
vi.mock('../hooks/useFirestoreData', () => ({ useCompanions: () => ({ companions: state.peers }) }));
vi.mock('../components/ui/SafeImage', () => ({ SafeImage: () => null }));
vi.mock('../firebase', () => ({ db: {}, auth: { get currentUser() { return state.authUser; } } }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  getDocFromServer: state.profile,
  runTransaction: async (_db: unknown, callback: any) => callback({ get: state.transactionGet, set: state.transactionSet, update: state.transactionUpdate }),
}));
vi.mock('../services/firestore', () => ({ firestore: {
  subscribe: state.subscribe, getDocument: state.get, getDocumentsPaginated: state.pages,
  updateDocument: state.update, setDocument: state.set,
} }));

beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: 'A' };
  state.authUser = { uid: 'A', isAnonymous: false };
  state.bookings = []; state.messages = [];
  state.pages.mockReset().mockImplementation(async () => ({
    items: [...state.documents.entries()].filter(([path]) => path.startsWith('conversations/'))
      .map(([path, row]) => ({ ...row, id: path.slice('conversations/'.length) })), hasMore: false,
  }));
  state.profile.mockReset().mockResolvedValue({ exists: () => false });
  state.rows = [{ id: 'legacy-thread', participantIds: ['A', 'B'], unreadCount: 0,
    createdAt: '2020-01-01T00:00:00.000Z', lastMessage: { text: 'Existing thread' } }];
  state.documents = new Map([['conversations/legacy-thread', structuredClone(state.rows[0])]]);
  state.get.mockResolvedValue(null);
  state.update.mockResolvedValue(undefined);
  state.subscribe.mockImplementation((name: string, _options: unknown, receive: (rows: any[]) => void) => {
    receive(name === 'conversations' ? state.rows : state.messages);
    return vi.fn();
  });
  state.transactionGet.mockImplementation(async (ref: { path: string }) => ({
    exists: () => state.documents.has(ref.path), data: () => state.documents.get(ref.path),
  }));
  state.transactionSet.mockImplementation((ref: { path: string }, data: any) => state.documents.set(ref.path, data));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

it('companion entry selects the existing opaque thread without creating a virtual duplicate', async () => {
  render(<MessagesTab initialCompanionId="B" />);
  expect(screen.getByText('Existing thread')).toBeTruthy();
  await waitFor(() => expect(state.subscribe).toHaveBeenCalledWith('messages', expect.objectContaining({
    where: [{ field: 'conversationId', operator: '==', value: 'legacy-thread' }],
  }), expect.any(Function)));
  expect(screen.queryByText('Start your conversation')).toBeNull();
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('actual createConversation preserves an existing opaque parent and does not mutate input', async () => {
  const before = structuredClone(state.documents.get('conversations/legacy-thread'));
  const members = ['B', 'A'];
  const id = await messagingService.createConversation(members);
  expect(members).toEqual(['B', 'A']);
  expect(id).toBe('legacy-thread');
  expect(state.transactionGet).toHaveBeenCalledWith({ path: 'conversations/legacy-thread' });
  expect(state.documents.size).toBe(1);
  expect(state.documents.get('conversations/legacy-thread')).toEqual(before);
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('CONTROL: existing canonical thread is preserved by the actual creation transaction', async () => {
  const canonical = { id: 'A_B', participantIds: ['A', 'B'], unreadCount: 7, createdAt: '2020-01-01T00:00:00.000Z' };
  state.documents.clear();
  state.documents.set('conversations/A_B', canonical);
  expect(await messagingService.createConversation(['A', 'B'])).toBe('A_B');
  expect(state.transactionSet).not.toHaveBeenCalled();
  expect(state.documents.get('conversations/A_B')).toBe(canonical);
});

it('rejects duplicate member pairs rather than choosing or creating a third thread', async () => {
  state.documents.set('conversations/A_B', { participantIds: ['B', 'A'] });
  await expect(messagingService.createConversation(['A', 'B'])).rejects.toThrow('Multiple conversations');
  expect(state.transactionGet).not.toHaveBeenCalled();
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('finds a matching thread on a later bounded server page', async () => {
  state.pages.mockResolvedValueOnce({ items: [{ id: 'first', participantIds: ['A', 'C'] }], hasMore: true, lastVisible: ['first'] });
  expect(await messagingService.createConversation(['A', 'B'])).toBe('legacy-thread');
  expect(state.pages).toHaveBeenNthCalledWith(2, 'conversations', {
    where: [{ field: 'participantIds', operator: 'array-contains', value: 'A' }],
    orderById: true, limitCount: 100, startAfter: ['first'],
  });
});

it('does not treat a failed page as absence, even after finding a match', async () => {
  state.pages.mockResolvedValueOnce({ items: state.rows, hasMore: true, lastVisible: ['legacy-thread'] })
    .mockResolvedValueOnce({ items: [], hasMore: false, failed: true });
  await expect(messagingService.createConversation(['A', 'B'])).rejects.toThrow('Could not verify');
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('fails closed at the five-page safety cap', async () => {
  state.pages.mockImplementation(async () => {
    const id = `page-${state.pages.mock.calls.length}`;
    return { items: [{ id, participantIds: ['A', 'C'] }], hasMore: true, lastVisible: [id] };
  });
  await expect(messagingService.createConversation(['A', 'B'])).rejects.toThrow('safety limit');
  expect(state.pages).toHaveBeenCalledTimes(5);
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it.each([['A', 'A'], ['B', 'C'], ['A', ''], ['A', 'bad/path'], ['A'], ['A', 'B', 'C']])(
  'rejects invalid membership %j', async (...members) => {
    await expect(messagingService.createConversation(members)).rejects.toThrow('requires');
    expect(state.pages).not.toHaveBeenCalled();
  });

it('aborts creation if auth changes during lookup', async () => {
  state.pages.mockImplementation(async () => {
    state.authUser = { uid: 'B', isAnonymous: false };
    return { items: [], hasMore: false };
  });
  await expect(messagingService.createConversation(['A', 'B'], 'A')).rejects.toThrow('authenticated UID');
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('rejects canonical document ID collision with a different member pair', async () => {
  state.documents.clear();
  state.documents.set('conversations/A_B', { participantIds: ['A', 'C'] });
  await expect(messagingService.createConversation(['A', 'B'])).rejects.toThrow('already in use');
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('does not recreate an existing parent removed after lookup', async () => {
  state.transactionGet.mockResolvedValueOnce({ exists: () => false });
  await expect(messagingService.createConversation(['A', 'B'])).rejects.toThrow('removed');
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('normalizes a public companion document ID to its owner UID', async () => {
  state.profile.mockResolvedValue({ exists: () => true, data: () => ({ userId: 'B' }) });
  expect((await messagingService.resolveConversationForPeer('companion-profile')).id).toBe('legacy-thread');
  expect(state.profile).toHaveBeenCalledWith({ path: 'companions/companion-profile' });
});

it('does not invent an owner for malformed companion data', async () => {
  state.profile.mockResolvedValue({ exists: () => true, data: () => ({}) });
  await expect(messagingService.resolveConversationForPeer('companion-profile')).rejects.toThrow('requires');
  expect(state.pages).not.toHaveBeenCalled();
});

it('surfaces lookup failure without a virtual conversation or writes', async () => {
  state.pages.mockResolvedValue({ items: [], hasMore: false, failed: true });
  render(<MessagesTab initialCompanionId="B" />);
  await waitFor(() => expect(state.toast).toHaveBeenCalledWith(expect.stringContaining('Could not verify'), 'error'));
  expect(screen.queryByText('Start your conversation')).toBeNull();
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('does not overwrite manual inbox selection when entry lookup completes late', async () => {
  let finish!: (value: any) => void;
  state.pages.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  state.rows.push({ id: 'other-thread', participantIds: ['A', 'C'], lastMessage: { text: 'Other thread' } });
  render(<MessagesTab initialCompanionId="B" />);
  await waitFor(() => expect(state.pages).toHaveBeenCalled());
  fireEvent.click(screen.getByText('Other thread'));
  await act(async () => { finish({ items: [state.rows[0]], hasMore: false }); });
  expect(state.subscribe).toHaveBeenLastCalledWith('messages', expect.objectContaining({
    where: [{ field: 'conversationId', operator: '==', value: 'other-thread' }],
  }), expect.any(Function));
});

it('creates a genuinely new parent before sending the first virtual message', async () => {
  state.documents.clear(); state.rows = [];
  render(<MessagesTab initialCompanionId="B" />);
  await screen.findByText('Start your conversation');
  expect(state.transactionSet).not.toHaveBeenCalled();
  fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Hello' } });
  fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter' });
  await waitFor(() => expect(state.transactionUpdate).toHaveBeenCalled());
  expect(state.transactionSet.mock.calls[0][0].path).toBe('conversations/A_B');
  expect(state.transactionSet.mock.calls[1][1]).toMatchObject({ conversationId: 'A_B', senderId: 'A', text: 'Hello' });
  expect(state.pages).toHaveBeenCalledTimes(2);
});

it('uses actual document ID even when the stored id field is stale', async () => {
  state.documents.get('conversations/legacy-thread').id = 'wrong-stored-id';
  expect((await messagingService.resolveConversation(['A', 'B'])).id).toBe('legacy-thread');
});

it('preserves reversed legacy IDs and member order in storage', async () => {
  state.documents = new Map([['conversations/B_A', { id: 'B_A', participantIds: ['B', 'A'], unreadCount: 4 }]]);
  expect(await messagingService.createConversation(['A', 'B'])).toBe('B_A');
  expect(state.documents.get('conversations/B_A').participantIds).toEqual(['B', 'A']);
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('rejects a page without a usable continuation cursor', async () => {
  state.pages.mockResolvedValue({ items: state.rows, hasMore: true });
  await expect(messagingService.createConversation(['A', 'B'])).rejects.toThrow('continue safely');
  expect(state.transactionSet).not.toHaveBeenCalled();
});

it('rejects a failed companion read rather than guessing a UID', async () => {
  state.profile.mockRejectedValue(new Error('offline'));
  await expect(messagingService.resolveConversationForPeer('companion-profile')).rejects.toThrow('offline');
  expect(state.pages).not.toHaveBeenCalled();
});

it('cancels a stale entry result after changing peer', async () => {
  let finish!: (value: any) => void;
  state.pages.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<MessagesTab initialCompanionId="B" />);
  await waitFor(() => expect(state.pages).toHaveBeenCalledTimes(1));
  view.rerender(<MessagesTab initialCompanionId="C" />);
  await screen.findByText('Start your conversation');
  await act(async () => { finish({ items: state.rows, hasMore: false }); });
  expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
  expect(state.subscribe.mock.calls.filter(call => call[0] === 'messages')).toHaveLength(0);
  expect(screen.getByText('Start your conversation')).toBeTruthy();
});

it('cancels an entry result on account switch without selecting an old thread', async () => {
  let finish!: (value: any) => void;
  state.pages.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<MessagesTab initialCompanionId="B" />);
  await waitFor(() => expect(state.pages).toHaveBeenCalledTimes(1));
  state.user = { id: 'C' }; state.authUser = { uid: 'C', isAnonymous: false }; state.rows = [];
  view.rerender(<MessagesTab />);
  await act(async () => { finish({ items: [], hasMore: false }); });
  expect(screen.queryByText('Start your conversation')).toBeNull();
  expect(state.subscribe.mock.calls.filter(call => call[0] === 'messages')).toHaveLength(0);
});

it('rechecks before first send and reuses a thread that appeared after entry lookup', async () => {
  state.documents.clear(); state.rows = [];
  render(<MessagesTab initialCompanionId="B" />);
  await screen.findByText('Start your conversation');
  state.documents.set('conversations/arrived-later', { participantIds: ['A', 'B'] });
  fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Hello' } });
  fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter' });
  await waitFor(() => expect(state.transactionUpdate).toHaveBeenCalled());
  expect(state.transactionSet).toHaveBeenCalledTimes(1);
  expect(state.transactionSet.mock.calls[0][1]).toMatchObject({ conversationId: 'arrived-later', text: 'Hello' });
  expect(state.documents.has('conversations/A_B')).toBe(false);
});

it('does not send if parent resolution fails on first send and retains the draft', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    state.documents.clear(); state.rows = [];
    render(<MessagesTab initialCompanionId="B" />);
    await screen.findByText('Start your conversation');
    state.pages.mockResolvedValue({ items: [], hasMore: false, failed: true });
    fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Keep this draft' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter' });
    await waitFor(() => expect(state.toast).toHaveBeenCalledWith(expect.stringContaining('Failed to send'), 'error'));
    expect(state.transactionSet).not.toHaveBeenCalled();
    expect((screen.getByPlaceholderText('Type a message...') as HTMLInputElement).value).toBe('Keep this draft');
  } finally { log.mockRestore(); }
});

it('uses membership and companionUid, not opaque ID splitting, for existing booking chat', async () => {
  state.bookings = [{ userId: 'A', companionId: 'companion-profile', companionUid: 'B', status: 'pending' }];
  state.messages = [0, 1].map(i => ({ id: `old-${i}`, senderId: 'A', text: `Prior ${i}`, timestamp: new Date().toISOString() }));
  render(<MessagesTab />);
  fireEvent.click(screen.getByText('Existing thread'));
  fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Third message' } });
  fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter' });
  await waitFor(() => expect(state.transactionUpdate).toHaveBeenCalled());
  expect(state.transactionSet.mock.calls[0][1]).toMatchObject({ conversationId: 'legacy-thread', text: 'Third message' });
  expect(state.toast).not.toHaveBeenCalled();
});

it('preserves the two-message pre-booking UI restriction for an opaque thread', async () => {
  state.messages = [0, 1].map(i => ({ id: `old-${i}`, senderId: 'A', text: `Prior ${i}`, timestamp: new Date().toISOString() }));
  render(<MessagesTab />);
  fireEvent.click(screen.getByText('Existing thread'));
  fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: 'Third message' } });
  fireEvent.keyDown(screen.getByPlaceholderText('Type a message...'), { key: 'Enter' });
  expect(state.toast).toHaveBeenCalledWith(expect.stringContaining('limited to 2'), 'info');
  expect(state.transactionSet).not.toHaveBeenCalled();
});
