/** Live SDK checks on generated fixtures only. Never uses a real customer's session. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initializeApp as adminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, deleteDoc, getDocFromServer, getDocsFromServer, collection, query, where, limit, terminate, setLogLevel } from 'firebase/firestore';
import { PROJECT, APPROVED_HASH, activeSource, accessToken } from './release-api.mjs';
import { hash } from './patch.mjs';

if (process.argv.slice(2).join(' ') !== '--approved-live-combined' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Require exactly --approved-live-combined and no emulator variables.');
}
assert.equal(hash((await activeSource()).source), APPROVED_HASH, 'Live rules must match the approved deployed candidate.');
const config = JSON.parse(await readFile('firebase-applet-config.json', 'utf8'));
assert.equal(config.projectId, PROJECT);
setLogLevel('silent');
const run = `ps-gate-${randomUUID()}`;
const directory = `ops/payment-containment/.private/${run}`;
await mkdir(directory, { recursive: true });
const plan = ['owner', 'stranger', 'finance', 'root'].map(label => ({
  label, uid: `${run}-${label}`, email: `${run}-${label}@example.invalid`,
}));
const paymentId = `${run}-existing`;
const paymentIds = [paymentId, ...plan.map(item => `${run}-${item.label}-forged`)];
await writeFile(`${directory}/fixtures.json`, JSON.stringify({ project: PROJECT, run, accounts: plan,
  paymentIds, assignmentIds: plan.map(item => item.uid) }, null, 2) + '\n', { flag: 'wx' });
const trusted = adminApp({ projectId: PROJECT, credential: { async getAccessToken() {
  const token = await accessToken(); return { access_token: token.access_token, expires_in: 3600 };
} } }, run);
const auth = adminAuth(trusted);
const sessions = [];
const checks = [];
const cleanupErrors = [];
const fields = value => Object.fromEntries(Object.entries(value).map(([key, item]) =>
  [key, typeof item === 'number' ? { integerValue: String(item) } : { stringValue: item }]));
const documentRoot = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/`;
async function rest(path, method = 'GET', body) {
  const token = await accessToken();
  const response = await fetch(documentRoot + path, { method,
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) return { missing: true };
  if (!response.ok) throw new Error(`Fixture ${method} failed (${response.status}).`);
  return response.json();
}
async function check(name, operation) { await operation(); checks.push({ name, result: 'PASS' }); }
async function deny(operation) { await assert.rejects(operation, error => error?.code === 'permission-denied'); }
const assignment = (uid, role = 'read_only_admin') => ({ uid, role, updatedAt: new Date().toISOString() });
let failed;
try {
  for (const item of plan) {
    const password = `${randomUUID()}Aa9!`;
    await auth.createUser({ uid: item.uid, email: item.email, password, displayName: `Disposable payment/staff gate ${item.label}` });
    const adminRole = item.label === 'root' ? 'super_admin' : item.label === 'finance' ? 'finance_admin' : 'none';
    await auth.setCustomUserClaims(item.uid, { role: 'customer', admin: false, adminRole });
    const app = initializeApp(config, `${run}-${item.label}`);
    const session = { ...item, app, db: getFirestore(app) };
    sessions.push(session);
    const credential = await signInWithEmailAndPassword(getAuth(app), item.email, password);
    assert.equal(credential.user.uid, item.uid);
    assert.equal((await credential.user.getIdTokenResult(true)).claims.adminRole, adminRole);
  }
  const [owner, stranger, finance, root] = sessions;
  await rest(`payments?documentId=${paymentId}`, 'POST', { fields: fields({
    userId: owner.uid, status: 'pending', amount: 0, currency: 'NPR', rolloutTestRun: run,
  }) });
  await check('owner payment read from server', async () => assert.equal((await getDocFromServer(doc(owner.db, 'payments', paymentId))).data()?.status, 'pending'));
  await check('cross-user payment read denied', () => deny(getDocFromServer(doc(stranger.db, 'payments', paymentId))));
  for (const actor of [finance, root]) await check(`${actor.label} existing payment read retained`, async () => assert.equal((await getDocFromServer(doc(actor.db, 'payments', paymentId))).data()?.status, 'pending'));
  for (const actor of sessions) {
    await check(`${actor.label} payment create denied`, () => deny(setDoc(doc(actor.db, 'payments', `${run}-${actor.label}-forged`), {
      userId: actor.uid, status: 'verified', amount: 0, currency: 'NPR', rolloutTestRun: run,
    })));
    await check(`${actor.label} payment update denied`, () => deny(updateDoc(doc(actor.db, 'payments', paymentId), { status: 'verified' })));
    await check(`${actor.label} payment delete denied`, () => deny(deleteDoc(doc(actor.db, 'payments', paymentId))));
  }
  await check('payment fixture unchanged after denials', async () => {
    const actual = await rest(`payments/${paymentId}`);
    assert.equal(actual.fields?.status?.stringValue, 'pending');
    assert.equal(actual.fields?.amount?.integerValue, '0');
  });
  await check('root creates valid staff assignment', () => setDoc(doc(root.db, 'admins', stranger.uid), assignment(stranger.uid)));
  await check('assigned user reads own role', async () => assert.equal((await getDocFromServer(doc(stranger.db, 'admins', stranger.uid))).data()?.role, 'read_only_admin'));
  await check('root queries exact disposable staff assignment', async () => {
    const found = await getDocsFromServer(query(collection(root.db, 'admins'), where('uid', '==', stranger.uid), limit(1)));
    assert.equal(found.size, 1);
  });
  await check('document-only staff cannot self-promote', () => deny(updateDoc(doc(stranger.db, 'admins', stranger.uid), { role: 'super_admin' })));
  await check('finance cannot self-assign root', () => deny(setDoc(doc(finance.db, 'admins', finance.uid), assignment(finance.uid, 'super_admin'))));
  await check('ordinary customer cannot assign staff', () => deny(setDoc(doc(owner.db, 'admins', owner.uid), assignment(owner.uid, 'super_admin'))));
  await check('root updates typed staff assignment', () => updateDoc(doc(root.db, 'admins', stranger.uid), { role: 'content_admin', updatedAt: new Date().toISOString() }));
  await check('updated assignment persists on server', async () => assert.equal((await getDocFromServer(doc(stranger.db, 'admins', stranger.uid))).data()?.role, 'content_admin'));
  await check('root deletes disposable staff assignment', () => deleteDoc(doc(root.db, 'admins', stranger.uid)));
  await check('assignment deletion persists on server', async () => assert.equal((await getDocFromServer(doc(root.db, 'admins', stranger.uid))).exists(), false));
  await check('active rules remain exact after acceptance', async () => assert.equal(hash((await activeSource()).source), APPROVED_HASH));
} catch (error) {
  failed = { code: error?.code ?? 'assertion', message: error?.code ? 'Live operation failed; see check progress.' : error?.message };
  process.exitCode = 1;
} finally {
  // A generated path AND a fixture ownership check are mandatory before deletion.
  for (const path of [...paymentIds.map(id => `payments/${id}`), ...plan.map(item => `admins/${item.uid}`)]) {
    try {
      const found = await rest(path);
      if (found.missing) continue;
      if (path.startsWith('payments/')) assert.equal(found.fields?.rolloutTestRun?.stringValue, run);
      else {
        const uid = path.split('/')[1];
        assert.ok(plan.some(item => item.uid === uid));
        assert.equal(found.fields?.uid?.stringValue, uid);
        const actual = await auth.getUser(uid);
        assert.equal(actual.email, plan.find(item => item.uid === uid).email);
      }
      assert.ok(found.updateTime);
      await rest(`${path}?currentDocument.updateTime=${encodeURIComponent(found.updateTime)}`, 'DELETE');
      assert.ok((await rest(path)).missing, 'Fixture still present after deletion.');
    } catch { cleanupErrors.push(`Generated document cleanup failed: ${path.split('/')[0]}`); }
  }
  for (const item of plan) {
    try {
      let actual;
      try { actual = await auth.getUser(item.uid); } catch (error) { if (error.code === 'auth/user-not-found') continue; throw error; }
      assert.equal(actual.email, item.email, 'Refusing to alter an account not owned by this test.');
      await auth.setCustomUserClaims(item.uid, {});
      await auth.updateUser(item.uid, { disabled: true });
      await auth.revokeRefreshTokens(item.uid);
      await auth.deleteUser(item.uid);
      await assert.rejects(auth.getUser(item.uid), error => error.code === 'auth/user-not-found');
    } catch { cleanupErrors.push(`Generated Auth cleanup failed: ${item.label}`); }
  }
  for (const session of sessions) { await terminate(session.db); await deleteApp(session.app); }
  await deleteAdminApp(trusted);
  if (cleanupErrors.length) process.exitCode = 1;
  const result = { result: failed || cleanupErrors.length ? 'FAILED' : 'LIVE_SDK_ACCEPTANCE_PASS', project: PROJECT,
    verifiedAt: new Date().toISOString(), candidateHash: APPROVED_HASH, checks, failed,
    cleanup: { passed: cleanupErrors.length === 0, accountsPlanned: plan.length, paymentPathsChecked: paymentIds.length,
      assignmentPathsChecked: plan.length, errors: cleanupErrors },
    scope: 'GENERATED_ACCOUNTS_AND_ZERO_VALUE_NPR_FIXTURES_ONLY; NO_REAL_PAYMENT',
  };
  await writeFile(`${directory}/result.json`, JSON.stringify(result, null, 2) + '\n');
  const reportDirectory = `docs/sathi/rollbacks/payment-staff-acceptance-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(`${reportDirectory}/result.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...result, reportDirectory }));
}
