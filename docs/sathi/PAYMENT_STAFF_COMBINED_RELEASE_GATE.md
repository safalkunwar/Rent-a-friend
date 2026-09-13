# Payment + staff-assignment combined release gate — 2026-09-13

## Verdict

**GATE CLOSED: DEPLOYED AND LIVE SDK ACCEPTANCE PASSED.** After explicit owner approval, candidate `764eb7a3...` became active on 2026-09-13 at 01:51 UTC. All 28 dedicated-account production checks and cleanup passed. See [PAYMENT_STAFF_RELEASE_RESULT.md](PAYMENT_STAFF_RELEASE_RESULT.md) for current source, rollback and evidence. The pre-release observations and instructions below are retained as historical gate inputs, not a request to repeat the rollout.

This candidate combines the two independently tested patches without reverting either one. It is not the unsafe historical staff/payment draft and does not implement full staff RBAC, booking payment authority or provider checkout.

| Input | SHA-256 |
| --- | --- |
| Production baseline | `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497` |
| `ops/payment-containment/combined-candidate.firestore.rules` | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` |

Fresh read-only production comparison at `2026-09-13T01:40:43.750Z` passed. Active release still points to `projects/hamrosathi1/rulesets/f4e99332-71c9-46ef-93fe-39843148d35f`. Exact rollback source and semantic manifest: [rollbacks/payment-preflight-2026-09-13T01-40-43-747Z](rollbacks/payment-preflight-2026-09-13T01-40-43-747Z).

## Exact changes

1. `/payments/{paymentId}`: preserve reads; deny all client creates/updates/deletes, even root/finance. Trusted backend provider verification is still required.
2. `/admins/{adminId}`: preserve own lookup; permit staff listing and valid typed assignment management only to explicit non-anonymous super-admin claims. Add only the branch-specific `sathiAssignmentRoot` helper.

Every other production source byte is unchanged. No Storage/index/CORS/Functions/Hosting change. Users/profile/media, Stories, community/comments/likes, events/activities, booking/locks, companions, messaging, notifications, KYC/private paths, referrals/rewards and all remaining helpers are untouched. Their known pre-existing risks remain, not certified away.

## Reproduction and actual checks

```powershell
node ops/payment-containment/generate.mjs
node ops/staff-containment/generate-assignment-candidate.mjs
node ops/payment-containment/generate-combined.mjs
node --test tests/payment-containment-contract.test.mjs tests/operator-bootstrap-policy.test.mjs
# Start the cached Firestore emulator separately, loopback port 8087, demo project only.
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8087'
$env:SATHI_COMBINED_GATE='1'
node --test --test-concurrency=1 tests/payment-write-containment.test.mjs tests/staff-assignment-containment.test.mjs
node ops/payment-containment/preflight.mjs --approved-read-only --combined
```

- Combined emulator result: **39/39 passed**. Payment writes stay denied alongside assignment restrictions, including sequential and atomic self-promotion attempts. Valid root role management succeeds; owner reads and selected existing social/profile/booking/messaging behaviors remain compatible.
- Static payment/combined-scope and operator-policy tests: **8/8 passed**. Both exact patch reversals reconstruct the baseline; changed input is rejected.
- Main **309/309**, admin **41/41**, type/build/policy checks passed as detailed in the [payment gate](PAYMENT_WRITE_CONTAINMENT_GATE.md). No whole-product security verdict follows from those counts.
- No rules deploy, live payment negative probe, live staff assignment test, real-money action, or admin browser acceptance occurred. Root claim readback is not proof of a refreshed browser token.

## Remaining release requirements

Earlier Story/media-only rollout authority does not cover these newly changed branches. Obtain scoped production authorization for this exact two-branch candidate, then repeat preflight immediately before release. Stop if active source or assignment inventory has drifted; preserve the new source rather than forcing the old baseline.

Prepare a candidate-only deploy/readback operation, with a reviewed exact source hash and rollback saved before activation. Never deploy root `firestore.rules`, the earlier frozen draft or either isolated candidate after the combined release. Follow with dedicated disposable-account SDK acceptance: owner payment read; customer/finance/root payment-write denials; root valid assignment create/read/update/delete; lower-role self-promotion denied; fixture cleanup and unchanged unrelated paths. Do not use real financial/customer records for destructive probes.

Regression risks: undocumented browser-created pending payments would stop; document-only roots cannot manage assignments; shape validation rejects historical extra assignment fields. No assignment documents existed in the initial inventory, but recheck before release. Existing issued role tokens may remain stale until refresh; broader revocation/resource-scoping work is still needed.

Recovery: previous production rules are saved, but they reopen demonstrated flaws. Prefer stopping affected operations and a reviewed forward correction. Do not automatically restore insecure rules, erase journals or revoke the sole recovery operator.

## Next product dependencies — not finished

P0: remaining legacy staff classification and resource-level RBAC; booking/payment-status/lock compatibility; legacy deployment inputs and sensitive-data grants. P1: Event participation policy, App Check valid-token qualification, backup/restore drill, installed-PWA/device/Capacitor acceptance, provider sandbox/merchant requirements. Roadmap phases 1–12 remain conditional implementations, not completed because the architecture Markdown exists. Real payments, new Functions, cash redemption and deeper referral activation remain off/gated.
