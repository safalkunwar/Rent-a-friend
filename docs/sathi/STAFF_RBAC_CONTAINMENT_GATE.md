# Staff RBAC containment gate — updated 2026-10-14

## Release result — October 14, 2026

The scoped analytics candidate `94249bae...` is active as ruleset `03145504-14d0-4f91-a9f6-8190c7803a98`. Dedicated-account live SDK acceptance passed seven checks, including allowed staff reads, denied finance/read-only/customer reads, denied analytics writes, exact source readback and clean fixture teardown. See [the release result](STAFF_RBAC_RELEASE_RESULT_2026-10-14.md). This closes only the analytics containment slice; broader resource RBAC remains open.

## Fresh current-source qualification — October 14, 2026

The owner authorized completion of the remaining roadmap on 2026-10-14. A fresh authenticated Firestore Rules API read confirmed that production still serves ruleset `e8b7524d-3fc8-4aa4-b19f-e89c3bedfac1`, source hash `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f`, last updated `2026-10-12T14:06:22.927363Z`. Billing is currently enabled for `hamrosathi1`.

The prior 2026-10-12 local baseline file had drifted to hash `022fe351...` despite its manifest naming `8bfecbb...`; this was caught by the current-source composition test. A fresh package was generated in `ops/staff-rbac-containment/active-2026-10-14/` from the live source. Candidate hash: `94249bae2dc106e30b112e3f763a92695bbcf0e9fdb55359b6a3d00cd20b1fd1`. It changes only analytics read authorization and adds the scoped helper; all other source bytes are identical. Current static composition passes 10/10 and the Firestore emulator role/privacy suite passes 17/17 using a temporary JDK 21 runtime. No production rules were changed.

The owner authorized completion of the remaining roadmap. This record does not claim finance, counsel, funding, migration, or other cohort-release approvals. The analytics candidate is now released and live-qualified; other rule branches remain subject to separate scope review.

## Current-source continuation — October 12, 2026

The earlier candidate below starts from `764eb7a3...`, which is no longer active after the separately approved booking/lock release. A fresh read-only production read on October 12 confirmed active rules hash `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f` and ruleset `e8b7524d-3fc8-4aa4-b19f-e89c3bedfac1`. The analytics-only patch was regenerated from that exact source and saved separately at `ops/staff-rbac-containment/active-2026-10-12/`; candidate hash is `94249bae2dc106e30b112e3f763a92695bbcf0e9fdb55359b6a3d00cd20b1fd1`.

The current-source candidate changes only the `analytics` read check and adds the scoped `isResourceAdmin` helper; its source bytes outside those anchors are identical. The branch admits non-anonymous `super_admin`, `platform_admin`, and `analytics_admin` claims, and continues to deny all analytics writes. Current-source static composition checks passed 2/2, and the Firestore emulator role/privacy suite passed 17/17 on loopback port 8087, including denial for customer, legacy/document-only, finance, support, moderation, booking, KYC, safety, content and read-only roles, anonymous provider, and subject access to staff-only suspicious-activity notes.

**This remains a local candidate and is not deployed.** The tests establish candidate behavior in the emulator, not live staff-token validity or production impact. The change needs its own explicit release approval and exact active-source/hash recheck immediately before any deployment. It does not qualify broader staff RBAC, audit/SOS/report permissions, or role migration. See `ops/staff-rbac-containment/active-2026-10-12/manifest.json` for the captured source/ruleset and candidate hashes.

## Current result

The analytics-only candidate was repaired after realistic Auth-token emulator tests exposed the old `isAnonymous()` assumption. It now reads `firebase.sign_in_provider`, permits explicit `super_admin`, `platform_admin`, and `analytics_admin` claims, and denies other/legacy/document-only roles. The analytics role is included because the existing admin permission registry grants it `analytics.read`. Client analytics writes remain denied; no suspiciousActivity/audit/SOS permission is changed by this isolated candidate.

New SHA-256: `e50ec15688584e69e8ffd94918cea23b34802cf76c5f14b79b41bc4a39ff97db`. **17/17 emulator and 8/8 static checks passed; NOT deployed.** Correct baseline path is `ops/payment-containment/combined-candidate.firestore.rules` (active `764eb7a3...`), not the BEFORE rollback. See [continuation repair result](CONTINUATION_REPAIR_RESULT_2026-09-14.md).

The cached emulator works on installed Java 17. The older draft/hash/blocker narrative below is historical, not current qualification. The five-branch combined draft remains rejected and must not be substituted for this tested candidate.

## Historical analytics draft — September 13

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
