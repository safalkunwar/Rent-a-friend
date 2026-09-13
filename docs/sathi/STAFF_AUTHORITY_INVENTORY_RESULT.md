# Staff authority inventory result — 2026-09-13

## Verdict

**Historical capture verdict: owner role-classification decision required before broad P0-02 staff containment.**

Update after this capture: the owner authorized initial root selection; a verified matching operator account now has an Auth super-admin claim. The original zero-claim counts below describe the earlier read, not current Auth state. Narrow assignment containment is locally tested, not deployed. See [STAFF_BOOTSTRAP_AND_ASSIGNMENT_GATE.md](STAFF_BOOTSTRAP_AND_ASSIGNMENT_GATE.md). Classification of the other legacy records remains open; two recovery accounts are a recommendation, not a mandatory condition imposed by the owner.

The production read found a complete bounded inventory (no source reached its 1,000-record cap), but no trusted staff-role source exists today:

| Source | Records scanned | Staff authority found |
| --- | ---: | --- |
| Firebase Auth custom claims | 109 | None (`admin`, `role == admin`, and `adminRole` all absent) |
| `admins/{uid}` assignments | 0 | None |
| `users/{uid}` legacy roles | 102 | Six `role == admin` records; no typed `adminRole` |

The active Firestore release exactly matches the messaging-containment source (`28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`). Its complete rollback copy and aggregate-only inventory are retained in [rollbacks/staff-authority-read-2026-09-13T01-13-27-091Z](rollbacks/staff-authority-read-2026-09-13T01-13-27-091Z).

## Why this blocks implementation

The legacy generic marker currently grants broad `isAdmin()` authority. Neither the current data nor the application identifies which of the six accounts is a super admin, booking operator, moderator, KYC reviewer, finance reviewer, or read-only support user. Inventing that mapping would either preserve the demonstrated escalation path or unexpectedly lock legitimate staff out.

The existing combined staff/payment draft remains unsafe and must not be deployed: it trusts an `admins/{uid}` document that legacy broad admins could create themselves. The live inventory found no such documents, so an additive document-based policy has no compatibility evidence.

## Required owner decision

Choose one explicit migration policy before any staff-rule or custom-claim write:

1. Provide a private UID-to-role mapping for the remaining generic legacy admins; a second independently controlled recovery account is recommended; or
2. Explicitly authorize a temporary read-only freeze for all six legacy admins while you prepare that mapping.

The mapping must stay out of Git and changelog artifacts. After the choice, the next gate will create a claims-first candidate, test escalation/revocation/regressions, perform a semantic diff against the saved active source, and request a separate production deployment approval.

## Untouched scope

No production document, Auth claim, rules release, Storage, Function, Hosting, booking, payment, KYC, or admin assignment was changed. The production read used only aggregate counts and did not save or print identifiers, profile data, claim payloads, or private document fields.
