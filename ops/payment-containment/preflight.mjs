/** Read-only live comparison; this command cannot activate a ruleset. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { request } from '../media-rollout/production-api.mjs';
import { BASELINE_HASH, hash, patchPayments, containedPayments, originalPayments } from './patch.mjs';
import { composeContainment } from './combined.mjs';
import { containedAssignments, originalAssignments } from '../staff-containment/assignment-patch.mjs';

const mode = process.argv.slice(2).join(' ');
const combined = mode === '--approved-read-only --combined';
if (!combined && mode !== '--approved-read-only') {
  throw new Error('Pass exactly --approved-read-only; no live write mode exists.');
}
const project = 'hamrosathi1';
const releaseName = `projects/${project}/releases/cloud.firestore`;
const release = await request(`https://firebaserules.googleapis.com/v1/${releaseName}`);
if (release.name !== releaseName || !release.rulesetName?.startsWith(`projects/${project}/rulesets/`)) {
  throw new Error('Unexpected active release identity.');
}
const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
if (ruleset.source?.files?.length !== 1 || typeof ruleset.source.files[0].content !== 'string') {
  throw new Error('Expected one active Firestore source file.');
}
const source = ruleset.source.files[0].content;
const candidate = await readFile(`ops/payment-containment/${combined ? 'combined-' : ''}candidate.firestore.rules`, 'utf8');
const expected = combined ? composeContainment(source) : patchPayments(source); // Refuse live baseline drift.
let restored = candidate.replace(containedPayments, originalPayments);
if (combined) restored = restored.replace(containedAssignments, originalAssignments);
if (candidate !== expected || restored !== source) {
  throw new Error('Candidate has unreviewed changes outside the exact payments replacement.');
}
const recheck = await request(`https://firebaserules.googleapis.com/v1/${releaseName}`);
if (recheck.rulesetName !== release.rulesetName || recheck.updateTime !== release.updateTime) {
  throw new Error('Active release changed during capture. Repeat review.');
}
const directory = `docs/sathi/rollbacks/payment-preflight-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/firestore.rules`, source, { flag: 'wx' });
const manifest = {
  mode: 'READ_ONLY_PAYMENT_CONTAINMENT_GATE', project, capturedAt: new Date().toISOString(),
  release: { name: release.name, rulesetName: release.rulesetName, updateTime: release.updateTime },
  baselineHash: BASELINE_HASH, candidateHash: hash(candidate),
  semanticDiff: { changedBranches: combined ? ['payments', 'admins'] : ['payments'], changedHelpers: combined ? ['sathiAssignmentRoot'] : [],
    reads: combined ? 'PAYMENTS_UNCHANGED; ADMINS_ROOT_LIST_ADDED; OWN_LOOKUP_PRESERVED' : 'UNCHANGED',
    paymentWrites: 'DENY_ALL_CLIENT_CREATES_UPDATES_DELETES',
    ...(combined ? { assignmentWrites: 'EXPLICIT_TRUSTED_ROOT_ONLY; VALIDATED_PAYLOAD' } : {}), unrelatedSource: 'BYTE_IDENTICAL' },
  deployment: 'NOT_PERFORMED',
  untouched: ['Firestore documents', 'Auth', 'Storage', 'indexes', 'Functions', 'Hosting', 'CORS'],
};
await writeFile(`${directory}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ result: 'PASS', directory, ...manifest }));
