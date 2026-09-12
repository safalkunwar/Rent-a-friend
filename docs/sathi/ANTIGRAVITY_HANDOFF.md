# SATHI — Antigravity implementation handoff

Version 1.3, 2026-09-10. Architecture package complete; Phase0 security issues remain. Fresh approved messaging metadata gate finds no orphan-reference or stored-id mismatch requiring reconciliation; deployment is still not authorized. This file is a compact entry point, not proof of implemented product phases.

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

Fresh Phase 0 evidence supersedes unknown deployment/billing status below: billingEnabled=true; seven media Functions ACTIVE; captured Firestore/Storage match September 9/8 releases; 66 indexes READY but two actual Event queries need missing indexes. Synthetic emulator tests reproduce conversation takeover/private-message disclosure, broad read-only-admin mutation, forged companion/booking/payment authority and real v2 cancellation denial. See [PHASE_00_COMPATIBILITY_REPORT.md](PHASE_00_COMPATIBILITY_REPORT.md) before any implementation. No production exploit or fix was performed.

Source baseline inspected: `5ecc696`; browser observation was public guest only. Existing media release and comment repair have dated evidence, not blanket production certification. Production Firestore rules match the September 10 baseline byte-for-byte; fresh rollback saved at `docs/sathi/rollbacks/messaging-readiness-2026-09-10/firestore.rules`. Production Storage is scoped; local KYC branches are not proof of deployed access. Legacy Functions include destructive/obsolete handlers; do not bulk activate. Prior billing notes conflict with later media deployment evidence: confirm current billing and explicit authority before new Functions deployment. App Check/PWA upgrade and device acceptance remain unresolved. See [20_TARGET_ARCHITECTURE.md](20_TARGET_ARCHITECTURE.md).

## Phases and next task

Latest verification: [ANTIGRAVITY_RESUME_REVIEW.md](ANTIGRAVITY_RESUME_REVIEW.md) and [MESSAGING_RELEASE_READINESS.md](MESSAGING_RELEASE_READINESS.md). Antigravity's unread-reset application writer correctly updates only unreadCount/updatedAt; independent continuation added actual component coverage. Fresh local results: 48 candidate emulator checks, 270 main tests (including nine writer tests), TypeScript and Vite/PWA build pass. Candidate hash remains `28709c31...`; no deployment or production access in this continuation. Historical staff draft evidence remains 11 passes/nine failures, not rerun here. Separate untracked booking drafts have invalid/unsafe lock rules and a stale baseline; preserved untouched, NOT qualified.

Inventory correction: saved capture reports36 conversations (5 standard,30 opaque-ID,1 reversed),306 messages and35 missing referenced parents. These counts are not a fresh independent scan. The previous claim that opaque IDs make30 conversations invisible is withdrawn: inbox selection uses returned IDs; canonical entry paths and stored-id overrides need separate qualification. Stored id was not projected, so missing/mismatched stored IDs remain unknown. Identifier samples have been removed from the saved inventory/report; aggregate counts and rollback rules remain. See corrected [MESSAGING_RELEASE_READINESS.md](MESSAGING_RELEASE_READINESS.md).

Latest approved read: [MESSAGING_METADATA_RESULT.md](MESSAGING_METADATA_RESULT.md), snapshot2026-09-10T15:47:04.801Z. Complete same-snapshot36 parent/306 message capture: ALL306 messages reference35 existing valid parents; all36 stored IDs match document IDs; zero missing/ambiguous references or duplicate member pairs. Six canonical/30 opaque parents. This contradicts the earlier orphan report; cause unknown without its original collector/full inputs. No repair was performed and no migration is indicated. Reader/classifier21/21 checks pass. Next: owner review of existing-thread canonical entry-path compatibility, then separately approved live rules/index/acceptance gate—not automatic deployment or bookings/staff/payment work.

Phase 0 evidence collection is complete; security/production acceptance is NOT passed. No product implementation phase is complete. Next recommended owner decision: authorize narrowly scoped P0 messaging/favorites containment, then staff/approval/booking/payment compatibility fixes from the Phase 0 report. Do not proceed automatically into roadmap Phase 1 or deploy root rules. After containment review, follow the dependency graph and selected prompt in [30_IMPLEMENTATION_ROADMAP.md](30_IMPLEMENTATION_ROADMAP.md). Stop for review after every phase.

Latest local entry-path fix: [MESSAGING_ENTRY_PATH_REVIEW.md](MESSAGING_ENTRY_PATH_REVIEW.md). The approved minimal shared resolver is implemented locally: companion entry and creation reuse an existing opaque/reversed/canonical parent by stored membership, while a proven new pair uses canonical create-if-absent. Peer identity comes from validated membership/public profile mapping, not ID splitting. Lookup is server-backed, bounded to five 100-document pages, and fails closed on errors, partial results, malformed pages or ambiguity. UI and document IDs remain unchanged. Evidence: 301 main tests, 49 isolated candidate emulator checks, TypeScript, Vite/PWA build and diff check pass. Gate B again passed twice on 2026-09-12, with fresh rollbacks `rollbacks/messaging-release-2026-09-12T14-17-18-188Z` and `rollbacks/messaging-release-2026-09-12T14-17-20-307Z`; both contain the same baseline. The subsequent scoped Gate C deploy attempt made no active rules change: readback reports the original `5e155...` baseline rather than candidate `28709...`; no app publish or two-user acceptance occurred. Do not retry automatically. Investigate Firebase CLI deployment diagnostics under separate explicit authority, rerun Gate B, then require candidate readback before any app publication.

## Read and verify

Start with AGENTS.md, 20 target, 21 permissions, 30 roadmap, 31 registry, then the selected domain document (22–28). For UI also read 29 information architecture and 32 design tokens. Keep the SATHI logo/current theme; navigation changes are proposed, not silently approved.

Run scoped unit/type/build checks and relevant positive/negative emulator cases. Record actual outputs and included suites, not historical counts. For each release verify exact live indexes/rules and authorized two-user persistence/denials. Emulator/build success is not production proof. Append CHANGELOG with evidence, untouched scope, risks and rollback. Use dry-run, backup, bounded pages and update-time preconditions for any later approved migration; never delete journals for rollback.

## Implementation instruction

> Do not redesign architecture. Implement the approved phase according to these documents. Preserve current production data and existing working features. If implementation appears to require architecture changes, document the conflict rather than silently inventing a new system.
