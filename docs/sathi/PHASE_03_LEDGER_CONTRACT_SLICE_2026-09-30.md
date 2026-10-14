# Phase 3 pure ledger contract slice — local only, 2026-09-30

The target [Phase 3 roadmap](30_IMPLEMENTATION_ROADMAP.md) requires balanced immutable journals in whole Coins and integer NPR paisa. The project had a design but no reusable pure input contract. `shared/contracts/money.ts` now validates a journal, paired-asset operation, durable-operation replay envelope and lot-allocation plan, and builds/validates exact inverse journals **without Firebase initialization, writes, balance updates or provider calls**. This is a preparatory slice, not a ledger or Phase 3 completion.

## Behavior

- A journal ID must be `${operationId}_${asset}` for `COIN` or `NPR_PAISA`; its operation/source/policy versions and idempotency/intent hashes must be present and well formed.
- Two to 50 unique account postings must have nonzero safe-integer signed amounts. The validator sums with `BigInt` so an overflowing arithmetic subtotal cannot make an unbalanced journal appear balanced.
- A reversal references the original journal and exactly inverts its account postings. `createLedgerReversalJournal()` validates the original and creates that inverse with a fresh operation identity; reversal chains are rejected. The pure helper does **not** prove the original exists in durable storage, authorize the reversal, prevent duplicate reversals under concurrency, or post it.
- A paired operation must contain exactly the caller-declared assets, each balanced independently, with identical source, versions, idempotency and intent. It cannot net Coins against NPR paisa.
- `validateLedgerOperationRecord()` checks a bounded operation record's actor/request identity, expected asset set, version/timestamps, result journal references and status shape. `assertSameLedgerOperationIntent()` rejects reuse of the same actor/request key with a different operation type, asset set or intent hash. `resolveLedgerOperationReplay()` classifies a same-intent retry as return committed result, return prior rejection, wait on in-progress work, or route UNKNOWN to reconciliation; UNKNOWN never authorizes a retry. These helpers do not authenticate the actor, persist idempotency, or decide durable state transitions.
- `planLedgerLotAllocation()` produces a deterministic oldest-first plan from caller-supplied lot facts, with an ID tie-break for equal timestamps. It returns `INSUFFICIENT` when eligible value is short and `CONSOLIDATION_REQUIRED` when a complete request exceeds the synchronous lot cap (default 20, maximum 20). Failure results contain no partial allocations.

The input type is an architecture contract, not a writable Firestore schema or approval for the example account keys in tests. The allocator is a planner only: callers must prove lot ownership, funding, spend eligibility, and freshness from an authoritative backend transaction, then atomically apply the plan with journals and projections. The chart of accounts, eligibility policy, idempotent operation store and immutable backend writer remain to be defined.

## Delivery evidence and limits

| Required check | Result |
| --- | --- |
| Source change | Pure `shared/contracts/money.ts` journal, exact inverse-reversal, operation replay-envelope/retry-decision and deterministic lot-allocation validation/planning; focused contract tests authored |
| Schema/rules/index/backend diff | None; no collection, rule, index, Function or payment adapter changed |
| Migration dry run | Not applicable: there are no ledger records to migrate. No demo or legacy balance was read or minted |
| Regression risk | Contract is not imported by runtime app/Functions; existing behavior unchanged. A future writer must not treat caller-supplied lot facts as authority or assume the planner establishes funding |
| Rollback | Remove this unused pure contract/test before adoption; no live state to restore |
| Validation follow-up | `npx vitest run src/__tests__/money-contract.test.ts --config vitest.config.ts` passed 25/25 and `npx tsc --noEmit -p tsconfig.json` exited 0 on 2026-10-13. No emulator ledger writer or live acceptance was run; all commercial flags remain off |

Before an operational ledger, Finance must approve the chart of accounts and funded-source rules. The backend must atomically bind immutable journals, operation records, lots and derived balances, reject direct client writes, and prove duplicate/replay, concurrency, reversal, UNKNOWN and reconciliation behavior in an isolated emulator. Provider sandbox, Nepal legal/tax and owner release decisions remain later gates. See [wallet architecture](24_WALLET_LEDGER_ARCHITECTURE.md) for the full target.
