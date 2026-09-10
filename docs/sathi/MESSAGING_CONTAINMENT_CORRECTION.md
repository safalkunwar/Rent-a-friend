# Messaging/favorites containment correction — 2026-09-10

Status: **local candidate corrected and emulator-qualified; deployment blocked pending compatibility review.** Owner approved correcting the messaging-only candidate while preserving the staff/payments draft. No application/admin code, production records, active rules, indexes, Storage, CORS, Functions or deployment configuration changed. No production queries were made in this correction session.

## Exact artifacts

| Artifact | SHA-256 |
| --- | --- |
| Captured production `rollbacks/phase-00-2026-09-10/firestore.rules` | `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013` |
| Corrected `ops/containment/candidate.firestore.rules` | `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497` |
| Preserved `ops/containment/staff-payments.DRAFT.firestore.rules` | `ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd` |

The generator is single-scope, deterministic, and refuses a changed baseline. Its JSON manifest binds baseline/candidate/draft hashes to their paths. The messaging suite compares generated and disk bytes, then loads the **disk artifact** into the emulator. The payments patch is no longer imported/applied by the generator. Only the staff suite's artifact path/error guidance changed; the original policy, fixtures and assertions remain intact.

## Semantic diff against the captured production baseline

| Branch | Exact permission change |
| --- | --- |
| `users/{uid}/favorites/{id}` | Remove authenticated-any-user write bypass. Owner create/update/delete retained; explicit staff read/create/delete retained. Non-owner/non-staff writes denied. |
| `conversations/{id}` get | Existing stored membership is authoritative. No path-derived extra member when that field exists. Missing membership may use exactly two nonempty, distinct underscore-separated IDs. Authenticated get of a nonexistent parent now succeeds with no document, supporting create-if-absent transactions; this does not grant any existing private-document read. |
| Conversation list | Existing array-contains inbox is supported by a list-only `hasAny([uid])` predicate. Unfiltered non-staff queries and other users' inbox queries denied. Legacy path fallback is get-only. |
| Conversation create | Non-staff must supply matching document id and exactly two distinct, nonempty string members including the caller. Path must join those two members in either order. Maps, strings, missing/null/empty/duplicate/extra membership and unbound opaque IDs denied. Existing client sort/join contract passes. |
| Conversation update/delete | Remove any-authenticated write bypass. Non-staff members can change only lastMessage/unreadCount/updatedAt, never membership/id/createdAt. Identical canonical merge fields remain allowed because they are not changed. Staff create/update/delete grants retained unchanged. |
| `conversations/{id}/typing/{uid}` | Read requires parent membership; write/delete requires parent membership AND own typing UID. Existing parent required. No new staff typing-read override. |
| `messages/{id}` | Replace ONLY read/create/update membership alternatives with the same existing-parent membership helper. Preserve sender binding, allowed receipt fields and all captured staff grants. Orphan messages fail closed for ordinary users. |

Two shared helpers and one create validator are used only within messaging. The message branch is intentionally included: leaving it unchanged would preserve the split-ID message disclosure demonstrated in R4 of the independent review.

The scope test removes only the nested favorites block and the contiguous conversation/message domain and compares everything else exactly (newline normalization only, no whitespace collapsing). Manual unified diff inspection confirms message edits are membership guards only. **Users outside nested favorites, profile photo, Community posts, comments/likes, Events, bookings/locks, companions, notifications, KYC/private documents, referrals/rewards, payments/admin assignments and all unrelated helpers are unchanged.** Existing unsafe permissions in those branches remain unsafe; byte parity is not an endorsement.

## Compatibility policy and release blockers

1. **Legacy unread-reset writer — fixed.** `src/components/messages/MessagesTab.tsx` now updates only `unreadCount` and `updatedAt` on the existing conversation. It no longer splits the conversation ID or rewrites `participantIds`/`id`. Rules remain `affectedKeys().hasOnly(['lastMessage','unreadCount','updatedAt'])`; the application-side fix prevents the old buggy payload from being sent.
2. **Historical ownership inventory needed before deployment.** Stored list members retain access for opaque IDs and delimiter-containing UIDs. Existing groups are not rewritten into pairs. Missing membership on an unambiguous two-part ID retains direct access, but does not magically appear in an array-contains inbox. Null/map/empty membership, ambiguous missing-member IDs and orphan messages are denied rather than guessed. No production inventory establishes how many such records exist. Review ownership using bounded metadata-only inspection; any backfill/repair needs a separately approved plan. Do not recreate orphan parents or migrate/delete history blindly.
3. **Existing ID scheme is not redesigned.** Creation accepts either pair order; the application sorts. Rules do not prove unique conversations per pair. Underscore-containing UID pairs can collide under the inherited join scheme. Stored membership prevents the demonstrated split-reader bypass on existing parents, but collision handling/orphan recovery needs explicit review before supporting arbitrary imported UID shapes. No new ID migration is authorized here.
4. **Inherited staff authority remains broad.** The global isAdmin and writable assignment policy remain unchanged. A separate staff-authority phase must address self-assignment/revocation before claiming finance isolation. Staff/message override permissions are not secured by this candidate. The preserved draft still fails nine denial tests and is not deployable.
5. **Other messaging limitations unchanged.** Existing TypingManager subscribes to a collection path using subscribeDocument; direct typing-document test success does not prove typing UI works. Last-message content, unread counters, message payload/receipt semantics, offline partial writes and pre-booking inquiry limits are not redesigned. Inbox/history listeners remain unbounded in MessagesTab. No browser or device acceptance performed.

## Verification evidence

Final loopback-only command:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8085'
node --import tsx --test --test-concurrency=1 tests/messaging-favorites-containment.test.mjs
```

**46/46 passed.** Coverage includes absent-target creation and malformed data denials, exact artifact/hash/scope gates, create-if-absent transaction and canonical UI merge payloads, actual inbox/history/read-receipt query shapes, immutable membership, takeover/delete/recreate sequence, cross-user/guest denials, message send/read/receipt, typing owner isolation, real users.favorites array and legacy nested favorites, delimiter IDs, opaque history, missing/malformed membership, orphan behavior, and a map-valued document-ID query bypass attempt.

Candidate query checks initially failed because general membership/type predicates were not provable from the inbox query. Corrected list-specific `hasAny` predicate passes both valid inbox and malformed-map denial tests; assertions were not weakened. An initial combined diagnostic run without `--import tsx` failed one booking module import; rerunning with the required loader passed all 12 without changing the diagnostic suite.

The preserved staff suite freshly ran **11 passed / 9 failed**, with expected-denial writes succeeding because every role fixture retains a finance assignment. It now loads the correct frozen hash; failures are behavioral, not artifact setup errors. The prior independent review separately reproduced self-assignment escalation; that policy was not repaired in this scope.

Node syntax checks for generator/patch/test and `git diff --check` passed. No fresh main/admin unit suite, build, live two-user test, production index verification or physical-device QA claimed; application code is unchanged. Firestore emulator query authorization does not establish production composite-index readiness. Earlier full-app counts are historical only.

## Performance, rollback and safest next order

Parent membership now gates message/typing operations with exists/get; this adds rule-dependent reads where split-ID access previously short-circuited. The same parent is reused within operations, but access-call limits, batching and live read cost should be qualified before release. No new application query, listener, index definition or Function was introduced.

1. Review this candidate and approve the minimal unread-writer integration change plus read-only historical shape inventory.
2. Resolve affected legacy shapes explicitly; verify writer fixtures and actual signed-in UI without expanding staff/payment scope.
3. Before a separately approved release, fetch active rules again, compare against the captured hash, preserve a fresh rollback, rebase only this scope if needed, and rerun exact-artifact tests/index checks.
4. Only after explicit deployment authorization, release the scoped artifact and perform two-user live persistence and negative authorization checks. Do not deploy root rules or the frozen combined draft.

No production rollback is needed now. The captured rules remain intact. A future rollback must target the freshly verified pre-release rules, and explicitly acknowledge that reverting reopens the old authorization bypasses; do not automatically roll back security policy or overwrite newer unrelated releases.
