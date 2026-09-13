/** Exact owner-approved two-branch deployment; never uses root Firebase config. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { BASELINE_HASH, hash } from './patch.mjs';
import { composeContainment } from './combined.mjs';
import { PROJECT, APPROVED_HASH, RELEASE_NAME, request, activeSource, accessToken, operatorAccount } from './release-api.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-deploy-combined' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Require exactly --approved-deploy-combined and no emulator variables.');
}
const candidatePath = 'ops/payment-containment/combined-candidate.firestore.rules';
const candidate = await readFile(candidatePath, 'utf8');
assert.equal(hash(candidate), APPROVED_HASH, 'Candidate differs from the exact approved source.');
const before = await activeSource();
assert.equal(hash(before.source), BASELINE_HASH, 'STOP: production baseline drift.');
assert.equal(candidate, composeContainment(before.source), 'STOP: unreviewed semantic changes.');

// Assignment inventory was empty at review. Do not silently invalidate a new staff workflow.
const assignments = await request(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/admins?pageSize=1`);
assert.equal(assignments.documents?.length ?? 0, 0, 'STOP: staff assignment inventory changed; re-review compatibility.');
assert.ok(!assignments.nextPageToken);
const app = initializeApp({ projectId: PROJECT, credential: { async getAccessToken() {
  const token = await accessToken(); return { access_token: token.access_token, expires_in: 3600 };
} } }, 'sathi-combined-release-root-check');
try {
  const operator = await getAuth(app).getUserByEmail(operatorAccount().user.email);
  assert.ok(operator.emailVerified && !operator.disabled && operator.customClaims?.adminRole === 'super_admin', 'Verified recovery operator must retain explicit root claims.');
} finally { await deleteApp(app); }

const directory = `docs/sathi/rollbacks/payment-staff-release-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/firestore.rules`, before.source, { flag: 'wx' });
await writeFile(`${directory}/predeploy.json`, JSON.stringify({ project: PROJECT, capturedAt: new Date().toISOString(),
  before: { release: before.release, hash: BASELINE_HASH }, candidate: { path: candidatePath, hash: APPROVED_HASH },
  semanticDiff: { branches: ['payments', 'admins'], helpers: ['sathiAssignmentRoot'], unrelatedSource: 'BYTE_IDENTICAL' },
  assignmentsAtGate: 0, recoveryOperatorVerified: true,
}, null, 2) + '\n', { flag: 'wx' });

const created = await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`, 'POST', {
  source: { files: [{ name: 'firestore.rules', content: candidate }] },
});
assert.ok(created.name?.startsWith(`projects/${PROJECT}/rulesets/`), 'Missing new ruleset identity; no release activation.');
await writeFile(`${directory}/created-ruleset.json`, JSON.stringify({ name: created.name }) + '\n', { flag: 'wx' });
const recheck = await activeSource();
assert.equal(recheck.release.rulesetName, before.release.rulesetName, 'STOP: release changed before activation.');
assert.equal(recheck.release.updateTime, before.release.updateTime);
assert.equal(recheck.source, before.source);

// Never retry an uncertain activation automatically. Inspect live source first.
await request(`https://firebaserules.googleapis.com/v1/${RELEASE_NAME}?updateMask=rulesetName`, 'PATCH', {
  release: { name: RELEASE_NAME, rulesetName: created.name },
});
const after = await activeSource();
assert.equal(after.source, candidate, 'STOP: active-source readback mismatch; no automatic insecure rollback.');
assert.equal(after.release.rulesetName, created.name);
const result = { result: 'DEPLOYED_AND_READBACK_PASS', project: PROJECT, verifiedAt: new Date().toISOString(),
  beforeHash: BASELINE_HASH, candidateHash: APPROVED_HASH, after: after.release, directory,
  untouched: ['Firestore documents', 'Auth claims', 'Storage', 'indexes', 'Functions', 'Hosting', 'CORS'],
};
await writeFile(`${directory}/deployment-result.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
