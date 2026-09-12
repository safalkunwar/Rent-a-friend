# Event participant index release gate — completed 2026-09-12

## Scope

This gate targets only the two exact `event_participants` collection query shapes in `src/services/eventParticipants.ts`:

1. `userId == uid`, `status == joined`, `joinedAt DESC`.
2. `eventId == eventId`, `joinedAt DESC`.

The candidate contains exactly these two composite indexes and no field overrides. It cannot deploy Firestore rules, Storage rules, Functions, Hosting, Auth configuration, Firestore documents, rules migrations, booking/payment code or Event participation policy.

## Preconditions

- `node --test tests/event-index-contract.test.mjs` must pass.
- Run the read-only preflight after explicit authority:

```powershell
node ops/event-indexes/preflight.mjs --approved-read-only
```

- Review the newly saved local index inventory. Stop if the candidate expands beyond two `event_participants` collection indexes or if either application query changes.

## Approved candidate deployment

The deploy command is intentionally opt-in and rejects any extra argument:

```powershell
node ops/event-indexes/deploy.mjs --project=hamrosathi1 --approved-index-deploy
```

It creates only missing exact composite indexes, polls their metadata for at most 60 seconds, and fails unless both are `READY`. It saves a local deployment result. It does not contain Firebase rule, document, Storage, Auth, Function or Hosting calls.

## Acceptance after indexes are READY

Use Firestore REST `runQuery` with generated non-existent event/user values and the exact query orders. A zero-row HTTP 200 result proves index availability without reading actual attendees or testing permissions. End-user join/create/delete is intentionally out of scope because its current contract depends on excluded Event rules-policy work.

## Completed release evidence

- The scoped static contract test passed: two candidate indexes only, matching the two service query shapes.
- Read-only preflight at `2026-09-12T15:07:23.202Z` found exactly one `READY` match for each candidate. Its inventory is retained at [rollbacks/event-indexes-2026-09-12T15-07-23-200/preflight.json](rollbacks/event-indexes-2026-09-12T15-07-23-200/preflight.json).
- Final candidate-only deployment readback at `2026-09-12T15:07:56.772Z` created no further index and confirmed both candidates `READY`; see [rollbacks/event-indexes-2026-09-12T15-07-56-765Z/deployment-result.json](rollbacks/event-indexes-2026-09-12T15-07-56-765Z/deployment-result.json).
- Read-only `runQuery` probes for `eventId / joinedAt` and `userId / status / joinedAt` both returned HTTP 200 with generated values that cannot match an attendee record.
- Firestore rules, Storage, Functions, Hosting, Auth, Firestore documents, Event participation policy, bookings, payments and staff authority were untouched.

## Limits

This gate does not make Event joining, roster privacy, capacity counters, creation, deletion or legacy records production-qualified. Those are rules/data-contract changes and remain excluded by the current instruction to skip permission and payment work.
