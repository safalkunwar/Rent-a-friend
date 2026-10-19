# Phase 8 funded-reward policy input

Use this template for the funded, earn-only Coin campaign. Values must reflect approved policy; blanks are not defaults. Providing a completed template does not itself prove funding or authorize activation.

## Recorded guardrails and campaign status

- Approved project denomination: **10 Coins = NPR 1** for internal reference conversion only.
- Keep cash redemption disabled behind the existing feature gate. Coins are non-transferable; no P2P path is approved.
- The owner approved a one-time **100 Coins** grant per verified person across all canonical Firebase Auth UIDs, including incomplete profiles, and requires ID review for every claimant. Accept only Nepali citizenship certificate, National ID, or passport; require a fresh selfie for remote matching. Enhanced/liveness checks require justification plus privacy/legal/technical review. A 30-day appeal begins at claimant notification; an independent reviewer and senior escalation are required; delete raw evidence through restricted audited cleanup within 30 days after appeal closure/final appeal, subject to documented legal holds/retention duties. Reviewer mapping is now `kyc_reviewer` for initial/independent review and `super_admin` escalation. Owner-approved normalization is NFKC, trim, uppercase, and remove whitespace/hyphens. The local claimant upload/review/appeal/HMAC/person-claim code is built behind default-off gates. Key rotation, marker retention/deletion, false-match handling, reviewer assignment, recovery, deletion authority/process, user disclosure and counsel/privacy policy remain unresolved; disabled accounts do not qualify. Companions also require government ID; Guides require a trekking certificate.
- **Campaign status: BLOCKED — APPROVAL REQUIRED.** Amount, per-person cap and identity flow implementation are present locally, but privacy/counsel review, evidence cleanup/hold operations, recovery, campaign/version, grant-count cap, NPR budget, funding/account references, dates, vesting/reversal, finance/counsel evidence and production release remain unresolved. The proposed 1,000-grant/NPR 10,000 cap and 50-Coin unlock in the [policy decision draft](PHASE_08_COINS_POLICY_DECISION_DRAFT_2026-10-13.md) remain recommendations only.
- A grant “for every new user” needs a defined continuing funding policy or a finite approved cohort. Do not promise an unfunded or uncapped award.

## Campaign approval

- Campaign ID: **BLOCKED — APPROVAL REQUIRED**
- Policy version: **BLOCKED — APPROVAL REQUIRED**
- Source: `NEW_USER_SIGNUP`; claimant-wide ID review and cross-UID person-dedup implementation is present locally behind default-off gates. Privacy/counsel review, deletion/hold lifecycle, recovery, key rotation and release remain **BLOCKED — APPROVAL REQUIRED**.
- Reward kind/recipient: `NEW_USER_WELCOME` / `ACTIVITY_OWNER` (100 Coins product amount and one-time-per-person cap approved; campaign activation is not)
- Coins per grant: **100 (owner-approved product value; funding is still blocked)**
- Maximum grants: **BLOCKED — APPROVAL REQUIRED**; per-verified-person maximum: **1 (owner-approved)**
- Total approved budget (NPR): **BLOCKED — APPROVAL REQUIRED**
- Funding evidence reference (private reference only; no credentials or bank secrets): **BLOCKED — APPROVAL REQUIRED**
- Funding account / chart-of-accounts reference: **BLOCKED — APPROVAL REQUIRED**
- Finance approval reference, date, and named budget monitor: **BLOCKED — APPROVAL REQUIRED**
- Effective start and end (Asia/Kathmandu): **BLOCKED — APPROVAL REQUIRED**
- Qualification: one verified person across all Firebase Auth UIDs, within approved campaign signup dates, account not disabled, plus an approved review of an accepted ID and fresh selfie for remote matching. The first UID to complete approval receives the person claim. Local code enforces this with a private versioned HMAC marker. Reviewer assignment, evidence cleanup/hold lifecycle, recovery, key rotation, privacy/counsel review and production approval remain blocked. Profile completion is not identity proof.
- Abuse exclusions and source reversal conditions: **BLOCKED — APPROVAL REQUIRED**
- Vesting/hold rule or explicit approval for immediate posting: **BLOCKED — APPROVAL REQUIRED**
- Profile unlock price and exact profile fields: **BLOCKED — APPROVAL REQUIRED**
- Nepal counsel review reference/date for issuance, holding, spend, terms, and classification: **BLOCKED — APPROVAL REQUIRED**
- Phase 1/2/3 qualification and separate release/deployment authorization: **BLOCKED — APPROVAL REQUIRED**

## Reward schedule

Add one row for each distinct source, reward kind, and recipient combination.

| Source kind | Exact trusted qualification condition | Reward kind | Recipient (`ACTIVITY_OWNER` or `DIRECT_REFERRER`) | Coins per grant | Campaign max grant count | Per-beneficiary max grants | Cooldown or period cap |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| NEW_USER_SIGNUP (first canonical Auth UID approved for the verified person; within funded campaign window; account not disabled) | Accepted ID and fresh selfie reviewed by Admin; current RBAC roles and HMAC person-key design are implemented locally. UID recovery/transfer, evidence lifecycle, privacy/counsel review and production acceptance **BLOCKED — APPROVAL REQUIRED**; incomplete profile allowed | NEW_USER_WELCOME | ACTIVITY_OWNER (new user) | **100 (owner-approved)** | **BLOCKED — APPROVAL REQUIRED** | **1 per verified person (owner-approved)** | **One-time per person across UIDs** |

No referral award is authorized or configured in this campaign. The architecture supports a maximum depth of five referral levels, but that limit does not enable direct or multilevel rewards. Any future referral reward needs its own approved source, attribution window, qualification, funding and reversal policy.

## Eligibility and operations

- Welcome grant eligibility: canonical Auth UID, approved campaign creation-time window, account not disabled, and government ID approved by Admin. Incomplete profiles remain eligible if ID review is complete. Campaign window, ID review workflow, data handling and funding remain blocked. Any later service eligibility remains governed by Phase 1 and counsel review.
- Self-dealing, household, duplicate-account, and abuse exclusions: **BLOCKED — APPROVAL REQUIRED**
- Required source reversal behavior after a reward posts: **BLOCKED — APPROVAL REQUIRED**
- User-facing status and statement fields: **BLOCKED — APPROVAL REQUIRED**
- Operator responsible for monitoring remaining budget and discrepancies: **BLOCKED — APPROVAL REQUIRED**
- Release cohort and acceptance owner: **BLOCKED — APPROVAL REQUIRED**

## Fixed boundaries

- Coin denomination: **10 Coins = NPR 1** (approved project guardrail; not a cash-redemption promise).
- Client-authored balances and direct client reward writes: prohibited.
- Cash redemption: **disabled behind the existing feature gate** and outside this campaign.
- P2P transfer: disabled.
- Referral depth: maximum five levels as an architecture limit; this does not enable referral rewards. Direct/multilevel reward allocation: **BLOCKED — APPROVAL REQUIRED**; keep reward flags off.
- Any omitted source, amount, cap, timing, or eligibility rule: not configured and not eligible for grant.
- Server activation requires both an approved current campaign pointer and `SATHI_WELCOME_COINS_ENABLED=true`; client flags cannot activate grants.

The current local server candidate enforces the 100-Coin product value, reviewed identity, one-award-per-person HMAC reservation and UID-level idempotency, but remains inactive. No campaign pointer/funding document is approved or present, and the server environment gates are off. Before activation, privacy/counsel and operations must approve identity handling, evidence cleanup/holds, recovery and key lifecycle; finance must approve a finite cap/budget and reserved funding; product/finance/counsel must approve vesting/reversal and user terms; then validate worst-case liability and scoped acceptance. Do not deploy until separate Phase 3/8 release and Firebase deployment gates are satisfied.
