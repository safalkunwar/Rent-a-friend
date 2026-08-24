# 03 — User Flows

**Last updated:** 2026-08-24
These are the canonical flows. Any implementation that diverges from these flows is a bug even if it "looks fine".

---

## Flow 1: Guest → Signed-in Customer
```
Visit app (guest mode)
  → Browse discovery feed, companions, events (read-only)
  → Tap a write action (book / message / like / join)
  → AuthModal opens (login / signup / become-a-guide tabs)
  → Firebase Auth success
  → users/{uid} profile created/merged
  → Original action resumes (or user is told to retry it)
```
**Rules:** Never lose the user's place. Never silently drop the action they were attempting.

## Flow 2: Discover → Book a Companion
```
Home feed / Companions tab
  → Companion card → View Profile
  → CompanionProfileModal
  → Book Now → BookingFlowModal (multi-step)
      Step: date + time + duration
      Step: participants + special requests
      Step: meeting point (map selector)
      Step: review (price in NPR: total = rate×hours×participants + fees)
      Step: payment method (Khalti / eSewa)
  → Submit booking
      MUST (target architecture, 08_CONCURRENCY_BOOKING.md):
        auth check → companion check → slot check → atomic reserve → booking doc → payment initiation
  → Success: confirmation + booking appears in Bookings tab
     OR failure: explicit error, NO fake "confirmed" toast
```

## Flow 3: Concurrent Booking Race (A/B/C/D same slot)
See `08_CONCURRENCY_BOOKING.md`. Exactly one wins; losers get a graceful "slot no longer available" with refreshed availability.

## Flow 4: Messaging
```
Companion profile → Message
  → conversations doc created/fetched (deterministic {uidA}_{uidB} id)
  → Messages tab opens thread
  → Real-time send/receive, unread counts, typing indicator
```

## Flow 5: Event Join/Leave
```
Events section → Join
  → (guest? auth first)
  → eventParticipantsService.joinEvent
  → Button: Join → Joined → (Full when capacity reached)
  → Leave reverses state
```
Capacity must ultimately be enforced in the same transaction that mutates participants (same class of race as bookings).

## Flow 6: Community Interaction
```
Feed → Like a post/story
  → optimistic UI flip + counter delta
  → Firestore like doc (deterministic id) / counter update
  → failure → rollback + error toast (never fake success)

Feed → Comment
  → auth check → comment doc create → counter increment
```

## Flow 7: Story Creation / Viewing
```
Stories row → Your Story (+) → CreateStoryModal → upload → stories doc
Stories row → tap story → full-screen viewer (5s progress, prev/next, like, delete-if-owner)
```

## Flow 8: Companion Onboarding
```
"Become a Companion" CTA / signup as guide
  → AuthModal (guide mode) → profile setup (ProfileEditModal)
  → guideApplications record
  → Admin KYC review (admin app) → approved → companion listing live
```

## Flow 9: Admin Moderation
```
Admin signs into /admin (same hamrosathi1 backend)
  → RBAC role check → dashboard
  → Queues: KYC, reports, bookings, users, security/SOS
  → Every action writes an auditLogs entry
```

## Flow 10: Offline / Degraded Network
```
App loads with no/flaky network
  → IndexedDB cached data renders (clearly stale-tolerant reads only)
  → Writes queue-fail fast with explicit error
  → Connectivity returns → onSnapshot listeners re-sync
  → UI must never present cached data as fresh confirmation of a write
```

## Flow 11: Payment (current honest state)
```
BookingFlowModal → Pay with Khalti/eSewa
  → paymentService.initiatePayment → gateway redirect
  → RETURN PATH IS NOT VERIFIED SERVER-SIDE (Blaze blocked)
  → Until webhooks exist, booking status must NOT be set to "confirmed/paid"
    based on client-side return alone
```
