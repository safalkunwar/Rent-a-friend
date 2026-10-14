# Phase 8 funded-reward policy input

Use this template for the funded, earn-only Coin campaign. Values must reflect approved policy; blanks are not defaults. Providing a completed template does not itself prove funding or authorize activation.

## Recommended finite pilot values for owner review

- Reward kind: `NEW_USER_WELCOME`
- Proposed grant: **100 Coins once per eligible new account** (NPR 10 reference allocation at 10 Coins = NPR 1).
- Proposed pilot cap: **1,000 grants / 100,000 Coins / NPR 10,000 maximum reference budget**.
- Proposed use: **50 Coins per new eligible full-profile grant** after the five free daily profile grants; reopening a previously granted profile stays free.
- Proposed recipient: `ACTIVITY_OWNER`; no referral ancestry reward.
- Maximum per beneficiary: one grant.
- Funding implication: reserve the full NPR 10,000 allocation before opening the 1,000-account cohort. At the proposed unlock price, each welcome grant supports at most two paid unlocks.

These are design recommendations, **not approved policy, verified funding, or active grants**. This finite first cohort does not promise a grant to every future signup. Before opening the cohort, approve dates and reserve the full budget; then approve and fund each later cohort separately. Never overdraw the cap or silently drop the grant amount. If funding is unavailable, signup remains successful and the reward stays unissued.

See [the Coins policy decision draft](PHASE_08_COINS_POLICY_DECISION_DRAFT_2026-10-13.md) for the proposed unlock safeguards, approval matrix, and release gate.

## Campaign approval

- Campaign ID:
- Policy version:
- Total approved budget (NPR):
- Funding evidence reference (no credentials or bank secrets):
- Finance approval reference and date:
- Effective start and end (Asia/Kathmandu):
- Require verified email or phone: yes (candidate code gate; confirm or replace through approved eligibility policy):
- Approved chart-of-accounts/funding source reference:
- Approved treatment for refunds, cancellations, chargebacks, and reversals:
- Vesting/hold rule, or explicit approval for immediate posting:
- Owner/product approval for the proposed 50-Coin profile-unlock price and exact unlock scope:
- Nepal counsel review reference/date for the Coin issuance/holding/spend design:

## Reward schedule

Add one row for each distinct source, reward kind, and recipient combination.

| Source kind | Exact trusted qualification condition | Reward kind | Recipient (`ACTIVITY_OWNER` or `DIRECT_REFERRER`) | Coins per grant | Campaign max grant count | Per-beneficiary max grants | Cooldown or period cap |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| NEW_USER_WELCOME | New Auth account created in approved campaign window; verified email or phone; one per UID | NEW_USER_WELCOME | ACTIVITY_OWNER | 100 | 1000 | 1 | Campaign lifetime |

For direct-referrer rewards, also provide the approved attribution window, immutable account-ordering source, and qualification criteria. The implementation supports no ancestor levels beyond the direct referrer.

## Eligibility and operations

- Eligible account state and required identity/age checks:
- Self-dealing, household, duplicate-account, and abuse exclusions:
- Required source reversal behavior after a reward posts:
- User-facing status and statement fields:
- Operator responsible for monitoring remaining budget and discrepancies:
- Release cohort and acceptance owner:

## Fixed boundaries

- Coin denomination: 10 Coins = NPR 1.
- Client-authored balances and direct client reward writes: prohibited.
- Cash redemption: disabled and outside this campaign.
- P2P transfer: disabled.
- Multilevel referral reward: disabled; direct-referrer allocation only if explicitly included above.
- Any omitted source, amount, cap, timing, or eligibility rule: not configured and not eligible for grant.
- Server activation requires both an approved current campaign pointer and `SATHI_WELCOME_COINS_ENABLED=true`; client flags cannot activate grants.

After the approved values are supplied, validate the campaign's worst-case NPR liability, review source qualification and reversal behavior, then implement the isolated server-side transaction and acceptance checks. Do not export or deploy a reward producer until the separate Phase 3/8 release and Firebase deployment gates are satisfied.
