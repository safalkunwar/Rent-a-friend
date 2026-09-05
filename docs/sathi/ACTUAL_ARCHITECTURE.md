# SATHI — actual architecture

Snapshot: current working tree, 2026-09-05. This is a code-derived description, not a proposed redesign or deployed-state certificate. Evidence levels and feature verdicts are in [the audit](ASTRA_CODEBASE_AUDIT.md); issue IDs refer to [the gap register](PRODUCTION_GAP_ANALYSIS.md).

## Architecture verdict

The intended chain exists **in parts**, but is not enforced as a consistent dependency boundary:

```text
Firebase Auth
  -> auth.ts callback + AuthModal + AppContext profile bootstrap
  -> users/{uid}, token claims, localStorage profile (competing inputs)
  -> repositories AND domain services AND direct SDK/UI writes
  -> AppContext + collection-hook caches + component state + offline queues
  -> booking/social/KYC/feed logic distributed across those layers
  -> ClientApp desktop tree + mobile tree + standalone route pages
  -> browser / installed PWA / Capacitor WebView

Separate admin app -> its own Auth/RBAC/services -> same Firestore
Embedded main-app KYC route -> different guard/repository -> same Firestore
Paused Functions -> partially incompatible schemas/triggers
```

The UI is not simply a pure view of one canonical shared state. Authentication is real, repositories are real and several domain helpers are reusable, but equivalent mutations can take different paths with different authorization, retries and side effects.

## Entry points, routing and deployment

`src/main.tsx` boots the root React application. `src/App.tsx` defines route/guard boundaries and `src/ClientApp.tsx` implements the primary tab experience. Dedicated pages include the post deep link, payment return pages and embedded admin application review. `AuthGuard`/`AdminGuard` are presentation gates, not substitutes for backend rules.

The main Vercel configuration rewrites non-asset routes to the SPA entry. It does not itself build or mount the separate `admin/` application. `admin/vite.config.ts` does not establish a `/admin` base for a combined deployment. The `/admin/applications` route in the main app must not be confused with delivery of the standalone admin bundle. Verify actual deployment origins before changing routes.

Firebase Hosting also points at `dist` with an SPA rewrite. Having both hosting configurations does not establish which artifact/configuration is running on the supplied Vercel URL. `.firebaserc` targets `hamrosathi1`; runtime browser configuration can still come from fallback values rather than strict environment enforcement.

The Android CI builds the web bundle, synchronizes Capacitor and assembles Android artifacts. It does not prove that a particular installed binary contains the latest Vercel release. PWA service-worker updates and native asset synchronization are separate release lifecycles.

## Auth -> profile -> role

1. `services/auth.ts` wraps email registration/login, Google popup, password reset, anonymous auth and auth-state subscription.
2. Auth state invokes profile loading in `context/AppContext.tsx` through the user repository/Firestore wrapper. Missing profile can trigger default profile creation; a cached localStorage profile is another input.
3. `components/AuthModal.tsx` independently writes/sets profile after registration. The ordering relative to the auth callback is not a transaction or a single-flight bootstrap.
4. Role displayed in main state prefers profile fields and falls back to claims. Rules use a different combination of claims, user document and admin/companion-document existence. Standalone admin adds its own role resolution.
5. Paused `functions/src/index.ts:onUserCreate` would add another creator using overwrite semantics and Firestore timestamps, unlike much client code's ISO strings.

Consequences: stale role UI, overlapping profile writes, account-change race potential and incompatible timestamp assumptions. Anonymous token mapping can overwrite the synthetic anonymous flag. `logout` does not centrally tear down every persisted cache/queue. These are P1-01/P0-07, not evidence that Firebase Auth itself is mocked.

There is no established separate public-profile schema. Chat attempts to read other users' private `users/{uid}` records, which conflicts with owner/admin rules. Companion records are publicly readable and should contain only explicitly approved public fields, but the current rule schema does not enforce that boundary.

## Data access and shared state

| Layer | Actual responsibility | Boundary leak |
| --- | --- | --- |
| `firebase.ts` | App/SDK initialization and persistence | Fallback/caught failures can leave nullable services. |
| `services/firestore.ts` | Generic CRUD/query/subscribe/transaction helpers and error treatment | Missing services and some errors become empty/no-op results; callers may confuse failure with absence. |
| `repositories/base.ts` | Retry wrapper | Retries are not business idempotency; swallowed errors cannot be retried accurately. |
| Repositories | User, Companion, Booking, Social, Application operations | Parallel service/context mutation paths bypass the contract. |
| `AppContext` | Auth/profile, favorites, bookings, notifications and app actions | Optimistic state can outlive failed or partially committed workflows. |
| `useFirestoreData` | Public discovery fetch/cache/page state | Collection-only cache key and no global mutation invalidation. |
| `useDiscoveryFeed` | Seeded composition and stabilization | ID-only memo key and retained old payloads. |
| Component state | Likes, saves, modal/session status, compose/comment state | Same entity can have multiple conflicting counters/flags. |
| Offline utilities | Generic queue, collection/item caches, messaging/pending booking helpers | No unified account ownership, replay or confirmation contract. |

SDK snapshots commonly map `{ id: snapshot.id, ...snapshot.data() }`; a stored `id` can override the actual document key. This is a schema and identity hazard, especially for cursors and synthetic/migrated data.

## Home: exact acquisition and composition path

### Initial sources

`src/ClientApp.tsx` instantiates these hooks unconditionally while its shell is mounted, not just while Home is the selected tab:

| Source | First page | Primary path | Included in shared composer? |
| --- | ---: | --- | --- |
| Companions | 15 | `useCompanions` -> `useFirestoreData` -> `/companions` | Yes |
| Stories | 10 | `useStories` -> `/stories` | Yes; also Stories row/viewer |
| Activities | 10 | `useActivities` -> `/activities` | Yes; also extra mobile section |
| Events | 10 | `useEvents` -> `/events` | Yes; also additional presentation |
| Partners | 10 | `usePartners` -> `/partners` | No |
| Community posts | 10 | `useCommunityPosts` -> `/community_posts`, published filter | Yes |

This is **six initial one-shot queries with a nominal 65-document page budget**, not five. The five composition sources total a nominal 55 documents. These are page limits, not a measurement of billable reads: caches, empty queries, remounts, pagination and ancillary per-card reads affect actual cost.

`useFirestoreData.ts` uses document-ID ordering/cursors, not relevance or chronological newest-first pagination. It fast-paints a cached collection, fetches a head page, and merges into retained data. This can retain a document no longer in the current result because it was deleted, moderated, changed query membership or merely fell outside the first page. No TTL/tombstone/reconciliation policy distinguishes those cases. Module caches are not a reactive normalized store shared by all instances. Query parameters are not fully represented in cache identity.

Load-more fetches additional pages; visual reveal is a separate operation. A failed initial load is not exposed as a useful distinct error state, and the current cache-dependent load-more path is not a robust retry mechanism. Creating/editing/deleting a post does not systematically invalidate the Home source cache. CommunityFeed's separate first-page reader does not provide a complete infinite-paging experience.

### Shared composition

The main call is conceptually:

```text
fetchedCompanions + activities + events + fetchedStories + posts
  -> useDiscoveryFeed
  -> generateDiscoveryFeed (feedGenerator.ts)
  -> stabilizeFeed (feedStabilizer.ts)
  -> chunkFeedByHeader / useProgressiveReveal
  -> desktop DiscoveryFeed AND mobile renderer
```

`filteredCompanions`, used by search/filter presentation elsewhere, is not the companion array passed into this Home composition call. A filter control can therefore imply a scope that the mixed Home feed does not obey.

The generator builds interest/category buckets, prioritizes/interleaves available content, applies per-type caps and emits headers/items. Approved companions produced by the application repository use `categories`, while this categorization reads `interests`. Missing mapping affects discovery placement.

The hook holds a seed for its mount, uses a mutable PRNG stream and caches based principally on IDs plus personalization inputs. A same-ID edit may not even cause regeneration. When regeneration happens, `stabilizeFeed` preserves old item objects for retained keys. Stable position has been conflated with stale payload. Generator de-duplication uses raw IDs across types, whereas the stabilizer has type-qualified keys. Local weaving/caps do not enforce the final global run-length promise. These are locally reproduced defects, not conjectures about real data.

Viewed/saved/joined signals represented in options do not establish a implemented production personalization loop through the hook. Location/interests are not proof of distance-aware, eligibility-aware or personalized ranking against all available records; ranking is bounded by pages already fetched.

### Desktop, mobile and PWA comparison

| Concern | Desktop | Mobile web | Installed PWA |
| --- | --- | --- | --- |
| Fetch hooks | Shared ClientApp hooks | Same instances | Same application code |
| Composition array | Shared hook output | Same output | Same output for equivalent loaded data/session |
| Mount strategy | `hidden lg:flex` branch | `lg:hidden` branch | CSS viewport picks visible branch; both still mounted |
| Companion renderer | Custom grouped/inline desktop cards | Compact CompanionCard presentation | Corresponding viewport renderer |
| Post/story cards | Shared wrappers, desktop media callback | Shared wrappers without equivalent media callback | Inherits branch behavior |
| Extra content | Desktop supplemental/sidebar content | Additional activity/event sections | Inherits viewport differences |
| Reveal/load-more | Shared ref/state passed to desktop | Same sentinel ref also attached here | Same risk plus SW/cache version |
| Persistence | SDK/cache/component state | Same mechanisms | Additional service-worker/offline lifetime |

CSS hiding does not unmount React components. Consequently hidden social cards can still run effects/check-like reads and retain independent optimistic state. One ref attached to two sentinels resolves to a single DOM node, generally the last mounted one, not necessarily the visible one. `useProgressiveReveal` manually checks its bounding rectangle and its observer effect does not follow every responsive target change. A hidden zero-rectangle sentinel can satisfy the manual near-viewport condition and advance/load pages. **Static high-confidence risk; actual scroll/network behavior needs instrumented responsive testing.** Do not present it as a fresh browser reproduction.

Thus the accurate answer is: **one shared data/composition path, multiple mounted UI/interaction paths, and no verified cross-viewport lifecycle equivalence**.

### Likes, comments and Stories on Home

- `FeedPostCard` uses SocialRepository for like state/transactions and `CommentsPanel`/`usePostComments` for comments. Per-card state and SocialPostCard state both participate; an optimistic change can be reset from stale wrapper props or falsely shown to a guest.
- `usePostComments(postId)` opens a real-time comments query only when a panel is mounted/open. It is not a global one-listener-per-post registry; separately opened copies may each listen. It loads the whole matching thread in ascending creation order.
- Story likes use `/story_likes` and `/stories`; full-screen viewer state is separate. Story comment UI calls the post comment method with a story ID, which addresses `/community_posts/{storyId}`. This can create orphan comments and does not establish persistent story comment counts or a thread.
- Story sharing reuses a post URL even though PostPage resolves `/community_posts`. Owner delete controls conflict with rules. No complete expiration/retention contract is implemented.
- Bookmarks/saves in social cards are local state/toasts, not a durable shared saved-content model. Companion favorites are a separate profile-array path.

## Commercial workflows

### Companion approval

New route: CompanionApplicationModal/Card -> CompanionApplicationRepository -> `/companion_applications` -> embedded AdminApplicationsPage -> application update -> user companionStatus -> public companion -> audit.

These approval writes are sequential. A failure can leave only some of them committed; a repeat can reset rating fields; rejection after previous approval does not reliably revoke the public companion. Role/claim and permission vocabularies differ. Legacy AuthModal guide registration targets `/guideApplications` but omits the userId required by its rule. The standalone admin still operates the legacy guide route. Storage path mismatch blocks the intended document-upload contract.

### Booking/payment

BookingFlowModal computes duration/participants/price in the browser, then AppContext adds an optimistic booking. BookingRepository transacts a day-level lock and booking document. Afterwards context creates a conversation and self notification. A failure in those later writes can remove an already-persisted booking from local state. Offline bookings are cached under one pendingBookings key, without a discovered replay consumer.

Status changes then diverge: context updates the booking alone; repository tries a booking+lock transaction; booking service writes booking then lock. Non-admin lock mutation is denied by current rules. Date-only locks have no time interval or expiry and can outlive failed payment/cancellation.

Payment initiation follows booking creation. Client gateway requests reference VITE secret variables; verification pages depend on `verifyPayment`, which throws unconditionally. No server webhook/settlement/refund/escrow path was found. UI confirmation can still follow a payment initiation failure. This is not a working paid-booking pipeline.

### Messaging/notifications

MessagesTab listens to conversations and selected top-level messages. It attempts peer user reads that rules deny, falling back to invented identities in some cases. Message writes and conversation metadata are coupled, but unread/receipt/typing/presence behavior is not consistently integrated. Queries are not a bounded history model. Conversation authorization is critically undermined by unrestricted authenticated writes to the parent.

Own notifications are subscribed in application state. The browser notification provider handles permission/token/foreground behavior but does not supply a complete background SW/server delivery contract. Paused Functions watch nested messages instead of the active top-level collection and create some timestamp/recipient shapes inconsistent with clients. Notifications are a partially connected subsystem, not guaranteed delivery.

## Platforms and offline boundary

PWA configuration includes broad FirebaseStorage caching and Firestore HTTP runtime caching. Those policies are not equivalent to an account-scoped SDK data cache and do not clear private state on logout. An installed experience can retain media/profile/queue state after account changes. Booking operations need an explicit online-required or durable pending-intent contract; a success toast must not stand for an unreplayed local item.

Capacitor ships the same assets but requires its own device validation. Android permission/app-link and iOS usage-string/return-path scaffolding do not substantiate native geolocation, background notifications, payment returns or deep links. Keep the web/PWA baseline separate from native readiness claims.

## Safest architectural direction, pending approval

Do not begin with a wholesale rewrite. Establish authoritative domain contracts and denial tests, then make existing entry points conform: one identity/bootstrap path; one KYC lifecycle; one booking transition contract; one normalized Home entity/query layer; one interaction controller per social entity; explicit account-scoped cache ownership; and server-authoritative money/privileged transitions. Preserve layouts unless their integration/lifecycle behavior is the bug. The detailed order and verification gates are in the gap analysis.
