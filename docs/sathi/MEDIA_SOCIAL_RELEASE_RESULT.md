# Production media release — 2026-09-08

## Release status

Application commit `a22d863` was pushed to `main`; the existing Vercel integration reports success. Direct HTTPS retrieval from hamrosathi.vercel.app serves `index-DjasIYJ4.js`, containing the double-tap UI and not the old “View comments” control.

Production Firestore and Storage sources were read back and exactly matched the scoped candidates after newline normalization. The temporary cutover pause is **removed**. Never substitute the divergent root rules files for the scoped production-derived files.

- Firestore: `projects/hamrosathi1/rulesets/c59206e3-d6d9-4a48-9c8e-dcc7be66d58e`.
- Storage: `projects/hamrosathi1/rulesets/339a11d0-4c69-4e82-9f9d-0b2977de671d`.
- Rollback: `docs/sathi/rollbacks/2026-09-07T10-47-06-971Z-media-social/`.
- Historical Story comments were not purged. New Story comments are denied; their former newly deployed trigger was removed.

## Requested results

1. **Image optimization:** Browser decode/re-encode strips metadata, preserves aspect ratio, caps profile/Story/Event masters at 512/1920/1600 pixels, and generates 128/320/640 previews. WebP with JPEG fallback. This is not an unrestricted original-photo archive.
2. **Measured sizes:** A 365,277-byte repository logo became a 15,148-byte profile master and 3,066-byte preview in the live SDK test (Sharp fixture preparation, not the browser encoder). This is one synthetic input, not a camera-photo average or browser compression benchmark.
3. **Profile:** Live normal-user SDK upload, Storage metadata, canonical profile update and re-authenticated reread passed. Browser select/preview/upload/refresh was not repeated during this turn.
4. **Stories:** Two live uploads persisted distinct IDs and captions; second-user indexed reads succeeded. Binary uploads used normal Firebase client SDK authorization, not Admin bypass.
5. **Grouping:** One owner group containing both ordered Stories verified by live query and grouping function. Production Home visibly displayed one “SATHI rollout A” bubble.
6. **Expiration:** Live documents had exactly 86,400,000 ms between server creation and expiry. Query/viewer exclusion and expiry-boundary behavior are covered by emulator tests; no 24-hour wall-clock production wait was performed.
7. **Physical cleanup:** Expiry and orphan schedulers plus Storage/Story triggers are ACTIVE. Owned-path/generation-safe deletion and idempotency passed emulator checks. Live scheduled expiry deletion has not been observed end-to-end.
8. **Events:** Live authenticated user Event/media creation and second-user query/read passed. Event comments remain available. No admin UI redesign.
9. **Interactions/notifications:** Story likes only; Event likes and comments. Three real interactions generated three recipient-owned backend notifications in production. Emulator replay/unlike/re-like tests prove notification deduplication for the tested cases. A later browser double-tap on Story 2 persisted and remained liked after refresh; another double-tap did not unlike it.
10. **Deep links:** IDs route directly to Story/Event detail; only Event comment notifications request comments context. Story detail without comment controls and persisted like was verified using the exact release build served locally against live Firebase. Production notification-target IDs were verified through the SDK; clicking every recipient notification in production UI was not completed.
11. **App Check:** Both existing web app registrations use the production-domain Enterprise key. Enforcement was not enabled. Production browser token exchange returned 403 and SDK throttling; DOM diagnostic remained `unverified`. Registration alone does not prove valid tokens. Do not lower the score threshold or enable enforcement to force acceptance.
12. **Rules:** Scoped profile/media variants, Stories/likes, Events/interactions and notification authority only. Two source-scope tests confirm unrelated top-level Firestore branches and pre-existing unrelated helpers unchanged; Storage default deny remains. No CORS change. Cross-user profile/Story and moderation writes were denied in live SDK tests; Story comment write denied.
13. **Indexes:** Exact owner Story index `CICAgPi9ipAK`, public Event index `CICAgPjCqZkK` and Event comment index `CICAgJjm-pkK` verified READY. Existing public Story/notification indexes reused. The previously created Story-comment index `CICAgLjywZkK` is now unused; removed from candidate definitions, not blindly deleted in production.
14. **Functions:** Seven verified ACTIVE: onStoryLike, onEventLike, onEventComment, cleanupExpiredStories, onStoryDeletedMedia, onMediaUploadFinalized, cleanupMediaOrphans. Only the newly introduced onStoryComment was deleted. Unrelated functions were not deployed.
15. **Tests:** 251/251 main-app tests, 8/8 media-social emulator integration checks, 2/2 rule-scope checks; main/backend TypeScript and Vite/PWA build passed. Browser release-build double tap, animation DOM marker, refresh persistence, repeat-tap behavior and no Story comment controls verified. Gesture unit tests cover confirmation, failed-write no-animation, single-tap delay, distant taps and unmount cancellation. Production SDK acceptance passed with two disposable accounts.
16. **Remaining risks:** App Check 403 needs diagnosis before enforcement. The existing production browser/PWA kept an older cached asset despite reload, while direct server retrieval returned the new release; automatic PWA upgrade is not verified. Existing asynchronous aggregate counts may lag until refresh. No physical-device or 10k-concurrency validation. Existing large bundle warning, legacy counter baselines, shareable Storage download URLs, receipt retention, and cleanup throughput (50 expired Stories/15 minutes, 100 orphan tickets/hour) remain operational considerations.
17. **Recurring Blaze resources:** Two Scheduler jobs; Functions/Cloud Run execution, Eventarc delivery, Firestore reads/writes for receipts/notifications/cleanup, Storage operations/egress, and reCAPTCHA Enterprise usage as applicable. No measured cost estimate or concurrency claim. Firebase CLI warned build-image cleanup failed; registry retention/cost still needs inspection rather than broad image deletion.

## Disposable fixture cleanup

Additional pre-existing media authorization suite: **13/13 passed** against final rules, including unauthenticated Story-write denial and unrelated private-path denial. Its obsolete classification of Events as an unrelated forbidden upload path was updated to reflect the explicitly approved user-created Events scope; no production rules were loosened to satisfy the test.

Live test run: `media-social-c8f0100c-5ced-4228-ad29-050a7d1aa3b5`. Only generated QA accounts, profiles, content, interactions and media are in scope for removal. Cleanup completion is recorded below once verified; no real user content is part of that cleanup.

Cleanup verified complete: the interrupted harness left some fixtures, so the exact-run recovery script validated their identities, ownership, paths and Storage generations before deletion. A subsequent read-only run returned empty document, object, profile and Auth-account inventories. Both generated accounts and all identified test media/interactions/notifications/cleanup tickets are removed. These disposable records were permanently deleted; real user content and historical Story comments were not touched.
