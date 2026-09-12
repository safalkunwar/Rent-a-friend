# Documentation status — 2026-09-12

## Purpose

This index separates current operational evidence from historical audits and target design. It prevents a dated report from being read as either a current deployment claim or a reason to repeat a completed rollout.

## Current source of truth

| Topic | Current document | Status |
| --- | --- | --- |
| Continuation and safe next work | [ANTIGRAVITY_HANDOFF.md](ANTIGRAVITY_HANDOFF.md) | Current |
| Messaging/favorites scoped release | [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md) | Active; dedicated-account SDK acceptance passed |
| Messaging release inputs, rollback and historical CLI no-op | [MESSAGING_RELEASE_GATE.md](MESSAGING_RELEASE_GATE.md) | Closed for this scoped release |
| Session-by-session changes | [CHANGELOG.md](CHANGELOG.md) | Current append-only record |
| Target architecture and future phases | [20_TARGET_ARCHITECTURE.md](20_TARGET_ARCHITECTURE.md), [30_IMPLEMENTATION_ROADMAP.md](30_IMPLEMENTATION_ROADMAP.md), [31_DATA_CONTRACTS.md](31_DATA_CONTRACTS.md) | Design only; not implementation proof |

## Release state

| Item | State | Evidence limit |
| --- | --- | --- |
| P0-01 messaging/favorites containment | Deployed to Firestore `cloud.firestore` on 2026-09-12 | Active source hash/readback and dedicated A/B/C SDK acceptance passed; no real-user conversation probe |
| Existing-thread resolver app code | Pushed through the existing GitHub/Vercel integration | Public asset contains the resolver; installed-PWA cache acceptance is not complete |
| P0-02 staff authority | Open | No branch-scoped containment release |
| P0-03/P0-04 booking/payment/lock authority | Open | Untracked booking draft is unsafe and not qualified |
| P0-05 legacy deployment inputs | Open | Root rules and legacy Functions remain unsuitable for blanket deployment |
| P1 Event participant query indexes | Completed index-only release | Both exact service query shapes have one `READY` composite and passed zero-row production probes; Event policy/contracts remain open |
| Event participation contracts/policy | Open | Roster privacy, creation, joining/removal and capacity behavior are excluded rules/data-contract work |
| PWA update foundation | Local application change verified | The worker now waits for user refresh; installed-PWA, device and Capacitor acceptance remains open |
| App Check and PITR/restore | Open | No production-certification claim |

## How to read the remaining Markdown

- `PHASE_00_COMPATIBILITY_REPORT.md`, `ASTRA_CODEBASE_AUDIT.md`, `FIREBASE_CURRENT_STATE.md`, and dated rollout reports are evidence snapshots. Preserve their original observations; read their status updates and the current documents above before acting.
- `00_*` through `16_*` and `20_*` through `32_*` describe product/architecture intent. They are not an approval to deploy a matching feature.
- `docs/` and `docs/firebase/` contain useful legacy reference material, but are not current release truth unless a newer `docs/sathi/` record explicitly confirms it.
- Untracked local Markdown drafts are not part of the committed authoritative set. Do not use them as a deployment or migration mandate until their referenced implementation and tests are reviewed together.

## Safe next action

Do not repeat the messaging rollout or deploy root Firebase configuration. The Event query index gap is closed, but Event policy is not. With permission and payment work deferred, the next safe task is browser/device acceptance of the already-built user-controlled PWA update flow; it requires no Firebase policy change.
