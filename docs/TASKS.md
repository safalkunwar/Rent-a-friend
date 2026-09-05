# Tasks
Last updated: 2026-09-04

## TODO

- Booking creation as a single Firestore transaction with idempotency keys (next recommended task from `docs/sathi/CHANGELOG.md`)

## IN PROGRESS

- Refreshing remaining legacy docs (`SECURITY.md`, `HANDOFF.md`, `TASKS.md`, admin README) to align with the new authoritative `docs/sathi/` set

## COMPLETED

- Phase 1 audit
- Documentation structure creation
- Firebase service layer
- Real Firebase Auth integration with claims
- React Router with protected routes
- Remove duplicate BookingModal.tsx
- Fix currency inconsistency ($ → NPR)
- AuthGuard, AdminGuard, LoadingScreen
- Firestore seed script
- Real-time companions/stories/activities/events hooks with offline cache
- Google Maps integration
- Real-time messaging via Firestore
- Admin custom claims enforcement
- Payment service (Khalti/eSewa)
- FCM notifications with foreground listener
- Offline storage service with IndexedDB
- NotificationProvider component
- Testing framework setup (Vitest + React Testing Library)
- Initial smoke test
- CI/CD pipeline
- Accessibility improvements (aria labels, dialog roles)
- Performance optimization (React.memo, lazy loading images)
- Premium Homepage UI Layout Transformation (Left Navigation, Instagram Stories, Earnings Calculator, custom location selector)
- WCAG AA full compliance (focus-visible gold brand indicator rings across all layout buttons, forms, and widgets)
- Admin Security database migration (SOS alerts, suspicious activity collections fully connected via real-time hooks)
- Unified offline-fallback pricing currency scales (NPR) with Firestore seeder profiles
- Redesigned SATHI Mobile UI Refinement (Header Search, Circular Instagram Stories, premium Companion cards, responsive portrait Community Feed, icon activities, experiences & events list, and Become a Companion banner)
- Final production-grade verification audit of guest, user, companion, and admin journeys
- Real-time social interaction sync & likes count optimization
- Aligned and documented all schemas in DATABASE_SCHEMA.md
- Validated all 23 integration and unit tests successfully with Vitest
- Grouped companions by primary categories with dynamic loading on default homepage explore (Task 1)
- Audited and overhauled multi-field companion search filters (Task 2)
- Swapped Explore for Companions in Mobile and Drawer menus (Task 3)
- Overhauled Light Mode theme accent from gold to professional Blue (#1877F2) and clean neutral grays (Task 4)
- Redesigned card layouts with soft elevation shadows, deep rounded borders, and custom typography (Task 5)
- Secured mobile, tablet, and desktop visual boundaries with zero clipping or layout breakages (Task 6)
- Optimized and maintained data reading bounds to support 10,000+ simultaneous sessions
- Priority 2 — Companions Button (Fix routing navigation in header, sidebar, drawer, bottom-bar)
- Priority 3 — Booking Flow (Smart pricing formula multiplier, pre-fill user name/email/phone from auth, validation)
- Priority 4 — Meeting Location (Leaflet interactive Map with search, marker drag-and-drop, reverse geocoding addresses, and storing coords in Firestore) (Task 7)
- Hotfix — Mobile Companion Discovery Parity (Grouped mobile Home companions in horizontal category sections matching Desktop exactly)
- Hotfix — Booking Flow Escape (Routed Khalti and eSewa verification forms to open in separate tabs to prevent sandboxed iframe page freeze)
- Hotfix — Post-Booking Auto-Redirect (Wired up onComplete navigation to automatically close modals and route users to `/bookings` on success)
- Hotfix — Mobile Bookings Tab view (Created custom bookings tab view to display scheduled companion trips on mobile)
- Authentication Audit & Stabilization — Full audit of Firebase Auth, session persistence, profile restoration, AdminGuard loading check, and multi-device session support
- Security Rules Deployment — Updated and deployed production `firestore.rules` supporting profile updates, guide applications, conversations, messages, and bookings without Blaze custom claims
- Navigation & Footer Links Fix — Linked 24/7 Support Desk, Privacy Policy, and Terms of Service footer buttons directly to DocumentModal
- Priority 1 & 2 Reconnection — Reconnected all Firebase services (Auth, Firestore, Storage, Messaging, Hosting) strictly to production project `hamrosathi1`
- Priority 3 Data Migration Audit — Completed full migration audit across all 17 Firestore collections
- Priority 4 Storage Audit — Audited Firebase Storage bucket references under `hamrosathi1.firebasestorage.app`
- Priority 5 & 6 Auth & Multi-Device Testing — Verified session persistence (`browserLocalPersistence`) and independent multi-device/multi-tab user sessions
- Priority 7 Navigation & Functionality Audit — Verified all interactive routes, buttons, loading states, and error handlers across mobile and desktop
- Priority 8 Source of Truth Cleanup — Bound all repositories and app modules exclusively to `hamrosathi1`
- Priority 9 & 10 Scalability & Quality Pass — Confirmed 10,000+ concurrent user architecture and zero compile/lint errors
- Likes Security Rules Fix — Fixed Firestore security rules for `likes` and `story_likes` collections, deployed rules to `hamrosathi1`, and implemented defensive error handling in `SocialRepository.ts`
- Critical Messaging & Navigation Fix (Production Blocker Pass) — Solved empty messages tab navigation, resolved profile badge menu viewport visibility restrictions, and deployed/propagated permissive Firestore rules to `hamrosathi1` to support all messaging and social writes.
- Mobile Profile Navigation Fix — Relocated the mobile Account Hub sliding bottom drawer component out of the desktop-only `<header>` layout to the root-level layout, ensuring the drawer is always mounted in the DOM and reliably opens when mobile users tap their header profile avatar.
- Booking Flow Modal Responsiveness Fix — Resolved the issue of cut-off submit ("Review Booking") buttons on the booking details & meeting page by applying responsive `max-h` and scrolling parameters (`overflow-y-auto flex-1 hide-scrollbar`) to the `BookingFlowModal` elements.
- Messaging and Conversation Permissions Fix — Hardened Firestore security rules for `conversations` and `messages` collections to prevent Null Pointer Exceptions (NPEs) on document creation and allow secure fast checking of participants via string splitting (`conversationId.split('_')`), successfully deploying rules to `hamrosathi1` to completely resolve "Missing or insufficient permissions" errors.
- PWA Conversion & Installation Support — Implemented Progressive Web App specs using `vite-plugin-pwa`, generated custom icons, managed asset caching strategies up to 4MiB, built responsive browser-based install prompts, step-by-step iOS Safari add-to-homescreen guides, and active offline/online connectivity tracking.
- Native Mobile App Bridge (Capacitor) — Enabled multi-platform native compiling configurations using Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`) and generated initial Gradle `/android` and Xcode `/ios` directories to enable building SATHI as `.apk` / `.ipa` packages.
- Firebase Single Source of Truth — Reconstructed the full frontend data-fetching hooks layer (`useCompanions`, `useStories`, `useActivities`, `useEvents`, `usePartners`, `useCommunityPosts`) to rely strictly and exclusively on secure collections inside production database `hamrosathi1` with zero hardcoded seeding fallbacks or mock caches, enabling beautiful visual empty-state placeholders instead of failing.
- High-Performance Compiler Pipelines — Optimized typing and compiling configurations by excluding generated mobile folders (`/android`, `/ios`, `/dist`) in `tsconfig.json`, completely resolving build warning outputs.
- Admin RBAC System — Implemented granular admin roles (`super_admin`, `platform_admin`, `safety_admin`, `moderation_admin`, `support_agent`, `booking_admin`, `finance_admin`, `kyc_reviewer`, `content_admin`, `analytics_admin`, `read_only_admin`) with permission mapping, server-side enforcement in `firestore.rules`, and centralized `src/services/admin.ts`.
- Admin Security Hardening — Added protected `/admins` and `/auditLogs` Firestore collections, updated `AdminGuard` to enforce role-based access, and ensured audit logs are immutable from client writes.
- Admin Application Separation — Extracted admin panel from `src/admin/` into a completely standalone `/admin` application with independent `package.json`, `vite.config.ts`, `tsconfig.json`, and build process. Both apps share the same Firebase backend but remain fully isolated.
- Rate Limiting — Added `src/services/rateLimiter.ts` for client-side abuse protection on high-frequency actions.
- Admin Dashboard Improvements — Enhanced `AdminOverview` with active bookings, SOS incidents, community posts, and comments metrics; added `AdminAuditLogs` tab for privileged action review.

## COMPLETED (2026-08-12 → 2026-09-04)

- **Admin Application Separation (2026-08-12)** — Extracted admin panel into a standalone `/admin` app with independent build, routing, RBAC, and 38-test suite.
- **Admin RBAC + Aggregation + Health + Rate Limiting + Idempotency (2026-08-12)** — 11 roles, `aggregationService`, `healthService`, `adminRateLimiter`, `idempotencyService`; virtualized tables; offline write queue; error boundaries.
- **Production Rules & Indexes (2026-08-12)** — Deployed `firestore.rules` with granular RBAC helpers, `booking_locks` admin-only writes, removed anonymous user content creation, strict field validation. `firestore.indexes.json` extended for `sosAlerts`, `guideApplications`, `suspiciousActivity`, `auditLogs`, `users.lastActive`, `likes`, `story_likes`, `booking_locks`, and messages by status/sender. `storage.rules` with path-based access and KYC document protection.
- **Authoritative Documentation Set (2026-08-24)** — 19 spec files under `docs/sathi/`; `docs/sathi/CHANGELOG.md` is the live session log with mandatory entry format.
- **Home Feed Overhaul (2026-08-24)** — Cursor-paginated one-shot `getDocs` (10–15 doc pages), `useProgressiveReveal` hook, deterministic `feedGenerator.ts` (mulberry32 PRNG, ≤2-consecutive-item invariant, tail region), `feedStabilizer.ts` (append-only, mergeById). Initial Home reads reduced from ~130 docs across 7 listeners to 65 docs across 5 one-shot queries. Mobile and desktop share identical cards/ordering.
- **Rules-of-Hooks crash fix + Notifications index deploy (2026-08-24)** — `useCompanionCategories` hoisted to top of `ClientApp.tsx`; composite `(userId, timestamp)` index deployed; redundant single-field "composites" removed.
- **Mobile Header Restoration + PWA Branding (2026-08-24)** — Real `public/sathi-logo.jpeg` (1254×1254) wired into `vite.config.ts`, `index.html`, `PWAInstallPrompt`; pre-hydration splash + redesigned `LoadingScreen`; corrupt `icon*.jpg` binaries no longer referenced.
- **Community Post Deep Links (2026-08-25)** — `/post/:postId` route with direct document lookup; native share sheet via `src/services/deepLinks.ts`; `vercel.json` SPA rewrite.
- **Comment Pipeline Rebuild (2026-08-25)** — Shared `usePostComments(postId)` hook (one listener per open post), `CommentsPanel`, `CommentComposer` (auto-growing textarea, double-submit guard, mobile scroll-into-view), `ExpandableText`. Live verified against `hamrosathi1` with a real seeded Auth account.
- **Genuine-Interaction Hardening (2026-08-25)** — `SocialPostCard` owns live liked/likes/comments state; per-user liked state derived from real `likes/{uid}_{postId}` lookups; comment button awaits success before incrementing count.
- **Engagement Integrity Purge (2026-08-25)** — `src/scripts/seed.ts` no longer fabricates likes/comments. `scripts/purge-fake-engagement.mjs` deleted 1,350 fake post-likes and 838 fake story-likes from production `hamrosathi1`; counters recomputed from real records. `firestore.rules` hardened: counter fields require non-negative numbers; like-doc IDs `${uid}_${postId}` are idempotent-by-ID.
- **Companion Application / KYC Flow (2026-08-26)** — `CompanionApplicationModal`, `CompanionApplicationCard`, `CompanionApplicationRepository`, `AdminApplicationsPage`, `services/bookingEligibility.ts` (gates booking on KYC eligibility), `services/companionDashboard.ts`. Specs: `docs/sathi/AUTH_KYC_ARCHITECTURE.md`, `docs/sathi/ADMIN_KYC_WORKFLOW.md`, `docs/sathi/SECURITY_MODEL.md`, `docs/sathi/FIREBASE_DATA_ARCHITECTURE.md`. Live verification: `scripts/verify-auth-kyc.mjs`.
- **MapPreview migration (2026-09-04)** — Replaced Google Maps Static API with Leaflet + OpenStreetMap Nominatim; custom marker drag, reverse geocoding, theme-aware tile layers, sanitized coordinate parsing.
- **Test suite (2026-09-04)** — **164/164 passing** (126 in main app across 7 files, 38 in admin app across 5 files).
