# Home live-query diagnosis — 2026-09-06

## Owner priority update

The owner clarified that existing data is mostly scripted and preserving temporary sample records is not a design requirement. Prioritize clean architecture and correct queries. The index diagnosis below remains valid, but its proposed rollout is **not approved** and must not substitute for query-contract review.

Before rollout, define canonical timestamps, ordering, visibility and pagination per domain, align writers/readers/rules, and test them with controlled fixtures. Do not add fallback queries, dual schemas or migration machinery solely to accommodate sample records. Any production reset still needs explicitly identified collections/resources and authorization; “mostly scripted” does not identify which remaining records are real.

Initial code review found additional contract work: `SocialRepository.createComment` writes client-clock ISO timestamps; its `getComments` path orders ascending while `usePostComments` selects the latest 50 descending and reverses for display. These different windows need an explicit, shared contract rather than assuming equivalent behavior. Stories currently order by expiry, not directly by creation time; rules constrain expiry to within 25 hours but do not enforce an exact creation-to-expiry interval. Product-visible ordering must be intentional before selecting the final index set. These are code-review findings, not changes implemented in this session.

Static search found no call sites for `getComments` in `src` or `admin/src`; treat it as a removal candidate, not a reason to preserve a second active comment pipeline. Confirm usage before removal.

Preserving unrelated production configuration is an operational scope boundary, not a commitment to preserving sample data or obsolete architecture. Retire obsolete indexes only after enumerating their actual readers and explicitly approving that scope.

## Confirmed outcome

Two bounded, unauthenticated Firebase Web SDK server reads against `hamrosathi1/(default)` both failed with `failed-precondition`: **The query requires an index.** These are live backend responses, not deductions from TypeScript, emulator tests or an empty feed.

| Read | Actual query | Result |
| --- | --- | --- |
| Home Stories | Imported the actual `visibleStoriesQuery` from `src/services/mediaQueries.ts`: moderationStatus == ACTIVE, visibilityStatus == PUBLIC, status == active, expiresAt > current Timestamp; expiresAt DESC then document ID DESC; limit 10 | Missing-index error |
| Latest comments on previously observed public post cp10 | comments where postId == cp10, createdAt DESC, limit 50; same query shape as `src/hooks/usePostComments.ts` | Missing-index error |

The SDK probe initialized a separate app with the repository's public Firebase configuration, checked project ID equals `hamrosathi1`, used no user/admin login, printed only success/count or sanitized errors, and terminated its Firestore instance. No document content, tokens or credentials were exported. No writes, index creation, rule changes, deployments or billing operations were performed.

## Local definitions already present

The read-only Firebase CLI inventory (`firestore:indexes --project hamrosathi1 --json --non-interactive`) succeeded. It reported **60 composite indexes**. Filtering the full response to `stories` and `comments` returned exactly one definition: comments(postId ASC, createdAt ASC). No Story composite and no descending comments composite were present. Thus the two required definitions are absent from this live inventory, not simply present in a building state. No index-state inference is needed for those absent definitions.

Both required collection-scoped composite definitions exist in `firestore.indexes.json`:

- Stories: moderationStatus ASC, visibilityStatus ASC, status ASC, expiresAt DESC, __name__ DESC.
- Comments: postId ASC, createdAt DESC (implicit document-name order DESC).

The old comments ascending index does not replace the descending query's required index. The Story failure was obscured by `useVisibleStories.ts` catching all exceptions into a generic unavailable message. The preceding UI change correctly identifies the failed source, but does not repair the deployed backend.

Firebase documents that unsupported queries report missing indexes and that newly created indexes must finish building before use. [Official index management documentation](https://firebase.google.com/docs/firestore/query-data/indexing).

## Safest proposed correction — approval required

1. Reconfirm project `hamrosathi1` and database `(default)` immediately before mutation.
2. Create only the two missing composites above using an additive, individually targeted operation. Preserve every existing index and field override. Do not deploy the entire dirty repository or use a force/delete operation.
3. Inspect their build states; wait until both are ready before repeating the exact bounded guest server queries.
4. A successful zero-Story response proves query execution only, not that eligible Stories exist. Verify eligible media with approved test fixtures separately. A successful comments read does not prove comment writes or counter integrity.
5. Check desktop/mobile Home error recovery and opened comments. If the next response is permission-denied, stop and diagnose deployed rules; do not relax public/active/moderation restrictions to force success.

**Dependencies:** Owner approval for the two production index creations; suitable existing project authorization; index build completion. No application-code deployment or Cloud Functions activation is needed to address this specific missing-index prerequisite.

**Regression/cost risk:** Indexes consume storage and add indexing work. The larger risk is an overbroad deployment deleting or changing unrelated indexes/rules. Keep existing ascending indexes for older query consumers. No automatic rollback deletion is proposed; investigate any unexpected result before destructive action.

**Scope limit:** This diagnosis is not a deployed-app, media-persistence, rules-security, physical-device/PWA or load certification. Existing local test results remain historical; no application code changed in this diagnostic session.
