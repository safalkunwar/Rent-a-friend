import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login required');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const headers = { Authorization: `Bearer ${token.access_token}` };
const get = async url => { const result = await fetch(url, { headers }); if (!result.ok) throw new Error(`Read failed ${result.status}: ${url}`); return result.json(); };
const project = 'hamrosathi1';
const folder = `docs/sathi/rollbacks/${new Date().toISOString().replace(/[:.]/g, '-')}-media-social`;
await mkdir(folder, { recursive: true });
const manifest = {};
for (const [name, releaseName] of [['firestore', 'cloud.firestore'], ['storage', 'firebase.storage/hamrosathi1.firebasestorage.app']]) {
  const release = await get(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/${releaseName}`);
  const rules = await get(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  if (rules.source.files.length !== 1) throw new Error('Unexpected multi-file ruleset');
  const content = rules.source.files[0].content;
  await writeFile(`${folder}/${name}.rules`, content);
  manifest[name] = { ...release, sha256: createHash('sha256').update(content).digest('hex') };
}
await writeFile(`${folder}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ rollback: folder, releases: manifest }));
for (const [name, url] of [
  ['billing', `https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`],
  ['appCheck', `https://firebaseappcheck.googleapis.com/v1/projects/932995524964/services`],
  ['recaptcha', `https://recaptchaenterprise.googleapis.com/v1/projects/${project}/keys`],
  ['authDomains', `https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`],
  ['apiKeys', `https://apikeys.googleapis.com/v2/projects/932995524964/locations/global/keys`],
]) {
  try {
    const data = await get(url);
    console.log(JSON.stringify({ name, data: name === 'authDomains' ? { authorizedDomains: data.authorizedDomains } : data }));
  } catch (error) { console.log(JSON.stringify({ name, error: error.message })); }
}
