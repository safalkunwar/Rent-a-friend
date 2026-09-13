# Payment and staff-assignment release result — 2026-09-13

## Verdict

**DEPLOYED; EXACT RULES READBACK AND 28 LIVE SDK CHECKS PASSED.** This closes the scoped payment-document write and staff-assignment escalation release, not full P0-02/P0-03/P0-04 or commercial payment readiness.

The owner explicitly approved this exact combined candidate after the local gate. Only the production Firestore `cloud.firestore` release in `hamrosathi1` was activated. No root Firebase configuration or isolated historical draft was deployed.

| Item | Verified value |
| --- | --- |
| Previous source SHA-256 | `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497` |
| Active source SHA-256 | `764eb7a390c58ee077a38fe51798ddc994ac5d8db12c556e6bb41db68c08f402` |
| Active ruleset | `projects/hamrosathi1/rulesets/ad82806d-52fe-4c75-a723-a2f3cdfc81e0` |
| Release update time | `2026-09-13T01:51:19.933304Z` |
| Exact active-source readback | Passed at `2026-09-13T01:51:23.648Z` |
| Live acceptance and cleanup | Passed at `2026-09-13T01:52:29.420Z` |

## Safety gate and semantic diff

Fresh source comparison, zero-document staff-assignment inventory and verified recovery-operator root-claim check passed before activation. Both the approved hard-coded candidate hash and recomposition from the active baseline were checked. A second release/source check ran after ruleset creation and before activation; no drift was observed.

The exact previous production source and predeploy manifest were saved **before** creating/activating the ruleset: [release rollback and readback evidence](rollbacks/payment-staff-release-2026-09-13T01-51-14-023Z). The earlier fresh preflight is [also retained](rollbacks/payment-preflight-2026-09-13T01-46-50-780Z).

Changed security behavior:

- `/payments/{paymentId}`: all client create/update/delete denied, including finance and super-admin; existing payment reads unchanged.
- `/admins/{adminId}`: only explicit non-anonymous super-admin claims may manage valid typed assignments; own lookup retained; root may list staff assignments.
- One branch-specific helper, `sathiAssignmentRoot`, added. All other production source bytes preserved, including the prior messaging/favorites and media containment.

No Storage, indexes, Functions, Hosting, CORS or real customer/payment data changed. The deployment itself did not change Auth claims. Subsequent acceptance created four generated test identities with temporary roles, and removed them afterward; the real operator's previously approved super-admin role was not changed.

## Verification actually executed in this rollout

| Check | Result |
| --- | --- |
| Static scope/composition/operator-policy suite | 8/8 passed |
| Combined Firestore emulator suite | 39/39 passed again on isolated loopback/demo projects |
| Release-tool guards and pinned candidate test | 3/3 passed |
| Candidate-only Rules API activation | Passed |
| Exact active-source and ruleset readback | Passed |
| Dedicated-account production SDK checks | 28/28 passed |
| Fixture cleanup with ownership and update-time checks | Passed; zero cleanup errors |

Live SDK evidence: [redacted acceptance result](rollbacks/payment-staff-acceptance-2026-09-13T01-52-29-423Z/result.json). It verified:

- Owner reads pending payment from the server; unrelated customer cannot read it; existing finance/root reads remain allowed.
- Owner, unrelated customer, finance and root cannot create, update or delete payment documents; the generated zero-value NPR fixture remains unchanged.
- Root creates, reads/queries, updates and deletes a valid disposable staff assignment; server reads verify persistence and deletion.
- Document-only staff cannot self-promote; finance and ordinary customer cannot assign themselves root authority.
- Exact active rules remain in place after the checks.

The fixture plan is private/Git-ignored under `ops/payment-containment/.private/`. Four disposable Auth accounts were cleared of claims, disabled, refresh-token revoked, deleted and verified absent. Five planned payment paths and four assignment paths were checked/cleaned; only one existing payment fixture and one valid assignment were intentionally created. Failed writes did not leave forged records. The remaining generated paths were absent. No real provider transaction occurred.

Before creating these accounts, the deployed Function inventory was read: no v1 Functions, seven active v2 media Functions, no Auth/payment trigger, no pagination/unreachable-region warning. Nothing was deployed or disabled in Functions.

## Evidence limits and remaining work

This is genuine production SDK/rules verification, not a browser screenshot or a build-only claim. It does **not** prove interactive admin UI acceptance, the real operator's refreshed browser session, installed-PWA upgrades, complete staff least privilege, sensitive-read scoping, booking/payment-status/lock correctness, ledger/provider processing or broader roadmap completion.

The previous session's main 309/admin 41 tests and builds remain dated application evidence; they were not rerun in this rules-only rollout. No application component, service behavior, Vercel publication or Git push was performed this turn. The earlier local admin repository fail-closed change remains a separate unpublished app change; production rules already enforce the payment boundary regardless of that client release.

Six legacy generic admin records and other broad `isAdmin()` resource grants remain unchanged. Bootstrap/assignment containment is not full role classification or token-revocation architecture. Provider verification, booking/lock containment, Event policy, App Check and restore/device gates remain open. Real-money activation remains off/gated.

## Recovery and continuation

The old rules source is preserved, but restoring it reopens demonstrated payment/assignment flaws. Prefer freezing affected operations and a reviewed forward correction; do not automatically roll back to insecure rules or erase financial evidence. The rollout touched no financial journal.

All future rule candidates must start from active hash `764eb7a3...`, not `28709c31...` or root `firestore.rules`. Old generators deliberately reject the new live baseline; that is a safety stop, not a reason to bypass the hash check. The generator manifests are historical source-build metadata, not current deployment-status truth. Use this release result and `DOCUMENTATION_STATUS.md` for current state. Do not repeat this deployment or run either isolated candidate on top of it.
