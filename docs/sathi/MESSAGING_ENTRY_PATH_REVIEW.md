# Existing-thread entry-path review — 2026-09-10

## Verdict

**Implemented and released through the scoped messaging gate.** Production reference metadata does not justify migration. The fix preserves existing conversation document IDs; the candidate-only Firestore rules release changed messaging/favorites authorization but did not alter Storage, indexes, migrations or production conversation history. See [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md).

## Verified behavior

| Entry path | Actual result |
| --- | --- |
| Select opaque existing row from inbox | Works in the component test; selected document ID drives message query |
| Open the same peer via initialCompanionId | Performs a bounded server-backed member-pair lookup and selects the actual existing document ID, including opaque/reversed IDs |
| createConversation with existing opaque pair | Reuses that parent without changing its membership, timestamps or ID |
| createConversation with canonical document already present | Reuses it without changing timestamps, membership or unread state |

Evidence is synthetic local execution of the real component/service with mocked Firebase transport, not live user acceptance. Fresh production metadata from the previous approved read found30 opaque parents, no duplicate pairs and no orphan messages. We did not create production duplicates in this review.

## Root causes and files

### E1 — Companion entry ignored existing pair membership — resolved locally

`src/components/messages/MessagesTab.tsx:159` calls the synchronous AppContext canonical-ID helper on companion entry. Its virtual-row logic at171 also checks only that constructed ID. Neither searches stored participantIds for the existing pair or waits for the inbox result. The selection effect does not re-resolve when inbox data arrives.

`conversationResolution.ts` now validates the pair, pages only the authenticated user's conversations from the server (five pages of 100 maximum), uses snapshot document IDs as authoritative, and rejects failed, incomplete, malformed or ambiguous results. `MessagesTab` waits for this result, does not create on view, and cancels stale peer/account results or results that would overwrite a manual inbox selection.

### E2 — Creation was idempotent only for the canonical path, not the pair — resolved locally

`src/services/messaging.ts:156` sorts participants, constructs one ID and transactionally checks only that document. This prevents repeated canonical creation but never discovers an existing opaque pair.

Creation now resolves the existing pair first, then uses the existing actual ID or transactionally creates a canonical parent only for a proven no-match. It rechecks authentication across awaits, refuses a canonical-ID collision with a different pair, and refuses a parent removed between lookup and transaction. The booking ancillary follow-up now resolves its public companion profile ID to `companionUid` before it requests a conversation; booking authorization/state/payment logic is unchanged.

### E3 — Peer inference split IDs — resolved locally

`MessagesTab.tsx:218` infers the other user from selectedConvo.split('_') for the pre-booking messaging check. That is unreliable for opaque IDs and delimiter-containing UIDs even when inbox selection succeeds. Use validated stored participants instead. Preserve existing product policy; do not change booking eligibility, pricing or inquiry limits in this integration fix.

### Implemented guardrails

- AppContext currently passes booking.companionId to creation; actual messaging participants must be Auth UIDs. Any profile-ID/UID mismatch must be resolved through the existing identity contract, not guessed or repaired by changing booking records.
- Firestore subscription/list adapters allow a stored id to override snapshot document ID. The latest production snapshot has zero mismatches; future resolution must treat the actual document path as authoritative without broad unrelated adapter changes.
- A failed, partial or offline lookup must not be treated as proof that no conversation exists.

## Scope retained

The implementation is messaging integration only. It does not add a conversation schema, pair-lock collection, rule/index deployment, booking/staff/payment policy work, data migration, or production read/write. It does not claim global pair uniqueness against arbitrary concurrent legacy/admin writers; that needs a separately designed server-side invariant.

This proposal is messaging integration only. It does not authorize a new conversation schema, pair-lock collection, booking/staff/payment policy work, data migration or deployment.

## Verification required for the fix

Desired-behavior regressions cover opaque/reversed/canonical IDs, delayed/error/incomplete lookup, duplicate-pair ambiguity, authenticated UID validation, account/peer changes during lookup, manual selection after deep link, genuinely new parent creation before send, and unchanged historical membership/timestamps. The canonical positive control and all nine unread-writer tests remain.

The exact candidate emulator checks, main TypeScript/tests/build and the separately approved two-user generated-account production acceptance have passed. No real-customer opaque-thread probe is claimed; mocked/local tests remain the evidence for that legacy shape.

## Checks run in this review

`node node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1` — **301/301 passed** across 35 files.

`FIRESTORE_EMULATOR_HOST=127.0.0.1:8087 node --test tests/messaging-favorites-containment.test.mjs` — **49/49 passed**, including the new bounded member-query, cursor and cross-user-denial case.

`node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/vite/bin/vite.js build`, and `git diff --check` passed. The Vite build retains the project's existing bundle-size warning. Subsequent live acceptance is recorded separately in [MESSAGING_RELEASE_RESULT.md](MESSAGING_RELEASE_RESULT.md); this review itself remains local/emulator evidence.

Next owner decision: do not repeat this release. Choose a separate Phase 0 containment branch and establish its own compatibility gate.
