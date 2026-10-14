# Phase 8 funded-reward policy input

Use this template for the funded, earn-only Coin campaign. Values must reflect approved policy; blanks are not defaults. Providing a completed template does not itself prove funding or authorize activation.

## Recorded guardrails and campaign status

- Approved project denomination: **10 Coins = NPR 1** for internal reference conversion only.
- Keep cash redemption disabled behind the existing feature gate. Coins are non-transferable; no P2P path is approved.
- The owner selected a funded earn-only direction and requested a new-user award, but did not approve its amount or qualification.
- **Campaign status: BLOCKED — APPROVAL REQUIRED.** The 100-Coin grant, 1,000-grant/NPR 10,000 reference cap, and 50-Coin unlock in the [policy decision draft](PHASE_08_COINS_POLICY_DECISION_DRAFT_2026-10-13.md) remain recommendations only. Do not copy them into this approval template.
- A grant “for every new user” needs a defined continuing funding policy or a finite approved cohort. Do not promise an unfunded or uncapped award.

## Campaign approval

- Campaign ID: **BLOCKED — APPROVAL REQUIRED**
- Policy version: **BLOCKED — APPROVAL REQUIRED**
- Source/qualification: **BLOCKED — APPROVAL REQUIRED**
- Reward kind/recipient: `NEW_USER_WELCOME` / `ACTIVITY_OWNER` (owner-directed intent only; no amount or activation approved)
- Coins per grant: **BLOCKED — APPROVAL REQUIRED**
- Maximum grants and per-beneficiary cap: **BLOCKED — APPROVAL REQUIRED**
- Total approved budget (NPR): **BLOCKED — APPROVAL REQUIRED**
- Funding evidence reference (private reference only; no credentials or bank secrets): **BLOCKED — APPROVAL REQUIRED**
- Funding account / chart-of-accounts reference: **BLOCKED — APPROVAL REQUIRED**
- Finance approval reference, date, and named budget monitor: **BLOCKED — APPROVAL REQUIRED**
- Effective start and end (Asia/Kathmandu): **BLOCKED — APPROVAL REQUIRED**
- Verified email/phone and age/identity eligibility conditions: **BLOCKED — APPROVAL REQUIRED**
- Abuse exclusions and source reversal conditions: **BLOCKED — APPROVAL REQUIRED**
- Vesting/hold rule or explicit approval for immediate posting: **BLOCKED — APPROVAL REQUIRED**
- Profile unlock price and exact profile fields: **BLOCKED — APPROVAL REQUIRED**
- Nepal counsel review reference/date for issuance, holding, spend, terms, and classification: **BLOCKED — APPROVAL REQUIRED**
- Phase 1/2/3 qualification and separate release/deployment authorization: **BLOCKED — APPROVAL REQUIRED**

## Reward schedule

Add one row for each distinct source, reward kind, and recipient combination.

| Source kind | Exact trusted qualification condition | Reward kind | Recipient (`ACTIVITY_OWNER` or `DIRECT_REFERRER`) | Coins per grant | Campaign max grant count | Per-beneficiary max grants | Cooldown or period cap |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| NEW_USER_SIGNUP (owner-directed welcome reward) | **BLOCKED — APPROVAL REQUIRED** | NEW_USER_WELCOME (direction only; amount/policy not approved) | ACTIVITY_OWNER (new user) | **BLOCKED** | **BLOCKED** | **BLOCKED** | **BLOCKED** |

No referral award is authorized or configured in this campaign. The architecture supports a maximum depth of five referral levels, but that limit does not enable direct or multilevel rewards. Any future referral reward needs its own approved source, attribution window, qualification, funding and reversal policy.

## Eligibility and operations

- Eligible account state and required identity/age checks: **BLOCKED — APPROVAL REQUIRED**
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

After the approved values are supplied, validate the campaign's worst-case NPR liability, review source qualification and reversal behavior, then implement the isolated server-side transaction and acceptance checks. Do not export or deploy a reward producer until the separate Phase 3/8 release and Firebase deployment gates are satisfied.
