# Staff bootstrap and assignment gate — 2026-09-13

## Current result

**Operator super-admin bootstrap and staff-assignment containment are released.** See [PAYMENT_STAFF_RELEASE_RESULT.md](PAYMENT_STAFF_RELEASE_RESULT.md): exact rules readback and 28 live SDK checks passed for the combined payment/assignment release. The isolated candidate/pre-release evidence below is historical. Broader P0-02 staff RBAC is not complete.

The assignment/payment combination was subsequently qualified in the same session: [combined release gate](PAYMENT_STAFF_COMBINED_RELEASE_GATE.md), 39/39 emulator checks plus fresh production comparison/rollback. No combined release has been activated.

The owner explicitly authorized choosing an initial super-admin. A bounded read of 109 Auth accounts found exactly one enabled, email-verified app account matching the authenticated Firebase CLI operator's email. The bootstrap selected that match rather than an arbitrary customer. No new account, password, profile role or `admins` document was created.

`ops/staff-containment/bootstrap-operator.mjs --approved-bootstrap-operator` added only `adminRole: super_admin`, preserved unrelated custom claims, and obtained `CLAIMS_READBACK_PASS` from Auth. Exact UID/previous claims/intended claims and readback result are retained privately under `ops/staff-containment/.private/bootstrap-2026-09-13T01-31-32-195Z/`, excluded from Git. The changed account needs a refreshed ID token (sign out/in). No signed-in admin-browser acceptance is claimed.

The bootstrap is repeat-safe when claims already match. It requires a unique verified/enabled operator match, complete inventory, pre-write claims recheck, private rollback creation, and exact readback. Auth claim updates lack transactional compare-and-set; do not run it concurrently with another role-management operation. Revoking a mistakenly granted role also requires handling already issued tokens; restoring claims alone is not an immediate session revocation.

## Assignment escalation candidate

Evidence: the active `/admins/{adminId}` branch permits any `isAdmin()` actor to write role assignments. `isAdmin()` includes legacy `users.role == admin` and any existing assignment, so a low-privilege/legacy staff user can manufacture document-based super-admin/finance authority. Standalone admin role management writes `{uid, role, updatedAt}`.

Fix candidate: `ops/staff-containment/assignment-candidate.firestore.rules`, SHA-256 `31dc83e00906b02ceb31c3db72a86d9d174e4e02add6ae5f28ea46fc9804dc67`.

- Changes only `/admins/{adminId}` and one branch-specific helper `sathiAssignmentRoot`.
- Root means an explicit trusted `adminRole == super_admin` claim on a non-anonymous identity. Neither `admin: true`, a legacy user role nor a document assignment can manage staff assignments.
- Valid create/update requires matching UID, one of the existing 11 typed roles, string `updatedAt` and no extra fields. Explicit root can delete assignments.
- Own-role lookup remains allowed. Root gains staff-list access required by the existing admin management service; unrelated staff cannot list assignments.
- Every other source byte is preserved from production baseline `28709c31...`. No other staff helper, resource grant, payment branch, Storage rule or application component changes.

Tests: `node --test tests/operator-bootstrap-policy.test.mjs` **5/5** passed. Isolated loopback `tests/staff-assignment-containment.test.mjs` **19/19** passed: root positive create/update/delete/list, malformed-role/UID rejection, own lookup compatibility, and guest/customer/legacy/document-root/generic-admin/anonymous-root/all ten non-root staff role negative writes including batches. Exact source reconstruction is asserted before emulator initialization. No production assignment exploit test was performed.

## Dependencies, risk and remaining work

The initial root identity choice is resolved; do not keep requesting that choice. The six legacy generic admin records still require role classification or an explicit revocation/freeze policy before broad authority migration. They retain current permissions: this bootstrap did not revoke or reclassify them.

Assignment containment prevents a specific escalation but **does not** make remaining `isAdmin()` checks least-privilege, solve stale-claim revocation, narrow sensitive reads, or secure Admin SDK commands. Document-only super-admins intentionally lose assignment management under the candidate; current inventory found no assignments at capture, but refresh it before release.

Before a separately reviewed rules rollout: fresh inventory/source capture, exact semantic diff/rollback, application role-management payload verification and combined regression tests. The payment and staff candidates are alternatives built from the same baseline: do not deploy one after the other without rebasing/composing and rerunning tests. Do not run the frozen earlier staff/payment draft.

Verify after deployment with dedicated accounts: explicit root manages a disposable assignment; lower roles cannot self-promote; existing root session refresh works; lower-role resource access remains correctly scoped in the subsequent wider RBAC phase. Never demote the only recovery operator automatically. A second independent recovery account is recommended, not an invented mandatory prerequisite.
