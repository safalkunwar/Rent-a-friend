/** Read-only post-deployment verifier for the scoped messaging rules release. */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

if (process.argv.slice(2).join(' ') !== '--approved-read-only') {
  throw new Error('Refusing production access. Pass exactly --approved-read-only after explicit authorization.');
}

const project = 'hamrosathi1';
const candidatePath = 'ops/containment/candidate.firestore.rules';
const candidate = await readFile(candidatePath, 'utf8');
const hash = source => createHash('sha256').update(source).digest('hex');
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

const release = await request(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
if (release.name !== `projects/${project}/releases/cloud.firestore` || !release.rulesetName) throw new Error('Unexpected Firestore release identity.');
const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
if (!Array.isArray(ruleset.source?.files) || ruleset.source.files.length !== 1) throw new Error('Expected exactly one active Firestore rules source file.');
const active = ruleset.source.files[0].content;
const activeHash = hash(active);
const candidateHash = hash(candidate);
if (activeHash !== candidateHash || active !== candidate) {
  throw new Error(`STOP: active Firestore rules do not equal the candidate. Active ${activeHash}; expected ${candidateHash}.`);
}
console.log(JSON.stringify({ result: 'PASS', project, release: { name: release.name, rulesetName: release.rulesetName, updateTime: release.updateTime }, activeHash, candidateHash }));
