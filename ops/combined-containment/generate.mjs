import { readFile, writeFile } from 'node:fs/promises';
import { hash, patchCombined, ACTIVE_SOURCE, ACTIVE_HASH } from './patch.mjs';

throw new Error('This five-branch draft failed emulator compatibility/security review. Do not regenerate or deploy it. See docs/sathi/CONTINUATION_REPAIR_RESULT_2026-09-14.md for the tested booking and analytics replacements.');

const source = await readFile(ACTIVE_SOURCE, 'utf8');
if (hash(source) !== ACTIVE_HASH) {
  console.error(`Baseline hash mismatch: expected ${ACTIVE_HASH}, got ${hash(source)}`);
  process.exit(1);
}

const candidate = patchCombined(source);
await writeFile('ops/combined-containment/candidate.firestore.rules', candidate);
await writeFile('ops/combined-containment/manifest.json', JSON.stringify({
  mode: 'LOCAL_COMBINED_CONTAINMENT_CANDIDATE',
  project: 'hamrosathi1',
  baselinePath: ACTIVE_SOURCE,
  baselineHash: ACTIVE_HASH,
  candidateHash: hash(candidate),
  changedBranches: ['analytics', 'auditLogs', 'suspiciousActivity', 'sosAlerts', 'booking_locks'],
  changedHelpers: ['isResourceAdmin'],
  deployment: 'NOT_PERFORMED',
  scopeNote: 'Starts from active deployed source 764eb7a3... Does not use the unsafe archived booking draft. Only the listed branches and the isResourceAdmin helper change; all other source bytes preserved.',
}, null, 2) + '\n');

console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['analytics', 'auditLogs', 'suspiciousActivity', 'sosAlerts', 'booking_locks'] }));
