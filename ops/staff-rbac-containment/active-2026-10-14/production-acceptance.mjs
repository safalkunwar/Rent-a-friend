/** Dedicated-account SDK acceptance for the analytics-only Firestore rules release. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDocFromServer, setDoc, updateDoc, terminate, setLogLevel } from 'firebase/firestore';
import { PROJECT, activeSource, accessToken } from '../../payment-containment/release-api.mjs';

const CANDIDATE_HASH = '94249bae2dc106e30b112e3f763a92695bbcf0e9fdb55359b6a3d00cd20b1fd1';
const hash = content => createHash('sha256').update(content).digest('hex');
if (process.argv.slice(2).join(' ') !== '--approved-analytics-live-acceptance' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Require exactly --approved-analytics-live-acceptance and no emulator variables.');
}
assert.equal(hash((await activeSource()).source), CANDIDATE_HASH, 'Production rules must match the exact candidate before acceptance.');
const config = JSON.parse(await readFile('firebase-applet-config.json', 'utf8'));
assert.equal(config.projectId, PROJECT);
setLogLevel('silent');

const run = `analytics-gate-${randomUUID()}`;
const privateDirectory = `ops/staff-rbac-containment/.private/${run}`;
const reportDirectory = `docs/sathi/rollbacks/staff-rbac-acceptance-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(privateDirectory, { recursive: true });
const accounts = ['super_admin', 'platform_admin', 'analytics_admin', 'finance_admin', 'read_only_admin', 'customer'].map(adminRole => ({
  adminRole, uid: `${run}-${adminRole}`, email: `${run}-${adminRole}@example.invalid`, password: `${randomUUID()}Aa9!`,
}));
const docId = run;
const fixturePath = `analytics/${docId}`;
await writeFile(`${privateDirectory}/fixture-plan.json`, JSON.stringify({ project: PROJECT, run, accounts: accounts.map(({ adminRole, uid, email }) => ({ adminRole, uid, email })), fixturePath }, null, 2) + '\n', { flag: 'wx' });

const adminApp = initializeAdminApp({ projectId: PROJECT, credential: { async getAccessToken() {
  const token = await accessToken(); return { access_token: token.access_token, expires_in: 3600 };
} } }, run);
const adminAuth = getAdminAuth(adminApp);
const sessions = [];
const createdAccounts = [];
const checks = [];
const cleanupErrors = [];
const documentRoot = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/`;
async function rest(path, method = 'GET', body, updateTime) {
  const token = await accessToken();
  const url = new URL(documentRoot + path);
  if (updateTime) url.searchParams.set('currentDocument.updateTime', updateTime);
  const response = await fetch(url, { method,
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) return { missing: true };
  if (response.status === 204) return {};
  if (!response.ok) throw new Error(`Fixture ${method} failed (${response.status}).`);
  return response.json();
}
async function check(name, operation) { await operation(); checks.push({ name, result: 'PASS' }); }
async function deny(operation) { await assert.rejects(operation, error => error?.code === 'permission-denied'); }
let failed;
try {
  for (const item of accounts) {
    await adminAuth.createUser({ uid: item.uid, email: item.email, password: item.password, displayName: `Disposable SATHI analytics acceptance ${item.adminRole}` });
    createdAccounts.push(item);
    await adminAuth.setCustomUserClaims(item.uid, { role: 'customer', admin: false, adminRole: item.adminRole });
    const app = initializeApp(config, `${run}-${item.adminRole}`);
    const db = (await import('firebase/firestore')).getFirestore(app);
    const session = { ...item, app, db };
    sessions.push(session);
    const signedIn = await signInWithEmailAndPassword(getAuth(app), item.email, item.password);
    assert.equal(signedIn.user.uid, item.uid);
    const claims = (await signedIn.user.getIdTokenResult(true)).claims;
    assert.equal(claims.adminRole, item.adminRole);
    assert.equal(claims.admin, false);
  }

  assert.ok((await rest(fixturePath)).missing, 'Refusing to overwrite a pre-existing analytics fixture.');
  await rest(fixturePath, 'PATCH', { fields: {
    rolloutTestRun: { stringValue: run }, metric: { integerValue: '1' }, label: { stringValue: 'synthetic authorization fixture' },
  } });

  for (const role of ['super_admin', 'platform_admin', 'analytics_admin']) {
    const actor = sessions.find(session => session.adminRole === role);
    await check(`${role} reads analytics from the production server`, async () => {
      const snapshot = await getDocFromServer(doc(actor.db, 'analytics', docId));
      assert.equal(snapshot.data()?.rolloutTestRun, run);
      await deny(updateDoc(doc(actor.db, 'analytics', docId), { metric: 2 }));
      await deny(setDoc(doc(actor.db, 'analytics', `${run}-write-${role}`), { metric: 2 }));
    });
  }
  for (const role of ['finance_admin', 'read_only_admin', 'customer']) {
    const actor = sessions.find(session => session.adminRole === role);
    await check(`${role} is denied analytics read`, () => deny(getDocFromServer(doc(actor.db, 'analytics', docId))));
  }
  await check('live production source still equals the exact candidate', async () => assert.equal(hash((await activeSource()).source), CANDIDATE_HASH));
} catch (error) {
  failed = { code: error?.code ?? 'assertion', message: error?.code ? 'Live operation failed; see acceptance progress.' : error?.message };
  process.exitCode = 1;
} finally {
  try {
    const actual = await rest(fixturePath);
    if (!actual.missing) {
      assert.equal(actual.fields?.rolloutTestRun?.stringValue, run, 'Refusing to delete a fixture not owned by this test.');
      if (!actual.updateTime) throw new Error('Generated analytics fixture has no update time.');
      await rest(fixturePath, 'DELETE', undefined, actual.updateTime);
      assert.ok((await rest(fixturePath)).missing, 'Generated fixture remains after cleanup.');
    }
  } catch { cleanupErrors.push('Generated analytics document cleanup failed.'); }
  for (const item of createdAccounts) {
    try {
      const actual = await adminAuth.getUser(item.uid);
      assert.equal(actual.email?.toLowerCase(), item.email.toLowerCase(), 'Refusing to alter an account not owned by this test.');
      await adminAuth.setCustomUserClaims(item.uid, {});
      await adminAuth.updateUser(item.uid, { disabled: true });
      await adminAuth.revokeRefreshTokens(item.uid);
      await adminAuth.deleteUser(item.uid);
      await assert.rejects(adminAuth.getUser(item.uid), error => error.code === 'auth/user-not-found');
    } catch { cleanupErrors.push(`Generated Auth account cleanup failed: ${item.adminRole}.`); }
  }
  for (const session of sessions) { await terminate(session.db); await deleteApp(session.app); }
  await deleteAdminApp(adminApp);
  if (cleanupErrors.length) process.exitCode = 1;
  const result = {
    result: failed || cleanupErrors.length ? 'FAILED' : 'LIVE_SDK_ACCEPTANCE_PASS',
    project: PROJECT, verifiedAt: new Date().toISOString(), candidateHash: CANDIDATE_HASH,
    checks, failed, cleanup: { passed: cleanupErrors.length === 0, accountsCreated: createdAccounts.length, fixturePaths: 1, errors: cleanupErrors },
    scope: 'DISPOSABLE_AUTH_ACCOUNTS_AND_ONE_GENERATED_ANALYTICS_DOCUMENT; NO CUSTOMER DATA CHANGED',
  };
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(`${reportDirectory}/result.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...result, reportDirectory }));
}
