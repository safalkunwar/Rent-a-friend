# Agent Continuity Guide - SATHI Project

This file serves as a high-level briefing for any AI agent resuming work on the SATHI project.

## Continuity update (2026-09-12)

Read [docs/sathi/DOCUMENTATION_STATUS.md](docs/sathi/DOCUMENTATION_STATUS.md) and [docs/sathi/ANTIGRAVITY_HANDOFF.md](docs/sathi/ANTIGRAVITY_HANDOFF.md) first, then target docs 20–32 and the selected phase in 30. The scoped P0-01 messaging/favorites containment release is active with dedicated-account SDK acceptance; no broader product phase is complete. Next is a separately approved P0 branch, not a repeat messaging rollout. The dated September 4 status below is historical: strict main Firebase validation, blanket production-hardening, fixed test counts and “no deployed Functions” must not be assumed. Root/ops/production rules differ. Confirm current billing and explicit approval before any new Functions deployment. Preserve existing constraint rules and CHANGELOG discipline; do not infer approval for live money or broad security-rule replacement from the design package.

## Historical Status (2026-09-04 — superseded)

> Phase 0 status (2026-09-12): P0-01 messaging/favorites containment was deployed as a candidate-only Firestore rules release and passed dedicated A/B/C SDK acceptance; see docs/sathi/MESSAGING_RELEASE_RESULT.md. Staff authority, booking/payment/lock compatibility, Event indexes, App Check, PITR/restore and device/PWA acceptance remain open. Read the documentation-status index before using the dated September 10 report below.

This September 4 snapshot described the backend as production-hardened. That conclusion is superseded by the later Phase 0 evidence: only P0-01 has since received a scoped containment release, while multiple production risks remain open. The admin and application descriptions and test counts below are historical reference, not current production certification.

### Critical Implementation Details

1.  **Firebase Initialization:** `src/firebase.ts` enforces strict validation of `VITE_FIREBASE_*` environment variables. `admin/src/firebase.ts` does the same for the admin app and additionally throws if `projectId !== 'hamrosathi1'` (prevents accidental cross-project data access).
2.  **Security Model:** RBAC system. Rules in `firestore.rules`. Access governed by custom claims (`admin`, `role: 'companion'`, `role: 'customer'`). Counter fields on `community_posts` (likesCount/commentsCount) require non-negative numbers; like-doc IDs are `${uid}_${postId}` (idempotent). Honest limitation: without Cloud Functions (Blaze paused), rule-level delta-correctness cannot be enforced — counters are maintained transactionally in repository code.
3.  **Performance:** Composite indexes in `firestore.indexes.json`. Home discovery uses cursor-paginated one-shot queries (`getDocs` with document-ID cursors, 10–15 doc pages) instead of live listeners. Real-time listeners are reserved for messaging/notifications/bookings.
4.  **Cloud Functions (historical local exports):** `functions/src/index.ts` contains `onUserCreate`, `onUserDelete`, `setUserRole`, `onBookingCreate`, `onBookingUpdate`, `onMessageCreate`, `onReviewCreate`.
    - Later Phase 0 evidence observed seven scoped media Functions active and billing enabled. Do not deploy these legacy exports in bulk; every new Functions deploy still requires explicit user authority and a reviewed runtime/configuration gate.
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

### Historical Documentation Set (2026-08-24)

The authoritative project spec lives in `/docs/sathi/` (19 files, plus `CHANGELOG.md`):
- `00_MASTER_OBJECTIVE.md`, `01_PRODUCT_VISION.md`, `02_CORE_FEATURES.md`, `03_USER_FLOWS.md`
- `04_SYSTEM_ARCHITECTURE.md`, `05_FIREBASE_ARCHITECTURE.md`, `06_DATA_MODEL.md`
- `07_PERFORMANCE_SCALABILITY.md`, `08_CONCURRENCY_BOOKING.md`, `09_SECURITY_PRIVACY.md`
- `10_ADMIN_ARCHITECTURE.md`, `11_MOBILE_WEB_ARCHITECTURE.md`, `12_FEED_LOADING_STRATEGY.md`
- `13_FAILURE_RECOVERY.md`, `14_TESTING_STRATEGY.md`, `15_NON_NEGOTIABLE_RULES.md`, `16_REMOVED_FEATURES.md`
- `AUTH_KYC_ARCHITECTURE.md`, `ADMIN_KYC_WORKFLOW.md`, `SECURITY_MODEL.md`
- `FIREBASE_DATA_ARCHITECTURE.md`, `HOME_FEED_ARCHITECTURE.md`
- `CHANGELOG.md` — session-by-session log (mandatory format defined at top of file)

### Current Priorities

- **P0 containment:** Select either staff authority or booking/payment/lock compatibility for a new separately approved gate; P0-01 messaging/favorites is already released.
- **New Functions:** Billing was observed enabled, but no new Functions deployment is authorized without explicit user approval and a scoped runtime/configuration review.
- **Testing/operations:** App Check, PITR/restore, installed-PWA/device acceptance and production concurrency remain open; use the documentation-status index for scope.

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
