/** Read-only IAM capability check for the scoped Firestore rules rollout. */
import { createRequire } from 'node:module';

if (process.argv.slice(2).join(' ') !== '--approved-read-only') {
  throw new Error('Refusing production access. Pass exactly --approved-read-only after explicit authorization.');
}

const project = 'hamrosathi1';
const permissions = [
  'firebaserules.releases.get',
  'firebaserules.releases.update',
  'firebaserules.rulesets.get',
  'firebaserules.rulesets.create',
  'datastore.entities.get',
  'datastore.entities.delete',
];
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required; no credentials were read or printed.');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const response = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}:testIamPermissions`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ permissions }),
});
if (!response.ok) throw new Error(`IAM test failed (${response.status}); no deployment was attempted.`);
const granted = (await response.json()).permissions ?? [];
console.log(JSON.stringify({
  result: 'PASS', project,
  granted: permissions.map(permission => ({ permission, granted: granted.includes(permission) })),
  deployAuthorized: permissions.slice(1).every(permission => granted.includes(permission)),
}));
