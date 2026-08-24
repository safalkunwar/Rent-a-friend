# 13 — Failure Recovery

**Last updated:** 2026-08-24

---

## Prime Rule

> **Never silently display fake success.**

```
BAD:  "Booking confirmed"  when the Firebase transaction failed
GOOD: "Booking could not be completed. Please try again."
```

## Required Handling Matrix

| Failure | Required behavior |
|---|---|
| Firebase temporarily unavailable | Cached reads render (IndexedDB); writes fail fast with explicit toast/error; auto-retry listeners on reconnect |
| Slow network | Timeouts on critical writes; spinners must be honest (cancellable or with timeout message); never an infinite spinner |
| Offline mode | PWA shell + cached content; all write actions clearly disabled or erroring; queued-write illusion is FORBIDDEN unless a real durable queue with reconciliation exists (it does not today) |
| Request timeout | Surface "request timed out" + retry affordance; treat as unknown state, not failure-of-record (verify before retrying money ops) |
| Duplicate request | Idempotency: deterministic IDs (likes) / idempotency keys (bookings, payments, rewards); duplicate is a no-op returning the original result |
| Stale data | Timestamps + re-sync on focus/reconnect; never present cached data as fresh confirmation |
| Failed transaction (Firestore) | Roll back optimistic UI; show exact failure class (permission-denied vs unavailable vs contention); log to console/monitoring |
| Failed image upload | Keep the rest of the flow intact; allow retry of the upload alone; never save a doc referencing a missing image |
| Failed booking | Explicit failure message; NO booking doc shown as confirmed; slot lock released if the transaction aborted |
| Failed payment | Payment status stays `initiated`/`failed`; booking never auto-promotes to paid without server verification |
| Authentication expiration | Auth modal re-prompt; preserve the in-progress action where possible; never lose user context |

## Optimistic UI Rollback Contract

Optimistic updates are allowed ONLY for: likes, read receipts, cosmetic toggles. Every optimistic update must have a registered rollback path that fires on write failure, plus an error toast.

## Recovery Flows

1. **Listener loss**: Firestore SDK auto-reconnects; hooks must not stack duplicate listeners on reconnect (verify in tests)
2. **Transaction contention (booking race)**: loser receives a typed "slot taken" error → UI refreshes availability (see `08_CONCURRENCY_BOOKING.md`)
3. **Partial batch failure**: `writeBatch` is atomic — treat as all-or-nothing; on failure, no partial state is shown
4. **App crash / refresh mid-flow**: booking draft is ephemeral; on reload the user restarts the flow — no phantom "pending" bookings may exist without a corresponding transaction commit

## Error Surfacing Standards

- Toasts for transient failures with a retry action where meaningful
- Inline field errors for validation failures
- Full-page error states only for data-unavailable surfaces (with retry)
- Every unexpected error is logged (console today; error-tracking service required per `07_PERFORMANCE_SCALABILITY.md`)

## Anti-Patterns (explicitly forbidden)

- `catch {}` swallowing a failed write while the UI shows success
- Setting local state to "confirmed/paid/joined" before the backend promise resolves
- Hiding permission-denied errors behind generic "something went wrong" without logging
- Simulated delays standing in for real operations
