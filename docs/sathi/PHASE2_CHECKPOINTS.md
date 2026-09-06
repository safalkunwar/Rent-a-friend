# Phase 2 checkpoint log

Scope: P0-A through P0-I, in that order. No Home/feed implementation, layout/palette redesign, new production project, deployment or data migration. Existing working-tree edits are preserved.

## P0-A — diagnostic classification

| Original diagnostic | Count | Classification | Repair |
| --- | ---: | --- | --- |
| firebase-migration/config.ts, inventory-default.ts, inventory.ts; grant-admin-role.ts: FirebaseApp import | 4 | Incorrect SDK type (existing tooling) | Import exported Admin SDK App with local FirebaseApp alias; no script executed. |
| firebase-migration/verify.ts: docId, collection, missingRef | 3 | Stale references / genuine diagnostic-output defect | Use actual orphan.id/reason and enclosing report.collection. |
| grant-admin-role.ts: prompt Promise<string> versus string | 1 | Incorrect return type | Declare asynchronous return, preserve awaited callers. |
| DashboardTab.tsx: useMemo | 1 | Real application defect / missing hook import | Restore actual React hook import. |
| DashboardTab.tsx: myBookings (5), totalSpent (1), favoriteCompanions (2) | 8 | Stale removed derived references / real application defects | UID-scoped selector from actual context bookings/favorites; label value as unverified loaded booking value, not settled spending. |

No errors were classified as generated/platform code. No ts-ignore, compiler weakening, placeholder records or new any casts were introduced. Broad test discovery/mock-path repairs are a prerequisite to safely testing this checkpoint, not an early feature refactor. The dashboard selector has regression cases for cross-user records, cancelled value and signed-out state; the render-level source-reference check is revisited at P0-H.

P0-A verification: root TypeScript 17 -> 0 diagnostics; existing main tests 126/126 and new selector regressions 3/3. All changes here are SPARK-COMPATIBLE NOW; no cloud infrastructure is added.

## Final local handoff — 2026-09-06

P0-B through P0-H implementation/checkpoint details are recorded in CHANGELOG.md; the intervening media foundation is preserved. Final evidence and issue-by-issue boundaries: [P0_STABILIZATION_REPORT.md](P0_STABILIZATION_REPORT.md). Fresh results: main 191/191, admin 40/40, combined Firebase emulators 45/45; both apps type-check/build. The three audited Home defects now have explicit red acceptance tests in tests/home-deferred.test.ts: **3 failures, no skips**. These are deferred by the no-Home instruction, not silently certified as fixed. The entire application is not production-ready; stop and await next-phase/rollout approval.
