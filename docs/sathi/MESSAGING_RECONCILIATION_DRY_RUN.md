# Messaging reconciliation dry-run contract — 2026-09-10

Status: **approved metadata reader executed; exact-reference gate passes.** Fresh snapshot2026-09-10T15:47:04.801Z contains36 parents and306 messages, all with valid exact parent references; all stored parent IDs match document IDs. No data migration/deployment authorized or performed. See [MESSAGING_METADATA_RESULT.md](MESSAGING_METADATA_RESULT.md). The original aggregate inventory was insufficient; the new reader supplied projected metadata in memory.

## Deliverable and current results

`ops/containment/messaging-reconciliation-dry-run.mjs` exports a pure classifier. It has no Firebase/filesystem/network imports, credential access, production command or write mode. Inputs remain in memory; outputs contain only aggregate counts and explicit no-repair/no-ownership flags.

Fresh production mapping results:

| Result | Status |
| --- | --- |
| Messages with exact valid parent | 306 across35 parent references |
| Unique proposed replacement targets | 0; none needed |
| Ambiguous/collision counts | 0 |
| Unmatched counts | 0 |
| Missing/mismatched stored-id counts | 0 /0 |
| Earlier missing-parent observation | Superseded by the new snapshot; discrepancy unexplained |

These are complete same-snapshot counts, not sample extrapolation. The source seed's conv_ naming does not establish that every record is disposable or correctly attributable.

## Input contract

- Conversations: `{ documentId, storedId?, participantIds? }`. Convert Firestore's projected stored `id` to `storedId`; never confuse it with the resource-name document ID.
- Messages: `{ documentId, conversationId? }` only.
- Explicit boolean `conversationsComplete` and `messagesComplete` from the bounded reader. Never assume completeness merely because a client limit was reached.
- At most1,000 rows of either type. Duplicate document IDs and unexpected fields—including lastMessage/text/media—are rejected with generic errors that do not echo identifiers.

The classifier does not assert input membership is trustworthy. Historical production rules permitted membership mutation. Even a unique match requires an independent ownership/source-of-truth decision before any repair.

## Matching decisions (suggestions only)

1. Resolve exact parent document ID first. Never redirect an existing parent to a different document because an alias also matches. Count conflicting aliases separately.
2. Invalid/non-pair memberships are not eligible proposed targets. Existing group records are flagged for separate review, not overwritten.
3. For valid two-member parents, build an in-memory lookup using stored-id aliases and both ordered/unordered pair joins, with and without conv_. Build strings from stored members; never split a message reference and treat its segments as proven users.
4. For references absent from the scanned parents, take the union of candidate documents. Count zero as unmatched, one as unique-candidate-only, and multiple as ambiguous. No candidate IDs or UID mappings are returned or persisted.
5. Detect duplicate member-pair groups using a serialized sorted array, avoiding underscore key collisions. Separately count underscore-containing pairs.
6. If conversation coverage is partial, absence and candidate uniqueness are provisional. Do not approve any operation using partial counts.

These decisions do not generate write operations, rewrite messages, recreate parents, assign membership, rename/delete documents or relax rules.

## Read-only collection contract (approved run completed)

Implemented in read-messaging-metadata.mjs with an explicit --approved-read-only CLI flag and fixed project/endpoint. The run used one conversation request and four message requests, saved aggregate output only, and performed no extra parent lookup because the conversation scan was complete. Future executions require their own task authority; this is not a standing monitoring authorization.

Prepare/review the reader before accessing production. Use a confirmed hamrosathi1 project, server-side projection and a consistent readTime when supported; otherwise record that multi-page reads are not an atomic snapshot and require a stability check. Page by document name,100 rows/page, at most1,000 conversations and1,000 messages. If exhaustion cannot be established inside the cap, mark partial and stop.

Conversation projection MUST include both id and participantIds. Message projection MUST include conversationId only. Keep identifiers and field values in memory. Do not fetch message text, lastMessage, sender identity, KYC, contact details or Auth exports. Do not print raw API responses/errors; record safe status/error codes and counts only. No persistent raw input file.

Call the offline classifier with projected metadata and verified completeness flags. Persist only its aggregate output, capture time, cap/page accounting and evidence limitations. A future sender/ownership validation step needs its own explicit authorization and data-minimization review; it is not included here.

Do not infer missing parents outside a partial capture. A complete conversation capture supports exact existence comparison at that capture time; repair would still need refreshed update-time preconditions and ownership evidence.

## Tests

Run `node --test tests/messaging-reconciliation-dry-run.test.mjs`.

Synthetic coverage: exact-parent precedence, unique-but-untrusted suggestions, conflicting alias/prefix candidates, duplicate pairs, underscore collisions, missing/malformed/mismatched stored IDs, invalid membership exclusion, unmatched/invalid references, partial-scan uncertainty, reversed members, immutable inputs, caps/duplicate-row/private-field rejection, aggregate-only output and saved-inventory privacy guard.

The classifier's tests do not prove live mappings or authorizations. Full app/emulator results from previous sessions remain historical and are not rerun as evidence of this offline-only change.

## Approval boundary after results

Present actual aggregate counts first. Stop for an owner decision on source-of-truth, legacy thread lookup and any data repair. Creating canonical parents without changing mismatched message references is not a repair. Do not use temporary permissive conv_ rules. Any later mutation needs independently verified target membership, exact backups, update-time preconditions, bounded batches, idempotency/recovery and two-user regression tests. None is implemented or authorized by this dry run.
