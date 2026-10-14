/** Read-only booking compatibility inventory; stores counts, never private booking fields. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { activeSource, request, PROJECT } from '../payment-containment/release-api.mjs';
import { hash, ACTIVE_HASH, patchBookingLocks } from './patch.mjs';
const mode = process.argv.slice(2).join(' ');
const preRelease = mode === '--approved-read-only';
const postRelease = mode === '--approved-post-release-read-only';
if (!preRelease && !postRelease) throw new Error('Require an exact read-only pre-release or post-release mode.');
const CANDIDATE_HASH = '8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f';
const before = await activeSource();
assert.equal(hash(before.source), preRelease ? ACTIVE_HASH : CANDIDATE_HASH, 'STOP: production rules drifted.');
const candidate = await readFile('ops/booking-containment/candidate.firestore.rules', 'utf8');
if (preRelease) assert.equal(candidate, patchBookingLocks(before.source), 'STOP: candidate scope differs.');
else assert.equal(candidate, before.source, 'STOP: deployed source differs from the exact candidate.');
async function inventory(collection, fields) {
  const records = new Map();
  let token = '';
  do {
    const params = new URLSearchParams({ pageSize: '200' });
    for (const field of fields) params.append('mask.fieldPaths', field);
    if (token) params.set('pageToken', token);
    const page = await request(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}?${params}`);
    for (const document of page.documents ?? []) records.set(document.name.split('/').at(-1), document.fields ?? {});
    token = page.nextPageToken ?? '';
    if (records.size >= 1000) throw new Error('Inventory reached safety cap; no completeness claim.');
  } while (token);
  return records;
}
const [bookings, locks] = await Promise.all([
  inventory('bookings', ['policyVersion', 'status', 'paymentStatus', 'userId', 'companionId', 'companionUid', 'date']),
  inventory('booking_locks', ['bookingId', 'companionId', 'date', 'status']),
]);
const str = (record, key) => record?.[key]?.stringValue;
const counts = { bookings: bookings.size, locks: locks.size, v2: 0, legacyOrOtherVersion: 0,
  missingBookingIdentity: 0, v2NoncanonicalCompanion: 0, orphanLocks: 0, mismatchedLockFields: 0,
  noncanonicalLockIds: 0, v2MissingOrDifferentLock: 0, statusCounts: {}, paymentStatusCounts: {} };
const increment = (map, value) => { const key = value ?? 'MISSING'; map[key] = (map[key] ?? 0) + 1; };
for (const [id, book] of bookings) {
  const v2 = book.policyVersion?.integerValue === '2';
  counts[v2 ? 'v2' : 'legacyOrOtherVersion']++;
  // Do not save arbitrary string values supplied by customers; only known enums/counts.
  const status = str(book, 'status');
  const payment = str(book, 'paymentStatus');
  increment(counts.statusCounts, ['pending','confirmed','active','completed','cancelled'].includes(status) ? status : 'OTHER_OR_MISSING');
  increment(counts.paymentStatusCounts, ['not_started','pending','verified','failed','refunded'].includes(payment) ? payment : 'OTHER_OR_MISSING');
  const companionId = str(book, 'companionId'); const date = str(book, 'date');
  if (!str(book, 'userId') || !companionId || !date) counts.missingBookingIdentity++;
  if (v2 && companionId !== str(book, 'companionUid')) counts.v2NoncanonicalCompanion++;
  if (v2 && status !== 'cancelled') {
    const lock = locks.get(`lock_${companionId}_${date?.replace(/[^a-zA-Z0-9]/g, '_')}`);
    if (!lock || str(lock, 'bookingId') !== id) counts.v2MissingOrDifferentLock++;
  }
}
for (const [id, lock] of locks) {
  const booking = bookings.get(str(lock, 'bookingId'));
  if (!booking) counts.orphanLocks++;
  else if (['companionId', 'date', 'status'].some(field => str(lock, field) !== str(booking, field))) counts.mismatchedLockFields++;
  const expected = `lock_${str(lock, 'companionId')}_${str(lock, 'date')?.replace(/[^a-zA-Z0-9]/g, '_')}`;
  if (id !== expected) counts.noncanonicalLockIds++;
}
const after = await activeSource();
assert.equal(after.source, before.source, 'Production changed during inventory.');
assert.equal(after.release.rulesetName, before.release.rulesetName);
const directory = `docs/sathi/rollbacks/booking-compatibility-${new Date().toISOString().replace(/[:.]/g, '-')}`;
await mkdir(directory, { recursive: true });
await writeFile(`${directory}/firestore.rules`, before.source, { flag: 'wx' });
const result = { mode: postRelease ? 'POST_RELEASE_BOOKING_COMPATIBILITY_READ_ONLY' : 'PRE_RELEASE_BOOKING_COMPATIBILITY_READ_ONLY', project: PROJECT, capturedAt: new Date().toISOString(),
  activeHash: hash(before.source), candidateHash: hash(candidate), release: before.release, completeUnderCap: true,
  inventoryConsistency: 'BOUNDED_PAGED_READS_NOT_AN_ATOMIC_DATABASE_SNAPSHOT', counts,
  semanticDiff: { branches: ['bookings', 'booking_locks'], helperPrefix: 'sathiBooking', unrelatedSource: 'BYTE_IDENTICAL' },
  deployment: postRelease ? 'ACTIVE_SOURCE_READBACK_VERIFIED' : 'NOT_PERFORMED', migration: 'NOT_PERFORMED',
};
await writeFile(`${directory}/manifest.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ...result, directory }));
