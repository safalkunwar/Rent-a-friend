# 05 — Firebase Architecture

**Last updated:** 2026-08-24

---

## Single Source of Truth

**`hamrosathi1`** is the one and only Firebase project for SATHI.

- User platform, future mobile applications, and the admin panel all use the **same** backend data ecosystem.
- **Never create a duplicate Firebase project** to work around an application problem.
- `src/firebase.ts` and `admin/src/firebase.ts` validate the project ID (`hamrosathi1`) at init and fail fast on mismatch.

## Services

| Service | Usage | Status |
|---|---|---|
| Authentication | Email/password + Google; custom claims for roles | ✅ live |
| Firestore | All platform data (23 collections, see `06_DATA_MODEL.md`) | ✅ live |
| Storage | Images (avatars, stories, posts, KYC docs) | ✅ live |
| Cloud Messaging | FCM tokens stored on user docs; foreground messages | ⚠️ partial |
| Cloud Functions | Booking transactions, payment webhooks, notification fan-out, aggregation | ❌ **BLOCKED — project not on Blaze plan. Do not attempt deployment until user confirms upgrade.** |
| Hosting | PWA hosting with precache | ✅ live |
| Security Rules | `firestore.rules` (RBAC, 515 lines) | ✅ deployed config |
| Indexes | `firestore.indexes.json` composite indexes | ✅ deployed config |

## Client-Readable vs Server-Authoritative

### Client-readable (with rules enforcement)
- Public catalogs: `companions`, `activities`, `events`, `stories`, `community_posts`, `comments`, `reviews` (read: `true` or authenticated)
- Own data: own bookings, own conversations/messages, own notifications, own favorites

### MUST be server-authoritative (backend transaction/function decides)
| Operation | Why |
|---|---|
| Booking creation + slot reservation | Race conditions; double-booking prevention |
| Payment verification / status transitions | Client cannot be trusted to declare "paid" |
| Refund / cancellation financial effects | Money math must be single-writer |
| Referral attribution + reward grant | Fraud prevention |
| Diamond earn/spend/redeem | Economy integrity |
| Companion rating recomputation | Aggregation must not be client-writable |
| Role/claim changes | Auth elevation |
| Admin privileged actions | Already rule-gated; audit-logged |
| Counters on hot documents (e.g., event participants at capacity) | Atomic increment/transaction required |

Until Cloud Functions deploy, these operations must at minimum use **Firestore transactions from the client SDK** (still rule-gated), and the UI must never present them as "verified" where only client-side execution occurred.

## Rules Model (summary — full text in `firestore.rules`)

- `isAdmin()`: custom claim `admin`, claim `role=='admin'`, any of 11 `adminRole` values, `users/{uid}.role=='admin'`, or `admins/{uid}` exists
- `isCompanion()` / `isCustomer()` analogous
- Users: read/update own profile with field-diff whitelists (cannot self-promote role)
- Bookings: participant-or-admin read; create gated to customer owning the doc; status-only updates for user/companion
- Messages: participant-gated via conversation id split / `participantIds`; deletes disabled for clients
- Payments: owner-or-admin read; client create allowed for initiation records only — **status transitions to paid/verified must move server-side**

## Indexes

Composite indexes are declared in `firestore.indexes.json`. **Rule:** any new compound query (where + orderBy on different fields) must check for an existing index first; missing indexes are a runtime failure under load, not a dev-only nuisance.

## Monitoring

- Admin app `healthService` polls Firestore/Auth/Storage every 30s
- No server-side alerting exists yet (blocked on Blaze) — document as known gap
- Required once Blaze is on: function error rates, Firestore rule denial metrics, payment webhook failure alerts
