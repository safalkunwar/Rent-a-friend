# Staff analytics containment release result — 2026-10-14

## Result

The analytics-only Firestore rules candidate was released to `hamrosathi1` on 2026-10-14. The Rules API compiled a fresh ruleset, the release was activated, and an immediate source/ruleset readback matched the exact candidate.

| Evidence | Result |
| --- | --- |
| Before source hash | `8bfecbb1465176c50eab501b2b4680a19e678d83678a6f2003b197b1514f768f` |
| Candidate and active source hash | `94249bae2dc106e30b112e3f763a92695bbcf0e9fdb55359b6a3d00cd20b1fd1` |
| Before ruleset | `projects/hamrosathi1/rulesets/e8b7524d-3fc8-4aa4-b19f-e89c3bedfac1` |
| Active ruleset | `projects/hamrosathi1/rulesets/03145504-14d0-4f91-a9f6-8190c7803a98` |
| Changed scope | Analytics reads now require a non-anonymous token with `super_admin`, `platform_admin`, or `analytics_admin`; all analytics writes remain denied. Only the `isResourceAdmin` helper and analytics branch changed. |
| Deployment | Firestore Rules API ruleset create/compile, exact pre-activation source/release recheck, one release PATCH, exact active-source readback |

The exact pre-release source is preserved at [the rollback package](rollbacks/staff-rbac-analytics-2026-10-14T13-32-35-957Z/). The deployment script refuses source drift and does not automatically retry an uncertain activation. Billing was confirmed enabled before the operation. No Functions, Storage rules, indexes, Hosting, Auth claims, or customer documents were changed by the rules release.

## Live acceptance

Dedicated disposable accounts authenticated through the real client SDK. `super_admin`, `platform_admin`, and `analytics_admin` could read one generated analytics fixture. `finance_admin`, `read_only_admin`, and an ordinary customer were denied. Each allowed role was denied analytics update and create. Final source readback still matched the candidate.

All seven acceptance checks passed. Cleanup verified deletion of all six generated Auth accounts and the one generated analytics document. The sanitized result is [here](rollbacks/staff-rbac-acceptance-2026-10-14T13-32-57-301Z/result.json); private account identifiers are excluded from Git.

## Limits

This qualifies only analytics read containment. It does not grant broader staff access to audit logs, reports, SOS or suspicious-activity resources; authorize role migration; or complete Phase 0. App Check, backup/restore, companion authority, Event policy, installed-device acceptance and other Phase 0 gates remain open.
