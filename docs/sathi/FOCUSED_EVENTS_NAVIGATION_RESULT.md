# Focused Events and navigation — 2026-09-09

## Delivery status

Local implementation only. No Firebase deployment, index mutation, production data migration, commit or push was performed for this task. Existing uncommitted Navbar/Explore-partner changes were preserved. The scoped rules candidate is `ops/media-rollout/firestore.rules`, selected by `firebase.media-rollout.json`; the unrelated root rules are not a safe deployment substitute.

## Canonical Event contract

- Reuses `events/{eventId}.spots` for maximum participants: required integer 1–10,000. New user-created Events also have `participantCount: 0`, `participationVersion: 1`, and `status: ACTIVE`.
- Reuses `event_participants/{eventId}_{auth.uid}` with joined/cancelled states. No UID array or new membership collection.
- Joining/leaving reads exactly the Event and own membership in a Firestore transaction. Rules require both sides of the same transition, exact counter delta and bounded count. Joining additionally requires public, active, unmoderated, future content. Direct unpaired counter writes are denied.
- Duplicate membership operations are idempotent. A bounded retry handles a rules conflict only after a fresh server read proves another count change; a full Event reports `Event is full`. Genuine authorization failures are not blindly retried.
- Existing records without a verified version/count cannot accept new joins. Legacy members can still cancel without inventing a count. Trusted reconciliation of actual joined documents and capacity is required before enabling legacy/admin-created Events. No sample record migration was performed.

## Deletion

The existing Event service now owns deletion. Event detail shows Delete Event only to its authenticated owner and reuses the existing Modal with the requested confirmation wording. Cancel does not call Firebase. Failure remains visible and does not claim success.

Deletion atomically marks the parent DELETED/private and unlinks media; relationships remain as history. Normal listings exclude it and owners cannot restore it. Members retain direct tombstone access to cancel; participant identities are restricted to the participant, Event owner and trusted admin. The unused nested participants path no longer accepts normal-user writes.

Only paths under the authenticated owner's Event prefix with matching Storage owner/content metadata are deleted, after the canonical tombstone succeeds. Media cleanup failure is explicitly reported as pending. Existing orphan tickets can reclaim unlinked uploads; old media lacking tickets may need manual cleanup. No Storage rules or cleanup functions changed.

## Navigation

- Removed only Events from the mobile bottom bar; Home/Discover/Explore/Messages/Alerts remain. The Events content filter, route, cards and Create Event entry remain.
- Desktop Companions opens the existing discovery UI at `/companions`. The UI was moved into a local render helper for reuse, not reimplemented; Companion queries/cards/booking and the Explore partner section were not redesigned.
- Desktop Activities uses `/explore#activities-section` and scrolls after route rendering. Mobile tab scroll restoration no longer overrides desktop navigation. The single section target has sticky-header clearance.

## Verification evidence

- 256 main-app tests passed across 31 files, including five new Event-action/form cases.
- 16 real Firestore/Storage emulator integration cases passed: eight capacity/deletion tests plus eight existing media-social regressions. Coverage includes 20 seats/21st rejection, final-seat race, duplicate join/leave, cancellation/rejoin, legacy cancellation, owner soft delete, actual image removal, cross-user denial, restore denial, Event image upload/likes/comments and notification handler deduplication. These are emulator/handler results, not live production acceptance.
- Three source scope checks passed: only Event and canonical membership branches differ from the last published candidate; Storage is unchanged; historical unrelated media-rule branches are preserved.
- TypeScript and Vite/PWA build passed. Existing large-bundle warning remains.
- Local guest browser: desktop Activities reached the existing section at approximately 96px below the viewport top, Companions discovery rendered, browser Back returned to Activities, and desktop Events listed content. At 390×844 the five-item bottom bar has no Events button; Events listing/Create Event and a real Event detail deep link still rendered. Discover and Home were exercised. No error-level console entries were captured in this test session.

## Limits and release prerequisites

App and Event rules require a coordinated approved release; publishing the app alone against old rules will reject the new Event create/participation contract. Before any production deployment, refetch active rules, preserve rollback and repeat the Event-only semantic gate. No indexes are added: transactional reads use exact document IDs; existing listing/participant-query indexes remain in use.

No physical-device, live authenticated owner-delete/join, or high-load acceptance claim. A single popular Event remains a contended document; 10,000 is an input bound, not a concurrency validation. Card counts can become stale until refetch; the transaction remains authoritative. Dedicated native Event sharing UI was not found in the inspected Event detail/cards; existing direct Event URLs remain accessible, but native sharing was not added or claimed tested. Older App Check/PWA rollout issues are outside this task.
