# Event participant index release result — 2026-09-12

## Result

PASS. The two composite indexes required by the real `event_participants` service queries are `READY` in Firestore project `hamrosathi1`.

| Production query shape | Result |
| --- | --- |
| `userId == uid`, `status == 'joined'`, `joinedAt DESC` | One exact `READY` composite; zero-row production probe returned HTTP 200 |
| `eventId == eventId`, `joinedAt DESC` | One exact `READY` composite; zero-row production probe returned HTTP 200 |

## Evidence

- Candidate definition: [ops/event-indexes/event-participants.indexes.json](../../ops/event-indexes/event-participants.indexes.json), SHA-256 `0949fa6493f199ec45c9a89ae774f9b42a6e34190cb5c9d3642e86e3baddfdbe`.
- Ready-state preflight: [rollbacks/event-indexes-2026-09-12T15-07-23-200/preflight.json](rollbacks/event-indexes-2026-09-12T15-07-23-200/preflight.json).
- Final candidate-only deployment readback: [rollbacks/event-indexes-2026-09-12T15-07-56-765Z/deployment-result.json](rollbacks/event-indexes-2026-09-12T15-07-56-765Z/deployment-result.json). It reports `created: []` because both previously requested indexes had already reached `READY`.
- `node --test tests/event-index-contract.test.mjs`: 2/2 passed.
- `node ops/event-indexes/verify-queries.mjs --approved-read-only`: both exact query probes passed. The generated predicate values were deliberately not logged and cannot retrieve attendee rows.

## Untouched scope and limits

This was an index-only release. It did not deploy or edit Firestore rules, Storage rules, Functions, Hosting, Auth, Firestore documents, Event creation/joining/removal behavior, capacity counters, roster privacy, bookings, payments, or staff permissions.

The indexes remove the known query-planning gap only. Event participation and its policy-dependent writes are not production-qualified by this result.
