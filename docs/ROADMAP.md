# Roadmap

## Current Milestone

- **Milestone 12:** Companion Application & KYC (in production hardening — flow shipped 2026-08-26; admin equivalent workflow lives in the standalone `/admin` app)

## Completed Milestones

| Milestone | Description | Date |
|-----------|-------------|------|
| 0 | Repository cloned, Phase 1 audit, docs created | 2026-07-11 |
| 1 | Stabilization: removed duplicates, fixed currency, lint targets defined | 2026-07-11 |
| 2 | Firebase Setup: Auth, Firestore, Storage, config layer | 2026-07-11 |
| 3 | Data Migration: real-time hooks + Firestore fallback pattern | 2026-07-11 |
| 4 | Routing & Auth: React Router, guards, auth modal integration | 2026-07-11 |
| 4.5 | Admin routing & guards, seed data script | 2026-07-11 |
| 5 | Maps, activities, events, payments, notifications, offline cache | 2026-07-11 |
| 6 | PWA: `vite-plugin-pwa`, custom install prompt, iOS guide, online/offline alerts | 2026-08-01 |
| 7 | Capacitor native bridge: `/android`, `/ios` scaffolds for APK/IPA builds | 2026-08-01 |
| 8 | Reusable design system (`src/components/ui/`) + Apple×Instagram×Airbnb×Linear light-mode overhaul | 2026-07-31 |
| 9 | Production reconnection to `hamrosathi1`; permissive Firestore rules for messaging/social | 2026-07-22 |
| 10 | Admin separation: extracted to standalone `/admin` app with own build, routing, 11 RBAC roles, rate limiting, idempotency, audit, health, aggregation (38 tests) | 2026-08-12 |
| 11 | Home feed overhaul: cursor-paginated one-shot reads, deterministic generator + stabilizer, mobile/desktop parity, deep-link community posts (`/post/:postId`), comment pipeline rebuild, fabricated-engagement purge (164/164 tests) | 2026-08-25 |
| 12 | Companion application / KYC flow + authoritative `docs/sathi/` spec set (19 files) | 2026-08-26 |

## Upcoming Milestones

| Milestone | Description | Target |
|-----------|-------------|--------|
| 13 | Booking creation as a single Firestore transaction with idempotency keys (next recommended task) | Q3 2026 |
| 14 | Blaze plan upgrade → deploy Cloud Functions (`onUserCreate`, `onBookingCreate`, `onMessageCreate`, `onReviewCreate`, etc.) | Pending user confirmation |
| 15 | Load testing with 10,000 simulated concurrent users | After Functions |
| 16 | Mobile app store deployment (Android via Capacitor → APK; iOS via Capacitor → IPA) | After Functions |
| 17 | Advanced search infrastructure evaluation (Algolia/Meilisearch) | TBD |
| 18 | Disaster recovery runbook and backup validation | TBD |

## Long-term Vision

1. Become Nepal's largest social experiences marketplace
2. Flutter mobile app for iOS and Android (deferred — Capacitor remains the bridge)
3. AI concierge and recommendation engine
4. Corporate experience packages
5. Internationalization (English, Nepali, Hindi)
6. Partner business directory with referral commissions
7. Premium subscriptions
8. Tourism packages and adventure bookings
