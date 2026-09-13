# Documentation status — 2026-09-13

## Purpose

This index separates current operational evidence from historical audits and target design. It prevents a dated report from being read as either a current deployment claim or a reason to repeat a completed rollout.

## Current source of truth

| Topic | Current document | Status |
| --- | --- | --- |
| Continuation and safe next work | [ANTIGRAVITY_HANDOFF.md](ANTIGRAVITY_HANDOFF.md) | Current |
| Messaging/favorites scoped release | [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md) | Active; dedicated-account SDK acceptance passed |
| Messaging release inputs, rollback and historical CLI no-op | [MESSAGING_RELEASE_GATE.md](MESSAGING_RELEASE_GATE.md) | Closed for this scoped release |
| Payment-write containment | [PAYMENT_STAFF_RELEASE_RESULT.md](PAYMENT_STAFF_RELEASE_RESULT.md) | Deployed as combined release; live SDK acceptance passed |
| Operator bootstrap and staff assignments | [STAFF_BOOTSTRAP_AND_ASSIGNMENT_GATE.md](STAFF_BOOTSTRAP_AND_ASSIGNMENT_GATE.md), [release result](PAYMENT_STAFF_RELEASE_RESULT.md) | Operator root claim verified; assignment containment deployed; broader RBAC open |
| Combined payment/assignment release input | [PAYMENT_STAFF_COMBINED_RELEASE_GATE.md](PAYMENT_STAFF_COMBINED_RELEASE_GATE.md) | Closed scoped gate; 39 emulator and 28 production SDK checks passed |
| Session-by-session changes | [CHANGELOG.md](CHANGELOG.md) | Current append-only record |
| Target architecture and future phases | [20_TARGET_ARCHITECTURE.md](20_TARGET_ARCHITECTURE.md), [30_IMPLEMENTATION_ROADMAP.md](30_IMPLEMENTATION_ROADMAP.md), [31_DATA_CONTRACTS.md](31_DATA_CONTRACTS.md) | Design only; not implementation proof |

## Release state

| Item | State | Evidence limit |
| --- | --- | --- |
| P0-01 messaging/favorites containment | Deployed to Firestore `cloud.firestore` on 2026-09-12 | Active source hash/readback and dedicated A/B/C SDK acceptance passed; no real-user conversation probe |
| Existing-thread resolver app code | Pushed through the existing GitHub/Vercel integration | Public asset contains the resolver; installed-PWA cache acceptance is not complete |
| P0-02 staff authority | Initial operator bootstrap and assignment containment released; broader RBAC open | Live root management and lower-role denial checks passed; six legacy generic roles and broad resource grants remain unchanged |
| P0-03/P0-04 booking/payment/lock authority | Payment-document write containment released; broader work open | Live customer/finance/root payment-write denials passed. Booking payment flags/locks remain unqualified; inherited draft unsafe |
| P0-05 legacy deployment inputs | Open | Root rules and legacy Functions remain unsuitable for blanket deployment |
| P1 Event participant query indexes | Completed index-only release | Both exact service query shapes have one `READY` composite and passed zero-row production probes; Event policy/contracts remain open |
| Event participation contracts/policy | Open | Roster privacy, creation, joining/removal and capacity behavior are excluded rules/data-contract work |
| PWA update foundation | Published asset integrity and local lifecycle harness verified | Eight PWA tests now cover worker registration/waiting/defer/explicit activation paths; real installed-PWA, device and Capacitor acceptance remains open |
| App Check and PITR/restore | Open | No production-certification claim |

## How to read the remaining Markdown

- `PHASE_00_COMPATIBILITY_REPORT.md`, `ASTRA_CODEBASE_AUDIT.md`, `FIREBASE_CURRENT_STATE.md`, and dated rollout reports are evidence snapshots. Preserve their original observations; read their status updates and the current documents above before acting.
- `00_*` through `16_*` and `20_*` through `32_*` describe product/architecture intent. They are not an approval to deploy a matching feature.
- `docs/` and `docs/firebase/` contain useful legacy reference material, but are not current release truth unless a newer `docs/sathi/` record explicitly confirms it.
- Untracked local Markdown drafts are not part of the committed authoritative set. Do not use them as a deployment or migration mandate until their referenced implementation and tests are reviewed together.

## Safe next action

Do not repeat the messaging rollout or deploy root Firebase configuration. The owner resumed remaining-task implementation and authorized the initial super-admin selection; earlier blanket permission/payment deferral is no longer the current implementation status. Real-money activation and new Functions deployment remain separately gated.

The combined payment/staff-assignment release is now active as source hash `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402`. Do not repeat it, deploy isolated candidates, or use its pre-release baseline for a new patch. Next: remaining legacy staff classification/resource-level RBAC and booking/lock compatibility against this new active source. Event policy and physical-device/PWA acceptance remain open; test/build counts do not close those gates.
