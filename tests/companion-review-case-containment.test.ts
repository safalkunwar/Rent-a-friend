import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, setDoc, updateDoc, getDoc, getDocs, limit, query, where, runTransaction, writeBatch, setLogLevel, type Firestore } from 'firebase/firestore';
import { AUTHORITY_HASH, BOOKING_AUTHORITY_HASH, hash, patchCaseAuthority } from '../ops/companion-review-case-containment/patch.mjs';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8087') throw new Error('Requires isolated loopback emulator port 8087.');
let env: RulesTestEnvironment;
const db = (uid: string, claims = {}) => env.authenticatedContext(uid, { role: 'customer', admin: false, adminRole: 'none', ...claims }).firestore() as unknown as Firestore;
const app = (id = 'app1', userId = 'provider') => ({ id, userId, status: 'SUBMITTED',
  applicationData: { displayName: 'Provider', categories: ['Art'], languages: ['Nepali'], location: 'Pokhara', hourlyRate: 1000 },
  kyc: { verificationStatus: 'UNVERIFIED', documentFileUrl: `kyc/${userId}/identity.pdf` }, createdAt: 'fixture', updatedAt: 'fixture' });
const profile = () => ({ id: 'provider', userId: 'provider', name: 'Provider', bio: '', categories: ['Art'], languages: ['Nepali'],
  location: 'Pokhara', hourlyRate: 1000, imageUrl: '', isVerified: true, verificationBadge: 'KYC_VERIFIED',
  approvalApplicationId: 'app1', availability: true, createdAt: 'fixture', updatedAt: 'fixture' });
const reviewCase = (reviewerUid = 'reviewer') => ({ applicationId: 'app1', subjectUid: 'provider', reviewerUid,
  status: 'ASSIGNED', assignedBy: 'root', assignmentAuditId: 'case-assign-app1', version: 1, createdAt: 'fixture', updatedAt: 'fixture' });
function assignCase(store: Firestore, data = reviewCase(), auditOverride: Record<string, unknown> = {}) {
  const batch = writeBatch(store);
  batch.set(doc(store, `companion_review_cases/${data.applicationId}`), data);
  batch.set(doc(store, `admin_audit_logs/${data.assignmentAuditId}`), {
    action: 'companion_review_case.assign', actorId: 'root', targetId: data.applicationId,
    subjectUid: data.subjectUid, reviewerUid: data.reviewerUid, caseVersion: 1, createdAt: 'fixture', ...auditOverride,
  });
  return batch.commit();
}
function revokeCase(store: Firestore, auditOverride: Record<string, unknown> = {}) {
  const batch = writeBatch(store);
  batch.update(doc(store, 'companion_review_cases/app1'), {
    status: 'REVOKED', version: 2, updatedAt: 'later', revocationAuditId: 'case-revoke-app1',
  });
  batch.set(doc(store, 'admin_audit_logs/case-revoke-app1'), {
    action: 'companion_review_case.revoke', actorId: 'root', targetId: 'app1',
    subjectUid: 'provider', reviewerUid: 'reviewer', caseVersion: 2, createdAt: 'later', ...auditOverride,
  });
  return batch.commit();
}

before(async () => {
  setLogLevel('silent');
  const authority = await readFile('ops/companion-authority-containment/candidate.firestore.rules', 'utf8');
  const bookingAuthority = await readFile('ops/companion-authority-containment/booking-combined.firestore.rules', 'utf8');
  const candidate = await readFile('ops/companion-review-case-containment/booking-combined.firestore.rules', 'utf8');
  assert.equal(hash(authority), AUTHORITY_HASH);
  assert.equal(hash(bookingAuthority), BOOKING_AUTHORITY_HASH);
  assert.equal(candidate, patchCaseAuthority(bookingAuthority, BOOKING_AUTHORITY_HASH));
  env = await initializeTestEnvironment({ projectId: 'demo-sathi-review-case', firestore: {
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
      setDoc(doc(store, 'users/other'), { role: 'customer', companionStatus: 'PENDING' }),
      setDoc(doc(store, 'admins/reviewer'), { uid: 'reviewer', role: 'kyc_reviewer' }),
      setDoc(doc(store, 'admins/otherReviewer'), { uid: 'otherReviewer', role: 'kyc_reviewer' }),
      setDoc(doc(store, 'companion_applications/app1'), app()),
      setDoc(doc(store, 'companion_applications/app2'), app('app2', 'other')),
    ]);
  });
});

async function approve(store: Firestore) {
  return runTransaction(store, async tx => {
    tx.update(doc(store, 'companion_applications/app1'), { status: 'APPROVED', reviewedBy: 'reviewer', reviewedAt: 'fixture',
      reviewAuditId: 'audit1', updatedAt: 'fixture', 'kyc.verificationStatus': 'VERIFIED' });
    tx.update(doc(store, 'users/provider'), { companionStatus: 'APPROVED', companionApprovalApplicationId: 'app1', updatedAt: 'fixture' });
    tx.set(doc(store, 'companions/provider'), profile());
    tx.set(doc(store, 'admin_audit_logs/audit1'), { action: 'application.approve', actorId: 'reviewer', targetId: 'app1', createdAt: 'fixture' });
  });
}

test('root must atomically audit a case assignment; ordinary users and reviewers cannot assign', async () => {
  const root = db('root', { adminRole: 'super_admin' });
  await assertFails(assignCase(db('reviewer', { adminRole: 'kyc_reviewer' })));
  await assertFails(assignCase(db('provider')));
  await assertFails(setDoc(doc(root, 'companion_review_cases/app1'), reviewCase()));
  await assertFails(assignCase(root, reviewCase(), { actorId: 'someone-else' }));
  await assertSucceeds(assignCase(root));
  assert.equal((await getDoc(doc(root, 'admin_audit_logs/case-assign-app1'))).data()?.caseVersion, 1);
  await assertFails(assignCase(root, { ...reviewCase('other'), applicationId: 'app2', subjectUid: 'other', assignmentAuditId: 'case-assign-app2' }));
});

test('only the assigned reviewer can read the case and its application directly', async () => {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'companion_review_cases/app1'), reviewCase()));
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  const other = db('otherReviewer', { adminRole: 'kyc_reviewer' });
  await assertSucceeds(getDoc(doc(reviewer, 'companion_review_cases/app1')));
  await assertSucceeds(getDoc(doc(reviewer, 'companion_applications/app1')));
  await assertFails(getDoc(doc(other, 'companion_review_cases/app1')));
  await assertFails(getDoc(doc(other, 'companion_applications/app1')));
  await assertFails(getDoc(doc(reviewer, 'companion_applications/app2')));
});

test('reviewer queue requires own-case filter; owner and root reads remain compatible', async () => {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'companion_review_cases/app1'), reviewCase()));
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertSucceeds(getDocs(query(collection(reviewer, 'companion_review_cases'), where('reviewerUid', '==', 'reviewer'), limit(50))));
  await assertFails(getDocs(query(collection(reviewer, 'companion_review_cases'), where('reviewerUid', '==', 'reviewer'))));
  await assertFails(getDocs(collection(reviewer, 'companion_review_cases')));
  await assertFails(getDocs(collection(reviewer, 'companion_applications')));
  await assertSucceeds(getDoc(doc(db('provider'), 'companion_applications/app1')));
  await assertSucceeds(getDoc(doc(db('root', { adminRole: 'super_admin' }), 'companion_applications/app2')));
  await assertSucceeds(getDocs(query(collection(db('provider'), 'companion_applications'), where('userId', '==', 'provider'), limit(50))));
  await assertSucceeds(getDocs(query(collection(db('root', { adminRole: 'super_admin' }), 'companion_applications'), where('status', '==', 'SUBMITTED'), limit(50))));
});

test('assigned reviewer approves atomically; another reviewer cannot use that case', async () => {
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'companion_review_cases/app1'), reviewCase()));
  await assertSucceeds(approve(db('reviewer', { adminRole: 'kyc_reviewer' })));
  assert.equal((await getDoc(doc(db('provider'), 'companion_applications/app1'))).data()?.status, 'APPROVED');
});

test('a reviewer claim and general admin assignment without a case cannot approve', async () => {
  const reviewer = db('reviewer', { adminRole: 'kyc_reviewer' });
  await assertFails(getDoc(doc(reviewer, 'companion_applications/app1')));
  await assertFails(approve(reviewer));
  assert.equal((await getDoc(doc(db('provider'), 'companion_applications/app1'))).data()?.status, 'SUBMITTED');
});

test('revoked or wrong-subject cases cannot authorize a decision', async () => {
  const root = db('root', { adminRole: 'super_admin' });
  await assertSucceeds(assignCase(root));
  await assertFails(updateDoc(doc(root, 'companion_review_cases/app1'), { status: 'REVOKED', version: 2, updatedAt: 'later', revocationAuditId: 'missing-audit' }));
  await assertFails(revokeCase(root, { targetId: 'different-app' }));
  await assertSucceeds(revokeCase(root));
  assert.equal((await getDoc(doc(root, 'admin_audit_logs/case-revoke-app1'))).data()?.caseVersion, 2);
  await assertFails(approve(db('reviewer', { adminRole: 'kyc_reviewer' })));
  await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'companion_review_cases/app1'), { ...reviewCase(), subjectUid: 'other' }));
  await assertFails(approve(db('reviewer', { adminRole: 'kyc_reviewer' })));
});
