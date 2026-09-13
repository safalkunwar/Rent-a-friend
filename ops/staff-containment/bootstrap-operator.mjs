/** Owner-authorized single-account bootstrap. No rules or app data changes. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { selectOperatorAccount, bootstrapClaims } from './operator-bootstrap-policy.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-bootstrap-operator') {
  throw new Error('Requires exactly --approved-bootstrap-operator after owner authorization.');
}
const require = createRequire(import.meta.url);
const cliAuth = require('firebase-tools/lib/auth.js');
const account = cliAuth.getGlobalDefaultAccount();
if (!account?.user?.email || !account?.tokens?.refresh_token) throw new Error('Authenticated operator required.');
const app = initializeApp({ projectId: 'hamrosathi1', credential: {
  async getAccessToken() {
    const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
    return { access_token: token.access_token, expires_in: 3600 };
  },
} }, 'sathi-owner-authorized-bootstrap');
try {
  const auth = getAuth(app);
  const page = await auth.listUsers(1000);
  const selected = selectOperatorAccount(account.user.email, page.users, !page.pageToken);
  const before = await auth.getUser(selected.uid);
  selectOperatorAccount(account.user.email, [before], true);
  const oldClaims = before.customClaims ?? {};
  const nextClaims = bootstrapClaims(oldClaims);
  if (isDeepStrictEqual(oldClaims, nextClaims)) {
    console.log(JSON.stringify({ result: 'ALREADY_CONFIGURED', uid: selected.uid, role: 'super_admin', mutation: false }));
  } else {
    const directory = `ops/staff-containment/.private/bootstrap-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}/rollback.json`, JSON.stringify({ project: 'hamrosathi1', uid: selected.uid,
      savedAt: new Date().toISOString(), customClaims: oldClaims, intendedClaims: nextClaims }, null, 2) + '\n', { flag: 'wx' });
    const recheck = await auth.getUser(selected.uid);
    selectOperatorAccount(account.user.email, [recheck], true);
    if (!isDeepStrictEqual(recheck.customClaims ?? {}, oldClaims)) throw new Error('Claims changed during preparation; stop and re-review.');
    await auth.setCustomUserClaims(selected.uid, nextClaims);
    const after = await auth.getUser(selected.uid);
    if (!isDeepStrictEqual(after.customClaims, nextClaims)) throw new Error('Readback mismatch; do not overwrite a concurrent change.');
    await writeFile(`${directory}/result.json`, JSON.stringify({ project: 'hamrosathi1', uid: selected.uid,
      verifiedAt: new Date().toISOString(), result: 'CLAIMS_READBACK_PASS', changedFields: ['adminRole'],
      unrelatedClaimsPreserved: true, tokensRequireRefresh: true }, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ result: 'CLAIMS_READBACK_PASS', uid: selected.uid, role: 'super_admin',
      rollbackDirectory: directory, unrelatedClaimsPreserved: true, tokensRequireRefresh: true }));
  }
} finally { await deleteApp(app); }
