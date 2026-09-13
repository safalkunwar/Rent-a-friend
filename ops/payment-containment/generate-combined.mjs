import { readFile, writeFile } from 'node:fs/promises';
import { BASELINE_PATH, BASELINE_HASH, hash } from './patch.mjs';
import { composeContainment } from './combined.mjs';
const candidate = composeContainment(await readFile(BASELINE_PATH, 'utf8'));
await writeFile('ops/payment-containment/combined-candidate.firestore.rules', candidate);
await writeFile('ops/payment-containment/combined-manifest.json', JSON.stringify({
  baselinePath: BASELINE_PATH, baselineHash: BASELINE_HASH, candidateHash: hash(candidate),
  changedBranches: ['payments', 'admins'], changedHelpers: ['sathiAssignmentRoot'],
  status: 'LOCAL_COMBINED_CANDIDATE_NOT_DEPLOYED',
}, null, 2) + '\n');
console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['payments', 'admins'] }));
