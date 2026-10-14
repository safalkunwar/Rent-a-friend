/** Live SDK acceptance on uniquely generated accounts and reversible fixtures only. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initializeApp as adminApp, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDocFromServer, updateDoc, terminate, setLogLevel } from 'firebase/firestore';
import { reserveBooking, transitionBooking } from '../../src/services/bookingTransactions.ts';
import { PROJECT, activeSource, accessToken } from '../payment-containment/release-api.mjs';
import { hash } from './patch.mjs';

const CANDIDATE_HASH = '8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f';
if (process.argv.slice(2).join(' ') !== '--approved-booking-live-acceptance' || process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('Require exactly --approved-booking-live-acceptance and no emulator variables.');
}
assert.equal(hash((await activeSource()).source), CANDIDATE_HASH, 'Live rules must match the exact approved candidate.');
const config = JSON.parse(await readFile('firebase-applet-config.json', 'utf8'));
assert.equal(config.projectId, PROJECT);
setLogLevel('silent');
const run = `booking-gate-${randomUUID()}`;
const privateDirectory = `ops/booking-containment/.private/${run}`;
const reportDirectory = `docs/sathi/rollbacks/booking-acceptance-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(privateDirectory, { recursive: true });
const accounts = ['bookerA', 'bookerB', 'companion'].map(label => ({
  label, uid: `${run}-${label}`, email: `${run}-${label}@example.invalid`, password: `${randomUUID()}Aa9!`,
}));
const [bookerA, bookerB, companion] = accounts;
const bookingIds = [`${run}-a`, `${run}-b`];
const date = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const lockId = `lock_${companion.uid}_${date.replace(/[^a-zA-Z0-9]/g, '_')}`;
const plannedPaths = [
  `users/${bookerA.uid}`, `users/${bookerB.uid}`, `users/${companion.uid}`, `companions/${companion.uid}`,
  ...bookingIds.map(id => `bookings/${id}`), `booking_locks/${lockId}`,
];
await writeFile(`${privateDirectory}/fixture-plan.json`, JSON.stringify({ project: PROJECT, run, accounts: accounts.map(({ label, uid, email }) => ({ label, uid, email })), plannedPaths }, null, 2) + '\n', { flag: 'wx' });

const trusted = adminApp({ projectId: PROJECT, credential: { async getAccessToken() {
  const token = await accessToken(); return { access_token: token.access_token, expires_in: 3600 };
} } }, run);
const auth = adminAuth(trusted);
const sessions = [];
const checks = [];
const createdAccounts = [];
const cleanupErrors = [];
const documentRoot = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/`;
async function rest(path, method = 'GET', body, precondition) {
  const token = await accessToken();
  const url = new URL(documentRoot + path);
  if (precondition) url.searchParams.set('currentDocument.updateTime', precondition);
  const response = await fetch(url, { method,
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  if (response.status === 404) return { missing: true };
  if (!response.ok) throw new Error(`Fixture ${method} failed (${response.status}).`);
  return response.status === 204 ? {} : response.json();
}
const fv = value => typeof value === 'boolean' ? { booleanValue: value } : typeof value === 'number'
  ? { integerValue: String(value) } : { stringValue: value };
async function seed(path, data) {
  assert.ok(path.startsWith('users/') || path.startsWith('companions/'), 'Only auth profile fixtures may be seeded.');
  assert.ok(path.split('/')[1].startsWith(run), 'Fixture path must use this run identity.');
  assert.ok((await rest(path)).missing, `Refusing to overwrite existing fixture path ${path.split('/')[0]}.`);
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, fv(value)]));
  await rest(path, 'PATCH', { fields });
}
async function check(name, operation) { await operation(); checks.push({ name, result: 'PASS' }); }
async function deny(operation) { await assert.rejects(operation, error => error?.code === 'permission-denied'); }
const bookingInput = (uid, id) => ({ id, userId: uid, companionId: companion.uid, date, time: '10:00', duration: 1,
  participants: 1, status: 'pending', totalPrice: 0, meetingPoint: 'SATHI temporary acceptance',
  userNameAtBooking: 'Disposable acceptance account', userPhoneAtBooking: '9800000000', createdAt: 'fixture' });
let failed;
try {
  for (const item of accounts) {
    await auth.createUser({ uid: item.uid, email: item.email, password: item.password, displayName: `Disposable SATHI booking acceptance ${item.label}` });
    createdAccounts.push(item);
    const role = item.label === 'companion' ? 'companion' : 'customer';
    await auth.setCustomUserClaims(item.uid, { role, admin: false, adminRole: 'none' });
    const app = initializeApp(config, `${run}-${item.label}`);
    const session = { ...item, app, db: (await import('firebase/firestore')).getFirestore(app) };
    sessions.push(session);
    const credential = await signInWithEmailAndPassword(getAuth(app), item.email, item.password);
    assert.equal(credential.user.uid, item.uid);
    assert.equal((await credential.user.getIdTokenResult(true)).claims.adminRole, 'none');
  }
  await seed(`users/${bookerA.uid}`, { role: 'customer', status: 'ACTIVE', rolloutTestRun: run });
  await seed(`users/${bookerB.uid}`, { role: 'customer', status: 'ACTIVE', rolloutTestRun: run });
  await seed(`users/${companion.uid}`, { role: 'companion', status: 'ACTIVE', companionStatus: 'APPROVED', rolloutTestRun: run });
  await seed(`companions/${companion.uid}`, { userId: companion.uid, isVerified: true, hourlyRate: 500, rolloutTestRun: run });

  const [a, b, provider] = sessions;
  await check('real customer booking transaction creates paired pending booking and lock', async () => {
    assert.equal(await reserveBooking(a.db, a.uid, bookingInput(a.uid, bookingIds[0])), bookingIds[0]);
    const booking = (await getDocFromServer(doc(a.db, 'bookings', bookingIds[0]))).data();
    const lock = (await getDocFromServer(doc(a.db, 'booking_locks', lockId))).data();
    assert.equal(booking?.policyVersion, 2); assert.equal(booking?.paymentStatus, 'not_started');
    assert.equal(booking?.quotedTotalPaisa, 55000); assert.equal(booking?.totalPrice, 550);
    assert.equal(lock?.bookingId, bookingIds[0]); assert.equal(lock?.status, 'pending');
  });
  await check('another customer cannot read or rewrite the booking', async () => {
    await deny(getDocFromServer(doc(b.db, 'bookings', bookingIds[0])));
    await deny(updateDoc(doc(b.db, 'bookings', bookingIds[0]), { paymentStatus: 'verified' }));
  });
  await check('companion confirms and customer cancels through paired transitions', async () => {
    await transitionBooking(provider.db, provider.uid, bookingIds[0], 'confirmed');
    await transitionBooking(a.db, a.uid, bookingIds[0], 'cancelled');
    assert.equal((await getDocFromServer(doc(a.db, 'booking_locks', lockId))).data()?.status, 'cancelled');
  });
  await check('a new customer can reuse a cancelled reservation lock', async () => {
    assert.equal(await reserveBooking(b.db, b.uid, bookingInput(b.uid, bookingIds[1])), bookingIds[1]);
    assert.equal((await getDocFromServer(doc(b.db, 'booking_locks', lockId))).data()?.bookingId, bookingIds[1]);
  });
  await check('active production rules still match the exact candidate', async () => assert.equal(hash((await activeSource()).source), CANDIDATE_HASH));
} catch (error) {
  failed = { code: error?.code ?? 'assertion', message: error?.code ? 'Live operation failed; see check progress.' : error?.message };
  process.exitCode = 1;
} finally {
  // Clean only generated paths, after proving ownership and values belong to this run.
  for (const path of [...plannedPaths].reverse()) {
    try {
      const found = await rest(path);
      if (found.missing) continue;
      if (path.startsWith('users/') || path.startsWith('companions/')) {
        assert.equal(found.fields?.rolloutTestRun?.stringValue, run);
      } else if (path.startsWith('bookings/')) {
        const id = path.split('/')[1];
        assert.ok(bookingIds.includes(id) && id.startsWith(run));
        assert.equal(found.fields?.id?.stringValue, id);
        assert.ok([bookerA.uid, bookerB.uid].includes(found.fields?.userId?.stringValue));
        assert.equal(found.fields?.companionUid?.stringValue, companion.uid);
      } else {
        assert.ok(lockId.startsWith(`lock_${run}-companion_`));
        assert.ok(bookingIds.includes(found.fields?.bookingId?.stringValue));
        assert.equal(found.fields?.companionId?.stringValue, companion.uid);
      }
      assert.ok(found.updateTime);
      await rest(path, 'DELETE', undefined, found.updateTime);
      assert.ok((await rest(path)).missing, 'Fixture still present after deletion.');
    } catch { cleanupErrors.push(`Generated Firestore cleanup failed: ${path.split('/')[0]}`); }
  }
  for (const item of createdAccounts) {
    try {
      const actual = await auth.getUser(item.uid);
      assert.equal(actual.email?.toLowerCase(), item.email.toLowerCase(), 'Refusing to alter an account not owned by this test.');
      await auth.setCustomUserClaims(item.uid, {});
      await auth.updateUser(item.uid, { disabled: true });
      await auth.revokeRefreshTokens(item.uid);
      await auth.deleteUser(item.uid);
      await assert.rejects(auth.getUser(item.uid), error => error.code === 'auth/user-not-found');
    } catch (error) { cleanupErrors.push(`Generated Auth account cleanup failed: ${item.label} (${error?.code ?? 'unknown'}).`); }
  }
  for (const session of sessions) { await terminate(session.db); await deleteApp(session.app); }
  await deleteAdminApp(trusted);
  if (cleanupErrors.length) process.exitCode = 1;
  const result = { result: failed || cleanupErrors.length ? 'FAILED' : 'LIVE_SDK_ACCEPTANCE_PASS', project: PROJECT,
    verifiedAt: new Date().toISOString(), candidateHash: CANDIDATE_HASH, checks, failed,
    cleanup: { passed: cleanupErrors.length === 0, accountsCreated: createdAccounts.length, generatedDocumentPaths: plannedPaths.length,
      errors: cleanupErrors }, scope: 'DISPOSABLE_AUTH_ACCOUNTS_AND_GENERATED_BOOKING_FIXTURES_ONLY; PAYMENT_NOT_STARTED; NO_CHARGE' };
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(`${reportDirectory}/result.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  await writeFile(`${privateDirectory}/result.json`, JSON.stringify({ ...result, run }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...result, reportDirectory }));
}
