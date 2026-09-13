import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, getDocs, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, setLogLevel } from 'firebase/firestore';
import { BASELINE_PATH, originalPayments, containedPayments } from '../ops/payment-containment/patch.mjs';
import { composeContainment } from '../ops/payment-containment/combined.mjs';
import { patchAssignments, originalAssignments, containedAssignments } from '../ops/staff-containment/assignment-patch.mjs';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('Requires isolated loopback emulator; no live fallback.');
let env;
const combined = process.env.SATHI_COMBINED_GATE === '1';
const db = (uid, claims = {}) => env.authenticatedContext(uid, { admin: false, role: 'customer', adminRole: 'none', ...claims }).firestore();
const assignment = uid => ({ uid, role: 'read_only_admin', updatedAt: '2026-09-13T00:00:00.000Z' });
before(async () => {
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  const candidate = await readFile(combined ? 'ops/payment-containment/combined-candidate.firestore.rules' : 'ops/staff-containment/assignment-candidate.firestore.rules', 'utf8');
  assert.equal(candidate, combined ? composeContainment(baseline) : patchAssignments(baseline));
  let restored = candidate.replace(containedAssignments, originalAssignments);
  if (combined) restored = restored.replace(containedPayments, originalPayments);
  assert.equal(restored, baseline);
  setLogLevel('silent');
  env = await initializeTestEnvironment({ projectId: 'demo-sathi-staff-assignments', firestore: { host: '127.0.0.1', port: 8087, rules: candidate } });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(context => Promise.all([
    setDoc(doc(context.firestore(), 'users/legacy'), { role: 'admin' }),
    setDoc(doc(context.firestore(), 'admins/document_root'), { ...assignment('document_root'), role: 'super_admin' }),
    setDoc(doc(context.firestore(), 'admins/existing'), assignment('existing')),
  ]));
});
const roles = ['platform_admin','safety_admin','moderation_admin','support_agent','booking_admin','finance_admin','kyc_reviewer','content_admin','analytics_admin','read_only_admin'];
for (const actor of ['customer','guest','legacy','document_root','generic_admin','anonymous_root', ...roles]) {
  test(`${actor} cannot create, change, delete or batch self-assign staff authority`, async () => {
    const claims = actor === 'generic_admin' ? { admin: true } : actor === 'anonymous_root'
      ? { adminRole: 'super_admin', firebase: { sign_in_provider: 'anonymous' } }
      : roles.includes(actor) ? { admin: true, adminRole: actor } : {};
    const store = actor === 'guest' ? env.unauthenticatedContext().firestore() : db(actor, claims);
    await assertFails(setDoc(doc(store, `admins/${actor}`), { ...assignment(actor), role: 'super_admin' }));
    await assertFails(updateDoc(doc(store, 'admins/existing'), { role: 'super_admin' }));
    await assertFails(deleteDoc(doc(store, 'admins/existing')));
    const batch = writeBatch(store);
    batch.set(doc(store, `admins/${actor}`), { ...assignment(actor), role: 'super_admin' });
    batch.set(doc(store, 'admins/another'), assignment('another'));
    await assertFails(batch.commit());
  });
}
test('explicit trusted super-admin can manage valid assignments and list staff', async () => {
  const root = db('root', { adminRole: 'super_admin' });
  await assertSucceeds(setDoc(doc(root, 'admins/new'), assignment('new')));
  await assertSucceeds(updateDoc(doc(root, 'admins/new'), { role: 'content_admin' }));
  await assertSucceeds(getDocs(collection(root, 'admins')));
  await assertSucceeds(deleteDoc(doc(root, 'admins/new')));
});
test('even root cannot write mismatched UID, unknown role or arbitrary authority fields', async () => {
  const root = db('root', { adminRole: 'super_admin' });
  for (const data of [{ ...assignment('wrong') }, { ...assignment('new'), role: 'unknown' },
    { ...assignment('new'), permissions: ['*'] }, { uid: 'new', role: 'super_admin' }]) {
    await assertFails(setDoc(doc(root, 'admins/new'), data));
  }
});
test('staff retain their own role lookup; unrelated staff cannot read or list assignments', async () => {
  await assertSucceeds(getDoc(doc(db('existing'), 'admins/existing')));
  await assertFails(getDoc(doc(db('legacy'), 'admins/existing')));
  await assertFails(getDocs(collection(db('legacy'), 'admins')));
});
