import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, runTransaction, setLogLevel, type Firestore } from 'firebase/firestore';
import { BASELINE_PATH, BASELINE_HASH, BOOKING_HASH, hash, patchCompanionAuthority } from '../ops/companion-authority-containment/patch.mjs';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('Requires isolated loopback emulator port 8087.');
let env: RulesTestEnvironment;
const combined = process.env.SATHI_COMPANION_AUTHORITY_COMBINED_GATE === '1';
const db = (uid: string, claims = {}) => env.authenticatedContext(uid, { role: 'customer', admin: false, adminRole: 'none', ...claims }).firestore() as unknown as Firestore;
const application = () => ({ id: 'app1', userId: 'provider', status: 'SUBMITTED',
  applicationData: { displayName: 'Provider', categories: ['Art'], languages: ['Nepali'], location: 'Pokhara', hourlyRate: 1000 },
  kyc: { verificationStatus: 'UNVERIFIED', documentFileUrl: 'kyc/provider/identity.pdf' },
  createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z' });
const profile = () => ({ id: 'provider', userId: 'provider', name: 'Provider', bio: '', categories: ['Art'], languages: ['Nepali'],
  location: 'Pokhara', hourlyRate: 1000, imageUrl: '', isVerified: true, verificationBadge: 'KYC_VERIFIED', approvalApplicationId: 'app1', availability: true,
  createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z' });

before(async () => {
  setLogLevel('silent');
  const baseline = await readFile(BASELINE_PATH, 'utf8');
  const booking = await readFile('ops/booking-containment/candidate.firestore.rules', 'utf8');
  const candidate = await readFile(combined ? 'ops/companion-authority-containment/booking-combined.firestore.rules'
    : 'ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
  assert.equal(hash(baseline), BASELINE_HASH);
  assert.equal(hash(booking), BOOKING_HASH);
  assert.equal(candidate, patchCompanionAuthority(combined ? booking : baseline, combined ? BOOKING_HASH : BASELINE_HASH));
  env = await initializeTestEnvironment({ projectId: 'demo-sathi-companion-authority', firestore: {
    host: '127.0.0.1', port: 8087, rules: candidate,
  } });
});
after(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const store = context.firestore();
    await Promise.all([
      setDoc(doc(store, 'users/provider'), { role: 'customer', companionStatus: 'PENDING' }),
      setDoc(doc(store, 'users/legacy'), { role: 'admin' }),
      setDoc(doc(store, 'admins/reviewer'), { uid: 'reviewer', role: 'kyc_reviewer', updatedAt: 'fixture' }),
      setDoc(doc(store, 'companion_applications/app1'), application()),
    ]);
  });
});

test('ordinary owner cannot self-verify through user, public profile or draft KYC', async () => {
  const owner = db('provider');
  await assertFails(updateDoc(doc(owner, 'users/provider'), { companionStatus: 'APPROVED' }));
  await assertFails(setDoc(doc(owner, 'companions/provider'), profile()));
  await assertFails(updateDoc(doc(owner, 'companion_applications/app1'), { 'kyc.verificationStatus': 'VERIFIED' }));
});

test('actual owner draft, partial KYC save and submission remain compatible', async () => {
  const owner = db('provider');
  await assertSucceeds(setDoc(doc(owner, 'companion_applications/app2'), {
    ...application(), id: 'app2', status: 'DRAFT', applicationData: {}, kyc: { verificationStatus: 'UNVERIFIED' },
  }));
  await assertSucceeds(updateDoc(doc(owner, 'companion_applications/app2'), {
    'applicationData.displayName': 'Provider', 'kyc.documentFileUrl': 'kyc/provider/identity.pdf', updatedAt: 'fixture',
  }));
  await assertSucceeds(updateDoc(doc(owner, 'companion_applications/app2'), {
    status: 'SUBMITTED', submittedAt: 'fixture', updatedAt: 'fixture',
  }));
  const saved = (await getDoc(doc(owner, 'companion_applications/app2'))).data();
  assert.equal(saved?.status, 'SUBMITTED');
  assert.equal(saved?.kyc.verificationStatus, 'UNVERIFIED');
  assert.equal(saved?.kyc.documentFileUrl, 'kyc/provider/identity.pdf');
});

test('legacy user role, generic admin claim and non-review staff cannot grant companion authority', async () => {
  for (const store of [db('legacy'), db('generic', { admin: true }), db('finance', { adminRole: 'finance_admin' })]) {
    await assertFails(updateDoc(doc(store, 'users/provider'), { companionStatus: 'APPROVED' }));
    await assertFails(setDoc(doc(store, 'companions/provider'), profile()));
    await assertFails(getDoc(doc(store, 'companion_applications/app1')));
  }
});

test('assigned reviewer approves atomically and owner may edit only permitted public fields', async () => {
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertSucceeds(runTransaction(reviewer, async tx => {
    const appRef = doc(reviewer, 'companion_applications/app1');
    const snap = await tx.get(appRef);
    assert.equal(snap.data()?.status, 'SUBMITTED');
    tx.update(appRef, { status: 'APPROVED', reviewedBy: 'reviewer', reviewedAt: 'fixture', reviewAuditId: 'audit1', updatedAt: 'fixture', 'kyc.verificationStatus': 'VERIFIED' });
    tx.update(doc(reviewer, 'users/provider'), { companionStatus: 'APPROVED', companionApprovalApplicationId: 'app1', updatedAt: 'fixture' });
    tx.set(doc(reviewer, 'companions/provider'), profile(), { merge: true });
    tx.set(doc(reviewer, 'admin_audit_logs/audit1'), { action: 'application.approve', actorId: 'reviewer', targetId: 'app1', createdAt: 'fixture' });
  }));
  assert.equal((await getDoc(doc(db('provider'), 'users/provider'))).data()?.companionStatus, 'APPROVED');
  assert.equal((await getDoc(doc(db('provider'), 'companions/provider'))).data()?.isVerified, true);
  assert.equal((await getDoc(doc(db('provider'), 'companion_applications/app1'))).data()?.status, 'APPROVED');
  await assertSucceeds(updateDoc(doc(db('provider'), 'companions/provider'), { bio: 'Updated bio' }));
  await assertFails(updateDoc(doc(db('provider'), 'companions/provider'), { isVerified: false }));
});

test('existing canonical legacy profile keeps its creation time during approval', async () => {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'companions/provider'), {
    id: 'provider', name: 'Old profile', isVerified: false, createdAt: '2020-01-01T00:00:00.000Z',
  }));
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertSucceeds(runTransaction(reviewer, async tx => {
    const appRef = doc(reviewer, 'companion_applications/app1');
    const profileRef = doc(reviewer, 'companions/provider');
    const existing = await tx.get(profileRef);
    assert.equal(existing.data()?.createdAt, '2020-01-01T00:00:00.000Z');
    tx.update(appRef, { status: 'APPROVED', reviewedBy: 'reviewer', reviewedAt: 'fixture', reviewAuditId: 'auditLegacy', updatedAt: 'fixture', 'kyc.verificationStatus': 'VERIFIED' });
    tx.update(doc(reviewer, 'users/provider'), { companionStatus: 'APPROVED', companionApprovalApplicationId: 'app1', updatedAt: 'fixture' });
    const { createdAt: _unused, ...updatedProfile } = profile();
    tx.set(profileRef, updatedProfile, { merge: true });
    tx.set(doc(reviewer, 'admin_audit_logs/auditLegacy'), { action: 'application.approve', actorId: 'reviewer', targetId: 'app1', createdAt: 'fixture' });
  }));
  const result = (await getDoc(doc(db('provider'), 'companions/provider'))).data();
  assert.equal(result?.createdAt, '2020-01-01T00:00:00.000Z');
  assert.equal(result?.userId, 'provider');
  assert.equal(result?.isVerified, true);
});

test('revoked reviewer assignment cannot use a stale reviewer claim', async () => {
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'admins/reviewer'), { role: 'read_only_admin' }));
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertFails(updateDoc(doc(reviewer, 'users/provider'), { companionStatus: 'APPROVED' }));
  await assertFails(updateDoc(doc(reviewer, 'companion_applications/app1'), { status: 'APPROVED', reviewedBy: 'reviewer' }));
});

test('reviewer cannot set approval or public verification without the matching application and audit transition', async () => {
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertFails(updateDoc(doc(reviewer, 'users/provider'), { companionStatus: 'APPROVED', companionApprovalApplicationId: 'app1' }));
  await assertFails(setDoc(doc(reviewer, 'companions/provider'), profile()));
  await assertFails(updateDoc(doc(reviewer, 'companion_applications/app1'), {
    status: 'APPROVED', reviewedBy: 'reviewer', reviewedAt: 'fixture', reviewAuditId: 'missing', 'kyc.verificationStatus': 'VERIFIED',
  }));
});

test('reviewer cannot publish private contact fields in the approval projection', async () => {
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertFails(runTransaction(reviewer, async tx => {
    tx.update(doc(reviewer, 'companion_applications/app1'), {
      status: 'APPROVED', reviewedBy: 'reviewer', reviewedAt: 'fixture', reviewAuditId: 'auditPrivate',
      updatedAt: 'fixture', 'kyc.verificationStatus': 'VERIFIED',
    });
    tx.update(doc(reviewer, 'users/provider'), { companionStatus: 'APPROVED', companionApprovalApplicationId: 'app1' });
    tx.set(doc(reviewer, 'companions/provider'), { ...profile(), phone: '9800000000' });
    tx.set(doc(reviewer, 'admin_audit_logs/auditPrivate'), { action: 'application.approve', actorId: 'reviewer', targetId: 'app1', createdAt: 'fixture' });
  }));
  assert.equal((await getDoc(doc(db('provider'), 'companion_applications/app1'))).data()?.status, 'SUBMITTED');
});

test('reviewer cannot review their own application or approve it twice', async () => {
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'companion_applications/self'), {
    ...application(), id: 'self', userId: 'reviewer', status: 'SUBMITTED',
  }));
  await assertFails(updateDoc(doc(reviewer, 'companion_applications/self'), { status: 'APPROVED', reviewedBy: 'reviewer' }));
  await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'companion_applications/app1'), { status: 'APPROVED' }));
  await assertFails(updateDoc(doc(reviewer, 'companion_applications/app1'), { status: 'REJECTED', reviewedBy: 'reviewer' }));
});

test('missing target user aborts the entire review transaction', async () => {
  await env.withSecurityRulesDisabled(context => deleteDoc(doc(context.firestore(), 'users/provider')));
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertFails(runTransaction(reviewer, async tx => {
    tx.update(doc(reviewer, 'companion_applications/app1'), { status: 'APPROVED', reviewedBy: 'reviewer', reviewedAt: 'fixture', reviewAuditId: 'audit2', updatedAt: 'fixture', 'kyc.verificationStatus': 'VERIFIED' });
    tx.update(doc(reviewer, 'users/provider'), { companionStatus: 'APPROVED', companionApprovalApplicationId: 'app1' });
    tx.set(doc(reviewer, 'companions/provider'), profile());
    tx.set(doc(reviewer, 'admin_audit_logs/audit2'), { action: 'application.approve', actorId: 'reviewer', targetId: 'app1', createdAt: 'fixture' });
  }));
  assert.equal((await getDoc(doc(db('provider'), 'companion_applications/app1'))).data()?.status, 'SUBMITTED');
  assert.equal((await getDoc(doc(db('provider'), 'companions/provider'))).exists(), false);
});
