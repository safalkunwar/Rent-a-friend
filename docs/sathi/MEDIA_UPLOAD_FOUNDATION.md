# Media upload foundation — 2026-09-05

Local implementation and verification report. Scope: Stories, user profile photos and event images. User expressly approved only the image picker in the existing admin event form. P0 stabilization remains paused. No production upload, migration, rules/index deployment, billing change, Functions deployment or load test was performed.

## 1. Existing architecture reused

Firebase Auth UID remains ownership authority. The existing Firebase project/bucket initialization is reused without changing configuration. Binary files go to Storage; metadata stays in `users`, `stories` and `events`. No global media collection, upload counter or shared mutable Story array was introduced.

The scoped audit found a working basic Story upload but missing moderation fields, unreliable URL-to-path cleanup, no profile-photo picker, and an admin-only event form accepting an arbitrary image URL. Existing Story reads also merged stale offline/session data. These paths now use one explicit-dependency upload implementation. Main-app callers use the existing SocialRepository or a thin application binding; the authorized event form injects its own admin Firebase instances. Existing post/KYC upload code is not repurposed.

## 2. Files changed in this task

Paths below are relative to `D:/Sathi`. Other dirty files belong to earlier work and are not part of this media task.

| Area | Files |
| --- | --- |
| Shared media contract and persistence | `src/services/mediaContract.ts`, `mediaUploadCore.ts`, `mediaUploads.ts`, `mediaQueries.ts` |
| Existing integration | `src/repositories/SocialRepository.ts` (Story methods only), `src/context/AppContext.tsx` (Story API signature only), `src/services/profileBootstrap.ts` (photo visibility projection only), `src/types.ts` |
| Story reads/rendering | `src/hooks/useVisibleStories.ts`, `src/hooks/useFirestoreData.ts` (Story hook and event-media read boundary), `src/ClientApp.tsx` (selected Story server revalidation only) |
| Photo controls | `src/components/modals/CreateStoryModal.tsx`, `ProfilePhotoUpload.tsx`, `ProfileEditModal.tsx`, `src/components/settings/SettingsTab.tsx` |
| Approved event picker | `admin/src/pages/AdminContent.tsx`, `admin/vite.config.ts` (shared Storage/Auth SDK deduplication) |
| Firebase | `firestore.rules`, `storage.rules`, `firestore.indexes.json` |
| Tests | `src/__tests__/stories.test.ts`, `media-upload-ui.test.tsx`, `media-query-lifecycle.test.tsx`, `admin/src/__tests__/event-media.test.tsx`, `tests/media-flows.test.ts` |
| Documentation | This report; `docs/sathi/CHANGELOG.md` |

No Home composition/ranking algorithm, palette, booking, payments, likes, comments, messaging, KYC or referral implementation was changed in this task. Existing security tests for those boundaries were run without changing their code.

## 3. Firestore schema and fields

| Document | Image metadata | Identity / time |
| --- | --- | --- |
| `users/{uid}` | existing `avatar`; `photoPath`, `photoModerationStatus`, `photoVisibilityStatus`, `photoReportedCount` | document ID is the owner/content ID; `photoUpdatedAt` |
| `stories/{randomId}` | existing `imageUrl`; `mediaPath`, `mediaType: image`, `moderationStatus`, `visibilityStatus`, `reportedCount` | `id`, authenticated `userId`, `contentType: story`, existing `createdAt`/`updatedAt` ISO strings; `expiresAt` is now a Firestore Timestamp |
| `events/{eventId}` | existing `imageUrl`; `imagePath`, `imageOwnerId`, `mediaModerationStatus`, `mediaVisibilityStatus`, `mediaReportedCount` | existing event ID, `imageUpdatedAt`; existing event summary retained |

Stories retain zero initial engagement counters; no engagement implementation is changed. Optional captions are not replaced with fabricated travel text. New Stories do not invent companion participation or external avatar URLs. Profile updates preserve the app's normalized Auth role/claims instead of copying raw profile authority fields into context.

Events remain admin-controlled: existing content-authorized roles create events. The first image uploader becomes `imageOwnerId`; another ordinary content creator cannot overwrite that image. This does not silently grant normal users event-creation authority.

The UI saves metadata only after Storage acknowledges the upload and supplies its download reference. Immutable binary IDs and stable per-selection drafts allow retries. Firestore transactions prevent retries from resetting existing counters/moderation. When a definitive metadata failure occurs, cleanup deletes only the just-uploaded object after a server read proves it is not referenced. Lost binary acknowledgements are recovered by checking that exact object's metadata, not by overwriting or scanning the bucket.

## 4. Storage paths

- Profile: `avatars/{authUid}/{randomMediaId}.{jpg|jpeg|png|webp}`.
- Story: `stories/{authUid}/{randomMediaId}.{extension}`; the independently stable Story ID is stored in object metadata `contentId`.
- Event: `events/{uploaderUid}/{randomMediaId}.{extension}`; object `contentId` is the existing/new event ID.

Metadata binds `ownerUid`, `category` and `contentId`. The application bucket remains `hamrosathi1.firebasestorage.app`; rules also recognize the legacy project bucket reference format. Emulator tests explicitly select the actual bucket name on loopback. No real bucket was created.

Validation: registered Auth session, owned path, non-empty file, <=10 MiB, matching JPEG/PNG/WebP MIME and filename extension, and client-side signature checks. Rules repeat ownership/MIME/size/extension validation. Overwrites and owner metadata reassignment are denied. Firestore reference checks restrict the URL to a project bucket and the matching owned path (plus explicit loopback emulator transport). They cannot prove Storage object existence or decode/scan its bytes; trusted finalization is a future backend boundary.

No binary, base64, blob or preview URL is saved to Firestore. Previews use temporary object URLs and revoke them when replaced/unmounted.

## 5. Moderation and reporting fields

Publish-first policy: a newly uploaded image starts `ACTIVE` / `PUBLIC`. This is a visibility policy, not a certification or automated content scan. Supported moderation states: `ACTIVE`, `UNDER_REVIEW`, `RESTRICTED`, `REMOVED`; visibility: `PUBLIC` / `PRIVATE`.

Only `moderation_admin` or `super_admin` can change protected moderation state/audit fields. Their respective field prefixes are none for Stories, `photo` for profiles and `media` for events. Optional `moderatedBy`, `moderatedAt`, `moderationReason` variants are reserved; ordinary users cannot set them or manipulate report counts. Owners cannot replace/re-enable a restricted profile/event image or restore restricted Story state. Existing report totals are preserved on permitted replacements.

Existing `reports` can reference these stable identities without a new reporting UI:

- Story: `targetType: story`, `targetId: storyId`; `userId` identifies owner.
- Profile photo: `targetType: user`, `targetId: uid`; details can name `contentType: profile_photo` and exact `photoPath` version.
- Event image: existing `targetType: other`, `targetId: eventId`; details can name `contentType: event_image`, `ownerId: imageOwnerId` and `imagePath`.

No automatic report-counter aggregation, appeal workflow or AI detection is claimed. Future trusted consumers must update protected counters. Do not place private investigative notes in public event/Story documents; existing restricted administrative audit facilities or a reviewed backend should hold those notes. Private user documents were not made publicly readable. A profile moderation queue for limited reviewers must use an authorized backend projection rather than granting access to all profile PII.

## 6. Firestore rules changed

Only media helpers and media-related branches of `users`, `stories` and `events` changed. Generic profile edits cannot bypass the photo contract with a raw `avatar` update. Story owners/IDs/media fields are validated at create; moderation/expiry/image identity cannot be reset by owner updates. Public Story reads require active/public status. The shared visible query additionally filters future expiry server-side, orders by expiry and document ID, and limits each page to 10.

Restricted Story documents are denied to other ordinary users. Event summary documents remain readable, but the UI projects an empty image for unclassified/restricted/private media; event details do not disappear merely because an image is restricted. Profile rendering similarly requires explicit photo visibility metadata.

## 7. Storage rules changed

`avatars`, `stories` and `events` now have path-aware ownership, immutable writes, image validation and metadata-linked read checks. SDK public reads stop when referenced media is restricted; expired Story SDK reads stop as well. Owners and protected moderators retain appropriate review/cleanup access. KYC/private/message/other Storage areas were not changed. Existing post and KYC positive/negative regression tests still pass.

Important boundary: an already-issued tokenized download URL and downloaded browser bytes are not revoked by changing Firestore status. The visible application query/projection hides the content after revalidation, but this is not immediate binary recall. Existing denormalized avatars elsewhere in the app are not retroactively rewritten by this scoped task. Token revocation, controlled serving or cache invalidation requires a separately approved backend/rollout policy. Firebase documents the difference between URL downloads and SDK-controlled direct downloads in its [Web Storage download guide](https://firebase.google.com/docs/storage/web/download-files).

## 8. Indexes added

Nine composite definitions, no unrelated indexes removed:

- Stories: `moderationStatus ASC, visibilityStatus ASC, status ASC, expiresAt DESC, __name__ DESC`.
- Stories: `moderationStatus ASC, createdAt DESC`; `reportedCount DESC, createdAt DESC`; `userId ASC, createdAt DESC`.
- Users: `photoModerationStatus ASC, photoUpdatedAt DESC`; `photoReportedCount DESC, photoUpdatedAt DESC`.
- Events: `mediaModerationStatus ASC, imageUpdatedAt DESC`; `mediaReportedCount DESC, imageUpdatedAt DESC`; `imageOwnerId ASC, imageUpdatedAt DESC`.

Public Stories use snapshot cursors, not offsets. At most 40 Stories are retained by the row hook. There is no historical/offline Story merge, global upload document or new realtime listener. Mount/focus revalidates Stories; opening a Story performs one necessary direct server lookup. Local expiry timers run only at the next loaded expiry, avoiding repeated array churn. Event summaries retain existing document-ID pagination, with server revalidation rather than persisted media-state replay. Profile photo metadata rides in the existing user document, without a separate image-document lookup.

Indexes are defined locally, not deployed. Emulator queries do not prove production composite-index readiness: deploy/finish building the indexes before releasing the corresponding query.

## 9. Tests performed

| Verification | Result |
| --- | --- |
| Root TypeScript | 0 diagnostics |
| Standalone admin TypeScript | 0 diagnostics |
| Main Vite/PWA build | Passed; large bundle warning retained |
| Standalone admin Vite build | Passed; existing chunk/dynamic-import warnings retained |
| Main media contract/UI/query tests | 14/14 passed (6 contract, 4 form, 4 lifecycle) |
| Admin event-image UI tests | 2/2 passed; complete admin suite 40/40 |
| Firestore + Storage emulator run | 27/27 passed: 10 new media flow cases plus 12 existing security and 5 existing Storage cases |
| Complete main suite | 168 passed, 3 failed, 171 total |

The three failures are unchanged expectations in the payment-service tests after the interrupted P0-F edits. Payment implementation/tests were not changed during this media task; P0 remains paused. No test was skipped or its expectations weakened to hide those failures.

Emulator cases run the actual shared upload/transaction implementation: binary existence, metadata acknowledgement and fresh-context reads; A/B ownership; moderator restriction/restore; public query exclusion; bounds/cursors; invalid direct writes; foreign download host denial; duplicate submission; cleanup; lost-ack recovery. UI tests separately verify selection/preview, retained forms on failure, duplicate guards and success only after persistence resolves. A type-only test mock signature and the emulator's default synthetic bucket name were corrected during verification; the final suite uses the application's explicit bucket name.

Not verified: authenticated live browser upload/refresh, real image decoding on physical devices, production CORS/billing/index/rule rollout, multi-device behavior or 10,000 concurrent users. A fresh emulator context verifies persistence, not a substitute claim for physical-device end-to-end qualification.

## 10. Remaining concurrency/performance and rollout risks

The architecture is designed toward the concurrency target, not load-certified. Distributed IDs and independent documents avoid a global upload-write hotspot. Same-user concurrent photo replacements still contend on that user's document; last permitted update wins and unused versions may remain.

Indexed sequential time fields and index fanout can still constrain write throughput despite random document IDs. Load-test upload/read/expiry patterns, query costs, regional latency and contention before considering time-sharded indexes/queues. Firebase calls out sequential indexed-field and hotspot limits in its [Firestore best practices](https://firebase.google.com/docs/firestore/best-practices).

Ten-MiB originals are not thumbnail optimization. Test bandwidth, memory, egress, cache hit rate and upload cancellation on slow mobile connections; server-side resized derivatives and file decoding/scanning remain future work. No client rate-limit or MIME check provides abuse/malware prevention by itself.

Logical moderation is visible after revalidation, not pushed instantly to every open client. Already downloaded media, old installed PWAs and token URLs require explicit rollout handling. Interrupted/abandoned drafts, uncertain failures, removed Stories and superseded profile/event files still need an authorized lifecycle cleanup process; no client bucket scan is used.

Legacy records without the new classification are not automatically approved: old Story ISO expiry must be migrated to Timestamp; legacy profile/Google avatars and event images need a reviewed ownership/visibility inventory. No production media was seeded, deleted or silently approved. Pre-existing static Home event teasers and fake attendee images are outside these upload paths and were not rewritten; this task does not certify those unrelated UI cards as production content.

Before a live release: confirm project/bucket and billing; inventory legacy media without blanket approval; deploy and verify media rules/indexes; coordinate the client rollout; test real A/B/admin sessions and browser refresh/CORS; then stage realistic load tests. Broad P0 rule changes already present in the dirty workspace must not be deployed accidentally as if they were only this media patch.

## 11. Backend / Blaze requirements

Firestore metadata/rules and local emulator testing do not require a newly deployed Function. However, Firebase currently requires Blaze for Cloud Storage access, including default buckets. This project's live billing state was not queried or changed; see [Firebase's official Storage billing requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

Future trusted infrastructure is needed for automated content screening, verified upload finalization/provenance, report aggregation, rate/abuse enforcement, thumbnail generation, orphan/version cleanup, token revocation and stronger serving controls. Billing alone does not implement these capabilities. No Cloud Functions were deployed or activated.

Stop: media implementation handed off locally with the above release gates; do not automatically resume P0 or start another feature.
