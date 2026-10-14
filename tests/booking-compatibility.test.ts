import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, Timestamp, setLogLevel, type Firestore } from 'firebase/firestore';
import { reserveBooking, transitionBooking } from '../src/services/bookingTransactions';
import type { Booking } from '../src/types';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('Only loopback emulator port 8087 is allowed.');
const rulesPath = process.env.SATHI_REVIEW_CASE_COMBINED_GATE === '1'
  ? 'ops/companion-review-case-containment/booking-combined.firestore.rules'
  : process.env.SATHI_COMPANION_AUTHORITY_COMBINED_GATE === '1'
  ? 'ops/companion-authority-containment/booking-combined.firestore.rules'
  : process.env.SATHI_BOOKING_DRAFT_REVIEW === '1'
    ? 'ops/combined-containment/candidate.firestore.rules' : 'ops/booking-containment/candidate.firestore.rules';
let env: RulesTestEnvironment;
const db = (uid: string, claims = {}) => env.authenticatedContext(uid, { role: 'customer', admin: false, adminRole: 'none', ...claims }).firestore() as unknown as Firestore;
before(async () => {
  setLogLevel('silent');
  env = await initializeTestEnvironment({ projectId: 'demo-sathi-booking-compatibility', firestore: { host: '127.0.0.1', port: 8087, rules: await readFile(rulesPath, 'utf8') } });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const store = context.firestore();
    await Promise.all([
      setDoc(doc(store, 'users/A'), { role: 'customer' }), setDoc(doc(store, 'users/B'), { role: 'customer' }),
      setDoc(doc(store, 'users/C'), { role: 'companion', companionStatus: 'APPROVED' }),
      setDoc(doc(store, 'companions/C'), { userId: 'C', isVerified: true, hourlyRate: 1000 }),
    ]);
  });
});
const input = (uid = 'A', id = 'a'): Booking => ({ id, userId: uid, companionId: 'C', date: '2099-01-01', time: '10:00',
  duration: 2, participants: 1, status: 'pending', totalPrice: 1, meetingPoint: 'Pokhara', userNameAtBooking: uid,
  userPhoneAtBooking: '9800000000', createdAt: 'fixture' });
const lockPath = 'booking_locks/lock_C_2099_01_01';
test('actual customer transaction reserves booking and matching lock with computed NPR quote', async () => {
  await reserveBooking(db('A'), 'A', input());
  const booking = (await getDoc(doc(db('A'), 'bookings/a'))).data();
  assert.equal(booking?.totalPrice, 2200);
  assert.equal(booking?.paymentStatus, 'not_started');
  assert.equal((await getDoc(doc(db('A'), lockPath))).data()?.bookingId, 'a');
});
test('actual concurrent customer reservations yield exactly one winner', async () => {
  const results = await Promise.allSettled([reserveBooking(db('A'), 'A', input()), reserveBooking(db('B'), 'B', input('B', 'b'))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
});
test('lost acknowledgement retry is idempotent; changed intent rejected', async () => {
  const store = db('A');
  await reserveBooking(store, 'A', input());
  await reserveBooking(store, 'A', input());
  await assert.rejects(reserveBooking(store, 'A', { ...input(), duration: 3 }), /different booking intent/);
});
test('retry compares meeting coordinates by value and rejects a changed location', async () => {
  const store = db('A');
  const request = { ...input(), meetingCoordinates: { latitude: 28.2, longitude: 83.9 } };
  await reserveBooking(store, 'A', request);
  await reserveBooking(store, 'A', { ...request, meetingCoordinates: { ...request.meetingCoordinates } });
  await assert.rejects(reserveBooking(store, 'A', { ...request, meetingCoordinates: { latitude: 27.7, longitude: 85.3 } }), /different booking intent/);
  await assert.rejects(reserveBooking(store, 'A', input()), /different booking intent/);
});
test('companion confirms, customer cancels, another customer reuses the cancelled day', async () => {
  await reserveBooking(db('A'), 'A', input());
  await transitionBooking(db('C'), 'C', 'a', 'confirmed');
  await transitionBooking(db('A'), 'A', 'a', 'cancelled');
  await reserveBooking(db('B'), 'B', input('B', 'b'));
  assert.equal((await getDoc(doc(db('B'), lockPath))).data()?.bookingId, 'b');
});
test('forged status/ownership/price/payment mutations and unpaired updates denied', async () => {
  await reserveBooking(db('A'), 'A', input());
  for (const patch of [{ status: 'confirmed' }, { userId: 'B' }, { totalPrice: 0 }, { paymentStatus: 'verified' }]) {
    await assertFails(updateDoc(doc(db('A'), 'bookings/a'), patch));
  }
  await assertFails(updateDoc(doc(db('C'), 'bookings/a'), { status: 'confirmed' }));
  await assertFails(updateDoc(doc(db('C'), lockPath), { status: 'confirmed' }));
});
test('modified customer cannot self-confirm even with an atomic lock update', async () => {
  await reserveBooking(db('A'), 'A', input());
  const store = db('A'); const batch = writeBatch(store);
  batch.update(doc(store, 'bookings/a'), { status: 'confirmed', updatedAt: 'changed' });
  batch.update(doc(store, lockPath), { status: 'confirmed', updatedAt: 'changed' });
  await assertFails(batch.commit());
});
test('only explicit booking/root claims can act as an operator', async () => {
  await reserveBooking(db('A'), 'A', input());
  for (const claims of [{}, { admin: true }, { adminRole: 'finance_admin' }, { adminRole: 'read_only_admin' },
    { adminRole: 'booking_admin', firebase: { sign_in_provider: 'anonymous' } }]) {
    await assertFails(transitionBooking(db('operator', claims), 'operator', 'a', 'confirmed'));
  }
  await transitionBooking(db('operator', { adminRole: 'booking_admin' }), 'operator', 'a', 'confirmed');
  await transitionBooking(db('root', { adminRole: 'super_admin' }), 'root', 'a', 'cancelled');
});
test('even root cannot forge payment, alter ownership or erase booking/lock history', async () => {
  await reserveBooking(db('A'), 'A', input());
  const root = db('root', { adminRole: 'super_admin' });
  await assertFails(updateDoc(doc(root, 'bookings/a'), { paymentStatus: 'verified' }));
  await assertFails(updateDoc(doc(root, 'bookings/a'), { userId: 'root' }));
  await assertFails(deleteDoc(doc(root, 'bookings/a')));
  await assertFails(deleteDoc(doc(root, lockPath)));
});
test('standalone and mismatched lock creation is denied', async () => {
  for (const store of [db('A'), db('root', { adminRole: 'super_admin' })]) {
    await assertFails(setDoc(doc(store, lockPath), { bookingId: 'a', companionId: 'C', date: '2099-01-01', status: 'pending', updatedAt: 'fixture' }));
  }
});
test('legacy booking remains readable but cannot bypass the v2 transition gate', async () => {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'bookings/legacy'), { userId: 'A', companionId: 'C', status: 'pending' }));
  assert.ok((await getDoc(doc(db('A'), 'bookings/legacy'))).exists());
  await assertFails(updateDoc(doc(db('A'), 'bookings/legacy'), { status: 'confirmed' }));
});
test('early start and early completion cannot bypass the time gate in a direct batch', async () => {
  await reserveBooking(db('A'), 'A', input());
  await transitionBooking(db('C'), 'C', 'a', 'confirmed');
  const store = db('C'); const batch = writeBatch(store);
  batch.update(doc(store, 'bookings/a'), { status: 'active', updatedAt: 'fixture' });
  batch.update(doc(store, lockPath), { status: 'active', updatedAt: 'fixture' });
  await assertFails(batch.commit());
});

const directBooking = () => ({ ...input(), companionUid: 'C', paymentStatus: 'not_started', policyVersion: 2,
  quotedTotalPaisa: 220000, totalPrice: 2200, startAt: Timestamp.fromDate(new Date('2099-01-01T10:00:00+05:45')), updatedAt: 'fixture' });
async function directPair(store: Firestore, booking: Record<string, unknown>, lockChanges = {}, path = lockPath) {
  const batch = writeBatch(store);
  batch.set(doc(store, 'bookings/a'), booking);
  batch.set(doc(store, path), { bookingId: 'a', companionId: 'C', date: '2099-01-01', status: 'pending', updatedAt: 'fixture', ...lockChanges });
  return batch.commit();
}
for (const [name, change] of Object.entries({
  owner: { userId: 'B' }, provider: { companionUid: 'B' }, price: { totalPrice: 1 }, quote: { quotedTotalPaisa: 1 },
  paid: { paymentStatus: 'verified' }, confirmed: { status: 'confirmed' }, version: { policyVersion: 3 },
  duration: { duration: 0 }, participants: { participants: 9 }, time: { time: '25:00' },
  start: { startAt: Timestamp.fromMillis(0) }, extras: { approvedBy: 'A' }, noContact: { userPhoneAtBooking: '' },
})) {
  test(`direct client cannot create a paired booking with forged ${name}`, async () => {
    await assertFails(directPair(db('A'), { ...directBooking(), ...change }));
  });
}
test('valid direct SDK pair passes, but mismatched lock identity/status/time do not', async () => {
  for (const patch of [{ bookingId: 'other' }, { companionId: 'B' }, { date: '2099-01-02' }, { status: 'confirmed' }, { updatedAt: 'different' }]) {
    await assertFails(directPair(db('A'), directBooking(), patch));
  }
  await assertFails(directPair(db('A'), directBooking(), {}, 'booking_locks/wrong'));
  await directPair(db('A'), directBooking());
});
test('anonymous identities cannot reserve even using valid atomic payloads', async () => {
  await assertFails(directPair(db('A', { firebase: { sign_in_provider: 'anonymous' } }), directBooking()));
  await assertFails(directPair(env.unauthenticatedContext().firestore() as unknown as Firestore, directBooking()));
});
test('unapproved provider or restricted customer cannot reserve', async () => {
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'users/C'), { companionStatus: 'PENDING' }));
  await assertFails(directPair(db('A'), directBooking()));
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'users/C'), { companionStatus: 'APPROVED' });
    await updateDoc(doc(context.firestore(), 'users/A'), { status: 'BANNED' });
  });
  await assertFails(directPair(db('A'), directBooking()));
});
test('completion after elapsed service succeeds, terminal bookings cannot be reopened', async () => {
  const started = Timestamp.fromMillis(Date.now() - 3 * 3600000);
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'bookings/a'), { ...directBooking(), status: 'active', startAt: started });
    await setDoc(doc(context.firestore(), lockPath), { bookingId: 'a', companionId: 'C', date: '2099-01-01', status: 'active', updatedAt: 'fixture' });
  });
  await transitionBooking(db('C'), 'C', 'a', 'completed');
  assert.equal((await getDoc(doc(db('A'), lockPath))).data()?.status, 'completed');
  await assert.rejects(transitionBooking(db('C'), 'C', 'a', 'confirmed'), /Invalid booking transition/);
});
