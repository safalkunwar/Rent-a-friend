/** Read-only verifier for one generated messaging rollout run. */
import { createRequire } from 'node:module';

const runArg = process.argv.find(arg => arg.startsWith('--run='));
const run = runArg?.slice('--run='.length);
if (!process.argv.includes('--approved-read-only') || !run || !/^messaging-rollout-[0-9a-f-]{36}$/.test(run)) {
  throw new Error('Require --approved-read-only and one generated --run=messaging-rollout-UUID.');
}
const project = 'hamrosathi1';
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth.js');
const account = auth.getGlobalDefaultAccount();
if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required.');
const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
async function count(collectionId) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        select: { fields: [{ fieldPath: 'rolloutTestRun' }] },
        where: { fieldFilter: { field: { fieldPath: 'rolloutTestRun' }, op: 'EQUAL', value: { stringValue: run } } },
        limit: 10,
      },
    }),
  });
  if (!response.ok) throw new Error(`Cleanup verification failed (${response.status}) for ${collectionId}.`);
  const rows = await response.json();
  return rows.filter(row => row.document).length;
}
const counts = Object.fromEntries(await Promise.all(['users', 'companions', 'conversations', 'messages'].map(async collection => [collection, await count(collection)])));
if (Object.values(counts).some(value => value !== 0)) throw new Error(`Generated fixtures remain: ${JSON.stringify(counts)}`);
console.log(JSON.stringify({ result: 'PASS', project, run, counts }));
