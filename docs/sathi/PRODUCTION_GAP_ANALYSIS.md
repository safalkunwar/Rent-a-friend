# SATHI — production gap analysis and approval plan

Date: 2026-09-05. **Recommendations only. No implementation or deployment authorized.** See [audit](ASTRA_CODEBASE_AUDIT.md), [architecture](ACTUAL_ARCHITECTURE.md) and [Firebase map](FIREBASE_CURRENT_STATE.md) for the traced contracts.

Priority means consequence, not implementation effort:

- **P0:** data loss, security exposure, unsafe commercial/safety claims or broken core functionality.
- **P1:** required before real users rely on the affected workflow.
- **P2:** important production robustness, cost and maintainability improvements.
- **P3:** polish or future product scope.

S = static code finding; R = locally reproduced; U = requires isolated integration/device/deployment verification. A source-proven policy defect does not imply an exploit was performed or that deployed rules were inspected.

## Verification baseline

Fresh isolated feed suites: **33 tests passing** across `feed-generator.test.ts` and `home-feed-performance.test.ts`. Three additional pure-code probes reproduced stale retained payload, cross-type ID suppression and an eight-companion run. These are described in the audit and must become regression cases after approval.

Fresh root `tsc --noEmit --pretty false`: **failed, 17 diagnostics**. Eight concern migration/admin scripts; nine concern `src/components/dashboard/DashboardTab.tsx`. Dashboard unresolved names include `useMemo` (line 83), `myBookings` (149 and other sites), `totalSpent` (184), and `favoriteCompanions` (229 and other sites). These are runtime identifier hazards, not merely a cosmetic type warning. No build success is claimed by this audit.

The historical 164-test figure was not freshly reproduced. Main/admin test discovery and Firebase mock paths need isolation before broad suites can be trusted not to contact real services. No emulator, authenticated multi-user test, real payment, physical-device test or fresh deployed-version comparison was performed.

## P0 — containment and core correctness

### P0-01 — cross-user writes and conversation confidentiality

- **Evidence/files (S):** `firestore.rules:129` grants all authenticated users nested favorites writes; `:239` does the same for conversations. Message read rules trust conversation participant membership. `src/services/messaging.ts` and `components/messages/MessagesTab.tsx` use those parents.
- **Root cause:** permissive overlapping allow clauses override intended ownership restrictions. UI guards cannot compensate.
- **Recommended fix:** remove broad authenticated writes and define immutable participant/owner fields; authorize each message/conversation transition against canonical participant UIDs. Keep create/update/delete policies separate. Decide whether pre-booking conversations are allowed explicitly.
- **Dependencies:** isolated rules harness and fixtures; canonical UID contract. No Blaze upgrade is needed merely to tighten rules.
- **Regression risk:** legitimate chat creation, unread metadata updates and favorite writes may be denied if their payloads are not migrated with the rules.
- **Verify:** emulator users A/B/C plus anonymous/admin: C cannot change/delete A-B parent, add itself, read messages or alter A favorites; A/B can perform only intended writes. Test existing legacy conversation IDs and list queries, not only direct gets. Confirm deployed policy version only after an approved release.

### P0-02 — least-privilege admin and companion trust are not enforced

- **Evidence/files (S):** `firestore.rules:isAdmin/isCompanion`, `/admins`, `/companions`, `/activities`; root/admin `services/admin.ts`, guards and admin RBAC. Every listed adminRole, including read_only, reaches broad mutation branches; any admin record suffices. A normal user can create its own public companion document with verification/rating-shaped fields.
- **Root cause:** role labels and public-profile existence are treated as global authority; create-time schema does not separate trusted verification from editable profile data.
- **Recommended fix:** deny-by-default capability-specific rules; root-only admin assignment; approval-controlled public companion creation/trusted fields; immutable ownership. Separate public profile and private KYC. Review actual legacy role/ID assignments before migration.
- **Dependencies:** P1-01 identity contract, P1-02 lifecycle agreement and a read-only/redacted existing-data inventory. Containment tests can start before migration.
- **Regression risk:** lockout of real operators/companions and incompatible historical claims. Preserve an explicitly tested recovery administrator, never a blanket backdoor.
- **Verify:** full 11-role operation matrix and forged-client tests; read-only admin cannot write, support cannot grant roles, unapproved customer cannot mint a verified companion or owner activity. Test claims refresh/revocation and missing/malformed admin records.

### P0-03 — reservation authority, lifecycle and recovery are inconsistent

- **Evidence/files (S):** `repositories/BookingRepository.ts:createBooking` already atomically writes lock+booking. Its status method mutates admin-only locks; `context/AppContext.tsx` bypasses lock updates and can hide a committed booking after conversation/notification failure; `services/bookings.ts` performs sequential changes. `firestore.rules:/bookings,/booking_locks` allow arbitrary status values and unaffiliated lock creation. Offline pendingBookings has no replay consumer.
- **Root cause:** multiple transition implementations, client-authoritative quote/status and no durable idempotency/expiry policy. Lock identity is companion+date, not a defined time interval.
- **Recommended fix:** define booking state machine and canonical participant IDs; one authoritative quote/reservation/transition API or rule-enforced transaction contract; durable idempotency key, lock ownership and expiry/release, explicit post-commit side-effect retry. Make unsupported offline booking explicitly unavailable rather than falsely confirmed. Do not simply “add a transaction” where one already exists.
- **Dependencies:** P0-02, P1-01, P0-05 for paid states; owner decision on day versus interval inventory and cancellation/refund policy. A trusted server may require approved infrastructure, not necessarily an unreviewed Functions deploy.
- **Regression risk:** stranded legacy locks, double booking during migration, invalid historic state transitions or changed availability semantics.
- **Verify:** simultaneous bookings for same/overlapping slots; repeat same idempotency key; lost acknowledgement after commit; conversation/notification failure; cancel/decline/complete and rebook; expired payment; two tabs; offline/reconnect; malformed price/status/owner/slot writes denied. Read persisted state from a second client after each case.

### P0-04 — media/KYC paths and security contract disagree

- **Evidence/files (S/U):** `services/storage.ts`, post/story/application upload callers and `storage.rules`: two-segment uploads versus three-segment matches; kyc-documents versus kyc; size/MIME disagreement; any-auth public post/story overwrite; questionable Storage cross-service helper syntax. KYC getDownloadURL conflicts with reviewer-only read.
- **Root cause:** upload helper and policy evolved independently; no owner-aware object schema or private-document delivery contract.
- **Recommended fix:** versioned owner/entity paths, immutable object ownership, validated size/MIME, separate public media/private KYC handling and retention. Compile Storage rules in isolation; use appropriate cross-service access or validated claims. Persist private references rather than casually reusable bearer URLs; design reviewer access and orphan cleanup.
- **Dependencies:** P0-02, P1-02; inventory existing paths before changing references. Storage deployed state is unknown.
- **Regression risk:** inaccessible historical media, accidentally public identity documents, orphan uploads or inability for a reviewer to read a submission.
- **Verify:** emulator owner/other-user/reviewer tests for upload/read/overwrite/delete; JPEG/PNG/PDF and size boundaries; reject crafted MIME/path; mid-upload failure; retry and record-write failure; ensure unauthorized KYC cannot be fetched and logs/caches do not retain private URLs. No real KYC required for tests.

### P0-05 — paid booking cannot be verified securely

- **Evidence/files (S):** `services/payments.ts` references VITE_KHALTI_SECRET_KEY/VITE_ESEWA_SECRET_KEY and `verifyPayment` always throws; payment return pages depend on it. `BookingFlowModal.tsx` creates booking before payment and can show final confirmation on initiation failure. `/payments` accepts client-created fields; no provider verification/webhook handler found.
- **Root cause:** client integration skeleton is being treated as a trusted payment system.
- **Recommended fix:** gate commercial payment UI until a server-authoritative sandbox-tested pipeline exists. Move merchant credentials to server-only configuration; if ever shipped, assess exposure and rotate through an approved credential process. Verify provider contract, amount units, signatures, merchant/order binding and replay handling. Implement ledger, booking reconciliation, refund/cancellation policy; never accept browser success as settlement.
- **Dependencies:** P0-03, owner/provider credentials and commercial policy, approved backend hosting/billing. Do not deploy paused Functions without explicit Blaze confirmation and code review.
- **Regression risk:** duplicate charge/refund, orphan reservation, false paid state, amount unit error. Existing payments need reconciliation before migration.
- **Verify:** provider sandbox success/failure/cancel/timeout, tampered callback, duplicate/out-of-order webhook, wrong merchant/amount/order, retries after lost response, idempotent refunds, independent persisted reconciliation. Inspect generated bundle for merchant secrets without publishing values. Production rollout requires owner sign-off, not just unit tests.

### P0-06 — social integrity and moderation boundaries are porous

- **Evidence/files (S):** `firestore.rules:/community_posts,/comments,/likes,/stories,/story_likes`; `SocialRepository.ts`. All post statuses are public; arbitrary authenticated counter updates are allowed; like IDs/targets are not enforced; comment target/ownership integrity is weak; owner post/story deletes are denied despite UI controls.
- **Root cause:** counters and moderation/identity fields are treated as independent client-editable data instead of a constrained domain contract.
- **Recommended fix:** define public status/read-query contract; immutable author/target fields and validated content; enforce deterministic interaction IDs and atomic counter relationships where feasible, or use a trusted aggregator. Define author deletion versus soft deletion and dependent interaction/media cleanup. Keep real engagement intact.
- **Dependencies:** P0-02 moderation capabilities, P1-07 UI contract, cache invalidation P1-05. Some rule-enforced relationships are possible without Blaze; choose design based on tested limits.
- **Regression risk:** public feed/query denials, counter migration errors, accidental loss of genuine interactions or stale deleted content.
- **Verify:** malicious client cannot read nonpublic posts, forge author, create multiple likes for one user-target, edit counter independently or create comments on missing targets. Test concurrent like/unlike/delete, repeated requests, moderation while open and author deletion from a second client. Backup and dry-run any later cleanup.

### P0-07 — account switching does not isolate cached private state

- **Evidence/files (S):** AppContext logout/auth callback, `services/storage.ts:offlineStorage`, `offlineQueue.ts`, `offlineMessages.ts`, `hooks/useFirestoreData.ts`, `vite.config.ts` broad FirebaseStorage caching. Bookings/profile/queues and browser caches lack one UID-scoped teardown policy.
- **Root cause:** independent caches/replay stores have no common ownership or generation boundary.
- **Recommended fix:** inventory private versus public caches; namespace pending operations by UID and reject replay after identity change; cancel old listeners/async callbacks; clear private in-memory/persisted state on signout; exclude private media from broad SW caching and define SDK persistence policy. Do not erase another user's valid queued work silently.
- **Dependencies:** P1-01 and offline product decision; P0-04 private-media access design.
- **Regression risk:** lost drafts/pending operations, reduced offline experience, old SW continuing to serve data after update.
- **Verify:** A login -> private data/draft -> offline -> logout -> B login, across tabs/PWA restart/back navigation. B sees no A profile/bookings/messages/media and cannot replay A writes. Explicitly test stale async callbacks and old SW upgrade paths.

### P0-08 — safety and operational claims exceed implementation

- **Evidence/files (S):** `components/SafetyWidget.tsx` says live tracking/contact alerts while creating a one-shot location/SOS record; cancel changes local state only. `PartnerDashboard.tsx` contains fixed metrics/offers; ClientApp/cards include online/verification/escrow/earnings claims not backed by proven systems.
- **Root cause:** illustrative/marketing UI remains on operational paths without a clear data/fulfillment boundary.
- **Recommended fix:** immediately plan truthful unavailable/pending labels or feature gates for unsupported promises. Define staffed SOS response/escalation/cancellation and actual delivery acknowledgements before promising them. Replace fabricated partner metrics only when real measurement exists. Audit published terms/help/privacy for matching behavior.
- **Dependencies:** owner decisions on safety staffing, response obligations, verification and commercial claims; P1-11 support/operations, P1-12 devices.
- **Regression risk:** reduced apparent feature completeness, confused existing users, legal/operational expectations. No safety response should be implied by a database write alone.
- **Verify:** denial/location-unavailable/network failure and acknowledged response/cancel flows; compare every displayed metric/status to its authoritative source. Conduct supervised staging safety drills, never an unsolicited real emergency alert.

### P0-09 — dashboard contains unresolved runtime identifiers

- **Evidence/files (R/S):** fresh root TypeScript check reports nine errors in `src/components/dashboard/DashboardTab.tsx`: missing useMemo, myBookings, totalSpent, favoriteCompanions. These names occur in executable render logic.
- **Root cause:** incomplete component integration/refactoring in the existing working tree; Vite build is not a type gate.
- **Recommended fix:** reconcile intended derived state/imports with actual booking/favorites context rather than supplying placeholder values. Keep existing layout and treat this as a direct integration repair.
- **Dependencies:** clarify intended dashboard data contract; booking/favorites correctness in P0-03/P1-07 informs displayed status, but identifier repair need not await payment launch.
- **Regression risk:** hiding incorrect totals with fallback zeros or excluding companion/customer bookings incorrectly.
- **Verify:** scoped typecheck clean; render customer and companion dashboard with empty, pending, confirmed, cancelled and favorite fixtures; navigate from each tab; verify values against persisted domain state. Separately fix eight script diagnostics under P1-13.

## P1 — required before real-user reliance

### P1-01 — consolidate authentication/profile authority

- **Evidence/files (S):** AuthModal, AppContext, `services/auth.ts`, UserRepository, main firebase.ts and paused onUserCreate independently establish profile/claims. Token claims overwrite synthetic anonymous detection; callback lacks account-generation cancellation.
- **Root cause:** no idempotent single bootstrap or explicit role/public-profile schema; fallback configuration masks initialization errors.
- **Recommended fix:** one bootstrap contract with merge/createdAt semantics; consistent claims/profile authority; explicit public peer projection; strict project/config initialization and typed failure; generation-scoped async work and verified guest logic.
- **Dependencies:** P0-02 role policy and P0-07 teardown; migration inventory of existing profiles.
- **Regression risk:** duplicate-profile migration, anonymous upgrades, existing sessions losing fields, chat peer identity breakage.
- **Verify:** email signup, existing login, popup failure, anonymous upgrade, reset, rapid A->B switching, reload, missing/forbidden profile, wrong project configuration and claim refresh. Verify documents from a separate client, not only context state.

### P1-02 — one KYC/application/activation lifecycle

- **Evidence/files (S):** CompanionApplicationRepository sequential approval writes and rating resets; AuthModal legacy guide write lacks userId; AppContext.becomeCompanion writes a different path; AdminGuard requires companions.verify not assigned to expected reviewer roles; standalone AdminGuides uses old collection.
- **Root cause:** additive onboarding implementations and permission vocabularies without a canonical transition contract.
- **Recommended fix:** select new canonical application model; transition-guarded, idempotent approval/rejection/revocation and public projection; align role/status/claims/interests mapping without resetting engagement. Route all reviewer UI to one authorized operation. Retire legacy entry points only with migration/redirects.
- **Dependencies:** P0-02/P0-04/P1-01; owner decisions on KYC fields, retention and reviewer authority.
- **Regression risk:** stranded existing applications, duplicate submissions, published private legal names, loss of ratings and approval access.
- **Verify:** draft/resume/submit/change-request/resubmit/approve/reject/revoke, duplicate click, concurrent reviewers, failure between effects, repeat approval, legacy migration; ensure approved companion is discoverable and unapproved cannot publish itself.

### P1-03 — event joining and activity promises lack a valid contract

- **Evidence/files (S):** `services/eventParticipants.ts:joinEvent` calls transaction.get on a Query; Web SDK transaction API here expects document references. Counts all matching registrations; rules permit independent registrations without capacity/ID integrity. Legacy nested participants and flat collection coexist; activities render without a complete join/purchase flow.
- **Root cause:** server-style query transaction assumption and catalog UI mistaken for reservation implementation.
- **Recommended fix:** canonical flat or nested registration model with deterministic membership and capacity document/authoritative transaction; idempotent joining before “full” rejection on repeat; explicit activity CTA destination or unavailable status. Do not scan all participants per join.
- **Dependencies:** P0-02 ownership, event product capacity/cancellation policy, P1-13 indexes/tests.
- **Regression risk:** overselling, duplicate counts, losing old registrations or changing meaning of spots.
- **Verify:** join/leave/rejoin twice, last spot concurrent users, repeated join when full, unauthorized capacity/other-user edit, zero/missing capacity and large-event read count; prove server-persisted registration and UI reload.

### P1-04 — admin operations can report misleading success

- **Evidence/files (S):** `admin/src/services/firestore.ts` casts last document data to unknown[]; cursor builder expects an array with length, so ordinary object cursor is ignored and page one can repeat. Reads return [] on errors. AdminRepository writes actorId 'admin'; audit rule requires actual UID. Counts use limit1 lengths; health treats empty reads/initialized Storage as healthy. Admin list reads for admins/notifications conflict with rules.
- **Root cause:** generic wrappers discard failure/cursor semantics; client role/metrics/audit behavior is not a trustworthy operational backend.
- **Recommended fix:** typed query result/error and real snapshot/value cursor; exact-role read contracts; actual actor UID and atomic or reliably queued audit; accurate aggregate definitions, explicit degraded health. Reconcile standalone versus embedded deployment routing.
- **Dependencies:** P0-02, P1-02, P1-13; real metric definitions with finance reconciliation for revenue.
- **Regression risk:** changed dashboards expose previously hidden failures; pagination migration/duplicate rows; audit becoming another post-commit failure.
- **Verify:** multi-page ordered fixtures including equal sort values, denied/offline/missing-index results, real UID mutation audit, role matrix, counts above one and >500 records, Storage operational check versus configuration-only check.

### P1-05 — Home freshness, identity, filtering and composition

- **Evidence/files (R/S):** pure probes in audit; `useFirestoreData.ts` cache merge retains extras, `useDiscoveryFeed.ts` keys on IDs, `feedStabilizer.ts` retains previous item payloads, `feedGenerator.ts` raw-ID dedup and local-only weaving. ClientApp passes unfiltered fetchedCompanions; approval emits categories but generator reads interests.
- **Root cause:** stable order, entity freshness, query membership and ranking are conflated.
- **Recommended fix:** preserve positions by typed entity key while replacing payloads with latest versions; query-aware cache keys/TTL and explicit invalidation/tombstones; define filter scope and category mapping; enforce final mixing invariants after stabilization. Retain existing layouts and seeded session stability where appropriate.
- **Dependencies:** P0-06 public-status contract, P1-02 schema mapping; agreement on Home filtering/newest versus ID-page semantics.
- **Regression risk:** reshuffling/jumping scroll, dropped pagination records, duplicate content, stale removals mistaken for off-page records, unintended ranking redesign.
- **Verify:** the three reproduced fixtures; edit same ID, moderate/delete on second client, add post then revisit Home, overlapping collection IDs, empty/sparse/dense categories, each filter, multiple pages and remount. Compare complete typed-key sequences at identical fixture state across desktop/mobile/PWA; verify text/count freshness independently of ordering.

### P1-06 — responsive mounting and reveal can multiply work

- **Evidence/files (S/U):** ClientApp mounts CSS-hidden desktop/mobile trees; both receive same sentinelRef; `useProgressiveReveal.ts` checks hidden element rectangle and attaches observer once. Hidden social cards still run effects; initial discovery hooks run on non-Home tabs.
- **Root cause:** visual hiding used as lifecycle control, one DOM ref assigned to multiple targets.
- **Recommended fix:** one active sentinel/content lifecycle or deliberate separate refs with visibility-aware observer ownership; shared domain actions independent of layout. Gate unused fetching where safe and deduplicate in-flight interaction checks; preserve expected tab fast-return behavior.
- **Dependencies:** P1-05 canonical state; device/viewport acceptance fixtures.
- **Regression risk:** hydration/resize flicker, remount lost scroll/comments, stalled load-more or duplicate fetches.
- **Verify:** instrument query/listener counts at desktop/mobile sizes, resize both directions, rotate PWA, scroll slowly/rapidly and switch tabs; no hidden sentinel page drain, one intended load per cursor, bounded duplicate effects and stable reveal position. This runtime reproduction remains outstanding.

### P1-07 — social actions need consistent persistence and failure behavior

- **Evidence/files (S):** FeedSocialCards, SocialPostCard, CommunityFeed, PostPage, story viewer, usePostComments and SocialRepository: duplicate like state/guest optimism, local-only saves, story comments sent to post collection, story shares to post route, inconsistent media/auth callbacks and timestamp IDs.
- **Root cause:** multiple renderers implement entity actions instead of consuming one action/state contract.
- **Recommended fix:** shared post/story action controller and durable saved-content model; type-specific comment/share targets; collision-resistant IDs; explicit mutation success/error/rollback; route-level auth entry usable outside ClientApp; propagate payload updates into Home. Define whether story comments exist before implementing a new collection.
- **Dependencies:** P0-04/P0-06 and P1-05; owner choice on story comments/expiry and saved-content scope.
- **Regression risk:** double increments, save migration, broken share links, optimistic pending comments disappearing incorrectly.
- **Verify:** each action on Home desktop/mobile, Explore, PostPage and viewer; guest versus signed-in; slow/failing/offline request; double click; reload/second device; same timestamp submissions; missing target and denied owner delete. Every success must correspond to one persisted allowed operation.

### P1-08 — messaging identity, unread and history are incomplete

- **Evidence/files (S):** MessagesTab reads forbidden peer users, uses fallback personas/online labels; messaging send updates conversation but active read path does not integrate markMessagesAsRead; unread counts/typing/presence helpers are incomplete or unused. Selected messages/conversations are unbounded listeners; virtual parent may not exist.
- **Root cause:** incomplete integration across chat schema, private profiles, optimistic state and metadata.
- **Recommended fix:** canonical participant UIDs/public peer projection; idempotent parent creation/send; authoritative unread/receipt policy; remove fake presence until real; bounded recent listener plus older-history cursor; one account-scoped queue if offline sending is supported.
- **Dependencies:** P0-01/P0-07/P1-01, notification contract P1-09.
- **Regression risk:** duplicate messages, lost history, unread totals resetting incorrectly, exposing private profiles to solve identity lookup.
- **Verify:** two independent authenticated clients, first conversation, simultaneous sends, retry after commit, read receipts/unread, nonparticipant denial, multi-page history, logout mid-send, offline rejoin and peer deletion. No fallback identity should impersonate a real participant.

### P1-09 — Functions and notification delivery are not deployment-ready

- **Evidence/files (S):** `functions/src/index.ts` nested message trigger differs from top-level messages; onUserCreate overwrite/Timestamp fields, role callable claim replacement, non-deduplicated aggregates. `services/notifications.ts` getToken lacks explicit integrated SW registration; no complete background messaging SW/dispatch found; notification fields/recipients differ.
- **Root cause:** paused server code diverged from active client schemas; foreground notification support mistaken for complete delivery.
- **Recommended fix:** schema reconciliation, non-destructive bootstrap, claim-preserving authority, replay-safe handlers; decide in-app versus push delivery guarantees; integrate one supported SW and server send/token lifecycle. Keep paused until billing approval and these fixes pass isolated tests.
- **Dependencies:** P1-01/P0-03/P1-08; explicit Blaze confirmation if using Functions; platform push testing P1-12.
- **Regression risk:** profile overwrite, duplicate notifications/counters, incorrect recipient, old tokens delivering after logout.
- **Verify:** Functions emulator duplicate/out-of-order event tests, actual collection paths, deleted/rotated tokens, denied permission, foreground/background/closed PWA and logout. Server failures must not be represented as delivered notifications.

### P1-10 — review/verification provenance is not reliable

- **Evidence/files (S/H):** `services/reviews.ts` embedded companion array writes versus `/reviews` rules/onReviewCreate; normal customer lacks companion aggregate edit permission; seed/catalog review/persona material remains. Historical fake-like purge is not a complete live provenance audit.
- **Root cause:** two review schemas and unverified synthetic/trusted-field provenance.
- **Recommended fix:** one completed-booking-linked review model with unique reviewer/booking, bounded ratings, edit/delete aggregation and replay safety; mark/remove synthetic production claims only after inventory and approved migration. Disable unsubstantiated verified/rating claims meanwhile through an approved UI change.
- **Dependencies:** P0-02/P0-03/P0-06, owner-approved redacted production inventory and backup.
- **Regression risk:** erasing genuine reviews, resetting aggregates, invalidating old booking links.
- **Verify:** completed participant only, one review per booking, concurrency/retry/edit/delete, aggregate reconciliation, seeded versus real provenance report and dry-run migration. Do not infer real record counts from seed source.

### P1-11 — support, reports and moderation need operational closure

- **Evidence/files (S):** support/reports/feedback services and rules differ for owner reads; unrestricted support owner update can alter operational fields; admin mutates content without complete dependent cleanup; no established response delivery/escalation path.
- **Root cause:** submit forms/admin tables built without a shared case lifecycle and field-ownership model.
- **Recommended fix:** requester versus operator fields and capabilities, immutable attribution, controlled case status, response delivery and moderation visibility; correlate SOS separately rather than claiming ordinary tickets are emergency response.
- **Dependencies:** P0-02/P0-06/P0-08 and P1-09 delivery; operating policy/ownership.
- **Regression risk:** hidden existing cases, unauthorized status manipulation, mistaken delete of evidence or personal data over-retention.
- **Verify:** submit/read/respond/close/reopen, forbidden requester status/assignee edits, role-specific queues, delivery failures and moderation while content is cached. Confirm retention/export/deletion requirements before commercial launch.

### P1-12 — PWA/native capabilities require real platform contracts

- **Evidence/files (S/U):** vite.config PWA auto-update/cache config, capacitor.config, Android manifest/iOS plist, notification/deep-link/map services. WebView scaffold does not establish location permissions, app-link/payment return, Google auth popup or background push behavior.
- **Root cause:** shared assets/build treated as platform validation; web and native lifecycles differ.
- **Recommended fix:** ship a defined browser/mobile-web/PWA baseline first; explicitly configure/test native permissions, return URLs, plugins/handlers only for supported capabilities. Define SW update safety around active forms/payments and private caches.
- **Dependencies:** P0-04/P0-07/P1-09, provider redirect contract P0-05; actual Android/iOS devices and owner-supported platform list.
- **Regression risk:** update reload during booking, auth redirect failures, blank offline route, denied permissions, incompatible installed binary.
- **Verify:** browser/PWA/Capacitor matrix: cold start, deep link, auth return, payment return, offline restart, upgrade with draft, keyboard/back button, denied/granted location, notification open, account switch and OS backgrounding. Record actual device/OS/build IDs.

### P1-13 — establish an isolated release and query verification gate

- **Evidence/files (R/S):** root tsc has 17 diagnostics; root Vite build does not check types; main/admin Vitest setup mock paths and broad discovery; APK workflow lacks rules/integration gates; missing active-query composites in `firestore.indexes.json`; wrappers can hide failures.
- **Root cause:** completion measured by partial/mock tests and bundle generation, not deployed contracts or role/query integration.
- **Recommended fix:** isolated test projects/configurations, explicit no-production-network test default, fix mock resolution, separate main/admin/Functions/script checks; emulator rule/storage/domain tests and query manifest checks; deterministic fixtures, CI evidence and reviewed release/rollback. Add validated indexes for actual queries, not speculative indexes.
- **Dependencies:** foundation step can precede all fixes; query/rule fixtures evolve with P0/P1 contracts. Do not run privileged scripts as tests.
- **Regression risk:** broad tests begin failing honestly; migration tools rely on outdated SDK types; unnecessary indexes increase write cost.
- **Verify:** intentional network access fails in unit tests; all app suites are scoped, type checks have zero unexplained errors, emulator deny cases pass, every active ordered query succeeds on fixtures, release reports source SHA/config/artifact and rollback test. Do not equate this gate with physical-device or payment-provider approval.

## P2 — production robustness

### P2-01 — bounded reads, observability and typed failure semantics

- **Evidence/files (S):** unbounded comments/chat listeners; AppContext unordered limit30 booking listeners/merge retention; generic read/delete errors swallowed; admin sample metrics and multiple caches; several unused indexes/services.
- **Root cause:** no cross-domain read budget, consistent query result type or failure telemetry.
- **Recommended fix:** page older histories, bounded live windows and correct removal handling; typed loading/empty/error/stale states; redacted operation/query telemetry, listener counts and cost budgets; real operational metrics and reconciliation jobs. Audit indexes after active queries are measured.
- **Dependencies:** P1-04/P1-05/P1-08/P1-13; retention and privacy policy.
- **Regression risk:** missing older content, noisy monitoring, sensitive data in logs, accidental cache eviction.
- **Verify:** large synthetic fixtures, listener teardown/account transitions, injected offline/permission/index errors, capped query counts and measured latency; no false success from missing Firebase. Confirm telemetry contains no message/KYC/secret content.

### P2-02 — retire competing schemas and unused runtime code safely

- **Evidence/files (S):** duplicate onboarding/reviews/participants/audit collections, split chunk helpers, unused presence/reminder/location/offlineMessages/components, multiple lockfiles and server-oriented root dependencies; overlapping documentation histories.
- **Root cause:** successive AI iterations added alternatives without deprecation ownership or migration.
- **Recommended fix:** after canonical contracts are verified, mark compatibility adapters, remove unreachable imports/paths with tests, consolidate lockfile/build ownership and update authoritative docs. Archive superseded documentation with explicit links rather than silently rewriting history. Add schema version/migration ownership.
- **Dependencies:** relevant P0/P1 migrations, dependency/import inventory and owner-approved data migration.
- **Regression risk:** removing hidden script/native/admin consumers, losing historical data access or reproducible builds.
- **Verify:** import/reference graph and route inventory, clean reproducible installs, main/admin/native smoke tests, migration dry run and restore. Never delete collections merely because current UI does not reference them.

## P3 — future scope and polish

### P3-01 — defer unsupported product expansion and visual polish

- **Evidence/files (S):** referral/reward/escrow/partner claims exceed established data services; existing Home contains parallel extra sections and incomplete action presentation.
- **Root cause:** product aspiration and implemented capability are not separated in UI/docs.
- **Recommended fix:** maintain an explicitly unimplemented backlog; add referral/reward ledgers, richer discovery/personalization, partner analytics, native enhancements and visual polish only after core acceptance gates. Keep NPR throughout and do not reintroduce intentionally removed features without owner decision.
- **Dependencies:** P0/P1 completion for shipped core and clear owner product decisions.
- **Regression risk:** scope expansion delays safety/correctness, renewed mock data and unnecessary redesign.
- **Verify:** each future feature has a domain owner, authoritative data source, persistence/permission tests and truthful empty/unavailable state before launch. Visual QA remains separate from backend verification.

## Safest implementation sequence

This is a gated sequence, not authorization. P0 labels do not require a risky simultaneous rewrite.

1. **Freeze and establish evidence:** preserve current dirty work; agree a reviewed baseline, isolated emulator/staging project, source/artifact identification, backup/restore approach and no-production test guard (P1-13). Read-only deployed inventory needs separate access/owner agreement. Do not migrate or purge data.
2. **Contain active exposure:** P0-01/P0-02/P0-04 rules/storage design with deny tests; assess payment-secret exposure and gate unsupported paid/safety claims (P0-05/P0-08); private-cache isolation (P0-07). Approve and stage policy changes with legitimate-path tests before release. This takes precedence over making Home prettier.
3. **Repair broken existing navigation and identity:** dashboard P0-09; profile/UID/role/public-private contract P1-01; canonical KYC P1-02. These establish trustworthy companion records for Home. Agree legacy compatibility/migration before deleting paths.
4. **Complete Home as the immediate development slice:** P1-05/P1-06 plus social actions P1-07 and rule integrity P0-06. Keep current visual design; correct acquisition/cache/mutations, typed identity, fresh payloads, category/filter mapping, one reveal lifecycle, durable likes/comments/saves/media/share. Replace unsupported event/story actions with truthful behavior until their own contracts pass. Validate desktop/mobile/PWA with identical fixtures and measured reads.
5. **Complete transactional participation and commerce:** events P1-03; booking lifecycle P0-03; server payment P0-05. Enable paid use only after gateway sandbox, recovery/concurrency and reconciliation acceptance. Blaze confirmation, if needed, is a separate explicit prerequisite; existing Functions need P1-09 review first.
6. **Complete communication and operations:** chat P1-08, notifications/Functions P1-09, reviews P1-10, support/moderation P1-11 and accurate admin P1-04. Some admin authorization/reviewer work belongs earlier as dependencies; cosmetic dashboards do not.
7. **Qualify platforms and release:** P1-12 browser/PWA/device matrix, deployment parity, staged rollout and rollback. Do not label Capacitor ready from APK assembly alone.
8. **Measure and simplify:** P2 read budgets/telemetry and safe legacy retirement; then P3 expansion/polish.

### Home completion acceptance gate

- Same typed item sequence/composition for equivalent loaded data on desktop/mobile/PWA, without claiming identical layouts.
- Same-ID edits and moderation/deletion reconcile; no cross-type suppression or forbidden global mixing runs under agreed policy.
- One intended fetch per page/cursor; no hidden-tree load drain; correct retry, empty, offline and exhausted states.
- Create/like/unlike/comment/save/share/media behavior verified after reload and from another client; no successful-looking unpersisted state.
- Only approved, truthful public companion/status/engagement data displayed; no exposure of private KYC or nonpublic posts.
- No regressions in profile, booking, admin permissions or existing real interactions. Feature-specific failures are visible and actionable.

## Approval decisions needed before implementation

Confirm the initial tranche (recommended: isolated verification + P0 containment + dashboard repair, then Home slice), staging/backend access, supported platforms, canonical booking inventory/cancellation policy, KYC reviewer authority, and whether Stories need comments/expiry. Commercial payments and operational SOS require explicit provider/operating decisions. These are implementation dependencies, not reasons to silently broaden this audit.

**Audit stop:** only the four requested audit Markdown documents were created. No application code, rules, configuration, database data or deployment was changed. Await approval of the plan.
