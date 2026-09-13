import { readFile, writeFile } from 'node:fs/promises';
import { BASELINE_PATH, BASELINE_HASH, hash } from '../payment-containment/patch.mjs';
import { patchAssignments } from './assignment-patch.mjs';
const candidate = patchAssignments(await readFile(BASELINE_PATH, 'utf8'));
await writeFile('ops/staff-containment/assignment-candidate.firestore.rules', candidate);
await writeFile('ops/staff-containment/assignment-manifest.json', JSON.stringify({
  baselinePath: BASELINE_PATH, baselineHash: BASELINE_HASH, candidateHash: hash(candidate),
  changedBranches: ['admins'], changedHelpers: ['sathiAssignmentRoot'],
  status: 'LOCAL_CANDIDATE_NOT_DEPLOYED',
}, null, 2) + '\n');
console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['admins'] }));
