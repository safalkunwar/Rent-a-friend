import { readFile, writeFile } from 'node:fs/promises';
import { BASELINE_PATH, BASELINE_HASH, BOOKING_HASH, hash, patchCompanionAuthority } from './patch.mjs';

const baseline = await readFile(BASELINE_PATH, 'utf8');
const booking = await readFile('ops/booking-containment/candidate.firestore.rules', 'utf8');
const candidate = patchCompanionAuthority(baseline, BASELINE_HASH);
const combined = patchCompanionAuthority(booking, BOOKING_HASH);
await writeFile('ops/companion-authority-containment/candidate.firestore.rules', candidate);
await writeFile('ops/companion-authority-containment/booking-combined.firestore.rules', combined);
await writeFile('ops/companion-authority-containment/manifest.json', JSON.stringify({
  mode: 'LOCAL_COMPANION_AUTHORITY_CONTAINMENT_CANDIDATE',
  project: 'hamrosathi1', baselinePath: BASELINE_PATH, baselineHash: BASELINE_HASH,
  bookingInputHash: BOOKING_HASH, candidateHash: hash(candidate), combinedHash: hash(combined),
  changedBranches: ['users', 'companions', 'companion_applications'],
  changedHelpers: ['sathiAuthority*'],
  deployment: 'NOT_PERFORMED',
  limitations: 'Narrow client containment, not a backend-authoritative Phase 1 approval command or complete staff RBAC.',
}, null, 2) + '\n');
console.log(JSON.stringify({ candidateHash: hash(candidate), combinedHash: hash(combined) }));
