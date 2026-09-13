import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const ACTIVE_SOURCE = 'docs/sathi/rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z/firestore.rules';
const ACTIVE_HASH = '764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402';
const OUTPUT = 'ops/booking-containment/candidate.firestore.rules';

export function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function patchBookingLocks(source) {
  const oldBlock = `    // Booking Locks Collection: /booking_locks/{lockId}
    match /booking_locks/{lockId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && !exists(/databases/$(database)/documents/booking_locks/$(lockId));
      allow update, delete: if isAdmin();
    }`;

  const newBlock = `    // Booking Locks Collection: /booking_locks/{lockId}
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

  if (!source.includes(oldBlock)) throw new Error('Booking lock block not found in source; baseline may have drifted.');
  return source.replace(oldBlock, () => newBlock);
}

export { ACTIVE_SOURCE, ACTIVE_HASH };

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = await readFile(ACTIVE_SOURCE, 'utf8');
  if (hash(source) !== ACTIVE_HASH) throw new Error(`Baseline hash mismatch: expected ${ACTIVE_HASH}, got ${hash(source)}`);
  const candidate = patchBookingLocks(source);
  await writeFile(OUTPUT, candidate);
  console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: ['booking_locks'] }));
}
