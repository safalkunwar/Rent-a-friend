# AI Memory

Last Updated: 2026-09-04

> **Note:** The authoritative Firebase architecture and session log now live in `docs/sathi/` (see `05_FIREBASE_ARCHITECTURE.md`, `06_DATA_MODEL.md`, `09_SECURITY_PRIVACY.md`, `FIREBASE_DATA_ARCHITECTURE.md`, `SECURITY_MODEL.md`, and the session log at `docs/sathi/CHANGELOG.md`). This file remains as a high-level history.

## Business Vision

SATHI is a trusted Social Experiences Marketplace in Nepal. Mission: help people safely build genuine human connections through verified companions, communities, activities, and local experiences.

## Core Principles

- Trust and safety are highest priority
- Every feature should either work correctly or clearly indicate backend integration is pending
- No fake production logic, no hardcoded production data
- Never destroy existing work; preserve valid code
- Audit before coding; understand file purpose, dependencies, and business logic first
- Do not migrate stack without explicit approval (current: React + Vite + TypeScript + Tailwind CSS v4)

## Technology Stack (Actual)

- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS v4
- State: React Context (AppContext, ToastContext)
- Animation: motion (Framer Motion)
- Icons: lucide-react
- Routing: React Router DOM v7 (BrowserRouter)
- Backend: Firebase Auth, Firestore, Storage, Cloud Functions (implemented in `functions/src/index.ts`; deployment paused — Blaze plan not active)
- Repositories: BaseRepository, UserRepository, CompanionRepository, BookingRepository, SocialRepository, CompanionApplicationRepository (with automatic retry, caching, and error-handling)
- Auth: Firebase Auth (email/password, Google) with custom claims. `src/firebase.ts` and `admin/src/firebase.ts` both validate config; admin hard-checks `projectId === 'hamrosathi1'`.
- Database: Firestore with production RBAC rules, composite indexes, and 11-role admin permission system. `firestore.rules` requires `community_posts.likesCount`/`commentsCount` to be non-negative numbers; like-doc IDs `${uid}_${postId}` are idempotent-by-ID.
- Maps: Leaflet + OpenStreetMap Nominatim via `MapPreview` (replaces Google Maps Static).
- Offline: IndexedDB via `enableIndexedDbPersistence` + `offlineStorage` service.
- Payments: Khalti REST API + eSewa form redirect.
- Notifications: Web Notifications + FCM foreground listener.
- Testing: Vitest + React Testing Library + jsdom. **164/164 passing** (126 main-app + 38 admin).

## Coding Standards

- Use TypeScript strictly
- Follow existing dark theme with #C8A25E gold accent
- Components in `src/components/` with subdirectories for modals, messages, dashboard, ui, guards, maps, notifications
- Context providers wrap app in `App.tsx` via `AppProvider`, `ToastProvider`, `NotificationProvider`
- No inline SVG when lucide-react icon is available
- Consistent currency: NPR for Nepal market
- All new features must include loading, empty, and error states
- `src/firebase.ts` is the single source of truth for Firebase initialization
- Service layer in `src/services/` for external integrations
- Route guards in `src/components/guards/` for protected routes
- Hooks in `src/hooks/` for Firestore-backed data
- Tests in `src/__tests__/`

## Completed Work

- Phase 1 audit completed and documented in docs/
- Firebase service layer with Auth, Firestore, Maps, Payments, Notifications, Storage
- React Router with protected routes and loading screen
- Real-time messaging via Firestore with conversation sorting
- Admin custom claims enforcement
- Google Maps integration (now replaced by Leaflet+OSM in `MapPreview`; legacy `maps.ts` service retained)
- Activities and events as Firestore-backed collections
- Payment service with Khalti REST API and eSewa form redirect
- FCM notifications with foreground listener and permission request
- Offline storage service using IndexedDB with cache-first strategy
- Currency fix ($ → NPR throughout app)
- Duplicate BookingModal removal
- Types extended: Companion coordinates, User claims, Event/Activity models
- Testing framework setup: Vitest + React Testing Library + jsdom
- Initial smoke test for conversation ID helper
- CI/CD pipeline: GitHub Actions workflow with typecheck, test, build
- Accessibility improvements: aria-labels, dialog roles, form label associations
- Performance optimization: React.memo on ClientApp, lazy loading images
- Partner dashboard component with stats and offers
- Phase 3: Social Layer fully completed (Dynamic Community Feed, Stories, scalable Likes Transaction Engine, real-time Comments engine, and ProfileEditModal for editing companions and user details)
- Repositories design implemented (BaseRepository with retry logic, SocialRepository, UserRepository, CompanionRepository, BookingRepository, CompanionApplicationRepository)
- Production Firestore rules with RBAC helpers (`isSuperAdmin`, `isSafetyAdmin`, etc.); `booking_locks` admin-only writes; `community_posts` counter non-negative validation; `storage.rules` with path-based KYC protection
- 11-role admin RBAC + aggregation/health/rate-limiting/idempotency/audit services in standalone `/admin` app (38 tests)
- Companion application / KYC flow (2026-08-26): `CompanionApplicationRepository`, `bookingEligibility.ts`, `companionDashboard.ts`
- Home feed overhaul (2026-08-24): cursor-paginated one-shot `getDocs`, `useProgressiveReveal`, deterministic `feedGenerator.ts` (mulberry32 PRNG), `feedStabilizer.ts` (append-only)
- Comment pipeline rebuild (2026-08-25): shared `usePostComments` hook, `CommentsPanel`, `CommentComposer`, `ExpandableText`
- Community post deep links (2026-08-25): `/post/:postId` direct lookup, `src/services/deepLinks.ts`, `vercel.json` SPA rewrite
- Engagement integrity purge (2026-08-25): `scripts/purge-fake-engagement.mjs` removed 1,350 fake post-likes + 838 fake story-likes from `hamrosathi1`

## Current Priorities

1. **Booking creation as a single Firestore transaction with idempotency keys** (next recommended task from `docs/sathi/CHANGELOG.md`).
2. **Blaze plan upgrade** to deploy `functions/src/index.ts` (`onUserCreate`, `onUserDelete`, `setUserRole`, `onBookingCreate`, `onBookingUpdate`, `onMessageCreate`, `onReviewCreate`).
3. Expand test coverage in both main and admin apps; 164/164 currently passing.
4. Visual QA on physical devices (currently not in CI); multi-device live concurrency testing remains manual.

## Rejected Ideas

- Migrating to Next.js: not approved; current stack is Vite
- Migrating to Supabase: not approved; use Firebase per master prompt
- Migrating to Flutter: do not start until web platform is stable

## Known Limitations

- **Cloud Functions require Blaze plan upgrade for deployment.**
- FCM foreground listener works; push notifications require Cloud Functions/Messaging.
- Internationalization not implemented.
- **Counter delta-correctness** on `community_posts.likesCount` / `commentsCount` cannot be rule-enforced without Cloud Functions — these are maintained transactionally by repository code (documented honest limit).
- **Booking creation is not yet a single atomic transaction** (open task: idempotency-keyed transaction).
- **Visual QA on physical devices** is not part of CI; multi-device live concurrency QA is manual.

## File Map (Current)

- `src/firebase.ts` - Firebase init
- `src/services/auth.ts` - Auth service with claims
- `src/services/firestore.ts` - Firestore service
- `src/services/maps.ts` - Maps constants and types
- `src/services/payments.ts` - Khalti/eSewa payment integration
- `src/services/notifications.ts` - FCM + Web Notifications
- `src/services/storage.ts` - IndexedDB offline cache
- `src/repositories/*.ts` - Repositories (UserRepository, CompanionRepository, BookingRepository, SocialRepository, CompanionApplicationRepository, BaseRepository)
- `src/components/social/CommunityFeed.tsx`, `CommentsPanel.tsx`, `CommentComposer.tsx`, `ExpandableText.tsx` - Comment pipeline (2026-08-25)
- `src/hooks/usePostComments.ts` - Shared realtime comments hook (one listener per open post)
- `src/hooks/useProgressiveReveal.ts` - Home feed reveal coordinator (IntersectionObserver)
- `src/hooks/useDiscoveryFeed.ts` - Cursor-paginated Home feed hook
- `src/services/feedGenerator.ts` - Deterministic home feed composer (mulberry32 PRNG)
- `src/services/feedStabilizer.ts` - Append-only feed stabilizer
- `src/services/bookingEligibility.ts` - KYC/eligibility gate for booking
- `src/services/companionDashboard.ts` - Companion dashboard data
- `src/services/deepLinks.ts` - `/post/:postId` URL builder + native share
- `src/pages/PostPage.tsx` - Direct-lookup community post deep-link route
- `src/repositories/CompanionApplicationRepository.ts` - KYC repository
- `src/components/maps/MapPreview.tsx` - Leaflet+OSM interactive map preview
- `admin/` - Standalone admin app: 25 pages, 7 services, 11 RBAC roles, 38 tests
- `docs/sathi/CHANGELOG.md` - **Authoritative session log** (mandatory append on every code change)
