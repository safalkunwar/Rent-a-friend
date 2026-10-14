# Companion review case-scope gate — local candidate, 2026-09-30

This is a second-stage **local** Phase 0/1 rules candidate. It does not change deployed Firestore rules, authorize a reviewer, establish identity evidence, or enable the paused review UI. It builds on the frozen [first companion authority candidate](COMPANION_AUTHORITY_CONTAINMENT_GATE_2026-09-26.md), rather than applying a new patch to live rules.

## Exact inputs and outputs

| Artifact | SHA-256 |
| --- | --- |
| First-stage standalone authority input | `966cb23050ee082543c449b359a74e2e6c15a091e001f62d9e07eb8dc5cc28b4` |
| First-stage booking-combined authority input | `b6eb8e7503db696e8afee82d7c910d6c22d9cba7e31b230bbc4196c6cf8c444c` |
| New standalone case-scope output | `90c64653f78363a2b0fb52949e33d1f017a79a8d2b205e788c61c438d98e476c` |
| New booking-combined case-scope output | `2b13d40ad67a87851aa9919390d23b99cc95fec45917e3c5590016fff616e386` |

The reviewed patch and generator are in `ops/companion-review-case-containment/`. The generator refuses changed input bytes. After the 2026-10-12 booking release, the active source hash is `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f`, byte-identical to the booking input used to produce the listed combined outputs. This confirms composition alignment, not a fresh companion/application inventory or authority release. The case-scoped output remains local and unreleased.

## Behavior proved locally

- A `kyc_reviewer` must have a trusted role claim, a matching `admins/{uid}` role, and an active `companion_review_cases/{applicationId}` document for the same application, subject UID and reviewer UID. A generic admin or a reviewer with no, revoked or wrong-subject case cannot approve.
- Application owners retain direct and owner-filtered list reads. A reviewer may directly read only an assigned application; its queue first queries its own case documents with a 50-record limit and then directly fetches those applications. Root retains the existing status queue. The local admin page supplies the current role/UID and surfaces read errors.
- Root can create or revoke a case only with a newly created, immutable matching `admin_audit_logs/{auditId}` document in the same atomic write. The rules bind action, actor, application, subject, reviewer and case version and reject absent/mismatched audit. Ordinary user/reviewer case creation and deletion remain denied. The application/user/profile/audit approval transaction remains governed by the earlier containment candidate. Existing booking/payment/staff rules were composed and regression-tested with this second-stage output.
- `VITE_COMPANION_REVIEW_ENABLED` remains unset; local UI and repository review writes stay paused. No real reviewer assignments were created in production.

## Validation and limits

The exact booking-combined output passed **74/74** isolated Firestore emulator checks: six case-scope checks, 29 booking checks, and 39 payment/staff regressions. The case suite includes missing/mismatched assignment and revocation audit negatives and owner/root list-query positives. The source/hash/drift static checks passed **3/3**. The scoped repository tests passed **15/15**, the full main suite **375/375 across 47 files**, main TypeScript and Vite/PWA build passed. These are local checks, not dedicated-account production acceptance. The build retains its existing large-chunk warning.

Release blockers remain: case assignment/revocation needs a reviewed operational command and reassignment path; the first 50 cases need pagination/continuation; root break-glass needs independent review; actual identity, adult/evidence and retention policy are unapproved; the 40 historical profile-to-UID links need private person/account confirmation; and the backend command must enforce these checks because Admin SDK bypasses rules. Fresh active-source and rollback capture, exact diff, applicable indexes, device/PWA and dedicated-account SDK acceptance are required before any separately authorized release. No rules, Functions, data, money or UI deployment was performed.
