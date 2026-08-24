# 08 — Booking Concurrency

**Last updated:** 2026-08-24
**Severity: CRITICAL.** This document defines mandatory behavior. Current implementation is NOT yet fully compliant — the gap is stated honestly at the end.

---

## The Problem

Users A, B, C, D attempt to book the **same companion, same date/time slot** at approximately the same moment.

## The system must NEVER allow

- double booking
- overlapping confirmed bookings
- race-condition-based availability
- inconsistent companion availability
- two users receiving the same booking slot
- payment being accepted for an unavailable slot
- UI showing "available" after the slot has been reserved

## Server-Authoritative Booking Process (target architecture)

```
User requests booking
        ↓
Validate authentication            (rule layer: isCustomer, uid matches doc)
        ↓
Validate companion exists & active (companions/{id})
        ↓
Validate requested time            (format, future date, within availableDays)
        ↓
Check availability ATOMICALLY      (transaction reads bookings + booking_locks
        ↓                            for companionId+date)
Reserve slot                       (create/claim booking_locks/lock_{companionId}_{date})
        ↓
Create booking                     (status: pending, paymentStatus: initiated)
        ↓
COMMIT transaction                 (all-or-nothing: lock + booking + counter)
        ↓
Notify user + companion            (notifications docs; FCM when available)
```

## Simultaneous Requests

```
Request A → transaction commits first → slot reserved → booking created
Request B → transaction contention / lock exists → FAILS GRACEFULLY
            → user sees: "This slot was just taken. Here are the nearest available times."
Request C, D → same graceful failure path with refreshed availability
```

Alternative acceptable pattern where product wants soft-holds:
```
Request A → reserves (hold with TTL, e.g., 10-minute lock)
Request B → receives updated availability ("held by another user, try again at HH:MM")
```

## Enforcement Layer

This **must be enforced at the backend/database level** — Firestore transaction or Cloud Function — **NOT merely by disabling a frontend button.**

- The frontend button state (Join/Full/disabled) is UX sugar only.
- The rules file must reject any booking/lock write that the transaction path didn't authorize.
- Payment initiation may only proceed **after** the booking transaction commits. Payment confirmation may never precede slot ownership.

## Idempotency

- Client generates an idempotency key (UUID) per booking attempt; retries reuse it.
- Server path: if `bookings` already contains a doc with that key (or the lock maps to an existing booking), return the existing booking instead of creating a second one.
- A network retry must never create a second booking or a second payment record.

## Cancellation & Release

- Cancellation releases the lock in the same transaction that sets booking status to `cancelled`.
- Expired unpaid holds (TTL pattern) release via scheduled function once Blaze is available; until then, locks without a confirmed booking are treated as expired by the availability check's timestamp validation.

## Current Implementation Status (honest)

| Piece | Status |
|---|---|
| `booking_locks` collection + create-if-not-exists rule | ✅ exists |
| Client-side availability check before booking | ✅ exists |
| Single atomic transaction spanning lock + booking + payment gating | ❌ NOT yet — booking creation and lock are separate client operations |
| Server-side (Cloud Function) booking endpoint | ❌ blocked on Blaze plan |
| Graceful "slot taken" UX with refreshed availability | ⚠️ partial (error toast exists; availability refresh UX incomplete) |

**First implementation task** (see `00_MASTER_OBJECTIVE.md` → recommended order): convert the booking path to a single client-SDK Firestore transaction now (works without Blaze), and move it into a Cloud Function when Blaze enables — the transaction logic ports 1:1.

## Required Tests

See `14_TESTING_STRATEGY.md` — booking race-condition suite: N simulated users, same slot, exactly-one-winner assertion, idempotent-retry assertion, payment-after-lock assertion.
