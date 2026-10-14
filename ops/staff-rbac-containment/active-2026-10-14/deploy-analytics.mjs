/** Activate the owner-authorized analytics-only Firestore rules candidate. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { activeSource, PROJECT, RELEASE_NAME, request } from '../../payment-containment/release-api.mjs';
import { createHash } from 'node:crypto';

const BASELINE_HASH = '8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f';
const CANDIDATE_HASH = '94249bae2dc106e30b112e3f763a92695bbcf0e9fdb55359b6a3d00cd20b1fd1';
const hash = content => createHash('sha256').update(content).digest('hex');

if (process.argv.slice(2).join(' ') !== '--approved-analytics-deploy' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Require exactly --approved-analytics-deploy and no emulator variables.');
}
const directory = 'ops/staff-rbac-containment/active-2026-10-14';
const [candidate, expectedBaseline] = await Promise.all([
  readFile(`${directory}/candidate.firestore.rules`, 'utf8'),
  readFile(`${directory}/baseline.firestore.rules`, 'utf8'),
]);
assert.equal(hash(candidate), CANDIDATE_HASH, 'Candidate differs from the owner-authorized, tested source.');
assert.equal(hash(expectedBaseline), BASELINE_HASH, 'Saved baseline differs from the approved starting source.');
const before = await activeSource();
assert.equal(hash(before.source), BASELINE_HASH, 'STOP: production baseline drift.');

const evidenceDirectory = `docs/sathi/rollbacks/staff-rbac-analytics-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(evidenceDirectory, { recursive: true });
await writeFile(`${evidenceDirectory}/firestore.rules`, before.source, { flag: 'wx' });
await writeFile(`${evidenceDirectory}/predeploy.json`, JSON.stringify({
  project: PROJECT,
  capturedAt: new Date().toISOString(),
  approval: { source: 'Owner conversation authorization, 2026-10-14: finish the remaining Phase 0–12 stages.', scope: 'analytics read rule only; isResourceAdmin helper' },
  before: { release: before.release, hash: BASELINE_HASH },
  candidate: { path: `${directory}/candidate.firestore.rules`, hash: CANDIDATE_HASH },
  scope: { changedBranches: ['analytics'], changedHelpers: ['isResourceAdmin'], unrelatedSource: 'BYTE_IDENTICAL', firestoreDocuments: 'NOT_MODIFIED', functions: 'NOT_DEPLOYED', storage: 'NOT_MODIFIED', indexes: 'NOT_MODIFIED' },
}, null, 2) + '\n', { flag: 'wx' });

const created = await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`, 'POST', {
  source: { files: [{ name: 'firestore.rules', content: candidate }] },
});
assert.ok(created.name?.startsWith(`projects/${PROJECT}/rulesets/`), 'Ruleset compilation did not return an identity.');
await writeFile(`${evidenceDirectory}/created-ruleset.json`, JSON.stringify({ name: created.name }) + '\n', { flag: 'wx' });

const recheck = await activeSource();
assert.equal(recheck.release.rulesetName, before.release.rulesetName, 'STOP: active ruleset changed before activation.');
assert.equal(recheck.release.updateTime, before.release.updateTime, 'STOP: release changed before activation.');
assert.equal(recheck.source, before.source, 'STOP: active source changed before activation.');

await request(`https://firebaserules.googleapis.com/v1/${RELEASE_NAME}?updateMask=rulesetName`, 'PATCH', {
  release: { name: RELEASE_NAME, rulesetName: created.name },
});
const after = await activeSource();
assert.equal(hash(after.source), CANDIDATE_HASH, 'Active source readback does not match candidate.');
assert.equal(after.release.rulesetName, created.name, 'Active ruleset identity mismatch.');
const result = {
  result: 'DEPLOYED_AND_READBACK_PASS', project: PROJECT, verifiedAt: new Date().toISOString(),
  beforeHash: BASELINE_HASH, candidateHash: CANDIDATE_HASH, beforeRelease: before.release,
  afterRelease: after.release, evidenceDirectory,
  untouched: ['Firestore documents', 'Auth claims', 'Storage', 'indexes', 'Functions', 'Hosting', 'CORS'],
  next: 'Run dedicated-account live SDK acceptance before considering Phase 0 analytics containment qualified.',
};
await writeFile(`${evidenceDirectory}/deployment-result.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
