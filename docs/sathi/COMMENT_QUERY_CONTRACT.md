# Canonical comment contract — local checkpoint, 2026-09-06

> Release update, 2026-09-09: the comments-only production repair was deployed from the captured active baseline; 15 legacy ISO dates were converted with preconditions and the DESC index verified READY. Rollback/evidence: [comments repair artifacts](rollbacks/comments-repair-2026-09-09/) and [CHANGELOG](CHANGELOG.md). Guest read was verified; signed-in posting was emulator-tested, not live-browser verified. The older “nothing deployed/no migration” statements below describe the September 6 checkpoint only.

## Decision

Temporary scripted records do not define the production schema. New comments use **Firestore server Timestamp values**, not client-clock ISO strings. No legacy parser, dual-format sorting or migration was added. This is a staged breaking data-contract change; nothing was deployed or deleted.

## Implemented path

- `services/commentContract.ts` owns the Comment type, create-payload allowlist, trimmed-text validation, 500-character maximum and 50-record latest-query definition.
- `SocialRepository.createComment` allocates a document ID, applies that contract and retains the atomic comment/parent-counter transaction. Caller-provided timestamps and extra properties are not spread into persistence. Removed the unreachable missing-Firebase create fallback.
- `createdAt` is written with `serverTimestamp()`. Local rules require it to equal `request.time` and require the stored ID to match the document path. Existing text-only edit permissions keep creation time immutable. Create/edit rules enforce the existing composer's 500-character ceiling.
- `usePostComments` uses one ordered contract: postId equality, createdAt DESC, document ID DESC, limit 50. Rendering reverses that selected window to oldest-to-newest. A document-ID tiebreaker makes the cursor boundary explicit without replacing the time order.
- Persisted legacy strings/missing timestamps cause an explicit unsupported-format error rather than coercion or fabricated time. `null` represents unresolved local timestamps/pending UI only. This check is timestamp validation, not complete validation of every document field.
- Timestamp-aware UI formatting handles resolved dates and leaves pending times undated. Composer and edit input share the 500-character limit; visual layout is unchanged.
- The unused `SocialRepository.getComments` ascending/20-record reader was removed after static source/admin search found no callers. The existing ascending **production index was not deleted**.
- Comment edits validate text/identity and no longer enter the custom deferred offline queue after reporting failure. Firebase SDK offline acknowledgement/reconnect behavior still requires separate UI qualification; this change does not promise instant offline failure or disable SDK write buffering.

## Verification and limits

- Final main regression: **231/231 tests in 26 files passed**. Unit/React tests cover write allowlisting/server sentinel, canonical limits, query options, invalid legacy timestamps and date rendering, plus the existing interaction suite. One intermediate new-test failure was caused by a missing unsubscribe mock; the fixture was corrected and the complete suite rerun successfully.
- Actual loopback Firestore suite: **28/28 passed**. It verifies server-time persistence for another reader, timestamp immutability, rejected client-string/past/future timestamps, spoofed IDs, oversized writes without aggregate changes, and tied-timestamp cursor continuation (`c,b` then `a`). The cursor fixture uses the actual SDK ordering but is not an older-comments UI test.
- Root TypeScript and production build/PWA generation passed; main JS 1,929.49 kB / 502.90 kB gzip. Existing bundle warning remains. Admin, Storage/media/booking emulator suites and physical/browser/PWA checks were not rerun in this checkpoint.
- The UI still offers the latest 50 only. **Older-comment loading is not implemented**; this change establishes its deterministic query order, not a completed history browser.
- Emulator success does not provision or verify production indexes. The missing descending comments and Story indexes reported by the prior live diagnosis remain unresolved.

## Safe next order

1. Implement bounded older-comment pages using the same Timestamp/document-ID cursor contract. Test overlap with live head changes, deletion/moderation, retry and post/account changes. Do not retain deleted or newly inaccessible history indefinitely.
2. Complete Story time/order/visibility contract review independently; do not pick a schema merely to retain scripted Stories.
3. Enumerate the exact disposable production collections and Storage prefixes before any reset. “Mostly scripted” is not authorization to delete all users, bookings, KYC or arbitrary media. Reconcile coupled comment counters if any parent posts remain. No automatic migration is required for sample preservation.
4. Obtain explicit scope approval for the reset (if chosen), reviewed rules/client release and exact necessary indexes. Old clients writing ISO times will fail against the new rules, while the new reader rejects old strings: rollout coordination is mandatory.
5. Verify fresh canonical fixtures, guest/member reads and actual authenticated mutations after approved rollout. Do not claim production completeness from local gates.

Reference: Firebase documents [`serverTimestamp()` writes](https://firebase.google.com/docs/firestore/manage-data/add-data). Here the production contract is enforced additionally by local rules and the emulator tests, not by trusting client clocks.
