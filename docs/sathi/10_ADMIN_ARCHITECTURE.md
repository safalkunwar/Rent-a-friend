# 10 — Admin Architecture

**Last updated:** 2026-08-24

---

## Positioning

The admin panel is a **separate administrative interface** (standalone Vite app at `/admin`, own build/tests/deploy, runs on port 3001 in dev) connected to the **same production backend** (`hamrosathi1`).

> Admins must not bypass the data integrity model simply because they have a UI. Every admin write passes through the same Firestore rules, validation, idempotency, and audit requirements as user writes.

## Boundaries

- Zero component/code sharing with the user app; only the Firebase backend is shared
- Admin is NOT routed from the main app (removed feature). The only link is a profile-dropdown deep link visible to `role === 'admin'` that opens the admin origin in a new tab
- `admin/src/firebase.ts` validates project ID `hamrosathi1` and fails fast on mismatch

## Authentication & Authorization

- Same Firebase Auth; `useAdminAuth` hook resolves claims + `admins/{uid}` doc
- **11 RBAC roles** (`admin/src/services/admin.ts`): `super_admin`, `platform_admin`, `safety_admin`, `moderation_admin`, `support_agent`, `booking_admin`, `finance_admin`, `kyc_reviewer`, `content_admin`, `analytics_admin`, `read_only_admin`
- Permission checks happen in admin services AND in Firestore rules — UI gating alone is never sufficient

## Functional Areas

| Area | Capability |
|---|---|
| User management | List, search, warn, restrict, suspend, ban |
| Companion management | KYC review (approve/reject), listing edits, verification badges |
| Booking management | Confirm, reject, complete, cancel — with the same transactional constraints as user flows |
| Reviews & comments moderation | Hide/remove abusive content; content_admin |
| Community moderation | Unpublish posts/stories; moderation queue |
| Payouts | Companion settlement views (finance_admin) — backend settlement itself is FUTURE (see `01_PRODUCT_VISION.md`) |
| Referrals & diamonds | Oversight of ledgers; **no manual balance edits without an audit-logged server path** |
| Reports center | User/content reports triage |
| Security & SOS operations | Live SOS alerts, suspicious activity review (safety_admin) |
| System monitoring | `healthService` polls Firestore/Auth/Storage every 30s; `aggregationService` platform metrics on 5-min refresh |
| Configuration | Platform settings via config docs — changes audit-logged |
| Audit logging | Every privileged action writes an immutable `auditLogs` entry (actor, action, target, details, timestamp) |

## Engineering Services Already Present

- Rate limiting (admin action throttling)
- Idempotency service (duplicate admin actions are no-ops)
- Virtualized tables for large datasets
- Error boundaries + comprehensive error handling utilities

## Rules of Conduct

1. No admin action may fabricate data (fake ratings, fake revenue, fake users)
2. No admin action may mutate financial ledgers outside a server-authoritative path
3. Destructive actions (ban, unpublish, cancel-booking) require confirmation + audit log
4. Admin tests must cover RBAC denial paths, not just happy paths (see `14_TESTING_STRATEGY.md`)
