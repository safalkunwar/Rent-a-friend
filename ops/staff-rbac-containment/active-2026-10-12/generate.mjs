import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { activeSource, PROJECT } from '../../payment-containment/release-api.mjs';
import { helperOld, helperNew, analyticsOld, analyticsNew } from '../patch.mjs';

const EXPECTED_ACTIVE_HASH = '8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f';
const OUTPUT_DIR = new URL('./', import.meta.url);
const hash = (content) => createHash('sha256').update(content).digest('hex');
const occurrences = (text, fragment) => text.split(fragment).length - 1;

const snapshot = await activeSource();
assert.equal(snapshot.release.name, `projects/${PROJECT}/releases/cloud.firestore`);
const baseline = snapshot.source;
const baselineHash = hash(baseline);
assert.equal(baselineHash, EXPECTED_ACTIVE_HASH, 'Active rules changed; stop and review a fresh baseline.');
assert.equal(occurrences(baseline, helperOld), 1, 'Expected exactly one known helper anchor.');
assert.equal(occurrences(baseline, analyticsOld), 1, 'Expected exactly one analytics branch anchor.');

const candidate = baseline.replace(helperOld, helperNew).replace(analyticsOld, analyticsNew);
assert.notEqual(candidate, baseline);
const candidateHash = hash(candidate);
const manifest = {
  mode: 'LOCAL_ANALYTICS_AUTHORITY_REBASE_CANDIDATE',
  project: PROJECT,
  release: snapshot.release,
  baselineHash,
  candidateHash,
  changedBranches: ['analytics'],
  changedHelpers: ['isResourceAdmin'],
  sourceOutsideScopedPatch: 'BYTE_IDENTICAL',
  deployment: 'NOT_PERFORMED',
  approval: 'NOT_REQUESTED',
  note: 'Local candidate composed from current production readback after the booking/lock release. This does not authorize a rules release.',
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(new URL('baseline.firestore.rules', OUTPUT_DIR), baseline, { flag: 'wx' });
await writeFile(new URL('candidate.firestore.rules', OUTPUT_DIR), candidate, { flag: 'wx' });
await writeFile(new URL('manifest.json', OUTPUT_DIR), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ baselineHash, candidateHash, changedBranches: manifest.changedBranches }));
