# Combined containment gate — REJECTED on 2026-09-14

## Current verdict

**DO NOT DEPLOY `f5df74d9...`.** Real booking execution failed before creation; staff emulator tests returned 12 passes and 5 failures. The helper rejects normal staff tokens missing a fabricated `anonymous` claim, accepts an anonymous provider with legacy `anonymous:false`, omits the existing analytics role, and the newly added suspiciousActivity owner-read exposes internal notes to the subject user. Static hash/reversibility checks did not catch these failures.

The candidate/patch are preserved for evidence. Generator now refuses execution and the manifest marks rejection. Only its baseline reference was corrected: active `764eb7a3...` is held in `ops/payment-containment/combined-candidate.firestore.rules`; the true pre-deployment rollback has been restored to `28709c31...`.

Use the separately tested booking and analytics replacements documented in [CONTINUATION_REPAIR_RESULT_2026-09-14.md](CONTINUATION_REPAIR_RESULT_2026-09-14.md). Neither is deployed. This is not a Java blocker: the cached emulator ran successfully on Java 17. The text below is the historical proposal, including unverified claims that are now withdrawn.

## Historical proposal — September 13

## Purpose

Extend the staff-RBAC containment candidate to also scope `auditLogs`, `suspiciousActivity`, `sosAlerts`, and `booking_locks` branches, producing a single combined candidate from the active deployed source (`764eb7a3...`).

This gate starts from the **active** production rules and changes only the listed branches. It does **not** use the unsafe archived booking draft (`ops/containment/candidate-booking.firestore.rules`).

## Candidate

| Artifact | Path | SHA-256 |
|---|---|---|
| Baseline (active source) | `docs/sathi/rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z/firestore.rules` | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` |
| Containment candidate | `ops/combined-containment/candidate.firestore.rules` | `f5df74d90ae481e8ad66277661ac658ddb91f28b147e27f564ce07033679d8ba` |

Deployment: **NOT PERFORMED**. No production mutations.

## Changes

All changes use the `isResourceAdmin(requiredRoles)` helper (defined in `ops/staff-rbac-containment/patch.mjs`), which checks only the `adminRole` custom claim and rejects anonymous tokens.

### 1. Analytics Collection: `/analytics/{analyticId}`

| Operation | Before | After |
|---|---|---|
| Read | `isAdmin()` | `isResourceAdmin(['super_admin', 'platform_admin'])` |
| Create/Update/Delete | `false` | `false` (unchanged) |

### 2. Audit Logs Collection: `/auditLogs/{logId}`

| Operation | Before | After |
|---|---|---|
| Read | `isAdmin()` | `isResourceAdmin(['super_admin', 'platform_admin'])` |
| Create/Update/Delete | (other rules) | (unchanged) |

### 3. Suspicious Activity Collection: `/suspiciousActivity/{activityId}`

| Operation | Before | After |
|---|---|---|
| Read | `isAdmin()` | `isResourceAdmin(['super_admin', 'safety_admin'])` or resource owner |
| Create | `isAdmin()` | `isResourceAdmin(['super_admin', 'platform_admin'])` |
| Update | `isAdmin()` | `isResourceAdmin(['super_admin', 'safety_admin'])` |
| Delete | `false` | `false` (unchanged) |

### 4. SOS Alerts Collection: `/sosAlerts/{alertId}`

| Operation | Before | After |
|---|---|---|
| Read | `isAdmin()` or resource owner | `isResourceAdmin(['super_admin', 'safety_admin'])` or resource owner |
| Update | `isAdmin()` or resource owner | `isResourceAdmin(['super_admin', 'safety_admin'])` or resource owner |
| Delete | `false` | `false` (unchanged) |

### 5. Booking Locks Collection: `/booking_locks/{lockId}`

| Operation | Before | After |
|---|---|---|
| Read | `isAuthenticated()` | `isAuthenticated()` (unchanged — needed for availability checks) |
| Create | `isAuthenticated()` + uniqueness | `isBookingAdmin()` + uniqueness + field validation + `status == 'pending'` + date format check |
| Update | `isAdmin()` | `isBookingAdmin()` + only `['status', 'updatedAt']` keys + valid transition graph |
| Delete | `isAdmin()` | `isBookingAdmin()` |

Valid lock status transitions: `pending → confirmed, cancelled`; `confirmed → active, cancelled`; `active → completed, cancelled`. See `BOOKING_LOCK_CONTAINMENT_GATE.md` for full details.

### New helper: `isResourceAdmin(requiredRoles)`

```
function isResourceAdmin(requiredRoles) {
  return isAuthenticated() &&
    !isAnonymous() &&
    request.auth.token.get('adminRole', '') in requiredRoles;
}
```

This helper deliberately does not accept legacy `token.admin`, `token.role`, `users/{uid}.role`, or `exists(admins/{uid})` bypass paths.

## App integration

- `analytics`: admin-only tooling reads; no client SDK path affected.
- `auditLogs`: admin tooling only; no client SDK path affected.
- `suspiciousActivity`: create/update now require resource-level admin roles; self-read preserved for resource owners.
- `sosAlerts`: read/update now require `super_admin` or `safety_admin`; self-read preserved for resource owners.
- `booking_locks`: app creates locks with `status: 'pending'` and updates only `status` + `updatedAt`, compatible with candidate rules. See `BOOKING_LOCK_CONTAINMENT_GATE.md`.

## Verification

- Static contract: 11/11 pass (`tests/combined-containment.test.mjs`)
- Hash match: candidate `f5df74d9...` composed from baseline `764eb7a3...`
- Reversibility: applying all patches in reverse restores the baseline exactly
- Byte-identical: content outside analytics, auditLogs, suspiciousActivity, sosAlerts, booking_locks, and `isResourceAdmin` helper is unchanged
- `isAdmin()` count reduced by 8 (from 66 to 58 in changed branches)
- All static contracts: 27/27 (payment + operator + booking-lock + staff-rbac + combined)
- TypeScript: `tsc --noEmit` passed
- Main app tests: 309/309 (36 files)
- Admin app tests: 41/41 (7 files)

## Blocker / Next step

This candidate is a **LOCAL static artifact**. It has not been validated in the Firestore emulator (Java 17 detected; emulator requires Java 21+).

**Next steps requiring owner approval:**
1. Install Java 21+ and run the combined-containment emulator suite.
2. If the suite passes, request separate deployment authorization for each branch (do not deploy all at once without review).
3. Address the six legacy generic admin records — classify each and migrate to claimed `adminRole`.
