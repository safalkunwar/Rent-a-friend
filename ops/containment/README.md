# Local containment artifacts — NOT a deployment configuration

Latest inventory correction and offline-only reconciliation preparation:
`docs/sathi/MESSAGING_RECONCILIATION_DRY_RUN.md`. The classifier has no live
reader or write mode. Do not interpret its unique-match suggestions as ownership
or migration approval. The previous opaque-ID invisibility claim is withdrawn;
the corrected readiness report distinguishes inbox and canonical entry paths.

The separate `read-messaging-metadata.mjs --approved-read-only` reader requires
explicit task authority, fixes the target to hamrosathi1, uses server-side
projection plus one readTime, and outputs aggregates only. It has no write mode.
Latest approved result: all306 messages have existing parents; no migration
indicated. See `docs/sathi/MESSAGING_METADATA_RESULT.md`. Do not rerun as an
automatic monitor or confuse the read-only API's POST method with write authority.

`candidate.firestore.rules` is now **messaging/favorites only**. Generate it with
`node ops/containment/generate-candidate.mjs` from the exact archived production
baseline. The generator refuses baseline drift and records hashes/scope in
`messaging-favorites.manifest.json`. No Firebase configuration was repointed here.

`staff-payments.DRAFT.firestore.rules` preserves the former combined artifact
byte-for-byte (SHA-256 `ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd`).
It is unsafe, unapproved, and deliberately excluded from generation. The original
`staff-payments-patch.mjs` is unchanged. Its suite now targets this frozen draft;
its nine failing denial assertions are retained, not weakened or skipped.

Read `docs/sathi/MESSAGING_CONTAINMENT_CORRECTION.md` for the semantic diff,
compatibility limitations and pre-deployment gates. Do not deploy either artifact
automatically, and never substitute root `firestore.rules`.

Run against the loopback Firestore emulator only:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8085'
node --import tsx --test --test-concurrency=1 tests/messaging-favorites-containment.test.mjs tests/architecture-baseline.test.mjs
```

The second suite intentionally reproduces unsafe archived production behavior;
its passing tests are NOT a production security certificate. Run the separate
staff draft suite explicitly to inspect its known failures:

If port8085 belongs to another session, the messaging suite alone also accepts
127.0.0.1:8087 with its isolated `demo-sathi-messaging-writer-review` project.
The archived diagnostic/staff suites still require8085; do not point them at
another session's data or relax their guards. See
`docs/sathi/ANTIGRAVITY_RESUME_REVIEW.md` for current verification and the
unapproved booking draft's stop conditions.

```powershell
node --test tests/staff-payments-containment.test.mjs
```
