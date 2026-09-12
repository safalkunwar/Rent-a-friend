# Messaging release gate — prepared 2026-09-11

## Status

**Gate C stopped with no production rules change.** Gate B passed twice on 2026-09-12, saving `rollbacks/messaging-release-2026-09-12T14-17-18-188Z` and `rollbacks/messaging-release-2026-09-12T14-17-20-307Z`; both archive the same verified baseline. The scoped deploy command returned without a Firebase success record; mandatory readback confirmed that active `hamrosathi1` Firestore rules still equal the baseline, not the candidate. Therefore no rules release or application publish occurred. This gate covers the local existing-thread compatibility fix and the reviewed messaging/favorites containment candidate. It does not approve root `firestore.rules`, Storage, indexes, Functions, bookings, staff/payment drafts, migrations, data repair, or an automatic Vercel release.

## Release unit

| Part | Exact input | Allowed action after approval |
| --- | --- | --- |
| Application | The reviewed working tree containing `conversationResolution`, `messaging`, `MessagesTab`, `AppContext`, and associated tests | Build and publish the immutable reviewed application commit through the existing Vercel integration |
| Firestore rules | `ops/containment/candidate.firestore.rules`, SHA-256 `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497` | Deploy only with `ops/containment/firebase.messaging-release.json` and `--only firestore:rules` |
| Baseline | Exact active source expected to hash `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013` | Read, compare and archive as a fresh rollback; stop on drift |
| Indexes | No new index | Do not deploy `firestore.indexes.json`; the bounded membership query is emulator-authorized and must be live-qualified before/with acceptance |

The release config is intentionally separate from root `firebase.json`, which points to a different and unqualified rules generation. It cannot deploy Storage, Functions, Hosting, or indexes.

## Required approvals

1. Explicit approval to run the read-only production preflight.
2. Review of its fresh rollback, active hash, and candidate semantic scope.
3. Explicit approval to deploy exactly the candidate Firestore rules and publish the reviewed application commit.
4. Approval to use two dedicated, non-admin test accounts for production acceptance. Do not use real customer conversations or attempt a hostile write against a real user.

An approval for one numbered item does not imply the next item.

## Gate A — immutable local evidence

Before any production access:

1. Ensure the reviewed application changes and release config are the only staged release inputs; preserve unrelated dirty/untracked work.
2. Record the final Git commit ID and working-tree diff. A Vercel deployment must be tied to that exact commit, not a local uncommitted build.
3. Run:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=2 --minWorkers=1
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
git diff --check
```

4. Start an isolated Firestore emulator and run:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8087'
node --test tests/messaging-favorites-containment.test.mjs
```

Current local evidence is 301/301 client assertions and 49/49 candidate emulator checks. Re-run after any release-input change; do not treat these counts as production proof.

## Gate B — read-only production preflight

With only the first approval, run:

```powershell
node ops/containment/messaging-release-preflight.mjs --approved-read-only
```

The script is fixed to `hamrosathi1`; it reads the active `cloud.firestore` release, stops unless its source exactly matches the baseline hash, deterministically regenerates the candidate in memory, and writes a local rollback copy plus manifest under `docs/sathi/rollbacks/messaging-release-*`. It has no deployment branch and never reads application records, messages, Storage, Auth users, or secrets.

**Gate B result:** PASS. Active ruleset `c618d018-32bb-419b-8b78-17aac11c5b55`, release update `2026-09-09T13:29:02.458649Z`, active SHA-256 `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013`; candidate SHA-256 `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`.

Stop if any of these occur:

- active hash differs from the expected baseline;
- active source is not exactly one rules file;
- candidate bytes differ from the deterministic patch;
- project/release identity is not `hamrosathi1` / `cloud.firestore`;
- current application changes are not tied to a reviewable immutable commit.

If stopped, do not rebase the candidate, overwrite the rollback, or deploy root rules. Report the drift for a new semantic review.

## Gate C — production deployment

Only after the second explicit deployment approval and a passing Gate B:

```powershell
node node_modules/firebase-tools/lib/bin/firebase.js deploy --project hamrosathi1 --config ops/containment/firebase.messaging-release.json --only firestore:rules
```

### 2026-09-12 stop record

The exact command above was invoked after a passing preflight. It did not produce a successful Firebase release record. `ops/containment/messaging-release-readback.mjs --approved-read-only` then read active rules and stopped: active SHA-256 remained `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013`, while the candidate is `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`.

Treat this as a failed/no-op deployment, not success. Do not retry automatically. Before a new explicitly approved attempt, inspect Firebase CLI deployment diagnostics/authentication and verify the isolated config is honored; then rerun Gate B and readback. Do not publish the app until readback succeeds.

Immediately read back the active release and compare its source to `candidate.firestore.rules`. Save that post-deploy release name/hash next to the Gate B rollback. Publish the exact reviewed application commit only after this readback succeeds, then confirm Vercel serves that commit/build rather than a stale PWA asset. Do not run root `firebase.json`, `firestore.indexes.json`, Functions, Storage, `firebase deploy` without `--only`, or any booking/staff draft.

Rollback is **not automatic**. A rollback would restore the Gate B source and reopen the known messaging/favorites authorization bypasses. It requires a fresh read of the then-active source, an explicit decision, and a new release record.

## Gate D — two-user live acceptance

Use two newly-created dedicated normal accounts A and B. Capture only timestamps, operation outcomes, release hashes and generated test IDs; do not save message text or personal profile data in project documentation.

| Case | Expected result | Stop condition |
| --- | --- | --- |
| A opens B by public companion profile | Existing opaque/reversed/canonical pair resolves to the actual parent ID; no virtual duplicate | A different parent appears or lookup reports ambiguity/error |
| A opens a genuine new pair | Viewing alone creates nothing; first send creates one canonical parent then persists a message | Parent exists before send or send creates a second parent |
| Refresh/sign out/in | The same actual parent and message history reappear | History disappears or another parent appears |
| B opens A | B sees the same parent and new message | Cross-user pair mismatch or missing history |
| C (dedicated outsider) | Cannot query/read/write A/B conversation or send to its message path | Any outsider access succeeds; stop and preserve evidence without probing real users |
| Unread reset | B selecting a nonzero unread existing parent updates only `unreadCount` and `updatedAt` | Membership, ID or creation timestamp changes |
| Index/query | The exact bounded `participantIds array-contains uid`, document-ID ordered/cursor query succeeds for A without `FAILED_PRECONDITION` | Index error; do not create an index without separate review |

The existing pre-booking two-message product policy must remain unchanged. Test only with suitable dedicated accounts and a legitimate test booking where required; do not alter payment, booking or staff records to bypass it.

## Completion record

The release report must state: final app commit and Vercel deployment/build identifier; pre/post rules release IDs and hashes; candidate hash; precise commands/suite counts; live acceptance results for each case; PWA cache observation; any anomaly; and confirmation that Storage/indexes/Functions/data migrations were untouched.

Passing this gate qualifies only the messaging/favorites release unit. It does not close the separate Phase 0 staff, booking/payment, Event-index, App Check, backup/PITR, or device-QA risks.
