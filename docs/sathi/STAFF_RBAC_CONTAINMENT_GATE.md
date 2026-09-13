# Staff RBAC Containment Gate — 2026-09-13

## Purpose

Replace the broad `isAdmin()` read authorization on the `analytics/{analyticId}` collection with a scoped `isResourceAdmin(['super_admin', 'platform_admin'])` check. This is the first step in the remaining staff resource-level RBAC work, starting from the active deployed source (`764eb7a3...`).

This is a **scoped containment**, not a full RBAC redesign. `isAdmin()` remains unchanged for all other branches.

## Candidate

| Artifact | Path | SHA-256 |
|---|---|---|
| Baseline (active source) | `docs/sathi/rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z/firestore.rules` | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` |
| Containment candidate | `ops/staff-rbac-containment/candidate.firestore.rules` | `9f8d3b0eb782143d8481c82da0ef8bb55cb1dbee61fb2bb2465f16bfb4a72b64` |

Deployment: **NOT PERFORMED**. No production mutations.

## Changes

### New helper: `isResourceAdmin(requiredRoles)`

```javascript
function isResourceAdmin(requiredRoles) {
  return isAuthenticated() &&
    !isAnonymous() &&
    request.auth.token.get('adminRole', '') in requiredRoles;
}
```

This helper checks only the `adminRole` custom claim and rejects anonymous tokens. It deliberately does **not** accept:
- `request.auth.token.admin == true` (legacy boolean bypass)
- `request.auth.token.role == 'admin'` (legacy role string)
- `users/{uid}.role == 'admin'` (legacy user field)
- `exists(admins/{uid})` (legacy admins collection)

### Analytics branch

| Operation | Before | After |
|---|---|---|
| Read | `isAdmin()` (66 paths) | `isResourceAdmin(['super_admin', 'platform_admin'])` |
| Create | `false` | `false` (unchanged) |
| Update/Delete | `false` | `false` (unchanged) |

All 65 remaining `isAdmin()` calls across other branches are unchanged.

## Staff RBAC context

The 11 RBAC roles defined in `admin/src/services/admin.ts` are:

```
super_admin, platform_admin, safety_admin, moderation_admin,
support_agent, booking_admin, finance_admin,
kyc_reviewer, content_admin, analytics_admin, read_only_admin
```

Analytics data is platform-owned business intelligence. Only `super_admin` and `platform_admin` roles have explicit responsibility for analytics. The other 9 roles, including `analytics_admin`, are NOT granted analytics read access by this candidate — `analytics_admin` is reserved for data-content management, not rule-scoped access. This requires explicit owner review before any broader grant.

## App integration

No application code changes are required. The analytics collection is not read by any client SDK path; reads are admin-only tooling.

## Verification

- Static contract: 8/8 pass (`tests/staff-rbac-containment.test.mjs`)
- Hash match: candidate `9f8d3b0e...` composed from baseline `764eb7a3...`
- Reversibility: replacing both new blocks restores the baseline exactly
- Byte-identical: content outside `analytics` and `isResourceAdmin` is unchanged
- `isAdmin()` call count unchanged: 66 before, 66 after (only analytics read changed)
- All static contracts: 22/22 (payment + operator + booking-lock + staff-rbac)
- TypeScript: `tsc --noEmit` passed
- Main app tests: 309/309 (36 files)
- Admin app tests: 41/41 (7 files)

## Blocker / Next step

This candidate is a LOCAL static artifact. It has not been validated in the Firestore emulator (Java 17 detected; emulator requires Java 21+).

**Next steps requiring owner approval:**
1. Install Java 21+ and run the staff-RBAC emulator suite.
2. If the suite passes, request separate deployment authorization for the `analytics` read rule only.
3. Continue narrowing other resource collections (`auditLogs`, `suspiciousActivity`, `reports`, etc.) with explicit role mappings per `ROLE_PERMISSIONS` in `admin/src/services/admin.ts`.
4. Address the six legacy generic admin records — classify each and migrate to claimed `adminRole`.
