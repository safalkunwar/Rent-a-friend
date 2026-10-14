# SATHI Home: current stage and stronger product proposal

Date: 2026-09-25. Original review status: assessment and proposed design. **Continuation: the bounded Home presentation and existing-data matching slice below are now implemented locally; no deployment or financial activation followed.**

This review compares the supplied dashboard/companions/Coins concept with the current local working tree, the documentation-status index and the relevant target contracts. Existing uncommitted work is preserved. No production inventory, authenticated production write, deployment or financial activation was performed. The current local UI is not assumed to be the deployed UI.

## Recommendation

Build a finite, people-first Home that helps someone choose a person and a plan. Keep social content available in a compact supporting section. Show Coins only when an authoritative wallet can supply a balance. Deliver the presentation improvement independently of the unfinished financial and service-mode foundations.

The concept is directionally right, but its opening assumption that SATHI is functionally mature is too strong. The repository has usable discovery components and existing social features; secure service eligibility, full-profile entitlements, the wallet and approved partner benefits are not established by that UI. A simpler screen must not turn planned behavior into a product promise.

## 1. Actual stage

| Capability | What exists in the scoped source | Readiness for this concept |
| --- | --- | --- |
| Responsive discovery | Home shares `DiscoveryWelcome` and `DiscoveryFeed`; dedicated `/companions` uses `PeopleDirectory` | Reusable local foundation; previous reports do not claim publication of these changes |
| Simple Home | Four shortcuts and an interest editor exist, followed by a mixed progressive feed | Partial. Still lacks a finite people-first hierarchy |
| User preferences | `User.interests`, `User.location`, `User.favorites`; authenticated interest editor calls the existing profile repository | Useful explicit signals. Production save/reload acceptance remains unclaimed |
| Recommendations | Preferred category headings move earlier; categories are session-seeded and content types interleave | Basic preference ordering, not per-person weighted matching |
| Service modes | Free Friends / Local Hosts / Guides tabs disclose Coming soon | Presentation only. Never classify by zero hourly rate, interest label or legacy approval |
| Wallet / Coins | Existing wallet modal explicitly says unavailable; payments fail closed | No active ledger/config/earning/spending implementation found in scoped application/backend code |
| Free daily access | Distinct permanent full-profile grants are specified in doc 27 | Target contract. No implemented quota/entitlement command found |
| Events and activities | Existing bounded queries, previews and destinations; activity booking is unavailable | Reuse factual discovery. Do not claim bookable inventory or today's availability without evidence |
| Partners | Existing `partners` catalog and a small `Partner` type with `name`, `disc`, `loc` | Catalog exists; approved, dated, redeemable offer contracts are not established |
| Community / Stories | Existing posting/engagement/detail flows and Community destination `/explore#community` | Preserve; change only Home placement and preview size |
| Commercial readiness | Scoped security releases are documented; other authority, booking, provider and device gates remain open | Neither this assessment nor UI test passes certify launch readiness |

Roadmap mapping: this concept is principally a **narrow Home presentation slice of Phase 10**, with dependencies on Phases 1/2 for authoritative people/access, Phase 3 for ledger foundations, Phase 6 for approved offers, Phase 7 where redemption is involved and Phase 8 for Coin activation. It is not a shortcut to completing those phases. Phase 0 remains partially open according to current records.

### Evidence that changes the design

- `src/services/feedGenerator.ts` groups people using their **first** interest, boosts matching categories and allocates a nominal 30% cap to companions and 30% combined to posts/Stories. Those caps are not observed screen-area percentages, but the mixed-feed design clearly competes with people-first discovery.
- The generator's `savedCompanionIds`, `viewedCompanionIds` and `bookedCompanionIds` declarations are not evidence of working behavioral personalization. `useDiscoveryFeed` supplies location/interests; no corresponding per-person behavioral score is wired there.
- Location affects activity/Event scoring. `buildCategoryGroups` accepts location but does not use it to rank companions. A “near you” claim would exceed this implementation.
- Home draws its own companion-card markup inside `DiscoveryFeed`, separate from the recently improved shared `CompanionCard`. Home currently shows a positive rating without requiring a review count. `CompanionRepository.createCompanionProfile` also defaults missing ratings to 5.0. Rating is therefore unsuitable as a trusted ranking signal without provenance work.
- `availableDays` is a recurring weekday preference, not a fresh reservation/availability result. It cannot justify “Available today.”
- `ClientApp` mounts six discovery sources eagerly and loads five more source pages together when Home progresses. Hiding cards does not stop those requests.
- Existing local reports acknowledge sample content and stale event dates. Production inventory quality was not independently rechecked in this session.

## 2. Improve the concept through stronger priorities

**A person and a useful next step should be visible before social content.** On a returning user's Home, one compact upcoming-plan row may take priority when a genuine current booking exists. Otherwise move straight to people. Avoid permanent completion cards, host recruitment panels or empty right rails.

Use three direct shortcuts: **Find a Sathi / Activities / Events**. Keep Explore in the existing navigation. The original four-shortcut proposal duplicates Explore with its own subcategories; three concrete destinations reduce ambiguity while retaining one-click access. Benefits appear in their own compact section when there are actual offers.

Place Stories beside the Community preview **after discovery sections by default**. The supplied concept permits top placement, but it competes with the strongest requirement: personalized people should dominate. Keep the Story viewer, creation, expiry and likes unchanged. Top placement can be reviewed as a design alternative, without duplicating Stories in two places.

Treat “For you” as an evidence-dependent heading. With saved matching interests, use **People for you** and a precise reason. Without them, use **Discover people**; with a genuinely area-filtered query, use **People in Pokhara**. “Popular near you” requires both verified popularity evidence and a meaningful location match, so it is not the default fallback.

The best experience adapts to intent without becoming an itinerary engine: a selected activity can prioritize people who explicitly share that interest and related real experiences. Keep the chosen activity/area visible and editable. Do not create personalized plans by joining unrelated catalog rows or inventing availability.

## 3. Proposed Home hierarchy

| Order | Section | Proposed limit and behavior |
| --- | --- | --- |
| 1 | Header | Existing SATHI identity, one search, profile and existing alerts access. Coin chip only with a trusted wallet state |
| 2 | Greeting / area | One short greeting, optional selected area. No compulsory location prompt or large hero |
| 3 | Your next plan | Zero or one genuine upcoming booking summary; preserve actual booking/payment state |
| 4 | Quick actions | Find a Sathi, Activities, Events; compact labels and icons |
| 5 | People for you | Four people initially; up to six only where useful. One explicit relevance reason, one View profile action, optional Save |
| 6 | Things to do | Up to two real, relevant Event/activity previews combined; date/price only when supported |
| 7 | SATHI benefits | Up to two currently approved offers with terms. Until contracts exist, a factual Local places preview or omit the section |
| 8 | Community moments | Compact Stories strip and one or two post previews, then View Community |
| End | End of Home | No infinite sentinel, auto-fetch-until-full behavior or repeated category sections |

Mobile: one clear column with compact people cards or a deliberate two-card row only when text remains readable. The first real person should start in the initial 390×844 view under ordinary text settings; accessibility enlargement takes precedence over this visual target. No auto-advancing carousels or hidden primary actions.

Desktop: a capped content width and up to three people columns. Use spare space for breathing room. Add a utility rail only when it carries an existing useful task; do not create a second dashboard to fill space. Shared ranked IDs/order must remain identical across breakpoints.

Keep the current navy/gold/white and dark themes, logo, `SafeImage`, Lucide icons and semantic tokens. Use genuine profile media in production; neutral fallbacks when absent. Never use generated people to make a live marketplace look populated.

## 4. Card and personalization contract

Each person card shows photo/fallback, name, coarse area, up to two relevant interests, optional actual languages, factual relevance and the existing listed NPR rate when applicable. Keep one primary View profile button and one acknowledged Save control. Do not show ages, gender, ten badges, match percentages or review totals merely to fill space.

Example reason: “You both selected Coffee Buddy.” An interest such as Photography Guide is an interest label, not proof of a regulated Guide capability. A profile can have more than one service mode in the eventual design, but a user is still one human/UID.

### Minimal version using existing data

1. Normalize whitespace/case for comparison without rewriting stored labels. Compare **all** companion interests. A reviewed alias map can later reconcile synonyms; never infer professional eligibility from those aliases.
2. Filter known ineligible/private/withdrawn results before presentation using existing authoritative evidence. Missing service-mode evidence does not grant eligibility; ordinary legacy browsing remains explicitly legacy. This local ranking step cannot repair production authorization.
3. Use explicit `currentUser.interests` and a reliably matched existing profile area. Until area identifiers exist, use conservative exact normalized comparisons; substring text is not distance.
4. Proposed initial score: `0.75 * matchedSelectedInterests / selectedInterestsCount + 0.25 * sameArea`. These are proposed presentation weights, not existing production values. Normalize over signals the user actually supplied. A missing companion attribute contributes no match; do not renormalize separately per candidate and reward incomplete profiles.
5. Use stable provider identity/ID as a tie-breaker. Preserve displayed order while appending; explicit preference edits or refresh can rerank. Deduplicate by known `userId`, otherwise by document ID; unresolved identity collisions belong in the authority work.
6. Return four to six from the bounded candidate window. No matches means an honest fallback heading; show fewer genuine people rather than padding with unrelated or fictional records.

Use no separate activity-match weight initially: current activity categories and companion interests overlap, so scoring both can count the same preference twice. UI language `en` is not proof the user wants English-speaking companions. Age/gender preferences, browsing history, booking history, response time, review reputation and exact proximity are not initial signals.

This deliberately smaller scorer is a proposed revision to the generic weighted target in doc 27, justified by today's data. Record its version in the future view model. Add verified availability/language/reputation only when their source and consent are established; document the change instead of silently changing the product model.

### Candidate retrieval and limits

First presentation release: rank the existing 15-person source window with no additional reads. Describe it honestly as matching loaded discovery results. This improves ordering, but it cannot find the best person nationwide or even exhaustively in a city.

Qualified later retrieval: use the existing target public projection and doc 31's indexed area/service eligibility contract. Start with one or two bounded pools of at most 15 candidates; do not automatically spend doc 27's maximum budget of four pools ×20 candidates. Exact additional interest queries/indexes require a reviewed contract and READY index evidence. Return a sparse page when the budget is exhausted. Dedicated People browsing owns further pagination.

Firestore rules evaluate possible query results, not a client-side filtered list; supported eligibility constraints must be reflected in queries or authorized backend candidate commands. New ordering fields also exclude documents missing those fields. These behaviors require a compatibility gate rather than an optimistic query replacement. [Firebase query authorization](https://firebase.google.com/docs/firestore/security/rules-query), [ordering and limits](https://firebase.google.com/docs/firestore/query-data/order-limit-data).

## 5. Coins and free access: preserve the actual model

The design source is `24_WALLET_LEDGER_ARCHITECTURE.md`, `27_RECOMMENDATION_ARCHITECTURE.md` and `31_DATA_CONTRACTS.md`. These are target specifications, not proof of a deployed wallet.

| Topic | Correct contract |
| --- | --- |
| Configuration | Target `platform_config/current` points to versioned policy; reuse `freeDiscoveryPerDay`, `unlockCoinCost` and feature flags. Do not introduce a competing `coin_config` collection |
| First free accesses | Target policy is five **distinct full-profile grants** per user per Nepal calendar day, controlled by policy; teaser impressions cost nothing |
| Reopening | Existing durable grant does not spend quota or Coins again, including on later days, while safety/eligibility still applies |
| Communication | Full-profile access does not reveal a phone number or automatically authorize messaging. New gated Free Friend contact depends on accepted request/entitlement |
| After free quota | Show exact configured cost and obtain explicit confirmation before atomic spend + grant. Missing cost/config or spend disabled means no paid unlock |
| Storage | Planned `discovery_usage`, `profile_unlocks`, immutable `ledger_transactions` and atomic derived `wallet_accounts`; no client-authored balances or localStorage quota |
| Pricing | Existing booking prices remain NPR. Coin platform access fee is separate from NPR0 Free Friend service and paid booking rates |
| Exchange policy | Target 10 Coins = NPR1; this is an existing design decision, not a currently usable exchange facility |
| Tips/gifts | Existing target prohibits P2P Coin transfers. Monetary tips/gifts need a separately approved contract and remain disabled; nonfinancial thanks are acceptable |
| Cash/referrals | Cash redemption and deeper referral rewards remain off; a Home redesign must not activate them |

At Home, distinguish wallet states: unavailable → omit balance chip and keep Wallet status accessible; loading → nonnumeric placeholder; ready → actual available Coins; temporarily stale/offline → clear status with spending unavailable pending validation. **Zero is only displayed for a confirmed zero balance.** Reserved amounts and the ledger statement belong inside the wallet.

Free-quota text should be contextual to the relevant profile-access action, not repeated on every person card. Server-side day calculation uses Asia/Kathmandu. Concurrent tabs, the final free grant, midnight, stale policy and a lost response must converge to one durable operation; no automatic charge on opening a card.

## 6. Data loading and performance

Source-derived current head-page limits are 15 companions +10 Stories +10 activities +10 Events +10 partners +10 posts = **up to 65 returned discovery documents** when all pages fill. Home continuation requests up to 55 more across five sources. These are requested page capacities, not measured billed-read totals or a promise of actual inventory. Profile/context, opened social controls, rule dependencies, remounts, focus revalidation and retries can add work.

Stage A, presentation only: stop Home's auto-pagination. Reuse the current loaded windows; initial reads stay approximately the same. Moving a section lower or slicing to four cards does not reduce initial queries.

Stage B, separately qualified loading changes: add enabled/page-size ownership to existing hooks while keeping their Hook call order stable. Start companions/profile first; request compact lower sections when needed, only once per relevant query/account generation. Proposed normal one-pool Home budget is 15 people +4 Events +4 activities +4 places/offers +6 Stories +2 posts =35 returned discovery documents for the entire page. Only show two Things to do cards and two benefits; candidate budgets can exceed display counts. A second 15-person pool makes50. These are targets to validate, not a claimed current saving. Expiry/status filtering may yield fewer results; never scan additional pages merely to fill a card slot.

Keep existing visibility/expiry query contracts. Change limits or query order only after compatibility tests; do not obtain fewer billed reads by fetching the old limit and slicing locally. Reuse shared cached source state where correct; cache keys include user/query/policy, and account switching or entitlement/visibility revocation invalidates sensitive data. Keep bounded visibility revalidation; avoid a blanket TTL that displays withdrawn content.

Measure requests, returned documents, actual billed reads/index entries where applicable, rule-dependent reads, bytes, duplicate fetches and time to first person. Even empty Firestore queries have a minimum read charge, and security-rule dependent reads can add cost. [Firebase billing](https://firebase.google.com/docs/firestore/pricing).

## 7. Delivery sequence and exact boundaries

| Increment | Deliverable | Dependencies / stop condition |
| --- | --- | --- |
| A: Home presentation | Finite sections, people-first order, reused compact cards, factual empty states, Community destination intact | Existing safe browsing only; no service-mode/coin/offer activation. Review responsive UI and actual profile-save persistence |
| B: Better recommendations and loading | Pure deterministic ranker, truthful reasons, capped sources, no Home auto-paging | Proven candidate visibility and bounded indexed retrieval where added. No recommendation endpoint unless necessary and separately authorized |
| C: Service access | Authoritative capabilities, full-profile grants, daily quota and accepted hangout communication | Roadmap Phases1/2; security and concurrency gates. Existing legacy behavior must not be relabeled as the new mode |
| D: Real wallet and benefits | Trusted balance chip, applicable paid unlock quote/confirmation, versioned approved offers | Relevant ledger/offer/redemption/Coin phases and explicit release authority; not bundled into A/B |

A and the existing-data subset of B can be reviewed without a new Firebase architecture. C/D require the **already planned** backend contracts. That is necessary missing implementation, not a reason to invent a second economy or replace Firebase.

Expected implementation seam: `ClientApp.tsx` composes one shared Home; extend `DiscoveryWelcome` and reuse `CompanionCard` with a compact Home variant; keep mixed discovery behavior for existing destinations that still need it. Add one pure proposed `homeRecommendations.ts`/`HomeSections` only if an equivalent module is absent. Extend `useFirestoreData` through backwards-compatible options for route-aware loading. Reuse `SafeImage`, social viewers and existing Event navigation. Keep `/explore#community`, `/companions`, `/events`, `/bookings`, `/messages` and profile/Wallet access.

The existing optimistic favorite writer needs acknowledged-write failure handling before presenting Save as reliably persisted. The local follow-up below now addresses that direct integration issue without introducing a second favorite system.

Deployment remains a separate decision. Preserve the current dirty worktree and root/ops/production rules distinctions. No blanket rules deployment, Functions deployment, data cleanup, real reward or wallet activation accompanies this proposal. A presentation rollback restores the prior Home composition without deleting user interests/history.

## 8. Best-case user journey and acceptance

Illustrative future journey, not a claim about real inventory: a returning user selects Pokhara and Coffee Buddy. Home shows a small relevant set of real people with explicit shared-interest reasons, a real local activity and, if available, a valid partner offer. They inspect a profile with the correct access policy, make an eligible request, receive acceptance and then communicate. On the next visit Home prioritizes their actual upcoming plan. Coins remain an unobtrusive utility around eligible actions.

The product outcome to pursue is **successful, consensual local connections and completed plans**. Time spent scrolling, post impressions and Coin spending are not the primary success metrics. Start with profile-open-to-valid-request progression, accepted/completed plans where those states are actually supported, time to first useful action, and short user comprehension interviews. Later measurement needs consent-aware instrumentation; none was added here.

Proposed release acceptance:

- In a small directional five-second test, at least 8 of10 participants can identify how to find a person and something to do; this is a proposed target, not a measured result or statistical proof.
- One search, three shortcuts, one people section, no infinite Home loading. Profile appears early at ordinary mobile text size; 200% zoom remains usable.
- Same ranked people/reasons/order at390/768/1440px. No profile duplicates, category mislabeling, resize-induced form loss or account-crossing preferences.
- New member, guest, zero matches, unknown location, partial source failure, slow images, denied interests save, offline wallet and withdrawn listing each have truthful states.
- Each relevance sentence can be traced to an explicit input. No seeded ratings, invented popularity, exact-distance claims or stale weekday availability.
- Short previews navigate to the existing working destinations. Story creation/view/likes, Community posting/comments/sharing, Messages, Bookings and alerts remain reachable.
- Initial and continued query budgets are instrumented; rendering fewer cards alone is not accepted as a read reduction.
- When financial/access phases are implemented, test fifth/sixth concurrent grant, repeat grant, Kathmandu midnight, explicit paid consent, duplicate retry, policy changes and missing configuration.
- Keyboard/focus, both themes, long English/Nepali labels and installed-PWA/device behavior are verified for the actual build before claiming those results.

## 9. Verification performed for this assessment

Fresh local command on2026-09-25:

```text
npx vitest run src/__tests__/discovery-refresh.test.tsx src/__tests__/discovery-search.test.tsx src/__tests__/people-directory.test.tsx src/__tests__/people-category-groups.test.tsx src/__tests__/companion-rows.test.ts --maxWorkers=2 --minWorkers=1
```

Result: **29 tests passed across five files**. This verifies existing scoped discovery/People behaviors, not a new Home implementation or production acceptance. No full-suite, new application build, emulator or authenticated live test was performed in this assessment. Previous historical counts are not substituted for fresh results.

The isolated concept preview passed eight local interaction/structure checks (initial people, search, sparse area, interest editor, interest updates, profile action, wallet disclosure and size). Browser inspection at the default width and a390×844 viewport showed the people section early, no root horizontal overflow (343px client and scroll width in the preview wrapper), and no captured browser errors. These are preview checks, not application/device acceptance.

Reviewed implementation: `src/ClientApp.tsx`, `src/types.ts`, discovery components/hooks/services, shared `CompanionCard`, `CompanionRepository`, profile/preference paths, payment unavailable interface and relevant query/config references. Reviewed decisions: current status/handoff, docs20/21/24/27/29/30/31/32 and recent discovery/People closeouts. Searches for coin/wallet/reward/config implementation were restricted to relevant application/backend/config paths; no whole-repository security audit was undertaken.

## 10. Decision ready to implement next

The strongest next scope is **finite Home + explicit-interest matching over existing bounded data**, with truthful unavailable wallet/benefit/service states. It gives the user-facing benefit immediately while preserving a clear route to the best-case product. The inline concept preview uses explicitly illustrative profiles and local-only interactions; it is neither a production screen nor evidence of live supply.

## Local implementation follow-up — 2026-09-25

The next Home scope was implemented after this review. Both responsive Home branches now render `HomePage` in place of the mixed `DiscoveryFeed`. The shared Home introduction uses three one-click actions. The people section displays up to four already-loaded profiles ranked by all explicit profile interests and exact normalized location, with only factual reasons. One current booking summary appears when an owned pending/confirmed/active booking has a future ISO date. Lower sections show at most one valid upcoming Event, one activity, two partner listings, five Story owners and two posts. Service-mode, booking, Story, post and wallet functionality on their existing destinations is preserved.

Home no longer has an infinite sentinel or parallel five-source load-more action. The existing data hooks now accept an optional page size: on Home, companions15, Stories10, activities4, Events4, partners4 and posts2. On other routes their previous defaults remain (15/10/10/10/10/10 respectively). Initial Home discovery capacity is therefore **39 returned documents**, down from the previous capacity of65, if every first page fills. This is a source-level query budget, not a measured billing or latency reduction. The current source order can yield no future Event in the four loaded records; Home shows fewer real previews rather than fetching beyond its budget. Route transitions requery with the destination's full page size.

The Local places section presents names and areas only. It does not use the legacy `disc` string as an approved benefit. Coins remain absent from Home because no wallet balance service is active. The Free Friend daily grant/coin unlock remains target-only. Compact Home cards reuse `CompanionCard` without legacy verification labels or rating evidence that cannot be established.

The current local build was visually inspected as a public guest at desktop and390px mobile widths. The People shortcut reached `/companions` and the existing directory showed its full 15-person first page, including Coming soon service-mode disclosures. Live application reads were public; no authentication or production mutation occurred. Focused and full test/build results are recorded in the continuation changelog entry.

## Save reliability follow-up — 2026-09-25

The local Save action now waits for the existing `UserRepository.updateFavorites` write before changing the visible saved state. A rejected write leaves the previous state intact and surfaces a retry message. The card disables repeat taps while the write is pending. The shared context serializes saves from different cards in one tab, and a late result from an earlier signed-in session cannot update the next account's local state. Home, People, Explore and Saved cards share this behavior.

This changes the application interaction only. It does not add a listener, query, Firestore rule, wallet operation or deployment. Cross-device concurrent array replacement remains an existing limitation; a later atomic-field or transaction design needs its own compatibility review. Local tests mock the write outcome and account transition; authenticated production persistence and device acceptance remain unverified.
