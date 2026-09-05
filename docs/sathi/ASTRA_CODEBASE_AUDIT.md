# SATHI — forensic codebase audit

Audit date: 2026-09-05. Scope: the current working tree, not an assumed clean commit or a verified deployed release. Audit only; no application, rule, configuration, seed, or deployment changes were authorized or made.

## Executive conclusion

SATHI is a substantial Firebase-backed React application, not merely a static demo. However, it is **not ready to operate as a trustworthy commercial companion platform**. Real SDK calls, repositories, transactions and subscriptions coexist with authorization holes, incompatible schemas, disconnected services, misleading success states and fabricated operational UI. A successful Vite build or a mocked unit suite cannot establish commercial readiness.

The most urgent findings are unrestricted authenticated conversation writes, ineffective least-privilege administration, self-published companion verification data, client-controlled booking/payment authority, and unsafe/misaligned media storage. Booking creation already uses a transaction; its lifecycle, authorization and failure recovery are the problems. Payment verification is explicitly not implemented.

Home genuinely has a shared composition function. Desktop and mobile do not have wholly separate ranking engines. They do, however, mount different presentation trees simultaneously and retain different interactions and extra sections. Shared composition contains reproducible freshness, identity and mixing defects. PWA is the same web application plus another cache/update layer, not an independently verified mobile implementation.

Read alongside:

- [Actual architecture](ACTUAL_ARCHITECTURE.md): runtime paths and Home trace.
- [Firebase current state](FIREBASE_CURRENT_STATE.md): collection, rules, query and storage contracts.
- [Production gap analysis](PRODUCTION_GAP_ANALYSIS.md): issue register, fixes, dependencies, regression risks and acceptance tests.

## Evidence standard and limitations

Labels used throughout this audit:

- **S — static evidence:** directly traced source/configuration. Establishes what the checked-in implementation permits or attempts, not that deployed rules match it.
- **R — reproduced locally:** isolated, non-production execution during this audit.
- **H — historical report:** prior changelog/test/deployment statement; not independently accepted as current production truth.
- **U — unverified:** requires emulator, staging, authenticated live read-only inspection, provider access or physical-device verification.

The repository structure, application/service/repository entry points, main and admin package/configuration files, rules, indexes, Functions source, platform scaffolds, documentation and memory/changelog corpus were inventoried and cross-checked. Documentation was used as a claim inventory, not as proof. Large documentation output was sometimes truncated; this report does not assert every historical prose line was independently validated. Generated dependencies/build outputs are not treated as first-party feature implementations.

The tree was already dirty: application, rules, indexes and many documentation files had existing edits, and several KYC files were untracked. These are included in the snapshot being audited but are not changes made by this audit. Line positions can therefore move; file plus symbol is the primary evidence locator.

No exploit was attempted against real users. No production database census, private records, payment credentials or Storage objects were downloaded. No seed, purge, migration, booking, payment, notification or deployment command was executed. The public URL supplied by the user is `https://hamrosathi.vercel.app/`; an attempted web inspection was blocked by the browsing tool, so this audit makes no new claim about its rendered release. Earlier screenshots/deployment statements are historical evidence only. Deployed rules, indexes, environment variables and asset/commit correspondence remain U.

### Fresh verification

Two isolated feed test files were run: `src/__tests__/feed-generator.test.ts` and `src/__tests__/home-feed-performance.test.ts`. **33 tests passed.** This verifies only their exercised local cases.

Additional in-memory probes transpiled the actual feed modules without changing files or touching Firebase:

| Probe | Actual result | Meaning |
| --- | --- | --- |
| Stabilize a retained post ID whose content changes from `OLD` to `EDITED` | Returned content remains `OLD` | Existing feed objects retain stale payloads. |
| Generate a companion and a community post with the same document ID | Only `companion:same` survives | Generator identity is not namespaced by collection/type. |
| Generate 90 companions across three interests and 30 Travel posts, seed `mulberry32(1)`, maxItems 120, category limit 16, items/category 24 | Maximum consecutive companion run is **8**, excluding headers | Local interleaving does not guarantee a global mixed-feed invariant. |

Relevant modules: `src/services/feedGenerator.ts`, `src/services/feedStabilizer.ts`; hook-level freshness additionally depends on `src/hooks/useDiscoveryFeed.ts`. Passing existing tests did not detect these cases. Add these fixtures as regression tests only after implementation is approved.

The reported **164 passing tests** is a historical project figure, not a fresh full-suite result from this audit. Test setup files use suspicious relative Firebase mock targets (`../src/firebase` from the respective `__tests__` directories); do not run the broad suite assuming all Firebase access is isolated. A fresh read-only root TypeScript check **failed with 17 diagnostics**: eight in migration/admin scripts and nine in DashboardTab, including unresolved runtime identifiers. See P0-09/P1-13. Type checking and builds are not persistence or authorization tests.

## Repository reconstruction

| Area | What actually exists | Important consequence |
| --- | --- | --- |
| Root app | React 19, Vite 6, TypeScript, Tailwind 4, React Router, Firebase Web SDK | Browser owns much domain state and writes directly to Firestore. |
| `src/ClientApp.tsx` | Large tab shell, discovery hooks, desktop/mobile Home layouts and modals | Many domain concerns still meet in one component. |
| `src/context/AppContext.tsx` | Auth/profile, favorites, bookings, notifications, optimistic state | Not a single authoritative entity/query store. |
| `src/repositories/` | User, Companion, Booking, Social, CompanionApplication repositories | Useful abstraction, bypassed by services and UI in several paths. |
| `src/services/` | SDK wrapper and domain services, multiple offline/cache utilities | Some active, some unused, some incompatible with rules. |
| `admin/` | Separate React/Vite app, own Firebase/auth/RBAC/services/pages/tests | Main app still embeds `/admin/applications`; operational boundary is incomplete. |
| `functions/` | Auth, booking, message, review triggers and role callable | Paused deployment; source is not safe to deploy unchanged. |
| `android/`, `ios/` | Capacitor native wrappers around built web assets | Not evidence of tested native location, push or app links. |
| `public/`, Vite PWA config | Manifest/assets, service-worker generation, runtime caches | Installability and offline caching do not guarantee safe offline mutations. |
| `scripts/`, `src/scripts/seed.ts`, `src/data/seedData.ts` | Administration/migration/seed utilities | Privileged and synthetic-data paths must be separated from production operation. |
| `docs/`, `docs/firebase/`, `docs/sathi/` | Overlapping architecture histories, plans and completion claims | There is no reliably current single truth without code reconciliation. |

`package.json` builds through Vite without a TypeScript gate. Multiple lockfiles exist. Root type checking includes scripts but excludes admin/functions/native outputs. Main/admin Vitest configurations do not fully isolate test discovery. CI visible in `.github/workflows/build-apk.yml` packages Android artifacts without a production release gate covering type, rule, integration and device tests. Root dependencies also include server-oriented packages that do not themselves provide a running backend.

## Feature classification

“WORKING” below is deliberately narrow: an implemented path or locally exercised helper, not an end-to-end production certification. Multiple labels are appropriate for one domain.

| Feature | Classification | Evidence and limitation | Issues |
| --- | --- | --- | --- |
| Email/Google/anonymous authentication | PARTIALLY WORKING | Real Firebase Auth methods in `services/auth.ts`; profile creation races, anonymous-claim overwrite and native popup behavior remain problematic/unverified. | P1-01, P1-12 |
| User/profile | PARTIALLY WORKING; SECURITY RISK | AuthModal and AppContext both create/set profile; cached profile role can drive stale UI; account-switch isolation incomplete. | P1-01, P0-07 |
| Public companion discovery | PARTIALLY WORKING; SECURITY RISK | Real bounded companion reads; ordinary users can publish their own companion/verification-shaped fields. | P0-02, P1-05 |
| Companion application/KYC | PARTIALLY WORKING; DUPLICATED; BROKEN | New application workflow coexists with legacy guide signup; upload/rules, reviewer permission and activation contracts disagree. | P0-04, P1-02 |
| Home acquisition | PARTIALLY WORKING; PERFORMANCE RISK | Six paged one-shot sources, cache and load-more implemented; hidden sentinel/cache isolation/failure state defects. | P1-05, P1-06 |
| Home composition | WORKING for tested cases; PARTIALLY WORKING overall | Shared generator/hook; three R defects above. | P1-05 |
| Community text posts | PARTIALLY WORKING | Real create/read and direct post route; stale feed after mutations, public nonpublished documents and denied owner deletion. | P0-06, P1-07 |
| Post likes | PARTIALLY WORKING; SECURITY RISK | Honest-client transactional idempotency exists; rules allow forged counters/duplicate arbitrary like IDs, wrappers have local-state drift. | P0-06, P1-07 |
| Post comments | PARTIALLY WORKING; PERFORMANCE RISK | Shared hook/composer and optimistic UI; unbounded listener, incomplete target/delete integrity. | P0-06, P1-07, P2-01 |
| Stories | PARTIALLY WORKING; BROKEN | Real story/like records, but media upload, story comments, owner delete, sharing and expiry incomplete or wrong. | P0-04, P0-06, P1-07 |
| Post deep links | PARTIALLY WORKING | `/post/:postId` direct lookup and SPA rewrite exist; story shares target wrong collection; guest auth event path incomplete. | P1-07 |
| Saved content/favorites | PARTIALLY WORKING; MOCK/FAKE in some cards | Companion favorites have a profile write path; social “Saved!” is local state only. Nested favorites rules allow cross-user writes. | P0-01, P1-07 |
| Events | PARTIALLY WORKING display; BROKEN join | Catalog reads real; `eventParticipants.ts` passes a Query to Web SDK transaction `get`, which expects a document reference. Capacity contract also unenforced. | P1-03 |
| Activities | PARTIALLY WORKING; NOT IMPLEMENTED end-to-end purchase/join | Catalog renders; active Home cards do not establish a complete activity lifecycle. | P1-03 |
| Booking creation | PARTIALLY WORKING | Booking plus date lock is already transactional; no durable idempotency, authoritative quote or safe post-commit recovery. | P0-03 |
| Booking changes/cancellation | BROKEN in relevant paths | Repository tries to mutate admin-only locks; context bypasses lock maintenance; service can partially commit. | P0-03 |
| Account dashboard | BROKEN in current source | Fresh typecheck reports unresolved useMemo/myBookings/totalSpent/favoriteCompanions in executable render logic. | P0-09 |
| Khalti/eSewa payments | BROKEN; NOT IMPLEMENTED verification; SECURITY RISK | Secrets referenced as VITE variables; `verifyPayment` always throws; no authoritative webhook/ledger pipeline. | P0-05 |
| Messaging | PARTIALLY WORKING; SECURITY RISK; PERFORMANCE RISK | Real top-level messages and conversation listeners; parent overwrite exposure, denied peer profiles, receipts/unread/typing gaps. | P0-01, P1-08 |
| Notifications | PARTIALLY WORKING; NOT IMPLEMENTED complete push | Own in-app collection subscription exists; background push/service-worker/server dispatch contract absent. | P1-09 |
| Ratings/reviews | DUPLICATED; PARTIALLY WORKING; DEAD/UNUSED service path | Embedded companion review service versus `/reviews` trigger schema; consumer write conflicts with rules and service is not wired to normal UI. | P1-10 |
| SOS/safety | PARTIALLY WORKING record creation; MOCK/FAKE operational claims | One-shot geolocation/SOS record is not live tracking, contact delivery or staffed response. | P0-08 |
| Reports/support/feedback | PARTIALLY WORKING | Real submit/admin service paths; ownership/update/read policies and response delivery not complete. | P1-11 |
| Partner dashboard | MOCK/FAKE | `PartnerDashboard.tsx` renders fixed views, bookings, revenue, rating and offers. | P0-08 |
| Referral/rewards/escrow | NOT IMPLEMENTED as commercial systems | No authoritative reward ledger/referral settlement/escrow implementation established; marketing is not proof. | P0-08, P3-01 |
| Standalone admin | PARTIALLY WORKING; SECURITY RISK | Real pages and SDK writes; RBAC rules, pagination, audit and metrics do not match production claims. | P0-02, P1-04 |
| PWA | PARTIALLY WORKING; SECURITY RISK | Same bundle with SW/cache; private-media cache lifetime and account teardown unresolved. | P0-07, P1-12 |
| Capacitor | PARTIALLY WORKING scaffold; NOT VERIFIED on devices | Native wrappers exist; only INTERNET Android permission observed, no complete location/push/deep-link integration. | P1-12 |
| Cloud Functions | NOT ACTIVE per project constraint; PARTIALLY WORKING source | Wrong message trigger path, destructive profile initialization risk, replay/claims problems. | P1-09 |

## Duplicate and obsolete implementation inventory

1. **Profile/bootstrap authority:** AuthModal, AppContext, UserRepository, and paused `onUserCreate` all touch user creation. They have different merge, field, timestamp and role semantics.
2. **Companion onboarding:** `AuthModal` guide registration + `guideApplications`; `AppContext.becomeCompanion` + CompanionRepository; new `CompanionApplicationRepository` + embedded admin page. These are not equivalent routes to one state machine.
3. **Bookings:** repository transaction, context status writer and `services/bookings.ts` implement different lock behavior.
4. **Social rendering/state:** CommunityFeed, FeedSocialCards/SocialPostCard, full-screen story viewer and PostPage share some helpers but retain independent likes/saves/media/auth behavior.
5. **Caches/queues:** Firebase persistence, collection session cache, localStorage collection/profile caches, generic offline queue, pendingBookings cache and offlineMessages utility. There is no single ownership/replay/invalidation policy.
6. **Admin:** root `services/admin.ts`/guard versus standalone admin services/context/RBAC. Separate `auditLogs` and `admin_audit_logs`; old guide moderation versus new KYC page.
7. **Events:** `events/{id}/participants` rules versus active flat `event_participants` service.
8. **Reviews:** public `/reviews` and Functions aggregation versus embedded companion reviews in the review service.
9. **Messages:** active top-level `/messages` versus paused nested Functions trigger. Typing helper and presence are not integrated into the active chat experience.
10. **Feed utility duplication:** `chunkFeedByHeader` and `splitIntoChunks` duplicate splitting logic. This is lower priority than freshness/identity defects.

Source/import tracing found no normal runtime consumers for several legacy utilities/components, including `src/data.ts`, Navbar, FirebaseDiagnostics, and service paths for presence, booking location tracking, reminders and offlineMessages. Seed data is consumed by the seed script, not established as Home's automatic fallback. Search/rate-limit/feature-flag/review helpers require consumer verification before any deletion; exported or tested code is not necessarily shipped behavior. Classify these as unused by the traced runtime, not as safe-to-delete without a final import/build check.

Synthetic source still exists in `src/scripts/seed.ts`/`src/data/seedData.ts`, including catalog/persona/review/booking material. Historical fake-like purges do not prove every live record is genuine. Conversely, synthetic source on disk does not prove all live companion records are fake. A provenance inventory is required before displaying verified/rating/availability claims commercially.

## Documentation conflicts that must not guide implementation blindly

| Existing claim | Actual source finding |
| --- | --- |
| Strict main Firebase environment validation | `src/firebase.ts` has fallback configuration, caught initialization failures and nullable exports. |
| Admin is entirely separate | Main app still routes `/admin/applications`; standalone admin handles legacy guide data. |
| Booking creation still needs its first transaction | `BookingRepository.createBooking` already transacts lock and booking. Lifecycle is inconsistent. |
| Home has five initial queries / 65 documents | Six hooks: 15 companions plus five ten-item sources, including partners; only five sources enter the composer. |
| One shared Home means identical behavior | Composer shared, responsive subtrees/actions/extra sections and lifecycle not identical. |
| KYC approval grants companion role | Approval writes companionStatus and companion document but not a consistent role/claim transition. |
| Engagement fully production-safe | Client transactions help; rules still permit forged/duplicate interaction data and counters. |
| Correct counters necessarily require Blaze | Some atomic relationships can be constrained by rules and a redesigned write contract; Functions are not a blanket prerequisite for all integrity fixes. |
| Native/mobile ready because shared bundle/build passes | Device permissions, auth return paths, push, backgrounding and deep links need actual device verification. |
| Admin health/counts reliable | Reads can become empty success; count sampling uses limit 1; storage health is initialization, not operational validation. |

## Readiness decision

Do not expand paid usage or make safety/verification/escrow promises based on the current implementation. The safest next work is the staged plan in `PRODUCTION_GAP_ANALYSIS.md`, beginning with an isolated verification environment and authorization containment, then identity/media contracts, then Home correctness, followed by transactional commercial workflows. This is a recommendation, not permission to change the system. **Stop here for owner approval.**
