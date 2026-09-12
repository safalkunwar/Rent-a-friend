# Antigravity review and scoped continuation — 2026-09-10

## Outcome

Antigravity's unread-reset change is correct on inspection and now covered by actual component tests. Local messaging verification is complete; **production rollout remains gated**. Booking and staff/payment drafts are not approved or qualified. This session changed tests/documentation only, preserved Antigravity's writer and all unrelated drafts, and made no production requests, writes, deployments or commits.

## What was actually changed by Antigravity

Inspected commit `12e2da7` against `5ecc696`, ignoring end-of-line differences when reviewing the component. The commit bundles the earlier architecture/audit package, so its large file count is not evidence that new product phases were implemented.

- `src/components/messages/MessagesTab.tsx:147`: replaces setDocument merge with updateDocument, sending only unreadCount/updatedAt. Existing selection/existence/zero guards and error handling remain. `src/services/firestore.ts:83` delegates to SDK updateDoc and rethrows errors; it does not create missing documents.
- Messaging candidate remains exactly SHA-256 `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`; frozen staff draft remains `ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd`.
- `firebase.json` also gained a local Firestore emulator port setting (8085). Deployment targets are unchanged. This configuration change was omitted from the previous changelog; it is preserved, not silently reverted.
- Existing new emulator tests exercise SDK payloads, not the actual component writer. They would still pass if the component reverted. The report also retained contradictory claims that application code was unchanged and that the already-fixed writer still needed approval.

## Work completed in this continuation

Added `src/__tests__/messaging-unread-writer.test.tsx`: nine tests render the actual MessagesTab, receive mocked conversation subscriptions, select a conversation, and inspect its real updateDocument calls. Canonical, opaque, underscore-UID and reversed-member fixtures emit only unreadCount/updatedAt. Already-read, virtual missing-parent and signed-out cases do not write. Not-found/permission-denied responses retain error handling and never fall back to merge/create. Stored fixture identities are not mutated.

These are component integration tests with a mocked service, not live Firebase tests. Complementary emulator tests enforce authorization and persistence. Restored the inherited-admin conversation-delete compatibility check missing from the current suite and added explicit missing-stored-id persistence coverage. No existing security assertion was weakened.

The emulator suite accepts only loopback ports 8085 or 8087 and uses a distinct demo project. Another existing emulator occupied 8085; this session did not stop or modify it. Initial CLI/direct startup attempts failed to acquire that port. Final checks used a separately started cached Firestore emulator at 127.0.0.1:8087, which was stopped after verification.

## Fresh verification

| Check | Result |
| --- | --- |
| Actual unread component writer | 9/9 passed |
| Full main-app Vitest suite, two workers | 270/270 passed, 34 files (includes those nine) |
| Exact messaging candidate emulator suite | 48/48 passed, including scope/hash gates |
| Main TypeScript, tsc --noEmit | Passed |
| Vite production + PWA build | Passed; existing large JS chunk warning remains |
| git diff --check | Passed |

No fresh standalone admin suite, archived-baseline diagnostic suite, staff draft suite, live authenticated acceptance, deployed-index validation or physical-device QA is claimed. Previous staff draft 11-pass/nine-fail evidence remains historical. Emulator success establishes tested local rules behavior, not production index availability or a production deployment.

## Separate booking draft: stop conditions

Read-only source review found untracked `ops/containment/candidate-booking.firestore.rules` plus generator/debug/test files. They remain untouched. This was not a full booking security audit and no booking generator/test was run.

1. **Invalid candidate variable:** candidate line275 calls `lockBookingId(id, ...)` inside a match binding `lockId`, not `id`. It must not be treated as compile-qualified.
2. **Unsafe generator permission:** `tests/generate-booking-candidate.ts:97` emits a lock update permission based only on allowed data keys, with no authentication, ownership, paired booking write or transition check. The on-disk candidate differs from that generator output. Fixing the undefined variable alone does not establish authorization.
3. **Profile regression:** candidate line218 rejects updates whenever the resulting companion document contains isVerified/verificationBadge/rating/reviewsCount. That also rejects ordinary edits retaining existing protected fields. Protect changed values, not mere presence, in a separately approved policy.
4. **Wrong release base:** the booking draft is generated from captured production without the messaging patch and lacks the messaging generator's baseline-hash gate. Deploying it after messaging containment would reintroduce the captured bypasses.

Recommended handling: keep these drafts isolated; obtain a separate booking-policy scope decision, then audit actual booking/lock transactions and authority fields before editing. Never deploy the draft or run its generator as a continuation of the messaging task.

## Historical release gate — superseded by approved metadata capture

The plan below was prepared before the later approved metadata capture. It is retained for provenance only. [MESSAGING_METADATA_RESULT.md](MESSAGING_METADATA_RESULT.md) records the completed aggregate-only result: all 306 messages reference existing valid parents; all 36 stored IDs match document IDs; zero duplicate pairs/ambiguous references were found. Do not rerun the reader or treat this section as a current blocker. The authoritative next action is Gate C/D in [MESSAGING_RELEASE_GATE.md](MESSAGING_RELEASE_GATE.md).

Proposed bounded plan, not yet executed:

- Verify project hamrosathi1 and fetch current deployed rule/index metadata; compare with the captured baseline without replacing rules.
- Page conversations by document ID, 100 per page, maximum 1,000 records for the first pass. Use field projection for stored id and participantIds only; document names arrive as metadata. Do not retrieve lastMessage, message text, contacts, KYC or other private payloads.
- Classify missing/null/map/empty/duplicate/member-order/opaque/delimiter shapes in memory; save only aggregate counts and scan completeness, not raw UIDs or conversation IDs. Do not infer rightful ownership for ambiguous records.
- If approved as part of that inventory, inspect at most 1,000 messages with projection of conversationId only. Check at most 1,000 distinct referenced parents for existence, reusing the scanned parent set. Never fetch text or media. Record aggregate orphan/reference-shape counts only. No Auth-user export is needed.
- If either cap is reached before exhaustion, explicitly report the inventory as partial and request direction before widening it. No repair, parent recreation, migration or deletion follows automatically.

Missing-membership records are not returned by the current array-contains inbox; component rendering also assumes membership exists. Emulator permission for legacy direct access is not evidence those records are reachable in the UI. Historical-shape inventory and an explicit handling decision remain prerequisites for claiming full legacy UI compatibility.

After that gate, request separate deployment approval, refresh rollback artifacts and rerun exact rules/index qualification. Then perform two-user live persistence and denial checks. No staff/payment/booking phase or deployment is implied by this local verification.
