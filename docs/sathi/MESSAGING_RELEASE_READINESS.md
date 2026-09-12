# Messaging release readiness — corrected 2026-09-10

## Current verdict: reference/identity metadata gate PASSED; deployment not authorized

**Fresh approved snapshot2026-09-10T15:47:04.801Z:** all306 messages reference existing parents, all36 stored conversation IDs match their document IDs, and zero missing/ambiguous references or duplicate member pairs were found. There are6 canonical and30 opaque parents. See [MESSAGING_METADATA_RESULT.md](MESSAGING_METADATA_RESULT.md) and the aggregate-only capture for current evidence. No production repair was performed. Do not migrate/delete history on the basis of the earlier orphan report. Existing-thread entry-path compatibility, fresh live rules/index qualification and separate deployment authorization remain.

## Superseded capture review — historical evidence and corrections

The remainder records the earlier capture's limitations and proposed investigation. Its orphan counts, unknown stored-id count and instruction to obtain a fresh metadata read are superseded by the approved snapshot above. The original collector/full inputs were unavailable; the cause of the discrepancy is not established.

The saved inventory reports 36 conversations and 306 messages, with all 35 distinct message parent references missing. Parent-required candidate rules would deny ordinary-user access to those orphan messages; they would **not delete them**. Existing staff overrides are unchanged. Actual current ordinary-user UI access to that history has not been established.

The previous report overstated that opaque IDs make 30 conversations invisible. Membership-based inbox selection uses returned IDs. Canonical pair construction affects new/open-by-companion paths separately. A stored-id override is another unresolved risk because that field was not projected.

This correction made no production requests or mutations. Counts below are retained from Antigravity's saved evidence, not a fresh independent scan. Do not deploy, delete history, recreate parents or migrate IDs from this report.

## Artifact evidence

| Artifact | SHA-256 |
| --- | --- |
| Archived baseline and saved readiness rollback Firestore rules | `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013` |
| Messaging-only candidate | `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497` |
| Preserved unsafe staff/payments draft | `ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd` |

Saved release reference: `c618d018-32bb-419b-8b78-17aac11c5b55`. Antigravity reported no deployed-rule drift at capture. The saved rollback hash matches the earlier baseline; that does not prove the current live release has remained unchanged since capture.

Rollback sources: `rollbacks/messaging-readiness-2026-09-10/{firestore.rules,manifest.json}`. Candidate scope remains nested favorites, conversations/typing and message membership guards. Root rules, Storage, indexes and Functions were not edited.

## Inventory and evidence limits

| Measurement | Saved observation |
| --- | --- |
| Conversations | 36; capture marked complete |
| Standard / opaque / reversed-ID classifications | 5 / 30 / 1 |
| Missing/null/map/empty or duplicate membership | 0 reported |
| Underscore-containing member UIDs | 0 reported |
| Missing or mismatched stored id | **UNKNOWN: id was not projected** |
| Messages | 306; capture marked complete |
| Distinct message parent references | 35 |
| Missing referenced parents | 35 reported |

Conversation projection was participantIds only; message projection was conversationId only. The saved aggregate flags say neither cap was reached. The original scan script and full projected records are unavailable locally, so pagination/exhaustion and mapping counts cannot be independently reproduced from this artifact alone. These are capture-reported totals, not a new scan.

The claim that all36 parent IDs are canonical contradicted the report's own30 opaque count and is withdrawn. On the reported zero-overlap result, all36 existing conversation documents have zero **exact** matching message references in that scan. This does not establish which messages belong to which conversation or prove 35 unique pair matches.

### Privacy correction

The original inventory persisted five conversation samples and five message samples (25 identifier values) despite the aggregate-only requirement; examples also appeared in the report. Those samples/examples have now been removed, without making another raw backup. Aggregate counts and rule rollback bytes remain. missingStoredId was changed from unsupported zero to null/unknown.

The source files were untracked at review, but no claim is made about copies outside this workspace, editor history or earlier tool logs. Do not share original exports. The earlier changelog assertion that no identifiers were persisted is superseded by this correction.

## Actual application paths

| Path | Code evidence and conclusion |
| --- | --- |
| Inbox | MessagesTab subscribes with participantIds array-contains current UID. Opaque IDs do not inherently exclude a document. |
| Select existing conversation | MessagesTab sets selectedConvo to the returned convo.id, then queries messages using that value. Selection does not reconstruct the sorted pair. |
| Subscription adapter | firestore.ts constructs `{ id: d.id, ...d.data() }`; a stored id can override the actual Firestore document ID. Inventory did not read that field. No production mismatch count is available. |
| Open/create by companion | AppContext.getConversationId and messagingService.createConversation sort/join members. They may miss an existing opaque/reversed-ID parent or create another pair conversation. This is distinct from inbox visibility. |
| Unread reset | Verified writer updates only unreadCount/updatedAt. It neither rewrites identity nor creates absent parents. |
| Legacy message references | seed.ts generates a conv_ prefix. This supports a possible scripted origin, but prefix or synthetic-looking UID alone does not prove ownership, disposable provenance or a correct target parent. |

The existing actual component tests cover selecting opaque and reversed-member conversations. They mock the subscription adapter, so they do not resolve a mismatched stored-id production case.

## Query/index qualification

Antigravity's manifest records66 composite indexes as READY but does not save their full definitions or exact query outcomes. All indexes being READY does not establish every query is covered.

- Inbox: current membership-only query must be qualified as written. Do not rely on an unrelated extra-field composite as proof.
- Message history: conversationId equality plus timestamp ASC; earlier report claims a matching deployed composite. Verify exact definition/query before rollout.
- Admin timestamp/updatedAt ordering: earlier claim that an array-membership composite covers an order-only query is not established. Inspect the actual query and single-field index configuration.
- markMessagesAsRead: definition exists but source search found no src/admin caller. Its missing-index claim is a future activation concern, not demonstrated failure of the current unread-reset UI. Do not remove it or deploy an index automatically.
- Emulator rules checks do not substitute for production query/index qualification. Keep any future probes read-only and projected; do not retrieve message text.

## Blockers and recommended actions

### M-01: orphan-reference ownership is unresolved

Evidence: saved306 messages/35 absent references. Candidate uses existing-parent membership. Root cause is an identity/reference mismatch; its complete production provenance is unverified.

Next: compute **candidate matches only** in a bounded metadata-only dry run. Compare exact document IDs, stored-id aliases, and legacy strings constructed from already-stored member pairs. Count unique/ambiguous/unmatched targets without saving identifiers. Never grant membership by parsing an untrusted string.

Dependency: full projected id/member metadata and an explicit ownership/source-of-truth decision. Risk: attaching private messages to the wrong people. Verification: synthetic conflict tests, complete scan status, sender/membership validation if later authorized, two-user access/denial after a separately approved repair.

Creating canonical parents alone does not reconnect messages whose conversationId still points elsewhere. Any eventual repair must explicitly address references and concurrency. Do not replace missing-parent checks with permissive prefix rules.

### M-02: stored identity and entry-path compatibility are unresolved

Evidence: adapter permits stored-id override; sorted-pair entry paths differ from inbox selection;30 opaque IDs are reported, not proven invisible.

Next: project stored id along with participantIds; count missing/mismatch and duplicate-pair cases. Preserve existing document IDs during analysis. Define selection precedence for existing pairs before proposing new identity migrations.

Dependency: fresh metadata and entry-path tests. Risk: duplicate threads, wrong-target updates and broken links. Verify actual adapter plus inbox selection, open-by-companion, send and unread reset with missing/mismatched stored IDs.

### M-03: evidence reproducibility/privacy must be restored

Original capture saved forbidden samples and omitted stored id. Full inputs/script are not available. Current aggregates cannot yield trustworthy unique/ambiguous mapping counts.

Next: use the tested offline classifier and bounded capture specification in MESSAGING_RECONCILIATION_DRY_RUN.md. Do not report zero unknowns or complete mappings from samples. No production repair is authorized.

## Safest next order

1. Review this corrected report and the aggregate-only dry-run contract.
2. Authorize/perform a bounded projected read to supply complete metadata in memory; classify exact, uniquely suggested, ambiguous and unmatched references. Stop at caps and label partial scans.
3. Present actual aggregate results and a proposed ownership-preserving repair/app integration plan. A unique suggestion is not repair authorization.
4. Only after separate approval: implement scoped repairs with backup/preconditions and tests, refetch rules/index state, then request deployment authorization.
5. Keep booking/staff/payment drafts separate and untouched.

Historical local verification remains48 rules checks,270 main tests, TypeScript and Vite/PWA build. This documentation/privacy/dry-run preparation does not constitute a new production acceptance test.
