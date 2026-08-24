# 02 — Core Features

**Last updated:** 2026-08-24
**Legend:** ✅ working end-to-end · ⚠️ partial (UI works, backend incomplete) · ❌ not implemented (do not fake)

---

## 1. Authentication & Identity ✅
- Email/password + Google Sign-In via Firebase Auth
- `browserLocalPersistence`; profile merged from `users/{uid}` on auth state change
- Roles: `customer`, `companion`, `admin` (custom claims + Firestore + `admins` collection)
- Guest browsing allowed; auth required for writes (book, message, like, comment, join event)

## 2. Companion Discovery ✅
- Mixed discovery feed (see `12_FEED_LOADING_STRATEGY.md`)
- Search across name, location, bio, interests, languages
- Filter drawer (desktop) / bottom sheet (mobile): city, category, language, max hourly rate (NPR 800–3,000), min rating, sort (recommended / rating / price asc / price desc)
- Favorites (saved companions) via `users/{uid}/favorites`
- Companion profile modal → entry point to booking

## 3. Booking ⚠️
- Multi-step booking flow: companion → date/time/duration → participants → meeting point (Leaflet map) → review → payment method
- Escrow narrative, platform fee / companion payout fields on booking docs
- `booking_locks` collection exists for slot locking
- **Gap:** availability check + lock + booking creation are not yet a single server-authoritative transaction (Cloud Functions blocked on Blaze plan). See `08_CONCURRENCY_BOOKING.md`.

## 4. Payments ⚠️
- Khalti REST initiation and eSewa form-redirect initiation implemented client-side
- `payments` collection records initiated payments
- **Gap:** no server-side verification webhook (blocked on Blaze); no refund flow; wallet modal shows **hardcoded** balance/ledger (fake data — must be replaced or removed, tracked in CHANGELOG)

## 5. Messaging ✅
- `conversations` (participantIds) + `messages` real-time listeners
- Unread counts, read receipts (`isRead`), typing indicators subcollection
- Entry points: companion profile → "Message"; dashboard; messages tab

## 6. Events ✅
- Listing with date badges, location, attendee counts, spots remaining
- Join/leave via `eventParticipantsService`; button states Join / Joined / Full
- Capacity enforced client-side against `participants`; server-side enforcement is part of the same transactional gap as bookings

## 7. Activities ✅
- Firestore `activities` collection with category, duration, avgPrice (NPR)
- Shown in mixed feed + dedicated "Activities" horizontal section (mobile) and map markers (desktop explore)

## 8. Community: Posts, Stories, Likes, Comments ✅
- `community_posts` (status=published only in feed), `stories`
- Likes via `likes` / `story_likes` with deterministic IDs (`{userId}_{postId}`) — inherently idempotent
- Comments via `comments` collection; optimistic UI with rollback on failure
- Instagram-style stories row + full-screen story viewer with progress bars

## 9. Reviews ⚠️
- `reviews` collection + rules exist; UI surfaces rating on companion cards
- Post-booking review submission flow is not fully wired end-to-end

## 10. Referrals / Rewards / Diamonds ❌
- Invite-link copy exists in sidebar ("NPR 5K" narrative) but **no backend exists**: no attribution, no reward ledger, no fraud checks
- Diamond economy: **not implemented**; must be server-authoritative when built (see `00_MASTER_OBJECTIVE.md`)

## 11. Notifications ⚠️
- In-app notifications dropdown backed by `notifications` collection; mark-read works
- FCM token field exists on user docs; **background push requires Cloud Functions (blocked on Blaze)**

## 12. Safety ✅ (client-side)
- SOS widget with 5s auto-dismiss; `sosAlerts` collection rules exist
- Trust badges, KYC-verified markers, report flows (`reports` collection)

## 13. Admin Operations ✅
- Standalone `/admin` app on the same `hamrosathi1` backend
- 11 RBAC roles, audit logs, health monitoring, rate limiting, idempotency services, virtualized tables
- User management (warn/restrict/suspend/ban), booking management, moderation queues
- See `10_ADMIN_ARCHITECTURE.md`

## 14. Platform Qualities ✅
- PWA with offline precache; IndexedDB offline read cache
- Dark/light theme; i18n scaffolding (EN/NE)
- Responsive desktop + mobile with shared business logic
