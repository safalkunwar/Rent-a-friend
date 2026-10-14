/** Activate only the owner-approved booking/lock Firestore rules candidate. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ACTIVE_HASH, hash } from './patch.mjs';
import { PROJECT, RELEASE_NAME, request, activeSource } from '../payment-containment/release-api.mjs';

const APPROVED_CANDIDATE_HASH = '8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f';
if (process.argv.slice(2).join(' ') !== '--approved-booking-deploy' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Require exactly --approved-booking-deploy and no emulator variables.');
}
const candidatePath = 'ops/booking-containment/candidate.firestore.rules';
const candidate = await readFile(candidatePath, 'utf8');
assert.equal(hash(candidate), APPROVED_CANDIDATE_HASH, 'Candidate differs from the owner-approved source.');
const before = await activeSource();
assert.equal(hash(before.source), ACTIVE_HASH, 'STOP: production baseline drift.');

const directory = `docs/sathi/rollbacks/booking-release-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/firestore.rules`, before.source, { flag: 'wx' });
await writeFile(`${directory}/predeploy.json`, JSON.stringify({ project: PROJECT, capturedAt: new Date().toISOString(),
  before: { release: before.release, hash: ACTIVE_HASH }, candidate: { path: candidatePath, hash: APPROVED_CANDIDATE_HASH },
  scope: { branches: ['bookings', 'booking_locks'], helpers: ['sathiBooking*'], unrelatedSource: 'BYTE_IDENTICAL',
    firestoreDocuments: 'NOT_MODIFIED', migration: 'NOT_PERFORMED', functions: 'NOT_DEPLOYED' },
}, null, 2) + '\n', { flag: 'wx' });

// Creating a Ruleset validates syntax and compilation without activating it.
const created = await request(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}/rulesets`, 'POST', {
  source: { files: [{ name: 'firestore.rules', content: candidate }] },
});
assert.ok(created.name?.startsWith(`projects/${PROJECT}/rulesets/`), 'Ruleset compilation did not return an identity.');
await writeFile(`${directory}/created-ruleset.json`, JSON.stringify({ name: created.name }) + '\n', { flag: 'wx' });

// Re-read immediately before activation and abort on any intervening change.
const recheck = await activeSource();
assert.equal(recheck.release.rulesetName, before.release.rulesetName, 'STOP: active ruleset changed before activation.');
assert.equal(recheck.release.updateTime, before.release.updateTime, 'STOP: Firestore release changed before activation.');
assert.equal(recheck.source, before.source, 'STOP: active source changed before activation.');

// An uncertain PATCH is never retried or automatically rolled back.
await request(`https://firebaserules.googleapis.com/v1/${RELEASE_NAME}?updateMask=rulesetName`, 'PATCH', {
  release: { name: RELEASE_NAME, rulesetName: created.name },
});
const after = await activeSource();
assert.equal(after.source, candidate, 'STOP: active-source readback mismatch; inspect manually.');
assert.equal(after.release.rulesetName, created.name, 'STOP: active ruleset identity mismatch.');
const result = { result: 'DEPLOYED_AND_READBACK_PASS', project: PROJECT, verifiedAt: new Date().toISOString(),
  beforeHash: ACTIVE_HASH, candidateHash: APPROVED_CANDIDATE_HASH, beforeRelease: before.release, afterRelease: after.release,
  directory, untouched: ['Firestore documents', 'Auth claims', 'Storage', 'indexes', 'Functions', 'Hosting', 'CORS'] };
await writeFile(`${directory}/deployment-result.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result));
