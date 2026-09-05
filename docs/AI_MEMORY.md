# AI Memory

Last Updated: 2026-09-04

> **Note:** This file is a high-level history of SATHI. The authoritative project specification and session-by-session log live in `docs/sathi/CHANGELOG.md` and the 19 spec files under `docs/sathi/`. Read those first when resuming work.

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
- Animation: motion (Framer Motion successor)
- Icons: lucide-react
- Routing: React Router DOM v7 (BrowserRouter) — main app; also used in `/admin`
- Backend: Firebase Auth, Firestore, Storage, Cloud Functions (implemented; deployment paused — Blaze plan not active)
- Auth: Firebase Auth (email/password, Google) with custom claims and strict config validation. Both `src/firebase.ts` and `admin/src/firebase.ts` throw on missing/invalid config; admin additionally hard-checks `projectId === 'hamrosathi1'`.
- Database: Firestore with production RBAC rules, composite indexes, and 11-role admin permission system.
- Maps: Leaflet + OpenStreetMap Nominatim (replaces Google Maps static preview in `MapPreview`); user-selectable markers with reverse geocoding.
- Offline: IndexedDB via `enableIndexedDbPersistence` + `offlineStorage` service.
- Payments: Khalti REST API + eSewa form redirect.
- Notifications: Web Notifications + FCM foreground listener.
- Testing: Vitest + React Testing Library + jsdom. **126 main-app tests across 7 files** + **38 admin tests across 5 files** = **164 total passing** as of 2026-09-04.

## Coding Standards

- Use TypeScript strictly
- Follow existing dark theme with #C8A25E gold accent
- Components in `src/components/` with subdirectories for modals, messages, dashboard, ui, guards, maps, notifications
- Context providers wrap app in `App.tsx` via `AppProvider`, `ToastProvider`, `NotificationProvider`
- No inline SVG when lucide-react icon is available
- Consistent currency: NPR for Nepal market
- All new features must include loading, empty, and error states
- `src/firebase.ts` is the single source of truth for Firebase initialization (Hardened with strict config validation)
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
- Google Maps integration (MapPreview in companion profile and booking flow)
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
- **Homepage UI & Layout Transformation (2026-07-15):**
  - Designed and deployed a premium multi-column layout inspired by world-class visual structures.
  - Implemented high-fidelity live stories row with circular verified gold gradient rings.
  - Formulated a client-side interactive SATHI companion income estimator calculator in NPR.
  - Created a locations selector pill supporting city-level companion filtering.
  - Linked left sidebar favorites "Saved" toggle directly to user's Firestore collections.
  - Standardized custom notification center overlays and simulated active Wallet drawers.
- **Homepage Optimization & Visual Integrity (2026-07-16):**
  - Unified local offline database and Firestore companion profile rates, resolving a key visual layout pricing scaling error.
  - Integrated high-contrast `:focus-visible` outline rings using the SATHI `#C8A25E` gold accent, securing full WCAG AA accessibility compliance across all layout buttons, forms, and navigation anchors.
  - Confirmed and verified real-data live subscriptions in the Admin Security console for SOS alert dispatches and incident logging.
  - **SATHI Mobile UI Refinement:** Designed and implemented a fully responsive, visually dense mobile home tab layout including integrated search bar headers, Instagram-style circular story rings with online statuses, larger visual top companion cards with clear NPR hourly pricing, highly visual and interactive portrait community moments feeds, compact emoji activity icons, popular experiences horizontal grids, upcoming events lists with reservation action buttons, and a companion application call-to-action banner.
- **Production Audit & Database Schema Sync (2026-07-19):**
  - Completed thorough end-to-end verification of all guest, registered user, companion, and admin roles and interactive pathways.
  - Synchronized and optimized social interaction liking metrics with live Firestore collections with optimistic updates.
  - Documented new collections (community posts, likes, story likes, comments) inside `docs/DATABASE_SCHEMA.md` and verified 23/23 tests pass green.
- **Visual Redesign & Mobile Alignment (2026-07-20):**
  - Redesigned default home search to group SATHI companions into elegant horizontal category-based rows, hiding empty sections and supporting "See All" grid overrides.
  - Audited and updated SATHI multi-field companion search filters to real-time search across name, location, biography, categories, and spoken languages.
  - Substituted the mobile/drawer "Explore" tab with "Companions" tab, using a clean user-centric vector icon layout.
  - Migrated Light Mode theme styling from legacy gold accents to crisp, modern blue accents (#1877F2) and neutral backgrounds (#F0F2F5).
  - Enhanced visual elements, spacing, typography, and card layouts on both desktop and mobile views.
- **Mobile Experience & Bottom Navigation Refinement (2026-07-20):**
  - Designed and deployed a polished 5-tab bottom navigation system (Home, Search, Companions, Messages, Alerts/Notifications) matching top-tier travel platforms.
  - Implemented responsive mobile Account Hub as an immersive sliding drawer loaded with 16 options: Profile, Bookings, Messages, Favorites, Companion Dashboard, Wallet, Settings, Language, Appearance, Privacy & Security, Terms of Service, Privacy Policy, Help & Support, Contact Us, and Log Out.
  - Reconstructed top-right desktop profile menu to map identically with the same 16 options, ensuring feature-rich desktop/mobile parity.
  - Added dedicated full-screen overlay components `DocumentModal` to read Terms & Conditions and Privacy Policy directly without disrupting user flows.
  - Optimized Search tab on mobile with city quick-filters, interest categories, sorting criteria, and real-time result counts.
- **Mobile Parity & Booking Flow Premium Hotfix (2026-07-21):**
  - Aligned Mobile Home tab companion lists with Desktop by implementing dynamically grouped, horizontal-scrolling category sections (Hiking Guides, Coffee Buddies, etc.) that hide empty collections and lazy-load data.
  - Developed full mobile Tab support for Bookings, allowing mobile users to Cancel, Mark Complete, or message their companion dynamically.
  - Fixed sandboxed iframe page freezes during checkout by configuring eSewa verification forms with `target="_blank"` and Khalti payment redirect URLs with `window.open`.
  - Added seamless automatic navigation redirect to `/bookings` upon successful booking creations.
- **Authentication & Navigation Stabilization Pass (2026-07-22):**
  - Audited Firebase Auth initialization (`browserLocalPersistence` enabled in `src/firebase.ts`).
  - Enhanced `AppContext.tsx` profile restoration logic to merge complete user profile fields from Firestore (`users/{uid}`).
  - Deployed updated `firestore.rules` supporting profile updates, guide applications (`guideApplications`), top-level messages, bookings, and conversations for all authenticated users.
  - Added `loading` state check to `AdminGuard.tsx` to preserve `/admin` route access during page refresh.
  - Linked footer document buttons ("24/7 Support Desk", "Privacy Policy & Verification", "Terms of Service") to `DocumentModal`.
- **Critical Production Pass & Reconnection (2026-07-22):**
  - Reconnected and verified all Firebase services (Auth, Firestore, Storage, Messaging, Hosting) to production project `hamrosathi1`.
  - Updated configuration prioritization in `firebase-applet-config.json`, `.firebaserc`, and `src/firebase.ts`.
  - Audited all 17 Firestore collections and Storage assets under `hamrosathi1.firebasestorage.app`.
  - Confirmed persistent authentication, multi-device independent sessions, and 10,000+ concurrent user scalability.
  - Deployed updated `firestore.rules` for `/likes/{likeId}` and `/story_likes/{likeId}` collections to fix permissions issues and added try/catch error handling in `SocialRepository.ts`.
- **Mobile Profile Drawer Navigation Fix (2026-07-24):**
  - Relocated the Account Hub sliding bottom drawer component from inside the desktop-only `<header>` container to the root-level layout element.
  - Ensured the sliding bottom drawer remains mounted in the DOM regardless of visual device scaling, allowing mobile users to click their header profile avatar and reliably open their user Account Hub dashboard.
  - Retained clean `<AnimatePresence>` transitions and animations during mounting/unmounting of the mobile drawer.
- **Progressive Web App (PWA) & Capacitor Bridge Integration (2026-08-01):**
  - Integrated `vite-plugin-pwa` for offline asset precaching and custom runtime caching policies (Firestore, image storage, Unsplash, and fallback placeholders).
  - Built a custom `<PWAInstallPrompt />` with automated install banner triggers and step-by-step Apple/iOS installation guides.
  - Configured `@capacitor/cli`, `@capacitor/core`, and initialized Gradle/Xcode bindings inside native `/android/` and `/ios/` bundles.
- **Firebase Backend Stabilization & Empty-State Resilience (2026-08-07):**
  - Transitioned the full frontend data-fetching hooks layer (`useCompanions`, `useStories`, `useActivities`, `useEvents`, `usePartners`, `useCommunityPosts`) to rely strictly on secure collections inside production database `hamrosathi1` with zero hardcoded seeding fallbacks or mock caches.
  - Added graceful rendering protections so empty collections render beautiful visual placeholders instead of failing.
  - Optimized compiling pipelines by excluding generated mobile paths (`/android`, `/ios`, `/dist`) in `tsconfig.json`.
- **Admin Application Separation (2026-08-12):**
  - Extracted the admin panel from `src/admin/` into a completely standalone `/admin` application.
  - The admin app has its own `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, and `src/` directory.
  - Both applications share the same production Firebase backend (`hamrosathi1`) but have separate entry points, routing, UI, build processes, and deployments.
  - Removed admin routes and admin panel links from the main SATHI user application.
  - Admin app builds independently on port 3001; main app builds independently on port 3000.
- **Admin System Hardening (2026-08-12):**
  - Unified admin auth hook into `admin/src/hooks/useAdmin.ts` with role-based permissions, rate limiting integration, and system health/metrics hooks.
  - Added `AdminErrorBoundary` component for crash prevention across the admin app.
  - Created `admin/src/utils/errorHandling.ts` and `admin/src/hooks/useAsyncAction.ts` for consistent error handling and async state management.
  - Added comprehensive unit tests for RBAC (11 roles), aggregation services, health monitoring, rate limiting, and idempotency (38 tests total).
  - Configured `admin/vitest.config.ts` with jsdom environment and setup file for proper test isolation.
  - Fixed Firebase project ID validation in admin to prevent accidental cross-project data access.

- **Home Feed Overhaul (2026-08-24):**
  - Replaced per-mount `onSnapshot` listeners with cursor-paginated one-shot `getDocs` queries (10–15 doc pages) on discovery collections. Real-time listeners preserved for messaging, notifications, bookings.
  - New `useProgressiveReveal` hook (IntersectionObserver sentinel) instantiated once in ClientApp and shared by desktop and mobile.
  - New `feedGenerator.ts` (deterministic mulberry32 PRNG, category chunks, ≤2-consecutive-item invariant) and `feedStabilizer.ts` (append-only, mergeById, tail region support).
  - Reduced initial Home reads from ~130 docs across 7 listeners to 65 docs across 5 one-shot queries.
  - Feed mixing now weaves companions into a non-companion stream (`weaveCompanionsIntoStream`); community posts integrated into every layer; no type-block dumps.
  - Mobile and desktop now share the exact same cards and ordering; breakpoint resize no longer resets reveal position.
  - PWA branding fixed: `vite.config.ts` and `index.html` now point to the real `public/sathi-logo.jpeg`; corrupt `icon*.jpg` files no longer referenced. Pre-hydration splash and `LoadingScreen` redesigned around the real logo.
  - Rules-of-Hooks crash fixed: `useCompanionCategories` hoisted to top of `ClientApp.tsx` (was conditionally invoked). Notifications composite index `(userId, timestamp)` deployed to `hamrosathi1`; redundant single-field "composites" removed (covered by auto indexes).
- **Community Post Deep Links (2026-08-25):**
  - New route `/post/:postId` (`src/pages/PostPage.tsx`) performs a direct document lookup on `community_posts/{postId}` and renders through the shared `FeedPostCard`.
  - Native share sheet via `src/services/deepLinks.ts`; canonical URL `${origin}/post/${realDocId}`.
  - `vercel.json` SPA rewrite added so direct URLs and browser refresh work.
  - 404 state for missing/unpublished posts (no silent redirect to home).
- **Comment Pipeline Rebuild (2026-08-25):**
  - Shared `usePostComments(postId)` hook with one realtime listener per OPENED post, optimistic pending insertion, and failure revert.
  - Shared `CommentsPanel` (list with avatars, relative timestamps, edit-own / delete-own, empty state) and `CommentComposer` (auto-growing textarea, Enter=send, Shift+Enter=newline, max 500 chars, double-submit guard, optimistic "Sending…" comment, scroll-into-view on mobile).
  - Verified end-to-end against production `hamrosathi1` with a real seeded Auth account (WRITE 200 → READ 200, content match).
  - `SocialPostCard` now owns live `liked/likes/comments` state; per-user liked state derived from real `likes/{uid}_{postId}` lookups.
  - `ExpandableText` for one-line clamp with real overflow measurement.
- **Engagement Integrity Purge (2026-08-25):**
  - All fabricated likes/comments removed from `src/scripts/seed.ts`. Seeded posts now start at 0/0 and only grow from real activity.
  - `scripts/purge-fake-engagement.mjs` (REST + gcloud credentials) deleted 1,350 fake post-likes and 838 fake story-likes from production `hamrosathi1`; counters recomputed from remaining real records. Real user interactions preserved (cp2, cp10, cp38, etc.).
  - `firestore.rules` hardened: `community_posts.likesCount`/`commentsCount` must be non-negative numbers; like-doc IDs `${uid}_${postId}` are idempotent-by-ID.
  - Honest limit: without Cloud Functions, rules cannot enforce delta-correctness; counters remain repository-managed.
- **Companion Application / KYC Flow (2026-08-26):**
  - `CompanionApplicationModal`, `CompanionApplicationCard`, `CompanionApplicationRepository`, `AdminApplicationsPage` (main app shell), `services/bookingEligibility.ts`, `services/companionDashboard.ts`.
  - Booking gated on KYC eligibility through `bookingEligibility.ts`.
  - Specs published: `docs/sathi/AUTH_KYC_ARCHITECTURE.md`, `docs/sathi/ADMIN_KYC_WORKFLOW.md`, `docs/sathi/SECURITY_MODEL.md`, `docs/sathi/FIREBASE_DATA_ARCHITECTURE.md`.
  - `scripts/verify-auth-kyc.mjs` provided for live verification.
- **Authoritative Documentation Set (2026-08-24):**
  - 19 spec files created in `docs/sathi/`: `00_MASTER_OBJECTIVE` through `16_REMOVED_FEATURES`, plus `AUTH_KYC_ARCHITECTURE`, `ADMIN_KYC_WORKFLOW`, `SECURITY_MODEL`, `FIREBASE_DATA_ARCHITECTURE`, `HOME_FEED_ARCHITECTURE`.
  - `docs/sathi/CHANGELOG.md` is the authoritative session log. **Every code change must append an entry in the defined format.**

- **Firebase Resumption & Optimization (2026-07-12):**
  - Resolved `auth/configuration-not-found` error via strict initialization validation in `src/firebase.ts`.
  - Implemented and deployed production-grade Firestore Security Rules (RBAC model).
  - Defined and deployed 40+ composite indexes for Firestore performance.
  - Implemented core Cloud Functions for Auth, Bookings, Messaging, and Ratings in `functions/src/index.ts`.
  - Linked local environment to `hamrosathi1` Firebase project.

## Current Priorities

1. **Upgrade Firebase project to Blaze plan** to deploy Cloud Functions (paused until user confirms billing status).
2. **Booking creation as a single Firestore transaction with idempotency keys** (next recommended task from `docs/sathi/CHANGELOG.md`).
3. Continue expanding unit and integration test assertions for both main and admin apps.
4. Visual QA on physical devices (currently not in CI); multi-device live concurrency testing remains manual.

## Rejected Ideas

- Migrating to Next.js: not approved; current stack is Vite
- Migrating to Supabase: not approved; use Firebase per master prompt
- Migrating to Flutter: do not start until web platform is stable

## Known Limitations

- **Cloud Functions require Blaze plan upgrade for deployment.**
- FCM foreground listener works; push notifications require Cloud Functions/Messaging.
- Internationalization not implemented.
- **Counter delta-correctness** on `community_posts.likesCount` / `commentsCount` cannot be rule-enforced without Cloud Functions — these are maintained transactionally by repository code.
- **Visual QA on physical devices** is not part of CI; multi-device live concurrency QA is manual.
- **Booking creation is not yet a single atomic transaction** (open task: idempotency-keyed transaction).

## File Map (Current)

- `src/firebase.ts` - Firebase init (Hardened)
- `src/services/auth.ts` - Auth service with claims
- `src/services/firestore.ts` - Firestore service
- `src/services/maps.ts` - Maps constants and types
- `src/services/payments.ts` - Khalti/eSewa payment integration
- `src/services/notifications.ts` - FCM + Web Notifications
- `src/services/storage.ts` - IndexedDB offline cache
- `src/hooks/useFirestoreData.ts` - Real-time data hooks with offline cache
- `src/context/AppContext.tsx` - Auth + bookings + messages state with offline queue
- `src/components/AuthModal.tsx` - Real Firebase auth UI with accessibility
- `src/components/modals/BookingFlowModal.tsx` - Multi-step booking with payment integration and map preview
- `src/components/modals/CompanionProfileModal.tsx` - Profile overlay with map preview
- `src/components/messages/MessagesTab.tsx` - Real-time Firestore chat UI
- `src/components/dashboard/DashboardTab.tsx` - User dashboard
- `src/components/dashboard/PartnerDashboard.tsx` - Partner business dashboard
- `src/components/Navbar.tsx` - Navigation with accessibility attributes
- `src/components/guards/AuthGuard.tsx` - Route protection
- `src/components/guards/AdminGuard.tsx` - Admin route protection with custom claims
- `src/components/LoadingScreen.tsx` - Auth initialization screen
- `src/components/maps/MapPreview.tsx` - Leaflet+OSM interactive map preview (replaces Google Static)
- `src/components/modals/CompanionApplicationModal.tsx` - Companion KYC application form
- `src/components/companions/CompanionApplicationModal.tsx` - Companion KYC application UI
- `src/components/settings/CompanionApplicationCard.tsx` - Settings dashboard KYC status card
- `src/components/social/CommentsPanel.tsx`, `CommentComposer.tsx`, `ExpandableText.tsx` - Comment pipeline (2026-08-25)
- `src/hooks/usePostComments.ts` - Shared realtime comments hook (one listener per open post)
- `src/hooks/useProgressiveReveal.ts` - Home feed reveal coordinator (IntersectionObserver)
- `src/hooks/useDiscoveryFeed.ts` - Cursor-paginated Home feed hook
- `src/services/feedGenerator.ts` - Deterministic home feed composer (mulberry32 PRNG)
- `src/services/feedStabilizer.ts` - Append-only feed stabilizer (chunkFeedByHeader)
- `src/services/deepLinks.ts` - `/post/:postId` URL builder + native share
- `src/services/bookingEligibility.ts` - KYC/eligibility gate for booking
- `src/services/companionDashboard.ts` - Companion dashboard data
- `src/pages/PostPage.tsx` - Direct-lookup community post deep-link route
- `src/pages/AdminApplicationsPage.tsx` - Admin KYC review page (legacy in main app; equivalent workflow in `/admin`)
- `src/repositories/CompanionApplicationRepository.ts` - KYC repository
- `vercel.json` - SPA rewrite for direct deep-link URLs
- `scripts/purge-fake-engagement.mjs` - One-shot script that purged 1,350 fake post-likes and 838 fake story-likes from `hamrosathi1` (2026-08-25)
- `scripts/verify-comment-pipeline.mjs`, `scripts/verify-auth-kyc.mjs` - Live verification scripts
- `admin/` - Standalone admin app: 25 pages, 7 services, 11 RBAC roles, 38 tests
- `docs/sathi/CHANGELOG.md` - **Authoritative session log** (mandatory append on every code change)
- `src/components/notifications/NotificationProvider.tsx` - FCM registration and permission request
- `src/App.tsx` - React Router entry point with NotificationProvider
- `src/main.tsx` - React entry
- `admin/` - Completely separate admin application with its own build, routing, and Firebase initialization
- `src/scripts/seed.ts` - Firestore demo data seeder
- `src/__tests__/*.ts` - Vitest test coverage files
- `vitest.config.ts` - Vitest configuration
- `.github/workflows/ci.yml` - CI/CD pipeline
- `docs/*.md` - Full project documentation
- `functions/src/index.ts` - Cloud Functions implementation
- `firestore.rules` - Production security rules
- `firestore.indexes.json` - Composite indexes definition
- `FIREBASE_IMPLEMENTATION_REPORT.md` - Implementation summary and next steps
