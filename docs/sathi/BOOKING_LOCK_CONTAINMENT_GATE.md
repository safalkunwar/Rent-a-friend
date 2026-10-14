# Booking/lock compatibility gate — updated 2026-09-14

## Current status — 2026-10-12

The separately approved paired booking/lock candidate is now active as ruleset `e8b7524d-3fc8-4aa4-b19f-e89c3bedfac1`; the [release result](BOOKING_COMPATIBILITY_RELEASE_RESULT_2026-10-12.md) records exact source readback and dedicated-account acceptance. The [post-release inventory](rollbacks/booking-compatibility-2026-10-12T14-10-52-117Z/manifest.json) confirms 105 legacy bookings, zero v2 and one consistent lock, with no migration. The active hash is `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f`. This is only the booking/lock containment slice; companion approval authority and the other Phase 0 release gates remain open.

## Current result

The original staff-only lock draft described below is **superseded and not safe to deploy**. Real `reserveBooking()` failed at its initial missing-booking read, and ordinary customer lock writes were incompatible by construction. The tracked candidate now changes both bookings and locks together, from active source `764eb7a3...`, using the existing v2 transaction policy.

Candidate: `ops/booking-containment/candidate.firestore.rules`, SHA-256 `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f`. **Released 2026-10-12.** The current rerun passed 29/29 real-transaction emulator checks and 6/6 static/rollback checks; dedicated-account live SDK acceptance passed 5/5 with cleanup verified. Existing booking/lock read grants are preserved; mutations require validated paired writes, quote/initial payment state, actor/time transitions and immutable ownership. See [the release result](BOOKING_COMPATIBILITY_RELEASE_RESULT_2026-10-12.md) and [the original repair result](CONTINUATION_REPAIR_RESULT_2026-09-14.md).

The before-release and after-release bounded inventories found 105 legacy bookings, zero v2 and one valid linked lock. No records were migrated/deleted. Existing companion/approval flags remain a separate authority risk. Current source is the released paired candidate; future scoped candidates must compose from the current active source and take a fresh rollback capture. The older pre-deployment rollback noted below is historical and is not the active baseline.

The cached emulator 1.19.8 passed these tests using installed Java 17. The old Java-21 blocker below was not applicable to this available test path.

## Historical rejected lock-only draft — September 13

## Purpose

Replace the unscoped `booking_locks/{lockId}` rules in the active deployed source (`764eb7a3...`) with a containment candidate that scopes writes to verified booking administrators, validates lock fields on create, and restricts updates to valid status transitions.

This gate starts from the **active** production rules and changes **only** the `booking_locks` branch. It does **not** use the unsafe archived booking draft (`ops/containment/candidate-booking.firestore.rules`) which had:
- A `lockBookingId` helper scoped outside the match block (parsed as unrelated)
- A `companionId`/`date` field-presence check that blocked legitimate companion edits
- No authorization on lock creation beyond `isAuthenticated()`

## Candidate

| Artifact | Path | SHA-256 |
|---|---|---|
| Baseline (active source) | `docs/sathi/rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z/firestore.rules` | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` |
| Containment candidate | `ops/booking-containment/candidate.firestore.rules` | `3976a456593afb7a2630f015a7dd8c69a150b843c7a4cd115d1d5004ea3ed6ee` |

Deployment: **NOT PERFORMED**. No production mutations.

## Changes

### Booking Locks Collection: `/booking_locks/{lockId}`

| Operation | Before (baseline) | After (candidate) |
|---|---|---|
| Read | `isAuthenticated()` | `isAuthenticated()` (unchanged — needed for user-facing availability checks) |
| Create | `isAuthenticated()` + uniqueness | `isBookingAdmin()` + uniqueness + field validation (`bookingId`, `companionId`, `date`, `status`, `updatedAt`) + `status == 'pending'` + date format validation |
| Update | `isAdmin()` | `isBookingAdmin()` + only `['status', 'updatedAt']` keys + valid transition graph |
| Delete | `isAdmin()` | `isBookingAdmin()` |

### Valid lock status transitions

```
pending → confirmed, cancelled
confirmed → active, cancelled
active → completed, cancelled
```

These match the booking policy in `bookingPolicy.json` where lock and booking status are updated in the same transaction.

### Field validation on create

- `status` must be `'pending'` (locks are created in pending status per `bookingTransactions.ts:42`)
- `companionId` must be a non-empty string
- `date` must match `^\d{4}-\d{2}-\d{2}$` (validated per `bookingLockId` in `bookingPolicy.ts:9`)
- `updatedAt` must be a string (ISO timestamp)

## Data model

Lock documents contain: `bookingId`, `companionId`, `date`, `status`, `updatedAt`.
Lock ID: `lock_${companionId}_${date.replace(/[^a-zA-Z0-9]/g, '_')}`.

## App integration

The app code in `src/services/bookingTransactions.ts` creates locks with `status: 'pending'` and updates only `status` + `updatedAt` on booking transitions. The `src/services/bookings.ts` availability check reads locks to check cancellation status. All app write patterns are compatible with the candidate.

## Verification

- Static contract: 6/6 pass (`tests/booking-lock-containment.test.mjs`)
- Hash match: candidate `3976a45` composed from baseline `764eb7a3`
- Reversibility: replacing the new block restores the baseline exactly
- Byte-identical: all content outside `booking_locks` is unchanged
- TypeScript: `tsc --noEmit` passed
- Main app tests: 309/309
- Admin app tests: 41/41

## Blocker / Next step

This candidate is a LOCAL static artifact. It has not been validated in the Firestore emulator (Java 17 detected; emulator requires Java 21+). The emulator-based test `tests/payment-write-containment.test.mjs` (20/20) and `tests/staff-assignment-containment.test.mjs` (19/19) were validated by the prior session against the active source. A booking-lock emulator test requires Java 21+ or a separately approved test environment.

**Next steps requiring owner approval:**
1. Install Java 21+ and run the booking-lock emulator containment suite (estimated 20 cases).
2. If the suite passes, request separate deployment authorization for the `booking_locks` branch only.
3. After booking-lock containment is production-verified, proceed to staff resource-level RBAC or Event policy.
