# Phase 1 identity and evidence decision — proposal with owner age constraint, 2026-09-30 / updated 2026-10-14

This is a proposed operating contract for the owner's review, **not** an active KYC policy or permission to approve, migrate, publish, deploy Functions, or collect more identity data. Phase 1 remains blocked by the 40 historical noncanonical companion profiles, missing approved-user links, missing reviewer assignments and unverified evidence. The local review UI/repository gate stays off.

## Recommended decision

| Question | Proposed answer | Release condition |
| --- | --- | --- |
| Who can offer in-person SATHI services? | Adults whose birth date, person-to-account match and identity document have been checked; preserve **18+ as the owner-confirmed product floor wherever the service/action is adult-gated**. Unknown age is not eligible. General browsing is not thereby age-gated. | Owner confirmed this product constraint on 2026-10-14. Nepal counsel must still validate legal majority/capacity and service-specific obligations before activation. |
| What is sufficient evidence? | Reviewer opens an actual private Storage object, checks an accepted government-issued identity document for name and date of birth, and compares the person to an applicant selfie or equivalent live verification. A path string, masked number or legacy `isVerified` flag alone never passes. Missing DOB or unreadable evidence returns `CHANGES_REQUIRED`. | Document types, expiry handling, language/transliteration and physical/remote review procedure approved and tested. |
| Who decides? | A non-subject reviewer with a trusted role claim and active assignment to the **specific case**. Recheck assignment at commit; preserve reason, evidence version and immutable audit. Super-admin break-glass is logged and independently reviewed. | The [second-stage local case-scope candidate](COMPANION_REVIEW_CASE_GATE_2026-09-30.md) checks active case/revocation and requires a coupled immutable assignment/revocation audit in the emulator. An operating command and dual-control exceptions remain unresolved; nothing is released. |
| What is stored publicly? | Only a derived, versioned eligibility/badge projection tied to the canonical UID and application. Never expose document image, legal name, number, birth date, phone or reviewer notes on a public profile. | Public/private projection and rules tests pass. |
| How long is raw evidence retained? | Decide a documented minimum/maximum period with Nepal counsel; keep access logging, withdrawal/deletion and legal-hold handling. **No automatic deletion or indefinite-retention claim is approved by this proposal.** | Written retention schedule, deletion/appeal/incident procedure and backup handling approved. |

## Legal-source notes for review

The Nepal Law Commission's English text of the [Privacy Act, 2075 (2018)](https://giwmscdnone.gov.np/media/app/public/275/posts/1721034328_44.pdf) treats birth details and government identity-document identifiers as personal information. Sections 11–12 address privacy of personal documents/data; section 12 includes consent and purpose limits for personal/family data collected with consent. The Act also contains requirements about informing a person of purpose and process in specified collection contexts. These points support minimizing KYC collection, explaining its purpose, and limiting use to that purpose. They do not settle which provisions apply to each SATHI flow, whether an alternative lawful basis applies, or a sufficient retention period. Nepal counsel must review the Nepali authoritative text and current subordinate rules before activation.

The [Nepal Law Commission Civil Code listing](https://lawcommission.gov.np/content/13455/civil-code-2074/) is a primary review source, but this proposal has not verified a service-specific adulthood threshold from it. **18+ remains a proposed SATHI product floor, not a legal conclusion.** Counsel should confirm majority, capacity, and any stricter requirements for each in-person service. The English Privacy Act PDF link was available from the Commission's listing, while automated retrieval of the PDF timed out during this review; statutory detail above is a screening note, not a substitute for counsel's source-text verification.

## Decision status — updated 2026-10-14

The owner confirmed preservation of the service-specific 18+ product floor for adult-gated services/actions, 10 Coins = NPR 1 as the internal reference denomination, cash redemption disabled behind its feature gate, a maximum five referral levels, and centrally/admin-controlled partner rates. The recorded owner decision has no separate ticket/reference. The 18+ requirement is a product constraint, not a legal conclusion. Architecture 21 explicitly labels Free Friend as adult+identity eligible and Host as requiring service eligibility; 22 explicitly labels Free Friend and Local Host adult and requires full identity, current credential and verified agency for Guide. Record the exact Guide/provider/consumer action matrix with counsel and operations before implementing age gates; do not apply the rule to general browsing.

All other Phase 1 policy choices remain open: accepted identity documents and expiry/language handling; DOB and person-to-account match method; canonical eligibility fields; private evidence readers; retention, deletion, appeal and legal-hold schedule; reviewer assignment, escalation and break-glass; and the 40 historical profile review boundary. The owner has not supplied a counsel reference/date or named operational reviewer lead. See [the consolidated decision register and implementation audit](PHASE_01_COINS_DECISION_REGISTER_2026-10-14.md). Do not enable review or booking flags on the basis of the proposal or the partial age decision.

The Nepal Law Commission's [Privacy Act listing](https://lawcommission.gov.np/content/12261/the-privacy-act-2075/) and [Civil Code listing](https://lawcommission.gov.np/content/13455/civil-code-2074/) are primary sources for counsel's review. This document does not interpret either statute or assert that a particular retention period is legally sufficient.

## Historical profile crosswalk: dry-run contract

The September 26 projected read-only inventory counted 103 users and 40 companion profiles. Every profile document ID differed from its stored `userId`; all 40 had the historical verified flag and none of the users had `companionStatus='APPROVED'`. A stored `userId` can suggest a candidate account, but **does not prove control of the person or the document**. The single submitted application does not validate the other 39 profiles.

A September 30 read-only structural rerun found that all 40 stored `userId` values point to existing user documents, no stored UID is shared by multiple profiles, and no canonical target ID is occupied. This makes a one-to-one **candidate** crosswalk possible, subject to individual ownership/evidence review; it does not grant approval. The redacted capture is `docs/sathi/rollbacks/companion-authority-2026-09-30T06-36-20-455Z/manifest.json`.

For each historical profile, a private review should record source document path and update time, proposed canonical UID, the linked Auth/user account, account-owner confirmation, evidence/application reference, current booking/history references, collision results, reviewer and decision. Names, email, phone, photos or similar display attributes must never be the sole join key. If the UID is absent, shared by multiple profiles, conflicts with an existing canonical document, or lacks evidence, leave the profile legacy/readable and commercially ineligible. Do not overwrite or delete the source profile.

A future dry-run should assert the project ID, read bounded pages, persist only aggregate reason counts, detect duplicate source/target mappings, and produce a private case queue. An approved migration then needs a per-record compare-and-set on the captured update time, idempotent crosswalk ID, backup/restore drill, exact affected-document list in a protected channel, and a post-write count/ownership comparison. Keep the old ID as a compatibility reference for existing bookings, messages and URLs. A new canonical profile is created only after identity review and the authority command succeeds; no bulk `isVerified` conversion.

## Command and acceptance gate

The intended Phase 1 command takes an authenticated actor, case/application ID, expected version, evidence reference/version, decision and reason. It verifies actor assignment, subject UID, age/evidence result, duplicate identity key and current application state, then commits application decision, private access snapshot, public projection and audit atomically. Server authorization must recheck all of these because Admin SDK bypasses Firestore rules. A client transaction can remain a local compatibility step but is not the final backend authority.

Negative tests must cover missing/expired evidence, unknown age, self-review, stale/revoked/wrong-case reviewer, duplicate identity key, conflicting profile UID, replayed decision and unavailable config. Positive tests must show one canonical UID, one versioned access snapshot, a minimized public projection and intact legacy history. Run an isolated emulator/integration gate, a no-write production dry run, exact rules/index diff, rollback rehearsal and dedicated-account SDK acceptance before any release. New Functions require the separate billing/runtime and explicit deployment gate in `AGENTS.md`.

## Decisions needed before implementation can qualify

1. Confirm service-by-service adult threshold, accepted identity documents and evidence for DOB/person match, with Nepal legal review.
2. Approve a concrete private-evidence retention/deletion/hold schedule and who may inspect it.
3. Name the operational reviewer assignment and escalation process, including case scope and super-admin break-glass review.
4. Authorize a protected per-record historical identity review; do not provide raw identity details in a public issue or aggregate report.

Until these are resolved, keep `VITE_COMPANION_REVIEW_ENABLED` and `VITE_BOOKING_V2_UI_ENABLED` unset, and treat local rule candidates as unreleased containment work.
