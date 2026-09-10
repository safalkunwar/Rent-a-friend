// Phase 0 diagnostic tests against a byte-verified captured production ruleset.
// KNOWN_RISK tests reproduce insecure allowances; passing is NOT a security pass.
import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, deleteDoc, setLogLevel } from 'firebase/firestore';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085') throw new Error('Loopback Firestore emulator required; no live fallback');
const folder = 'docs/sathi/rollbacks/phase-00-2026-09-10';
let env;
const db = (uid, claims = {}) => env.authenticatedContext(uid, { admin: false, role: 'customer', adminRole: 'none', ...claims }).firestore();
before(async () => {
  const rules = await readFile(`${folder}/firestore.rules`, 'utf8');
  const manifest = JSON.parse(await readFile(`${folder}/manifest.json`, 'utf8'));
  assert.equal(createHash('sha256').update(rules).digest('hex'), manifest.rules.firestore.sha256);
  setLogLevel('silent');
  env = await initializeTestEnvironment({ projectId: 'demo-sathi-phase0', firestore: { host: '127.0.0.1', port: 8085, rules } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    for (const [path, data] of Object.entries({
      'users/A': { name: 'A', role: 'customer', avatar: '' },
      'users/B': { name: 'B', role: 'customer', avatar: '' },
      'users/C': { name: 'C', role: 'customer', avatar: '' },
      'conversations/A_B': { participantIds: ['A', 'B'] },
      'messages/m': { conversationId: 'A_B', senderId: 'A', text: 'Synthetic private message', isRead: false },
      'community_posts/p': { userId: 'A', status: 'removed', content: 'Synthetic moderated post', likesCount: 0, commentsCount: 0 },
      'bookings/b': { userId: 'A', companionId: 'B', companionUid: 'B', status: 'pending', policyVersion: 2, date: '2099-01-01' },
      'booking_locks/lock_B_2099_01_01': { bookingId: 'b', companionId: 'B', date: '2099-01-01', status: 'pending' },
      'events/e': { ownerId: 'A', moderationStatus: 'ACTIVE', visibilityStatus: 'PUBLIC', status: 'ACTIVE', participantCount: 0, participationVersion: 1, spots: 2 },
      'event_participants/e_A': { eventId: 'e', userId: 'A', status: 'joined' },
      'payments/pay': { userId: 'A', status: 'pending', amount: 1000 },
    })) await setDoc(doc(ctx.firestore(), path), data);
  });
});
test('CONTROL: guest cannot create a Story or read private user; owner cannot self-promote', async () => {
  const guest = env.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(guest, 'stories/x'), { userId: 'A' }));
  await assertFails(getDoc(doc(guest, 'users/A')));
  await assertFails(updateDoc(doc(db('A'), 'users/A'), { role: 'admin' }));
});
test('CONTROL: owner edits allowed profile text; stranger profile edit and initial message read denied', async () => {
  await assertSucceeds(updateDoc(doc(db('A'), 'users/A'), { bio: 'Own biography' }));
  await assertFails(updateDoc(doc(db('B'), 'users/A'), { bio: 'Forged' }));
  await assertFails(getDoc(doc(db('C'), 'messages/m')));
});
test('KNOWN_RISK P0: stranger replaces conversation participants then reads private message', async () => {
  await assertSucceeds(updateDoc(doc(db('C'), 'conversations/A_B'), { participantIds: ['C'] }));
  const message = await assertSucceeds(getDoc(doc(db('C'), 'messages/m')));
  assert.equal(message.data().text, 'Synthetic private message');
});
test('KNOWN_RISK P0: stranger deletes someone else conversation and writes their favorites', async () => {
  await assertSucceeds(deleteDoc(doc(db('C'), 'conversations/A_B')));
  await assertSucceeds(setDoc(doc(db('C'), 'users/A/favorites/arbitrary'), { companionId: 'C' }));
});
test('KNOWN_RISK P0: read_only_admin claim permits payment mutation', async () => {
  await assertSucceeds(updateDoc(doc(db('C', { adminRole: 'read_only_admin' }), 'payments/pay'), { status: 'completed', amount: 1 }));
});
test('KNOWN_RISK P0: companion create accepts unreviewed isVerified authority', async () => {
  await assertSucceeds(setDoc(doc(db('C'), 'companions/C'), { userId: 'C', isVerified: true, hourlyRate: 1000 }));
});
test('KNOWN_RISK P0: customer creates completed booking without lock and jumps existing status', async () => {
  await assertSucceeds(setDoc(doc(db('A'), 'bookings/unlocked'), { userId: 'A', companionId: 'B', status: 'completed', paymentStatus: 'completed', totalPrice: 1 }));
  await assertSucceeds(updateDoc(doc(db('A'), 'bookings/b'), { status: 'completed' }));
});
test('KNOWN_RISK P0: ordinary user preclaims arbitrary booking lock and forges own payment record', async () => {
  await assertSucceeds(setDoc(doc(db('C'), 'booking_locks/arbitrary'), { bookingId: 'nonexistent', companionId: 'A', status: 'active' }));
  await assertSucceeds(setDoc(doc(db('C'), 'payments/forged'), { userId: 'C', status: 'completed', amount: 999999 }));
});
test('KNOWN_RISK P1: removed Community post is publicly readable and owner can restore status', async () => {
  await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), 'community_posts/p')));
  await assertSucceeds(updateDoc(doc(db('A'), 'community_posts/p'), { status: 'published' }));
});
test('COMPATIBILITY: current Event counter update denied by production; legacy unpaired member accepted', async () => {
  await assertFails(updateDoc(doc(db('B'), 'events/e'), { participantCount: 1 }));
  await assertSucceeds(setDoc(doc(db('B'), 'event_participants/e_B'), { eventId: 'e', userId: 'B', status: 'joined' }));
  assert.equal((await getDoc(doc(db('A'), 'events/e'))).data().participantCount, 0);
});
test('KNOWN_RISK P1: unrelated signed-in user reads Event participant identity', async () => {
  await assertSucceeds(getDoc(doc(db('C'), 'event_participants/e_A')));
});
test('COMPATIBILITY P0: actual v2 owner cancellation is denied by production lock policy', async () => {
  // Invoke with node --import tsx --test; imports the actual implementation.
  const { transitionBooking } = await import('../src/services/bookingTransactions.ts');
  const { bookingLockId } = await import('../src/services/bookingPolicy.ts');
  assert.equal(bookingLockId('B', '2099-01-01'), 'lock_B_2099_01_01');
  await assertFails(transitionBooking(db('A'), 'A', 'b', 'cancelled'));
  assert.equal((await getDoc(doc(db('A'), 'bookings/b'))).data().status, 'pending');
});
