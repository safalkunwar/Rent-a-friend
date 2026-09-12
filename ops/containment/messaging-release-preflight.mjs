/**
 * Read-only production release preflight for the approved messaging/favorites
 * candidate. It creates a local rollback copy only after confirming the active
 * Firestore source is exactly the reviewed baseline. It never deploys rules,
 * indexes, Functions, Storage rules, or application assets.
 *
 * Run only with explicit production-read authority:
 *   node ops/containment/messaging-release-preflight.mjs --approved-read-only
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { patchMessagingFavoritesRules, BASELINE_HASH } from './messaging-favorites-patch.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-read-only') {
  throw new Error('Refusing production access. Pass exactly --approved-read-only after explicit authorization.');
}

const project = 'hamrosathi1';
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required; no credentials were read or printed.');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const request = async (url) => {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!response.ok) throw new Error(`Read failed (${response.status}) for ${url}`);
  return response.json();
};
const hash = source => createHash('sha256').update(source).digest('hex');

const release = await request(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
if (release.name !== `projects/${project}/releases/cloud.firestore` || !release.rulesetName) {
  throw new Error('Unexpected Firestore release identity.');
}
const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
if (!Array.isArray(ruleset.source?.files) || ruleset.source.files.length !== 1) {
  throw new Error('Expected exactly one active Firestore rules source file.');
}
const activeRules = ruleset.source.files[0].content;
const activeHash = hash(activeRules);
if (activeHash !== BASELINE_HASH) {
  throw new Error(`STOP: active Firestore rules drifted. Expected ${BASELINE_HASH}, received ${activeHash}.`);
}

const candidatePath = 'ops/containment/candidate.firestore.rules';
const diskCandidate = await readFile(candidatePath, 'utf8');
const generatedCandidate = patchMessagingFavoritesRules(activeRules);
if (hash(diskCandidate) !== hash(generatedCandidate)) {
  throw new Error('STOP: disk candidate differs from the deterministic reviewed patch.');
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const rollbackDir = `docs/sathi/rollbacks/messaging-release-${stamp}`;
await mkdir(rollbackDir, { recursive: true });
await writeFile(`${rollbackDir}/firestore.rules`, activeRules, 'utf8');
await writeFile(`${rollbackDir}/manifest.json`, JSON.stringify({
  mode: 'READ_ONLY_PREFLIGHT_NO_DEPLOY', project, capturedAt: new Date().toISOString(),
  release: { name: release.name, rulesetName: release.rulesetName, updateTime: release.updateTime },
  activeHash, candidatePath, candidateHash: hash(diskCandidate),
  deploymentConfig: 'ops/containment/firebase.messaging-release.json',
}, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({
  result: 'PASS', project, activeHash, candidateHash: hash(diskCandidate), rollbackDir,
  next: 'No deployment was performed. Obtain explicit deployment authorization and complete the documented two-user acceptance gate.',
}));
