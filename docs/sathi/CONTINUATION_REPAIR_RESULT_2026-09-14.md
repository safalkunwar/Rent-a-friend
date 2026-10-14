# Continuation repair result — 2026-09-14

## Current outcome

**Booking compatibility and analytics authorization repairs implemented and emulator-verified locally. NOT deployed.** This is completion of the broken draft-validation work, not all product phases or commercial readiness.

Production is unchanged: read-only preflight confirmed active rules hash `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402`, ruleset `ad82806d-52fe-4c75-a723-a2f3cdfc81e0`. No live document, Auth claim, rule, Function, Storage, index, CORS or hosting mutation occurred this session.

## Findings repaired

| Priority | Evidence and root cause | Repair / verification |
| --- | --- | --- |
| P0: overwritten rollback evidence | `rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z/firestore.rules` contained the AFTER source `764eb7a3...`, while `predeploy.json.before.hash` records `28709c31...` | Restored the exact BEFORE bytes using the known reversible two-branch patch; SHA-256 now matches the manifest and retained preflight copy. Added a regression test. New candidate generators reference the separately retained active source, not a rollback file |
| P0: legitimate new booking rejected | Executing real `reserveBooking()` against the inherited combined candidate failed at its first missing-document read (`PERMISSION_DENIED`). That draft also makes lock creates staff-only, despite the real customer transaction creating the booking and lock together | Replaced the tracked lock-only draft with a coordinated bookings+locks candidate. Kept existing repository/transaction architecture, not a second booking service |
| P0: forged/mismatched reservations | Original active booking grants allow unconstrained customer/admin writes; standalone locks lack a verified paired booking | Candidate validates v2 owner/canonical companion, quote/time/initial payment state, atomic matching locks, actor transitions, start/end gates, cancelled-slot reuse and immutable fields. Even root cannot author payment proof or delete booking/lock history |
| P0: broken staff token classification | Realistic password-provider root/platform tokens failed analytics read because the draft accessed absent `token.anonymous`. An anonymous-provider token with `anonymous:false` was accepted | Isolated analytics candidate uses `firebase.sign_in_provider` and explicit `adminRole`; no legacy/document-role fallback |
| P1: analytics role omitted | `analytics_admin` has `analytics.read` in the existing admin service but the draft excludes it | Candidate permits super/platform/analytics roles only; all client analytics writes remain denied |
| P0: unintended private-data exposure in combined draft | A subject customer successfully read synthetic internal `suspiciousActivity` notes through a newly added self-read branch. This was not preserved behavior: original source allowed staff only | Five-branch combined draft retained for evidence but marked REJECTED; its generator now refuses to regenerate it. The tested analytics-only replacement does not change suspiciousActivity, auditLogs or sosAlerts |
| P1: retry silently accepted changed meeting location | Idempotency compared scalar intent fields but omitted `meetingCoordinates` | `src/services/bookingTransactions.ts` now compares latitude/longitude by value; equal-coordinate retries succeed, changed/removed coordinates reject. Emulator test calls the actual transaction |
| False environment blocker | Notes claimed Java 21+ must be installed before any emulator tests | Existing cached Firestore emulator 1.19.8 ran successfully on installed Microsoft Java 17. No runtime installation or system change was necessary. This is not a claim that every newer Firebase CLI/emulator version supports Java 17 |

## Qualified local candidates

| Candidate | Hash | Scope |
| --- | --- | --- |
| `ops/booking-containment/candidate.firestore.rules` | `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f` | bookings + booking_locks + dedicated `sathiBooking*` helpers |
| `ops/staff-rbac-containment/candidate.firestore.rules` | `e50ec15688584e69e8ffd94918cea23b34802cf76c5f14b79b41bc4a39ff97db` | analytics read + corrected `isResourceAdmin` helper |

Both start from the currently deployed `764eb7a3...` source and independently preserve all unrelated bytes. They are not sequential deployment inputs: compose/retest first if selecting a combined release. The five-branch `f5df74d9...` candidate is NOT qualified and must not be substituted.

The booking predicate is adapted from the existing v2 booking policy/validation (not root rules wholesale), copied into an explicit scoped fragment and tested against actual `reserveBooking`/`transitionBooking`. Root `firestore.rules` remains untouched and unsuitable for blanket deployment. Booking and lock reads retain their existing grants; new-write authority is narrowed. Legacy bookings remain readable, but v2-only client transitions and no client deletion intentionally require rollout compatibility review.

## Actual verification

- New booking emulator suite: **29/29 passed**, including actual two-customer contention, quote computation, idempotent retry, meeting coordinates, confirm/cancel/reuse, no unpaired updates, cross-user/operator denials, direct forged payloads, anonymous denial, eligibility flags, start-time gate, elapsed-service completion and terminal-state denial.
- Existing payment/staff emulator suites against the NEW booking candidate: **39/39 passed**; released payment/assignment boundaries are preserved.
- Analytics emulator suite: **17/17 passed**, covering realistic provider claims, allowed roles, explicit denials, immutable aggregates and no new suspicious-activity subject access.
- Booking/rollback static contracts: **6/6 passed**; staff static contracts: **8/8 passed**.
- Main application tests: **309/309 passed** across 36 files. Main TypeScript `--noEmit` and production Vite/PWA build passed (exit 0). Existing large-bundle warning remains; no hosting publication occurred.
- Inherited combined-draft negative review: **12/17 passed, 5/17 failed** for staff behavior; actual customer booking probe also failed. These are genuine rejected-candidate failures, not tests suppressed to claim success.

Tests use isolated loopback port 8087 and `demo-sathi-*` project IDs, with no live fallback. Main tests do not discover the new Node/TypeScript emulator suites automatically; run them explicitly.

## Production inventory and release dependency

Fresh bounded read-only inventory at `2026-09-14T12:28:00.725Z`: **105 bookings, all legacy/other-version; zero v2; one lock**. Status counts: 41 completed, 20 confirmed, 22 pending, 22 cancelled. No orphan/mismatched/noncanonical lock was found. This is a paged metadata inventory, not an atomic database snapshot, and it does not certify those bookings as real/paid/valid.

Evidence and fresh source copy: [booking compatibility snapshot](rollbacks/booking-compatibility-2026-09-14T12-28-00-722Z). No names, contacts, coordinates or per-booking IDs were saved in the report. No legacy record was migrated/deleted. The owner was asked whether to retain these as readable, client-read-only historical bookings while enabling new v2 requests. Do not invent timestamps, prices, verification or payment history to normalize them.

Before release: settle legacy write policy, refresh inventory/source, review exact narrowed branches, save rollback, prepare candidate-only activation/readback and dedicated-account acceptance. Existing admin mutation paths for legacy records may be intentionally disabled and must not be silently presented as compatible. No new production deployment is authorized merely by the prior payment/staff-only approval.

## Remaining risks and safest next order

1. Decide the legacy-booking rollout policy, qualify the exact booking candidate for production, then perform dedicated-account persistence/negative checks. No real payment activation.
2. Finish scoped staff resource grants and the six generic-role classifications; release analytics only after its own compatibility gate. Do not reuse the rejected broader combined patch.
3. Fix trusted companion/approval authority before treating `isVerified`/`companionStatus` as secure evidence: this booking candidate checks those existing records, but other unchanged rules can still make them unreliable. Narrowing booking writes alone does not certify eligibility or approved pricing.
4. Event participation policy, App Check valid-token coverage, backup/restore drill, installed-PWA/device/Capacitor acceptance and provider sandbox/merchant decisions remain open.
5. Follow the dependency-controlled product roadmap for capabilities/tenants/ledger/paid services. Those phases are not completed by static Markdown or this local repair.

Recovery: restored rollback source is authentic but still represents an older insecure policy; do not automatically deploy it. Prefer a reviewed forward fix. Preserve real history and financial evidence. UI/styling, unrelated untracked booking/debug drafts and the currently active release remain intact.
