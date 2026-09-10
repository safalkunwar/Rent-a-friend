// Scoped Candidate Security Tests for Phase 0 P0 Messaging & Favorites Containment.
// Proves that stranger takeover, conversation deletion, message snooping,
// and cross-user favorites writes are DENIED, while legitimate flows remain ALLOWED.
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, deleteDoc, writeBatch, setLogLevel, collection, query, where, getDocs, runTransaction, orderBy, limit, documentId } from 'firebase/firestore';
import { patchMessagingFavoritesRules } from '../ops/containment/messaging-favorites-patch.mjs';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085') {
  throw new Error('Loopback Firestore emulator required; no live fallback. Expected FIRESTORE_EMULATOR_HOST=127.0.0.1:8085');
}

const baselinePath = 'docs/sathi/rollbacks/phase-00-2026-09-10/firestore.rules';
const candidatePath = 'ops/containment/candidate.firestore.rules';
const expectedBaselineHash = '5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013';

let env;
let baselineRules;
let candidateRules;

const db = (uid, claims = {}) =>
  env.authenticatedContext(uid, { admin: false, role: 'customer', adminRole: 'none', ...claims }).firestore();

const adminDb = () =>
  env.authenticatedContext('admin-user', { admin: true, role: 'admin', adminRole: 'super_admin' }).firestore();

const guestDb = () =>
  env.unauthenticatedContext().firestore();

before(async () => {
  baselineRules = await readFile(baselinePath, 'utf8');
  assert.equal(
    createHash('sha256').update(baselineRules).digest('hex'),
    expectedBaselineHash,
    'Baseline firestore.rules must match captured production hash'
  );

  candidateRules = patchMessagingFavoritesRules(baselineRules);
  const diskCandidate = await readFile(candidatePath, 'utf8');
  assert.equal(
    createHash('sha256').update(candidateRules).digest('hex'),
    createHash('sha256').update(diskCandidate).digest('hex'),
    'candidate.firestore.rules on disk must match patched baseline output'
  );

  setLogLevel('silent');
  env = await initializeTestEnvironment({
    projectId: 'demo-sathi-containment-review',
    firestore: { host: '127.0.0.1', port: 8085, rules: diskCandidate },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const firestore = ctx.firestore();
    const seedData = {
      'users/A': { name: 'User A', role: 'customer' },
      'users/B': { name: 'User B', role: 'customer' },
      'users/C': { name: 'Stranger C', role: 'customer' },
      'users/A_B': { name: 'User A_B', role: 'customer' },
      'conversations/A_B': {
        id: 'A_B',
        participantIds: ['A', 'B'],
        unreadCount: 0,
        createdAt: '2026-09-10T00:00:00.000Z',
        updatedAt: '2026-09-10T00:00:00.000Z',
      },
      'messages/m': {
        id: 'm',
        conversationId: 'A_B',
        senderId: 'A',
        text: 'Synthetic private message between A and B',
        isRead: false,
        timestamp: '2026-09-10T00:00:00.000Z',
      },
      'users/A/favorites/existing': {
        companionId: 'comp-1',
        createdAt: '2026-09-10T00:00:00.000Z',
      },
    };
    for (const [path, data] of Object.entries(seedData)) {
      await setDoc(doc(firestore, path), data);
    }
  });
});

// --- SCOPE ITEM 9: UNRELATED BYTE PARITY ---

test('PARITY: only nested favorites and messaging domain change; unrelated bytes identical', () => {
  const strip = (source) => {
    let s = source.replace(/\r\n/g, '\n');
    // Strip favorites subcollection block
    const favStart = s.indexOf('      // Subcollection for user favorites');
    const favEnd = s.indexOf('\n      }', favStart) + '\n      }'.length;
    assert.ok(favStart > 0 && favEnd > favStart);
    s = s.slice(0, favStart) + s.slice(favEnd);

    // Strip conversations match block
    const convStart = s.indexOf('    // Conversations Collection: /conversations/{conversationId}');
    const convEnd = s.indexOf('    // Notifications Collection:', convStart);
    assert.ok(convStart > 0 && convEnd > convStart);
    s = s.slice(0, convStart) + s.slice(convEnd);

    return s;
  };

  assert.equal(strip(candidateRules), strip(baselineRules));
});

// --- SCOPE ITEM 7: SECURITY PROTECTIONS (DENIED CASES) ---

test('CONTAINMENT: stranger C cannot replace conversation participants (takeover blocked)', async () => {
  await assertFails(updateDoc(doc(db('C'), 'conversations/A_B'), { participantIds: ['C'] }));
  await assertFails(updateDoc(doc(db('C'), 'conversations/A_B'), { participantIds: ['A', 'C'] }));
  await assertFails(updateDoc(doc(db('C'), 'conversations/A_B'), { participantIds: ['A', 'B', 'C'] }));
});

test('CONTAINMENT: participant A cannot replace participants to exclude B or add C', async () => {
  await assertFails(updateDoc(doc(db('A'), 'conversations/A_B'), { participantIds: ['A'] }));
  await assertFails(updateDoc(doc(db('A'), 'conversations/A_B'), { participantIds: ['A', 'C'] }));
});

test('CONTAINMENT: stranger C cannot read private messages of conversation A_B', async () => {
  await assertFails(getDoc(doc(db('C'), 'messages/m')));
});

test('CONTAINMENT: stranger C cannot delete conversation A_B', async () => {
  await assertFails(deleteDoc(doc(db('C'), 'conversations/A_B')));
});

test('CONTAINMENT: participant A cannot delete conversation A_B (admin only)', async () => {
  await assertFails(deleteDoc(doc(db('A'), 'conversations/A_B')));
});

test('CONTAINMENT: stranger C cannot create conversation hijacking ID A_B', async () => {
  // Genuinely absent target: setDoc below exercises CREATE, not UPDATE.
  await env.withSecurityRulesDisabled(ctx => deleteDoc(doc(ctx.firestore(), 'conversations/A_B')));
  await assertFails(
    setDoc(doc(db('C'), 'conversations/A_B'), {
      id: 'A_B',
      participantIds: ['A', 'B'],
      unreadCount: 0,
      createdAt: '2026-09-10T00:00:00.000Z',
      updatedAt: '2026-09-10T00:00:00.000Z',
    })
  );
  await assertFails(
    setDoc(doc(db('C'), 'conversations/A_B'), {
      id: 'A_B',
      participantIds: ['C'],
      unreadCount: 0,
      createdAt: '2026-09-10T00:00:00.000Z',
      updatedAt: '2026-09-10T00:00:00.000Z',
    })
  );
});

test('CONTAINMENT: stranger C cannot send message into conversation A_B', async () => {
  await assertFails(
    setDoc(doc(db('C'), 'messages/msg-c'), {
      id: 'msg-c',
      conversationId: 'A_B',
      senderId: 'C',
      text: 'Injected message',
      isRead: false,
      timestamp: '2026-09-10T00:00:00.000Z',
    })
  );
});

test('CONTAINMENT: stranger C cannot write or delete A favorites', async () => {
  await assertFails(setDoc(doc(db('C'), 'users/A/favorites/arbitrary'), { companionId: 'C' }));
  await assertFails(deleteDoc(doc(db('C'), 'users/A/favorites/existing')));
});

test('CONTAINMENT: stranger C cannot read A favorites', async () => {
  await assertFails(getDoc(doc(db('C'), 'users/A/favorites/existing')));
});

test('CONTAINMENT: stranger C cannot write or read typing indicator in conversation A_B', async () => {
  await assertFails(setDoc(doc(db('C'), 'conversations/A_B/typing/C'), { isTyping: true }));
  await assertFails(setDoc(doc(db('C'), 'conversations/A_B/typing/A'), { isTyping: true }));
  await assertFails(getDoc(doc(db('C'), 'conversations/A_B/typing/A')));
});

test('CONTAINMENT: unauthenticated guest cannot read or write conversations, messages, or favorites', async () => {
  const guest = guestDb();
  await assertFails(getDoc(doc(guest, 'conversations/A_B')));
  await assertFails(getDoc(doc(guest, 'messages/m')));
  await assertFails(getDoc(doc(guest, 'users/A/favorites/existing')));
  await assertFails(setDoc(doc(guest, 'users/A/favorites/x'), { companionId: 'x' }));
  await assertFails(deleteDoc(doc(guest, 'conversations/A_B')));
});

// --- SCOPE ITEM 6: LEGITIMATE FLOWS (ALLOWED CASES) ---

test('COMPATIBILITY: legitimate conversation creation by participant succeeds', async () => {
  await assertSucceeds(
    setDoc(doc(db('A'), 'conversations/A_C'), {
      id: 'A_C',
      participantIds: ['A', 'C'],
      unreadCount: 0,
      createdAt: '2026-09-10T01:00:00.000Z',
      updatedAt: '2026-09-10T01:00:00.000Z',
    })
  );
  const snap = await getDoc(doc(db('C'), 'conversations/A_C'));
  assert.equal(snap.exists(), true);
});

test('COMPATIBILITY: messaging flow commits message and updates lastMessage on conversation', async () => {
  const store = db('A');
  const batch = writeBatch(store);
  const msgRef = doc(store, 'messages/msg-new');
  const convoRef = doc(store, 'conversations/A_B');
  const now = '2026-09-10T02:00:00.000Z';

  batch.set(msgRef, {
    id: 'msg-new',
    conversationId: 'A_B',
    senderId: 'A',
    text: 'Hello B!',
    isRead: false,
    timestamp: now,
  });
  batch.update(convoRef, {
    lastMessage: {
      id: 'msg-new',
      conversationId: 'A_B',
      senderId: 'A',
      text: 'Hello B!',
      isRead: false,
      timestamp: now,
    },
    updatedAt: now,
  });

  await assertSucceeds(batch.commit());

  // Both participants can read the new message
  const msgSnapA = await assertSucceeds(getDoc(doc(db('A'), 'messages/msg-new')));
  assert.equal(msgSnapA.data().text, 'Hello B!');
  const msgSnapB = await assertSucceeds(getDoc(doc(db('B'), 'messages/msg-new')));
  assert.equal(msgSnapB.data().text, 'Hello B!');
});

test('COMPATIBILITY: recipient B updates read receipt and resets conversation unreadCount', async () => {
  const store = db('B');
  await assertSucceeds(updateDoc(doc(store, 'messages/m'), { isRead: true }));
  await assertSucceeds(updateDoc(doc(store, 'conversations/A_B'), { unreadCount: 0 }));

  const msgSnap = await getDoc(doc(store, 'messages/m'));
  assert.equal(msgSnap.data().isRead, true);
});

test('UNREAD_RESET_FIX: historical participant order is preserved and unread reset is safe', async () => {
  await seed('conversations/B_A', pair('B_A', ['B', 'A']));
  const ref = doc(db('A'), 'conversations/B_A');
  await assertFails(updateDoc(ref, { id: 'B_A', participantIds: ['A', 'B'], unreadCount: 0 }));
  await assertSucceeds(updateDoc(ref, { unreadCount: 0, updatedAt: now }));
  const snap = await getDoc(ref);
  assert.deepEqual(snap.data().participantIds, ['B', 'A']);
});

test('UNREAD_RESET_FIX: missing legacy membership allows unread reset but not member mutation', async () => {
  await seed('conversations/A_C', { id: 'A_C', unreadCount: 1, createdAt: now });
  const ref = doc(db('A'), 'conversations/A_C');
  await assertSucceeds(updateDoc(ref, { unreadCount: 0, updatedAt: now }));
  await assertFails(updateDoc(ref, { id: 'A_C', participantIds: ['A', 'C'] }));
});

test('UNREAD_RESET_FIX: missing parent is not accidentally created by unread reset', async () => {
  const missingRef = doc(db('A'), 'conversations/never-created');
  const snap = await getDoc(missingRef);
  assert.equal(snap.exists(), false);
  await assertFails(updateDoc(missingRef, { unreadCount: 0 }));
  const after = await getDoc(missingRef);
  assert.equal(after.exists(), false);
});

test('UNREAD_RESET_FIX: stranger update denied even for unreadCount-only payload', async () => {
  await assertFails(updateDoc(doc(db('C'), 'conversations/A_B'), { unreadCount: 0, updatedAt: now }));
});

test('UNREAD_RESET_FIX: stored membership, id and createdAt remain unchanged after unread reset', async () => {
  const ref = doc(db('A'), 'conversations/A_B');
  await assertSucceeds(updateDoc(ref, { unreadCount: 0, updatedAt: '2026-09-10T06:00:00.000Z' }));
  const snap = await getDoc(ref);
  assert.equal(snap.data().id, 'A_B');
  assert.deepEqual(snap.data().participantIds, ['A', 'B']);
  assert.equal(snap.data().createdAt, '2026-09-10T00:00:00.000Z');
});

test('COMPATIBILITY: typing lifecycle works for legitimate participant', async () => {
  const store = db('A');
  const typingRef = doc(store, 'conversations/A_B/typing/A');

  // Participant A sets typing
  await assertSucceeds(setDoc(typingRef, { userId: 'A', isTyping: true, updatedAt: '2026-09-10T03:00:00.000Z' }));

  // Participant B reads typing
  const snapB = await assertSucceeds(getDoc(doc(db('B'), 'conversations/A_B/typing/A')));
  assert.equal(snapB.data().isTyping, true);

  // Participant A deletes typing
  await assertSucceeds(deleteDoc(typingRef));
});

test('COMPATIBILITY: owner manages favorites and admin has support permissions', async () => {
  const storeA = db('A');
  const favRef = doc(storeA, 'users/A/favorites/comp-new');

  // Owner A creates favorite
  await assertSucceeds(setDoc(favRef, { companionId: 'comp-new', createdAt: '2026-09-10T04:00:00.000Z' }));

  // Owner A reads favorite
  const snapA = await assertSucceeds(getDoc(favRef));
  assert.equal(snapA.data().companionId, 'comp-new');

  // Owner A updates favorite (idempotent set / note)
  await assertSucceeds(updateDoc(favRef, { note: 'Great companion' }));

  // Admin reads favorite
  const adminStore = adminDb();
  await assertSucceeds(getDoc(doc(adminStore, 'users/A/favorites/comp-new')));

  // Owner A deletes favorite
  await assertSucceeds(deleteDoc(favRef));

  // Admin can delete favorite for moderation/support cleanup
  await assertSucceeds(deleteDoc(doc(adminStore, 'users/A/favorites/existing')));
});

const now = '2026-09-10T05:00:00.000Z';
const pair = (id, participantIds) => ({ id, participantIds, unreadCount: 0, createdAt: now, updatedAt: now });
const message = (id, conversationId, senderId) => ({ id, conversationId, senderId, text: 'Synthetic test', isRead: false, timestamp: now });
const seed = (path, data) => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), path), data));

test('ARTIFACT: manifest identifies exact tested rules and frozen separate draft', async () => {
  const manifest = JSON.parse(await readFile('ops/containment/messaging-favorites.manifest.json', 'utf8'));
  assert.equal(manifest.scope, 'messaging-favorites-only');
  assert.equal(manifest.candidateHash, createHash('sha256').update(candidateRules).digest('hex'));
  assert.equal(manifest.baselineHash, expectedBaselineHash);
  assert.equal(createHash('sha256').update(await readFile(manifest.preservedDraftPath)).digest('hex'), manifest.preservedDraftHash);
  assert.equal(candidateRules.includes('function isFinanceAdmin()'), false);
});

test('ARTIFACT: generator refuses drift or a previously patched baseline', () => {
  assert.throws(() => patchMessagingFavoritesRules(baselineRules + '\n'), /hash mismatch/);
  assert.throws(() => patchMessagingFavoritesRules(candidateRules), /hash mismatch/);
});

for (const [label, members] of [
  ['map', { A: true, C: true }], ['string', 'A_C'], ['empty', []],
  ['duplicate', ['A', 'A']], ['single', ['A']], ['extra', ['A', 'B', 'C']],
  ['blank', ['A', '']], ['non-string', ['A', 3]], ['null', null],
]) {
  test(`CREATE: absent target rejects ${label} participantIds`, async () => {
    await assertFails(setDoc(doc(db('A'), 'conversations/A_C'), pair('A_C', members)));
  });
}

test('CREATE: rejects missing membership, mismatched id and unbound opaque path', async () => {
  const missing = pair('A_C', ['A', 'C']);
  delete missing.participantIds;
  await assertFails(setDoc(doc(db('A'), 'conversations/A_C'), missing));
  await assertFails(setDoc(doc(db('A'), 'conversations/A_C'), pair('wrong', ['A', 'C'])));
  await assertFails(setDoc(doc(db('A'), 'conversations/opaque-new'), pair('opaque-new', ['A', 'C'])));
  await assertFails(setDoc(doc(guestDb(), 'conversations/A_C'), pair('A_C', ['A', 'C'])));
});

test('COMPATIBILITY: actual create-if-absent transaction and canonical merge payload', async () => {
  const store = db('A');
  const ref = doc(store, 'conversations/A_C');
  const create = () => runTransaction(store, async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) tx.set(ref, pair('A_C', ['A', 'C']));
  });
  await assertSucceeds(create());
  await assertSucceeds(create());
  await assertSucceeds(setDoc(doc(db('C'), 'conversations/A_C'), {
    id: 'A_C', participantIds: ['A', 'C'], unreadCount: 0, updatedAt: now,
  }, { merge: true }));
  assert.equal((await getDoc(ref)).data().createdAt, now);
});

test('QUERY: actual inbox/history/read-receipt query shapes succeed; stranger queries denied', async () => {
  const inbox = store => query(collection(store, 'conversations'), where('participantIds', 'array-contains', 'A'));
  assert.equal((await assertSucceeds(getDocs(inbox(db('A'))))).size, 1);
  await assertFails(getDocs(inbox(db('C'))));
  const history = store => query(collection(store, 'messages'), where('conversationId', '==', 'A_B'), orderBy('timestamp', 'asc'));
  assert.equal((await assertSucceeds(getDocs(history(db('B'))))).size, 1);
  await assertFails(getDocs(history(db('C'))));
  await assertFails(getDocs(collection(db('A'), 'conversations')));
  await assertSucceeds(getDocs(query(collection(db('B'), 'messages'),
    where('conversationId', '==', 'A_B'), where('senderId', '!=', 'B'), where('isRead', '==', false), limit(100))));
});

test('QUERY: malformed map cannot bypass list authorization via a document-ID query', async () => {
  await seed('conversations/A_C', pair('A_C', { A: true, C: true }));
  await assertFails(getDocs(query(collection(db('A'), 'conversations'), where(documentId(), '==', 'A_C'))));
});

test('PRIVACY: stored underscore UID membership overrides misleading split ID everywhere', async () => {
  await seed('conversations/A_B_C', pair('A_B_C', ['A_B', 'C']));
  await seed('messages/legacy', message('legacy', 'A_B_C', 'A_B'));
  await seed('conversations/A_B_C/typing/C', { userId: 'C', isTyping: true });
  for (const path of ['conversations/A_B_C', 'messages/legacy', 'conversations/A_B_C/typing/C']) {
    await assertSucceeds(getDoc(doc(db('A_B'), path)));
    await assertSucceeds(getDoc(doc(db('C'), path)));
    await assertFails(getDoc(doc(db('A'), path)));
  }
  await assertFails(updateDoc(doc(db('A'), 'conversations/A_B_C'), { unreadCount: 0 }));
  await assertFails(updateDoc(doc(db('A'), 'messages/legacy'), { isRead: true }));
  await assertFails(setDoc(doc(db('A'), 'messages/injected'), message('injected', 'A_B_C', 'A')));
  await assertFails(setDoc(doc(db('A'), 'conversations/A_B_C/typing/A'), { isTyping: true }));
  await assertSucceeds(updateDoc(doc(db('C'), 'messages/legacy'), { isRead: true }));
});

test('COMPATIBILITY: new delimiter UID pair supports transaction creation and stored-membership reads', async () => {
  const store = db('A_B');
  await assertSucceeds(runTransaction(store, async tx => {
    const ref = doc(store, 'conversations/A_B_C');
    if (!(await tx.get(ref)).exists()) tx.set(ref, pair('A_B_C', ['A_B', 'C']));
  }));
  await assertSucceeds(setDoc(doc(store, 'messages/underscore'), message('underscore', 'A_B_C', 'A_B')));
  await assertFails(getDoc(doc(db('A'), 'messages/underscore')));
});

test('LEGACY: opaque stored membership remains readable and mutable without rewriting members', async () => {
  await seed('conversations/old-opaque', pair('old-opaque', ['A', 'B']));
  await seed('messages/old', message('old', 'old-opaque', 'A'));
  await assertSucceeds(getDoc(doc(db('B'), 'messages/old')));
  await assertSucceeds(updateDoc(doc(db('B'), 'conversations/old-opaque'), { unreadCount: 0, updatedAt: now }));
  await assertSucceeds(setDoc(doc(db('A'), 'conversations/old-opaque/typing/A'), { isTyping: true }));
  await assertFails(getDoc(doc(db('C'), 'conversations/old-opaque')));
  // Existing UI ID-splitting cannot replace genuine legacy membership.
  await assertFails(setDoc(doc(db('A'), 'conversations/old-opaque'), { participantIds: ['A'] }, { merge: true }));
});

test('LEGACY: missing membership has two-part fallback only; ambiguous and malformed fail closed', async () => {
  await seed('conversations/A_C', { id: 'A_C', unreadCount: 1, createdAt: now });
  await seed('messages/fallback', message('fallback', 'A_C', 'A'));
  await assertSucceeds(getDoc(doc(db('C'), 'messages/fallback')));
  await assertSucceeds(updateDoc(doc(db('A'), 'conversations/A_C'), { unreadCount: 0 }));
  await assertFails(getDoc(doc(db('B'), 'messages/fallback')));
  for (const [id, data] of [
    ['A_B_C', { id: 'A_B_C' }], ['opaque', { id: 'opaque' }],
    ['A_C', pair('A_C', { A: true })], ['A_C', pair('A_C', null)],
    ['A_C', pair('A_C', [])],
  ]) {
    await seed(`conversations/${id}`, data);
    await seed('messages/invalid', message('invalid', id, 'A'));
    await assertFails(getDoc(doc(db('A'), `conversations/${id}`)));
    await assertFails(getDoc(doc(db('A'), 'messages/invalid')));
  }
});

test('LEGACY: orphan message/typing access fails closed; missing get reveals no data', async () => {
  await seed('messages/orphan', message('orphan', 'A_C', 'A'));
  const missing = await assertSucceeds(getDoc(doc(db('A'), 'conversations/A_C')));
  assert.equal(missing.exists(), false);
  await assertFails(getDoc(doc(db('A'), 'messages/orphan')));
  await assertFails(setDoc(doc(db('A'), 'messages/new-orphan'), message('new-orphan', 'A_C', 'A')));
  await assertFails(setDoc(doc(db('A'), 'conversations/A_C/typing/A'), { isTyping: true }));
});

test('IMMUTABILITY: participants, id, creation time and message authorship cannot change', async () => {
  for (const patch of [{ participantIds: ['B', 'A'] }, { id: 'other' }, { createdAt: now }, { injected: true }]) {
    await assertFails(updateDoc(doc(db('A'), 'conversations/A_B'), patch));
  }
  await assertFails(updateDoc(doc(db('B'), 'messages/m'), { senderId: 'B' }));
  await assertFails(updateDoc(doc(db('B'), 'messages/m'), { conversationId: 'B_C' }));
  await assertFails(setDoc(doc(db('B'), 'messages/spoof'), message('spoof', 'A_B', 'A')));
  await assertFails(setDoc(doc(db('B'), 'conversations/A_B/typing/A'), { isTyping: true }));
});

test('REGRESSION: actual users.favorites array owner update remains allowed, cross-user denied', async () => {
  await assertSucceeds(updateDoc(doc(db('A'), 'users/A'), { favorites: ['comp-1'] }));
  await assertFails(updateDoc(doc(db('C'), 'users/A'), { favorites: [] }));
});

test('REGRESSION: no new staff typing read privilege is introduced', async () => {
  await seed('conversations/A_B/typing/A', { userId: 'A', isTyping: true });
  await assertFails(getDoc(doc(adminDb(), 'conversations/A_B/typing/A')));
});

test('CONTAINMENT: takeover and delete/recreate attempts never unlock the existing message', async () => {
  const stranger = db('C');
  await assertFails(updateDoc(doc(stranger, 'conversations/A_B'), { participantIds: ['A', 'C'] }));
  await assertFails(deleteDoc(doc(stranger, 'conversations/A_B')));
  await assertFails(setDoc(doc(stranger, 'conversations/A_B'), pair('A_B', ['A', 'C'])));
  await assertFails(getDoc(doc(stranger, 'messages/m')));
  assert.deepEqual((await getDoc(doc(db('A'), 'conversations/A_B'))).data().participantIds, ['A', 'B']);
});
