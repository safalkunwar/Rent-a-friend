# Containment candidate — independent review

Verdict: **CHANGES REQUIRED. Do not deploy the current candidate.** Reviewed local work only; no production reads/writes/deployments in this review. Existing Gemini implementation and tests were not modified or regenerated.

## Reviewed inputs

- Base commit: 5ecc696; uncommitted work preserved.
- Captured production baseline SHA-256: `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013`.
- Messaging-only patch output: `00a08a9deb99cf5d0b0fe8e7984506d46af8a0f9335ef850ccd09e0937bf33b4`.
- Actual candidate on disk: `ad799e86e03de52a0570edf98f01cf72d0bce08fb09c307b70cc21a7c81f1bbd` — messaging/favorites PLUS staff/payments.
- Sources: ops/containment/{messaging-favorites-patch.mjs,staff-payments-patch.mjs,generate-candidate.mjs,candidate.firestore.rules}; both new containment suites; actual messagingService, MessagesTab, offlineMessages, favorites writers and admin role paths.

The original handoff requested messaging/favorites only, then review. The generator now unconditionally includes a subsequent payments patch. No approval for that expanded scope was established in this review. Keep it a separate draft unless the owner explicitly approves it; do not discard another agent's work.

## Findings, in priority order

### R1 — P0: payment authority is derived from a self-writable admin record

Evidence: candidate.firestore.rules:85–89 reads finance authority from either claims OR admins/{uid}. The unchanged admins branch at lines694–696 allows any legacy isAdmin actor to write admin assignments. isAdmin includes read_only_admin and the other lesser staff roles.

Independent emulator reproduction, using the actual candidate:

1. Create a synthetic payment owned by A; no admin assignment for reviewer.
2. Authenticate reviewer with adminRole=read_only_admin, admin=false, role=customer.
3. Direct payment update is DENIED (control).
4. Reviewer writes admins/reviewer with role=finance_admin: ALLOWED.
5. Same token updates the payment's status/amount: ALLOWED.

This is not merely a faulty fixture. Fixing only /payments cannot establish finance isolation while its authority document remains self-writable. The vulnerability pre-existed in broad RBAC, but this new helper relies on it and therefore does not accomplish the proposed containment.

Required correction: separate the payments draft from the messaging-only deliverable. For a separately approved staff-authority phase, define one trusted role-resolution/revocation policy and protect its assignment writes before consuming document-based finance authority. Test the whole escalation sequence, claim/document disagreement, revoked assignment and stale token. Do not silently fix every admin branch or introduce a blanket claim-only policy that locks out legitimate staff. Dependency/compatibility review is required.

### R2 — P1: generated artifact no longer matches the messaging suite or recorded release scope

Evidence: generate-candidate.mjs:22 applies patchStaffPaymentsRules to the messaging result and writes the same candidate.firestore.rules path. messaging-favorites-containment.test.mjs:41–47 compares that file against messaging-only output.

Fresh run: **all 18 messaging tests stop in setup** on a hash mismatch; their behavioral assertions never execute. The previous changelog's 18/18 result describes an earlier candidate, not the current combined file. This is not evidence that all 18 messaging behaviors fail.

Required correction: distinct explicitly named stage artifacts/manifests, or explicit single-stage generation with a separately named combined draft. Each test must validate and load the exact artifact it claims to qualify. Preserve archived production diagnostics. Do not remove the hash check or edit the expected hash while still loading different in-memory rules. Rerun the complete selected-stage suite and unrelated semantic-diff gate; record actual hashes and scope.

### R3 — P1: staff tests grant finance permission to every nominally denied actor

Evidence: staff-payments-containment.test.mjs:74–78 seeds admins/admin_user with role=finance_admin before EVERY test. Every role context uses the same admin_user UID. The helper unions that assignment with the token claim. Nine expected-denial cases actually succeed.

Fresh staff suite: 11 passed / 9 failed. The results follow the implemented OR policy. They do not establish that a lesser role without another grant can directly update payments; the independent no-assignment control denied that operation.

Required correction: independent actors/fixtures with no unintended grants for ordinary role tests; separate claim-only, document-only, conflicting-source and revocation cases. Define expected authority precedence first. Retain the escalation test from R1: simply removing this fixture would hide the real self-assignment bypass.

### R4 — P1 conditional privacy gap: split-ID authorization can disagree with stored membership

Evidence: candidate conversation/typing guards and unchanged message reads use `uid in conversationId.split('_')` OR stored participants. Synthetic conversation `A_B_C` with legitimate participants `[A_B, C]` lets unrelated UID A read its message via the path fallback. The candidate does not eliminate this inherited ambiguity.

This demonstrates a conditional rules defect, not proof that production currently contains affected custom/legacy UIDs. Actual production UID/history inventory was not performed in this review. User-generated Firebase UIDs are not a reason to silently assume all legacy/imported IDs satisfy a delimiter contract.

Required correction: inspect supported ID shapes and select an explicit compatibility policy. Prefer validated stored membership for existing canonical records; a legacy fallback must not broaden authority when stored participants exist. Trace messages and typing as well as the conversation parent. Test delimiter-containing IDs, missing membership and historical opaque IDs. If the approved patch's branch boundary must expand, document that dependency before implementation/deployment. Preserve genuine historical access; do not bulk rewrite conversations.

### R5 — P2: new-conversation validation permits non-list membership; create test exercises update

Evidence: independent probe creates conversations/custom-map with `{id: 'custom-map', participantIds: {C: true}}` as C; the candidate accepts it. The general non-pair-ID branch tests membership with `in` but does not require a two-element distinct string list. The application createConversation contract requires two distinct participants.

Additionally, the test labelled “stranger cannot create conversation hijacking ID A_B” uses A_B after beforeEach already created it, so setDoc exercises update rather than create.

Required correction: test genuinely absent targets and validate the selected new-conversation schema (two distinct string participants, authenticated membership and documented ID binding). Include map/string/empty/duplicate/extra-member inputs and actual service payloads. Keep legacy reads/repair decisions separate from what new records may contain.

## What did work in independent probes

- Stranger replacement of a canonical A_B membership was denied.
- The current MessagesTab merge payload `{id, participantIds, unreadCount, updatedAt}` succeeded for legitimate B on A_B.
- A read_only_admin without a finance assignment could not directly update a payment before the escalation sequence.

Actual createConversation uses create-if-absent transaction and preserves existing timestamps. Its no-Firebase fallback merges createdAt, but that is not an established live Firebase path. No normal first-party timestamp regression was claimed from that fallback. Existing typing subscription uses subscribeDocument on the collection path; that is a separate pre-existing integration issue, not fixed or certified by direct typing-document tests.

Main favorites currently use users/{uid}.favorites; the nested favorites path is a legacy compatibility/security surface. Both must remain scoped correctly; tests of one do not establish the other's UI behavior.

## Verification performed

Loopback Firestore only, started with demo-sathi-containment-review. Existing suites used their own demo project IDs. No Storage, Functions, production or application edits.

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8085'
node --test --test-concurrency=1 tests/messaging-favorites-containment.test.mjs tests/staff-payments-containment.test.mjs
```

Result: **38 tests; 11 pass, 27 fail** = 18 messaging setup failures + 9 staff denial failures. Additional isolated in-memory probes reproduced R1/R4/R5 and the positive controls above. Generator outputs were compared in memory; the candidate file was not overwritten. No main/admin suite or build rerun was needed for this read-only review, and no prior full-suite count is presented as a fresh result.

## Required next handoff

First return to the independently reviewable messaging/favorites-only scope. Preserve the payments draft separately; do not deploy it. Correct artifact/test alignment and creation/legacy-membership coverage without weakening assertions. Escalate any necessary legacy authorization contract change for review. Produce exact hashes, semantic diff, fresh positive/negative tests and a compatibility/rollback note. Stop before deployment.

The staff/payments phase must address trusted role assignment and revocation dependencies, not just replace isAdmin with a new OR helper. Do not advance to bookings, Events, wallet or architecture Phase 1 while presenting this combined candidate as approved.
