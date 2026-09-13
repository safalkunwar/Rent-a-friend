# Payment-write containment gate — 2026-09-13

## Result

**Released through the combined payment/staff-assignment candidate.** See [PAYMENT_STAFF_RELEASE_RESULT.md](PAYMENT_STAFF_RELEASE_RESULT.md): exact active-source readback and 28 production SDK checks passed. The isolated candidate and pre-release checks below are historical inputs, not current deployment instructions. This is payment-document write containment, not payment processing or completion of P0-03/P0-04.

Subsequent combined qualification in this session also passed: [payment + assignment gate](PAYMENT_STAFF_COMBINED_RELEASE_GATE.md), 39/39 emulator cases and fresh 01:40 UTC production-source comparison. The isolated candidate below remains useful for scope review; the combined candidate is the next release input.

Fresh production source comparison at `2026-09-13T01:26:19.712Z` passed. Active Firestore source remains SHA-256 `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497`, ruleset `f4e99332-71c9-46ef-93fe-39843148d35f`. The exact source and manifest were saved **before any potential deployment** in [the rollback directory](rollbacks/payment-preflight-2026-09-13T01-26-19-702Z).

## Evidence, cause and fix

| Issue | Evidence / root cause | Implemented candidate |
| --- | --- | --- |
| P0: customer can invent a payment record | Production `/payments/{paymentId}` permits owner create with only generic timestamp validation | Deny all client payment creates, including pending records |
| P0: every broad admin can change/delete payment truth | The same branch has additive `allow create, update, delete: if isAdmin()`; a later false delete does not override it | Deny all client payment mutations, including super-admin and finance-admin |
| Dormant application write bypass | `admin/src/repositories/AdminRepository.ts:updatePaymentStatus` writes any supplied status directly; no active callers found | Method now rejects before Firestore access; existing read-only payment UI unchanged |

`src/services/payments.ts` already fails closed and does not create pending records. Provider callbacks do not verify payment. No working provider checkout is being removed. Provider-verified backend commands remain a future prerequisite; Admin SDK bypasses these rules and must enforce its own authorization/receipt verification.

## Semantic diff

- Candidate: `ops/payment-containment/candidate.firestore.rules`.
- Candidate SHA-256: `1fce7dc5cd190327829d6ec11f6235fdb6eda8cc5a1d3f0fcf2bec7d37e1e0f9`.
- Only `/payments/{paymentId}` write grants change. Its read expression is identical.
- No helpers changed. Reversing that exact branch replacement reconstructs every original byte.
- Users/photo, Stories, social posts/comments/likes, events, bookings/locks, companions, conversations/messages, notifications, KYC, referrals/rewards and every other branch are unchanged.
- No Storage, CORS, index, Function, Auth or data mutation by this candidate/preflight. The separately authorized operator Auth bootstrap is documented independently.
- Root `firestore.rules`, existing drafts and the previous staff/payment candidate were not altered or deployed.

## Verification

| Executed check | Result |
| --- | --- |
| `node --test tests/payment-containment-contract.test.mjs` | 2/2 passed: exact branch scope and drift rejection |
| `FIRESTORE_EMULATOR_HOST=127.0.0.1:8087 node --test tests/payment-write-containment.test.mjs` (set env with PowerShell) | 20/20 passed, isolated `demo-sathi-payment-containment` |
| Isolated admin Vitest suite | 41/41 across 7 files, including payment repository negative writer test |
| Main Vitest suite, after expanded PWA tests | 309/309 across 36 files |
| Main/admin TypeScript; Functions TypeScript `--noEmit` | Passed; Functions were not deployed |
| Main/admin Vite builds; booking-policy consistency script | Passed; bundle-size warnings remain |
| `node ops/payment-containment/preflight.mjs --approved-read-only` | Active-source comparison and rollback save passed |

The 20 emulator cases cover owner, stranger, guest, Firebase anonymous identity, legacy admin, document assignment, all 11 staff roles, create/update/delete, atomic self-assignment+payment forgery, sequential legacy self-assignment, retained owner/staff reads, stranger read denial, and selected unrelated social/profile/booking/messaging access. The sequential self-assignment **still succeeds under this payment-only candidate**; the payment write remains denied. That known staff issue is covered by the separate assignment candidate, not hidden as a passing security claim.

One initial unrelated Event-read fixture lacked the existing ACTIVE/PUBLIC moderation fields. Corrected fixture then passed the same read assertion. No rule was relaxed. Emulator success is not a live payment acceptance result.

## Release dependencies and regression risk

1. Review this exact payments-only policy separately from any broader rule replacement. Earlier Story/media-only deployment approval is not approval for this new branch.
2. Re-run live preflight immediately before release; stop on drift. Keep a fresh rollback and deploy only a reviewed candidate, never root rules.
3. If combining the staff-assignment candidate, compose from one fresh source and test the combined source. **Both current candidates start from the same baseline; deploying them sequentially would undo the first one.**
4. Confirm no external consumer relies on browser-created pending payments. No such active writer was found in this repository, but external integrations were not inventoried.
5. Run dedicated-account live negative SDK probes only against disposable payment fixtures; verify owner read and unchanged payment state. Do not test on a real financial record.

Regression risk: undocumented browser payment writers will be denied intentionally. Staff can still read financial records under the existing broad read grant; privacy/RBAC is not solved. Booking payment flags, balances, rewards, private data and legacy staff authority remain independent P0 work. Do not enable real money.

Rollback: the saved source would restore insecure payment writes. Prefer freezing the affected UI/operation and a reviewed forward correction; do not automatically restore an insecure ruleset or delete financial evidence. Live rules/read/write acceptance and app publication of the repository change are **not performed**.
