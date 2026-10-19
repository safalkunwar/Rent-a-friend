# SATHI owner decisions — 2026-10-19

This register records the owner's current product and release-governance decisions for Phases 0–12. It supersedes earlier assumptions only where explicitly stated here. General authorization permits scoped implementation and testing; it does not create finance, counsel, merchant, operations, or infrastructure evidence.

## P0 — Release governance and infrastructure

- Release only an exact named candidate with defined scope, relevant test evidence, monitoring and rollback instructions. No blanket Phase 0 completion or release.
- Preserve production data and existing security rules. Do not deploy unrelated Firebase Rules or legacy Cloud Functions. Local tests qualify only the candidate they test.
- **Pending — infrastructure owner:** App Check providers, site keys, exact web/admin/native identities and hostnames, monitoring, enforcement and acceptance.
- **Pending — infrastructure and finance:** backup/PITR region, retention, recovery goals, costs, isolated restore target and tested recovery procedure.
- **Pending — infrastructure/release owner:** current Blaze status and exact Functions names, source hash, configuration, runtime and rollback authorization.

## P1 — Identity, age and evidence

- Keep the product's **18+ floor for adult-gated services/actions**. This is a product decision, not legal approval. Do not treat submitted ID or complete profile fields as identity/DOB verification; do not enable restricted services on profile completion alone.
- **Pending — product/identity:** eligibility fields, evidence allowlist, person-match rules and service/action map.
- **Pending — privacy/legal:** evidence readers, retention, deletion, appeal and legal holds.
- **Pending — identity operations:** reviewer assignments, case workflow, escalation and break-glass controls.
- **Pending — Nepal counsel:** applicable identity, age and evidence-handling review.

## P2 — Social, Free Friend and Host

- Historical conversations alone do not authorize new messages. Preserve bilateral block enforcement and existing access controls.
- **Pending — product:** intent definitions, consent/request/accept/reject/block behavior, entitlement fields, and whether/how five distinct full-profile grants per Nepal day operate.
- **Pending — privacy/legal:** applicable consent, reporting and retention review.

## P3 — Ledger

- Balances and financial operations must be server-authoritative, idempotent and auditable. Clients cannot author balances or successful financial operations. Keep production movement disabled pending accounting and authority gates.
- **Pending — finance:** chart of accounts, funding and operation/reversal authority, reconciliation, discrepancy handling and escalation.
- **Pending — product/finance:** approved operation types and reversal conditions.

## P4 — Agencies and Guides

- Verification must be administered, not self-approved; prevent duplicate Guide registrations across agencies; keep identity and credential documents private.
- **Pending — product/operations:** credential types, expiry, affiliation changes/transfers and duplicate resolution.
- **Pending — Nepal counsel/privacy:** document access, retention, deletion and applicable legal requirements.

## P5 — Bookings and payments

- Do not activate live payment collection or settlement before provider and finance policies are approved. Use server-authoritative, idempotent state and report success only after backend acknowledgement. Preserve booking/cancellation safeguards.
- **Pending — merchant/provider:** provider, supported methods, sandbox and settlement evidence.
- **Pending — finance/product:** fees, commissions, cancellations/refunds, disputes, payment expiry and reconciliation.
- **Pending — Nepal counsel:** applicable payment and consumer-protection review.

## P6 — Partners and offers

- Partner rates remain centrally Admin-controlled. Do not issue funded discounts/cashback/rewards without an approved source and policy; offers require a verified authorized partner.
- **Pending — partner owner:** identity, authority and signed terms.
- **Pending — finance/partner:** funding source, budget/cap, limits, expiry, suspension and settlement.

## P7 — QR redemption

- Preserve the direction of verified-partner transactions and commission attribution. Redemption must be backend-validated, idempotent and auditable; do not fabricate successful redemptions or activate unfunded cashback.
- **Pending — product:** exact purpose and transaction types.
- **Pending — operations/merchant:** staff authority, supported-device acceptance, corrections, retries/timeouts and disputes.
- **Pending — finance:** commission/reward funding and reconciliation not already approved.

## P8 — Coins

- Grant **100 welcome Coins once per verified person across all Firebase Auth UIDs**, including incomplete profiles. This supersedes the earlier per-UID-only cap direction for abuse prevention. Which eligible UID receives a person's grant and how account recovery/linking works remain unresolved. Account creation time remains subject to the finite funded campaign window; disabled Auth accounts remain ineligible.
- **Subsequent abuse decision:** verified-person eligibility applies to **every welcome-Coin claimant, including customers**, with one grant per verified person across all UIDs. The owner accepts only Nepali citizenship certificate, National ID, or passport; remote matching requires a fresh selfie. Enhanced identity/liveness checks may be used only when justified and after privacy, legal, and technical review. Proposed retention: delete raw evidence within 30 calendar days after the appeal window closes, or within 30 days after a final appeal decision; documented legal holds and applicable retention obligations follow an approved policy. The 30-day appeal window starts when the claimant is notified of the decision; deletion should use a restricted, audited cleanup process. Provide an independent reviewer, senior escalation, and reconsideration of rejected cases. Companions also require government ID and Guides require a trekking certificate. The owner confirmed `kyc_reviewer` for initial/independent review and `super_admin` for escalation, and approved NFKC normalization, trimming, uppercasing, and removal of whitespace/hyphens for person-key matching. The owner then authorized a local build of the keyed-fingerprint/first-approved-UID workflow. Implementation is present behind default-off identity and Coins flags and requires App Check; no deployment or activation was authorized. The fingerprint remains linkable sensitive/pseudonymous data. Key rotation, marker retention/deletion, legal-hold operations, reviewer assignment, disclosure, recovery procedure, privacy/Nepal-counsel review, finance policy and production release remain unresolved.
- Completing a profile is not itself proof of identity and is not required to receive the welcome grant. If the user later attempts to add Coins or exchange/redeem, request required missing information at that point; do not activate purchase, exchange, cash redemption or collect sensitive identity data before its policy is approved.
- Preserve **10 Coins = NPR 1** as internal reference only, without cash-conversion promise. Coins may be used only in existing in-app functions with approved access and prices. Do not invent prices or unlock entitlements.
- Cash redemption remains disabled. No purchase, transfer, referral rewards or new spend entitlement is approved.
- **Pending — product:** exact approved spend/unlock scope, prices, and further qualification beyond the welcome-grant rule.
- **Pending — finance:** NPR budget/cap, funding evidence/account reference, dates, budget monitoring, vesting and reversal rules.
- **Pending — finance and Nepal counsel:** review references and evidence for reward policy.
- **Pending — release/infrastructure:** production activation, any account backfill, exact scope, dry run, backup/rollback, Blaze confirmation and separate release/deployment approval.

## P9 — Events

- Preserve existing access controls and backend capacity safeguards. No admission charges or rewards without approved policy.
- **Pending — product:** publishing, join/remove, capacity, roster privacy, moderation, tombstones and admission pricing if applicable.
- **Pending — operations:** moderation owner and escalation.

## P10 — Navigation, preferences and recommendations

- Preserve navigation and flows until a specific replacement is approved. Do not add mandatory preferences or unrelated navigation changes.
- **Pending — product:** navigation map, optional preference fields, recommendation boundaries and acceptance criteria.
- **Pending — privacy:** review proposed personal-data use for personalization.

## P11 — Safety

- Do not claim SOS, trusted-contact notifications or emergency dispatch are monitored unless the operational service exists. A request is not a promise of real-world response.
- **Pending — operations:** named staffed responder, coverage, escalation, false-alarm handling and responsibilities.
- **Pending — product/privacy/legal:** consent, trusted-contact access, retention, holds and provider consent.
- **Pending — operations/infrastructure:** verified delivery and failure recovery.

## P12 — Cohort release

- Release features independently. A build or local test does not prove production readiness. Keep unapproved features gated and provide rollback/freeze.
- **Pending — release/product:** exact feature and candidate, cohort, live acceptance accounts, low-value actions, monitor, window and rollback/freeze criteria.
- **Pending — infrastructure:** required production dependencies and controls.

## Completion rule

For every pending item, record the accountable owner, required evidence, approval reference and status. Do not mark a phase complete, enable production feature flags, deploy gated changes, or perform migrations until its evidence and exact release approval are recorded.
