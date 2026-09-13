import { readFile, writeFile } from 'node:fs/promises';
import { BASELINE_PATH, BASELINE_HASH, patchPayments, hash } from './patch.mjs';

const source = await readFile(BASELINE_PATH, 'utf8');
const candidate = patchPayments(source);
await writeFile('ops/payment-containment/candidate.firestore.rules', candidate);
await writeFile('ops/payment-containment/manifest.json', JSON.stringify({
  baselinePath: BASELINE_PATH, baselineHash: BASELINE_HASH, candidateHash: hash(candidate),
  changedBranches: ['payments'], changedHelpers: [],
  status: 'LOCAL_CANDIDATE_NOT_DEPLOYED',
}, null, 2) + '\n');
console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['payments'] }));
