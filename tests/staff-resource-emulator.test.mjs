import { before, after, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, setLogLevel } from 'firebase/firestore';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('Loopback emulator required.');
const reviewing = process.env.SATHI_COMBINED_DRAFT_REVIEW === '1';
const rulesPath = process.env.SATHI_STAFF_RBAC_RULES ?? 'ops/staff-rbac-containment/candidate.firestore.rules';
let env;
const db = (uid, claims = {}) => env.authenticatedContext(uid, { admin: false, role: 'customer', adminRole: 'none', ...claims }).firestore();
before(async () => {
  setLogLevel('silent');
  env = await initializeTestEnvironment({ projectId: 'demo-sathi-staff-resource', firestore: { host: '127.0.0.1', port: 8087,
    rules: await readFile(reviewing ? 'ops/combined-containment/candidate.firestore.rules' : rulesPath, 'utf8') } });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(context => Promise.all([
    setDoc(doc(context.firestore(), 'analytics/report'), { count: 1 }),
    setDoc(doc(context.firestore(), 'suspiciousActivity/case'), { userId: 'owner', internalNotes: 'Synthetic staff evidence' }),
    setDoc(doc(context.firestore(), 'users/legacy'), { role: 'admin' }),
    setDoc(doc(context.firestore(), 'admins/docroot'), { uid: 'docroot', role: 'super_admin', updatedAt: 'fixture' }),
  ]));
});
for (const role of ['super_admin', 'platform_admin', 'analytics_admin']) {
  test(`${role} non-anonymous token can read analytics without a fabricated anonymous claim`, async () => {
    await assertSucceeds(getDoc(doc(db(role, { adminRole: role, firebase: { sign_in_provider: 'password' } }), 'analytics/report')));
  });
}
for (const role of ['customer', 'legacy', 'docroot', 'finance_admin', 'read_only_admin', 'support_agent', 'moderation_admin', 'booking_admin', 'kyc_reviewer', 'safety_admin', 'content_admin']) {
  test(`${role} cannot read protected aggregate analytics`, async () => {
    await assertFails(getDoc(doc(db(role, { adminRole: role }), 'analytics/report')));
  });
}
test('actual anonymous provider denied even when legacy anonymous flag says false', async () => {
  await assertFails(getDoc(doc(db('anonymous', { adminRole: 'super_admin', anonymous: false, firebase: { sign_in_provider: 'anonymous' } }), 'analytics/report')));
});
test('guest reads and even root analytics writes denied', async () => {
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'analytics/report')));
  await assertFails(updateDoc(doc(db('root', { adminRole: 'super_admin' }), 'analytics/report'), { count: 99 }));
});
test('customer cannot read staff-only suspicious-activity notes merely by being their subject', async () => {
  await assertFails(getDoc(doc(db('owner'), 'suspiciousActivity/case')));
});
