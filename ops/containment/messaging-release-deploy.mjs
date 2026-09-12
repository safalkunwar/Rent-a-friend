/**
 * Explicit, candidate-only Firestore Rules API deployment with mandatory
 * baseline recheck and immediate active-source readback. It never touches
 * Storage, indexes, Functions, Hosting, Auth, or Firestore documents.
 */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { BASELINE_HASH } from './messaging-favorites-patch.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-deploy') {
  throw new Error('Refusing deployment. Pass exactly --approved-deploy after explicit authorization.');
}

const project = 'hamrosathi1';
const candidatePath = 'ops/containment/candidate.firestore.rules';
const candidate = await readFile(candidatePath, 'utf8');
const hash = source => createHash('sha256').update(source).digest('hex');
const candidateHash = hash(candidate);
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required; no credentials were read or printed.');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const request = async (url, method = 'GET', body) => {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!response.ok) throw new Error(`Rules API ${method} failed (${response.status}): ${data.error?.message ?? 'no details'}`);
  return data;
};
const activeSource = async () => {
  const release = await request(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
  if (release.name !== `projects/${project}/releases/cloud.firestore` || !release.rulesetName) throw new Error('Unexpected Firestore release identity.');
  const ruleset = await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  if (!Array.isArray(ruleset.source?.files) || ruleset.source.files.length !== 1) throw new Error('Expected exactly one active Firestore source file.');
  return { release, source: ruleset.source.files[0].content };
};

const before = await activeSource();
const beforeHash = hash(before.source);
if (beforeHash !== BASELINE_HASH) {
  throw new Error(`STOP: active rules drifted. Expected ${BASELINE_HASH}, received ${beforeHash}.`);
}
const created = await request(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, 'POST', {
  source: { files: [{ name: 'firestore.rules', content: candidate }] },
});
if (!created.name) throw new Error('Rules API did not return a ruleset name; release was not updated.');
const released = await request(
  `https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore?updateMask=rulesetName`,
  'PATCH', { release: { name: before.release.name, rulesetName: created.name } },
);
const after = await activeSource();
const afterHash = hash(after.source);
if (afterHash !== candidateHash || after.source !== candidate) {
  throw new Error(`STOP: post-deploy active source mismatch. Active ${afterHash}; expected ${candidateHash}. Do not roll back automatically.`);
}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const resultDir = `docs/sathi/rollbacks/messaging-release-${stamp}`;
await mkdir(resultDir, { recursive: true });
await writeFile(`${resultDir}/deployment-result.json`, JSON.stringify({
  mode: 'SCOPED_RULES_DEPLOY_AND_READBACK', project, deployedAt: new Date().toISOString(),
  before: { release: { name: before.release.name, rulesetName: before.release.rulesetName, updateTime: before.release.updateTime }, hash: beforeHash },
  candidate: { path: candidatePath, hash: candidateHash },
  createdRuleset: created.name,
  releaseResponse: { name: released.name, rulesetName: released.rulesetName, updateTime: released.updateTime },
  after: { release: { name: after.release.name, rulesetName: after.release.rulesetName, updateTime: after.release.updateTime }, hash: afterHash },
  untouched: ['Storage', 'indexes', 'Functions', 'Hosting', 'Auth', 'Firestore documents'],
}, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ result: 'PASS', project, beforeHash, candidateHash, createdRuleset: created.name, activeRelease: after.release, resultDir }));
