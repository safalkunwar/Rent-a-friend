# Production Story/profile media rollout — 2026-09-06

## Scope and cause

The new bucket exists and preflight returns HTTP 200. The current uploaded log instead reports Storage HTTP 403 / `storage/unauthorized`: its active rules deny every path. Story reads report `failed-precondition`: the exact composite index was missing. The existing production Story create rule also requires string timestamps, while the real upload service uses a server timestamp and two-stage publication.

The original root `firestore.rules` and `storage.rules` failed the user's production scope gate and are NOT deployment inputs. The subsequent request to fix the current issue is implemented as a minimal candidate against captured production, in `ops/media-rollout/`, selected only by `firebase.media-rollout.json`. Application code, root rules, CORS, Cloud Functions and unrelated data are unchanged.

## Rollback and semantic comparison

The exact prior sources and release metadata are in `rollbacks/2026-09-06-production-rules/`. Active releases were re-read and still matched that backup before testing.

Only these changes are present:

- Firestore Stories: owned image identity, explicit publishing/active lifecycle, server creation time and exact 24-hour expiry; public query constrained to ACTIVE/PUBLIC/active; owner-only caption/finalization; trusted-claim moderation; owner cannot delete removed/restricted records to recreate the same identity.
- User photo fields: a dedicated owned-upload update and protected moderation branch. Existing broad owner/admin update clauses cannot bypass these photo checks. OAuth initial avatar bootstrap and all ordinary user fields retain existing permissions.
- New `sathiMedia*` / `sathiPhoto*` / `sathiProfilePhoto*` helpers are referenced only by those two branches. Existing shared helpers remain byte-for-byte unchanged.
- Storage: only `avatars/{uid}/{filename}` and `stories/{uid}/{filename}` enabled. Owned immutable creates require correct metadata, supported image MIME/extension, positive size and maximum 10 MiB. Public SDK reads check the canonical Firestore record; deletes require owner or trusted moderator. Every other path retains deny-all.

The source-scope test reverses the explicitly reviewed user-photo edits, removes the new helpers and masks only the Story block; it then requires exact equality with production. It also asserts the entire Storage match-path inventory. No new broad public write rule exists.

Community, comments, likes, story_likes, events/participants, bookings, companions/applications, conversations/messages, notifications, KYC, payments, referrals/rewards, admin records and every other existing Firestore branch are unchanged. All non-photo user permissions are unchanged. All non-Story/avatar Storage reads/writes remain denied, including KYC, private, posts and events.

## Tests

Run:

```powershell
& 'C:\Program Files\nodejs\node.exe' node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --config firebase.media-rollout.json --project hamrosathi1 --only firestore,storage '"C:\Program Files\nodejs\node.exe" --import tsx --test --test-concurrency=1 tests/production-media-gate.test.ts tests/production-media-parity.test.mjs'
```

The final candidate passed 15/15 tests, including 81 differential allow/deny checks and the removed-Story deletion denial. The rerun completed with exit code 0 (48.8 seconds). Candidate SHA-256: Firestore C3FD015AB478D9C65D19D1FAA92C3736679FBEA8EF58246B0CBEB5DC42180A34; Storage 10AA38490D12B512BF30F178254A99FB0ED29B7E9CCA8F2CA66CF6FCE0CDD0A1.

Media tests use the actual `saveMedia` and `visibleStoriesQuery`, not a mock repository. They exercise binary upload, persisted metadata, cross-user read/write, profile replacement, retry/deduplication, failed-write orphan cleanup, forbidden malformed uploads, moderation, expiry and bounded cursor pages. Separate negative cases cover unauthenticated Story writes, A-to-B upload paths, owner moderation/restoration and legacy profile-admin bypass. Regression comparison covers real production permissions, not assumptions from the stricter root files.

## Story index

Created the single approved COLLECTION index:

`projects/hamrosathi1/databases/(default)/collectionGroups/stories/indexes/CICAgNir3pgK`

State: READY. Fields: moderationStatus ASC, visibilityStatus ASC, status ASC, expiresAt DESC, __name__ DESC. Matches the three equality filters, expiry inequality/order and descending document-ID cursor in `src/services/mediaQueries.ts`. No unrelated indexes created/deleted.

## Deployment and production verification

The isolated candidate was deployed successfully. A read-back compared the complete active source with the tested local candidate and both matched exactly:

- Firestore release updated 2026-09-06T17:34:55.064759Z, ruleset `da300c1a-96a9-4f72-8a3d-7a68bf210b3a`.
- Storage release updated 2026-09-06T17:34:53.495835Z, ruleset `46c817a1-2a89-405f-9263-7f3c7d3888c2`.
- Compiler warnings concern pre-existing unused legacy helper functions; both rulesets compiled and were released.

The first live normal-client query succeeded (zero visible documents; no index error), but avatar upload still returned `storage/unauthorized`. Both newly created test accounts/profiles and any test artifacts were cleaned up without errors.

Investigation found the Firebase-managed Storage service account had its ordinary Storage service-agent role, but lacked `roles/firebaserules.firestoreServiceAgent`. Firebase CLI 13.35.1 `lib/rulesDeploy.js:65` returns early from this permission check in non-interactive mode. The missing role contains only `datastore.entities.get`.

Added that one read-only role to `service-932995524964@gcp-sa-firebasestorage.iam.gserviceaccount.com`, the documented prerequisite for Storage's Firestore-backed authorization helpers. No user/group membership, general role or application collection/path permission was changed. Before-state and exact rollback target are recorded in `ops/media-rollout/service-agent-change.json`. [Firebase cross-service requirements](https://firebase.google.com/docs/storage/security/rules-conditions#enhance_with_cloud_firestore).

### Live results — completed 2026-09-07

After IAM propagation, two separate normal-client probes passed (`media-rollout-fcbfe071-0148-4fbc-8d2a-bf9df4655b2e` and `media-rollout-93c95546-68c9-4293-8cf7-662249b11d08`):

| Check | Verified result |
| --- | --- |
| Exact public Story query | Successful; no missing-index error |
| Profile upload | Storage success, canonical users document updated, second user reads binary |
| Story upload | Storage success, server-created document finalized active, exact 24-hour lifetime |
| Indexed second-user Story visibility | Test Story present in the exact production query; direct record and binary reads succeed |
| Fresh authenticated SDK instance | Profile reference and Story query survive a new sign-in/client instance |
| Render URLs | Both return HTTP 200 and decode as the expected 120-by-120 synthetic PNG |
| Cross-user Story edit | DENIED |
| Cross-user profile photo edit | DENIED |
| Cross-user Story-path upload | DENIED |
| Owner changing Story moderation status | DENIED |

The probe `ops/media-rollout/production-smoke.ts` requires explicit live/project flags and uses ordinary non-admin SDK accounts for all assertions. IAM is cleanup-only for its own run-marked newly created profiles, with an update-time precondition. No existing account was impersonated.

### Actual browser UI checks

Performed against the current app at `http://localhost:3000`, connected to live `hamrosathi1`. This is not a claim that the Vercel build, mobile or installed PWA were independently tested.

- Guest Home displayed the test Story and retained it after a full page reload.
- An uploaded avatar was verified in the DOM as complete with naturalWidth/naturalHeight 120.
- Signed in normally through the profile-menu login form using disposable account A.
- Story: actual file chooser selected `public/sathi-logo-circle.png`; typed the caption “Temporary UI rollout verification — Story picker”; clicked Publish Story. UI progressed through uploading and server confirmation, closed the composer, and added the Story to Home. Opening it displayed the exact caption in the Story viewer. Image presentation has the caveat below.
- Profile: Settings → Account → actual Choose File → same logo → Upload profile photo. UI reported “Profile photo saved.” The canonical preview was complete, 1024 pixels wide, with computed opacity 1.
- Refreshed the authenticated Settings page; the account and avatar elements reloaded. The final post-refresh natural-dimensions measurement and the additional UI-specific second-user verifier were interrupted. Do not conflate them with the successful separate fresh-client/second-user SDK checks above.

### Cleanup

All generated profile/Story documents and media were removed. The held browser probe exceeded Firebase's recent-login window before Auth deletion; cleanup was corrected to reauthenticate its own disposable accounts before deleting them.

Recovery explicitly verified zero Story documents and absent profile documents for the two remaining generated UIDs, then deleted those two Auth accounts. Exact bucket-prefix inspection returned empty arrays (no continuation token) for both `avatars/` and `stories/` under:

- `cKgwJPpVJDZ6PAn9n8a0W70KK2y2`
- `afVDWdU438ZblsEPtGtVbNiotpG2`

No existing user's data was removed. Deleted fixtures are disposable verification records; no recovery copy was retained. All earlier probe cleanups completed without errors.

## Confirmed UI follow-ups — NOT fixed during this rollout

1. **Loaded images can remain hidden.** Browser DOM inspection returned `complete: true, naturalWidth: 120, opacity: 0` for two Story-strip images while the header copy had opacity 1. `src/components/ui/SafeImage.tsx` resets loading in a src effect and hides the image while loading; a cached-load/reset race is a plausible cause, not yet isolated by a regression test. The Story viewer also showed its image-loading placeholder while the correct persisted caption was visible. Do not claim fully verified Story-image presentation.
   - Proposed fix: make image readiness resilient to cached/already-complete images; test uncached load, cached mount, source replacement, errors and remount/refresh. Review whether the five-second Story advancement should wait for image readiness.
   - Regression risk: shared component affects avatars, feeds and other media, so verify all fallback types.
2. **Guest Story Sign In entry does not open login.** Clicking Your Story → Sign In closed the prompt without displaying authentication. The profile-menu Sign In / Register path worked. `AppContext.openAuthModal` dispatches `sathi_open_auth_modal`; verify the event consumer and connect the dialog entry consistently.
   - Proposed fix: connect the existing auth-modal trigger; test the guest Story entry and profile-menu entry without duplicating auth state.
   - Regression risk: shared auth prompts across features.

Both need application-code approval. No React, styling or application service code was changed in this rollout.

## Preserved risks and limits

- Differential tests explicitly reproduce existing cross-user conversation writes and favorites writes. This patch does NOT harden those unrelated branches; they need separate approval and urgent remediation.
- Existing Story like-counter permissions are intentionally preserved, not made transaction-enforced in this rollout.
- Media moderation authority now requires trusted super_admin/moderation_admin claims (legacy admin boolean is supported only when no explicit role is present), never editable profile/admin-document role data. This is limited to media branches.
- Firebase download-token URLs already issued by the application are bearer links. Hiding a document or denying an SDK read is not proof that a previously copied download URL has been revoked. A full takedown requires a separately reviewed trusted token-revocation/deletion path; not an application-code change in this rollout.
- Existing Stories without the canonical status/expiry fields remain outside the new query. No temporary-record migration is performed.
- The browser notification warning is a user/browser permission state, separate from Storage/Firestore failures.
