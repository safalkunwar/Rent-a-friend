import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAuthority } from '../ops/companion-authority-containment/inventory.mjs';

const str = value => ({ stringValue: value });
const yes = { booleanValue: true };

test('classifies canonical approvals and duplicate applications without exporting identifiers', () => {
  const users = new Map([
    ['secret-uid', { companionStatus: str('APPROVED'), companionApprovalApplicationId: str('app-secret') }],
    ['other-uid', { companionStatus: str('PENDING') }],
  ]);
  const companions = new Map([
    ['secret-uid', { userId: str('secret-uid'), isVerified: yes, approvalApplicationId: str('app-secret'), name: str('private name') }],
  ]);
  const applications = new Map([
    ['app-secret', { userId: str('secret-uid'), status: str('APPROVED'), kyc: str('private document') }],
    ['app-extra', { userId: str('secret-uid'), status: str('DRAFT') }],
  ]);
  const admins = new Map([['reviewer-secret', { role: str('kyc_reviewer') }]]);
  const result = summarizeAuthority({ users, companions, applications, admins });
  assert.equal(result.approvedApplicationWithMatchingPointers, 1);
  assert.equal(result.profileStoredUserIdMatchesExistingUser, 1);
  assert.equal(result.usersWithMultipleApplications, 1);
  assert.equal(result.assignedKycReviewers, 1);
  const output = JSON.stringify(result);
  for (const privateValue of ['secret-uid', 'app-secret', 'private name', 'private document', 'reviewer-secret']) {
    assert.equal(output.includes(privateValue), false);
  }
});

test('flags missing/noncanonical profile links and unknown status as fixed buckets', () => {
  const users = new Map([['uidA', { companionStatus: str('APPROVED') }]]);
  const companions = new Map([['old-id', { userId: str('uidA'), isVerified: yes }]]);
  const applications = new Map([['appA', { userId: str('uidA'), status: str('APPROVED') }],
    ['appB', { userId: str('stranger'), status: str('PRIVATE_USER_TEXT') }]]);
  const result = summarizeAuthority({ users, companions, applications, admins: new Map() });
  assert.equal(result.profileNoncanonicalUserId, 1);
  assert.equal(result.profileStoredUserIdMatchesExistingUser, 1);
  assert.equal(result.approvedUserWithoutVerifiedCanonicalProfile, 1);
  assert.equal(result.approvedApplicationWithNoncanonicalProfile, 1);
  assert.equal(result.applicationStatus.OTHER_OR_MISSING, 1);
  assert.equal(JSON.stringify(result).includes('PRIVATE_USER_TEXT'), false);
});

test('reports conflicting historical profile targets only as aggregate counts', () => {
  const users = new Map([['uidA', {}], ['old-id', {}]]);
  const companions = new Map([
    ['old-id', { userId: str('uidA') }],
    ['another-old-id', { userId: str('uidA') }],
    ['uidA', { userId: str('uidA') }],
  ]);
  const result = summarizeAuthority({ users, companions, applications: new Map(), admins: new Map() });
  assert.equal(result.usersWithMultipleProfiles, 1);
  assert.equal(result.profileIdCollidesWithDifferentUser, 1);
  assert.equal(result.noncanonicalProfileWithOccupiedTarget, 2);
  assert.equal(JSON.stringify(result).includes('uidA'), false);
});
