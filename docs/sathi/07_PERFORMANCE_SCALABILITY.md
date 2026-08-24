# 07 — Performance & Scalability

**Last updated:** 2026-08-24

---

## Target

Engineer toward supporting **~10,000 concurrent users** without crashes or severe degradation.

> **10,000 concurrent users is a TARGET TO VALIDATE THROUGH LOAD TESTING — not an assumption, and not a claim of current capability.** Firebase imposes per-project quotas; the architecture below is what makes the target *reachable and testable*. No document, commit message, or demo may state SATHI "handles 10k users" until load tests in `14_TESTING_STRATEGY.md` pass.

## Engineering Requirements

### Query efficiency
- Every query bounded by `limitCount`; **no unbounded collection reads, ever**
- Cursor-based pagination (`startAfter`) for all discovery collections — **not yet implemented**; current page-scaled `limitCount` re-downloads earlier pages and is a known gap to fix FIRST (see `12_FEED_LOADING_STRATEGY.md`)
- Composite indexes declared for every compound query (`firestore.indexes.json`)
- No `get()` where a cached/listener value exists

### Controlled real-time listeners
- One listener per collection per screen, detached on unmount
- Real-time reserved for: **messaging, notifications, booking status, presence** — genuinely real-time states
- Discovery feeds use **pagination**, not live listeners that reshuffle content
- Budget: a typical active user should hold ≤ 6 concurrent listeners

### Denormalization & aggregation
- Denormalize read-hot fields (author name/avatar, lastMessage, rating aggregates) per `06_DATA_MODEL.md`
- Counters via `FieldValue.increment` (atomic, cheap) — never read-modify-write
- Heavy analytics aggregation belongs server-side (admin `aggregationService` with refresh cycles), never in user-facing requests

### Caching & deduplication
- IndexedDB offline cache renders before network (already implemented)
- Request deduplication: identical in-flight reads share one promise
- Idempotent writes via deterministic IDs (likes) or client-generated idempotency keys (bookings/payments/rewards)

### Optimistic UI — only where safe
- Allowed: likes, read receipts, UI-only toggles (rollback on failure)
- Forbidden: bookings, payments, rewards, role changes — these display state **only after backend confirmation**

### Backend-authoritative operations
- See `05_FIREBASE_ARCHITECTURE.md` table. Client never computes money, availability, or rewards.

### Atomicity
- Multi-document invariants (booking + lock + counters) in transactions
- Independent writes batched (`writeBatch`) to cut round-trips

### Resilience
- Retry with exponential backoff on transient Firestore/network errors
- Listener re-establishment on reconnect (SDK handles; verify no duplicate listener leaks)
- Timeout + user-visible error on hung operations — never an infinite spinner presented as progress

### Client performance
- Lazy-load below-fold sections (progressive category reveal — already implemented)
- Image optimization: `SafeImage` fallbacks, sized variants, Storage CDN delivery
- Route-level code splitting where the bundle grows

### Rate limiting & abuse
- Admin app already has rate-limiting/idempotency services
- Client-side write throttling for spam-prone surfaces (comments, stories)
- Server-side rate limits once Functions exist

### Observability
- Structured logging of failed writes (already partially present, e.g., firestore service error logs)
- Error tracking, rule-denial monitoring, and function metrics: **required before any load-test claim**

### Load testing
- Required before the 10k claim: k6/Artillery against Firestore via Functions endpoints + emulator-based concurrency tests (see `14_TESTING_STRATEGY.md`)
- Measure: p95 read latency on feed, booking transaction throughput, listener fan-out cost, error rate under 2× expected peak

## Capacity Levers (when quotas bind)

1. Move feed reads to cached/paginated server aggregation
2. Shard hot counters
3. Trim listener scope (e.g., presence only for active chat)
4. Introduce CDN-cached public catalog endpoints (Functions + Hosting)
