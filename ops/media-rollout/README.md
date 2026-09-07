# Scoped production media policy

These files were built against the exact production rollback snapshot in
`docs/sathi/rollbacks/2026-09-06-production-rules/`, not against the substantially
different root policies. See `docs/sathi/PRODUCTION_MEDIA_ROLLOUT_2026-09-06.md`.

The deployed rules inputs are selected by `firebase.media-rollout.json`.
**Do not deploy the root rules under the assumption they match production.**
Do not deploy this snapshot again without fetching the current releases and
reviewing any intervening changes.

The isolated emulator gate uses `tests/production-media-gate.test.ts` and
`tests/production-media-parity.test.mjs`. It verifies the actual shared media
service and requires exact non-media source preservation plus 81 behavioral
parity cases.

`production-smoke.ts` is an explicit opt-in live test. It creates two temporary
normal accounts, exercises rules through the normal SDK, and cleans only generated
fixtures. It needs an ephemeral cleanup-only IAM access token in
`SATHI_ROLLOUT_ADMIN_TOKEN`; never commit credentials or token output.
The optional browser phase accepts `SATHI_MEDIA_UI_PASSWORD` and holds for at
most ten minutes. `verify-ui.ts` performs extra read-only checks; `cleanup-ui.ts`
recovers interrupted Auth cleanup after confirming profile and Story fixtures
are gone. Both require the exact `SATHI_MEDIA_UI_RUN` and temporary password.

Rollback requires restoring the two archived rule sources/release references.
If reverting the cross-service integration, remove only the binding specified in
`service-agent-change.json`; preserve every other IAM binding. Never automate a
rollback over an intervening deployment without rechecking the active releases.
