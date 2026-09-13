import { readFile, writeFile } from 'node:fs/promises';
import { hash, patchStaffRbac, ACTIVE_SOURCE, ACTIVE_HASH } from './patch.mjs';

const source = await readFile(ACTIVE_SOURCE, 'utf8');
if (hash(source) !== ACTIVE_HASH) {
  console.error(`Baseline hash mismatch: expected ${ACTIVE_HASH}, got ${hash(source)}`);
  process.exit(1);
}

const candidate = patchStaffRbac(source);
await writeFile('ops/staff-rbac-containment/candidate.firestore.rules', candidate);
await writeFile('ops/staff-rbac-containment/manifest.json', JSON.stringify({
  mode: 'LOCAL_STAFF_RBAC_CONTAINMENT_CANDIDATE',
  project: 'hamrosathi1',
  baselinePath: ACTIVE_SOURCE,
  baselineHash: ACTIVE_HASH,
  candidateHash: hash(candidate),
  changedBranches: ['analytics'],
  changedHelpers: ['isResourceAdmin'],
  deployment: 'NOT_PERFORMED',
  scopeNote: 'Starts from active deployed source 764eb7a3... Only analytics read and isResourceAdmin helper change; all other source bytes preserved.',
}, null, 2) + '\n');

console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['analytics'], changedHelpers: ['isResourceAdmin'] }));
