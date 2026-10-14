/** Finish cleanup for accounts created by one exact booking acceptance run. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { PROJECT, accessToken } from '../payment-containment/release-api.mjs';

const arg = process.argv[2] ?? '';
const match = /^--approved-cleanup-generated-run=(booking-gate-[0-9a-f-]{36})$/.exec(arg);
if (!match || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Require the exact generated booking-gate run ID and no emulator variables.');
}
const run = match[1];
const directory = `ops/booking-containment/.private/${run}`;
const plan = JSON.parse(await readFile(`${directory}/fixture-plan.json`, 'utf8'));
assert.equal(plan.project, PROJECT); assert.equal(plan.run, run);
assert.ok(Array.isArray(plan.accounts) && plan.accounts.length === 3);
const app = initializeApp({ projectId: PROJECT, credential: { async getAccessToken() {
  const token = await accessToken(); return { access_token: token.access_token, expires_in: 3600 };
} } }, `${run}-cleanup`);
const auth = getAuth(app);
const results = [];
try {
  for (const account of plan.accounts) {
    assert.ok(['bookerA', 'bookerB', 'companion'].includes(account.label));
    assert.equal(account.uid, `${run}-${account.label}`);
    assert.equal(account.email, `${account.uid}@example.invalid`);
    try {
      const user = await auth.getUser(account.uid);
      if (user.email?.toLowerCase() !== account.email.toLowerCase()) {
        results.push({ label: account.label, result: 'IDENTITY_MISMATCH', plannedEmailMatches: false });
        continue;
      }
      if (user.customClaims && Object.keys(user.customClaims).length) await auth.setCustomUserClaims(account.uid, {});
      if (!user.disabled) await auth.updateUser(account.uid, { disabled: true });
      await auth.revokeRefreshTokens(account.uid);
      await auth.deleteUser(account.uid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        results.push({ label: account.label, result: 'FAILED', code: error?.code ?? 'unknown' });
        continue;
      }
    }
    try {
      await auth.getUser(account.uid);
      results.push({ label: account.label, result: 'STILL_EXISTS' });
    } catch (error) {
      results.push({ label: account.label, result: error?.code === 'auth/user-not-found' ? 'DELETED' : 'VERIFY_FAILED', code: error?.code ?? 'unknown' });
    }
  }
} finally { await deleteApp(app); }
console.log(JSON.stringify({ run, results, passed: results.every(item => item.result === 'DELETED') }));
if (!results.every(item => item.result === 'DELETED')) process.exitCode = 1;
