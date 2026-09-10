# Phase 0 — production compatibility and security baseline

2026-09-10. Source: `5ecc69615cfbf122071ab42928325cfd86d060f2`. Result: **evidence collection complete; production safety gate NOT PASSED**. Stop for owner review and a narrowly authorized containment phase. No application code, production data, rules, indexes, Functions, billing, CORS or App Check settings changed. Added only audit documents, rollback evidence and an emulator diagnostic test. Prior uncommitted architecture documents were preserved.

## 1. Evidence and limits

- Fresh authenticated GETs captured active rule releases/source, index inventory, deployed Functions, database metadata and billing status. Credentials were used through the existing CLI login, not printed or saved.
- Both rollback files are byte-for-byte SHA-256 matches to fetched production source. Release names/update times were reread at the end and had not changed.
- Bounded schema probes fetched at most three documents per selected collection, with field masks; saved only types and nonpersonal status values. No message bodies, names, phone numbers, email addresses, KYC files or Auth user inventory were saved. This is not a full database census, data-integrity scan or database backup.
- Live unauthenticated REST queries tested actual public filtering/ordering/index behavior. Separate IAM empty-result Event probes tested indexes only, not client permissions.
- Synthetic emulator tests loaded the exact captured production Firestore source. Exploit reproductions did not touch real conversations, payments, users or bookings. No signed-in production write/negative test was performed.
- No browser UI/installed-PWA/physical-device or provider-payment acceptance in this phase. HTTP asset inspection is not browser behavior or commit attestation.

Artifacts: [manifest](rollbacks/phase-00-2026-09-10/manifest.json), [Firestore rollback](rollbacks/phase-00-2026-09-10/firestore.rules), [Storage rollback](rollbacks/phase-00-2026-09-10/storage.rules), [redacted read observations](rollbacks/phase-00-2026-09-10/read-only-observations.json), [diagnostic tests](../../tests/architecture-baseline.test.mjs).

## 2. Active production manifest

| Resource | Fresh result |
|---|---|
| Firestore release | `c618d018-32bb-419b-8b78-17aac11c5b55`; updated 2026-09-09T13:29:02.458649Z |
| Firestore SHA-256 | `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013` |
| Storage release | `339a11d0-4c69-4e82-9f9d-0b2977de671d`; updated 2026-09-08T00:53:26.139320Z |
| Storage SHA-256 | `108a621e2a72a8dd198a81c18d184107b67021c291144de55a8d33dd980d72c0` |
| Billing | `billingEnabled=true`. This corrects stale Spark-only notes; it does not authorize deployment or new spending. |
| Database | Firestore Native, `nam5`, pessimistic concurrency |
| Recovery controls | Point-in-time recovery DISABLED; database deletion protection DISABLED. Other export/backup coverage was not inventoried. |
| Indexes | 66 deployed indexes, all READY. Two actual Event query shapes still lack required indexes. |
| Functions | Seven v2 handlers ACTIVE, runtime nodejs22; v1 inventory returned none. |
| App Check | Services list returned no entries; no valid-token/enforcement acceptance established. Earlier browser 403 remains unresolved, not reconfirmed here. |

Active handlers: onStoryLike, onEventLike, onEventComment, cleanupExpiredStories, onStoryDeletedMedia, cleanupMediaOrphans in us-central1; onMediaUploadFinalized in us-east1. The legacy profile/booking/message/review exports in functions/src/index.ts are not in the active inventory. Local functions/package.json declares Node 24 while the scoped deployment config and active handlers use Node 22: resolve the intended build/runtime pairing before a future release, not by bulk deployment.

## 3. Semantic rules comparison

### Scoped candidate vs exact active production

`ops/media-rollout/storage.rules` matches production after newline normalization. `ops/media-rollout/firestore.rules` differs only in `/events/{eventId}` and `/event_participants/{registrationId}`. The existing scope test removes those two blocks and proves every remaining byte identical after newline normalization against the September 9 baseline, whose fresh hash matches production. No unrelated helper difference in that candidate was found.

| Branch | Active production | Scoped local candidate | Meaning |
|---|---|---|---|
| events | Legacy owner/media edits; no paired participantCount update contract | spots/count/version validation, paired capacity transactions, tombstone/deletion guards | A coordinated permission/data-contract change, not cosmetic |
| event_participants | Any signed-in user reads roster; own unpaired create/update/delete; nested legacy membership path remains | Paired count/member transitions, deterministic IDs, restricted roster and legacy cancellation handling | Current app's paired writes can fail against production; old direct writes bypass capacity |
| Other Firestore paths/helpers | September 9 comment-repair baseline | Unchanged | Includes retained legacy vulnerabilities; parity does not mean safety |
| Storage | avatars, stories, events; deny other paths | Identical | No KYC/posts path authorization in production |

### Root candidates vs production

`firebase.json` selects root firestore.rules/storage.rules. These are a different policy generation and are NOT a safe replacement for active production or the scoped Event candidate. Match wildcard variable renaming alone is not a semantic collection change; conclusions below come from permissions/helpers, not textual path-name comparison.

| Domain | Material root difference / regression risk |
|---|---|
| Global staff authority | Replaces broad legacy isAdmin with role-scoped helpers; affects existing user, admin, KYC, finance, content and operations access |
| Users/applications/companions | Different field allowlists, approval/identity guards and private-data contracts; existing payloads require migration/compatibility tests |
| Bookings/locks | Introduces v2 ownership, quote, transition and lock pairing; needed invariants but cannot deploy without existing-record/client qualification |
| Payments/reviews | Denies direct writes accepted by production; existing consumers and admin paths differ |
| Community/comments/likes | Different visibility/counter contracts; root has TWO comments matches whose allows combine, including an unpaired delete allowance |
| Stories/media | Different lifecycle/counter policy; Story-like rule compares getAfter count with the same getAfter count plus/minus one, making that normal-client branch unsatisfiable |
| Conversations/messages | Removes broad write bypass and tightens membership/receipts; legitimate old clients/history access must be preserved |
| Notifications/Events/catalog/operations | Different recipient, ownership, moderation and role contracts; no unrelated-branch parity proof |
| Storage | Adds posts/private KYC and different authority helpers; production's default-deny paths would change |

Do not deploy root as a convenient “all fixes” bundle. Do not run old repair/migration scripts as general deployment tools. Fresh semantic gate and reviewed rollback are required for each later change.

## 4. Query and data compatibility

### Live public reads

All probes used the real ordering/equality fields, bounded limits and projected nonsensitive fields. They validate query/index/rules execution, not full UI rendering or every document's business validity.

| Query | Result | Verified index |
|---|---|---|
| Public Stories: ACTIVE/PUBLIC/active, expiresAt > now, expiresAt DESC, ID DESC, limit10 | HTTP200; one Story | `CICAgNir3pgK` READY |
| Owner Stories: same predicates plus nonexistent owner control, expiresAt ASC, ID ASC, limit20 | HTTP200; zero expected rows; no real-owner visibility claim | `CICAgPi9ipAK` READY |
| Public Events: ACTIVE/PUBLIC, ID ASC, limit10 | HTTP200; one Event | `CICAgPjCqZkK` READY |
| Comments: real public postId, createdAt DESC, ID DESC, limit50 | HTTP200; one comment | `CICAgNiZuIYK` READY |

Two read-only Event participation probes returned HTTP400 / FAILED_PRECONDITION explicitly requiring indexes:

- `getUserJoinedEvents`: userId equality + status==joined + joinedAt DESC. Source limit50; diagnostic used limit100, which does not change required index shape. Required equality fields status/userId ASC (their equality-prefix order can differ), joinedAt DESC, ID DESC. Equivalent definition is local but not deployed.
- `getEventParticipants`: eventId equality + joinedAt DESC, source/diagnostic limit100. Required eventId ASC, joinedAt DESC, ID DESC. The existing eventId/status/joinedAt index does NOT satisfy this query without a status predicate. Either approve this exact index or deliberately change the roster query to joined-only with cancellation-history requirements reviewed.

Never infer all queries work from “66 READY indexes.” No index was created in this phase. The API helper also drops streamed array error details on failures; raw response inspection was needed to see FAILED_PRECONDITION.

Bounded samples, not population claims: three bookings lack policyVersion and show legacy completed/paid strings; three sampled Events lack participationVersion/participantCount, including one spots=0 and two missing visibility/moderation fields; three comments have Firestore Timestamp dates; sampled users/messages/notifications retain ISO strings. Three companions have isVerified=true but this does not prove reviewed credentials. The admins collection sample was empty; custom claims and access through other legacy helper branches were not inventoried. No record was migrated.

Public website returns HTTP200 with `/assets/index-CkZ6Jtrm.js` and `/assets/index-B694zuLz.css`. JS contains participationVersion, lastCommentMutationId and companion-grid markers. This suggests the relevant client contracts are present, but does not prove which git commit was deployed or installed-PWA freshness. Do not infer gesture failure from the absence of a guessed diagnostic attribute string.

## 5. Reproduced issues and containment plan

Passing KNOWN_RISK tests means the vulnerability was reproduced, NOT that the application passed a security requirement. The owner must approve implementation/deployment scope separately.

### P0-01 — Conversation takeover, deletion and private message disclosure

- **Evidence/files:** Captured production conversations rules, line311 unrestricted authenticated write; messages read authorization trusts mutable participantIds. Diagnostic stranger C replaces A_B participants with C, reads synthetic private message and can delete A_B. Nested favorites also accepts stranger writes (line201).
- **Root cause:** Overlapping allow-write bypass overrides narrower branches; mutable membership feeds downstream authorization.
- **Fix:** Remove bypasses, require immutable canonical participants/ownership, restrict own favorite writes, preserve legitimate existing IDs/history. Audit existing membership integrity separately before trusting all historical pairs.
- **Dependencies:** Fresh baseline/rollback and compatibility inventory for conversation writers; no new wallet or capability system required for containment.
- **Regression risk:** Existing pair-creation, read receipts, typing and favorites flows; historical IDs may use both path and stored participants.
- **Verify:** Turn exploit expectations into DENIED against a dedicated candidate; participant create/send/read/receipt/favorite tests still pass. Authorized two-user production negative check only after approved deployment. Never test takeover on real users.

### P0-02 — “Read-only” staff can mutate protected records

- **Evidence/files:** Production isAdmin lines17–26 treats all 11 role claims and any admins document as broad admin. A read_only_admin claim updates payment status/amount in the diagnostic.
- **Root cause:** UI RBAC is not enforced at database branches; helper grants are unioned globally.
- **Fix:** Introduce branch-specific least-privilege helpers and controlled trusted financial authority; map all existing claim/document roles, including revoked/disabled assignments. No wholesale root substitution.
- **Dependencies:** Actual staff claims/assignment inventory under separate least-privilege access; authority matrix21 and legitimate admin payload tests.
- **Regression risk:** High: every legacy admin workflow using isAdmin. Stage by domain with explicit transition compatibility.
- **Verify:** Role×action positive/negative matrix, stale/revoked role, read-only write denial, finance self-approval denial; preserve allowed support/verification operations.

### P0-03 — Forged companion approval, booking/payment authority and lock poisoning

- **Evidence/files:** Production companions create accepts own arbitrary isVerified; bookings create accepts completed/paymentStatus without a lock; owner status jumps pass; arbitrary nonexistent-booking locks and fake own completed payments pass. Source: captured companions/bookings/booking_locks/payments branches; src/services/bookingTransactions.ts validation is only a client restriction.
- **Root cause:** Minimal ownership/date-type checks do not enforce approval, permitted fields, state transitions, authoritative amounts or paired writes.
- **Fix:** Approval fields backend/reviewer-only; guarded v2 booking/lock transactions and terminal state rules; no client-paid truth. Preserve fail-closed payment UI; classify existing legacy records without certifying their paid strings.
- **Dependencies:** Booking policy and legacy version inventory; narrowed admin rules; snapshot backup and migration dry run before enabling legacy transitions.
- **Regression risk:** High: companion onboarding/discovery, existing bookings and cancelled-lock reuse. No automatic deleting poisoned-looking records without evidence review.
- **Verify:** Wrong owner, self-verification, forged amount/status, missing lock and lock squatting denied; real reserve/cancel/reuse, provider acceptance and race cases succeed.

### P0-04 — Legitimate booking cancellation fails against deployed lock policy

- **Evidence/files:** Actual transitionBooking invoked with valid synthetic v2 booking/lock and owner A is denied by captured production rules; booking remains pending. Service writes booking and lock together (src/services/bookingTransactions.ts:66–67); production lock update is admin-only.
- **Root cause:** Client shipped a paired state machine while deployed rules retain legacy lock authority.
- **Fix:** Coordinated, narrowly scoped booking+lock rule compatibility using the actual v2 policy, not unpaired updates or swallowed errors.
- **Dependencies:** P0-03 contract review, old-record adapter and owner-approved release.
- **Regression risk:** Inventory release/rebooking and companion transitions; malformed legacy locks must not be blindly freed.
- **Verify:** Owner cancellation commits both documents, stranger cannot alter either, simultaneous reservations remain exclusive; explicit legacy operator-review error preserved.

### P0-05 — Unsafe rule/handler release inputs

- **Evidence/files:** Root vs scoped differences above; duplicate root comments match; impossible Story-like comparisons firestore.rules:290–294; functions/src/index.ts uses destructive user .set, claim replacement and obsolete nested-message trigger. These legacy handlers are NOT currently deployed.
- **Root cause:** Independent iterations left divergent policy generations and stale deployment exports/configuration.
- **Fix:** Explicit scoped release manifest/allowlist, source hashes and compatibility gates; quarantine legacy handler deploy targets and resolve Node22/24 runtime agreement. Clean duplicate/dead policies in a separately reviewed source change.
- **Dependencies:** No expansion until fresh production gate; billing is enabled but deployment still needs approval.
- **Regression risk:** Broad if default deploy command is used; do not erase historical rollback copies or remove active media handlers.
- **Verify:** Dry-run selection lists only approved resources; unrelated semantic parity; correct Story-like and paired comment-delete negative tests; readback exact production versions after approved release.

### P1-01 — Event writes/roster queries are incompatible with production

- **Evidence/files:** Production denies participantCount update, accepts unpaired membership and reveals roster to unrelated user; scoped candidate fixes tested capacity/tombstone contracts. Two actual query shapes fail on missing indexes. Files: eventParticipationCore.ts, eventParticipants.ts, ops/media-rollout/firestore.rules, firestore.indexes.json; live error evidence above.
- **Root cause:** Client/rules/index rollout not coordinated; old data lacks trusted capacity version.
- **Fix:** After core containment, approve Event-only rule candidate plus exact required indexes and compatible app; reconcile only reviewed real membership/capacity records through dry run. Restrict participant details.
- **Dependencies:** Fresh branch-diff gate; index READY; no assumed migration of all scripted Events.
- **Regression risk:** Existing member cancellation/history, owner delete, late joins and disappeared legacy cards.
- **Verify:** Last-seat race, duplicate join/leave, tombstone/privacy tests and both real indexed query shapes; signed-in owner/member UI after approved release.

### P1-02 — Community moderation bypass

- **Evidence/files:** Captured community_posts allows all reads; owner may change status. Synthetic removed post reads anonymously and owner restores published. Media moderation protections passing elsewhere do not protect this branch.
- **Root cause:** Public read and editable publication status are not separated from protected moderation.
- **Fix:** Distinguish editable draft/publication intent from trusted moderation; public query and direct reads must enforce visibility while author/operator retain permitted review access.
- **Dependencies:** Inventory existing status fields and all Home/Community/detail queries; scoped field backfill if required.
- **Regression risk:** Existing public feed/comment parent checks; avoid silently hiding genuine legacy posts.
- **Verify:** Restricted/removed post cannot be publicly read/restored; legitimate draft edits, published reads and paired comments continue to work.

### P1-03 — Private KYC workflow not production-enabled

- **Evidence/files:** Exact Storage source has only avatars/stories/events branches and default deny; root has private KYC rules, not deployed. Prior local workflow is not live-upload proof.
- **Root cause:** Root/scoped deployment divergence across Firestore review and private Storage authorization.
- **Fix:** Separate KYC-only authorization review covering evidence privacy, reviewer assignment, active app payloads and cross-service dependencies; never public-read KYC or deploy all root Storage.
- **Dependencies:** Reviewed verification process/retention, identity/roles and explicit rollout approval.
- **Regression risk:** Existing applications/review previews/private media; avoid replacing public media rules accidentally.
- **Verify:** Owner submit, assigned reviewer access, stranger/unassigned read denial, metadata/path integrity, refresh, revoke and retention behavior using disposable authorized fixtures.

### P1-04 — Recovery/operational acceptance incomplete

- **Evidence/files:** Database PITR/delete protection disabled in fresh metadata; no backup restore drill inventoried. App Check service list empty, earlier token403/device/PWA issues unresolved. Builds warn about large bundles; native safety is not validated.
- **Root cause:** Operational readiness is separate from feature test coverage and currently lacks fresh acceptance evidence.
- **Fix:** Owner-approved recovery/cost plan and restore drill; valid-token investigation before enforcement; PWA upgrade/device tests; explicit staffed safety gates. Do not change CORS or enforcement to mask another failure.
- **Dependencies:** Billing/IAM/cost owner decisions and test devices; cloud settings changes separately approved.
- **Regression risk:** Recovery cost/retention, App Check locking out real users, stale-client incompatible writes.
- **Verify:** Recover scoped backup into isolated environment, valid tokens across supported clients, controlled update and rollback, monitored failures without private data logging.

## 6. Tests and build baseline

| Check | Final result | Qualification |
|---|---|---|
| Main Vitest | 261/261, 33 files | First run 260/261 with one 5s timeout; isolated 38-test file passed; full rerun with maxWorkers2/minWorkers1 passed without changing tests/timeouts |
| Admin Vitest | 40/40, 6 files | Isolated admin config |
| Existing scoped emulator gates | 33/33 | Comments4, Events8, media-social8, production-media13; candidate rules, not all production branches |
| Fresh captured-production diagnostic | 12/12 observations reproduced | Includes known unsafe ALLOWs and legitimate cancellation DENIAL; NOT a security-pass count |
| Source-scope checks | 3/3 | Event-only diff and media/Storage preservation |
| Booking policy consistency | Passed | Local root policy only, not deployed compatibility |
| TypeScript | Main/admin/functions noEmit passed | No correctness/security certification |
| Builds | Main Vite/PWA and admin passed | Main JS ~1.98MB raw; admin ~1.68MB raw; large-bundle/import warnings retained |

Initial combined cross-service emulator run under demo-sathi-phase0 had 6 Storage authorization failures (27/33 pass). Existing tests hardcode hamrosathi1 in Firestore contexts/bucket while Storage rule lookups follow the emulator project. Restarting only local emulators with that matching ID made all 33 pass; no rule/test expectations weakened. New production diagnostic uses its own demo project and Firestore-only guard. Always require loopback hosts; never run these tests against production. Existing project-ID coupling is a harness limitation to remove later, not proof of a production upload failure.

Reproduction commands (Node/npm PATH may differ by desktop runtime):

```powershell
node node_modules/vitest/vitest.mjs run --config vitest.config.ts --maxWorkers=2 --minWorkers=1
node --test tests/events-scope.test.mjs tests/media-social-scope.test.mjs
node scripts/check-booking-policy.mjs
# Start only the loopback services; existing cross-service suites require this ID.
node node_modules/firebase-tools/lib/bin/firebase.js emulators:start --only firestore,storage --project hamrosathi1 --config firebase.media-rollout.json
# In another terminal, never without these guards:
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8085'
$env:FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9195'
node --import tsx --test --test-concurrency=1 tests/comments-production-gate.test.ts tests/events-capacity-gate.test.ts tests/media-social-gate.test.ts tests/production-media-gate.test.ts
node --import tsx --test tests/architecture-baseline.test.mjs
```

## 7. Safest next task and stop condition

**Recommend a separately approved P0 messaging/favorites containment patch first**, using the exact current production baseline, followed by branch-scoped staff/approval/booking/payment authority containment. Booking cancellation compatibility is urgent alongside booking invariants. Event-only release/index/data qualification follows those core protections; do not jump to new product Phase 1 while these bypasses remain.

For each patch: refetch active hashes, preserve rollback, enumerate intended branches/helpers, add desired DENIED regressions and legitimate positive cases, compare unrelated semantics, review migration/client compatibility, obtain deployment approval, read back exact rules and run authorized synthetic positive/negative acceptance. No proposed fix in this report has been implemented or deployed. Previous broad rollback would reopen demonstrated vulnerabilities; rollback after containment requires its own risk review.

Phase 0 stops here for owner review. Fresh negative production writes, Auth claims inventory, restore drill, exact app-commit attestation, media upload/UI refresh, App Check tokens and physical devices remain NOT RUN. Do not silently roll into implementation or treat this report as a release approval.
