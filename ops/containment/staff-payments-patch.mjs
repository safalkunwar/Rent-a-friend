/**
 * Scoped containment patch for P0-02: "read-only" staff payment mutation bypass.
 * Applied on top of the P0-01 messaging/favorites candidate — NOT the raw production baseline.
 *
 * Root cause (production isAdmin lines 17-25): all 11 adminRole values are unioned into a
 * single boolean. The /payments/{paymentId} branch uses `allow create, update, delete: if isAdmin()`
 * which means read_only_admin, analytics_admin, safety_admin, content_admin, etc. can all mutate
 * financial records. Reproduced in architecture-baseline.test.mjs KNOWN_RISK P0 test 4.
 *
 * Changes ONLY:
 * 1. Adds `isFinanceAdmin()` helper (claim + document lookup, matching all existing scoped helpers).
 *    Grants: super_admin, finance_admin only.
 * 2. match /payments/{paymentId} (lines 365-372 of production baseline):
 *    - Replaces `allow create, update, delete: if isAdmin()` with `allow create, update: if isFinanceAdmin()`
 *    - Replaces `allow update: if isAdmin()` with `allow update: if isFinanceAdmin()`
 *    - Preserves `allow read: if isAuthenticated() && (request.auth.uid == resource.data.userId || isAdmin())`
 *    - Preserves `allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId && isValidData(...)`
 *    - Preserves `allow delete: if false`
 *
 * Every other line remains byte-for-byte identical to the P0-01 candidate input.
 */

export function patchStaffPaymentsRules(source) {
  // Normalize Windows newlines for deterministic patching
  const hasCRLF = source.includes('\r\n');
  let normalized = source.replace(/\r\n/g, '\n');

  // 1. Add isFinanceAdmin() helper after the existing isContentAdmin() block.
  //    This exact text appears in both the production baseline and the P0-01 candidate
  //    (isContentAdmin was not changed by the messaging/favorites patch).
  const helperInsertTarget = `    function isContentAdmin() {
      return isAuthenticated() && (
        request.auth.token.adminRole in ['super_admin', 'content_admin'] ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['super_admin', 'content_admin']
      );
    }`;

  const helperInsertReplacement = `    function isContentAdmin() {
      return isAuthenticated() && (
        request.auth.token.adminRole in ['super_admin', 'content_admin'] ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['super_admin', 'content_admin']
      );
    }

    // Helper to check if the user has financial write authority.
    // Only super_admin and finance_admin may mutate payment records.
    // All other admin roles (including read_only_admin) are read-only for payments.
    function isFinanceAdmin() {
      return isAuthenticated() && (
        request.auth.token.adminRole in ['super_admin', 'finance_admin'] ||
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role in ['super_admin', 'finance_admin']
      );
    }`;

  if (normalized.split(helperInsertTarget).length !== 2) {
    throw new Error(
      'P0-02 patch: isContentAdmin helper baseline match failed; candidate diverged from expected input.'
    );
  }
  normalized = normalized.replace(helperInsertTarget, helperInsertReplacement);

  // 2. Patch the payments collection branch.
  //    This is the exact text as it appears in the P0-01 candidate (unchanged from production
  //    baseline for this block — the messaging/favorites patch did not touch payments).
  const paymentsTarget = `    // Payments Collection: /payments/{paymentId}
    match /payments/{paymentId} {
      allow read: if isAuthenticated() && (request.auth.uid == resource.data.userId || isAdmin());
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId && isValidData(request.resource.data);
      allow create, update, delete: if isAdmin();
      allow update: if isAdmin();
      allow delete: if false;
    }`;

  const paymentsReplacement = `    // Payments Collection: /payments/{paymentId}
    // Read: payment owner or any admin role (read_only_admin, analytics_admin, etc. may view).
    // Write: finance_admin and super_admin only. All other admin roles are denied.
    // Self-create: allowed for the payment owner (existing client flow preserved).
    // Delete: permanently denied for all actors (financial history immutability).
    match /payments/{paymentId} {
      allow read: if isAuthenticated() && (request.auth.uid == resource.data.userId || isAdmin());
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId && isValidData(request.resource.data);
      allow create, update: if isFinanceAdmin();
      allow delete: if false;
    }`;

  if (normalized.split(paymentsTarget).length !== 2) {
    throw new Error(
      'P0-02 patch: payments baseline match failed; candidate diverged from expected input.'
    );
  }
  normalized = normalized.replace(paymentsTarget, paymentsReplacement);

  return hasCRLF ? normalized.replace(/\n/g, '\r\n') : normalized;
}
