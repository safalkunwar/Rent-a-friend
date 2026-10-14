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
assert.equal(hash(snapshot.source), EXPECTED_ACTIVE_HASH, 'Active rules changed; stop and review a fresh baseline.');
assert.equal(occurrences(snapshot.source, helperOld), 1, 'Expected exactly one known helper anchor.');
assert.equal(occurrences(snapshot.source, analyticsOld), 1, 'Expected exactly one analytics branch anchor.');

const candidate = snapshot.source.replace(helperOld, helperNew).replace(analyticsOld, analyticsNew);
const manifest = {
  mode: 'LOCAL_ANALYTICS_AUTHORITY_REBASE_CANDIDATE',
  project: PROJECT,
  release: snapshot.release,
  baselineHash: hash(snapshot.source),
  candidateHash: hash(candidate),
  changedBranches: ['analytics'],
  changedHelpers: ['isResourceAdmin'],
  sourceOutsideScopedPatch: 'BYTE_IDENTICAL',
  deployment: 'NOT_PERFORMED',
  approval: 'NOT_REQUESTED',
  note: 'Fresh candidate composed from the production source read on 2026-10-14. This does not authorize a rules release.',
};

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(new URL('baseline.firestore.rules', OUTPUT_DIR), snapshot.source),
  writeFile(new URL('candidate.firestore.rules', OUTPUT_DIR), candidate),
  writeFile(new URL('manifest.json', OUTPUT_DIR), `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(new URL('firebase.emulator.json', OUTPUT_DIR), `${JSON.stringify({
    firestore: { rules: 'candidate.firestore.rules' },
    emulators: { firestore: { host: '127.0.0.1', port: 8087 }, ui: { enabled: false }, singleProjectMode: true },
  }, null, 2)}\n`),
]);
console.log(JSON.stringify({ baselineHash: manifest.baselineHash, candidateHash: manifest.candidateHash, changedBranches: manifest.changedBranches }));
