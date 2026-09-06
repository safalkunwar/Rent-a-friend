import { before, after, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, deleteDoc, writeBatch, getDocs, collection, query, where, limit, serverTimestamp, Timestamp, orderBy, documentId, startAfter } from 'firebase/firestore';

// Never fall back to the live project. No application Firebase module is imported.
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085') throw new Error('Local Firestore emulator required.');
let env;
const db = (uid, claims = {}) => env.authenticatedContext(uid, claims).firestore();
const root = () => db('admin', { adminRole: 'super_admin' });
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'hamrosathi1', firestore: { host: '127.0.0.1', port: 8085, rules: await readFile('firestore.rules', 'utf8') } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const store = context.firestore();
    await Promise.all([
      setDoc(doc(store, 'users/A'), { name: 'A', role: 'customer' }),
      setDoc(doc(store, 'users/B'), { name: 'B', role: 'customer' }),
      setDoc(doc(store, 'users/C'), { name: 'C', role: 'companion', companionStatus: 'APPROVED' }),
      setDoc(doc(store, 'companions/C'), { userId: 'C', isVerified: true, hourlyRate: 1000 }),
      setDoc(doc(store, 'conversations/A_B'), { participantIds: ['A', 'B'], createdAt: 'now' }),
      setDoc(doc(store, 'messages/m'), { conversationId: 'A_B', senderId: 'B', text: 'private', isRead: false }),
      setDoc(doc(store, 'community_posts/p'), { userId: 'B', status: 'published', likesCount: 0, commentsCount: 0 }),
      setDoc(doc(store, 'companion_applications/appA'), { userId: 'A', status: 'DRAFT', kyc: { verificationStatus: 'UNVERIFIED' } }),
      setDoc(doc(store, 'sosAlerts/alertA'), { userId: 'A', status: 'active' }),
    ]);
  });
});
test('A cannot read or write B private profile', async () => {
  await assertFails(getDoc(doc(db('A'), 'users/B')));
  await assertFails(updateDoc(doc(db('A'), 'users/B'), { name: 'forged' }));
});
test('A can read/update own ordinary profile', async () => {
  await assertSucceeds(getDoc(doc(db('A'), 'users/A')));
  await assertSucceeds(updateDoc(doc(db('A'), 'users/A'), { name: 'Updated A' }));
});
test('A cannot mutate B favorites', async () => { await assertFails(setDoc(doc(db('A'), 'users/B/favorites/C'), { companionId: 'C' })); });
test('outsider cannot take over conversation or read messages', async () => {
  await assertFails(updateDoc(doc(db('C'), 'conversations/A_B'), { participantIds: ['C', 'B'] }));
  await assertFails(getDoc(doc(db('C'), 'messages/m')));
  await assertFails(deleteDoc(doc(db('C'), 'conversations/A_B')));
});
test('participants read messages but cannot alter the other sender text', async () => {
  await assertSucceeds(getDoc(doc(db('A'), 'messages/m')));
  await assertFails(updateDoc(doc(db('A'), 'messages/m'), { text: 'forged' }));
});
test('user cannot self-promote or approve KYC', async () => {
  for (const field of ['role', 'adminRole', 'companionStatus', 'verificationStatus', 'kycVerificationStatus']) {
    await assertFails(updateDoc(doc(db('A'), 'users/A'), { [field]: 'APPROVED' }));
  }
  await assertFails(updateDoc(doc(db('A'), 'companion_applications/appA'), { kyc: { verificationStatus: 'VERIFIED' } }));
  await assertFails(setDoc(doc(db('A'), 'companions/A'), { userId: 'A', isVerified: true, rating: 5 }));
});
test('read-only admin has no write escalation even with legacy admin boolean', async () => {
  const readOnly = db('reader', { adminRole: 'read_only_admin', admin: true });
  await assertFails(updateDoc(doc(readOnly, 'users/B'), { role: 'admin' }));
  await assertFails(setDoc(doc(readOnly, 'admins/reader'), { role: 'super_admin' }));
});
test('root may manage roles, normal user cannot', async () => {
  await assertSucceeds(setDoc(doc(root(), 'admins/operator'), { role: 'booking_admin', uid: 'operator' }));
  await assertFails(setDoc(doc(db('A'), 'admins/A'), { role: 'super_admin' }));
});
test('unauthenticated protected write denied', async () => { await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'users/guest'), { role: 'customer' })); });
test('no client including admin can fabricate a verified payment', async () => {
  for (const store of [db('A'), root()]) await assertFails(setDoc(doc(store, 'payments/forged'), { userId: 'A', status: 'verified', amount: 1 }));
});
test('arbitrary social count and spoofed like identity denied', async () => {
  await assertFails(updateDoc(doc(db('A'), 'community_posts/p'), { likesCount: 999 }));
  await assertFails(setDoc(doc(db('A'), 'likes/random'), { userId: 'B', postId: 'p' }));
});
test('honest atomic like succeeds once with matching counter', async () => {
  const store = db('A');
  const batch = writeBatch(store);
  batch.set(doc(store, 'likes/A_p'), { userId: 'A', postId: 'p', createdAt: 'now' });
  batch.update(doc(store, 'community_posts/p'), { likesCount: 1, updatedAt: 'now' });
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(doc(store, 'likes/A_p'), { userId: 'A', postId: 'p' }));
});

test('a persisted like is visible to a fresh context and an atomic unlike restores the count', async () => {
  const store = db('A');
  const add = writeBatch(store);
  add.set(doc(store, 'likes/A_p'), { userId: 'A', postId: 'p', createdAt: 'now' });
  add.update(doc(store, 'community_posts/p'), { likesCount: 1, updatedAt: 'now' });
  await assertSucceeds(add.commit());
  const fresh = db('A');
  assert.equal((await getDoc(doc(fresh, 'likes/A_p'))).exists(), true);
  assert.equal((await getDoc(doc(db('B'), 'community_posts/p'))).data().likesCount, 1);
  const remove = writeBatch(fresh);
  remove.delete(doc(fresh, 'likes/A_p'));
  remove.update(doc(fresh, 'community_posts/p'), { likesCount: 0, updatedAt: 'later' });
  await assertSucceeds(remove.commit());
  assert.equal((await getDoc(doc(db('B'), 'community_posts/p'))).data().likesCount, 0);
});

test('real comments persist for another reader; edits stay owner-only and deletion pairs the aggregate', async () => {
  const store = db('A');
  const add = writeBatch(store);
  add.set(doc(store, 'comments/c'), { id: 'c', postId: 'p', userId: 'A', userName: 'A', userAvatar: '', text: 'Real typed comment', createdAt: serverTimestamp() });
  add.update(doc(store, 'community_posts/p'), { commentsCount: 1, lastCommentMutationId: 'c', updatedAt: 'now' });
  await assertSucceeds(add.commit());
  assert.equal((await getDoc(doc(db('B'), 'comments/c'))).data().text, 'Real typed comment');
  assert.ok((await getDoc(doc(db('B'), 'comments/c'))).data().createdAt instanceof Timestamp);
  await assertFails(updateDoc(doc(db('A'), 'comments/c'), { createdAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(db('B'), 'comments/c'), { text: 'forged' }));
  await assertSucceeds(updateDoc(doc(db('A'), 'comments/c'), { text: 'Edited by owner' }));
  assert.equal((await getDoc(doc(db('B'), 'comments/c'))).data().text, 'Edited by owner');
  const remover = db('A');
  const remove = writeBatch(remover);
  remove.delete(doc(remover, 'comments/c'));
  remove.update(doc(remover, 'community_posts/p'), { commentsCount: 0, lastCommentMutationId: 'c', updatedAt: 'later' });
  await assertSucceeds(remove.commit());
  assert.equal((await getDoc(doc(db('B'), 'community_posts/p'))).data().commentsCount, 0);
});

const roleCases = [
  ['super_admin', true, true, true],
  ['platform_admin', true, false, false],
  ['safety_admin', true, false, true],
  ['moderation_admin', false, false, false],
  ['support_agent', true, false, false],
  ['booking_admin', true, false, false],
  ['finance_admin', false, false, false],
  ['kyc_reviewer', true, true, false],
  ['content_admin', false, false, false],
  ['analytics_admin', false, false, false],
  ['read_only_admin', false, false, false],
];
for (const [role, profileRead, kycRead, safetyWrite] of roleCases) {
  test(`${role}: scoped private access, role assignment and no verified-payment bypass`, async () => {
    const store = db(`operator_${role}`, { adminRole: role, admin: true });
    await (profileRead ? assertSucceeds : assertFails)(getDoc(doc(store, 'users/A')));
    await (kycRead ? assertSucceeds : assertFails)(getDoc(doc(store, 'companion_applications/appA')));
    await (safetyWrite ? assertSucceeds : assertFails)(updateDoc(doc(store, 'sosAlerts/alertA'), { status: 'acknowledged' }));
    await (role === 'super_admin' ? assertSucceeds : assertFails)(setDoc(doc(store, 'admins/target'), { uid: 'target', role: 'super_admin' }));
    await assertFails(setDoc(doc(store, 'payments/forged'), { userId: 'A', status: 'verified', amount: 100 }));
  });
}

test('owner-constrained private queries allowed; collection-wide and anonymous access denied', async () => {
  const store = db('A');
  await assertSucceeds(getDocs(query(collection(store, 'sosAlerts'), where('userId', '==', 'A'), limit(10))));
  await assertFails(getDocs(query(collection(store, 'sosAlerts'), limit(10))));
  const anonymous = db('A', { firebase: { sign_in_provider: 'anonymous' } });
  await assertFails(getDoc(doc(anonymous, 'users/A')));
  await assertFails(updateDoc(doc(anonymous, 'users/A'), { name: 'forged' }));
});
