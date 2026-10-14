import { describe, expect, it } from 'vitest';
import {
  assertSameLedgerOperationIntent,
  coinsToNprPaisa,
  createLedgerReversalJournal,
  MIN_CASH_REDEMPTION_COINS,
  nprPaisaToCoins,
  NPR_PAISA_PER_COIN,
  planLedgerLotAllocation,
  resolveLedgerOperationReplay,
  validateLedgerJournal,
  validateLedgerOperation,
  validateLedgerOperationRecord,
  validateLedgerReversal,
  type LedgerAsset,
  type LedgerJournal,
  type LedgerOperationRecord,
} from '../../shared/contracts/money';

const hash = 'a'.repeat(64);

describe('whole-Coin denomination', () => {
  it('converts Coins and NPR paisa exactly using integer arithmetic', () => {
    expect(NPR_PAISA_PER_COIN).toBe(10);
    expect(MIN_CASH_REDEMPTION_COINS).toBe(5000);
    expect(coinsToNprPaisa(10)).toBe(100);
    expect(coinsToNprPaisa(MIN_CASH_REDEMPTION_COINS)).toBe(50000);
    expect(nprPaisaToCoins(50000)).toBe(5000);
  });

  it('rejects fractional, negative, unsafe, and inexact conversions', () => {
    for (const amount of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => coinsToNprPaisa(amount)).toThrow();
      expect(() => nprPaisaToCoins(amount)).toThrow();
    }
    expect(() => coinsToNprPaisa(Number.MAX_SAFE_INTEGER)).toThrow('safe integer range');
    expect(() => nprPaisaToCoins(101)).toThrow('exact whole-Coin');
  });
});

const journal = (asset: LedgerAsset = 'COIN'): LedgerJournal => ({
  id: `request_1_${asset}`,
  operationId: 'request_1',
  asset,
  entries: [{ accountKey: 'funding:source', signedAmount: -100 }, { accountKey: 'user:available', signedAmount: 100 }],
  sourceType: 'VERIFIED_GRANT',
  sourceId: 'grant-1',
  sourceVersion: 1,
  policyVersion: 1,
  idempotencyKeyHash: hash,
  intentHash: hash,
});

describe('pure ledger journal contract', () => {
  it('accepts balanced whole Coin and NPR-paisa journals without posting anything', () => {
    expect(() => validateLedgerJournal(journal())).not.toThrow();
    expect(() => validateLedgerJournal(journal('NPR_PAISA'))).not.toThrow();
  });

  it.each([
    [0.5, 'signed amount'],
    [Number.MAX_SAFE_INTEGER + 1, 'signed amount'],
    [0, 'signed amount'],
  ])('rejects invalid signed amount %s', (amount, message) => {
    const candidate = journal();
    candidate.entries = [{ accountKey: 'funding:source', signedAmount: -100 }, { accountKey: 'user:available', signedAmount: amount }];
    expect(() => validateLedgerJournal(candidate)).toThrow(message);
  });

  it('rejects unbalanced entries even when every amount is an integer', () => {
    const candidate = journal();
    candidate.entries = [{ accountKey: 'funding:source', signedAmount: -100 }, { accountKey: 'user:available', signedAmount: 99 }];
    expect(() => validateLedgerJournal(candidate)).toThrow('unbalanced postings');
  });

  it('rejects duplicate accounts and an asset-mismatched reversal', () => {
    const duplicate = journal();
    duplicate.entries = [{ accountKey: 'same', signedAmount: -100 }, { accountKey: 'same', signedAmount: 100 }];
    expect(() => validateLedgerJournal(duplicate)).toThrow('duplicate account key');
    expect(() => validateLedgerJournal({ ...journal(), reversalOf: 'previous_NPR_PAISA' })).toThrow('reversal reference');
  });

  it('creates and validates an exact inverse journal without changing the original', () => {
    const original = journal();
    const reversal = createLedgerReversalJournal(original, {
      operationId: 'reverse-1',
      policyVersion: 2,
      idempotencyKeyHash: 'b'.repeat(64),
      intentHash: 'c'.repeat(64),
    });
    expect(reversal).toMatchObject({
      id: 'reverse-1_COIN',
      sourceType: 'JOURNAL_REVERSAL',
      sourceId: original.id,
      sourceVersion: original.sourceVersion,
      reversalOf: original.id,
      entries: [
        { accountKey: 'funding:source', signedAmount: 100 },
        { accountKey: 'user:available', signedAmount: -100 },
      ],
    });
    expect(original.entries).toEqual([
      { accountKey: 'funding:source', signedAmount: -100 },
      { accountKey: 'user:available', signedAmount: 100 },
    ]);
    expect(() => validateLedgerReversal(original, reversal)).not.toThrow();
  });

  it('rejects a balanced but non-inverse journal and prevents reversal chains', () => {
    const original = journal();
    const reversal = createLedgerReversalJournal(original, {
      operationId: 'reverse-2',
      policyVersion: 1,
      idempotencyKeyHash: hash,
      intentHash: hash,
    });
    expect(() => validateLedgerReversal(original, {
      ...reversal,
      entries: [
        { accountKey: 'funding:source', signedAmount: 99 },
        { accountKey: 'user:available', signedAmount: -99 },
      ],
    })).toThrow('reversal postings');
    expect(() => createLedgerReversalJournal(reversal, {
      operationId: 'reverse-3',
      policyVersion: 1,
      idempotencyKeyHash: hash,
      intentHash: hash,
    })).toThrow('cannot reverse a reversal journal');
  });

  it('requires an exact asset-specific immutable ID', () => {
    expect(() => validateLedgerJournal({ ...journal(), id: 'request_1_NPR_PAISA' })).toThrow('journal ID');
  });

  it('requires both separate balanced assets for a paired operation', () => {
    expect(() => validateLedgerOperation([journal(), journal('NPR_PAISA')], ['COIN', 'NPR_PAISA'])).not.toThrow();
    expect(() => validateLedgerOperation([journal()], ['COIN', 'NPR_PAISA'])).toThrow('journal count');
    expect(() => validateLedgerOperation([journal(), journal()], ['COIN', 'NPR_PAISA'])).toThrow('asset set');
  });

  it('rejects a paired operation with a different intent or source', () => {
    expect(() => validateLedgerOperation([journal(), { ...journal('NPR_PAISA'), intentHash: 'b'.repeat(64) }], ['COIN', 'NPR_PAISA']))
      .toThrow('operation binding');
    expect(() => validateLedgerOperation([journal(), { ...journal('NPR_PAISA'), sourceId: 'other-source' }], ['COIN', 'NPR_PAISA']))
      .toThrow('operation binding');
  });
});

describe('pure ledger lot allocation planner', () => {
  it('allocates oldest eligible lots first with a stable ID tie-break', () => {
    expect(planLedgerLotAllocation([
      { id: 'later', availableAmount: 8, eligible: true, createdAtMillis: 20 },
      { id: 'z-old', availableAmount: 4, eligible: true, createdAtMillis: 10 },
      { id: 'a-old', availableAmount: 3, eligible: true, createdAtMillis: 10 },
      { id: 'ineligible', availableAmount: 100, eligible: false, createdAtMillis: 1 },
    ], 10)).toEqual({ status: 'READY', allocations: [
      { lotId: 'a-old', amount: 3 }, { lotId: 'z-old', amount: 4 }, { lotId: 'later', amount: 3 },
    ] });
  });

  it('returns no partial allocation when eligible value is insufficient', () => {
    expect(planLedgerLotAllocation([
      { id: 'one', availableAmount: 4, eligible: true, createdAtMillis: 1 },
      { id: 'two', availableAmount: 90, eligible: false, createdAtMillis: 2 },
    ], 5)).toEqual({ status: 'INSUFFICIENT', allocations: [] });
  });

  it('requests consolidation when the complete plan would exceed the bounded lot count', () => {
    const lots = Array.from({ length: 21 }, (_, index) => ({
      id: `lot-${String(index).padStart(2, '0')}`,
      availableAmount: 1,
      eligible: true,
      createdAtMillis: index,
    }));
    expect(planLedgerLotAllocation(lots, 21)).toEqual({ status: 'CONSOLIDATION_REQUIRED', allocations: [] });
    expect(planLedgerLotAllocation(lots, 20)).toMatchObject({ status: 'READY' });
  });

  it('rejects duplicate lot IDs and invalid amounts', () => {
    const lot = { id: 'same', availableAmount: 5, eligible: true, createdAtMillis: 1 };
    expect(() => planLedgerLotAllocation([lot, lot], 1)).toThrow('duplicate lot ID');
    expect(() => planLedgerLotAllocation([lot], 0)).toThrow('lot allocation amount');
  });
});

describe('pure ledger operation replay contract', () => {
  const operation = (overrides: Partial<LedgerOperationRecord> = {}): LedgerOperationRecord => ({
    id: 'actor_request-1',
    operationId: 'op-1',
    actorUid: 'actor',
    requestId: 'request-1',
    operationType: 'COIN_SPEND',
    expectedAssets: ['COIN'],
    intentHash: hash,
    status: 'IN_PROGRESS',
    resultJournalIds: [],
    version: 1,
    createdAtMillis: 100,
    updatedAtMillis: 100,
    ...overrides,
  });

  it('accepts one complete committed result per expected asset', () => {
    expect(() => validateLedgerOperationRecord(operation({
      expectedAssets: ['NPR_PAISA', 'COIN'],
      status: 'COMMITTED',
      resultJournalIds: ['op-1_COIN', 'op-1_NPR_PAISA'],
    }))).not.toThrow();
  });

  it('allows exact same-intent replay and rejects request-key reuse for a different intent', () => {
    expect(() => assertSameLedgerOperationIntent(operation(), operation())).not.toThrow();
    expect(() => assertSameLedgerOperationIntent(operation(), operation({ intentHash: 'b'.repeat(64) })))
      .toThrow('idempotency intent conflict');
    expect(() => assertSameLedgerOperationIntent(operation(), operation({ operationType: 'COIN_EARN' })))
      .toThrow('idempotency intent conflict');
    const first = operation({ id: 'a_b_c', actorUid: 'a_b', requestId: 'c' });
    const ambiguous = operation({ id: 'a_b_c', actorUid: 'a', requestId: 'b_c' });
    expect(() => assertSameLedgerOperationIntent(first, ambiguous)).toThrow('idempotency intent conflict');
  });

  it('rejects a committed operation missing a journal and a result from an unexpected asset', () => {
    expect(() => validateLedgerOperationRecord(operation({ status: 'COMMITTED' })))
      .toThrow('committed operation results');
    expect(() => validateLedgerOperationRecord(operation({ resultJournalIds: ['op-1_NPR_PAISA'] })))
      .toThrow('operation result journal');
  });

  it.each([
    ['IN_PROGRESS', { action: 'WAIT' }],
    ['COMMITTED', { action: 'RETURN_COMMITTED', resultJournalIds: ['op-1_COIN'] }],
    ['REJECTED', { action: 'RETURN_REJECTION' }],
    ['UNKNOWN', { action: 'RECONCILE_UNKNOWN' }],
  ] as const)('classifies same-intent %s replay without retrying uncertain work', (status, decision) => {
    const stored = operation({ status, resultJournalIds: status === 'COMMITTED' ? ['op-1_COIN'] : [] });
    expect(resolveLedgerOperationReplay(stored, operation())).toEqual(decision);
  });

  it('rejects replay classification when the stable key has a different intent', () => {
    expect(() => resolveLedgerOperationReplay(operation(), operation({ intentHash: 'b'.repeat(64) })))
      .toThrow('idempotency intent conflict');
  });
});
