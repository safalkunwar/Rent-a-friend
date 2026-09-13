import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readFileSync } from 'node:fs';
import { readFile as readAsync } from 'node:fs/promises';
import { hash, patchBookingLocks, ACTIVE_SOURCE, ACTIVE_HASH } from '../ops/booking-containment/patch.mjs';

const CANDIDATE_HASH = '3976a456593afb7a2630f015a7dd8c69a150b843c7a4cd115d1d5004ea3ed6ee';

describe('Booking lock containment — static contract', () => {
  test('candidate hash matches manifest', async () => {
    const candidate = await readAsync('ops/booking-containment/candidate.firestore.rules', 'utf8');
    const manifest = JSON.parse(await readAsync('ops/booking-containment/manifest.json', 'utf8'));
    assert.equal(manifest.candidateHash, hash(candidate));
    assert.equal(manifest.baselineHash, ACTIVE_HASH);
  });

  test('candidate composed from active source', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    assert.equal(hash(source), ACTIVE_HASH);
    const candidate = patchBookingLocks(source);
    assert.equal(hash(candidate), CANDIDATE_HASH);
  });

  test('patch is reversible', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchBookingLocks(source);
    assert.notEqual(candidate, source);

    const lockBlock = `    // Booking Locks Collection: /booking_locks/{lockId}
    match /booking_locks/{lockId} {
      allow read: if isAuthenticated();
      allow create: if isBookingAdmin() &&
        !exists(/databases/$(database)/documents/booking_locks/$(lockId)) &&
        request.resource.data.keys().hasAll(['bookingId','companionId','date','status','updatedAt']) &&
        request.resource.data.keys().hasOnly(['bookingId','companionId','date','status','updatedAt']) &&
        request.resource.data.status == 'pending' &&
        request.resource.data.companionId is string &&
        request.resource.data.companionId.size() > 0 &&
        request.resource.data.date is string &&
        request.resource.data.date.matches('^\\\\d{4}-\\\\d{2}-\\\\d{2}$') &&
        request.resource.data.updatedAt is string;
      allow update: if isBookingAdmin() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']) &&
        request.resource.data.updatedAt is string &&
        (
          (resource.data.status == 'pending' && request.resource.data.status in ['confirmed', 'cancelled']) ||
          (resource.data.status == 'confirmed' && request.resource.data.status in ['active', 'cancelled']) ||
          (resource.data.status == 'active' && request.resource.data.status in ['completed', 'cancelled'])
        );
      allow delete: if isBookingAdmin();
    }`;

    const originalBlock = `    // Booking Locks Collection: /booking_locks/{lockId}
    match /booking_locks/{lockId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && !exists(/databases/$(database)/documents/booking_locks/$(lockId));
      allow update, delete: if isAdmin();
    }`;

    const restored = candidate.replace(lockBlock, originalBlock);
    assert.equal(restored, source);
  });

  test('patch requires baseline and rejects drift', async () => {
    const source = (await readAsync(ACTIVE_SOURCE, 'utf8')).replace('booking_locks', 'booking_locs');
    assert.throws(() => patchBookingLocks(source), /Booking lock block not found/);
  });

  test('unchanged bytes outside booking_locks', async () => {
    const source = await readAsync(ACTIVE_SOURCE, 'utf8');
    const candidate = patchBookingLocks(source);

    const oldBlock = `    // Booking Locks Collection: /booking_locks/{lockId}
    match /booking_locks/{lockId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && !exists(/databases/$(database)/documents/booking_locks/$(lockId));
      allow update, delete: if isAdmin();
    }`;

    const beforeIdx = source.indexOf(oldBlock);
    assert.notEqual(beforeIdx, -1);

    const before = source.slice(0, beforeIdx);

    const reviewsIdx = source.indexOf('    // Reviews Collection:', beforeIdx);
    assert.notEqual(reviewsIdx, -1);

    const after = source.slice(reviewsIdx);

    const candBefore = candidate.slice(0, candidate.indexOf('    // Booking Locks Collection:', 0));
    assert.equal(candBefore, before,
      'Source must be byte-identical before the booking_locks branch');

    const candAfter = candidate.slice(candidate.indexOf('    // Reviews Collection:', 0));
    assert.equal(candAfter, after,
      'Source must be byte-identical after the booking_locks branch');
  });

  test('new rules use isBookingAdmin not isAdmin for lock writes', () => {
    const candidate = readFileSync('ops/booking-containment/candidate.firestore.rules', 'utf8');
    const lockStart = candidate.indexOf('// Booking Locks Collection');
    const lockEnd = candidate.indexOf('// Reviews Collection');
    const lockSection = candidate.slice(lockStart, lockEnd);

    assert.match(lockSection, /isBookingAdmin\(\)/);
    assert.doesNotMatch(lockSection, /allow create: if isAuthenticated\(\)/);
    assert.doesNotMatch(lockSection, /allow update, delete: if isAdmin\(\)/);
  });
});
