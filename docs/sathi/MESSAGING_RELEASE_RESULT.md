# Messaging containment release result — 2026-09-12

## Verdict

**Scoped release passed.** The reviewed messaging/favorites Firestore rules candidate is active in `hamrosathi1`, and dedicated-account production acceptance passed. This result qualifies only that release unit; it is not a blanket production certification.

## Immutable inputs and deployment

| Item | Verified value |
| --- | --- |
| Application commit containing the resolver | `5f1cb723bbaf5983fe476e930e8ca822d7639f9e` |
| Pushed branch tip | `5a01adc` on `origin/main` |
| Pre-deploy active rules SHA-256 | `5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013` |
| Candidate and active rules SHA-256 | `28709c31cf043c9394dfea4f81be58aea217d455537c8b072bff3411f9040497` |
| Active Firestore ruleset | `projects/hamrosathi1/rulesets/f4e99332-71c9-46ef-93fe-39843148d35f` |
| Release update time | `2026-09-12T14:27:06.774400Z` |

The approved deploy script first required the exact frozen baseline, created one ruleset from `ops/containment/candidate.firestore.rules`, updated only `cloud.firestore`, and immediately reread the active source. The active source exactly equals the candidate. The pre-deployment rollback is retained in `rollbacks/messaging-release-2026-09-12T14-26-42-691Z`; the deployment readback is retained in `rollbacks/messaging-release-2026-09-12T14-27-10-241Z`.

The earlier Firebase CLI command that returned without a release record remains a documented no-op. It did not alter production rules and was not treated as success. The final deployment used the reviewed, candidate-only Rules API path after explicit approval and baseline recheck.

## Scope and untouched systems

The semantic candidate is restricted to nested favorites and conversations/messages membership and mutation constraints needed by the reviewed messaging release. It did not deploy or alter Storage rules, indexes, Cloud Functions, Hosting configuration, Auth configuration, Firestore documents, migrations, bookings, payments, staff controls, or any root Firebase configuration.

## Production acceptance

Dedicated temporary normal accounts A, B and outsider C ran against production Firebase with a generated marker on every test record.

| Case | Result |
| --- | --- |
| A has no parent before first send | Passed |
| A creates one canonical A/B parent and first message | Passed |
| B inbox uses the bounded membership/document-ID query | Passed |
| B reads the shared history | Passed |
| B unread reset changes only `unreadCount` and `updatedAt` | Passed |
| Fresh B authentication still reads the same parent and history | Passed |
| C direct parent read and member query | Denied |
| C message write into A/B conversation | Denied |
| Generated Firestore fixtures after cleanup | `0` users, companions, conversations and messages |

The expected `permission-denied` result from the deliberate outsider write was observed and treated as a passing negative case. Test-account deletion returned no cleanup errors; the independent Firestore marker scan confirmed no generated data remained.

## Application delivery evidence

The reviewed application commit was pushed through the existing GitHub integration. A direct public request to `https://hamrosathi.vercel.app/` returned HTTP 200, and its currently served JavaScript bundle contains the release resolver's fail-closed message. This verifies that the public asset includes the resolver; it does not prove an already-installed PWA has refreshed its cache.

## Verification performed

- Exact post-deploy Rules API readback and candidate SHA-256 comparison: passed.
- Focused messaging test suite: 78 tests passed.
- Previous immutable local release evidence retained: 301 main assertions, 49 isolated Firestore emulator checks, TypeScript check and production Vite/PWA build passed. The known bundle-size warning remains.
- Dedicated-account production SDK acceptance and independent fixture-cleanup verification: passed.

## Remaining limits

- No interactive multi-browser-session UI acceptance was run.
- No live probe of an existing opaque legacy customer conversation was performed; the release code's legacy-resolution behavior remains supported by local tests and metadata review, not a real-customer production probe.
- Installed-PWA cache/update behavior and physical-device QA remain open.
- This release does not close the separately documented Phase 0 staff, booking/payment, Event-index, App Check, backup/PITR or broader security risks.

Rollback is not automatic: restoring the saved baseline would reopen the reviewed messaging/favorites authorization weaknesses. Any rollback requires a fresh active-source read and explicit owner decision.
