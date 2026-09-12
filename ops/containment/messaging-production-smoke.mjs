/**
 * Explicit live acceptance for the scoped messaging release. Creates only
 * generated test accounts/data and cleans exact marked fixtures in finally.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import {
  getFirestore, doc, setDoc, updateDoc, getDocFromServer, getDocsFromServer,
  collection, query, where, orderBy, limit, documentId, startAfter, runTransaction,
} from 'firebase/firestore';

if (!process.argv.includes('--project=hamrosathi1') || !process.argv.includes('--live') ||
  !process.argv.includes('--approved-live') || process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Refusing run. Require --project=hamrosathi1 --live --approved-live and no emulator.');
}

const project = 'hamrosathi1';
const config = JSON.parse(await readFile('firebase-applet-config.json', 'utf8'));
assert.equal(config.projectId, project);
const run = `messaging-rollout-${randomUUID()}`;
const text = 'Temporary messaging release verification.';
const now = () => new Date().toISOString();
const accounts = [];
const created = { users: [], companions: [], conversations: [], messages: [] };
const results = { run };
const require = createRequire(import.meta.url);
const firebaseAuth = require('firebase-tools/lib/auth.js');
const cliAccount = firebaseAuth.getGlobalDefaultAccount();
if (!cliAccount?.tokens?.refresh_token) throw new Error('Firebase CLI login is required for exact-fixture cleanup.');
const cleanupToken = await firebaseAuth.getAccessToken(cliAccount.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);

async function createAccount(label) {
  const app = initializeApp(config, `${run}-${label}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const email = `${run}-${label}@example.invalid`;
  const password = `${randomUUID()}Aa9!`;
  const user = (await createUserWithEmailAndPassword(auth, email, password)).user;
  const account = { label, app, auth, db, email, password, uid: user.uid };
  accounts.push(account);
  const profile = doc(db, 'users', user.uid);
  await setDoc(profile, { name: `Messaging rollout ${label}`, role: 'customer', avatar: '', rolloutTestRun: run, createdAt: now() });
  created.users.push(user.uid);
  return account;
}

async function mustDeny(action) {
  await assert.rejects(action, error => error?.code === 'permission-denied');
}

async function cleanupDocument(path, predicate) {
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`;
  const headers = { Authorization: `Bearer ${cleanupToken.access_token}`, 'X-Goog-User-Project': project };
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (response.status === 404) return;
  assert.equal(response.status, 200, `cleanup read failed for generated ${path}`);
  const data = await response.json();
  assert.ok(predicate(data.fields ?? {}), `refusing to delete unverified ${path}`);
  const removed = await fetch(`${url}?currentDocument.updateTime=${encodeURIComponent(data.updateTime)}`, {
    method: 'DELETE', headers, signal: AbortSignal.timeout(15000),
  });
  assert.equal(removed.status, 200, `cleanup delete failed for generated ${path}`);
}

try {
  const a = await createAccount('A');
  const b = await createAccount('B');
  const c = await createAccount('C');
  const companionPath = `companions/${b.uid}`;
  await setDoc(doc(b.db, companionPath), { userId: b.uid, name: 'Messaging rollout companion B', rolloutTestRun: run, createdAt: now() });
  created.companions.push(b.uid);

  const members = [a.uid, b.uid].sort();
  const conversationId = members.join('_');
  const conversationRef = doc(a.db, 'conversations', conversationId);
  assert.equal((await getDocFromServer(conversationRef)).exists(), false, 'view-equivalent precondition: no parent before first send');
  const createdAt = now();
  await runTransaction(a.db, async tx => {
    const existing = await tx.get(conversationRef);
    assert.equal(existing.exists(), false, 'generated pair unexpectedly existed');
    tx.set(conversationRef, { id: conversationId, participantIds: members, unreadCount: 0, createdAt, updatedAt: createdAt, rolloutTestRun: run });
  });
  created.conversations.push(conversationId);
  const firstParent = await getDocFromServer(conversationRef);
  assert.equal(firstParent.data()?.participantIds?.join('|'), members.join('|'));

  const messageId = `message-${randomUUID()}`;
  const timestamp = now();
  await runTransaction(a.db, async tx => {
    const parent = await tx.get(conversationRef);
    assert.equal(parent.exists(), true);
    tx.set(doc(a.db, 'messages', messageId), {
      id: messageId, conversationId, senderId: a.uid, text, timestamp, isRead: false, rolloutTestRun: run,
    });
    tx.update(conversationRef, {
      unreadCount: 1, updatedAt: timestamp,
      lastMessage: { id: messageId, conversationId, senderId: a.uid, text, timestamp, isRead: false },
    });
  });
  created.messages.push(messageId);

  const bInbox = await getDocsFromServer(query(collection(b.db, 'conversations'),
    where('participantIds', 'array-contains', b.uid), orderBy(documentId()), limit(100)));
  assert.ok(bInbox.docs.some(snapshot => snapshot.id === conversationId));
  const bCursor = await getDocsFromServer(query(collection(b.db, 'conversations'),
    where('participantIds', 'array-contains', b.uid), orderBy(documentId()), startAfter(conversationId), limit(100)));
  assert.ok(!bCursor.docs.some(snapshot => snapshot.id === conversationId));
  const bHistory = await getDocsFromServer(query(collection(b.db, 'messages'),
    where('conversationId', '==', conversationId), orderBy('timestamp', 'asc'), limit(10)));
  assert.ok(bHistory.docs.some(snapshot => snapshot.id === messageId));
  await updateDoc(doc(b.db, 'conversations', conversationId), { unreadCount: 0, updatedAt: now() });
  const afterRead = (await getDocFromServer(doc(b.db, 'conversations', conversationId))).data();
  assert.equal(afterRead.unreadCount, 0);
  assert.equal(afterRead.participantIds.join('|'), members.join('|'));
  assert.equal(afterRead.createdAt, createdAt);
  results.twoUserPersistence = { parentCreatedOnFirstSend: true, bInbox: true, bHistory: true, unreadFieldsOnly: true };

  const freshApp = initializeApp(config, `${run}-B-refresh`);
  try {
    const freshAuth = getAuth(freshApp);
    await signInWithEmailAndPassword(freshAuth, b.email, b.password);
    const freshDb = getFirestore(freshApp);
    assert.equal((await getDocFromServer(doc(freshDb, 'conversations', conversationId))).exists(), true);
    assert.ok((await getDocsFromServer(query(collection(freshDb, 'messages'), where('conversationId', '==', conversationId), orderBy('timestamp', 'asc'), limit(10)))).docs.some(snapshot => snapshot.id === messageId));
  } finally { await deleteApp(freshApp); }
  results.refresh = { sameParent: true, sameHistory: true };

  await mustDeny(getDocFromServer(doc(c.db, 'conversations', conversationId)));
  await mustDeny(getDocsFromServer(query(collection(c.db, 'conversations'),
    where('participantIds', 'array-contains', a.uid), orderBy(documentId()), limit(100))));
  await mustDeny(setDoc(doc(c.db, 'messages', `outsider-${randomUUID()}`), {
    id: `outsider-${randomUUID()}`, conversationId, senderId: c.uid, text, timestamp: now(), isRead: false,
  }));
  results.outsider = { read: 'DENIED', query: 'DENIED', send: 'DENIED' };
  console.log(JSON.stringify({ stage: 'LIVE_CHECKS_PASSED', ...results }));
} catch (error) {
  console.error(JSON.stringify({ stage: 'LIVE_CHECK_FAILED', code: error?.code ?? 'assertion', message: error?.message, results }));
  process.exitCode = 1;
} finally {
  const cleanupErrors = [];
  try {
    for (const id of created.messages) await cleanupDocument(`messages/${id}`, fields => fields.rolloutTestRun?.stringValue === run);
    for (const id of created.conversations) await cleanupDocument(`conversations/${id}`, fields =>
      fields.rolloutTestRun?.stringValue === run && fields.participantIds?.arrayValue?.values?.length === 2);
    for (const id of created.companions) await cleanupDocument(`companions/${id}`, fields => fields.rolloutTestRun?.stringValue === run && fields.userId?.stringValue === id);
    for (const uid of created.users) await cleanupDocument(`users/${uid}`, fields => fields.rolloutTestRun?.stringValue === run);
  } catch (error) { cleanupErrors.push(error?.message ?? 'fixture cleanup failure'); }
  for (const account of accounts) {
    try {
      await signInWithEmailAndPassword(account.auth, account.email, account.password);
      if (account.auth.currentUser) await deleteUser(account.auth.currentUser);
    } catch (error) { cleanupErrors.push(`Auth ${account.label}: ${error?.code ?? error?.message}`); }
    await deleteApp(account.app);
  }
  console.log(JSON.stringify({ stage: 'CLEANUP', onlyGeneratedFixtures: true, errors: cleanupErrors.length }));
  if (cleanupErrors.length) process.exitCode = 1;
}
