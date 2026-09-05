# Agent Continuity Guide - SATHI Project

This file serves as a high-level briefing for any AI agent resuming work on the SATHI project.

## Current Status (2026-09-04)

The Firebase backend is production-hardened. The admin panel is a completely standalone application at `/admin` with its own build, routing, Firebase initialization, RBAC, and test suite. The main app has progressed through Home feed overhaul, deep-linkable community posts, a fully rebuilt comment pipeline, KYC/companion-application flow, and a fabricated-engagement purge against the live `hamrosathi1` database. Test counts: **126 in main app** (7 files) + **38 in admin app** (5 files) = **164 total passing**.

### Critical Implementation Details

1.  **Firebase Initialization:** `src/firebase.ts` enforces strict validation of `VITE_FIREBASE_*` environment variables. `admin/src/firebase.ts` does the same for the admin app and additionally throws if `projectId !== 'hamrosathi1'` (prevents accidental cross-project data access).
2.  **Security Model:** RBAC system. Rules in `firestore.rules`. Access governed by custom claims (`admin`, `role: 'companion'`, `role: 'customer'`). Counter fields on `community_posts` (likesCount/commentsCount) require non-negative numbers; like-doc IDs are `${uid}_${postId}` (idempotent). Honest limitation: without Cloud Functions (Blaze paused), rule-level delta-correctness cannot be enforced — counters are maintained transactionally in repository code.
3.  **Performance:** Composite indexes in `firestore.indexes.json`. Home discovery uses cursor-paginated one-shot queries (`getDocs` with document-ID cursors, 10–15 doc pages) instead of live listeners. Real-time listeners are reserved for messaging/notifications/bookings.
4.  **Cloud Functions:** Implemented in `functions/src/index.ts` — `onUserCreate`, `onUserDelete`, `setUserRole`, `onBookingCreate`, `onBookingUpdate`, `onMessageCreate`, `onReviewCreate`.
    - **PAUSED:** Deployment blocked because the Firebase project is **not** on the Blaze plan. Do not attempt to deploy functions until the user confirms the upgrade.
5.  **Admin Application:** Standalone Vite + React app in `/admin`:
    - Own `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`
    - **11 RBAC roles** defined in `admin/src/services/admin.ts`
    - Rate limiting (`adminRateLimiter`), idempotency (`idempotencyService`), audit logging, system health (`healthService`), aggregation metrics
    - Virtualized tables for large datasets (`VirtualizedTable`)
    - `AdminErrorBoundary`, `errorHandling.ts`, `useAsyncAction.ts`
    - **38 passing unit tests** across 5 files (`aggregation`, `health`, `admin-rbac`, `rate-limiter`, `idempotency`)
    - 25 page components in `admin/src/pages/`
6.  **Companion Application / KYC Flow (2026-08-26):** `CompanionApplicationModal`, `CompanionApplicationCard`, `CompanionApplicationRepository`, `AdminApplicationsPage`, `services/bookingEligibility.ts`, `services/companionDashboard.ts`. Specs: `docs/sathi/AUTH_KYC_ARCHITECTURE.md`, `docs/sathi/ADMIN_KYC_WORKFLOW.md`.
7.  **Community Posts Deep Linking (2026-08-25):** Route `/post/:postId` in `src/pages/PostPage.tsx` performs a direct document lookup. Native share sheet via `src/services/deepLinks.ts`. Vercel SPA rewrite in `vercel.json`.
8.  **Comment Pipeline (2026-08-25):** Shared `usePostComments(postId)` hook + `CommentsPanel` + `CommentComposer` (auto-growing textarea, optimistic pending, double-submit guard). One realtime listener per OPENED post only.
9.  **Engagement Integrity (2026-08-25):** All fabricated likes/comments removed from `seed.ts`. `scripts/purge-fake-engagement.mjs` deleted **1,350 fake post-likes** and **838 fake story-likes** from production `hamrosathi1`; real user interactions preserved.

### Live Documentation Set (2026-08-24)

The authoritative project spec lives in `/docs/sathi/` (19 files, plus `CHANGELOG.md`):
- `00_MASTER_OBJECTIVE.md`, `01_PRODUCT_VISION.md`, `02_CORE_FEATURES.md`, `03_USER_FLOWS.md`
- `04_SYSTEM_ARCHITECTURE.md`, `05_FIREBASE_ARCHITECTURE.md`, `06_DATA_MODEL.md`
- `07_PERFORMANCE_SCALABILITY.md`, `08_CONCURRENCY_BOOKING.md`, `09_SECURITY_PRIVACY.md`
- `10_ADMIN_ARCHITECTURE.md`, `11_MOBILE_WEB_ARCHITECTURE.md`, `12_FEED_LOADING_STRATEGY.md`
- `13_FAILURE_RECOVERY.md`, `14_TESTING_STRATEGY.md`, `15_NON_NEGOTIABLE_RULES.md`, `16_REMOVED_FEATURES.md`
- `AUTH_KYC_ARCHITECTURE.md`, `ADMIN_KYC_WORKFLOW.md`, `SECURITY_MODEL.md`
- `FIREBASE_DATA_ARCHITECTURE.md`, `HOME_FEED_ARCHITECTURE.md`
- `CHANGELOG.md` — session-by-session log (mandatory format defined at top of file)

### Ongoing Tasks & Priorities

- **Blaze Plan Upgrade:** Deferred. Paused until the user confirms billing is enabled.
- **User Experience Improvements:** Booking creation as a single Firestore transaction with idempotency keys (next recommended task from `docs/sathi/CHANGELOG.md`).
- **Testing:** Expand Vitest coverage in both apps.
- **Known honesty limits:** Visual QA on physical devices not performed in CI; multi-device live concurrency testing is manual; counter delta-correctness on `community_posts` cannot be rule-enforced without Functions.

### Documentation Reference

- `docs/sathi/CHANGELOG.md`: Primary session-by-session log (current and authoritative).
- `docs/sathi/AI_MEMORY.md` (does NOT exist — use this file): high-level briefing.
- `docs/AI_MEMORY.md`: Project history + tech stack (last major update 2026-07-24, partially superseded).
- `docs/firebase/`: Detailed Firebase architectural blueprints.
- `FIREBASE_IMPLEMENTATION_REPORT.md`: Backend work summary.
- `admin/src/__tests__/`: Admin unit tests.

## Constraint Rules

- **Preserve UI:** Do not modify React components or styling unless fixing a direct integration bug.
- **Firebase Scope:** Focus on `src/services/`, `functions/`, and Firebase config files. Admin app changes can touch `admin/src/`.
- **Nepal Market:** All currency must remain in **NPR**.
- **Blaze Plan:** Do not attempt to deploy Cloud Functions until the user explicitly confirms the Firebase Blaze plan upgrade is complete.
- **Admin Tests:** Run `cd admin && npx vitest run` for admin tests, `npx vitest run` from root for main app tests (note: both will pick up the other app's `__tests__` due to no `include` restriction; use isolated configs to scope to one app).
- **Changelog Discipline:** Any session that modifies code MUST append an entry to `docs/sathi/CHANGELOG.md` in the format defined at the top of that file.
