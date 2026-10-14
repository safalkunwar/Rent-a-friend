# Companion authority containment — local gate, 2026-09-26

## Outcome

A scoped local Firestore rules candidate now denies ordinary-user self-verification, legacy/generic-admin approval writes, and public profile creation outside a reviewer decision. Approval requires matching application, user-status, public-profile and audit writes in one Firestore transaction. It has **not** been deployed. The broader Phase 0/1 authority model is still open.

## Composition status after the 2026-10-12 booking release

The active Firestore source is now hash `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f`, byte-identical to the paired booking/lock input used for this gate. The existing booking-combined authority output remains `b6eb8e7503db696e8afee82d7c910d6c22d9cba7e31b230bbc4196c6cf8c444c`; the second-stage case-scoped combined output remains `2b13d40ad67a87851aa9919390d23b99cc95fec45917e3c5590016fff616e386`. Their source composition remains exact, so no regenerated candidate was needed. These authority outputs are still local and unreleased; the booking release did not approve them. Fresh authority data inventory, policy decisions, operational reviewer assignment, and a separate release review remain prerequisites.

| Artifact | SHA-256 | Source |
| --- | --- | --- |
| Last read active rules baseline | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` | `docs/sathi/rollbacks/booking-compatibility-2026-09-25T15-53-37-569Z/firestore.rules` |
| Standalone companion authority candidate | `966cb23050ee082543c449b359a74e2e6c15a091e001f62d9e07eb8dc5cc28b4` | `ops/companion-authority-containment/candidate.firestore.rules` |
| Booking + companion authority candidate | `b6eb8e7503db696e8afee82d7c910d6c22d9cba7e31b230bbc4196c6cf8c444c` | `ops/companion-authority-containment/booking-combined.firestore.rules` |

`ops/companion-authority-containment/generate.mjs` rejects a baseline hash mismatch. The booking input is exactly `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f`; the patch changes the `users`, `companions` and `companion_applications` branches and dedicated `sathiAuthority*` helpers only. The generated candidate is deterministic; no root `firestore.rules` or deployed source was changed.

## Behavior covered

- Only a non-anonymous super-admin claim or a `kyc_reviewer` claim paired with an active matching `admins/{uid}` assignment may review. A stale reviewer claim after assignment revocation fails. Legacy `users.role=admin`, `admin=true`, finance and other staff roles cannot grant companion authority.
- The application must move from `SUBMITTED` or `UNDER_REVIEW` to one reviewed outcome. A reviewer cannot act on their own application. The reviewed user status points to that exact application; approval also makes the public profile point to it. An immutable audit document with matching actor, action and target must be created in the same transaction.
- A user cannot create a verified public profile or change their own approval/KYC status. The owner draft → partial KYC save → submit flow remains possible, with KYC verification kept `UNVERIFIED`. The public projection uses an explicit field allowlist, excluding private contact/KYC fields.
- The existing application repository now commits the four review writes atomically, rejects stale/self decisions, requires a canonical private KYC path and complete current public booking data, rejects a mismatched existing profile owner, and preserves an existing canonical profile's `createdAt`. Partial draft updates use dotted fields so they do not replace the KYC map.
- Existing public discovery reads and bounded owner public-field edits remain. Existing legacy booking history remains readable and client-read-only under the combined booking rules.

## Validation and limits

### Fresh read-only compatibility inventory

At `2026-09-26T02:53:46.640Z`, a bounded projected production read found **103 users, 40 companion profiles, one submitted application and zero `admins` documents**, all under the 1,000-document cap. All 40 profiles had `isVerified=true`, but every profile document ID differed from its stored `userId`. None of the 103 users had `companionStatus='APPROVED'`; there were no new approval pointers. These are aggregate counts only; names, contacts, KYC values and identifiers were not written to the report. The inventory is paged, not an atomic database snapshot. Active rules were the same `764eb7a3...` source before and after. See `docs/sathi/rollbacks/companion-authority-2026-09-26T02-53-46-637Z/manifest.json`.

This finding materially changes release readiness: the 40 historical `isVerified` flags do not prove a reviewed capability, and the current v2 booking contract has **no existing production profile that satisfies its canonical ID plus approved-user requirement**. The zero assignment documents also mean a non-root KYC reviewer cannot use the new reviewer rule until an assignment is created through the already scoped operator path. The synthetic positive emulator profiles are compatibility checks, not production eligibility evidence. Do not auto-migrate these profiles or infer identities from display names.

**September 30 read-only structural follow-up:** A fresh capture at `2026-09-30T06:36:20.461Z` retained the same active rules hash and aggregate cohort counts. Each of the 40 noncanonical profiles stores a `userId` that points to one of the 103 user documents; no stored UID is shared by multiple profiles, no old profile document ID collides with a different user document, and none of the proposed canonical profile IDs is already occupied. The persisted redacted report is `docs/sathi/rollbacks/companion-authority-2026-09-30T06-36-20-455Z/manifest.json`. This establishes a **structural candidate crosswalk only**. It does not prove that the user controls the historical profile, that the person matches an identity document, or that the old verified flag is valid. No profile was copied, changed or deleted. The private per-record review and policy in [the Phase 1 proposal](PHASE_01_IDENTITY_EVIDENCE_DECISION_2026-09-30.md) remain mandatory.

The final combined Firestore emulator run passed **78/78** checks: ten authority cases, 29 booking transaction cases and 39 payment/staff regressions. Four static source/hash/drift checks passed. The final main app suite passed **360/360** across 45 files; main TypeScript and Vite/PWA build passed. The prior 2026-09-25 admin 41/41, Functions TypeScript, and booking-policy checks remain evidence from that session; neither admin nor Functions source changed for this candidate. No live SDK acceptance or production mutation occurred.

This is a **containment candidate, not production authority certification**. It does not verify that a Storage document exists, establish adult eligibility, authenticate a reviewer to an assigned case/evidence record, or supply a server-authoritative Phase 1 eligibility command. The super-admin claim remains a privileged break-glass path; broader `isAdmin()` read/delete and other resources still need separate RBAC review. Historical flags predate the new audit chain. The redacted inventory establishes noncanonical IDs and missing user approval; an individually reviewed source-of-truth crosswalk and private/public schema compatibility plan are still needed before cutover.

The standalone admin Companion and Guide screens now show historical records read-only; their direct verification, legacy Guide approval/rejection, status mutation and fabricated document-preview controls were removed locally on September 30. The main application review page is paused by default behind `VITE_COMPANION_REVIEW_ENABLED`; its repository also rejects review calls while the gate is off. This removes conflicting local operator paths but does not qualify the underlying evidence, age, reviewer-assignment or legacy identity contracts. A new release still needs current active-source readback, exact index/rule semantic diff, rollback source, dedicated-account positive/negative SDK acceptance and separate owner authority. Any real-money booking or new Functions release is further gated by provider, billing, KYC and operational review.

The local consumer UI now hides historical approval badges and defaults new v2 booking entry to unavailable using `VITE_BOOKING_V2_UI_ENABLED` (unset/off in the tested build). Even with that flag set later, the presentation helper requires a canonical ID, linked application badge and available days. This is a truthful UI gate only; it cannot secure old clients or substitute for the Firestore candidate and backend eligibility checks. Existing messages and booking history remain reachable.

Rollback for an unperformed release is simply to retain the active source. For a future approved scoped release, capture the fresh active rules and immutable rollback artifact immediately before deployment; never use the 2026-09-25 hash as an unverified current baseline.
