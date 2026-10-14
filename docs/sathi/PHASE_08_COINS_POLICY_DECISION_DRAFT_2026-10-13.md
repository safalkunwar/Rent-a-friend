# Phase 8 Coins policy decision draft — 2026-10-13

**Status: proposed for owner, finance, and counsel review. Not approved, funded, configured, or active.** This document resolves the open product-design questions with a bounded recommendation. It does not supply real funding evidence or authorize a financial release.

## Recommended controlled pilot

| Policy item | Recommended value | Exposure / behavior |
| --- | --- | --- |
| Coin reference denomination | 10 Coins = NPR 1, for internal budgeting only | No promise of redemption or cash value to users |
| Welcome award | 100 Coins once per eligible new account | NPR 10 reference allocation per grant |
| Pilot award cap | 1,000 accounts | 100,000 Coins maximum issuance |
| Maximum welcome-award reference budget | NPR 10,000 (1,000,000 paisa) | Hard funded allocation; no award beyond the cap |
| Qualification | Account created during the approved campaign window and verified by email or phone; one grant per Auth UID; no referral attribution | Signup succeeds if the reward campaign is paused, exhausted, or unavailable |
| Posting | Immediate after qualification, only when the funded campaign is active | No vesting is proposed; finance must explicitly accept immediate posting or select a hold rule before activation |
| Coin use | 50 Coins for one new, eligible full-profile unlock after the first five distinct free profile grants in a Nepal calendar day | NPR 5 internal reference allocation per unlock; reopening a previously granted profile remains free |
| Spend safety | One unlock entitlement per viewer/provider pair; no debit on denial or failure; quota and debit commit atomically; oldest eligible lot first | At welcome balance, at most two paid unlocks; server-authoritative idempotency required |
| Transfer, purchase, redemption, referrals | Disabled | No P2P, cash redemption, Coin purchase, direct-referrer award, or multilevel award in this pilot |

The 1,000-account pilot is a finite first cohort, not a promise to issue Coins to every future signup. To extend it, approve and fund a new finite allocation before the cap is reached. Do not silently reduce awards, create an unfunded negative balance, or let signup depend on reward availability.

The 50-Coin unlock price is a product proposal, not a live tariff. A disabled local callable candidate exercises this flow, but it does not set a price or activate a user charge. The path should only apply to the same full-profile entitlement governed by Phase 2. The current five-free-profile rule remains five distinct profile grants per Kathmandu day; repeat viewing is free. A Coin unlock must not bypass provider eligibility, privacy settings, blocks, age/standing checks, or an unavailable/deleted profile. Phase 1 identity authority and Phase 2 entitlement rules are not production-qualified, so the candidate cannot be enabled from this draft.

## Why this is the recommended starting point

The welcome amount is small and understandable: a new account receives enough for two 50-Coin profile unlocks after using the five free daily grants. A finite 1,000-account cohort bounds the platform's maximum reference allocation to NPR 10,000. A unique-profile entitlement and atomic server debit prevent repeated viewing from consuming Coins. No referral or cash path is included, which keeps the pilot focused on the intended profile-access use and avoids recruiting incentives or payout operations.

The NPR conversion is an accounting scenario for sizing the proposed internal campaign. It does not determine legal classification or establish that Coins are stored value, e-money, a deposit, or redeemable money. Nepal Rastra Bank's Payment Systems Department licenses and oversees PSOs/PSPs and publishes its current licensed-institution and directive material. Nepal counsel must review this product's actual issuance, holding, and spend behavior against current requirements before activation. See the [NRB Payment Systems Department](https://www.nrb.org.np/departments/psd) and [licensed PSO/PSP list](https://www.nrb.org.np/psd/licensed-list-of-payment-system-operator-pso-and-payment-service-provider-psp-5/).

## Exact activation inputs still required

Owner/finance must provide a real campaign ID and version, approved start/end timestamps in Asia/Kathmandu, funding account reference, evidence that the full NPR 10,000 allocation is available and reserved for this use, finance approval reference, named budget monitor, and an explicit choice for immediate posting versus a vesting/hold period. If the approved budget is lower, reduce the grant cap using `floor(approved NPR budget / 10)`, and keep each grant at 100 Coins unless the owner explicitly revises the amount and recomputes exposure.

Owner/product must accept or replace the 100-Coin grant and 50-Coin unlock price, approve the eligibility and abuse-exclusion policy, and identify the exact profile fields included in a full-profile unlock. Counsel must approve the legal classification, user-facing terms, consumer disclosures, expiry/no-expiry treatment, complaints/refunds, and age/privacy interactions. The current roadmap says Coins do not expire; the proposed pilot preserves that behavior, subject to counsel's review.

Engineering must qualify Phase 1 canonical identity and provider eligibility, Phase 2 server-authoritative free-grant and unlock entitlements, and Phase 3 durable operation replay, reversal, and reconciliation before enabling spend. A local disabled callable candidate exists for review; it is not a production-qualified writer. Reversals may only follow a documented source-error/fraud process, with an exact inverse journal and one-time atomic reversal; ordinary profile unavailability after a valid unlock should not claw back the user's existing balance. Decide the user-facing remedy for an invalid/withdrawn profile before price activation.

## Release gate

The welcome-grant and profile-unlock candidates have off-by-default environment gates and require current approved policy and funding records. This draft does not write campaign pointers or funding records. The 50-Coin spend must not be represented as available. No production Functions deployment is authorized; the project instruction requires explicit confirmation that the Firebase Blaze plan upgrade is complete before any Functions deployment. Any future release needs its own reviewed scope, security and abuse checks, funded cap race test, spend/quota concurrency acceptance, duplicate replay and reversal acceptance, owner/finance/counsel sign-offs, and explicit deployment authorization.

## Decision record

- Owner accepts/replaces welcome award and unlock price:
- Finance accepts/replaces NPR 10,000 cap and provides funding evidence reference:
- Approved campaign dates and policy version:
- Posting/vesting choice and reversal process:
- Nepal counsel review reference/date:
- Phase 1/2/3 release prerequisites accepted by engineering owner:
- Blaze upgrade confirmed and deployment separately authorized (only when a release is ready):
