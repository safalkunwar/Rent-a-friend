import { db } from '../firebase';
import { firestore } from './firestore';
import { requireUid } from './identity';

export interface ResolvedConversation {
  id: string;
  participantIds: string[];
  exists: boolean;
  [key: string]: unknown;
}

const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && !value.includes('/');

export function validateParticipants(value: unknown, uid: string): string[] {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(validId)
    || value[0] === value[1] || !value.includes(uid)) {
    throw new Error('A conversation requires the authenticated user and one other participant.');
  }
  return [...value].sort();
}

export function conversationPeer(value: unknown, uid: string): string | undefined {
  try { return validateParticipants(value, uid).find(id => id !== uid); }
  catch { return undefined; }
}

export function matchesParticipants(value: unknown, expected: string[]): boolean {
  return Array.isArray(value) && value.length === 2 && new Set(value).size === 2
    && expected.every(id => value.includes(id));
}

/** Server-only, bounded and read-only. A partial inventory is never absence. */
export async function resolveConversation(participantIds: string[]): Promise<ResolvedConversation> {
  const uid = requireUid();
  const members = validateParticipants(participantIds, uid);
  if (!db) throw new Error('Messaging is unavailable: Firebase is not configured.');
  let cursor: unknown[] | undefined;
  let match: ResolvedConversation | undefined;
  const seen = new Set<string>();
  for (let page = 0; page < 5; page++) {
    const result = await firestore.getDocumentsPaginated<{ id: string; participantIds?: unknown }>('conversations', {
      where: [{ field: 'participantIds', operator: 'array-contains', value: uid }],
      orderById: true, limitCount: 100, startAfter: cursor,
    });
    requireUid(uid);
    if (result.failed) throw new Error('Could not verify existing conversations. Please try again online.');
    for (const row of result.items) {
      if (!validId(row.id) || seen.has(row.id)) throw new Error('Conversation lookup returned an invalid page.');
      seen.add(row.id);
      if (matchesParticipants(row.participantIds, members)) {
        if (match) throw new Error('Multiple conversations exist for this pair. Open a specific thread from your inbox.');
        match = { ...row, id: row.id, participantIds: members, exists: true };
      }
    }
    if (!result.hasMore) return match ?? { id: members.join('_'), participantIds: members, exists: false };
    if (!result.lastVisible?.length || result.lastVisible[0] === cursor?.[0]) {
      throw new Error('Conversation lookup could not continue safely.');
    }
    cursor = result.lastVisible;
  }
  throw new Error('Conversation lookup reached its safety limit. Open an existing thread from your inbox.');
}
