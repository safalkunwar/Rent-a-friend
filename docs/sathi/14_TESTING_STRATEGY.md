# 14 — Testing Strategy

**Last updated:** 2026-08-24

---

## Current Baseline

- Main app: Vitest, `src/__tests__/` (146 tests; 1 intermittent timeout in `services.test.ts` — passes in isolation, root cause open)
- Admin app: Vitest, `admin/src/__tests__/` (38 tests: RBAC, rate limiting, idempotency, health, aggregation)
- Feed: `feed-generator.test.ts` with 15 scenario cases (CASE 1–10 + dedupe/mixing/location/empty)

**Run commands:** `npx vitest run` (root), `cd admin && npx vitest run` (admin).

## Required Test Layers

| Layer | Scope | Status |
|---|---|---|
| Unit tests | Pure logic: feedGenerator, scoring, validation, money math (NPR) | ✅ partial (feed well covered) |
| Integration tests | Services ↔ emulator Firestore: hooks, repositories, booking service | ❌ to build |
| Firebase security tests | `@firebase/rules-unit-testing` against `firestore.rules`: every allow/deny path per role | ❌ to build |
| **Concurrency tests** | **Booking race: N users → same companion/slot → exactly one success** | ❌ to build (CRITICAL) |
| Booking race-condition tests | Idempotent retries; lock release on abort; payment gated on lock | ❌ to build (CRITICAL) |
| Multi-user tests | Emulator with multiple auth contexts; cross-user isolation assertions | ❌ to build |
| Mobile tests | Responsive rendering of shared components; mobile feed parity with desktop logic | ❌ to build |
| Desktop tests | DiscoveryFeed progressive reveal, grouping, lightbox | ❌ to build |
| Network failure tests | Offline/timeout/duplicate-request paths; rollback of optimistic UI | ❌ to build |
| Load tests | k6/Artillery against Functions endpoints + emulator; p95 latency, error rate at 1× and 2× target peak | ❌ to build (required for any 10k claim) |
| Pagination tests | Cursor correctness: no dupes, no reordering, append-only stability, new-item arrival mid-session | ❌ to build (pairs with first fix) |
| Authentication tests | Sign-in/out, persistence, profile merge, expiration handling | ❌ to build |
| Authorization tests | Rule-level: customer vs companion vs each admin role; escalation attempts must deny | ❌ to build |
| Admin tests | RBAC denials, audit-log writes, idempotency of admin actions | ✅ partial (38 tests) |

## The Flagship Test (must exist before booking is called "working")

```
Scenario: 4 concurrent users (A, B, C, D) book companion X, slot 2026-09-01 10:00
Emulator: Firestore with production rules loaded

Assert:
  1. Exactly ONE booking doc created with status pending/confirmed
  2. Exactly ONE booking_locks doc for lock_X_2026-09-01
  3. B, C, D receive a typed SLOT_TAKEN error (not a crash, not a fake success)
  4. Availability query after the race reflects the slot as taken
  5. No payment initiation exists for B, C, D
  6. Retrying A's exact request (same idempotency key) returns the original booking — no duplicate
  7. Cancelling A's booking releases the lock atomically
```

## CI Gates (definition of "tests pass")

1. `npx vitest run` — 0 failures (flaky timeout must be fixed, not skipped)
2. `cd admin && npx vitest run` — 0 failures
3. `npm run build` (root + admin) — success
4. Rules tests — 100% of declared deny paths verified

## Test Data Policy

- Tests use the **Firebase Emulator Suite** with synthetic fixtures — never the production `hamrosathi1` instance
- Seed scripts (`src/scripts/seed.ts`) are dev-only tooling; running them against production is forbidden (rule 1, `15_NON_NEGOTIABLE_RULES.md`)
