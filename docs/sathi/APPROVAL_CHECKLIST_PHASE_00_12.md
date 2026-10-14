# SATHI Phase 0–12 approval and evidence checklist

**Status: open.** This checklist separates decisions and release authority from implementation work. A completed local build, emulator suite, draft policy, or broad request to finish the roadmap does not replace the specific approval required for production rules, Functions, funding, legal policy, migrations, or feature activation.

## Decisions needed from the product owner and counsel

| Phase | Decision required | Record needed before dependent implementation or activation |
| --- | --- | --- |
| 1 — Identity and verification | Approve service-by-service age floor; accepted identity/evidence and person-match procedure; profile eligibility fields; private evidence readers; retention, deletion, appeal and legal-hold rules; reviewer assignment, escalation and break-glass process; historical account-crosswalk review boundary. Nepal counsel must review applicable age, privacy and evidence obligations. | Approved policy reference/date and operating procedure. Keep review/booking flags off until backend authority and tests match the policy. |
| 2 — Free Friend and Host | Approve distinct intent definitions, consent/request/accept/block behavior, the five distinct full-profile grants per Nepal day, exact fields returned by an entitlement, and handling of historical conversations without granting new-send authority. | Owner-approved service-mode and disclosure decision; counsel review where contact/safety rules require it. |
| 3 — Ledger foundation | Finance/owner approval of the chart of accounts, funding-source authority, operation/reversal authority, reconciliation ownership and discrepancy escalation. | Signed accounting and operations decision. No real value, wallet activation or provider action follows from the local contracts alone. |
| 4 — Agencies and Guides | Approve licensing/credential types, verification and expiry treatment, primary-affiliation/transfer terms, private document access and retention. Nepal counsel review required for regulated guide operations. | Approved agency/guide policy and credential-handling procedure. |
| 5 — Booking v3 and payments | Approve merchant/provider, commission, cancellation/refund terms, quote/hold expiry, dispute and late-payment treatment. Provide sandbox credentials through the approved secret channel. | Owner/merchant/counsel approval plus provider sandbox access; no production payment or payout approval is implied. |
| 6 — Partners and offers | Approve partner identity/authority, offer terms, discount or cashback funding base, cap/quota, suspension and expiry treatment. | Signed merchant terms and a funded offer budget before any reward is posted. |
| 7 — QR redemption | Approve redemption purpose, partner/staff authority, corrections, timeout/retry behavior and any cashback funding. Provide a supported camera/device for two-actor acceptance. | Owner/merchant policy and funded cashback decision if applicable; device acceptance record. |
| 8 — Coins | Owner/product: accept or replace the proposed 100-Coin welcome award, 1,000-account cap, 50-Coin unlock price, full-profile fields, qualification and abuse exclusions. Finance: approve NPR budget, funding evidence/reference, funding account, campaign dates, budget monitor, grant cap and immediate posting versus vesting/hold. Counsel: review legal classification, disclosures, age/privacy, complaints, expiry and reversal remedy. Engineering: qualify Phase 1 identity, Phase 2 entitlement and Phase 3 durable replay/reversal/reconciliation. | Completed [Coins policy input template](PHASE_08_REWARD_POLICY_INPUT_TEMPLATE.md), funding proof kept private, counsel/finance references, and independent release decision. Cash redemption, purchase, transfer and referral awards remain out of scope. |
| 9 — Events and admission | Approve event creation/publishing eligibility, roster privacy, join/remove/capacity policy, moderation/tombstone treatment and any publication/admission cost. | Owner-approved Event policy and corresponding rules/data-contract review before changing Event behavior. |
| 10 — Personalization/navigation | Approve any route-shell/navigation redesign, optional preference collection and recommendation boundaries. | Owner-approved navigation map and device/PWA acceptance. Existing local presentation work does not activate service eligibility. |
| 11 — Trip safety | Approve consent scope, trusted-contact access, retention/legal-hold policy, SOS acknowledgement meaning, staffing/escalation coverage, false-alarm handling and provider consent. | Named staffed operational owner and reviewed safety/retention procedure before any claim of monitoring or dispatch. |

## Separate release and infrastructure approvals

| Gate | Explicit input required | Scope boundary |
| --- | --- | --- |
| Phase 0 next rules branch | Separate approval naming the exact candidate and scope: current-source analytics RBAC or companion authority/case review. | The booking/lock approval does not authorize another rules release, root rules, broad RBAC, or a Functions deployment. |
| Any Cloud Functions deployment | Confirm the Firebase Blaze upgrade is complete, then separately authorize the reviewed Functions names, source hash, configuration, billing/runtime and rollback plan. | No bulk deployment of legacy exports. |
| App Check | Confirm provider/site-key and exact production host per consumer web/admin/native app; resolve admin Firebase app and hosting identity; complete token monitoring and supported-device acceptance. Approve enforcement separately after coverage is verified. | Client token monitoring is not enforcement and does not qualify an unverified host or platform. |
| Backup/PITR/restore | Approve retention, region, cost budget and recovery objectives; choose managed backup/PITR scope; provide an isolated restore target and recovery operator. | Current snapshot found PITR disabled and no managed backup schedule/backup in nam5; external exports were not inventoried. No paid setting or restore operation is implied. |
| Historical data migration | Explicit per-migration approval after a protected dry run, exact affected-record list, backup/restore drill, ownership review, compare-and-set plan and rollback reader. | Preserve legacy records; no blanket conversion/deletion or UID reassignment. |
| Phase 12 cohort release | Approve the exact feature, cohort, live acceptance accounts, low-value actions, monitoring owner, rollback/freeze behavior and release window. | Each capability is released independently after its own prerequisites and acceptance. No broad launch approval. |

## Ready today without those approvals

- Continue local code, emulator/static validation, documentation and non-production candidate preparation that does not invent policy or enable a feature.
- Review and finish the local accessibility and presentation work; complete a supported-device check only when a device/emulator is available.
- Prepare scoped release packages and dry-run artifacts for review; do not publish or activate them.

## Deadline note

The owner requested completion within 2026-10-14. Local work can continue today, but the full Phase 0–12 definition of done cannot be claimed until the required decision-makers, funding evidence, provider sandbox, Firebase release authority, recovery environment, staffed operations and device acceptance are available. Record decisions here or in the phase-specific decision documents; do not treat silence or the deadline as approval.
