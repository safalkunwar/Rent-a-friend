# Messaging metadata gate — fresh read-only result

Snapshot: **2026-09-10T15:47:04.801Z**. Capture finished2026-09-10T15:47:24.067Z. Project hamrosathi1, default database.

## Outcome

**No orphan-message migration is indicated by the current metadata.** All306 messages reference existing parents with valid two-member lists. All36 conversation documents have stored id equal to their Firestore document ID. There are zero missing references, duplicate member-pair groups, malformed memberships or ambiguous target suggestions.

The metadata-reconciliation gate passes for these measured properties. This is **not production deployment approval or signed-in UI acceptance**. Existing production security vulnerabilities and app entry-path compatibility remain separate release concerns.

| Measurement | Fresh complete snapshot |
| --- | --- |
| Conversations | 36 |
| Valid distinct two-member lists | 36 |
| Stored id equals actual document ID | 36 |
| Missing/malformed/mismatched stored id | 0 /0 /0 |
| Canonical / reversed / opaque document IDs | 6 /0 /30 |
| Duplicate member-pair groups | 0 |
| Member pairs containing underscore UIDs | 0 |
| Messages | 306 |
| Distinct exact parent references | 35 |
| Messages whose exact parent exists with valid membership | 306 |
| Missing parent references | 0 |
| Messages requiring a proposed replacement target | 0 |
| Ambiguous / unmatched references | 0 /0 |
| Existing-parent alias conflicts | 0 |

The30 opaque IDs are existing, membership-authorized parents, not missing records. The current inbox selects returned IDs, and this snapshot has no stored-id override mismatch. Open-by-companion/create paths still construct canonical IDs, which can select/create a different thread for an existing opaque pair. This potential entry-path issue is not grounds for bulk ID migration.

## How it was verified

- Explicit owner approval for bounded metadata reads; no production mutations.
- Fixed endpoint: Firestore runQuery for hamrosathi1/default only.
- Same readTime on every request; server responses confirmed it. Firestore supports historical readTime selection for queries. [Official runQuery reference](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runQuery).
- Server-side projections: conversations.id/participantIds and messages.conversationId. No message text, lastMessage, sender IDs, contacts, KYC, media or Auth-user export fetched.
- Document names used in memory to establish exact parent existence. A complete conversation snapshot covers every referenced parent, so no extra parent lookup was needed.
- One conversation query returned36 records. Four message pages returned306 records. Page size100, cap1,000 per collection; final short pages establish exhaustion. Both scans complete at the same snapshot.
- Reader rejects unexpected fields, cross-project names, duplicate documents, unconfirmed readTime and exceeded caps. Errors do not echo raw responses or credentials.
- Classifier gives exact parents precedence. Alias/pair matching is only a suggestion mechanism; zero records needed it here. No identifiers or mappings were printed/saved.

Saved aggregate: `rollbacks/messaging-readiness-2026-09-10/reconciliation-aggregate-2026-09-10.json`. It includes capture/request accounting, projections, completeness and exact reader/classifier hashes. Source reader: `ops/containment/read-messaging-metadata.mjs`. Pure analysis: `ops/containment/messaging-reconciliation-dry-run.mjs`.

Fresh tests: **21/21 passed** (eight reader-contract tests plus13 classifier/privacy tests). Node syntax and git diff --check passed. Previous270 app/48 rules checks are historical; not rerun for this reader-only change. No fresh live rule/index fetch, browser test, two-user authorization test or deployment was performed.

## Contradiction with the previous inventory

Earlier saved aggregates reported306 orphan messages across35 missing parents, plus5 canonical/1 reversed conversations. This fresh snapshot instead reports306 exact-parent matches and6 canonical/0 reversed. Neither cap was reached in either report, but the prior original collector/full inputs were not retained.

We cannot determine from those aggregates alone whether the difference arose from the prior collector/classification or intervening external production changes. This session performed no repair, migration or production write. Do not claim messages were restored by this read. Retain the earlier aggregate as historical evidence, but do not use it to authorize destructive repairs.

Stored membership was historically client-mutable under production rules. The current structural consistency proves exact-reference compatibility, not rightful ownership of every historical message. No sender/content or independent ownership audit was authorized or performed.

## Safest next step

Follow-up local review: [MESSAGING_ENTRY_PATH_REVIEW.md](MESSAGING_ENTRY_PATH_REVIEW.md) reproduces companion-entry misselection and duplicate-pair creation. It proposes a messaging-only existing-thread resolver; no application behavior has been changed yet.

1. **Do not migrate or delete history.** The stated orphan/ID-mismatch justification is absent in this snapshot.
2. Review and test the existing-thread resolution paths for opaque pairs: inbox selection, open-by-companion and booking-triggered createConversation. Any implementation should preserve existing thread IDs and avoid duplicate pair creation; request separate approval before changes.
3. Before a separately authorized scoped rules release, refresh active rules/index state and rollback, rerun exact artifact/authorization tests, and define live two-user acceptance. Admin-authenticated metadata reads do not test end-user rules.
4. Keep booking/staff/payment drafts isolated. No deployment or next product phase follows automatically.
