# Local containment artifacts — NOT a deployment configuration

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

```powershell
node --test tests/staff-payments-containment.test.mjs
```
