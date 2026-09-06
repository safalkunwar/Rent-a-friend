# SATHI — Phase 2 stabilization handoff

Date: 2026-09-06. Local implementation and verification only. No production write, deployment, migration, billing change, or Functions activation occurred in this resumed session. The intervening media foundation is preserved.

## Decision

The scoped P0 implementation checkpoints are completed locally. **The entire application is not certified production-ready, and the all-feature regression gate is not green.** Three explicitly deferred Home acceptance tests fail. They are not skipped or counted as passing. Home composition/reveal implementation is unchanged because the owner explicitly prohibited starting Home improvements during this phase.

Stop here. Obtain approval for Phase 3 Home completion or a separately authorized rollout/inventory. Passing compilation is not evidence of deployed security, provider verification, device correctness, or commercial scalability.

## Final gate

| Area | Verified result | Boundary |
| --- | --- | --- |
| Root TypeScript | Audited 17 diagnostics → 0 | Eight tooling imports/references and nine dashboard references were repaired in P0-A; fresh final check is clean. No configuration weakening or suppressions. |
| Admin TypeScript | 0 diagnostics | Earlier P0-E checkpoint separately recorded 10 → 0; fresh final check clean. |
| Main tests | 191/191 passing, 19 files | Resume baseline was 168/171 with three obsolete payment expectations after a paused partial change. Twenty tests added during resumed work; payment expectations now assert explicit non-verification. |
| Admin tests | 40/40 passing, 6 files | Isolated Firebase mocks; existing event-picker coverage retained. |
| Combined emulators | 45/45 passing | 24 Firestore security, 6 actual booking transaction, 10 media flow, 5 Storage rule cases. Loopback only. |
| Deferred Home acceptance | **0/3 passing; 3 failures** | Stale retained content, cross-collection ID collision, and max companion run 8 versus acceptance bound 3. Separate explicit Node acceptance suite, no expected-failure markers. |
| Booking policy parity | Passed | JSON transition policy matches checked-in Firestore transition block. |
| Main build/PWA | Passed | Large JS chunk (~1.93 MB; ~501 KB gzip), PWA precache ~5.84 MiB. Existing performance warnings remain. |
| Admin build | Passed | Large JS chunk (~1.83 MB; ~477 KB gzip) and mixed static/dynamic import warnings remain. |

Totals: **276 passing automated tests plus 3 failing deferred Home tests**. This resume added 20 main tests, 12 security cases, and 3 red Home acceptance tests. Historical tests are retained; neither TypeScript nor tests were weakened to hide failures. Not every audit risk has a complete integration test: responsive reveal behavior, real provider flows, legacy migrations, native devices, and production load remain explicit verification gaps.

## Checkpoints and contracts

- **P0-A:** Source/tooling diagnostics classified and repaired. Detailed original error mapping: [PHASE2_CHECKPOINTS.md](PHASE2_CHECKPOINTS.md).
- **P0-B:** Auth UID establishes resource ownership; profile/bootstrap and protected mutations reject inappropriate identity or privileged fields. UI preflight is not the security boundary. This resume additionally fixed the delayed profile-update/account-switch race in the actual AppProvider.
- **P0-C:** Local rules enforce owner/capability boundaries, immutable identities, paired interaction deltas, private KYC, and denied browser payment writes. [Permission matrix](P0_PERMISSION_MATRIX.md). Tests include A versus B private resources, self-promotion/self-KYC, outsider conversation access, anonymous writes, all 11 explicit admin roles with conflicting legacy admin=true, role assignment, and protected payments. These are selected boundary cases, not an exhaustive every-role/every-resource certification.
- **P0-D:** Canonical owner-aware upload paths, MIME/size/signature checks, immutable metadata, private KYC references. The newer [media foundation](MEDIA_UPLOAD_FOUNDATION.md) supersedes the older upload opt-in flag and Story/public-media policy. Fresh emulator bytes/metadata tests pass; no live bucket assertion.
- **P0-E:** One policy for pending → confirmed → active → completed, with actor-specific cancellation. Decline maps to cancelled. Atomic booking/day-lock writes; exclusive companion/date, trusted stored rate recalculation, stable request IDs, no offline pretend reservation. [State machine](BOOKING_STATE_MACHINE.md). The concurrent A/B transaction test accepts exactly one reservation; cancellation permits rebooking; invalid/unpaired/forged transitions are denied. No automatic expiry or 10,000-user claim.
- **P0-F:** Online payment initiation unavailable. No browser merchant secret references, provider calls, verified-payment writes, or success trusted from URL parameters. Booking requests persist as pending/not_started. Provider return pages say verification required and do not determine whether money moved. No escrow, ledger, settlement or refund pipeline implemented.
- **P0-G:** Unsupported background-check, universal verification, escrow, staffed support, live tracking, contact-delivery and placeholder emergency-contact claims corrected. Application approval remains a recorded-review indicator, not a safety guarantee. Alert UI acknowledges only a saved single-location record. No emergency dispatch/response promised; fake local cancellation removed. Non-enforced privacy controls are disabled and labelled. Bundled terms/privacy text corrects implementation claims only; it is not legal sign-off.
- **P0-H:** Dashboard source references repaired, profile edits await persistence, account-scoped state remounts, Auth email remains read-only here. Own requests no longer depend on discovery page one. Joined event details use an ID query for at most five events, not registration date or missing discovery data. Strict reads expose unavailable data. Unverified booking values are not earnings; unmeasured views, fake partner metrics/offers and a hardcoded wallet balance are replaced by unavailable states.
- **P0-I:** Full isolated suites, expanded role/query denials, actual booking/media emulators, policy parity, type checks and builds run. Deferred Home failures are captured and reported, not fixed outside scope.

## Resumed issue evidence, repair, dependencies and regression checks

| Issue / source | Root cause and implemented repair | Dependencies / regression risk | How verified; remaining verification |
| --- | --- | --- | --- |
| Payment request falsely implies Pay; `components/modals/BookingFlowModal.tsx`, `services/payments.ts`, payment return pages | Provider skeleton treated as checkout; submit explicit unpaid request, no provider initiation, acknowledgement only after persistence. | P0-E transaction; future approved verification backend. Risk: users misread acceptance as settlement. | Two UI regressions failed before correction; 5 booking/return tests now pass; service tests assert unavailable/unverified. No provider sandbox or live charge test. |
| Active safety claims; `components/SafetyWidget.tsx`, `services/sos.ts`, `ClientApp.tsx`, `public/HELP.md` | One location/write misrepresented as monitoring/contact delivery; record-only acknowledgement, 15-second location timeout, no fake contacts/cancellation, no 5-second auto-dismiss. | Location permission, Auth, actual write; real response needs operational staffing and backend. Risk: location denial/slow network, repeated alerts after reopening. | Three UI regressions failed before fix; three service tests cover optional fields, denied persistence and sign-in. Physical devices and staff response not tested. |
| Unsupported privacy/verification promises; Settings/Auth/CompanionCard/ApplicationCard and bundled documents | Preference flags and isVerified label implied stronger controls than implemented; disable non-enforced toggles, narrow badge/copy and remove placeholder helpline. | Rules/legacy provenance review; legal/operations approval. Risk: old builds/cached text and old seeded verification fields remain. | Source scan of main/admin/public copy; service/rule tests are not proof of real-world identity checks. |
| Missing own requests; `DashboardTab.tsx`, `services/companionDashboard.ts` | Own companion searched in only first public discovery page; use canonical signed-in UID. | Legacy IDs must be inventoried, exact index must be deployed separately. Risk: legacy noncanonical records remain unavailable rather than bypassed. | Render test with empty discovery page now fetches C requests; service rejects another UID. |
| Local-only profile edit and A→B stale merge; DashboardTab/AppContext | Save mutated context before any write; completion blindly merged into whichever account was current. Now await existing repository, post-write UID check, owner-scoped merge. | Existing profile field allowlist; Auth email not editable here. Risk: failure/account change after committed old-account write may require reload. | Real AppProvider test reproduced B.name becoming A's edit, then passed after repair; UI failure preserves edit form. |
| Joined-event missing references; DashboardTab/eventParticipants | Partial public discovery used as event lookup and joinedAt displayed as event date. Use owner registrations plus bounded actual event-ID lookup; explicit missing/failure state. | Added userId/status/joinedAt index; active joining still denied until P1 capacity contract. | Customer failure/empty-state render tests; no live joined-event read. Dashboard only, not a joining rewrite. |
| Misleading metrics; dashboard/PartnerDashboard/ClientApp wallet | Completed quotes treated as earnings; hardcoded balance/partner data looked real. Relabel unverified bounded booking value and report unavailable metrics. | Future authoritative ledger/analytics; no fabricated fallback data. Risk: loaded sample totals are incomplete. | Selector/service/render tests cover value and unavailable state; code scan found/removes fixed wallet/partner amounts. |
| Missing query indexes; `firestore.indexes.json` | Exact emitted dashboard order/filter combinations lacked definitions. Added bookings(companionId,createdAt desc), event_participants(userId,status,joinedAt desc). | Deployment and production index readiness require separate approval. | Definitions inspected; emulator does not certify composite-index readiness. |

## Firebase/Spark boundary

**SPARK-COMPATIBLE NOW:** frontend truthfulness, canonical UID checks, Firestore rules/transactions and bounded queries, local emulator tests, type/build fixes. All remain subject to quotas and actual deployed configuration.

**REQUIRES BLAZE/BACKEND LATER:** Cloud Storage access under Firebase's current billing policy; trusted merchant secrets/provider verification/webhooks/reconciliation/refunds; Functions activation; scheduled cleanup/expiry and abuse controls; background push/dispatch. A separately approved backend may host payment logic; this phase introduces none. Emergency monitoring also requires staffing and operational procedures—billing alone does not supply it. See [SPARK_LIMITATIONS.md](SPARK_LIMITATIONS.md), including the official Firebase billing reference.

No payment secrets were read from private environment files. Source inspection found no VITE Khalti/eSewa secret references in active app code; this does not prove historical bundles never contained credentials. Owner-authorized exposure review/rotation remains a release gate if credentials were ever configured.

## Remaining P1 work and safest next order

1. **Release/inventory gate:** read-only authorized inventory of legacy companion IDs, booking locks, claims/admin assignments and media classification. Validate deployment version/rules/index readiness and billing/CORS. Do not deploy this tree as a media-only release or silently migrate production data.
2. **Owner-approved Phase 3 Home:** fix the three red fixtures, then instrument responsive/PWA lifecycle, hidden-sentinel reads, same-ID edits/moderation removals and typed entity identity. Keep position stable while refreshing payload. No Home implementation was started here.
3. **KYC/profile consistency:** reconcile legacy application paths, approval/claims transitions, public identity projection, activation recovery and provenance before treating old badges as trustworthy.
4. **Complete real-user workflows:** event capacity/registration, social action parity and saved content, customer dashboard/favorites pagination, messaging peer identity/unread/history, notifications/support/report delivery. Do not create fake success for unavailable producers.
5. **Backend and commercial qualification:** explicitly approved provider integration and ledger/refund policy, idempotent side effects, abandoned-lock/orphan cleanup, abuse protection, device/reconnect/multi-tab testing and measured load/cost limits. Review paused Functions before deployment.

## Reproduce locally (no production writes)

```powershell
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/typescript/bin/tsc --noEmit --pretty false -p admin/tsconfig.json
node node_modules/vitest/vitest.mjs run --config vitest.config.ts
node node_modules/vitest/vitest.mjs run --config admin/vitest.config.ts
node scripts/check-booking-policy.mjs
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js build admin --config admin/vite.config.ts
# Deliberately red until separately approved Home implementation:
node --import tsx --test tests/home-deferred.test.ts
# Requires local Java and Node on PATH; guards require exact loopback hosts:
node node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --config firebase.emulators.json --project hamrosathi1 --only firestore,storage 'node --import tsx --test --test-concurrency=1 tests/security-rules.test.mjs tests/storage-rules.test.mjs tests/booking-concurrency.test.ts tests/media-flows.test.ts'
```

The Firebase CLI took several minutes before starting the emulators; once started, the combined test script passed and the emulators shut down. Permission-denied log lines in negative rule cases are expected assertions, not failed tests. No physical-device visual QA, real customer/provider operation, production rules inventory, exhaustive role matrix, or production load test was performed.
