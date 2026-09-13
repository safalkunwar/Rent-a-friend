import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, setLogLevel } from 'firebase/firestore';
import { BASELINE_PATH, patchPayments, originalPayments, containedPayments } from '../ops/payment-containment/patch.mjs';
import { composeContainment } from '../ops/payment-containment/combined.mjs';
import { originalAssignments, containedAssignments } from '../ops/staff-containment/assignment-patch.mjs';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('Use isolated loopback Firestore at 127.0.0.1:8087; no live fallback.');
let env;
const combined = process.env.SATHI_COMBINED_GATE === '1';
const db = (uid, claims = {}) => env.authenticatedContext(uid, { admin: false, role: 'customer', adminRole: 'none', ...claims }).firestore();
before(async () => {
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  const candidate = await readFile(`ops/payment-containment/${combined ? 'combined-' : ''}candidate.firestore.rules`, 'utf8');
  assert.equal(candidate, combined ? composeContainment(baseline) : patchPayments(baseline));
  let restored = candidate.replace(containedPayments, originalPayments);
  if (combined) restored = restored.replace(containedAssignments, originalAssignments);
  assert.equal(restored, baseline, 'Every unrelated byte must be preserved');
  setLogLevel('silent');
  env = await initializeTestEnvironment({ projectId: 'demo-sathi-payment-containment', firestore: { host: '127.0.0.1', port: 8087, rules: candidate } });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const store = context.firestore();
    await Promise.all(Object.entries({
      'users/A': { role: 'customer', name: 'A' },
      'users/B': { role: 'customer' },
      'users/legacy': { role: 'admin' },
      'payments/existing': { userId: 'A', status: 'pending', amount: 1000 },
      'conversations/A_B': { participantIds: ['A', 'B'], unreadCount: { A: 0, B: 0 } },
      'messages/existing': { conversationId: 'A_B', senderId: 'A', receiverId: 'B', text: 'Fixture', timestamp: '2026-09-13T00:00:00.000Z' },
      'community_posts/post': { userId: 'A', text: 'Post', likesCount: 0, commentsCount: 0 },
      'comments/comment': { postId: 'post', userId: 'A', text: 'Comment' },
      'events/event': { title: 'Event', ownerId: 'A', moderationStatus: 'ACTIVE', visibilityStatus: 'PUBLIC' },
      'bookings/booking': { userId: 'A', companionId: 'B', status: 'pending' },
    }).map(([path, value]) => setDoc(doc(store, path), value)));
  });
});

const roles = ['super_admin','platform_admin','safety_admin','moderation_admin','support_agent','booking_admin','finance_admin','kyc_reviewer','content_admin','analytics_admin','read_only_admin'];
for (const actor of ['owner', 'stranger', 'guest', 'anonymous', 'legacy', 'assignment', ...roles]) {
  test(`${actor}: cannot create, update, delete or batch-forge payment truth`, async () => {
    const uid = actor === 'owner' ? 'A' : actor;
    if (actor === 'assignment') await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'admins/assignment'), { role: 'finance_admin' }));
    const store = actor === 'guest' ? env.unauthenticatedContext().firestore() : db(uid,
      actor === 'anonymous' ? { firebase: { sign_in_provider: 'anonymous' } } : roles.includes(actor) ? { admin: true, adminRole: actor } : {});
    await assertFails(setDoc(doc(store, 'payments/forged'), { userId: uid, status: 'verified', amount: 1 }));
    await assertFails(setDoc(doc(store, 'payments/pending'), { userId: uid, status: 'pending', amount: 1 }));
    await assertFails(updateDoc(doc(store, 'payments/existing'), { status: 'completed', amount: 1 }));
    await assertFails(deleteDoc(doc(store, 'payments/existing')));
    const batch = writeBatch(store);
    batch.set(doc(store, `admins/${uid}`), { role: 'super_admin' });
    batch.update(doc(store, 'payments/existing'), { status: 'verified' });
    await assertFails(batch.commit());
    await env.withSecurityRulesDisabled(async context => assert.equal((await getDoc(doc(context.firestore(), 'payments/existing'))).data().status, 'pending'));
  });
}

test('owner and existing staff read compatibility; stranger and guest read denials', async () => {
  await assertSucceeds(getDoc(doc(db('A'), 'payments/existing')));
  await assertSucceeds(getDoc(doc(db('legacy'), 'payments/existing')));
  for (const role of roles) await assertSucceeds(getDoc(doc(db(role, { adminRole: role }), 'payments/existing')));
  await assertFails(getDoc(doc(db('B'), 'payments/existing')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'payments/existing')));
});

test('legacy staff self-assignment cannot restore payment writes', async () => {
  const attempt = setDoc(doc(db('legacy'), 'admins/legacy'), { uid: 'legacy', role: 'finance_admin', updatedAt: '2026-09-13T00:00:00.000Z' });
  if (combined) await assertFails(attempt);
  else await assertSucceeds(attempt);
  await assertFails(updateDoc(doc(db('legacy'), 'payments/existing'), { status: 'verified' }));
});

test('existing social reads, owner profile edit and messaging containment remain compatible', async () => {
  const guest = env.unauthenticatedContext().firestore();
  for (const path of ['community_posts/post', 'comments/comment', 'events/event']) await assertSucceeds(getDoc(doc(guest, path)));
  await assertSucceeds(getDoc(doc(db('A'), 'bookings/booking')));
  await assertSucceeds(updateDoc(doc(db('A'), 'users/A'), { name: 'Updated' }));
  await assertSucceeds(getDoc(doc(db('B'), 'messages/existing')));
  await assertFails(getDoc(doc(db('outsider'), 'messages/existing')));
  await assertSucceeds(updateDoc(doc(db('B'), 'conversations/A_B'), { unreadCount: { A: 0, B: 0 }, updatedAt: '2026-09-13T00:00:00.000Z' }));
  await assertFails(updateDoc(doc(db('outsider'), 'conversations/A_B'), { participantIds: ['outsider', 'B'] }));
});
