import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { patchBookingLocks, hash, ACTIVE_SOURCE, ACTIVE_HASH } from './patch.mjs';

const source = await readFile(ACTIVE_SOURCE, 'utf8');
if (hash(source) !== ACTIVE_HASH) {
  console.error(`Baseline hash mismatch: expected ${ACTIVE_HASH}, got ${hash(source)}`);
  process.exit(1);
}

const candidate = patchBookingLocks(source);
await writeFile('ops/booking-containment/candidate.firestore.rules', candidate);
await writeFile('ops/booking-containment/manifest.json', JSON.stringify({
  mode: 'LOCAL_BOOKING_LOCK_CONTAINMENT_CANDIDATE',
  project: 'hamrosathi1',
  baselinePath: ACTIVE_SOURCE,
  baselineHash: ACTIVE_HASH,
  candidateHash: hash(candidate),
  changedBranches: ['booking_locks'],
  changedHelpers: [],
  deployment: 'NOT_PERFORMED',
  scopeNote: 'Starts from active deployed source 764eb7a3... Does not use the unsafe archived booking draft.',
}, null, 2) + '\n');

console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['booking_locks'] }));
