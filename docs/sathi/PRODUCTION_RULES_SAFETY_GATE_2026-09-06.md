# Production rules safety gate — STOPPED

**Historical result for the broad root rules.** The subsequent minimal candidate rollout and live results are recorded in [PRODUCTION_MEDIA_ROLLOUT_2026-09-06.md](PRODUCTION_MEDIA_ROLLOUT_2026-09-06.md). The root files were not deployed; the separate candidate and exact Story index were deployed after their own successful safety gate.

## Decision

No production rule or index deployment was performed. The requested semantic-scope gate failed: the checked-in rule files are not limited to Stories, Story media, or profile photo media relative to the active production releases.

## Exact rollback artifacts

The active release sources were fetched read-only on 2026-09-06 and preserved before any deploy attempt:

- `rollbacks/2026-09-06-production-rules/firestore.rules`
  - Release: `projects/hamrosathi1/releases/cloud.firestore`
  - Ruleset: `projects/hamrosathi1/rulesets/1e525175-decd-4957-8c03-c41efd1d89ed`
  - Release updated: `2026-09-04T16:46:40.593099Z`
  - SHA-256: `0B133BB9495A7920C7ADE9A9F3F285BB8AF3B921821830865CCE957E4E683946`
- `rollbacks/2026-09-06-production-rules/storage.rules`
  - Release: `projects/hamrosathi1/releases/firebase.storage/hamrosathi1.firebasestorage.app`
  - Ruleset: `projects/hamrosathi1/rulesets/a6a1bdb8-9113-4eb8-8b1c-5c93af389ad7`
  - Release updated: `2026-09-06T17:07:09.778929Z`
  - SHA-256: `E656D238EE388D951268CA38D1ECA2DBF2F5FDC55EF4B20E22911413D36C935B`

`release-manifest.json` records the same release identifiers and capture time.

## Semantic-diff result

### Firestore — failed scope gate

The active production file is the prior broad rule model. The local file has 396 added and 555 removed lines relative to that active source and changes common helper/role semantics plus these unrelated branches: users and favorites, companions, companion applications, bookings and locks, payments, reviews, community posts, comments, likes, conversations/messages/typing, notifications, events/participants, activities/catalog, reports, support, feedback, SOS, audit/presence, KYC-adjacent application and verification records, locations/reminders, analytics, and suspicious activity.

The local Story and profile-photo branches are stricter and are within the requested feature scope, but deploying the whole Firestore file would also replace authorization for the unrelated paths above. It is therefore not safe to represent the production change as Story/profile-only.

### Storage — failed scope gate

The newly provisioned bucket currently has Firebase's default deny-all source (`match /{allPaths=**} { allow read, write: if false; }`). The local file enables and governs posts, avatars, Stories, events, KYC, private documents, public/activities, verification, and admin paths. Although avatar and Story paths are intended changes, KYC/private/events and other paths are outside this rollout's permitted scope.

## Story-index validation

`visibleStoriesQuery` requires exactly:

1. `moderationStatus` ascending
2. `visibilityStatus` ascending
3. `status` ascending
4. `expiresAt` descending
5. `__name__` descending

This matches the checked-in Story composite index and the query's equality filters, `expiresAt > now`, `orderBy('expiresAt', 'desc')`, and descending document-ID cursor tie-breaker. The index was intentionally not created after the stop condition triggered.

## Tests and deployment state

The prior scoped emulator tests remain green, but they are not a production-rules comparison. Per the stop condition, no further rollout test or production Story/profile upload was attempted after the semantic diff failed.

No CORS setting was changed. The new bucket's Firebase Storage preflight returned HTTP 200 before this gate.

## Safe next step

Create a deliberately minimal production rules patch against the archived active sources, limited to Story, avatar, and strictly required helpers. Independently decide whether the new bucket needs a separately reviewed Storage policy for KYC, events, and private paths; do not infer that approval from this media rollout.
