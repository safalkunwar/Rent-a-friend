# Phase 3 — Home implementation checkpoint

Date: 2026-09-06. User approved Phase 3 after the P0 gate, then requested resume. Local working tree only; no deployment, production writes, billing changes, migrations or Functions activation.

## Latest implementation update — canonical comments, 2026-09-06

Following the owner's clean-architecture priority, the local comment contract now uses server Timestamps, one latest-50 descending query with an explicit document-ID tiebreaker, and a shared 500-character limit. The unused alternate reader was removed. Local rules reject forged creation times. This is a breaking schema change: **do not execute the earlier index-only rollout proposal as a complete release plan**. No production reset, migration, index/rules deployment or app deployment occurred. See [COMMENT_QUERY_CONTRACT.md](COMMENT_QUERY_CONTRACT.md) for verification, remaining history pagination and coordinated rollout dependencies.

## Latest diagnostic update — 2026-09-06

The Story failure is now confirmed, superseding the earlier unknown-cause wording below: the actual bounded guest Story query and latest-comments query both return live `failed-precondition` / missing-index errors. The live CLI inventory reports 60 composites; the only Story/comment entry is the older ascending comments index. Both required definitions are already local but absent in the live inventory. No application code or production configuration changed in this diagnosis. See [HOME_LIVE_QUERY_DIAGNOSIS.md](HOME_LIVE_QUERY_DIAGNOSIS.md) for exact queries, evidence and the proposed **approval-gated, additive two-index correction**. Passing earlier local tests does not resolve these live failures.

## Resume addendum — browser qualification and discovery pagination (2026-09-06)

This addendum supersedes the earlier statement that no browser qualification was performed, but **only for the guest, local-development checks below**. Full Home completion remains pending.

- **Implemented:** Shared `DiscoveryPageControl` in desktop/mobile companion search and mobile activity/event search. It explicitly loads one existing cursor page per action, disables duplicate actions, exposes retry even after an initial failure, and labels matches as belonging to loaded records. There is no automatic full-collection search. Existing filters operate through `services/discoverySearch.ts`; missing/wrong-type text/arrays are ignored, invalid prices are excluded from price-filtered discovery rather than treated as free, and unknown ratings sort last. Category grouping handles missing interests and prototype-shaped category keys. These are search/grouping guards, **not a complete runtime schema adapter for every card/profile/feed**.
- **Implemented:** Home errors name failed sources on both responsive layouts; backend error details are not exposed in UI. Retry still invokes only failed source loaders.
- **Observed in browser:** Loopback Vite app at `127.0.0.1:4173`, reading configured public Firebase data. At a 390×844 emulated viewport, Home rendered, Show more expanded a caption, and Enter on the existing search field navigated to companion discovery. Searching Kathmandu initially showed 2 matches in 15 loaded companions. Clicking Load more disabled the button while pending and produced 4 matches in 30 records. Resizing to 1280×900 preserved the same four results; desktop Load more produced 6 matches in 40 records and removed the exhausted-page button. Search includes biography/interests as well as city, so matches need not have Kathmandu as their displayed location. No likes/comments/bookings/uploads/authentication or other live writes were performed.
- **Verified local gates:** Main 225/225 tests across 25 files (8 new search/control tests); root TypeScript zero diagnostics; production Vite build and PWA asset generation passed. Main JS 1,928.39 kB / 502.58 kB gzip; precache 5,983.88 KiB. Large-bundle warning remains. Admin 40/40 and emulator 47/47 are **previous-checkpoint evidence, not rerun in this resume**; no admin/rules/index changes here.

### Newly qualified blockers and next checks

| Priority / issue | Evidence and root cause | Fix / dependencies / regression risk / verification |
| --- | --- | --- |
| P1 — opened comments fail against configured live backend | Browser console reported Firebase `query requires an index` for `comments(postId ASC, createdAt DESC, __name__ DESC)` after opening a Home post. This is a runtime backend query failure, despite passing local tests. Local descending index already exists from the previous checkpoint. | Inspect live index status and obtain rollout authorization; deploy/enable the reviewed required index only in an approved rollout. Risk: blindly deploying the entire dirty rules/index tree. Verify a real post's comment read after the index is ready; do not claim writes verified by a read. |
| P1 — Stories unavailable in live-backed local Home | New source-specific alert showed `Could not load: Stories`; retry was exercised. `useVisibleStories.ts` catches query failures into a generic message. Specific server cause remains **unverified**, not proven to be an index problem. | Read-only diagnosis of the Story query error and current deployed configuration before any policy changes. Preserve active/public/unexpired restrictions; do not weaken rules or use cached/moderated media to hide the failure. Verify both empty-success and eligible-Story read, expiry and moderation removal with approved fixtures. |
| P1 — legacy event/sidebar claims still misleading | Desktop sidebar displayed August dates under Upcoming Group Events and `spots left`; mobile search event cards also use capacity as remaining availability. This addendum does not repair registration or claim those dates/availability are accurate. | Define authoritative time/capacity/registration contract before aligning all cards. Requires existing event integrity follow-up; risk is falsely advertising capacity or changing registration semantics. Verify past/full/cancelled events and concurrent joins with controlled data. |
| P2 — discovery remains loaded-page search | Explicit paging now resolves the inaccessible-later-pages integration bug. Counts are not whole-database match totals; server full-text search remains absent. Unknown-price records are excluded by the current price filter, without mutating stored records. | Product-approved indexed search/data validation design, measured read costs and malformed-record reporting. Verify filter combinations, retention/cost, full source exhaustion and server visibility changes. |

Not verified: physical devices, installed PWA/offline/reconnect, authenticated UI writes, production media upload round trips, all malformed profile render paths, or load/concurrency capacity. Generated service-worker assets are not an installed-PWA test. Browser screenshots also showed some remote images still loading; no universal media-success claim.

## Outcome and evidence level

The three formerly red Home acceptance cases are fixed and included in the normal main-app test gate. Additional local work repairs responsive loading, reaction confirmation, bounded comments, and exact-post failure handling. This is **not a declaration that all Home or commercial-platform work is complete**.

Unit/React tests verify controlled inputs and mocked dependencies. The emulator suite verifies actual Firebase SDK/rule behavior against local data, including cross-reader like/comment persistence. Neither proves the deployed site's behavior, indexes, physical-device layout, installed-PWA lifecycle or production scale.

## Actual Home path now

```text
Firebase Auth UID + profile context
  -> public bounded server page reads / visible Story query
  -> per-mounted collection windows + shared in-flight query deduplication
  -> useDiscoveryFeed: one UID/session seed, current source objects
  -> generateDiscoveryFeed: typed IDs, category composition, global run guard
  -> stabilizeFeed: retained source entities refresh in global display order
  -> useProgressiveReveal: shared count, separate desktop/mobile sentinels
  -> desktop grid / mobile compact cards / same PWA application bundle

Home cards and Story viewer
  -> useFeedReaction: shared UID + type + ID state and action guard
  -> existing SocialRepository transactions
  -> fresh reaction + parent count read before confirmed UI state

Opened post comments
  -> latest-50 comment listener + one parent summary listener
  -> existing authenticated comment repository transactions
```

Presentation differs; composition/reveal/reactions do not use device-specific ranking or mutation algorithms. Mobile's extra activities/events lists beneath the mixed Home feed were removed. This does not unify every legacy Community/Explore screen elsewhere in ClientApp.

## Changes and verification contracts

| Issue / evidence | Root cause and change | Regression risk / verification |
|---|---|---|
| Same-ID edit remained OLD | Hook depended on ID strings, and stabilizer retained old objects. Actual arrays now trigger regeneration; current source payload replaces retained data. `useDiscoveryFeed.ts`, `feedStabilizer.ts`. | Watch source replacement versus pagination. Hook test edits the same post ID without changing order. |
| Companion and post with same ID collided | Global bare-ID set. `feedGenerator.ts` now keys content by type + ID. | Overlapping-ID acceptance test; per-companion dedup remains within its collection. |
| Cross-category run reached eight companions | Mixing operated locally, then caps/header boundaries defeated it. Global guard inserts available real alternatives or defers excess companions. | No fabricated filler. Acceptance bound is at most three consecutive companion **items**, stricter than three desktop rows. |
| Page append moved old cards | Per-category merge moved previously displayed posts when category allocation changed. Global survivor prefix now precedes unseen additions. | New strict-prefix/category-movement tests plus existing randomized regressions. Source deletions/Story expiry remove content; if a deleted interleaver creates an overflow, extra companions may be deferred. |
| Ranking omission treated as deletion | Selected/capped output was incorrectly treated as authoritative membership. Stabilizer now receives the actual source window separately. | Source-presence and actual-removal tests. It cannot discover server deletions in a page that has not been revalidated. |
| Hidden responsive branch drove loading | Both sentinels used one mutable ref; zero-size hidden elements looked close to the viewport. Two callback refs now feed one visibility-aware engine. | Hidden-node, resize, unobserve, route-disabled and duplicate-callback tests. Real layout still requires browser/device QA. |
| Failed pages / remounts replayed stale content | Permanent session/offline discovery replay and stale-extra merge. Mounted windows now revalidate bounded server head queries; append updates overlapping IDs, preserves cursors on failure and exposes retry. | Pagination tests cover two consumers, overlap, failed cursor retry, exhausted source and delayed unmount completion. Intentional tradeoff: offline Home discovery shows unavailable instead of historical content. |
| Story pager could continue after exhaustion | Home called all collection loaders, but Stories did not enforce its own exhaustion. Explicit Story guard added; failed Story reads expose retry. | Media lifecycle suite retained. No expired/restricted history replay added. |
| Likes appeared successful before Auth/write | Independent optimistic state existed in card wrappers, the card itself and Story viewer. Shared reaction state now waits for repository persistence and server confirmation. | Guest/no-write, cross-surface one-action, unlike, failure, ambiguous acknowledgement and account-switch tests. Fresh read costs two documents per mounted authenticated reaction or refresh; simultaneous surfaces share it. |
| Fake Save / invalid Story share / comment prompt | Save had no persistence; Story links targeted the post collection; Story comments targeted post-only rules. These Home card actions are explicitly unavailable instead of claiming success. | Post share uses exact canonical link, cancellation does not copy, clipboard failure renders an error. Story comments/sharing and saved-post persistence remain unimplemented. |
| Open comments downloaded everything and called window length the total | Listener was unbounded. Latest 50 are now shown oldest-to-newest within that window; parent count remains separate. Listener failures expose retry instead of false empty success. | Composer typing, duplicate Send, failed-send text retention, UID payload, summary count and teardown tests. New descending comment index must be deployed separately before release. |
| Exact-post network failure looked like deletion | Direct document read swallowed errors. `PostPage.tsx` now requests strict reads and offers retry. | Direct-route/fresh-mount test reads `community_posts/exact-post`, independently of Home. Deployed SPA rewrite/refresh is not browser-verified here. |
| Desktop activity navigation changed only mobile state | Home activity navigation now selects the actual Explore route on either surface. | Type/build verified; actual navigation and filter-result QA pending. Home Enter/apply-filter controls open the existing companion search surface, not a new search algorithm. |
| Extra mobile sections / unsupported claims | Removed duplicate Home activities/events lists, unreachable social handler copies and unused per-Story like prefetch. Stored event spots labelled capacity, not remaining places; unsupported earnings promise removed from both Home CTAs. | No palette/header/Stories-position redesign. Event registration remains a separate unresolved workflow, not implied by the Home summary card. |

## Verification at this checkpoint

- Final main suite: **217/217**, 24 files, including the three formerly deferred Home acceptance cases and the inactive-Story-viewer regression. No skipped tests.
- Admin: 40/40, six files.
- Firebase emulators: **47/47**, no skipped tests. Includes 26 security-rule cases, 6 booking transaction cases, 10 media flow cases, 5 Storage-rule cases. Two new social tests use actual atomic SDK write shapes and fresh authenticated readers, not the React UI or an end-to-end import of SocialRepository.
- Root/admin TypeScript: **0 diagnostics**. Final root recheck passed after integration.
- Main/PWA and admin builds passed. Final main rebuild: 1,926.68 kB JavaScript / 501.83 kB gzip; PWA precache 5,982.21 KiB. Admin: 1,826.11 kB / 477.21 kB gzip. Existing large-bundle warnings remain.
- Total current automated passing cases: **304** (217 main + 40 admin + 47 emulator). Scoped Phase 3 diff whitespace check passed; unrelated earlier mixed-line-ending diffs remain untouched.
- No live Firebase data was created, edited, deleted or seeded. Emulators shut down normally.

## Remaining work, safest order

1. **P1 release gate — real browser/device QA.** Check desktop and mobile widths, keyboard, scroll, back/forward, orientation change, Home re-entry, account switch, installed PWA and offline/reconnect. Exercise a valid local/test account through actual repository UI flows. UI tests alone do not validate pixels or Firebase network integration.
2. **P1 — deployment inventory and approved rollout.** Confirm deployed rules/claims and all pending indexes, especially comments `(postId ASC, createdAt DESC)`. Do not deploy the whole dirty tree as a Home-only release: earlier P0/media edits are present. Inventory, stage reviewable groups, seek rollout authorization, then verify deployed exact-post refresh.
3. **P1 — event registration core.** Existing `eventParticipants.ts` still reads a participant query inside a client transaction and has unresolved capacity/permission behavior documented by P0. Home summaries are not event-join certification. Fix at repository/rules level with concurrency tests before presenting event joining as production-ready.
4. **P1 — search/discovery completeness and input normalization.** The existing search UI filters currently loaded arrays, not the complete database; malformed legacy companion fields can still break older filtering paths. Add validated model adapters and bounded searchable pagination; avoid bulk downloads. Test matches beyond page one and missing legacy fields on both surfaces.
5. **P1/P2 — other social surfaces and history.** CommunityFeed still has its own like state and persistence gaps outside the shared Home cards. Reuse the same reaction contract there. Add older-comment cursor loading before large discussions need full history; never interpret a 50-item window as the total. Define real saved-post and Story comment/share contracts before enabling those controls.
6. **P2 — lifecycle and scale.** Loaded discovery pages are retained during a mount, not virtualized. Per-type caps may underfill sparse inputs. Query heads revalidate on remount; older loaded records can become stale until refresh. Measure read costs, windowing, refresh policy, image-viewer parity, focus traffic and retained DOM on actual datasets before increasing load. Split bundles separately.
7. **P2 — consistent metadata and categories.** Companion category selection still uses the first interest, not a validated specialization schema. Historical category headers are placement context; edited category metadata needs a product-defined header reclassification policy. Do not fabricate guide counts.

The safe next step is review and local responsive/end-to-end qualification, not deployment or Functions activation. P0/media reports remain historical evidence, with this checkpoint superseding only their explicitly deferred Home findings.
