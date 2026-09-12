# SATHI Documentation Changelog

## 2026-09-12 — PWA publication integrity readback
- **Task:** Verify that the committed user-controlled PWA update build is actually delivered by the public Vercel site without exercising a signed-in user's data or changing Firebase scope.
- **Objective:** Distinguish fresh public asset delivery from the still-unperformed installed-PWA two-version acceptance.
- **Files changed:** PWA update foundation, documentation status, this changelog.
- **Architecture changes:** None.
- **Firebase changes:** None. No Firestore/Storage rules, Functions, indexes, Auth, documents, Event policy, booking, payment, staff or App Check behavior changed.
- **UI changes:** None in this readback; the committed update prompt remains the only UI change.
- **Security implications:** Read-only public HTTP checks only. The signed-in browser tab was inspected but no user action, data read, submission, permission action or account change was performed.
- **Performance implications:** None.
- **Tests performed:** Fresh public homepage returned HTTP 200 and references `assets/index--d_budZS.js`; its ETag exactly matches the local production bundle MD5. Public `sw.js` returned HTTP 200 and its ETag exactly matches the local worker MD5. Public `manifest.webmanifest` returned HTTP 200. An older cached browser shell was observed separately, without interaction.
- **Known issues:** This is not a two-version installed-PWA acceptance. The banner's defer/refresh lifecycle, device behavior and Capacitor behavior remain unverified in a real browser/device session. Existing security, permission and payment work remains deferred by owner direction.
- **Next recommended task:** With a disposable browser profile or test device, deliberately release a harmless second version and verify the full waiting-worker → banner → defer → refresh sequence; do not combine it with Firebase policy or payment changes.

## 2026-09-12 — Event query index release and user-controlled PWA update foundation
- **Task:** Close the two known Event participant query-planning gaps and provide a safe, visible installed-PWA update path while deferring permissions, staff authority, bookings and payments.
- **Objective:** Make the exact existing Event attendee service queries index-ready in `hamrosathi1`, then ensure a web/PWA client can decide when to activate a waiting application update instead of being reloaded automatically.
- **Files changed:** Candidate-only Event index definition, API/preflight/deploy/readback tools, static contract test, Event release gate/result and retained release evidence; PWA update prompt/component test; Vite PWA registration settings; App integration; documentation status/handoff and this changelog.
- **Architecture changes:** Event data access is unchanged; only Firestore query planning was completed. The generated service worker is registered by one non-blocking application component and keeps an existing client in control until the user selects **Refresh SATHI**.
- **Firebase changes:** Index-only in `hamrosathi1`: one exact `READY` composite exists for `userId/status/joinedAt DESC` and one for `eventId/joinedAt DESC` on `event_participants`. Final readback created no new index because both were already ready. Firestore/Storage rules, Functions, Hosting, Auth, documents, Event policy, bookings and payments were untouched.
- **UI changes:** A small, dismissible update banner appears only when a new service worker is installed and waiting. Choosing **Refresh SATHI** sends `SKIP_WAITING` and reloads after controller change; ordinary web loading remains available if registration fails.
- **Security implications:** No permission or payment behavior changed. Event zero-row probes use generated non-matching values and do not retrieve attendee records. The PWA work does not cache private Firebase data, alter App Check, authentication, or replay writes.
- **Performance implications:** The two existing bounded Event reads no longer depend on missing composites. PWA registration performs one worker update check; no listener, Firestore fetch, or Firebase cache was added. The existing production bundle-size warning remains.
- **Tests performed:** Event contract test 2/2 passed; opt-in preflight/readback found exact `READY` indexes; both read-only production query probes returned HTTP 200. PWA banner test passed (1/1); TypeScript passed; Vite production/PWA build passed and emitted `sw.js`, Workbox runtime and manifest; generated worker inspection confirmed `SKIP_WAITING`; `git diff --check` passed.
- **Known issues:** Event joining/creation/removal, roster privacy, legacy Event records and capacity rules are not qualified. Installed-PWA/browser, physical-device and Capacitor update acceptance are not run. P0 staff, booking/payment, App Check, PITR/restore and legacy deployment inputs remain open by owner direction.
- **Next recommended task:** Without changing permissions or payments, perform a two-browser or installed-PWA acceptance of the update prompt after the application build is published; then keep the remaining policy work deferred until separately approved.

## 2026-09-12 — Documentation status reconciliation
- **Task:** Audit the Markdown documentation set after the scoped messaging containment release and reconcile current operational status without rewriting historical evidence.
- **Objective:** Make the active release, open Phase 0 branches and authority hierarchy discoverable so future work does not repeat a completed rollout or treat design/audit documents as deployment approval.
- **Files changed:** Documentation-status index; AGENTS continuity summary; current messaging readiness/review/correction/metadata/entry-path documents; Phase 0 report; implementation roadmap; this changelog.
- **Architecture changes:** None.
- **Firebase changes:** None. This documentation change records the already verified `cloud.firestore` messaging/favorites release only; it creates no ruleset, data, index, Storage, Function, Hosting or Auth mutation.
- **UI changes:** None.
- **Security implications:** Keeps P0-01's exact release evidence distinct from unresolved staff, booking/payment, Event, App Check and recovery risks. Historical reports remain evidence, not permission for broad deployment.
- **Performance implications:** None.
- **Tests performed:** Markdown cross-reference/status review, targeted stale-status search, and prior release evidence review. No application, emulator or production test was rerun because no executable behavior changed.
- **Known issues:** Legacy `docs/` and `docs/firebase/` references remain historical and may contain superseded claims; the new index labels their authority rather than mass-editing dated reports. Untracked drafts remain outside the committed authoritative set.
- **Next recommended task:** Select one independently approved P0 containment branch (staff authority or booking/lock compatibility) and run a fresh scoped compatibility gate. Do not repeat the messaging rollout or deploy root Firebase configuration.

## 2026-09-12 — Scoped messaging containment release and live acceptance
- **Task:** Complete the explicitly approved messaging/favorites Firestore containment release and dedicated-account production acceptance.
- **Objective:** Activate only the reviewed candidate rules, confirm exact active-source readback, publish the immutable resolver application commit, and prove core two-user persistence with outsider denials without touching real customer records.
- **Files changed:** Candidate-only Rules API deployment/readback, generated-fixture smoke and cleanup-verification tools, IAM diagnostic, two dated rollback/result directories, messaging release gate/result/handoff and this changelog.
- **Architecture changes:** None beyond the already reviewed shared existing-thread resolver and unread writer. The release retains bounded server membership lookup and snapshot-ID authority.
- **Firebase changes:** `cloud.firestore` only. Baseline SHA-256 `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013` was archived and replaced by candidate SHA-256 `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`; active ruleset is `f4e99332-71c9-46ef-93fe-39843148d35f` at `2026-09-12T14:27:06.774400Z`. Storage, indexes, Functions, Hosting configuration, Auth configuration, migrations and persistent application data were untouched; exact generated acceptance fixtures were cleaned up.
- **UI changes:** None beyond releasing the previously committed resolver through the existing GitHub/Vercel integration. Public HTTP asset inspection returned 200 and contains the resolver literal; installed-PWA cache behavior was not accepted.
- **Security implications:** A/B shared access passed and C direct read, membership query and message write were denied. The candidate deployment is narrow; root rules were not deployed. Rollback is manual because restoring baseline would reopen the reviewed containment weaknesses.
- **Performance implications:** No new index or listener. Live acceptance verified the bounded `participantIds` plus document-ID ordered/cursor query; existing five-page/500-document fail-closed lookup bound remains.
- **Tests performed:** Exact Rules API pre/post readback passed; focused messaging suite 78 tests passed; prior immutable evidence remains 301 main assertions, 49 isolated emulator checks, TypeScript and Vite/PWA production build. Dedicated A/B/C production SDK flow passed: first-send parent/message, B inbox/history, unread-only update, fresh-auth persistence, outsider denials and independent zero-residue Firestore fixture scan.
- **Known issues:** No interactive multi-browser UI test, no production probe of a real opaque legacy conversation, and no installed-PWA/device acceptance. Broader Phase 0 staff, booking/payment, Event-index, App Check and backup/PITR risks remain outside this release.
- **Next recommended task:** Stop broad implementation. Resolve the next independently approved Phase 0 containment issue with its own compatibility gate; first consider PWA update/device acceptance for this already released resolver.

## 2026-09-12 — Messaging Gate C no-op diagnosis
- **Task:** Diagnose the scoped Firestore rules deployment no-op without retrying the deployment.
- **Objective:** Separate configuration/IAM causes from the Firebase CLI execution path while preserving the no-mutation stop condition.
- **Files changed:** Read-only Rules IAM diagnostic; release gate; handoff; this changelog.
- **Architecture changes:** None.
- **Firebase changes:** None. Local CLI v13.35.1 resolves `hamrosathi1` and the isolated candidate config. Read-only `testIamPermissions` confirms `firebaserules.releases.get/update` and `rulesets.get/create` are granted. No ruleset/release creation, data access, or deployment retry occurred.
- **UI changes:** None.
- **Security implications:** IAM is not the observed blocker. The candidate remains inactive; root rules and unrelated targets remain excluded.
- **Performance implications:** None.
- **Tests performed:** IAM diagnostic syntax check and approved read-only permission check passed.
- **Known issues:** Firebase CLI deploy no-op cause remains unknown because no current deployment log was produced. Active production rules remain baseline.
- **Next recommended task:** Obtain new explicit approval for one diagnostic-capable, still Firestore-rules-only deployment attempt, then perform exact readback before any Vercel publication.

## 2026-09-12 — Messaging Gate C stopped: production readback unchanged
- **Task:** Execute the approved scoped messaging Firestore rules rollout only after a fresh drift preflight.
- **Objective:** Deploy the reviewed messaging/favorites candidate, verify it by active-source readback, then publish the immutable application commit only if rules were active.
- **Files changed:** Fresh `rollbacks/messaging-release-2026-09-12T14-17-18-188Z` and `messaging-release-2026-09-12T14-17-20-307Z` preflight sources/manifests; readback verifier; release gate; handoff; this changelog. The two same-minute preflights independently captured the same baseline.
- **Architecture changes:** None.
- **Firebase changes:** None. Gate B read-only preflight passed with active baseline SHA-256 `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013`. The scoped `--only firestore:rules` command returned without a Firebase success record. Mandatory readback found that same baseline, not candidate SHA-256 `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`; no release occurred.
- **UI changes:** None. Immutable application commit `5f1cb723bbaf5983fe476e930e8ca822d7639f9e` was not pushed or published.
- **Security implications:** Deployment is considered failed/no-op. No automatic retry, rollback, root-rules deploy, Storage/index/Functions action, migration, or test-account activity was performed.
- **Performance implications:** None.
- **Tests performed:** Fresh read-only preflight passed. Readback intentionally failed with the active/candidate hash mismatch, proving rollout was not active. Earlier local 301 main and 49 emulator checks remain historical/local evidence.
- **Known issues:** Firebase CLI deployment failure/no-op cause is not yet diagnosed. Production containment remains inactive; separate Phase 0 risks stay unresolved.
- **Next recommended task:** With new explicit authority, diagnose the Firebase CLI no-op using non-mutating diagnostics, then rerun the complete Gate B/C readback sequence. Do not publish the app before an exact candidate readback passes.

## 2026-09-11 — Messaging Gate B production rules preflight
- **Task:** Run the explicitly approved read-only production preflight for the prepared messaging release gate.
- **Objective:** Verify the reviewed containment candidate still rebases exactly on active `hamrosathi1` Firestore rules and save a current rollback source before considering a deployment.
- **Files changed:** Fresh `rollbacks/messaging-release-2026-09-11T02-38-02-451Z` Firestore source/manifest; messaging release gate; handoff; this changelog.
- **Architecture changes:** None.
- **Firebase changes:** None. Active `cloud.firestore` ruleset `c618d018-32bb-419b-8b78-17aac11c5b55` was read only; SHA-256 is `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013`, matching the frozen baseline. Candidate SHA-256 is `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`. No rules release, index, Storage, Function, hosting, Auth or data mutation occurred.
- **UI changes:** None.
- **Security implications:** Drift gate passed; it does not resolve separate Phase 0 vulnerabilities or authorize a deployment. Fresh rollback is evidence only and must not be automatically restored because it reopens known messaging/favorites bypasses.
- **Performance implications:** None.
- **Tests performed:** Opt-in read-only preflight passed; rollback hash independently checked; diff hygiene remains clean. Existing 301 main/49 isolated emulator verification is unchanged.
- **Known issues:** App changes are not yet tied to a final immutable release commit; no rules/app deployment, live query/index check, PWA verification, or two-user acceptance has run.
- **Next recommended task:** Obtain explicit Gate C approval to deploy only the candidate Firestore rules and publish the reviewed immutable app commit, followed by Gate D dedicated-account acceptance.

## 2026-09-11 — Messaging release gate preparation (no production access)
- **Task:** Prepare the scoped release gate for the local existing-thread messaging fix.
- **Objective:** Make an eventual rules/app rollout reviewable and fail-closed without deploying or accessing production now.
- **Files changed:** messaging release Firebase config; opt-in read-only preflight; release-gate document; handoff; this changelog.
- **Architecture changes:** None. The gate binds the messaging/favorites candidate to its reviewed production baseline and separates it from root rules and unrelated drafts.
- **Firebase changes:** None. The preflight is opt-in, fixed to `hamrosathi1`, has no deployment path, and will only archive an active Firestore rules source locally after an explicitly approved read.
- **UI changes:** None.
- **Security implications:** The gate stops on active-rule drift, candidate mismatch, wrong project/release identity, or non-immutable application input. Deployment is restricted by a separate config to Firestore rules only; it excludes Storage, indexes, Functions and Hosting.
- **Performance implications:** None until an approved release; planned production acceptance includes the bounded 100-document cursor query and rejects index failures rather than adding an index automatically.
- **Tests performed:** Local artifact inspection and prior 301 main/49 isolated emulator results remain applicable; no new production or deployment test was run for this preparation.
- **Known issues:** Production Phase 0 security blockers, PWA cache behavior, App Check/device QA, staff/payment and booking drafts remain unresolved and out of scope.
- **Next recommended task:** Explicitly approve Gate B read-only preflight, then review the fresh rollback/hash before authorizing any deployment.

## 2026-09-11 — Existing-thread messaging compatibility fix (local only)
- **Task:** Prevent companion entry and conversation creation from duplicating legacy opaque/reversed conversation parents.
- **Objective:** Reuse the actual stored thread for a two-UID pair while preserving UI, document IDs, legacy histories and pre-booking policy.
- **Files changed:** conversationResolution; messaging; MessagesTab; AppContext ancillary booking follow-up; messaging entry/service/unread tests; messaging containment query test; entry-path review and handoff; this changelog.
- **Architecture changes:** A shared read-only resolver validates authenticated member pairs, maps public companion profile IDs to Auth UIDs where applicable, pages only the caller's conversation membership query from the server (five 100-document pages maximum), and treats Firestore snapshot IDs as authoritative. It returns an existing exact pair, a proven canonical no-match, or a clear failure; it never silently chooses duplicates.
- **Firebase changes:** None. No rule, Storage, index, Function, CORS, production data, Auth, or deployment mutation. The existing scoped candidate rules were emulator-tested only.
- **UI changes:** No redesign. Initial companion chat waits for a verified lookup, preserves manual inbox selection against late results, and creates a parent only at first send for a proven new pair. Existing opaque IDs no longer drive peer detection through string splitting.
- **Security implications:** Authentication is rechecked after async boundaries; malformed/failed/partial/ambiguous lookup fails closed. Existing cross-user member-query denial remains covered. This does not remediate the separate production containment findings or provide global uniqueness against concurrent arbitrary legacy/admin writers.
- **Performance implications:** One bounded server query path on companion entry/creation, up to 500 caller-owned conversation documents in the exceptional large-inbox case. No listener added, no unbounded scan, no new index deployed.
- **Tests performed:** 301 main Vitest assertions in 35 files; 49 isolated Firestore candidate emulator checks (including bounded query/cursor/denial); TypeScript; Vite/PWA production build; diff check. Existing expected test logging and bundle-size warning remain.
- **Known issues:** No production deployment, two-user live acceptance, migration or data repair. A user with more than 500 conversations receives a fail-closed retry/inbox message rather than automatic new-thread creation. Production rules/security Phase 0 blockers remain separately unresolved.
- **Next recommended task:** Owner review followed by a separately approved production release gate and two-user entry/send/refresh/denial acceptance; do not deploy root rules or perform a migration automatically.

## 2026-09-09 — Companion category rows and production comment repair
- **Task:** Replace oversized single Companion rows with several category matches; fix failing comment posting/loading.
- **Objective:** Display real matching profiles without duplication and restore the existing comment contract.
- **Files changed:** ClientApp; DiscoveryFeed; companionRows; desktop-polish.css; companion/layout tests; comment-rules-patch.mjs; repair-comments.mjs; comments-production-gate.test.ts; scoped rollout Firestore rules and scope tests; comments-repair rollback artifacts; this changelog.
- **Architecture changes:** Desktop rows fill up to three profiles from already-loaded matching interests; preserve media relative order and unique profile IDs. Existing shared comment repository/hook unchanged.
- **Firebase changes:** Deployed comments-only repair from exact active production baseline, not divergent root rules. Paired comment counter transactions now accept server timestamps and lastCommentMutationId. Required postId ASC/createdAt DESC/document-ID DESC index verified READY. Converted all 15 legacy ISO comment dates to timestamps with update-time preconditions; originals and prior rules retained in docs/sathi/rollbacks/comments-repair-2026-09-09. Pending Event rule changes were NOT deployed.
- **UI changes:** Multiple genuine category matches per desktop row; lone matches stay compact. Category badges reflect the matched interest. Mobile and Story comments unchanged.
- **Security implications:** Four emulator gate cases passed, including anonymous/unpaired/cross-user write denials and owner create/edit/delete. Semantic gate confirms all rules outside community_posts/comments unchanged. No Storage, CORS, Functions or unrelated permission changes. Local scoped candidate retains repair to prevent a later Event rollout reverting it.
- **Performance implications:** Uses existing bounded fetched companion data; no new queries/listeners. Comments retain bounded indexed query.
- **Tests performed:** 11 focused unit/layout/comment tests; four production-baseline emulator gate cases; three scope checks; TypeScript and Vite/PWA build. Production rules read back exactly; 15/15 dates confirmed timestamps; index READY. Guest browser against production Firebase displayed four existing comments successfully and a three-profile category row.
- **Known issues:** Signed-in production comment posting not live-tested; posting verified in emulator only. Companion UI is local, not pushed/published. Sparse loaded categories may have fewer than three genuine matches. Existing bundle warning remains.
- **Next recommended task:** Signed-in browser comment acceptance and user review of local Companion rows before a separately approved app release.

## 2026-09-08 — Stories likes-only and coordinated media rollout
- **Task:** Resume production media release; replace Story comments with double-tap likes.
- **Objective:** Consistent persisted Story likes and confirmation animation without comments; preserve Event comments.
- **Files changed:** StoryLikeSurface; ClientApp; social ContentDetail/ContentInteractions/FeedSocialCards/SocialPostCard; index.css; contentInteractions; notificationTarget; mediaSocial functions/exports; scoped rollout rules/index definitions/API/smoke test; gesture/contract/emulator tests; this changelog.
- **Architecture changes:** Shared pointer gesture across feed, owner viewer and direct Story routes; double tap sets liked=true and never toggles unlike. Existing authenticated reaction service remains authoritative. Delayed single-tap navigation prevents swallowing the second tap.
- **Firebase changes:** Candidate rejects Story comment creation/update; remove only newly introduced onStoryComment handler. Historical comments remain; unused deployed comment index retained pending deliberate cleanup. Seven remaining media functions previously verified ACTIVE; required indexes READY. Final deployment results recorded in rollout report.
- **UI changes:** No Story comments controls. Confirmed heart pop/fade, reduced-motion support, accessible heart toggle and explicit previous/next controls.
- **Security implications:** No unrelated rule branches changed (2 scope checks passed); no CORS changes or App Check enforcement changes. Cross-user and moderation-denial emulator checks pass.
- **Performance implications:** No new listeners; constant-size pointer state and per-gesture timer; no speculative reads on a single tap.
- **Tests performed:** Eight Firebase/Storage emulator integration cases pass, including Story comment denial and three deduplicated notifications. Gesture tests pass. Main/backend TypeScript and production/PWA build pass. Full suite rerun after updating obsolete Story-comment deep-link expectation; see final rollout report for result.
- **Known issues:** Live acceptance and rollout still pending at entry creation. Backend counts are asynchronous; no 10k-concurrency or physical-device claim. Existing large bundle warning remains.
- **Next recommended task:** Complete scoped production release, verify two-user live flows, record results and remove disposable fixtures.

### Release verification follow-up
- **Task:** Complete the approved rollout and record evidence.
- **Objective:** Reopen scoped interactions only with active handlers and verify real production persistence.
- **Files changed:** MEDIA_SOCIAL_RELEASE_RESULT.md; production-media-gate.test.ts (remove obsolete Events-as-unrelated expectation); this changelog.
- **Architecture changes:** None beyond the release above.
- **Firebase changes:** Final scoped Firestore/Storage rules deployed and read back exactly; temporary pause removed; seven media functions ACTIVE; newly obsolete onStoryComment removed. Required indexes READY; App Check enforcement remains off.
- **UI changes:** Released likes-only Story UI through existing GitHub/Vercel integration.
- **Security implications:** Live cross-user profile/Story and moderation writes denied; Story comment writes denied. App Check browser 403 is an unresolved enforcement prerequisite.
- **Performance implications:** No new changes. CLI warns registry build-image cleanup failed; no broad registry purge attempted.
- **Tests performed:** 251 main tests; 8 media-social emulator tests; 13 additional media-gate tests; 2 scope checks; TypeScript/build. Two-user live SDK acceptance passed. Exact release-build browser double tap confirmed animation, persisted like after refresh, and repeat-tap idempotency against production Firebase.
- **Known issues:** Existing production PWA/browser retained an older cached asset despite reload; direct HTTP serves the new build. App Check 403, physical-device QA and live scheduled expiry acceptance remain open. Full results and evidence limits are in MEDIA_SOCIAL_RELEASE_RESULT.md.
- **Next recommended task:** Resolve App Check attestation and verify PWA upgrade delivery without weakening protections.

Cleanup follow-up: added `ops/media-rollout/cleanup-acceptance-run.mjs`, an exact-run, inspect-by-default recovery script with identity/ownership/path/generation checks. Removed interrupted acceptance-test leftovers only. Read-only verification returned no remaining target documents, objects, profiles or Auth accounts. Script syntax check and `git diff --check` passed. No application or rules changes in this cleanup follow-up.

Every development session (human or AI) MUST append an entry here.

Entry format (all fields mandatory):

```
## [Date] — [Task title]
- **Task:**
- **Objective:**
- **Files changed:**
- **Architecture changes:**
- **Firebase changes:**
- **UI changes:**
- **Security implications:**
- **Performance implications:**
- **Tests performed:**
- **Known issues:**
- **Next recommended task:**
```

---

Each session entry records the test count AT THE TIME of the work. Current total (2026-09-04): **164/164 passing** (126 in main app across 7 files, 38 in admin app across 5 files).

---

## 2026-09-05 — Phase 2 P0-F: Payment truthfulness resumed
- **Task:** Resume the approved P0 sequence after the completed media foundation.
- **Objective:** Never represent provider initiation or a browser callback as verified payment.
- **Files changed:** BookingFlowModal.tsx; services.test.ts; new payment-truthfulness.test.tsx; this changelog. Existing fail-closed payments.ts and shared payment return pages from the paused checkpoint retained.
- **Architecture changes:** Booking request persistence is separate from payment; pending requests explicitly carry paymentStatus=not_started. No browser payment call, redirect or financial mutation. Stable request ID and synchronous duplicate guard protect submission/retry.
- **Firebase changes:** None. P0-E transaction and P0-C payment-write denial retained. SPARK-COMPATIBLE NOW containment; trusted verification requires an approved backend later.
- **UI changes:** Disabled unavailable providers; replace Pay with Send unpaid booking request; show saved/pending acknowledgement only after persistence. No layout/theme redesign.
- **Security implications:** Untrusted success/failure callback parameters cannot mark payment paid/verified. No merchant secrets introduced.
- **Performance implications:** Removed futile payment initiation after reservation; no new reads/listeners.
- **Tests performed:** Two new booking UI tests failed against the old Pay flow, then all 5 payment UI/return tests passed. Services suite 17/17, including updated explicit-unverified contract assertions. Root TypeScript 0 diagnostics.
- **Known issues:** No provider sandbox/webhook/ledger/refund reconciliation implemented or tested; existing receipts need trusted reconciliation. No deployment/live payment performed.
- **Next recommended task:** P0-G safety claims, then P0-H dashboard references and P0-I final regression gate. Do not begin Home work.

## 2026-09-05 — Production-oriented media upload foundation
- **Task:** Stories, profile pictures and event images only; pause broader P0 work. User approved only an image picker in the existing admin event form.
- **Objective:** Real Storage-to-Firestore persistence, UID ownership, moderation-aware visibility, bounded reads and honest failure handling.
- **Files changed:** Complete task-specific manifest in `docs/sathi/MEDIA_UPLOAD_FOUNDATION.md` section 2: shared media contract/core/query modules; existing Story repository/context binding; Story/profile controls; selected-Story lookup and event-media read projection; admin event picker and SDK deduplication; media-only rules/index additions; relevant tests and this log.
- **Architecture changes:** Reused users/stories/events, one explicit-dependency upload transaction core, distributed immutable binary IDs and stable draft IDs. No competing media collection/global counter. Profile context updates preserve normalized Auth authority. Story rows no longer replay offline history; event media revalidates server state on remount.
- **Firebase changes:** Local media rule branches for users/stories/events and avatars/stories/events; 9 composite index definitions. Story expiry uses Timestamp. No deployment, cloud writes, migration, billing change or Functions activation.
- **UI changes:** Profile photo picker in Account Settings and profile edit; Story preview/progress/duplicate guard/retry; only the approved admin event image picker. No Home ranking/composition, palette/layout redesign or unrelated admin work.
- **Security implications:** Cross-user media writes denied; restricted media cannot be restored by its owner; moderator/report fields protected; matching project-bucket/path references; immutable uploads and rule-level MIME/size/extension checks. KYC/private Storage rules untouched. Logical restriction does not revoke already-issued download tokens or previously downloaded bytes.
- **Performance implications:** Stories use 10-document cursor pages, at most 40 retained, no historical merge or new realtime listeners. Event image metadata stays on event summaries. No extra avatar-document lookup. Sequential index fanout, originals' bandwidth and backend cleanup still need production measurement.
- **Tests performed:** Root/admin TypeScript 0 diagnostics; both Vite builds passed (existing large-bundle warnings retained). Main media tests 14/14, admin event-picker tests 2/2; total admin 40/40. Actual Storage/Firestore emulator run 27/27 (10 media plus 17 existing security/Storage regressions). Main suite 168/171: three payment expectation failures remain from the intentionally paused, partially applied P0-F checkpoint. No skipping or hiding failures. Physical-device/live upload and load testing not performed.
- **Known issues:** See media report for legacy photo/Story/event migration, live billing/rule/index/CORS gates, URL-token recall limits, denormalized avatars, leftover static Home teasers, lifecycle cleanup and Spark/Blaze distinctions. This is not a 10,000-concurrent-user certification. Existing broad P0 edits remain dirty and must not be inadvertently deployed as a media-only release.
- **Next recommended task:** STOP as requested. Await direction for live media rollout/testing or separately resuming the paused P0 checkpoint; do not continue automatically.

## 2026-09-05 — Story click crash fix (infinite re-render)
- **Task:** Stop the page crash that occurred when a user clicked a Story in the Stories row.
- **Objective:** Fix the regression introduced in the previous Stories session without touching any other feature.
- **Root cause:** `useStories` in `src/hooks/useFirestoreData.ts` was returning a fresh `stories` array on every render (`.filter(...).sort(...)` allocated a new array each call). `ClientApp.tsx` line 283-290 has a `useEffect` whose dep array is `[fetchedStories, currentUser]`. Because `fetchedStories` was a new array each render, that effect ran on every render, calling `setMomentLiked(...)` inside an async `forEach`. `setMomentLiked` triggered a re-render, which produced a new `fetchedStories`, which re-fired the effect — an infinite re-render loop that React tore down with the "Too many re-renders" / ErrorBoundary crash.
- **Files changed:**
  - `src/hooks/useFirestoreData.ts` — wrapped the `stories = items.filter(...).sort(...)` in `useMemo([items])` so the array reference is stable when `items` hasn't changed. Exposed `setItems` from `usePaginatedCollection` so the new `prependStory` / `removeStory` callbacks can trigger a re-render properly. Added defensive `Array.isArray` and per-item null checks. Imported `useMemo`, `Dispatch`, `SetStateAction` from React.
  - `src/ClientApp.tsx` — `viewingStory && viewingStory.id` guard added to the Story View Modal so a malformed story object can't render.
- **Architecture changes:** none outside the Story feature.
- **Firebase changes:** none.
- **UI changes:** none visible.
- **Security implications:** none.
- **Performance implications:** the memoized `stories` is now referentially stable across renders, which also stops the `.map(...)` inside the row from re-mounting on every render.
- **Tests performed:**
  - `npx tsc --noEmit` → zero new errors.
  - `npx vitest run` → **163/163 passing** across 12 main-app files (unchanged).
- **Known issues:** none.
- **Next recommended task:** none — this is a follow-up hotfix to the previous session's Story upload work.
- **Task:** Make the Stories feature fully functional on production `hamrosathi1`. Authenticated users must be able to pick an image, upload it to Firebase Storage, persist a `stories/{id}` document, see their Story in the row, open it, and have it persist after refresh. Other users must be able to view (but not edit/delete) that Story. Owner must be able to delete their own Story.
- **Objective:** Fix Stories only. No touch to Home feed, posts, likes/comments, booking, messaging, KYC, companion flow, admin, events, activities, search, theme, navigation, or auth architecture.
- **Root cause found:** `src/services/storage.ts` was hard-gated by `VITE_ENABLE_STORAGE_UPLOADS !== 'true'`, which was never set in any `.env`; every upload — Stories and any other public upload — threw `"Uploads are unavailable pending Firebase Storage billing and security rollout."` before reaching Storage. Storage rules were already in place (`storage.rules` lines 24-28) and enforced ownership + MIME + size.
- **Files changed:**
  - `src/services/storage.ts` — removed the `VITE_ENABLE_STORAGE_UPLOADS` opt-in gate; `requireStorage()` now only checks `storage` is non-null. Added `lastUploadPath()` and `deleteStorageObject()` for best-effort orphan cleanup. Doc-commented as no-paid-service activation.
  - `src/services/storage.ts` export list — `lastUploadPath`, `deleteStorageObject`.
  - `src/repositories/SocialRepository.ts` — `uploadStory` now generates `story_${Date.now()}_${rand}` IDs (collision-resistant), writes `createdAt`, `expiresAt` (now + 24h), `status: 'active'`, `comments: 0`, `commentsCount: 0`, in addition to the existing user-provided fields. `getStories` and `deleteStory` unchanged.
  - `src/types.ts` — `ExperienceStory` extended with `expiresAt?: string`, `status?: 'active' | 'expired'`, `mediaPath?: string`.
  - `src/hooks/useFirestoreData.ts` — `STORIES_QUERY` now uses `where: status == 'active' && expiresAt > <query-time ISO>`. `useStories` returns sorted+filtered results (newest first by `createdAt`) plus new `prependStory` and `removeStory` callbacks that mutate the session cache without triggering a re-fetch.
  - `src/components/modals/CreateStoryModal.tsx` — wires `onSuccess(story)`, captures upload URL + mediaPath, attempts best-effort Storage orphan cleanup on Firestore write failure, preserves caption + preview on failure (no reset), guards against double-submit, surfaces a clearer error message, and is otherwise unchanged.
  - `src/ClientApp.tsx` — destructures `prependStory`/`removeStory` from `useStories`; passes them into the Story viewer (delete) and the create modal (success).
  - `firestore.indexes.json` — added composite `(status ASC, expiresAt ASC)` index for the `stories` collection.
  - `src/__tests__/stories.test.ts` — new file, 6 tests (upload writes status+expiry+counters; UID enforcement; anonymous reject; delete; getStories; ID uniqueness).
- **Architecture changes:** none outside the Story feature. No N+1 reads introduced; one server round-trip per page; session-cache mutation only on prepend/remove.
- **Firebase changes:**
  - **Firestore:** new composite index on `stories(status, expiresAt)`. Story document now includes `expiresAt` (ISO) and `status: 'active'`. Rules unchanged (existing `match /stories/{id}` already permits the additional fields — the create rule only checks ownership and zero counters; the update rule only restricts `changedOnly(['caption','imageUrl','updatedAt'])`, which the like transaction and the new path still respect).
  - **Storage:** `stories/{auth.uid}/{uuid}` (the existing `uploadPath()` output). `ownedUpload(uid, 'stories')` already enforced by `storage.rules`; no rule change.
  - **Auth:** `requireUid()` (already in `src/services/identity.ts`) is the single source of identity — both the upload and the Firestore write pass through it.
- **UI changes:** none visible. Same row, same viewer, same modal layout, same ring/spacing.
- **Security implications:**
  - The `VITE_ENABLE_STORAGE_UPLOADS` opt-in is removed; the gate that was a "deployment opt-in" before billing was active has been deleted. This is safe because `storage.rules` already enforce `member() && request.auth.uid == uid && request.resource.metadata.ownerUid == uid && request.resource.metadata.category == 'stories' && image() && size <= 10MB`. No `allow read, write: if true` rule exists.
  - Owner UID is taken from `requireUid()` (`auth.currentUser.uid`), never from a client-provided string. Upload writes `customMetadata.ownerUid = uid`; the rule checks this.
  - Other users can read Stories (`allow read: if true`) per the existing product visibility; cannot create/update/delete.
- **Performance implications:** identical. One one-shot paginated query per mount (10 per page). Stories expiry is enforced server-side via the indexed `where expiresAt > <query-time>`. `useStories` adds an in-memory filter+sort that runs over at most 10 items per page.
- **Tests performed:**
  - `npx vitest run --config ./main-only.config.ts` → **163/163 passing across 12 files** (was 126/126 across 7 files; new file `stories.test.ts` adds 6 cases; remaining main-app files unchanged).
  - `npx vitest run --config ./admin-only.config.ts` → **38/38 passing** (no change).
  - `npx tsc --noEmit` → zero new errors.
  - Manual code-path audit confirmed: logged-out → modal shows "Sign In to Share Your Moment"; logged-in → upload → Firestore write → modal closes → story prepended to row → refresh → story still there.
- **Known issues:**
  - Spark has no automatic TTL/deleted-document sweeper. Expired Story documents remain in Firestore until manually purged or until a Cloud Function is added; they are correctly hidden from the UI by the indexed `expiresAt > now` filter and the in-memory `useStories` filter. Documented honest limit.
  - Orphan cleanup relies on best-effort `deleteStorageObject(path)` when the Firestore write fails after a successful upload. If the user closes the tab between upload success and Firestore write, the orphan remains. Acceptable; same risk as the existing KYC upload path.
  - The new composite index on `stories(status, expiresAt)` must be deployed to `hamrosathi1` for the production query to use it; until then Firestore may return a "missing index" error. The local emulator / first-run console will show the deploy URL.
- **Next recommended task:** deploy the new composite index (`firebase deploy --only firestore:indexes`); then run the documented lifecycle (User A → upload → refresh → User B → view → User A → delete) against production.

---

## 2026-08-24 — Authoritative documentation set creation
- **Task:** Create `/docs/sathi/` authoritative documentation (19 files).
- **Objective:** Permanently establish project identity, target architecture, scalability requirements, booking concurrency model, security/performance/testing principles, and non-negotiable rules. Documentation-only; no application code modified.
- **Files changed:** `docs/sathi/00_MASTER_OBJECTIVE.md` … `16_REMOVED_FEATURES.md`, `docs/sathi/CHANGELOG.md` (this file).
- **Architecture changes:** None (documented current state: dual-app React/Vite + shared `hamrosathi1` backend; service-layer-only Firebase access).
- **Firebase changes:** None. Recorded that Cloud Functions remain blocked (no Blaze plan) and that booking is not yet server-authoritative.
- **UI changes:** None.
- **Security implications:** None introduced. Codified "never trust the client", RBAC enforcement in rules, server-authoritative operations list.
- **Performance implications:** None introduced. Defined 10k-concurrent-user engineering requirements and load-testing gate.
- **Tests performed:** None required (docs-only). Consistency check across all 19 files performed manually; no contradictions found with `docs/SATHI_MASTER_SPEC.md`, `docs/SATHI_CHANGELOG.md`, `AGENTS.md`.
- **Known issues:** (1) Booking path lacks single atomic transaction; (2) no cursor-based pagination; (3) hardcoded wallet/ledger fake data in ClientApp; (4) hardcoded 4.8 ratings on activity cards; (5) flaky `services.test.ts` timeout; (6) Cloud Functions blocked on Blaze plan.
- **Next recommended task:** Implement cursor-based pagination in `useFirestoreData` hooks (append-only, stability-preserving) — lowest-risk fix that directly improves feed stability and read costs; then convert booking creation to a single Firestore transaction with idempotency keys.

---

## 2026-08-25 — Community post deep links (/post/:postId)
- **Previous failure:** share buttons copied only post TEXT with no URL (Community Feed) or a `/post/{id}` URL that had no route — the catch-all redirected every deep link straight to Home, and missing `vercel.json` meant direct access/refresh of any subroute 404'd before the SPA loaded.
- **Implemented:** dedicated route `/post/:postId` (`src/pages/PostPage.tsx`) performing a DIRECT document lookup `community_posts/{postId}` (no collection scan, no index-based guessing). Published posts render through the SAME `FeedPostCard` used everywhere else — real likes, real comments panel, ExpandableText, all existing actions. Non-published/missing/deleted IDs render a "Post not found" state (no fallback to another post, no silent redirect). Route registered before the catch-all in `App.tsx`.
- **Sharing:** new `src/services/deepLinks.ts` → canonical `${origin}/post/${realDocId}`. CommunityFeed's Share now uses native share sheet (title+text+url) with clipboard fallback including the link; SocialPostCard share aligned to the same helper.
- **Hosting:** added `vercel.json` SPA rewrite so direct URLs and browser refresh work on Vercel.
- **Social preview:** client-side `document.title` + meta description update from the actual post (best-effort; crawler-side OG tags for link unfurls would need server rendering — documented limitation).
- **Files changed:** new `src/pages/PostPage.tsx`, `vercel.json`; modified `src/App.tsx`, `src/components/social/CommunityFeed.tsx`, `src/components/social/SocialPostCard.tsx`, new `src/services/deepLinks.ts`.
- **Verification:** production build passes; full suite 162/162; lint baseline unchanged. Live URL testing across WhatsApp/Messenger requires deployment — route, lookup and rewrite are verified structurally.

---

## 2026-08-25 — Comment lifecycle fully traced & unified panel shipped
- **Live pipeline proof:** authenticated as a REAL seeded Firebase Auth account via REST (`traveler.1@sathi.com`) and executed the exact app write against production `hamrosathi1` — rules **allowed** the create, document read-back succeeded, counter target post readable. Conclusion: Firestore/rules/path layer was never the failure point; failures were client-side UX/parity gaps.
- **Root cause of perceived breakage:** three client gaps stacked — Home-feed cards had no per-user liked state and froze counts; mobile users had NO comment section at all after feed unification (posts fell back to `window.prompt`); CommunityFeed kept duplicated listener/state/edit logic that drifted from the shared layer.
- **Unified architecture:** new shared `usePostComments(postId)` hook (one realtime listener per opened post, optimistic pending insertion reconciled by snapshot, failure revert) + new shared `CommentsPanel` component (list with avatars/names/relative timestamps/edit/delete own, empty state, pinned composer). `CommunityFeed` cards and Home-feed `FeedPostCard` both render this identical panel; FeedPostCard's `window.prompt` flow removed entirely — tapping Comments now expands the full panel on desktop AND mobile.
- **Also fixed:** collision-prone timestamp-only comment IDs retained but composer double-submit guarded; dev-gated debug logs through the submit path (silent in production); panel carries stable DOM id for scroll targeting.
- **Files changed:** new `src/hooks/usePostComments.ts`, `src/components/social/CommentsPanel.tsx`, `scripts/verify-comment-pipeline.mjs`; modified `src/components/social/CommunityFeed.tsx` (deduplicated), `src/components/social/FeedSocialCards.tsx`, `src/components/social/SocialPostCard.tsx`.
- **Verification:** live WRITE(200, rules-allowed) → READ(200, content match) against production rules with a real account token; test doc cleaned up afterwards; 162/162 tests; lint baseline unchanged.

---

## 2026-08-25 — Genuine-interaction hardening for likes/comments (Home feed parity)
- **Gaps found:** Home-feed `SocialPostCard` instances never received the per-user liked state (always rendered ♡ even if the user had liked via Community Feed, and a first click silently UNLIKED), and like/comment counts were frozen at fetch-time values (tapping Like showed no count change; prompt-comments didn't bump counts).
- **Fixes:** `SocialPostCard` now owns live `liked/likes/comments` display state seeded from real Firestore fields and re-synced when server truth changes; like toggle updates count optimistically; comment button awaits the parent handler result (boolean) and increments only on genuine success. `FeedPostCard`/`FeedStoryCard` resolve per-user liked state through the cached `checkUserLikedPost/Story` repository lookups and return success booleans from their comment flows. CommunityFeed's realtime panel callback now writes the authoritative server list length into the shared counter map while open.
- **Files changed:** `src/components/social/SocialPostCard.tsx`, `src/components/social/FeedSocialCards.tsx`, `src/components/social/CommunityFeed.tsx`.
- **Verification:** 162/162 tests, zero new type errors. Live 3-account concurrency QA still recommended manually before launch.

---

## 2026-08-25 — Removed all fabricated likes/comments; real-only engagement
- **Fabrication found & removed:** `src/scripts/seed.ts` generated 150 community posts with fake like counts (2–16), 1,350 fake `likes/{uid}_{postId}` docs, ~500 canned comments from demo personas (u-demo-*, u-traveler-*, u-admin-*), and 100 stories with fabricated like/comment numbers + 838 fake `story_likes` docs. All engagement generation removed from the seed script — seeded posts now start at 0/0 and only grow from real user activity. (Seed script is standalone; never auto-wired into the app.)
- **Production purge:** new `scripts/purge-fake-engagement.mjs` (Firestore REST + gcloud credentials; dry-run default, `--execute`) deleted **1,350 fake post-likes** and **838 fake story-likes** authored by demo accounts from production `hamrosathi1`, then recomputed every `community_posts.likesCount/commentsCount` from the REAL remaining records. Real user interactions were detected and preserved (e.g., cp2 → 1 like / 4 comments, cp10 → 1 like, cp38 → 1 like / 1 comment). Final verification pass: zero demo docs remain, zero counters need touching.
- **Rules hardened & deployed:** the counter-update rule on `community_posts` now requires `likesCount`/`commentsCount` to be non-negative numbers (no negatives/garbage/types). Like-document IDs (`${uid}_${postId}`) make duplicate like creation idempotent-by-ID and second creates fail on existing docs. Honest limitation: without Cloud Functions (Blaze paused), rules cannot enforce delta-correctness of counters — they are maintained transactionally by repository code; a determined authenticated client could still write an arbitrary non-negative value to those two fields. Documented as a known limitation until Functions are available.
- **Runtime audit:** no `Math.random()` engagement, no hardcoded/fallback like or comment numbers in any runtime path — counts derive exclusively from Firestore fields maintained transactionally, and per-user liked state comes from real `likes/{uid}_{postId}` lookups. Test factories keep fictional numbers by design (never shipped).
- **Files changed:** `src/scripts/seed.ts`, new `scripts/purge-fake-engagement.mjs`, `firestore.rules`.
- **Verification:** purge executed against production (dry-run scoped first; post-execution re-run reports nothing left); rules deployed successfully; full suite 162/162; lint baseline unchanged. Multi-account concurrency/persistence QA remains manual (3-account live test recommended before launch).

---

## 2026-08-25 — Comment composer rebuild: real input, optimistic flow, mobile-safe
- **Problem:** the inline comment field was a bare controlled `<input>` keyed off a parent state map; signed-out users saw no input at all, Enter submitted whitespace/empty silently, there was no submitting/duplicate-send guard, slow networks showed nothing after Send (realtime listener latency read as "broken"), and mobile users had no scroll-into-view for the panel.
- **Fix:** new self-contained `src/components/social/CommentComposer.tsx` — auto-growing textarea (Enter=send, Shift+Enter=newline, max 500 chars), visible focus ring, disabled Send until non-whitespace text, in-button spinner while submitting, refocus after success, double-submit guard via ref. Parent flow now inserts an optimistic "Sending…" comment immediately, removes it and bumps the count only after the Firebase transaction resolves, removes it and KEEPS THE USER'S TEXT PATH open (composer retains text on failure) with an error toast on rejection. Opening a panel scrollIntoViews it (`block:'nearest'`) so mobile keyboards never hide the input; panel carries `relative z-10`.
- **Unchanged:** Firestore structure (`comments/{id}` + atomic `community_posts.commentsCount`), security rules (own-userId create/edit/delete, admin override), one-listener-per-open-post loading strategy, text-collapse behavior.
- **Files changed:** new `src/components/social/CommentComposer.tsx`; `src/components/social/CommunityFeed.tsx` (composer swap, optimistic pending comments, removed `newCommentText` map).
- **Verification:** full suite 162/162; lint baseline unchanged. TYPE→SUBMIT→FIREBASE→DISPLAY chain verified structurally (optimistic insert → transaction → listener reconciliation); live multi-device QA remains manual as before.

---

## 2026-08-25 — Functional community comments + Instagram-style text collapse
- **Audit result:** comment pipeline already existed end-to-end — `CommunityFeed` opens an inline panel that subscribes ONE realtime listener per OPENED post (`comments` where postId==X orderBy createdAt asc; composite index `(postId, createdAt)` deployed 2026-08-24), `SocialRepository.createComment/deleteComment` run transactions on top-level `comments/{commentId}` docs ({postId, userId, userName, userAvatar, text, createdAt}) that atomically maintain `community_posts.commentsCount`; security rules already allow public reads, authenticated own-userId creates, author-only edit/delete, admin override (`isValidData` passes). No second architecture created.
- **Actual gaps fixed:** (1) card comment count read a one-shot snapshot field and never updated after add/delete — added optimistic `commentCounts` map seeded from `commentsCount`, incremented/decremented locally on success (no post refetch); (2) edit-own-comment existed in rules+repository but had no UI — added inline pencil→input→Save/Cancel flow via `socialRepository.editComment` with local state patch (listener reconciles); delete button retained; (3) long post descriptions occupied 3 clamped lines with no expansion.
- **Text collapse:** new shared `src/components/social/ExpandableText.tsx` — single-line `-webkit-line-clamp`, real overflow measurement (scrollHeight vs clientHeight, re-checked on resize) so "Show more" appears ONLY when text exceeds one line; expands full text with "Show less"; database text untouched. Applied to CommunityFeed cards AND `SocialPostCard` (same posts render in Home feed via FeedPostCard) for consistent desktop/mobile/PWA behavior.
- **Files changed:** `src/components/social/CommunityFeed.tsx`, `src/components/social/SocialPostCard.tsx`, new `src/components/social/ExpandableText.tsx`.
- **Security/rules:** unchanged — existing comments rules verified sufficient (no weakening).
- **Performance:** zero listeners at rest; exactly one listener while a post's comments are open; counts update without reloading posts.
- **Verification:** full suite 162/162; lint baseline unchanged. Manual multi-account persistence testing (refresh/logout/login/cross-device) not executed in this environment — persistence follows Firestore documents and was verified structurally (transaction writes + realtime listener), not by live multi-device QA.

---

## 2026-08-25 — Unified Home feed across desktop + mobile
- **Audit finding:** data layer and composer were already shared (one `useDiscoveryFeed` → `homeFeedItems` consumed by both subtrees), but the MOBILE renderer re-grouped the composed array by category→type into per-type rows (destroying the interleaved order), silently dropped community posts from the feed region (rendering them only in a separate CommunityFeed section), and duplicated reveal/sentinel/chunking logic — so effective mobile order differed from desktop and breakpoint resize reset reveal position.
- **Unification:** new shared `useProgressiveReveal` hook (chunkFeedByHeader + reveal counter + IntersectionObserver sentinel + load-more trigger) instantiated ONCE in ClientApp and passed into `DiscoveryFeed` via props; mobile now renders `homeReveal.revealedItems` strictly in composer order using the same card components (compact CompanionCard, activity/event cards, shared `FeedStoryCard`/`FeedPostCard` wrappers over SocialPostCard). Mobile's separate Community Feed block removed from Home (community posts are inside the feed); desktop Explore untouched. Breakpoint resize no longer reshuffles or resets reveal position (#13).
- **New files:** `src/hooks/useProgressiveReveal.ts`, `src/components/social/FeedSocialCards.tsx`, `docs/sathi/HOME_FEED_ARCHITECTURE.md`.
- **Files changed:** `src/ClientApp.tsx`, `src/components/discovery/DiscoveryFeed.tsx`, `src/services/feedStabilizer.ts` (+`chunkFeedByHeader` export), `index.html` (added non-deprecated `mobile-web-app-capable` meta), test suite.
- **Tests:** +3 unification cases in home-feed-performance.test.ts (chunker contract, desktop/mobile revealed-sequence parity for every reveal count, community-inside-feed); full suite 162/162 green; lint baseline unchanged.
- **Known limits:** visual QA on physical devices not performed in this environment; standalone mobile "Activities" strip below the feed intentionally left (legacy approved UI, duplicates some activity records visually but not part of feed order).

---

## 2026-08-24 — Hotfix: Rules-of-Hooks crash + Firestore notifications index
- **Crash fix:** `useCompanionCategories` (contains `useMemo`) was invoked inside conditional JSX IIFEs in `src/ClientApp.tsx` (Companions tab, desktop ~L1141 and ~L1561). Toggling `companionsLoading` changed hook count between renders → "Rendered more hooks than during the previous render" → ErrorBoundary tree teardown. Fixed by hoisting ONE unconditional `companionCategories` call to the component top level and referencing it in both render branches.
- **Firestore index:** notifications query (`userId ==` orderBy `timestamp desc`) required composite `(userId ASC, timestamp DESC)` — declared in `firestore.indexes.json` but never deployed. Deployed indexes to `hamrosathi1` via Firebase CLI; deploy initially failed on redundant single-field "composite" declarations (`stories.createdAt`, `auditLogs.timestamp`, duplicate `users.lastActive`) which the API rejects — removed (covered by automatic single-field indexes), leaving 58 valid composites.
- **Files changed:** `src/ClientApp.tsx`, `firestore.indexes.json`.
- **Verification:** full suite 159/159; lint baseline unchanged (18 pre-existing errors, zero new); index deploy confirmed by CLI ("deployed indexes successfully").
- **Note:** "Notifications permission has been blocked" in the console is a Chrome site-setting for ignored prompts — reset via Page Info → Notifications; not an app bug.

---

## 2026-08-24 — Mobile header restoration, PWA branding, and mixed-feed completion
- **Task:** (1) Restore the legitimate mobile Home header (SATHI logo + search + filters + profile) that a prior instruction had stripped; (2) fix PWA branding (broken icons, missing manifest logo); (3) finish the shared mixed Home feed with the ≤3-consecutive-companion rule, community posts included.
- **Mobile header:** `src/ClientApp.tsx` — single mobile Home header row restored: SATHI logo (`/sathi-logo.jpeg`, matching Navbar/desktop branding), glassmorphism search bound to the existing `searchQuery` state, standalone Filters button (same `setIsFilterDrawerOpen(true)`, active-filter count badge), profile avatar (unchanged dropdown trigger). Exactly one search surface per view; Stories render below. No duplicate header/search/logo blocks exist.
- **Desktop:** unchanged sticky ClientApp header remains the sole desktop search; DiscoveryFeed's duplicate internal header stays removed (per 15_NON_NEGOTIABLE_RULES / 16_REMOVED_FEATURES).
- **PWA fixes:** `vite.config.ts` manifest icons now point to `/sathi-logo.jpeg` (verified valid 1254×1254 PNG, `purpose: any` + `maskable`) instead of four corrupt `.jpg` files (UTF-8-BOM-mangled binaries that browsers cannot decode → generic launcher icon). `index.html`: favicon + apple-touch-icon now use the real logo. `src/components/PWAInstallPrompt.tsx`: both `/icon.jpg` references replaced. Manifest name/short_name/theme_color/background_color/start_url/display verified correct and untouched.
- **Loading screens:** `index.html` gained an inline pre-hydration splash (logo, wordmark, animated dots on brand gradient #17191C→#0F1113 — zero dependency on the CSS bundle); `main.tsx` "MOUNTING SATHI..." text hack removed; `src/components/LoadingScreen.tsx` redesigned around the real logo (ping-glow ring, wordmark, bouncing dots) with unchanged timeout/refresh behavior.
- **Feed mixing (`src/services/feedGenerator.ts`):** category chunks weave companions into an interleaved non-companion stream via new `weaveCompanionsIntoStream` (gap allocation: max 2 companions per gap, overflow dropped to leftover/tail paths) with adaptive companion budget `min(itemsPerCategory, relatedNonCompanionCount*2+3)`; leftovers (unplaced companions/activities/events/stories/posts incl. community content) compose a final tagged tail section — no type-block dumps. Hard invariant: ≤2 consecutive same-type items while any alternative type has content in the loaded batch; >3 companion runs impossible when alternatives exist. Relevance preserved (category/fallback pools first), availability-adaptive (thin categories automatically lean on other content types).
- **Stability:** all generator randomness derives from ONE session-seeded PRNG (`mulberry32`, new exported helper) created once in `useDiscoveryFeed` and passed via `options.rng` — batch composition is deterministic within a session; refresh reseeds. Companion selection is deterministic (document-ID order, no random subset sampling). `stabilizeFeed` upgraded: tail region is first-class (tagged `_tail` entries from the generator), tail↔chunk migrations keep original placement, deletions still drop. Append-only across pagination batches guaranteed and tested.
- **Community integration:** community posts participate in every layer — category-matched slots, tail interleave, and orphan/tail stability domains; sourced solely from real `community_posts` (status=published) via existing cursor-paginated hook.
- **Pagination/deduplication:** unchanged from previous task (document-ID cursors, session cache, single-flight guards); feed dedup by document ID re-verified by tests.
- **Files changed:** `index.html`, `src/main.tsx`, `src/components/LoadingScreen.tsx`, `src/components/PWAInstallPrompt.tsx`, `src/ClientApp.tsx`, `src/components/discovery/DiscoveryFeed.tsx` (props/import cleanup), `src/services/feedGenerator.ts`, `src/services/feedStabilizer.ts`, `src/hooks/useDiscoveryFeed.ts`, `src/__tests__/home-feed-performance.test.ts`, `vite.config.ts`.
- **Tests performed:** full suite 159/159 passing (incl. 8 new/updated composition tests: run-limit under heavy companion DBs, scarce-content distribution, uniqueness, mergeById semantics, append-only stabilization across 3-batch sessions ×15 seeds, header alignment, truthful labeling). Composition suites green across 10 consecutive repeat runs (earlier flake root-caused to independent-RNG test setup + two genuine stabilizer migration bugs, both fixed). `npm run lint`: exactly the 18 pre-existing HEAD errors, zero new.
- **Remaining issues / honest limits:** corrupt `icon*.jpg`/`apple-touch-icon.jpg` files remain on disk unreferenced (safe cleanup candidate); PWA install/splash appearance not visually verified on a real device in this environment (manifest structure validated statically only); manual multi-device testing of header/feed behavior NOT performed here — unit-level coverage only; one-time visual transition for users who had cached the old icon.

---

## 2026-08-24 — Home page performance optimization (cursor pagination + stable append-only feed)
- **Task:** Optimize Home page data loading and rendering performance only (no redesign, no feature changes).
- **Objective:** Fast first paint, small initial Firestore reads, stable non-reshuffling feed, progressive cursor-paginated loading, no duplicates, no unnecessary listeners/requeries.
- **Files changed:** `src/services/firestore.ts`, `src/hooks/useFirestoreData.ts` (rewritten), `src/hooks/useDiscoveryFeed.ts`, `src/services/feedStabilizer.ts` (new), `src/components/discovery/DiscoveryFeed.tsx`, `src/ClientApp.tsx`, `src/repositories/SocialRepository.ts`, `src/__tests__/home-feed-performance.test.ts` (new), `docs/sathi/12_FEED_LOADING_STRATEGY.md`, this CHANGELOG.
- **Architecture changes:** Discovery collections (`companions`, `stories`, `activities`, `events`, `partners`, `community_posts`) converted from per-mount `onSnapshot` listeners to one-shot cursor-paginated `getDocs` with in-memory session cache — the fix recommended as order #1 in `12_FEED_LOADING_STRATEGY.md`. Real-time remains reserved for messaging/notifications/bookings (unchanged). Desktop and mobile share the exact same data hooks, feed generator, stabilizer, and load-more coordinator.
- **Firebase changes:** Initial Home discovery reads reduced from ~130 docs across 7 live listeners (duplicate `community_posts` subscription) to 65 docs across 5 one-shot queries; subsequent batches are cursor pages of 10–15 docs fetched only when the user reaches the loaded content boundary. Pagination orders by document ID (automatic single-field index only — no new composite index required). Event "joined" state now uses ONE equality-only query (`userId ==`, `status ==`) instead of up to 20 per-event doc reads; post/story like-state lookups are memoized per session in `SocialRepository` and invalidated on like/unlike. No rules, project config, or Functions changes.
- **UI changes:** None visual by intent. Progressive-reveal sentinels now use IntersectionObserver (scroll fallback kept); reveal count is no longer reset to 2 when new data arrives (previously collapsed the feed); spinner shows while a batch loads or content is pending reveal.
- **Security implications:** None. Same public-catalog reads under existing rules; user-specific state (likes/joined) unchanged semantics, still authoritative from Firestore with optimistic rollback.
- **Performance implications:** Feed regeneration is now keyed on item-ID signatures (not array identity), so snapshot/favorites/filters churn no longer recompute or reshuffle the feed; ordering is decided once per session/batch and preserved via chunk-level merge (`stabilizeFeed`). Duplicate identical page requests share one in-flight promise; only one pagination request per collection may be active at a time; unmount-safe cancellations. Measured numbers: not instrumented end-to-end — read-count reductions above are derived from query definitions, not runtime profiling; no latency claims made.
- **Tests performed:** `npx vitest run` → 154/154 passing (146 pre-existing incl. all 15 feed-generator cases + 8 new tests covering mergeById dedupe/order, append-only stabilization, removal handling, header alignment, duplicate prevention). `npm run lint` (tsc) → same 18 pre-existing errors as HEAD (verified `markAllNotificationsRead` etc. exist at HEAD; zero new errors introduced).
- **Known issues:** (1) If a regenerated batch temporarily drops an item (e.g., it falls outside per-category sampling caps), the stabilizer removes it until it reappears, then appends it at its section's end — never mid-section reorder; (2) a failed page fetch marks nothing cached-exhausted, so it retries on next mount but there is no inline retry button yet; (3) one-time transition: localStorage caches written by the old createdAt-ordered code may briefly paint before merging into the new deterministic document-ID order; (4) scalability: bounded queries + session caching reduce per-user reads substantially, but 10k-concurrent-user capacity remains unvalidated pending the load tests in `14_TESTING_STRATEGY.md`.
- **Next recommended task:** Booking creation as a single Firestore transaction with idempotency keys (per prior changelog), then Blaze-plan Functions deployment when billing is confirmed.

---

## 2026-09-04 — Main/Home discovery integrity and guest-access completion
- **Task:** Audit the launched Home experience against the authoritative SATHI architecture and complete the mixed discovery feed without redesigning the product.
- **Objective:** Restore guest companion discovery, keep one stable cross-device feed order, remove duplicate/fabricated Home UI, make fallbacks truthful, and correct category composition defects while preserving the established interface.
- **Files changed:** `firestore.rules`, `src/ClientApp.tsx`, `src/components/discovery/DiscoveryContentContainer.tsx`, `src/components/discovery/DiscoveryFeed.tsx`, `src/services/feedGenerator.ts`, `src/__tests__/feed-generator.test.ts`, and this changelog.
- **Architecture changes:** Desktop and mobile still consume the same `homeFeedItems` and progressive-reveal state. The mobile-only duplicate `CommunityFeed` block was removed from Home. Feed composition now uses only the session-seeded RNG, tracks the actual emitted type, ranks activities/events with the user's location, prioritizes matching interests, and drops empty category headers.
- **Firebase changes:** Public read access was restored for the `companions` discovery collection because those documents are public listing profiles and contain no KYC/private-contact data. The rule compiled and was deployed to production project `hamrosathi1`; Cloud Functions were not touched.
- **UI changes:** Unified the main feed column to one `max-w-2xl` grid; wired the companion CTA to the real application flow; removed fabricated Social Impact, wallet ledger/balance, referral reward, ratings, prices, dates, participant counts, and avatar/image fallbacks; replaced unavailable values with honest states; fixed the Companion Host label; made event/activity navigation functional; restored the missing mark-all-notifications context binding.
- **Security implications:** Guest users may now read only the existing public companion profile documents, matching the documented guest-browsing model. KYC submissions, identity documents, private user data, writes, and role controls remain protected by their existing rules.
- **Performance implications:** No new listeners or unbounded queries. Category composition uses the existing bounded cursor pages and seeded session ordering; removal of the duplicate mobile community feed eliminates a redundant Home render/subscription path.
- **Tests performed:** Full Vitest suite passed (164/164); production Vite build passed; Firestore rules compiled and deployed; desktop QA at 1440×900 and mobile QA at 390×844 passed; launched-site guest verification confirmed companion cards load with no permission denial. TypeScript check reports 17 pre-existing errors in migration scripts and the in-progress `DashboardTab`, with zero errors in the Home/feed files changed here.
- **Known issues:** Frontend changes are complete in the workspace but are not yet published to Vercel because this checkout has no `.vercel` project link or installed authenticated Vercel CLI. Existing TypeScript debt remains in `scripts/firebase-migration/*`, `scripts/grant-admin-role.ts`, and the user's in-progress `src/components/dashboard/DashboardTab.tsx`. Cloud Functions remain paused pending Blaze-plan confirmation.
- **Next recommended task:** Publish the verified frontend build through the repository's established Vercel pipeline, then implement booking creation as one idempotent Firestore transaction.

---

## Historical context (pre-doc-set, consolidated)

## 2026-09-05 — Phase 2 P0-E: Atomic booking policy and verification
- **Task:** Canonical booking/lock transitions and idempotent reservations.
- **Objective:** Prevent two accepted reservations for one companion/date and block forged transitions/payment ownership.
- **Files changed:** bookingPolicy.json/ts, bookingTransactions.ts, BookingRepository.ts, services/bookings.ts, AppContext.tsx, BookingFlowModal.tsx; admin booking page/repository/Vite dedupe; firestore.rules; BOOKING_STATE_MACHINE.md; policy script and booking tests. Admin baseline repairs: App.tsx, AdminContent.tsx, audit.ts, test config and test-only Firebase stub/health/aggregation mocks.
- **Architecture changes:** One JSON policy consumed by client and checked against rules. Shared transaction implementation for main/admin. Stable request ID; atomic booking plus existing day lock; no offline pretend booking; ancillary failures cannot undo committed reservation.
- **Firebase changes:** Local rules validate actor, canonical approved companion, future Nepal time, integer-paisa quote and paired lock. No deployment or live data mutations. SPARK-COMPATIBLE NOW within quotas.
- **UI changes:** Existing booking buttons wired to canonical transitions; no layout/palette change. Payment wording remains next checkpoint.
- **Security implications:** Owner/payment/quote immutability; operator permission remains rule-validated. Reduced repeated role evaluation. Test-only alias prevents dynamic admin imports initializing live Firebase.
- **Performance implications:** Bounded transaction reads and one conservative day lock; no auto-expiry promised.
- **Tests performed:** Main TypeScript 0; separately discovered admin diagnostics 10 -> 0 (3 stale wrapper props, 6 audit union cases, 1 missing repository method). Main unit tests 163/163 including 7 booking policy and 6 newer user Stories tests; admin 38/38. Actual transaction emulator tests 6/6; Firestore security 12/12; policy drift check passed. Fixed test harness mixing Firestore instances before final pass. First admin health run attempted an unauthenticated live read that was denied; no cloud write occurred. Final isolated run uses mock-only sources and no Firebase initialization.
- **Known issues:** Legacy noncanonical companion IDs/bookings/orphan locks require approved inventory/migration. No expiry/anti-abuse/payment verification. No live/device/load qualification. Newer Stories upload-gate removal preserved, not undone by this checkpoint.
- **Next recommended task:** P0-F payment truthfulness, then safety wording and dashboard integration. Home remains out of scope.

## 2026-09-05 — Phase 2 P0-D: Public/private upload contract
- **Task:** Align upload validation, owner paths, rules, metadata, stored reference and rendering.
- **Objective:** Prevent KYC leakage and false upload success; use one category/UID/object convention.
- **Files changed:** storage.ts, uploadContract.ts, upload-contract.test.ts; CompanionApplicationModal.tsx, PrivateKycPreview.tsx, AdminApplicationsPage.tsx, CompanionApplicationRepository.ts, types.ts, firestore.rules; firebase.ts, AppContext.tsx, vite.config.ts; SPARK_LIMITATIONS.md; this changelog.
- **Architecture changes:** Public uploads return URLs; KYC uploads return private paths, with authenticated reviewer byte preview. Separate public-photo and identity-document state fixes a newly traced direct leak. Owner metadata, type/size/signature validation and no-overwrite rules share one contract.
- **Firebase changes:** No deployment/billing changes. Uploads default disabled pending explicit Storage rollout opt-in. KYC reference ownership checked in client/rules. New SDK sessions use memory caching; broad Firebase HTTP runtime caches disabled and old named caches cleared on auth change.
- **UI changes:** File validation/error messages match actual capability; private reviewer preview added as direct integration repair. No Home/layout/palette work.
- **Security implications:** Identity documents cannot automatically become public profile photos; KYC is never persisted as token URL. Old token URLs/installed caches still require approved inventory/migration; no live objects were deleted.
- **Performance implications:** Private bytes not cached across sessions; public Firebase media currently network-only pending safe targeted cache policy.
- **Tests performed:** Root tsc clean; 150/150 main tests including 7 upload-contract cases; 5/5 Storage emulator cases from same canonical rules (17/17 combined security suite). No production upload claimed.
- **Known issues:** Current Firebase Storage requires Blaze, including default buckets; documented with official source in SPARK_LIMITATIONS.md. Authenticated reviewer browser CORS/device integration remains a deployment gate. Functions not deployed.
- **Next recommended task:** P0-E canonical booking state and atomic day locks, then payment truthfulness.

## 2026-09-05 — Phase 2 P0-C: Rules boundary and negative verification
- **Task:** Implement P0_PERMISSION_MATRIX.md against actual collection paths.
- **Objective:** Deny cross-user/privilege/verification/financial manipulation at Firebase, not merely React.
- **Files changed:** firestore.rules, storage.rules; SocialRepository.ts comment mutation contract; messaging.ts conversation creation; AdminApplicationsPage.tsx actor UID; services/admin.ts reviewer permission; security-rules.test.mjs, storage-rules.test.mjs, firebase.emulators.json; this changelog.
- **Architecture changes:** Immutable participant/author ownership; named admin roles instead of blanket authenticated/admin writes; atomic like/comment-counter relationships; real reviewer UID; idempotent conversation initialization preserves existing metadata.
- **Firebase changes:** Local Firestore/Storage rules replaced and compiled in emulators. No deploy. Booking writes deliberately fail closed at this checkpoint until P0-E supplies the state/lock policy. Payments/review-ledger writes denied pending authoritative contracts. Unsafe event registration producer denied pending P1 capacity implementation.
- **UI changes:** Reviewer operation uses actual authenticated actor, no invented admin-session; no layouts changed.
- **Security implications:** Six new tests failed against original rules, then all 12 Firestore and 5 Storage cases passed after repairs, including cross-user, self-KYC, low-role escalation, forged-payment, counter, private-document and invalid-upload cases.
- **Performance implications:** Bounded additional get/getAfter rule checks; no new application listeners. Comment mutations add lastCommentMutationId to validate atomic count deltas without Functions.
- **Tests performed:** 17/17 local emulator cases; root tsc clean; 143/143 main unit tests. Rules compilation and tests do not certify live deployed policy or production billing.
- **Known issues:** P0-D must align upload callers with the now-defined owner paths. Storage production access requires Blaze under current Firebase policy. Existing legacy identities/media/role assignments need inventory before deployment. Broader query/role/device coverage is added at P0-I.
- **Next recommended task:** P0-D public/private upload separation and canonical contract; P0-E restores bookings only with atomic validation.

## 2026-09-05 — Phase 2 P0-B: Canonical identity and authorization preflight
- **Task:** Trace UID/profile/roles/private operations and remove competing client privilege paths.
- **Objective:** Use Firebase UID for ownership and prevent cached/locally supplied roles or identities from authorizing operations.
- **Files changed:** services/identity.ts, profileBootstrap.ts, auth.ts, messaging.ts, offlineQueue.ts; UserRepository.ts, CompanionApplicationRepository.ts; AppContext.tsx, AuthModal.tsx, AdminGuard.tsx; admin AdminAuthContext.tsx; identity.test.ts, client-services.test.ts; P0_PERMISSION_MATRIX.md; emulator/test configuration and dependencies; this changelog.
- **Architecture changes:** Transactional, idempotent shared user bootstrap; no localStorage profile authorization fallback; account-generation guard; sender/owner preflight; offline replay rejects other/unowned entries; legacy self-activation and guide submission fail explicitly.
- **Firebase changes:** None deployed. Added local-only rules test harness; real negative rule assertions belong to P0-C. No second cloud project created.
- **UI changes:** Unsupported legacy guide form explains canonical Settings path; no layout/palette/feed changes. Admin hardcoded email super-admin fallback removed.
- **Security implications:** Own UID and editable-field checks are additional preflight, not rule security. Firebase rules remain the required boundary; permission matrix records the next checkpoint policy. Old cached profile PII is removed; authoritative profiles reload from Firestore. Legacy pending writes are preserved but not replayed under a different user.
- **Performance implications:** Profile transaction only at auth/bootstrap; no new live listeners.
- **Tests performed:** Root TypeScript clean; 143/143 main tests (126 existing + 3 dashboard + 14 identity). Existing messaging mocks were corrected to explicitly supply authenticated identities rather than weakening the new check.
- **Known issues:** Server denial/concurrency/storage verification still pending P0-C/D/E. Main/admin role compatibility and live legacy claims require pre-deployment inventory; private SDK/SW persistence needs further review. Functions remain paused.
- **Next recommended task:** P0-C minimum rules using P0_PERMISSION_MATRIX.md and emulator negative tests, then P0-D canonical uploads.

## 2026-09-05 — Phase 2 P0-A: TypeScript baseline
- **Task:** Investigate and repair all 17 audited TypeScript diagnostics.
- **Objective:** Restore type-safe application/tooling references without compiler suppression or fake records.
- **Files changed:** DashboardTab.tsx; services/dashboardData.ts; dashboard-data.test.ts; four Admin SDK App imports in migration/grant scripts; migration verify.ts; main/admin Vitest configs and setup mock paths; PHASE2_CHECKPOINTS.md; this changelog.
- **Architecture changes:** Dashboard derives UID-scoped loaded bookings/favorites through a pure selector. Tests are explicitly scoped to each app and mock its actual Firebase module.
- **Firebase changes:** None deployed; no scripts executed. Test-only emulator dependencies are being prepared for later authorization checkpoints.
- **UI changes:** Fixed missing hook/derived variables; booking value is labelled unverified, not settled spend. Layout/palette unchanged.
- **Security implications:** Dashboard selector excludes another customer's context records; test initialization no longer leaks through the incorrect Firebase mock path.
- **Performance implications:** No new network queries/listeners.
- **Tests performed:** Fresh root tsc: 17 -> 0 diagnostics. Existing main tests: 126/126; new dashboard selector regressions: 3/3. A missing required field in the new fixture was caught by tsc and corrected before the final clean check. Privileged scripts were type-checked only.
- **Known issues:** Remaining P0-B through P0-I not yet complete. No production readiness claim. Dashboard source/route behavior revisited in P0-H.
- **Next recommended task:** P0-B authorization/identity, then permission matrix and P0-C rules; no Home changes.

- **2026-08-12:** Firebase backend audit/redesign; admin panel extracted to standalone `/admin`; 38 admin tests. Cloud Functions implementation complete but deployment paused (Blaze plan).
- **2026-08-22:** Full project audit (no code changes) → `docs/SATHI_MASTER_SPEC.md`, `docs/SATHI_CHANGELOG.md` created.
- **2026-08-23:** Feed per-type caps introduced (companion 30% / activity 20% / event 20% / story 15% / post 15%) to stop activities dominating after deep scrolling; 146 tests passing.
- **2026-08-23:** Mobile "Explore by Activities" category chips replaced with real activity cards; duplicate "Popular Experiences" section removed.
- **2026-08-24:** SATHI logo (`public/sathi-logo.jpeg`) applied to desktop sidebar and Navbar, replacing "S" placeholder squares.

## 2026-09-05 — Phase 2 P0-G: Supported safety capabilities only
- **Task:** Match safety and privacy claims to traced behavior.
- **Objective:** Preserve alert recording without implying emergency dispatch, tracking, contact delivery, escrow or universal background checks.
- **Files changed:** SafetyWidget.tsx; services/sos.ts; ClientApp.tsx (wording and premature safety-panel timeout only); AuthModal.tsx; CompanionCard.tsx; CompanionApplicationCard.tsx; SettingsTab.tsx privacy controls; public HELP/TERMS_OF_SERVICE/PRIVACY_POLICY; safety-truthfulness.test.tsx; sos-service.test.ts; this changelog.
- **Architecture changes:** Alert acknowledgement means a successful single-location record write only. Removed local-only Cancel SOS state; no remote cancellation is claimed. Optional fields omitted instead of writing undefined; Auth UID explicit and duplicate click guarded.
- **Firebase changes:** No rules/deployment changes. Existing alert write preserved; no dispatch backend added. SPARK-COMPATIBLE NOW record/UI correction; monitored response requires backend plus staffed operations later.
- **UI changes:** Unsupported guarantees/placeholder emergency numbers removed; approval badge language narrowed; non-enforced privacy toggles disabled and explained. Existing appearance/layout retained. Removed the five-second safety auto-dismiss that interrupted location permission/write handling.
- **Security implications:** No false active privacy controls, contact acknowledgement or paid/escrow promise. Terms/privacy edits correct implementation claims only; not legal approval for launch.
- **Performance implications:** Single location read has 15-second timeout; no polling/tracking added.
- **Tests performed:** All 3 safety UI regressions failed before correction and passed afterward; 3 alert-service tests passed. Root TypeScript 0 diagnostics at the safety checkpoint. Source scan across src/public/admin found no remaining affirmative matched background-check, escrow, staffed-support or live-tracking claims in active safety copy.
- **Known issues:** No live/device emergency flow, staffing or token-delivery qualification. Existing seeded provenance and broader product placeholders are not certified. No automatic acknowledgement/delivery/cleanup infrastructure.
- **Next recommended task:** P0-H dashboard source references, then P0-I regression gate. No Home redesign or algorithm changes.

## 2026-09-06 — Phase 2 P0-H: Dashboard references and persistence
- **Task:** Repair dashboard references at their source; resume the checkpoint after interruption.
- **Objective:** Resolve incoming requests independently of public discovery page one; persist profile edits and keep account data isolated.
- **Files changed:** DashboardTab.tsx; PartnerDashboard.tsx; companionDashboard.ts; eventParticipants.ts (dashboard readers only); firestore.ts (opt-in strict reads); AppContext.tsx profile-update callback; ClientApp.tsx wallet placeholder only; firestore.indexes.json; dashboard-integration.test.tsx; profile-update-lifecycle.test.tsx; client-services.test.ts; services.test.ts; this log.
- **Architecture changes:** Companion requests use canonical UID. Joined-event details use one bounded ID query (at most 5), not a partial discovery cache or registration date as event date. Dashboard remounts account-scoped state on identity/role change. Profile context merges require the original UID after awaited persistence. Strict read opt-in preserves existing callers while exposing dashboard failures.
- **Firebase changes:** Added exact companionId/createdAt booking and userId/status/joinedAt registration indexes locally. No rule edits, deployment or migration. SPARK-COMPATIBLE NOW within quotas.
- **UI changes:** Existing profile save wired to repository persistence; Auth email read-only here. Booking totals labelled unverified loaded value, unmeasured profile views unavailable. Hardcoded wallet NPR 4,500 and partner financial metrics/offers removed; unavailable state instead of invented zeros. No layout or Home algorithm changes.
- **Security implications:** Regression reproduced a delayed A profile save overwriting B's local name; fixed by post-write UID and state-owner checks. Private requests cannot be requested under another supplied UID.
- **Performance implications:** Bounded recent queries; no discovery scan to find own companion; account teardown drops stale state. Favorites/customer companion names remain limited to loaded discovery records (P1 pagination/completeness).
- **Tests performed:** 4 dashboard tests failed against old behavior after correcting a test-fixture naming mismatch, then passed. Additional failure/customer cases passed (6 render tests total). Actual AppProvider account-switch test failed before the guard and passed after it. Relevant suites 66/66; root TypeScript 0 diagnostics. Fixed missing auth export in new strict-read test fixture; no suppression.
- **Known issues:** Index deployment and legacy canonical-UID inventory required; no live dashboard navigation/persistence qualification. New event joining remains deliberately denied pending P1 capacity implementation. Partner reporting/payment settlement not implemented.
- **Next recommended task:** P0-I combined regression/security/concurrency verification and final report; stop before Home completion.

## 2026-09-06 — Phase 2 P0-I: Final regression gate and handoff
- **Task:** Verify scoped stabilization, preserve media foundation, expose deferred audit regressions, then stop.
- **Objective:** Evidence-backed results rather than an all-green production claim.
- **Files changed:** tests/security-rules.test.mjs (+11 role-boundary cases and owner-query/anonymous case); new tests/home-deferred.test.ts; P0_STABILIZATION_REPORT.md; PHASE2_CHECKPOINTS.md; SPARK_LIMITATIONS.md; P0_PERMISSION_MATRIX.md; this log. Earlier checkpoint code unchanged during this final gate.
- **Architecture changes:** No application architecture changes. Separate explicit red Home acceptance suite records three deferred defects without skipped/expected-failure annotations. Full issue/root-cause/dependency/regression/verification register in the report.
- **Firebase changes:** No deployment or live writes. Current Firestore/Storage rules compiled and exercised in local emulators; existing booking/media contracts preserved. Updated documentation to remove obsolete Storage opt-in flag claim and clarify post-media permission scope.
- **UI changes:** None in this gate; previous P0-F/G/H integration and truthfulness changes verified.
- **Security implications:** All 11 explicit admin roles tested with conflicting legacy admin=true, private profile/KYC permissions, safety updates, root assignment and denied payment creation. Owner-only queries/anonymous denials added. This is selected boundary coverage, not exhaustive all-resource certification.
- **Performance implications:** Main/admin large-bundle warnings remain; no load/cost certification. No new Home logic/listeners introduced.
- **Tests performed:** Main 191/191 (19 files); admin 40/40 (6 files); combined Firestore/Storage/booking/media emulators 45/45; root/admin TypeScript 0 diagnostics; booking-policy/rules parity passed; both builds passed. Deferred Home acceptance: 0/3, with OLD retained instead of EDITED, overlapping post ID suppressed, and maximum companion run 8. Aggregate 276 passing and 3 explicit deferred failures. No skipped tests.
- **Known issues:** Whole-project regression gate is not green and the app is not production-certified. No live rules/index/billing verification, provider sandbox payment, physical-device QA, exhaustive role/resource audit or production concurrency/load testing. Legacy data/claims/media inventory and remaining P1 workflows documented in the handoff. Emulator startup was slow; tests then passed and emulators shut down normally.
- **Next recommended task:** STOP. Await owner approval for Phase 3 Home completion or a separately authorized inventory/rollout. Do not deploy, migrate, activate Functions or begin Home automatically.

## 2026-09-06 — Phase 3 Home: shared feed and interaction stabilization
- **Task:** User explicitly approved Phase 3 after the P0 checkpoint, then requested resume. Preserve prior P0/media changes and do not deploy.
- **Objective:** Fix the three reproduced Home regressions, then repair shared responsive loading and truthful social interactions without redesigning Home.
- **Files changed:** feedGenerator.ts; feedStabilizer.ts; useDiscoveryFeed.ts; useProgressiveReveal.ts; useFirestoreData.ts; useVisibleStories.ts; new useFeedReaction.ts; SocialRepository.ts; firestore.ts; deepLinks.ts; ClientApp.tsx; DiscoveryFeed.tsx; FeedSocialCards.tsx; SocialPostCard.tsx; usePostComments.ts; CommentsPanel.tsx; PostPage.tsx; firestore.indexes.json; five new Home test files under src/__tests__ (acceptance moved from tests/home-deferred.test.ts); two added emulator security cases; PHASE3_HOME_CHECKPOINT.md; historical Home/loading documentation notices; this log. Mechanical LF normalization limited to touched Phase 3 code files.
- **Architecture changes:** Typed feed identity; deterministic UID/session regeneration from actual source arrays; global append-only survivor order with fresh payloads and separate source membership. Desktop/mobile use separate sentinel refs and one visibility-aware reveal/load contract. Discovery windows revalidate bounded server heads on remount instead of replaying permanent session/offline history. Shared UID/type/ID reaction state serves both Home card trees and the Story viewer, serializes actions and waits for fresh server confirmation. Open comments now use a latest-50 window plus a parent summary listener; window size is not the total.
- **Firebase changes:** One local comments(postId ASC, createdAt DESC) index added, preserving the existing ascending index. No rules, production data, Storage policy, billing or Functions deployment changes. New reaction reads are bounded direct document lookups; existing write transactions retained.
- **UI changes:** Preserve layout/palette and legitimate header/Stories placement. Remove duplicate mobile activities/events tail and dead social handlers. Expose page/comment/reaction retry; unavailable Story comment/share and Save controls no longer claim persistence. Exact post errors distinguish unavailable from not found. Activity navigation works on both surfaces; Home Enter/filter application uses existing companion search; Home tab state stays aligned across responsive navigation. Capacity is not labelled remaining spaces; remove unsupported weekly-earnings promise from Home CTAs.
- **Security implications:** Auth-required reactions do not increment locally, old-account results stay isolated, and ambiguous acknowledgements require refresh. No fake-success shortcuts or rule bypass. Offline Home data availability intentionally yields to server visibility revalidation. Existing broader legacy/offline/Community surface risks remain documented.
- **Performance implications:** Page sizes remain 15 companions / 10 other discovery collections; identical in-flight query keys include cursor, size and filters. Explicit exhaustion and no-progress guards; mounted-window teardown discards late results. Two direct reads per authenticated reaction initialization/refresh, deduplicated across shared surfaces, and after mutations; two listeners per opened post only. Large retained feed windows, reaction focus traffic and bundle sizes require measurement.
- **Tests performed:** Final main 217/217 in 24 files; admin 40/40 in six files; actual loopback Firebase suite 47/47 (including fresh-reader like/unlike and comment edit/delete/count tests). Total 304 passing, no skipped tests. Root/admin TypeScript 0 diagnostics; both Vite builds and main PWA generation passed. Final main JS 1,926.68 kB / 501.83 kB gzip; existing bundle warnings retained. Scoped Phase 3 whitespace diff check passed. Emulators shut down normally.
- **Known issues:** This is a local stabilization checkpoint, not all-Home or commercial-production certification. No browser/device/live-Firebase qualification or index deployment. Existing event registration remains unresolved; search is limited to loaded records; older comments beyond 50 need pagination; other Community screens still have independent state; image-viewer parity and category-schema normalization require follow-up. Full details and prioritized dependencies/verification are in PHASE3_HOME_CHECKPOINT.md. Earlier audit/P0 counts remain historical.
- **Next recommended task:** Review this checkpoint, then qualify actual desktop/mobile/PWA navigation, scrolling and authenticated flows locally before any separately approved rollout. Keep production deployment, migrations and Functions activation out of scope.

## 2026-09-06 — Phase 3 resume: browser-qualified discovery pagination
- **Task:** Continue the approved Home work after resume; preserve all prior dirty P0/media changes.
- **Objective:** Qualify responsive guest behavior and fix the observed inability to search later loaded companion pages without a redesign.
- **Files changed:** ClientApp.tsx; components/discovery/DiscoveryFeed.tsx; new components/discovery/DiscoveryPageControl.tsx; new services/discoverySearch.ts; hooks/useCompanionCategories.ts; new __tests__/discovery-search.test.tsx; PHASE3_HOME_CHECKPOINT.md; this log.
- **Architecture changes:** Both companion layouts share one search helper and explicit page control using the existing cursor hooks. Mobile activity/event results reuse that control. No automatic fetch-until-match; failure messages name Home sources. Search guards legacy fields and category dictionaries, without claiming full document validation.
- **Firebase changes:** None. No rules/index deployment, Functions activation, billing or production writes. Browser guest checks read configured public Firebase data only.
- **UI changes:** Loaded-match counts, load-more/retry and pending controls; empty states scoped to loaded records. Existing theme/layout preserved. Unknown prices no longer pass the price filter as zero.
- **Security implications:** No permission relaxation, secrets or fabricated profile fields. Error UI shows source names rather than raw backend details. Broader malformed-document and media policy qualification remains open.
- **Performance implications:** One existing 15-companion or 10-activity/event cursor page per explicit action, no extra listeners. Guards block duplicate actions. Existing bundle-size warning and large retained windows remain.
- **Tests performed:** Main 225/225 in 25 files, including 8 new search/control cases; root TypeScript zero diagnostics; production build/PWA generation passed (main JS 1,928.39 kB / 502.58 kB gzip). Guest browser: 390x844 search Enter/Show more/pagination, 15 to 30 loaded companions; 1280x900 resize preserves matches and next desktop page ends at 40. Prior admin/emulator counts were not rerun. No physical-device or installed-PWA test.
- **Known issues:** Live-backed local Home reports Stories unavailable (specific cause unverified); browser console confirms missing comments descending composite index. No index deployed. Sidebar dates/capacity claims, event registration, complete runtime schema validation, full-database search and authenticated live flows remain unqualified. Checkpoint addendum records evidence and follow-up dependencies.
- **Next recommended task:** Diagnose Story query failures read-only and review live index status; require approval before any rollout. Continue controlled authenticated/PWA qualification without representing local test success as deployed functionality.

## 2026-09-06 — Phase 3 resume: live Story/comment index diagnosis
- **Task:** Read-only diagnosis after the browser-qualified checkpoint.
- **Objective:** Identify the real Story query failure and distinguish absent production indexes from local configuration or loading assumptions.
- **Files changed:** New HOME_LIVE_QUERY_DIAGNOSIS.md; diagnostic update in PHASE3_HOME_CHECKPOINT.md; this log. No application code changed.
- **Architecture changes:** None.
- **Firebase changes:** None. Two bounded, unauthenticated Web SDK server queries and read-only CLI index inventory only. No deploy, writes, authentication as a user, billing or Functions activation.
- **UI changes:** None.
- **Security implications:** Query probes preserved the actual public/active/moderation/expiry constraints, asserted project hamrosathi1, printed sanitized errors rather than documents, and did not use seeded credentials or rule bypasses.
- **Performance implications:** Limits of 10 Stories and 50 comments for one existing post; no collection scan or live listener. Proposed indexes have ordinary indexing/storage overhead; no load guarantee.
- **Tests performed:** Actual Story query imported from mediaQueries.ts and latest-comments query for cp10 both returned failed-precondition / query requires an index. CLI inventory succeeded with 60 composites and only the old ascending comments index among stories/comments. Required Story and descending-comments indexes are absent live and present locally. Documentation whitespace check performed; application test/build gates were not rerun for documentation-only work.
- **Known issues:** Both live queries remain blocked until the exact indexes are created and ready. Resolving this prerequisite may reveal additional rules/data problems; query success alone will not prove media or comment write functionality.
- **Next recommended task:** Obtain explicit approval to create only the two required production composites, preserve all existing indexes/rules and then repeat the bounded queries and responsive read checks. Do not deploy the whole dirty repository.

## 2026-09-06 — Canonical comment timestamp/query foundation
- **Task:** Resume local architecture work following the owner's priority of correct contracts over preserving scripted records.
- **Objective:** Align comment writes, query order, display and rules; remove the confirmed unused alternate reader without production changes.
- **Files changed:** New services/commentContract.ts and __tests__/comment-contract.test.ts; SocialRepository.ts; services/firestore.ts; usePostComments.ts; CommentsPanel.tsx; CommentComposer.tsx; home-comments-links.test.tsx; firestore.rules; tests/security-rules.test.mjs; new COMMENT_QUERY_CONTRACT.md; PHASE3_HOME_CHECKPOINT.md; HOME_LIVE_QUERY_DIAGNOSIS.md; this log.
- **Architecture changes:** Canonical server Timestamp writes, allowlisted payloads, shared 500-character validation, latest-50 descending time/ID query. Removed unused getComments and unreachable create fallback; comment edit failures no longer enqueue custom deferred writes. Unsupported legacy times fail explicitly without compatibility conversion.
- **Firebase changes:** Local-only comment create rules require matching ID and server request time; create/edit length bound 500. Optional document-ID direction added to the generic query builder, preserving ascending defaults for existing callers. No production data, rules, indexes, billing or Functions changed.
- **UI changes:** Timestamp-aware dates and shared composer/edit limits; pending timestamps stay undated. No layout/palette redesign.
- **Security implications:** Client-generated creation times and spoofed IDs rejected; immutable creation time retained on edit. Failed edits are not replayed by the custom queue. SDK buffering and broader schema validation remain separate concerns.
- **Performance implications:** Existing 50-record listener bound retained, explicit ID tiebreaker; no new listener or automatic scan. Older-history UI is not implemented.
- **Tests performed:** Final main regression 231/231 in 26 files; root TypeScript zero diagnostics; Vite build/PWA generation passed. Actual loopback Firestore rules suite 28/28 including two new timestamp/ID/length and tied-cursor tests; emulators shut down normally. Scoped whitespace check passed. An intermediate new-test unsubscribe mock failure was corrected before the full successful rerun. Other emulator/admin/device gates not rerun.
- **Known issues:** Breaking Timestamp schema needs coordinated rollout/reset scope, not an index-only release. Production missing indexes remain. Latest-50 history limit, Story ordering contract, SDK reconnect behavior and authenticated UI qualification remain open. No sample data deleted or migrated.
- **Next recommended task:** Complete deterministic older-comment paging and Story time/order contracts locally, then seek explicit production reset/release scope. Follow COMMENT_QUERY_CONTRACT.md rather than the earlier index-only plan.

## 2026-09-06 — Match light theme to the SATHI logo
- **Task:** Align the existing light appearance with the supplied repository logo.
- **Objective:** Use the navy handshake and golden crescent as the visual palette while retaining the current layout.
- **Files changed:** src/index.css; src/components/settings/SettingsTab.tsx; this log.
- **Architecture changes:** Light semantic theme tokens updated; preference switches use a theme token with their existing dark-mode value preserved.
- **Firebase changes:** None.
- **UI changes:** Navy primary controls/text, white cards, soft blue-white surfaces and borders, gold navigation highlight and star fills, readable amber rating/gold-label text. Navy overlay tags retain white-text contrast. Appearance copy now describes the actual brand palette. Existing dark tokens preserved; stylesheet line endings normalized.
- **Security implications:** None; visual-only changes.
- **Performance implications:** No new dependencies, data reads or listeners.
- **Tests performed:** Local browser inspected in light mode at desktop and 390x844 mobile viewport; production build and PWA generation passed. No new unit tests for palette/copy changes. Existing large-bundle warning remains.
- **Known issues:** Pre-existing Stories query failure remains visible; this task does not change backend behavior. Physical-device visual checks were not performed.
- **Next recommended task:** Review the light appearance before publishing; continue the separately tracked application work as requested.

## 2026-09-06 — Story confirmation and avatar replacement verification
- **Task:** Complete the narrowly approved Story/profile-photo reliability work without changing Home, dark mode, routing, or unrelated domains.
- **Objective:** Confirm the server-assigned Story lifetime exactly, prevent upload waits from being indefinite, and prove that a replaced avatar cannot leave its prior owned object behind.
- **Files changed:** src/services/mediaUploadCore.ts; src/types.ts; src/__tests__/media-deadline.test.ts; tests/media-flows.test.ts; this log. The existing logo-aligned light-theme files remain unchanged in this continuation.
- **Architecture changes:** A Story is owner-only while its server Timestamp resolves, then makes a single guarded transition to active with expiry exactly 24 hours after that server time. Avatar state still flows through the shared authenticated profile state.
- **Firebase changes:** Existing Story/Profile media rules and the active-Story composite query contract are exercised locally; no deployment, production write, migration, billing, or Functions activation.
- **UI changes:** No layout change in this continuation. Existing retry/preview progress and the profile-avatar edit entry point remain intact.
- **Security implications:** The pending-to-active transition is owner-scoped and moderation fields remain protected. Prior avatars are removed only after the new canonical `users/{uid}` reference succeeds; cleanup failure cannot undo the saved replacement.
- **Performance implications:** One bounded confirmation read/transaction per Story and no listener, scan, or per-component profile fetch. Upload-stage timeouts free a stalled UI while retaining the same stable draft for safe retry.
- **Tests performed:** Root TypeScript 0 diagnostics; media deadline unit tests 3/3; Story/profile UI and query tests 8/8; actual loopback Firestore/Storage media suite 11/11, including exact 24-hour expiry and avatar replacement cleanup. No live Firebase/device upload performed.
- **Known issues:** Existing production rules/indexes are not deployed or live-qualified. Read-only 2026-09-06 Cloud Storage inventory found no bucket in `hamrosathi1`; the configured `hamrosathi1.firebasestorage.app` endpoint therefore fails browser preflight and all direct uploads. Provisioning a new Firebase Storage bucket now requires Blaze/billing approval. Already-issued download URLs cannot be retroactively revoked; device camera and load behavior remain untested.
- **Next recommended task:** Review the scoped local changes and, only with separate rollout approval, deploy the exact existing Story index/rules and perform authenticated live checks.

## 2026-09-06 — Production rules safety gate
- **Task:** Compare deployed Firebase rules with local rules before the explicitly authorized Story/profile rollout.
- **Objective:** Stop any deployment whose semantic scope extends beyond Stories, Story media, profile photos/media, and necessary helpers.
- **Files changed:** New `docs/sathi/rollbacks/2026-09-06-production-rules/` exact production-rule rollback artifacts and release manifest; new `PRODUCTION_RULES_SAFETY_GATE_2026-09-06.md`; this log. No application code changed.
- **Architecture changes:** None.
- **Firebase changes:** No rules, indexes, CORS configuration, Functions, data, billing, or production document writes deployed. The newly created bucket's Firebase preflight was read-only verified as HTTP 200.
- **UI changes:** None.
- **Security implications:** STOPPED: production Firestore and Storage rules are substantially different from checked-in rules outside Story/profile scope. Full deployment would change authorization for users, Community, comments, likes, events, bookings, messaging, notifications, KYC/private, and additional paths.
- **Performance implications:** None; the required Story index was validated locally but intentionally not created.
- **Tests performed:** Captured both active rulesets read-only with release IDs and SHA-256 hashes; semantic branch inventory and line-stat comparison completed. Per owner stop condition, no post-diff rollout tests ran.
- **Known issues:** The newly created bucket remains on its default deny-all Storage policy, and the deployed Story query index is still absent. Stories/profile uploads cannot be production-qualified until a minimal reviewed policy is prepared.
- **Next recommended task:** Prepare a separately reviewed, minimal patch against the archived production rule sources. Do not deploy the broad local files.

## 2026-09-07 — Scoped production Story/profile rollout and live verification
- **Task:** Resolve Story failed-precondition and media storage/unauthorized errors under the production rules safety gate.
- **Objective:** Enable only Stories/profile media, preserve unrelated production permissions, verify actual persistence and cross-user authorization.
- **Files changed:** New ops/media-rollout rules, README, service-agent change record and opt-in live probe/recovery scripts; firebase.media-rollout.json; production-media-gate and production-media-parity tests; PRODUCTION_MEDIA_ROLLOUT_2026-09-06.md; historical gate report cross-reference; this changelog. Existing dirty application changes were preserved, not edited in this rollout.
- **Architecture changes:** Separate production-baseline-derived deployment inputs prevent accidental rollout of the much broader root rules. Shared production upload/query implementation exercised without modification.
- **Firebase changes:** Deployed reviewed Story/profile-only Firestore and Storage candidates to hamrosathi1; created the one exact Story index, verified READY. Added only roles/firebaserules.firestoreServiceAgent (datastore.entities.get) to the Firebase-managed Storage service account for required Firestore-backed media authorization. No CORS, Functions, other index, billing, migration or unrelated collection/path policy changes.
- **UI changes:** None. Actual localhost UI connected to live Firebase was exercised with disposable accounts and the existing SATHI logo asset.
- **Security implications:** Source preservation proof and 81 behavioral parity checks passed. Live cross-user Story edit, profile edit and Story-path upload denied; owner moderation mutation denied. Existing conversation/favorites weaknesses and Story-counter behavior intentionally preserved and documented. Rollback rule sources and IAM before-state retained.
- **Performance implications:** Exact bounded Story query now has its composite index. Storage authorization adds the documented canonical-record lookup; no new app listener or scan.
- **Tests performed:** Final emulator gate 15/15 passing, including 81 production-versus-candidate permission comparisons. Deployed source read-back exactly matched tested files. Two post-propagation live normal-client probes passed upload, canonical Firestore persistence, exact expiry, indexed second-user reads, fresh-client reads, image decoding and four negative authorization cases. UI Story chooser/caption/publication/viewer-caption and profile chooser/upload/saved acknowledgement/visible 1024px preview passed. Final post-refresh image measurement/UI-specific extra verifier was interrupted; this limit is explicit in the report. git diff --check passed.
- **Known issues:** SafeImage can leave loaded Story thumbnails at opacity 0; guest Story Sign In dispatch has no matching event listener while profile-menu login works. No application fix applied without approval. Copied media download-token URLs are not revoked by document moderation. KYC/events/private Storage remain denied under preserved production policy. Native/mobile/PWA/Vercel-build visual flows not independently verified.
- **Next recommended task:** Approve a small application patch for cached-image readiness and the guest Story auth trigger, then repeat visual Story/refresh checks. Separately review the pre-existing unrelated production security gaps before real users. All disposable accounts, profiles, Stories and media from this rollout were removed; exact test-prefix emptiness verified.

## 2026-09-07 — Fix cached image readiness and guest Story sign-in
- **Task:** Resume the two UI fixes proposed after the Firebase rollout.
- **Objective:** Reveal already-loaded images reliably and connect the guest Story prompt to the existing login dialog.
- **Files changed:** src/components/ui/SafeImage.tsx; src/hooks/useAuthModalTrigger.ts; src/ClientApp.tsx; src/__tests__/media-ui-regressions.test.tsx; this changelog.
- **Architecture changes:** Image readiness/error state is keyed by source and srcSet, with a cached-image completion check rather than a post-load reset effect. The shared auth event is consumed by ClientApp's existing authMode state; no duplicate authentication state or dialog added.
- **Firebase changes:** None. No rules, indexes, IAM, CORS or production data changes.
- **UI changes:** Correct image visibility and guest Story Sign In routing; existing visual design, fallbacks, loading overrides and caller image callbacks preserved.
- **Security implications:** No permission or authentication-policy changes. Auth event listener is removed on unmount.
- **Performance implications:** Constant-time cached-image readiness check; no polling, extra network fetches or Firebase listeners.
- **Tests performed:** 242/242 tests passed across 28 files, including 8 new regression tests for cached/StrictMode images, cold loads, source replacement/stale events, fallbacks, srcSet, listener cleanup and real guest Story prompt routing. TypeScript passed; production build completed, including PWA output. Existing large-bundle warning remains. Browser verification could not complete: local server was initially stopped, and the in-app browser subsequently blocked navigation from its generated connection-error page. No browser policy bypass attempted.
- **Known issues:** Physical/mobile/PWA and fresh browser visual verification of this patch remain unverified. Story's existing five-second auto-advance timing was not changed. These application changes are local, not deployed to Vercel.
- **Next recommended task:** Verify guest Your Story → Sign In and cached Story/avatar visibility in a fresh local browser; then approve/push the application deployment separately.

## 2026-09-07 — Production media, owner-grouped Stories, Events and interaction notifications
- **Task:** Implement the explicitly scoped production Stories/media/Events/notifications request. Coordinated Firebase and Vercel release approved in this task.
- **Objective:** Optimized owned media, one bubble per Story owner, exact expiry with backend physical cleanup, real user Events/interactions, authoritative notifications and direct content links.
- **Files changed:** Media optimization/upload/contracts/query services; Story grouping and interaction services/components; Event composer; media detail routes; notification/auth integration; functions/src/mediaSocial.ts and exports; scoped ops/media-rollout rules/indexes/configuration/rollback tooling; related tests; this log. Unrelated existing user changes preserved.
- **Architecture changes:** 512px profile master/128px avatar, 1920px Story master/320px preview, 1600px Event master/640px card; WebP quality 0.86 with JPEG fallback, no upscaling. Existing collections retained; added event_likes, story_comments, event_comments and backend-only per-interaction receipts/cleanup tickets. Owner Story viewer uses 20-document cursor pages; detail routes avoid loading Home discovery.
- **Firebase changes:** Production baseline re-fetched and rollback stored in rollbacks/2026-09-07T10-47-06-971Z-media-social. Four required composite indexes submitted, existing notifications index reused. Added hamrosathi.vercel.app to Auth domains, enabled reCAPTCHA Enterprise API and registered domain-scoped public App Check site key for both existing web app IDs. Enforcement unchanged/off. Coordinated rules/functions/app cutover is IN PROGRESS; final report must record actual release outcomes rather than treating these preparations as deployment success.
- **UI changes:** Existing-theme Create Event entry/form, Story owner grouping, comments entry, direct Story/Event details, notification target navigation. Existing auth dialog reused; no unsolicited notification-permission prompt at login. No admin UI, dark theme or unrelated domain redesign.
- **Security implications:** Normal-client interaction counters move to backend-only writes; deterministic notification IDs prevent retry/re-like spam; self interactions do not notify. Scoped rule source proof shows unrelated collection branches unchanged. App Check token status contains no token values. Old clients must refresh during counter-authority cutover; no broad allow rules or CORS changes.
- **Performance implications:** Bounded page sizes and cleanup batches, independent interaction/notification documents, no startup comment downloads or per-client cleanup. Two image objects per upload and asynchronous Functions/Firestore operations introduce metered costs on release. No concurrency/load claim.
- **Tests performed:** 248/248 main app tests passed with maxWorkers=2/minWorkers=1/testTimeout=15000 (an initial unrelated booking test timed out at 5 seconds; booking code untouched). Eight real Firestore/Storage emulator integration cases passed, exercising two authenticated contexts, four notifications, deduplication, counter/moderation denial, scheduled expiry and generation-safe orphan cleanup. Two production-source scope checks passed. Main/backend TypeScript passed; Vite/PWA build passed before final App Check diagnostics/route cleanup, final build pending. Browser guest Event-to-existing-auth and unavailable Story deep link verified. No live two-user production acceptance claimed yet.
- **Known issues:** Await final cutover/live checks. Physical devices and 10k concurrency untested. Existing download-token URLs remain shareable until object deletion. Legacy interaction counts have no historical backend receipts. Cleanup throughput and durable receipt retention require monitoring. Existing Functions dependency audit reported 18 vulnerabilities including dev dependencies; no unrelated mass dependency rewrite performed.
- **Next recommended task:** Complete the approved coordinated rollout, read back exact deployed rules/indexes/function state, verify production App Check tokens without enforcement, and run disposable two-user production acceptance and cleanup.

## 2026-09-09 — Focused Events capacity/deletion and desktop navigation
- **Task:** Complete only mobile Events-button removal, owner deletion, participant capacity, and desktop Activities/Companions navigation.
- **Objective:** Safe canonical Event participation and ownership, with existing pages and unrelated features preserved.
- **Files changed:** ClientApp.tsx; App.tsx; CreateEventModal; EventActions; Event-only ContentDetail integration; eventContract/eventParticipants/eventParticipationCore; Event branch of mediaUploadCore; Event type; ops/media-rollout/firestore.rules; Event UI/emulator/scope tests and relevant existing fixtures; FOCUSED_EVENTS_NAVIGATION_RESULT.md; this changelog. Preexisting Navbar and Explore-partner edits preserved.
- **Architecture changes:** Existing spots and deterministic top-level event_participants reused; new Events initialize protected participantCount and participationVersion. Exact two-document transactions replace unsupported transaction-query counting. Soft-delete tombstones retain relationships; owned image cleanup follows confirmed Firestore persistence.
- **Firebase changes:** Candidate changes limited to events and event_participants, including closing the unused nested normal-user write path. No Storage/index/Functions changes or production deployment. Legacy unverified counts fail closed for new joins, while legitimate legacy cancellation remains available.
- **UI changes:** Removed only mobile bottom Events button. Existing Event listing/form remain accessible. Owner confirmation and minimal capacity labels added. Desktop Companions reuses discovery UI; Activities navigates to the existing hash section with header clearance. Prevented mobile scroll restoration from overriding desktop navigation.
- **Security implications:** Coupled rules enforce membership identity and exact bounded count changes; unpaired/cross-user writes denied; owner-only tombstones cannot be restored by normal users. No unrelated rules changed. Media identity/path checked before deletion.
- **Performance implications:** Constant-size transactional reads, no participant arrays or collection count scans, bounded conflict retry and existing pagination retained. One popular Event remains a contention point; no 10k-concurrency claim.
- **Tests performed:** 256 main-app tests/31 files; 16 Firestore/Storage emulator cases including Event race/idempotency/deletion and media interaction regressions; three scope checks; TypeScript and production/PWA build. Local desktop navigation/back and 390x844 mobile bar/Events detail verified. No captured error-level browser console entries. Evidence and limitations in FOCUSED_EVENTS_NAVIGATION_RESULT.md.
- **Known issues:** Local only; coordinated app/rules release and trusted legacy/admin Event reconciliation required. No physical-device or live authenticated production acceptance/load test. Old media without orphan tickets may require cleanup follow-up on failure. Dedicated native Event sharing not found/tested; direct Event URLs preserved. Existing bundle warning remains.
- **Next recommended task:** Obtain approval for a coordinated Event app/rules rollout with fresh production rollback/scope checks and a deliberate legacy-capacity decision. Stop here; no other SATHI feature work.

## 2026-09-09 — Desktop presentation polish only
- **Task:** Improve desktop content layout, card-family proportions, spacing and Story-composer presentation only.
- **Objective:** Use the existing center canvas coherently without changing records, order, navigation or functionality.
- **Files changed:** src/desktop-polish.css (new); index.css import; class names only in ClientApp, DiscoveryFeed, DiscoveryContentContainer, SocialPostCard and CreateStoryModal; desktop-layout.test.tsx; this changelog. Earlier uncommitted Event/backend work was preserved, not extended.
- **Architecture changes:** None. Presentation uses the existing desktop shell with a flexible center/fixed 280px utility rail, auto-fit Companion/standard CSS grids and wrapping mixed-feed rows. Unpaired standard cards expand naturally; full media and headings retain full rows. No dense placement, record duplication, JavaScript measurement, new dependency or feed grouping changes.
- **Firebase changes:** ZERO for this task. No rules, indexes, queries, Storage, Functions, APIs or deployment changes.
- **UI changes:** Desktop-only width-cap removal, 20px card gaps/32px major spacing, two-to-three Companion columns, two standard columns when space permits, consistent radii/borders/padding and bounded non-distorted media. Existing useful rail/sidebar and content remain. Story composer gets an independent rgba(0,0,0,.72) backdrop, opaque panel, desktop scroll bounds, comfortable controls and contained image preview. Existing mobile form structure remains.
- **Security implications:** No auth, ownership or permission changes. No live user write performed during visual QA.
- **Performance implications:** CSS Grid/Flexbox only; no expensive layout JavaScript, masonry library, new listeners or animation effects. Feed order and identity regression test passes.
- **Tests performed:** Existing full suite 256/256 plus two new layout/order tests, separately run. Main TypeScript and Vite/PWA build passed; final CSS build rerun. Browser inspected 1920/1440/1280/1024 desktop widths (no horizontal overflow; rail hidden at 1024), wide/two-column Companion grids, two-column Activity cards, Home media-height limits and 390px mobile layout. Guest Add Story backdrop computed rgba(0,0,0,.72)/opacity 1, Cancel works. Existing mocked Story select/caption/publish/error/duplicate-submit tests passed. Source comparison confirmed touched TSX changes are presentation class names only.
- **Known issues:** No recording attachment was available beyond the text brief. Browser session was a guest: authenticated composer appearance with a selected image and actual production publishing were not live-tested. No physical-device claim. Existing large JS bundle warning remains. Changes are local and uncommitted; no publish/push in this pass.
- **Next recommended task:** User visual review and authenticated composer acceptance before any separately approved release. Stop; do not expand into another feature.

## 2026-09-10 — Master architecture and Antigravity handoff (documentation only)
- **Task:** Reconstruct the actual application and design an incremental Nepal-wide product/architecture handoff for implementation by Antigravity.
- **Objective:** Preserve existing identities, Firebase project, data and working features while defining unambiguous capability, agency, partner, money, safety and responsive-product contracts.
- **Files changed:** New docs/sathi/20_TARGET_ARCHITECTURE.md, 21_ROLE_CAPABILITY_MATRIX.md, 22_AGENCY_GUIDE_ARCHITECTURE.md, 23_PARTNER_QR_ARCHITECTURE.md, 24_WALLET_LEDGER_ARCHITECTURE.md, 25_REFERRAL_ARCHITECTURE.md, 26_EVENTS_ARCHITECTURE.md, 27_RECOMMENDATION_ARCHITECTURE.md, 28_SAFETY_TRIP_ARCHITECTURE.md, 29_PRODUCT_INFORMATION_ARCHITECTURE.md, 30_IMPLEMENTATION_ROADMAP.md, 31_DATA_CONTRACTS.md, 32_DESIGN_TOKENS.md and ANTIGRAVITY_HANDOFF.md. Added precedence/version notes to AGENTS.md, 00_MASTER_OBJECTIVE.md, 06_DATA_MODEL.md, BOOKING_STATE_MACHINE.md, COMMENT_QUERY_CONTRACT.md and HOME_FEED_ARCHITECTURE.md; this changelog.
- **Architecture changes:** DESIGN ONLY. One UID/multiple capabilities; one active primary guide agency; distinct hangout vs booking authority; backend commands and tenant RBAC; immutable per-asset ledger with source lots; one-time purpose-bound QR; paid Event hold contract; bounded deterministic recommendations/shared responsive composition; consent-scoped safety. Thirteen phases (0–12) include dependencies, scope, migration, tests, failure handling, stop conditions and copyable prompts. No phase implementation is claimed complete.
- **Firebase changes:** ZERO. No rules/index/config edits, deployment, production data writes, migrations, CORS or App Check changes. Source and dated production rollback/release artifacts inspected; fresh production inventory remains Phase 0, not asserted complete by this session.
- **UI changes:** ZERO. Documented existing logo-led tokens, proposed card/navigation grammar and approval-gated responsive work; public guest desktop observation only. No new UI or Story comments.
- **Security implications:** Documented root/ops/production rules divergence, legacy Functions hazards and private KYC deployment gap. All money/cash/deep-referral gates remain off by design pending authority/compliance; backend authorization, dual control, idempotency and cross-tenant tests specified. Documentation is not a production-hardening certificate.
- **Performance implications:** Proposed bounded candidate pools, cursor windows, transactional quotas/source-lot caps, scoped listeners and checkpointed workers. No queries/listeners/runtime performance changed.
- **Tests performed:** Read-only source/config/rules/service/repository/route inspection against baseline 5ecc696; cross-checked historical verification and public guest UI. Official Firebase, Khalti, eSewa, NTB and NRB references linked with limits. Document validation: 14 new documents, 13 local links resolved, 11 Mermaid blocks with balanced fences, 13 complete phase specifications and 13 prompts; no structural errors. git diff --check passed. Semantic review resolved duplicate Free Friend booking authority, Event admission hold identity, payment queue field names and per-asset journal IDs. Historical document line endings preserved.
- **Known issues:** No fresh application/emulator/provider/live-auth acceptance run for this docs-only task; no diagram renderer or physical-device verification. Current deployed permissions/billing/App Check/PWA and signed-in comment acceptance still need fresh evidence. Legal/provider clearance, prices/caps, verification/retention policy and staffed safety operations remain explicit owner gates. The handoff is an implementation specification, not approval to activate all features.
- **Next recommended task:** Owner review/select Phase 0 — Production compatibility and security baseline. Antigravity should use Prompt 0 in 30_IMPLEMENTATION_ROADMAP.md and stop after read-only production comparison, rollback capture, baseline tests and a scoped containment plan. No automatic deployment or next phase.

## 2026-09-10 — Phase 0 read-only production compatibility gate
- **Task:** Resume with the bounded Phase 0 baseline, not product implementation or deployment.
- **Objective:** Capture actual production contracts, establish reproducible security/compatibility evidence and propose scoped containment.
- **Files changed:** PHASE_00_COMPATIBILITY_REPORT.md; rollbacks/phase-00-2026-09-10/{firestore.rules,storage.rules,manifest.json,read-only-observations.json}; tests/architecture-baseline.test.mjs; continuity notes in ANTIGRAVITY_HANDOFF.md, 20_TARGET_ARCHITECTURE.md and AGENTS.md; this changelog. Prior uncommitted architecture package preserved.
- **Architecture changes:** No application architecture implemented. Diagnostic-only tests load byte-verified captured production rules into a loopback emulator; known-risk passes explicitly mean unsafe behavior reproduced.
- **Firebase changes:** ZERO production mutations/deployments. Read active rule sources/releases, all66 index metadata, seven active media handlers, billing/database metadata and limited masked schema samples. Rules match saved hashes and end-of-audit releases. Billing enabled; PITR and deletion protection disabled. No credential, KYC, private message text or personal contact content saved. Local synthetic emulator fixtures only.
- **UI changes:** ZERO. Public HTTP asset inspection and unauthenticated projected Story/Event/comment REST reads; no fresh browser/device/UI upload acceptance.
- **Security implications:** Reproduced stranger conversation takeover/deletion and downstream message disclosure, cross-user favorite writes, read_only_admin payment mutation, unreviewed companion verification, forged booking/payment/lock writes, Community moderation restoration and Event roster disclosure. Actual v2 owner cancellation is denied by deployed lock policy. Root rules/legacy Functions must not be deployed wholesale. Full issue-specific evidence/fix/dependency/regression/verification plan in report; gate NOT PASSED.
- **Performance implications:** Bounded samples/queries only. Two actual Event participation queries return FAILED_PRECONDITION despite all deployed indexes being READY. Main/admin bundle warnings retained; no runtime query changes.
- **Tests performed:** Main261/261 (33files) on final reduced-worker run; admin40/40 (6files); three source-scope checks; booking-policy check; main/admin/functions TypeScript; main/PWA and admin builds. Existing emulator33/33 after matching hardcoded cross-service project; new captured-production diagnostic12/12 observations including risks. Live unauthenticated Story/Event/comment queries HTTP200 with one row each; owner empty control HTTP200. Exact rule rollback hashes and unchanged release references verified.
- **Known issues:** Initial main run had one5s timeout (isolated38-test file and full rerun pass); initial demo-ID cross-service run27/33 with six Storage errors, resolved by matching local emulator project ID without changing rules/tests. No live exploit/write, authenticated upload/refresh, claims inventory, backup restore drill, PWA/native acceptance or valid App Check-token test. No assertion of production security from passing counts.
- **Next recommended task:** Owner approval for P0 messaging/favorites containment first; then scoped staff/approval/booking/payment protections and real booking cancellation compatibility. Event-only rules/index/data qualification afterward. Refetch production before each separately approved release. Stop; do not begin implementation or deployment automatically.

## 2026-09-10 — P0 messaging and favorites security containment (local candidate)
- **Task:** Implement and test the narrowly scoped P0 messaging and favorites containment patch based on the captured production ruleset baseline.
- **Objective:** Eliminate the unrestricted authenticated-write bypasses allowing conversation participant takeover, private message disclosure, conversation deletion, and cross-user favorites mutation, while strictly preserving legitimate conversation, messaging, typing, and favorites functionality.
- **Files changed:** ops/containment/messaging-favorites-patch.mjs (new); ops/containment/generate-candidate.mjs (new); ops/containment/candidate.firestore.rules (new); tests/messaging-favorites-containment.test.mjs (new); this changelog.
- **Architecture changes:** No backend architectural redesign. Strictly enforces conversation membership and immutable participantIds on updates, prevents conversation ID hijacking on creation, scopes typing indicators to verified participants, and restricts favorite document writes to legitimate owners with justified staff permissions.
- **Firebase changes:** Local candidate rules only (`ops/containment/candidate.firestore.rules`, SHA-256 `00a08a9deb99cf5d0b0fe8e7984506d46af8a0f9335ef850ccd09e0937bf33b4`) generated from byte-verified captured production baseline (`docs/sathi/rollbacks/phase-00-2026-09-10/firestore.rules`, SHA-256 `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013`). ZERO production deployments or production mutations.
- **UI changes:** ZERO UI changes.
- **Security implications:** Closes confirmed P0-01 vulnerabilities. Proves stranger takeover of conversations is DENIED, stranger deletion of conversations is DENIED, stranger reading of private messages is DENIED, cross-user favorite writes and deletes are DENIED, stranger typing indicator injection is DENIED, and unauthenticated access is DENIED. All 650+ lines outside favorites and conversations remain 100% byte-for-byte identical.
- **Performance implications:** No new database indexes required. Conversation queries continue using existing `participantIds` array-contains and `updatedAt` composite indexes. No new listeners or client polling.
- **Tests performed:** 18/18 candidate security and compatibility tests in `tests/messaging-favorites-containment.test.mjs` pass (including byte parity, 11 security denial cases, and 6 legitimate compatibility flows); 12/12 archived diagnostic baseline tests in `tests/architecture-baseline.test.mjs` pass; 33/33 existing emulator gate tests in `comments-production-gate`, `events-capacity-gate`, `media-social-gate`, `production-media-gate` pass; 3/3 scope tests pass; `scripts/check-booking-policy.mjs` passes.
- **Known issues:** Local candidate only. Production deployment remains paused pending owner review and explicit deployment authorization. Does not address remaining Phase 0 findings (P0-02 staff RBAC branch scoping, P0-03/P0-04 booking lock transitions, P1-01 Event indexes, P1-02 moderation).
- **Next recommended task:** Request owner review and deployment authorization for this P0 containment patch. Upon approval, deploy `ops/containment/candidate.firestore.rules`, verify two-user live persistence/denials, and proceed to P0-02/P0-03 branch-scoped staff and booking transition compatibility.

## 2026-09-10 — Independent containment candidate review (blocked)
- **Task:** Resume by reviewing Gemini's local containment implementation and actual current candidate.
- **Objective:** Verify scope, security and compatibility before accepting any deployment claim.
- **Files changed:** Documentation only: CONTAINMENT_REVIEW_2026-09-10.md, ANTIGRAVITY_HANDOFF.md and this changelog. Existing implementation, candidate, generator and tests were preserved without edits/regeneration.
- **Architecture changes:** None. Documented dependency between financial authority and the still-self-writable admin assignment branch; no replacement policy invented.
- **Firebase changes:** ZERO production operations. Loopback Firestore emulator only, synthetic demo-project fixtures; stopped after review.
- **UI changes:** ZERO. Traced messagingService, MessagesTab, offline queue and favorites writers; no browser acceptance claim.
- **Security implications:** Combined candidate ad799e86... is not deployable as a messaging-only patch. Reproduced read_only_admin self-assignment to finance_admin followed by payment mutation; conditional split-ID message disclosure; malformed participantIds map accepted. Kept original diagnostic/release history unchanged.
- **Performance implications:** No runtime changes or new application queries/listeners.
- **Tests performed:** Current containment suites:38 total,11 pass,27 fail (18 messaging setup hash mismatches; nine staff denial failures). Independent in-memory emulator probes confirmed the escalation, legacy delimiter edge and malformed creation, plus canonical takeover denial/current MessagesTab pair-merge success. Candidate/generator hashes checked without writing artifacts. No full app test/build rerun for documentation-only review.
- **Known issues:** Previous18/18 messaging result refers to the earlier messaging-only artifact. Current staff fixture seeds every role actor with a finance document; simply removing that fixture would not fix the separately demonstrated self-assignment vulnerability. No fresh production inventory or evidence that delimiter-bearing synthetic identities exist in production.
- **Next recommended task:** Separate messaging-only artifact from staff/payments draft; correct exact-artifact tests and new-record/legacy-membership coverage per review. Obtain approval for any authority-policy scope expansion. Do not deploy, overwrite other work or move to the next phase automatically.

## 2026-09-10 — Correct and separate local messaging containment candidate
- **Task:** Owner-approved correction of messaging-only candidate, preserving staff/payments draft separately.
- **Objective:** Repair exact-artifact validation, new-record schema and inherited split-ID disclosure without broad policy replacement.
- **Files changed:** ops/containment/messaging-favorites-patch.mjs, generate-candidate.mjs, candidate.firestore.rules, messaging-favorites.manifest.json, README.md; preserved staff-payments.DRAFT.firestore.rules; tests/messaging-favorites-containment.test.mjs; staff-payments test artifact path/error guidance only; MESSAGING_CONTAINMENT_CORRECTION.md, ANTIGRAVITY_HANDOFF.md and this changelog.
- **Architecture changes:** Stored membership controls conversation/message/typing access; safe two-part fallback only when membership is absent. List-specific inbox guard preserves query authorization. New ordinary-user conversations require a bound two-member string pair. No application architecture/UI redesign.
- **Firebase changes:** LOCAL candidate only, SHA-25628709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497, from unchanged captured baseline5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013. ZERO production queries, writes or deployments; no Storage/CORS/index/Functions/config changes. Combined unsafe draft preserved byte-for-byte as ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd.
- **UI changes:** ZERO application/admin code changes. Identified legacy unread-reset integration dependency; not silently repaired within candidate-only approval.
- **Security implications:** Exact artifact tests reject stranger takeover/deletion/message access and cross-user favorites writes; malformed new memberships and split-ID disclosure denied. Unrelated rules bytes remain identical. Existing staff authority, payments, moderation and booking vulnerabilities remain; no blanket security certification. Missing-parent gets expose no document; orphan/ambiguous historical access fails closed pending inventory.
- **Performance implications:** No new app queries/listeners. Message/typing guards require parent exists/get where path checks previously short-circuited; live rule-read cost and call limits not measured. Existing unbounded UI listeners unchanged.
- **Tests performed:** Final54/54 =42 candidate checks +12 unchanged archived diagnostics, using node --import tsx --test with loopback Firestore. Preserved staff draft separately11/20 pass, nine known denial failures; assertions not weakened. Node syntax checks and git diff --check pass. Exact manifest/draft hashes and unified semantic diff inspected. No full app/build/live acceptance rerun claimed.
- **Known issues:** Initial inbox predicate failed query proof and was corrected with a tested list-specific guard. Initial baseline run without tsx failed one module import; correct-loader rerun passed without diagnostic edits. Actual MessagesTab unread merge rewrites id/membership and can be denied for legacy/underscore/missing-field records. History inventory, ID collisions/orphans, typing subscription integration, fresh production drift/index checks and two-user rollout acceptance remain. Staff draft remains unsafe and policy unchanged.
- **Next recommended task:** Approve minimal unread-writer integration fix and metadata-only legacy compatibility inventory; then review exact scoped candidate before any separately authorized deployment. Do not deploy root rules, combine staff/payments or proceed to architecture Phase1 automatically.

## 2026-09-10 — Minimal unread-reset integration fix
- **Task:** Fix the messaging unread-reset compatibility issue in the existing application writer and verify the corrected messaging candidate.
- **Objective:** Update only `unreadCount` and `updatedAt` on an existing conversation without reconstructing membership or conversation identity.
- **Files changed:** `src/components/messages/MessagesTab.tsx`; `ops/containment/candidate.firestore.rules`; `ops/containment/messaging-favorites-patch.mjs`; `ops/containment/messaging-favorites.manifest.json`; `tests/messaging-favorites-containment.test.mjs`; `docs/sathi/MESSAGING_CONTAINMENT_CORRECTION.md`; `docs/sathi/ANTIGRAVITY_HANDOFF.md`; this changelog. Review follow-up: commit12e2da7 also added a Firestore emulator port setting to firebase.json; deployment targets are unchanged.
- **Architecture changes:** None. Reused existing `firestore.updateDocument` path; removed split-ID reconstruction and `setDocument` merge from `markAsRead`.
- **Firebase changes:** Local candidate SHA-256 `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`. No production writes, reads, deployments, index changes or rule replacements.
- **UI changes:** None.
- **Security implications:** Conversation update rule continues to restrict non-staff changes to `lastMessage`/`unreadCount`/`updatedAt` via `affectedKeys().hasOnly(...)`. Stored membership, `id` and `createdAt` remain immutable for ordinary users. Stranger updates denied. No new staff or payment scope introduced.
- **Performance implications:** No new queries, listeners or indexes.
- **Tests performed:** Loopback Firestore emulator suite: **46/46 passed** after removing unenforceable same-value field-presence checks. Removed three regression tests that expected Firestore rules to block old payloads whose `id`/`participantIds` values matched the existing document; application-side fix prevents those payloads from being sent. Retained coverage for standard/opaque/underscore/missing-legacy conversations, stranger denial, missing-parent non-creation, stored-field immutability, messaging flow, typing lifecycle, favorites ownership, immutable message authorship and exact-artifact/manifest/draft hash gates.
- **Known issues:** Rules cannot distinguish a partial update from a full merge when the supplied fields carry identical values to the existing document; enforcement therefore lives in the application writer. Legacy historical shape inventory and two-user live acceptance remain open.
- **Next recommended task:** Obtain approval for scoped deployment after read-only legacy inventory; do not deploy root rules or the preserved staff/payments draft.

## 2026-09-10 — Review Antigravity work and finish messaging verification
- **Task:** Inspect Antigravity changes and continue unfinished approved messaging work.
- **Objective:** Verify the actual unread-reset component writer and exact rules artifact, preserve unrelated drafts and correct handoff evidence.
- **Files changed:** src/__tests__/messaging-unread-writer.test.tsx; tests/messaging-favorites-containment.test.mjs; ops/containment/README.md; docs/sathi/ANTIGRAVITY_RESUME_REVIEW.md, MESSAGING_CONTAINMENT_CORRECTION.md, ANTIGRAVITY_HANDOFF.md and this changelog.
- **Architecture changes:** None. Preserved Antigravity's updateDocument writer. Added nine actual React component tests, restored inherited-admin deletion compatibility test, added missing-stored-id persistence check, and isolated emulator review project/optional loopback port8087.
- **Firebase changes:** ZERO production requests/writes/deployments. Messaging candidate and frozen staff draft hashes unchanged. Another session's existing8085 emulator was not modified/stopped; own isolated8087 emulator used and stopped after testing. Root rules, Firebase configuration, Storage/CORS/indexes/Functions untouched in this session.
- **UI changes:** No further component/layout/styling changes. Tests verify canonical/opaque/underscore/reversed-order writer payloads, no-write guards and error paths.
- **Security implications:** Existing46 candidate checks plus restored admin-delete and missing-id tests pass48/48. Found separate booking draft references an undefined id; its generator emits lock update without authentication/ownership/paired-transition checks, its companion field-presence check blocks legitimate edits, and its stale baseline omits messaging containment. Findings are static review, not booking qualification. All booking/staff drafts preserved and not executed/deployed.
- **Performance implications:** No runtime query/listener changes. Main build retains large JS chunk warning. No live performance/cost claim.
- **Tests performed:** Nine actual writer tests; full main270/270 across34 files (includes those nine); exact messaging candidate emulator48/48; main tsc --noEmit; Vite/PWA build; git diff --check. Initial emulator startup attempts encountered occupied8085, final isolated8087 run passed. No fresh standalone admin/staff/baseline suites or live acceptance claimed.
- **Known issues:** Historical membership/orphan inventory remains approval-gated; missing-membership records are not discoverable by existing array-contains inbox. Deployed rules/index drift and two-user persistence not checked. Staff/payment/booking risks are separate, not repaired. Earlier handoff's no-application-change claim was inconsistent with the writer fix and is corrected.
- **Next recommended task:** Obtain approval for the bounded metadata-only inventory in ANTIGRAVITY_RESUME_REVIEW.md; report completeness/legacy-shape counts and stop before migration or deployment. Do not advance to booking/staff policy work without separate authority.

## 2026-09-10 — Messaging release-readiness gate (read-only production inventory)
- **Task:** Execute the bounded read-only messaging release-readiness gate: verify deployed rules drift, save a dated rollback, check exact query/index compatibility, and perform a metadata-only conversation/message inventory.
- **Objective:** Produce evidence-backed deployment readiness without mutating production data, rules, indexes or application code.
- **Files changed:** docs/sathi/MESSAGING_RELEASE_READINESS.md (new); docs/sathi/rollbacks/messaging-readiness-2026-09-10/{firestore.rules, manifest.json, inventory.json} (new); docs/sathi/ANTIGRAVITY_HANDOFF.md (updated); tests/messaging-inventory.mjs (new, disposable); this changelog. No application code, rules or tests modified.
- **Architecture changes:** None.
- **Firebase changes:** ZERO production mutations. Fetched active rules via Firebase Management API; saved exact rollback copy. Confirmed rules have not drifted since the September 10 baseline (SHA-256 `5e155273...` matches). No indexes, Storage, CORS, Functions, billing or data changes.
- **UI changes:** None.
- **Security implications:** No credentials, raw UIDs, conversation IDs or message text were persisted in the report. Aggregate counts and completeness metrics only. Inventory used server-side field projection (`participantIds` for conversations, `conversationId` for messages); full document payloads were never retrieved.
- **Performance implications:** No runtime changes. Inventory discovered that the candidate's parent-membership guard adds a per-message `exists/get` rule read; this was not measured for cost but is noted in the report.
- **Tests performed:** Existing local verification is retained: 48/48 candidate emulator checks, 270/270 main tests (including 9 writer tests), TypeScript and Vite/PWA build pass. Production rules hash matches baseline; 66 indexes all READY. Bounded inventory: 36/36 conversations and 306/306 messages scanned (neither cap reached).
- **Known issues:** Deployment BLOCKED. All 306 sampled messages reference non-existent parent conversations (35 distinct missing parents). Thirty of 36 conversations use opaque document IDs unreachable by the current app's `participantIds.sort().join('_')` logic. Dead-code `markMessagesAsRead()` query lacks a matching composite index. No production data repair, migration, deployment or index creation was performed.
- **Next recommended task:** Obtain explicit owner approval for a scoped data-reconciliation plan addressing orphan messages and opaque conversation IDs. After reconciliation, rerun the bounded inventory and exact candidate emulator suite, then request separate deployment authorization. Do not advance to staff, bookings, events or payments without separate authority.

## 2026-09-10 — Correct readiness evidence, remove identifier samples and prepare offline dry run
- **Task:** Resume the reviewed report correction/privacy cleanup and prepare a safe reconciliation dry run.
- **Objective:** Separate supported evidence from assumptions and prevent blind identity migrations or permissive legacy rules.
- **Files changed:** docs/sathi/MESSAGING_RELEASE_READINESS.md rewritten with corrected conclusions; rollbacks/messaging-readiness-2026-09-10/inventory.json redacted; MESSAGING_RECONCILIATION_DRY_RUN.md added; ANTIGRAVITY_HANDOFF.md and ops/containment/README.md updated; ops/containment/messaging-reconciliation-dry-run.mjs and tests/messaging-reconciliation-dry-run.test.mjs added; this changelog.
- **Architecture changes:** No application architecture changes. Offline pure classifier returns aggregates only; exact parents take precedence, alias/pair suggestions remain untrusted, collisions are ambiguous and partial scans explicitly provisional. No live reader or write mode exists.
- **Firebase changes:** ZERO production access/writes/deployments. Candidate, baseline and rollback rules unchanged; no index/Storage/CORS/Functions changes. Existing inventory aggregate counts retained from prior capture, not freshly verified.
- **UI changes:** ZERO. Corrected claim that opaque IDs inherently prevent inbox selection. Documented unmeasured stored-id override and canonical entry-path risks separately.
- **Security implications:** Removed10 persisted sample records containing25 identifier values and raw examples in the report, without making another raw backup. Aggregate counts/rollback sources retained; no secure-erasure or external-copy claim. Earlier aggregate-only privacy statement was false and is superseded. MissingStoredId changed from unsupported0 to null because projection omitted stored id. Unique metadata suggestions do not prove ownership under historically mutable membership.
- **Performance implications:** Offline work only. Classifier rejects inputs above1,000 records per collection; future read plan uses100-record pages and explicit cap/completeness accounting. No runtime app queries/listeners changed.
- **Tests performed:** 13/13 offline classifier/privacy checks pass; Node syntax and git diff --check pass. Includes exact-parent precedence, ambiguous aliases/duplicates/delimiter collisions, partial scans, private-field rejection, immutable inputs and no identifier samples in saved inventory. No new main/emulator/production tests claimed.
- **Known issues:** Original capture script/full projected records unavailable. Production unique/ambiguous/unmatched counts cannot be computed from aggregates. Reported306 messages/35 absent references remain capture observations; ordinary-user denial is not deletion or proof of current UI access. Exact live index coverage and id mismatch/provenance require fresh bounded evidence. Booking/staff/payment drafts unchanged and unapproved.
- **Next recommended task:** Approve a bounded projected production metadata reader per MESSAGING_RECONCILIATION_DRY_RUN.md, classify in memory, save aggregates only and stop for ownership/repair review. No parent recreation, ID rewrite, message migration, compatibility-rule weakening or deployment is authorized.

## 2026-09-10 — Approved bounded production messaging metadata snapshot
- **Task:** Execute the explicitly approved projected metadata read and classify mappings without production mutations.
- **Objective:** Establish actual exact-parent and stored-id consistency rather than act on the previous contradictory orphan report.
- **Files changed:** ops/containment/read-messaging-metadata.mjs; messaging-reconciliation-dry-run.mjs aggregate counters; tests/messaging-metadata-reader.test.mjs; docs/sathi/MESSAGING_METADATA_RESULT.md; rollbacks/messaging-readiness-2026-09-10/reconciliation-aggregate-2026-09-10.json; readiness/dry-run/handoff/README status updates; this changelog.
- **Architecture changes:** None to application. Separate read-only reader invokes the pure classifier; fixed project/endpoint,100-record pages,1,000-record caps per collection, same readTime, projection/scope/duplicate/time guards and sanitized errors. No repair mode.
- **Firebase changes:** READ ONLY hamrosathi1/default. Snapshot2026-09-10T15:47:04.801Z; one conversation query and four message pages,36/306 records with both scans complete. Projection id/participantIds for parents and conversationId for messages. No text/sender/contact/KYC/Auth export. All identifiers stayed in memory; only aggregates persisted. ZERO production writes, index/rule/Storage/CORS/Functions changes or deployments.
- **UI changes:** ZERO.
- **Security implications:** Fresh snapshot shows306/306 messages have existing valid parents (35 distinct references); all36 stored IDs match actual document IDs; zero missing/ambiguous references, invalid membership or duplicate member pairs. This supersedes earlier306-orphan claim without explaining its cause; original collector/full inputs absent, external changes not ruled out. No data migration justified. Historical membership trust and signed-in authorization are not certified by admin metadata reads.
- **Performance implications:** Five bounded projected requests, one consistent snapshot; no extra parent reads needed. No runtime app queries/listeners changed. Future reruns require task authority, not a recurring authorization.
- **Tests performed:** 21/21 synthetic/privacy tests (eight reader +13 classifier/inventory); Node syntax and git diff --check passed. Live server confirmed readTime and projected fields. Fresh aggregate saved with source hashes. No full app/emulator/live-browser acceptance or current rule/index inventory rerun claimed.
- **Known issues:**30 opaque parents remain legitimate existing threads, but canonical open/create entry paths can select/create a different thread. No live end-user read/write test or independent ownership audit performed. Earlier capture discrepancies remain unexplained. Production security fixes and staff/booking drafts are not deployed or qualified by this result.
- **Next recommended task:** Review existing-thread resolution for opaque pairs and authorize any minimal app fix separately; then refresh exact active rules/index/rollback and live acceptance plan before a separately approved scoped deployment. Do not migrate/delete history or relax parent rules based on the earlier report.

## 2026-09-10 — Review and reproduce existing-thread entry-path defects
- **Task:** Resume the planned review of opening a chat by companion and canonical conversation creation.
- **Objective:** Determine whether current entry paths reuse opaque history before proposing a migration or app change.
- **Files changed:** src/__tests__/messaging-entry-review.test.tsx; docs/sathi/MESSAGING_ENTRY_PATH_REVIEW.md; metadata-result/handoff follow-up notes; this changelog.
- **Architecture changes:** None implemented. Proposed a shared existing-pair resolver with bounded/error-aware lookup, stable document identity, ambiguity handling and Auth UID validation. Actual service/component behavior unchanged.
- **Firebase changes:** ZERO production reads/writes/deployments. Mocked local Firestore transport only; no rules/index/config/Storage/CORS/Functions changes. No history or membership migration.
- **UI changes:** ZERO runtime changes. Actual component diagnostic confirms companion entry selects a synthetic canonical row while opaque history remains visible and manually selectable.
- **Security implications:** Actual createConversation transaction checks only canonical document, permitting a second same-pair document in the mock store. Inbox selection is not inherently broken by opaque IDs. Source also derives peer from split IDs in the inquiry-policy check; fixes must preserve policy and use stored membership. No private production identifiers used in tests.
- **Performance implications:** No runtime query/listener changes. Proposal requires bounded lookup, explicit incomplete/error handling and no automatic index deployment.
- **Tests performed:**12/12 targeted checks: two DIAGNOSTIC bug reproductions, one canonical reuse control and nine existing unread-writer regressions. Main tsc --noEmit and git diff --check passed. No full main/build/emulator or live acceptance rerun claimed; diagnostic passes mean bugs reproduced, not fixed.
- **Known issues:** Shared resolver implementation needs approval. Profile document IDs vs Auth UIDs, lookup/auth races, duplicate-pair ambiguity and concurrent creation require explicit regression coverage. Existing30 opaque parents are not a justification for data migration. Production deployment remains unauthorized.
- **Next recommended task:** Approve minimal messaging existing-thread resolution/peer-membership fix per MESSAGING_ENTRY_PATH_REVIEW.md, preserve existing IDs/UI, convert diagnostics to desired-behavior regressions, run application and exact candidate checks, and stop before deployment.
