# SATHI Documentation Changelog

Every development session (human or AI) MUST append an entry here.

Entry format (all fields mandatory):

```
## [Date] — [Task title]
- **Task:**
- **Objective:**
- **Files changed:**
- **Architecture changes:**
- **Firebase changes:**
- **UI changes:**
- **Security implications:**
- **Performance implications:**
- **Tests performed:**
- **Known issues:**
- **Next recommended task:**
```

---

## 2026-08-24 — Authoritative documentation set creation
- **Task:** Create `/docs/sathi/` authoritative documentation (19 files).
- **Objective:** Permanently establish project identity, target architecture, scalability requirements, booking concurrency model, security/performance/testing principles, and non-negotiable rules. Documentation-only; no application code modified.
- **Files changed:** `docs/sathi/00_MASTER_OBJECTIVE.md` … `16_REMOVED_FEATURES.md`, `docs/sathi/CHANGELOG.md` (this file).
- **Architecture changes:** None (documented current state: dual-app React/Vite + shared `hamrosathi1` backend; service-layer-only Firebase access).
- **Firebase changes:** None. Recorded that Cloud Functions remain blocked (no Blaze plan) and that booking is not yet server-authoritative.
- **UI changes:** None.
- **Security implications:** None introduced. Codified "never trust the client", RBAC enforcement in rules, server-authoritative operations list.
- **Performance implications:** None introduced. Defined 10k-concurrent-user engineering requirements and load-testing gate.
- **Tests performed:** None required (docs-only). Consistency check across all 19 files performed manually; no contradictions found with `docs/SATHI_MASTER_SPEC.md`, `docs/SATHI_CHANGELOG.md`, `AGENTS.md`.
- **Known issues:** (1) Booking path lacks single atomic transaction; (2) no cursor-based pagination; (3) hardcoded wallet/ledger fake data in ClientApp; (4) hardcoded 4.8 ratings on activity cards; (5) flaky `services.test.ts` timeout; (6) Cloud Functions blocked on Blaze plan.
- **Next recommended task:** Implement cursor-based pagination in `useFirestoreData` hooks (append-only, stability-preserving) — lowest-risk fix that directly improves feed stability and read costs; then convert booking creation to a single Firestore transaction with idempotency keys.

---

## 2026-08-25 — Unified Home feed across desktop + mobile
- **Audit finding:** data layer and composer were already shared (one `useDiscoveryFeed` → `homeFeedItems` consumed by both subtrees), but the MOBILE renderer re-grouped the composed array by category→type into per-type rows (destroying the interleaved order), silently dropped community posts from the feed region (rendering them only in a separate CommunityFeed section), and duplicated reveal/sentinel/chunking logic — so effective mobile order differed from desktop and breakpoint resize reset reveal position.
- **Unification:** new shared `useProgressiveReveal` hook (chunkFeedByHeader + reveal counter + IntersectionObserver sentinel + load-more trigger) instantiated ONCE in ClientApp and passed into `DiscoveryFeed` via props; mobile now renders `homeReveal.revealedItems` strictly in composer order using the same card components (compact CompanionCard, activity/event cards, shared `FeedStoryCard`/`FeedPostCard` wrappers over SocialPostCard). Mobile's separate Community Feed block removed from Home (community posts are inside the feed); desktop Explore untouched. Breakpoint resize no longer reshuffles or resets reveal position (#13).
- **New files:** `src/hooks/useProgressiveReveal.ts`, `src/components/social/FeedSocialCards.tsx`, `docs/sathi/HOME_FEED_ARCHITECTURE.md`.
- **Files changed:** `src/ClientApp.tsx`, `src/components/discovery/DiscoveryFeed.tsx`, `src/services/feedStabilizer.ts` (+`chunkFeedByHeader` export), `index.html` (added non-deprecated `mobile-web-app-capable` meta), test suite.
- **Tests:** +3 unification cases in home-feed-performance.test.ts (chunker contract, desktop/mobile revealed-sequence parity for every reveal count, community-inside-feed); full suite 162/162 green; lint baseline unchanged.
- **Known limits:** visual QA on physical devices not performed in this environment; standalone mobile "Activities" strip below the feed intentionally left (legacy approved UI, duplicates some activity records visually but not part of feed order).

---

## 2026-08-24 — Hotfix: Rules-of-Hooks crash + Firestore notifications index
- **Crash fix:** `useCompanionCategories` (contains `useMemo`) was invoked inside conditional JSX IIFEs in `src/ClientApp.tsx` (Companions tab, desktop ~L1141 and ~L1561). Toggling `companionsLoading` changed hook count between renders → "Rendered more hooks than during the previous render" → ErrorBoundary tree teardown. Fixed by hoisting ONE unconditional `companionCategories` call to the component top level and referencing it in both render branches.
- **Firestore index:** notifications query (`userId ==` orderBy `timestamp desc`) required composite `(userId ASC, timestamp DESC)` — declared in `firestore.indexes.json` but never deployed. Deployed indexes to `hamrosathi1` via Firebase CLI; deploy initially failed on redundant single-field "composite" declarations (`stories.createdAt`, `auditLogs.timestamp`, duplicate `users.lastActive`) which the API rejects — removed (covered by automatic single-field indexes), leaving 58 valid composites.
- **Files changed:** `src/ClientApp.tsx`, `firestore.indexes.json`.
- **Verification:** full suite 159/159; lint baseline unchanged (18 pre-existing errors, zero new); index deploy confirmed by CLI ("deployed indexes successfully").
- **Note:** "Notifications permission has been blocked" in the console is a Chrome site-setting for ignored prompts — reset via Page Info → Notifications; not an app bug.

---

## 2026-08-24 — Mobile header restoration, PWA branding, and mixed-feed completion
- **Task:** (1) Restore the legitimate mobile Home header (SATHI logo + search + filters + profile) that a prior instruction had stripped; (2) fix PWA branding (broken icons, missing manifest logo); (3) finish the shared mixed Home feed with the ≤3-consecutive-companion rule, community posts included.
- **Mobile header:** `src/ClientApp.tsx` — single mobile Home header row restored: SATHI logo (`/sathi-logo.jpeg`, matching Navbar/desktop branding), glassmorphism search bound to the existing `searchQuery` state, standalone Filters button (same `setIsFilterDrawerOpen(true)`, active-filter count badge), profile avatar (unchanged dropdown trigger). Exactly one search surface per view; Stories render below. No duplicate header/search/logo blocks exist.
- **Desktop:** unchanged sticky ClientApp header remains the sole desktop search; DiscoveryFeed's duplicate internal header stays removed (per 15_NON_NEGOTIABLE_RULES / 16_REMOVED_FEATURES).
- **PWA fixes:** `vite.config.ts` manifest icons now point to `/sathi-logo.jpeg` (verified valid 1254×1254 PNG, `purpose: any` + `maskable`) instead of four corrupt `.jpg` files (UTF-8-BOM-mangled binaries that browsers cannot decode → generic launcher icon). `index.html`: favicon + apple-touch-icon now use the real logo. `src/components/PWAInstallPrompt.tsx`: both `/icon.jpg` references replaced. Manifest name/short_name/theme_color/background_color/start_url/display verified correct and untouched.
- **Loading screens:** `index.html` gained an inline pre-hydration splash (logo, wordmark, animated dots on brand gradient #17191C→#0F1113 — zero dependency on the CSS bundle); `main.tsx` "MOUNTING SATHI..." text hack removed; `src/components/LoadingScreen.tsx` redesigned around the real logo (ping-glow ring, wordmark, bouncing dots) with unchanged timeout/refresh behavior.
- **Feed mixing (`src/services/feedGenerator.ts`):** category chunks weave companions into an interleaved non-companion stream via new `weaveCompanionsIntoStream` (gap allocation: max 2 companions per gap, overflow dropped to leftover/tail paths) with adaptive companion budget `min(itemsPerCategory, relatedNonCompanionCount*2+3)`; leftovers (unplaced companions/activities/events/stories/posts incl. community content) compose a final tagged tail section — no type-block dumps. Hard invariant: ≤2 consecutive same-type items while any alternative type has content in the loaded batch; >3 companion runs impossible when alternatives exist. Relevance preserved (category/fallback pools first), availability-adaptive (thin categories automatically lean on other content types).
- **Stability:** all generator randomness derives from ONE session-seeded PRNG (`mulberry32`, new exported helper) created once in `useDiscoveryFeed` and passed via `options.rng` — batch composition is deterministic within a session; refresh reseeds. Companion selection is deterministic (document-ID order, no random subset sampling). `stabilizeFeed` upgraded: tail region is first-class (tagged `_tail` entries from the generator), tail↔chunk migrations keep original placement, deletions still drop. Append-only across pagination batches guaranteed and tested.
- **Community integration:** community posts participate in every layer — category-matched slots, tail interleave, and orphan/tail stability domains; sourced solely from real `community_posts` (status=published) via existing cursor-paginated hook.
- **Pagination/deduplication:** unchanged from previous task (document-ID cursors, session cache, single-flight guards); feed dedup by document ID re-verified by tests.
- **Files changed:** `index.html`, `src/main.tsx`, `src/components/LoadingScreen.tsx`, `src/components/PWAInstallPrompt.tsx`, `src/ClientApp.tsx`, `src/components/discovery/DiscoveryFeed.tsx` (props/import cleanup), `src/services/feedGenerator.ts`, `src/services/feedStabilizer.ts`, `src/hooks/useDiscoveryFeed.ts`, `src/__tests__/home-feed-performance.test.ts`, `vite.config.ts`.
- **Tests performed:** full suite 159/159 passing (incl. 8 new/updated composition tests: run-limit under heavy companion DBs, scarce-content distribution, uniqueness, mergeById semantics, append-only stabilization across 3-batch sessions ×15 seeds, header alignment, truthful labeling). Composition suites green across 10 consecutive repeat runs (earlier flake root-caused to independent-RNG test setup + two genuine stabilizer migration bugs, both fixed). `npm run lint`: exactly the 18 pre-existing HEAD errors, zero new.
- **Remaining issues / honest limits:** corrupt `icon*.jpg`/`apple-touch-icon.jpg` files remain on disk unreferenced (safe cleanup candidate); PWA install/splash appearance not visually verified on a real device in this environment (manifest structure validated statically only); manual multi-device testing of header/feed behavior NOT performed here — unit-level coverage only; one-time visual transition for users who had cached the old icon.

---

## 2026-08-24 — Home page performance optimization (cursor pagination + stable append-only feed)
- **Task:** Optimize Home page data loading and rendering performance only (no redesign, no feature changes).
- **Objective:** Fast first paint, small initial Firestore reads, stable non-reshuffling feed, progressive cursor-paginated loading, no duplicates, no unnecessary listeners/requeries.
- **Files changed:** `src/services/firestore.ts`, `src/hooks/useFirestoreData.ts` (rewritten), `src/hooks/useDiscoveryFeed.ts`, `src/services/feedStabilizer.ts` (new), `src/components/discovery/DiscoveryFeed.tsx`, `src/ClientApp.tsx`, `src/repositories/SocialRepository.ts`, `src/__tests__/home-feed-performance.test.ts` (new), `docs/sathi/12_FEED_LOADING_STRATEGY.md`, this CHANGELOG.
- **Architecture changes:** Discovery collections (`companions`, `stories`, `activities`, `events`, `partners`, `community_posts`) converted from per-mount `onSnapshot` listeners to one-shot cursor-paginated `getDocs` with in-memory session cache — the fix recommended as order #1 in `12_FEED_LOADING_STRATEGY.md`. Real-time remains reserved for messaging/notifications/bookings (unchanged). Desktop and mobile share the exact same data hooks, feed generator, stabilizer, and load-more coordinator.
- **Firebase changes:** Initial Home discovery reads reduced from ~130 docs across 7 live listeners (duplicate `community_posts` subscription) to 65 docs across 5 one-shot queries; subsequent batches are cursor pages of 10–15 docs fetched only when the user reaches the loaded content boundary. Pagination orders by document ID (automatic single-field index only — no new composite index required). Event "joined" state now uses ONE equality-only query (`userId ==`, `status ==`) instead of up to 20 per-event doc reads; post/story like-state lookups are memoized per session in `SocialRepository` and invalidated on like/unlike. No rules, project config, or Functions changes.
- **UI changes:** None visual by intent. Progressive-reveal sentinels now use IntersectionObserver (scroll fallback kept); reveal count is no longer reset to 2 when new data arrives (previously collapsed the feed); spinner shows while a batch loads or content is pending reveal.
- **Security implications:** None. Same public-catalog reads under existing rules; user-specific state (likes/joined) unchanged semantics, still authoritative from Firestore with optimistic rollback.
- **Performance implications:** Feed regeneration is now keyed on item-ID signatures (not array identity), so snapshot/favorites/filters churn no longer recompute or reshuffle the feed; ordering is decided once per session/batch and preserved via chunk-level merge (`stabilizeFeed`). Duplicate identical page requests share one in-flight promise; only one pagination request per collection may be active at a time; unmount-safe cancellations. Measured numbers: not instrumented end-to-end — read-count reductions above are derived from query definitions, not runtime profiling; no latency claims made.
- **Tests performed:** `npx vitest run` → 154/154 passing (146 pre-existing incl. all 15 feed-generator cases + 8 new tests covering mergeById dedupe/order, append-only stabilization, removal handling, header alignment, duplicate prevention). `npm run lint` (tsc) → same 18 pre-existing errors as HEAD (verified `markAllNotificationsRead` etc. exist at HEAD; zero new errors introduced).
- **Known issues:** (1) If a regenerated batch temporarily drops an item (e.g., it falls outside per-category sampling caps), the stabilizer removes it until it reappears, then appends it at its section's end — never mid-section reorder; (2) a failed page fetch marks nothing cached-exhausted, so it retries on next mount but there is no inline retry button yet; (3) one-time transition: localStorage caches written by the old createdAt-ordered code may briefly paint before merging into the new deterministic document-ID order; (4) scalability: bounded queries + session caching reduce per-user reads substantially, but 10k-concurrent-user capacity remains unvalidated pending the load tests in `14_TESTING_STRATEGY.md`.
- **Next recommended task:** Booking creation as a single Firestore transaction with idempotency keys (per prior changelog), then Blaze-plan Functions deployment when billing is confirmed.

---

## Historical context (pre-doc-set, consolidated)

- **2026-08-12:** Firebase backend audit/redesign; admin panel extracted to standalone `/admin`; 38 admin tests. Cloud Functions implementation complete but deployment paused (Blaze plan).
- **2026-08-22:** Full project audit (no code changes) → `docs/SATHI_MASTER_SPEC.md`, `docs/SATHI_CHANGELOG.md` created.
- **2026-08-23:** Feed per-type caps introduced (companion 30% / activity 20% / event 20% / story 15% / post 15%) to stop activities dominating after deep scrolling; 146 tests passing.
- **2026-08-23:** Mobile "Explore by Activities" category chips replaced with real activity cards; duplicate "Popular Experiences" section removed.
- **2026-08-24:** SATHI logo (`public/sathi-logo.jpeg`) applied to desktop sidebar and Navbar, replacing "S" placeholder squares.
