import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { patchMessagingFavoritesRules } from './messaging-favorites-patch.mjs';

const baselinePath = 'docs/sathi/rollbacks/phase-00-2026-09-10/firestore.rules';
const candidatePath = 'ops/containment/candidate.firestore.rules';
const expectedHash = '5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013';

const baseline = await readFile(baselinePath, 'utf8');
const baselineHash = createHash('sha256').update(baseline).digest('hex');

if (baselineHash !== expectedHash) {
  throw new Error(`Baseline hash mismatch! Expected ${expectedHash}, got ${baselineHash}`);
}

// Messaging/favorites ONLY. Never apply the separate, unapproved payments draft.
const candidate = patchMessagingFavoritesRules(baseline);
const candidateHash = createHash('sha256').update(candidate).digest('hex');

await writeFile(candidatePath, candidate, 'utf8');
await writeFile('ops/containment/messaging-favorites.manifest.json', JSON.stringify({
  scope: 'messaging-favorites-only',
  status: 'LOCAL_CANDIDATE_NOT_DEPLOYED',
  baselinePath, baselineHash, candidatePath, candidateHash,
  changedBranches: ['users/{uid}/favorites', 'conversations (including typing)', 'messages (membership guards only)'],
  preservedDraftPath: 'ops/containment/staff-payments.DRAFT.firestore.rules',
  preservedDraftHash: 'ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd',
}, null, 2) + '\n', 'utf8');

console.log('Baseline hash (production):  ', baselineHash);
console.log('Messaging-only candidate:   ', candidateHash);
console.log(`Generated ${candidatePath} successfully.`);
