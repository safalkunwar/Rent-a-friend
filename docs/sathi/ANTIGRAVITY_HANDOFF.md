# SATHI — Antigravity implementation handoff

Version 1.6, 2026-09-13. Architecture package complete; Phase0 security issues remain. Messaging/favorites and the subsequent scoped payment/staff-assignment containment are released with dedicated-account SDK acceptance; broader deployment is not implied. This file is a compact entry point, not proof of implemented product phases.

## Current production update — approved combined release

The owner explicitly approved deployment after the local gate. Active Firestore rules now have SHA-256 `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402`, ruleset `ad82806d-52fe-4c75-a723-a2f3cdfc81e0`, updated 2026-09-13 01:51:19 UTC. Exactly the payment write branch, admin assignment branch and one dedicated helper changed; unrelated source bytes were preserved. Fresh rollback/preflight, 39 repeated emulator cases, exact live readback and 28 dedicated-account SDK checks all passed. Four test accounts and generated records were cleaned up with zero errors. No application/Storage/index/Function/Hosting/CORS release accompanied it.

See [PAYMENT_STAFF_RELEASE_RESULT.md](PAYMENT_STAFF_RELEASE_RESULT.md) for current truth. **Do not repeat this release or base a new candidate on `28709c31...`.** Initial root selection and this narrow release are complete, while six legacy staff classifications, broad resource grants, booking/lock/payment-provider work and device/operations acceptance remain open. The local-gate narrative below is historical; its NOT deployed statements describe the earlier session, not current production.

## Latest continuation — 2026-09-13

The owner resumed remaining-task implementation and explicitly authorized choosing an initial super-admin. Exactly one enabled, verified app account matched the authenticated Firebase operator. Its `adminRole: super_admin` claim was assigned and read back, preserving other claims; private rollback evidence is excluded from Git. No customer was selected randomly, no other role was changed, and no Firebase rules were deployed. See [STAFF_BOOTSTRAP_AND_ASSIGNMENT_GATE.md](STAFF_BOOTSTRAP_AND_ASSIGNMENT_GATE.md). Initial root selection is resolved; do not repeatedly ask for it.

Payment-document containment is now implemented locally: no client, including finance/root, may manufacture payment truth. The dormant admin repository writer now fails closed. Exact fresh production comparison and 20 payment emulator cases passed; candidate is NOT deployed. Staff-assignment containment separately passed 19 emulator cases. Both candidates start from active hash `28709c31...`; **compose/rebase and test before combining them**, or one deployment would undo the other. See [PAYMENT_WRITE_CONTAINMENT_GATE.md](PAYMENT_WRITE_CONTAINMENT_GATE.md). Broader staff grants, booking payment flags/locks, provider verification and other financial collections remain open.

Follow-through completed in this session: combined candidate `764eb7a3...` passed all 39 emulator cases and a fresh production semantic comparison/rollback at 01:40 UTC. See [PAYMENT_STAFF_COMBINED_RELEASE_GATE.md](PAYMENT_STAFF_COMBINED_RELEASE_GATE.md). Use that combined input for the next scoped release review; do not rerun the isolated patches sequentially. It remains NOT deployed and does not carry Story/media-only deployment authorization forward to unrelated branches.

Current executed application checks: main 309/309 across 36 files; admin 41/41 across 7 files; main/admin/Functions typechecks and main/admin builds passed. PWA harness expanded to eight tests without changing application UI; physical installed-PWA acceptance remains unverified. Existing large-bundle warnings remain. Earlier blanket permission/payment deferral below is historical, not a reason to abandon the newly resumed containment work. No live money or new Functions activation is implied.

## Latest containment — 2026-09-13 evening

Owner-resumed scoped containment continued from active source `764eb7a3...`:

- **Booking lock containment** (`ops/booking-containment/`): scopes `booking_locks/{lockId}` writes from `isAdmin()` to `isBookingAdmin()` with field validation (`companionId`, `date` format, `status=='pending'`, `updatedAt` type) and valid-transition enforcement (`pending→confirmed/cancelled`, `confirmed→active/cancelled`, `active→completed/cancelled`). Static contract 6/6. NOT deployed.
- **Staff RBAC containment** (`ops/staff-rbac-containment/`): narrows `analytics/{analyticId}` read from `isAdmin()` to `isResourceAdmin(['super_admin', 'platform_admin'])`; adds the `isResourceAdmin(requiredRoles)` helper that checks only `adminRole` claims and rejects anonymous tokens. 65 remaining `isAdmin()` sites unchanged. Static contract 8/8. NOT deployed.

Both candidates start from active hash `764eb7a3...` and do NOT reference the unsafe archived booking draft. Emulator verification requires Java 21+ (current environment has Java 17).

## Objective and stack

Preserve and evolve SATHI into a Nepal-wide local/social companion platform, launching commercially in Pokhara. Keep React 19, TypeScript, Vite, Firebase Auth/Firestore/Storage, the existing standalone admin app, PWA and Capacitor. Keep Firebase project `hamrosathi1`, existing Auth UIDs, records and working routes. No stack rewrite, new database, microservices or fabricated engagement.

## Non-negotiable decisions

One human has one UID and multiple independent capabilities: Free Friend, Local Host, Guide, Event Creator. Staff role, capability, verification badge, agency membership and transaction eligibility are separate. Free Friend service costs NPR0; discovery unlock may be a disclosed platform Coin fee after five daily distinct full-profile grants. Local Host proposes versioned prices. Regulated Guide bookings require the verified agency intermediary and one active primary affiliation per guide, with immutable history and agency-final pricing.

Organizations are tenants, not duplicate human accounts. Membership and current eligibility are backend-authoritative. KYC stays private. Clients never author balances, approvals, trusted counters or payment truth. Existing tested client contracts remain only behind explicit compatibility versions. Admin SDK commands perform their own permission checks.

## Domains and authority

Auth UID → private user/access snapshot → repositories/backend commands → shared application state → domain logic → shared responsive composition → web/mobile/PWA. Pure contracts are shared; presentation cannot invent authorization or an independent feed algorithm.

Existing users/companions/applications/bookings/events/messages/partners remain. New tenant, affiliation, QR, entitlement and financial collections are specified in [31_DATA_CONTRACTS.md](31_DATA_CONTRACTS.md), with owners/readers/writers/states/indexes/migrations. That registry is target schema; it is not a claim those collections are deployed.

Bookings have distinct service/payment/review/safety states; legacy v2 confirmed means unpaid acceptance. Canonical booking ID and immutable price/agency/refund snapshots survive transfers. One review per completed verified experience. QR sessions are backend-bound, purpose-specific, one-time and expire in 10 minutes; customer bill input is not trusted. Stories remain likes-only with double-tap animation, no comments.

## Money and flags

Integer NPR paisa and whole Coins; 10 Coins=NPR1. Immutable balanced journals per operation/asset, source lots and atomic derived balances; no P2P or coin expiry. Cash redemption minimum 5000 Coins, but `cashRedemptionEnabled=false`. Also keep deeper referral rewards off until compliance approval; max five levels and only qualified activity, not recruitment chains. Separate purchase/earn/spend/Event/QR flags. Missing money policy fails closed. Browser redirect is not provider verification; UNKNOWN retains reservations pending reconciliation. No money implementation is authorized by this handoff.

## Current evidence and known risks

Fresh Phase 0 evidence supersedes unknown deployment/billing status below: billingEnabled=true; seven media Functions ACTIVE; captured Firestore/Storage match September 9/8 releases. The two actual Event participant query shapes identified in that capture now each have one `READY` composite index and passed zero-row production probes; see [EVENT_INDEX_RELEASE_RESULT.md](EVENT_INDEX_RELEASE_RESULT.md). Synthetic emulator tests reproduced conversation takeover/private-message disclosure, broad read-only-admin mutation, forged companion/booking/payment authority and real v2 cancellation denial. At that capture no production exploit or fix was performed. P0-01 messaging/favorites containment was later released; see [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md). See [PHASE_00_COMPATIBILITY_REPORT.md](PHASE_00_COMPATIBILITY_REPORT.md) before any further implementation.

Source baseline inspected: `5ecc696`; browser observation was public guest only. Existing media release and comment repair have dated evidence, not blanket production certification. On 2026-09-12, the approved messaging/favorites candidate became active Firestore ruleset `f4e99332-71c9-46ef-93fe-39843148d35f`, exact SHA-256 `28709c31...`, after first archiving baseline `5e155...`; see [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md). Production Storage is scoped; local KYC branches are not proof of deployed access. Legacy Functions include destructive/obsolete handlers; do not bulk activate. Prior billing notes conflict with later media deployment evidence: confirm current billing and explicit authority before new Functions deployment. App Check/PWA upgrade and device acceptance remain unresolved. See [20_TARGET_ARCHITECTURE.md](20_TARGET_ARCHITECTURE.md).

## Phases and next task

Latest verification: [ANTIGRAVITY_RESUME_REVIEW.md](ANTIGRAVITY_RESUME_REVIEW.md), [MESSAGING_RELEASE_READINESS.md](MESSAGING_RELEASE_READINESS.md) and [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md). Antigravity's unread-reset application writer correctly updates only unreadCount/updatedAt; independent continuation added actual component coverage. The scoped release has 301 main assertions, 49 candidate emulator checks, TypeScript/Vite evidence and a passing dedicated-account live SDK gate. Candidate hash `28709c31...` is now active; no Storage, index, Function, migration or data-repair change accompanied it. Historical staff draft evidence remains 11 passes/nine failures, not rerun here. Separate untracked booking drafts have invalid/unsafe lock rules and a stale baseline; preserved untouched, NOT qualified.

Inventory correction: saved capture reports36 conversations (5 standard,30 opaque-ID,1 reversed),306 messages and35 missing referenced parents. These counts are not a fresh independent scan. The previous claim that opaque IDs make30 conversations invisible is withdrawn: inbox selection uses returned IDs; canonical entry paths and stored-id overrides need separate qualification. Stored id was not projected, so missing/mismatched stored IDs remain unknown. Identifier samples have been removed from the saved inventory/report; aggregate counts and rollback rules remain. See corrected [MESSAGING_RELEASE_READINESS.md](MESSAGING_RELEASE_READINESS.md).

Latest approved read: [MESSAGING_METADATA_RESULT.md](MESSAGING_METADATA_RESULT.md), snapshot2026-09-10T15:47:04.801Z. Complete same-snapshot36 parent/306 message capture: ALL306 messages reference35 existing valid parents; all36 stored IDs match document IDs; zero missing/ambiguous references or duplicate member pairs. Six canonical/30 opaque parents. This contradicts the earlier orphan report; cause unknown without its original collector/full inputs. No repair was performed and no migration is indicated. Reader/classifier21/21 checks pass. Next: owner review of existing-thread canonical entry-path compatibility, then separately approved live rules/index/acceptance gate—not automatic deployment or bookings/staff/payment work.

Phase 0 evidence collection is complete; Phase 0 as a whole is NOT passed. P0-01 messaging/favorites containment and the Event query-index-only release are completed scoped releases; no planned product phase is complete. Staff and payment containment have resumed as recorded above; booking/lock and broader permissions remain open. Do not proceed automatically into roadmap Phase 1 or deploy root rules. The local PWA update foundation still needs installed-web/device/Capacitor acceptance. After each approved scope, follow the dependency graph and selected prompt in [30_IMPLEMENTATION_ROADMAP.md](30_IMPLEMENTATION_ROADMAP.md). Stop for review after every phase.

Latest messaging entry-path result: [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md). The shared resolver reuses existing opaque/reversed/canonical parents by stored membership, while a proven new pair creates the canonical parent only on first send. Peer identity comes from validated membership/public profile mapping, not ID splitting; lookup is server-backed, bounded to five 100-document pages and fails closed on errors, partial results, malformed pages or ambiguity. The initial Firebase CLI attempt was a documented no-op, but the final explicitly approved Rules API release verified the exact active candidate hash and passed A/B/C production SDK acceptance. Public Vercel asset inspection confirms the deployed resolver is served. Interactive multi-session browser acceptance, real-customer opaque-thread probing and installed-PWA cache acceptance remain deliberately unclaimed; do not use those gaps to justify unrelated migrations or security changes.

## Read and verify

Start with AGENTS.md, 20 target, 21 permissions, 30 roadmap, 31 registry, then the selected domain document (22–28). For UI also read 29 information architecture and 32 design tokens. Keep the SATHI logo/current theme; navigation changes are proposed, not silently approved.

Run scoped unit/type/build checks and relevant positive/negative emulator cases. Record actual outputs and included suites, not historical counts. For each release verify exact live indexes/rules and authorized two-user persistence/denials. Emulator/build success is not production proof. Append CHANGELOG with evidence, untouched scope, risks and rollback. Use dry-run, backup, bounded pages and update-time preconditions for any later approved migration; never delete journals for rollback.

## Implementation instruction

> Do not redesign architecture. Implement the approved phase according to these documents. Preserve current production data and existing working features. If implementation appears to require architecture changes, document the conflict rather than silently inventing a new system.
