import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const ACTIVE_SOURCE = 'ops/payment-containment/combined-candidate.firestore.rules';
const ACTIVE_HASH = '764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402';
const OUTPUT = 'ops/combined-containment/candidate.firestore.rules';

export function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

const patches = [];

patches.push({
  name: 'isResourceAdmin helper',
  old: `    function isContentAdmin() {
      return isAuthenticated() && (
        request.auth.token.adminRole in ['super_admin', 'content_admin'] ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['super_admin', 'content_admin']
      );
    }

    // Helper function to check if the requested data is valid`,
  new: `    function isContentAdmin() {
      return isAuthenticated() && (
        request.auth.token.adminRole in ['super_admin', 'content_admin'] ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['super_admin', 'content_admin']
      );
    }

    function isResourceAdmin(requiredRoles) {
      return isAuthenticated() &&
        !isAnonymous() &&
        request.auth.token.get('adminRole', '') in requiredRoles;
    }

    // Helper function to check if the requested data is valid`,
});

patches.push({
  name: 'analytics read scoping',
  old: `    // Analytics Collection: /analytics/{analyticId}
    match /analytics/{analyticId} {
      allow read: if isAdmin();
      allow create: if false;
      allow update, delete: if false;
    }`,
  new: `    // Analytics Collection: /analytics/{analyticId}
    match /analytics/{analyticId} {
      allow read: if isResourceAdmin(['super_admin', 'platform_admin']);
      allow create: if false;
      allow update, delete: if false;
    }`,
});

patches.push({
  name: 'auditLogs read scoping',
  old: `    // Audit Logs Collection: /auditLogs/{logId}
    match /auditLogs/{logId} {
      allow read: if isAdmin();`,
  new: `    // Audit Logs Collection: /auditLogs/{logId}
    match /auditLogs/{logId} {
      allow read: if isResourceAdmin(['super_admin', 'platform_admin']);`,
});

patches.push({
  name: 'suspiciousActivity scoping',
  old: `    // Suspicious Activity Collection: /suspiciousActivity/{activityId}
    match /suspiciousActivity/{activityId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update: if isAdmin();
      allow delete: if false;
    }`,
  new: `    // Suspicious Activity Collection: /suspiciousActivity/{activityId}
    match /suspiciousActivity/{activityId} {
      allow read: if isResourceAdmin(['super_admin', 'safety_admin']) || (resource.data.userId == request.auth.uid);
      allow create: if isResourceAdmin(['super_admin', 'platform_admin']);
      allow update: if isResourceAdmin(['super_admin', 'safety_admin']);
      allow delete: if false;
    }`,
});

patches.push({
  name: 'sosAlerts scoping',
  old: `    // SOS Alerts Collection: /sosAlerts/{alertId}
    match /sosAlerts/{alertId} {
      allow read: if isAdmin() || resource.data.userId == request.auth.uid;`,
  new: `    // SOS Alerts Collection: /sosAlerts/{alertId}
    match /sosAlerts/{alertId} {
      allow read: if isResourceAdmin(['super_admin', 'safety_admin']) || resource.data.userId == request.auth.uid;`,
});

patches.push({
  name: 'sosAlerts update scoping',
  old: `      allow update: if isAdmin() || (isAuthenticated() && resource.data.userId == request.auth.uid);
      allow delete: if false;`,
  new: `      allow update: if isResourceAdmin(['super_admin', 'safety_admin']) || (isAuthenticated() && resource.data.userId == request.auth.uid);
      allow delete: if false;`,
});

patches.push({
  name: 'booking_locks containment',
  old: `    // Booking Locks Collection: /booking_locks/{lockId}
    match /booking_locks/{lockId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && !exists(/databases/$(database)/documents/booking_locks/$(lockId));
      allow update, delete: if isAdmin();
    }`,
  new: `    // Booking Locks Collection: /booking_locks/{lockId}
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
    }`,
});

export function patchCombined(source) {
  let result = source;
  for (const p of patches) {
    if (!result.includes(p.old)) throw new Error(`${p.name}: anchor not found; baseline may have drifted.`);
    result = result.replace(p.old, () => p.new);
  }
  return result;
}

export { ACTIVE_SOURCE, ACTIVE_HASH, patches };

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = await readFile(ACTIVE_SOURCE, 'utf8');
  if (hash(source) !== ACTIVE_HASH) throw new Error(`Baseline hash mismatch: expected ${ACTIVE_HASH}, got ${hash(source)}`);
  const candidate = patchCombined(source);
  await writeFile(OUTPUT, candidate);
  console.log(JSON.stringify({ candidateHash: hash(candidate), changedBranches: patches.map(p => p.name) }));
}
