/** Pure journal contract. Validation does not authorize or post money movement. */
export type LedgerAsset = 'COIN' | 'NPR_PAISA';

/** Product reference denomination: 1 whole Coin is 10 NPR paisa (10 Coins = NPR 1). */
export const NPR_PAISA_PER_COIN = 10;
export const MIN_CASH_REDEMPTION_COINS = 5000;

/** Converts whole Coins to integer NPR paisa without floating-point rounding. */
export function coinsToNprPaisa(coins: number): number {
  if (!Number.isSafeInteger(coins) || coins < 0) {
    throw new Error('Coin amount must be a non-negative safe integer');
  }
  const paisa = BigInt(coins) * BigInt(NPR_PAISA_PER_COIN);
  if (paisa > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Converted NPR paisa exceeds the safe integer range');
  }
  return Number(paisa);
}

/** Converts NPR paisa to whole Coins only when the amount is exactly representable. */
export function nprPaisaToCoins(paisa: number): number {
  if (!Number.isSafeInteger(paisa) || paisa < 0) {
    throw new Error('NPR paisa amount must be a non-negative safe integer');
  }
  if (paisa % NPR_PAISA_PER_COIN !== 0) {
    throw new Error('NPR paisa amount is not an exact whole-Coin value');
  }
  return paisa / NPR_PAISA_PER_COIN;
}

export interface LedgerPosting {
  accountKey: string;
  signedAmount: number;
}

export interface LedgerJournal {
  id: string;
  operationId: string;
  asset: LedgerAsset;
  entries: readonly LedgerPosting[];
  sourceType: string;
  sourceId: string;
  sourceVersion: number;
  policyVersion: number;
  idempotencyKeyHash: string;
  intentHash: string;
  reversalOf?: string;
}

export type LedgerOperationStatus = 'IN_PROGRESS' | 'COMMITTED' | 'UNKNOWN' | 'REJECTED';

/** Durable replay binding; a backend must own persistence and every status transition. */
export interface LedgerOperationRecord {
  id: string;
  operationId: string;
  actorUid: string;
  requestId: string;
  operationType: string;
  expectedAssets: readonly LedgerAsset[];
  intentHash: string;
  status: LedgerOperationStatus;
  resultJournalIds: readonly string[];
  version: number;
  createdAtMillis: number;
  updatedAtMillis: number;
}

export type LedgerOperationReplayDecision =
  | { action: 'RETURN_COMMITTED'; resultJournalIds: readonly string[] }
  | { action: 'RETURN_REJECTION' }
  | { action: 'WAIT' }
  | { action: 'RECONCILE_UNKNOWN' };

/** Input facts must come from an authoritative ledger read; this planner never verifies funding. */
export interface LedgerLotCandidate {
  id: string;
  availableAmount: number;
  eligible: boolean;
  createdAtMillis: number;
}

export type LedgerLotAllocationPlan =
  | { status: 'READY'; allocations: readonly { lotId: string; amount: number }[] }
  | { status: 'INSUFFICIENT'; allocations: readonly [] }
  | { status: 'CONSOLIDATION_REQUIRED'; allocations: readonly [] };

const OPERATION_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const ID_PART = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const ACCOUNT_KEY = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function assertJournal(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid ledger journal: ${message}`);
}

/** A caller must still prove source funding, permissions, idempotency and account semantics. */
export function validateLedgerJournal(journal: LedgerJournal): void {
  assertJournal(journal && typeof journal === 'object', 'record');
  assertJournal(OPERATION_ID.test(journal.operationId), 'operation ID');
  assertJournal(journal.asset === 'COIN' || journal.asset === 'NPR_PAISA', 'asset');
  assertJournal(journal.id === `${journal.operationId}_${journal.asset}`, 'journal ID');
  assertJournal(typeof journal.sourceType === 'string' && journal.sourceType.trim().length > 0 &&
    journal.sourceType.length <= 80, 'source type');
  assertJournal(typeof journal.sourceId === 'string' && journal.sourceId.trim().length > 0 &&
    journal.sourceId.length <= 160, 'source ID');
  assertJournal(Number.isSafeInteger(journal.sourceVersion) && journal.sourceVersion >= 1, 'source version');
  assertJournal(Number.isSafeInteger(journal.policyVersion) && journal.policyVersion >= 1, 'policy version');
  assertJournal(SHA256.test(journal.idempotencyKeyHash), 'idempotency hash');
  assertJournal(SHA256.test(journal.intentHash), 'intent hash');
  assertJournal(journal.reversalOf === undefined ||
    (typeof journal.reversalOf === 'string' && journal.reversalOf.endsWith(`_${journal.asset}`) &&
      journal.reversalOf !== journal.id),
  'reversal reference');
  assertJournal(Array.isArray(journal.entries) && journal.entries.length >= 2 && journal.entries.length <= 50,
    'posting count');

  let sum = 0n;
  const accountKeys = new Set<string>();
  for (const entry of journal.entries) {
    assertJournal(entry && typeof entry === 'object', 'posting');
    assertJournal(typeof entry.accountKey === 'string' && ACCOUNT_KEY.test(entry.accountKey), 'account key');
    assertJournal(!accountKeys.has(entry.accountKey), 'duplicate account key');
    accountKeys.add(entry.accountKey);
    assertJournal(Number.isSafeInteger(entry.signedAmount) && entry.signedAmount !== 0, 'signed amount');
    sum += BigInt(entry.signedAmount);
  }
  assertJournal(sum === 0n, 'unbalanced postings');
}

export type LedgerReversalIdentity = Pick<
  LedgerJournal,
  'operationId' | 'policyVersion' | 'idempotencyKeyHash' | 'intentHash'
>;

/** Builds an exact inverse journal; persistence must still guarantee one reversal per original. */
export function createLedgerReversalJournal(
  original: LedgerJournal,
  identity: LedgerReversalIdentity
): LedgerJournal {
  validateLedgerJournal(original);
  assertJournal(original.reversalOf === undefined, 'cannot reverse a reversal journal');
  assertJournal(OPERATION_ID.test(identity.operationId) && identity.operationId !== original.operationId,
    'reversal operation ID');
  assertJournal(Number.isSafeInteger(identity.policyVersion) && identity.policyVersion >= 1, 'policy version');
  assertJournal(SHA256.test(identity.idempotencyKeyHash), 'idempotency hash');
  assertJournal(SHA256.test(identity.intentHash), 'intent hash');

  const reversal: LedgerJournal = {
    id: `${identity.operationId}_${original.asset}`,
    operationId: identity.operationId,
    asset: original.asset,
    entries: original.entries.map(({ accountKey, signedAmount }) => ({
      accountKey,
      signedAmount: -signedAmount,
    })),
    sourceType: 'JOURNAL_REVERSAL',
    sourceId: original.id,
    sourceVersion: original.sourceVersion,
    policyVersion: identity.policyVersion,
    idempotencyKeyHash: identity.idempotencyKeyHash,
    intentHash: identity.intentHash,
    reversalOf: original.id,
  };
  validateLedgerReversal(original, reversal);
  return reversal;
}

/** Checks an exact journal inverse, not whether policy permits it or it was posted only once. */
export function validateLedgerReversal(original: LedgerJournal, reversal: LedgerJournal): void {
  validateLedgerJournal(original);
  validateLedgerJournal(reversal);
  assertJournal(original.reversalOf === undefined, 'original must not itself be a reversal');
  assertJournal(reversal.reversalOf === original.id && reversal.asset === original.asset &&
    reversal.sourceType === 'JOURNAL_REVERSAL' && reversal.sourceId === original.id &&
    reversal.sourceVersion === original.sourceVersion, 'reversal binding');
  assertJournal(reversal.entries.length === original.entries.length &&
    original.entries.every((entry) => reversal.entries.some((candidate) =>
      candidate.accountKey === entry.accountKey && candidate.signedAmount === -entry.signedAmount)),
  'reversal postings');
}

/** Paired asset operations must bind both journals to one source and intent. */
export function validateLedgerOperation(
  journals: readonly LedgerJournal[],
  expectedAssets: readonly LedgerAsset[]
): void {
  assertJournal(Array.isArray(expectedAssets) && expectedAssets.length >= 1 && expectedAssets.length <= 2 &&
    new Set(expectedAssets).size === expectedAssets.length, 'expected assets');
  assertJournal(Array.isArray(journals) && journals.length === expectedAssets.length, 'journal count');
  const [first] = journals;
  const seen = new Set<LedgerAsset>();
  for (const journal of journals) {
    validateLedgerJournal(journal);
    assertJournal(expectedAssets.includes(journal.asset) && !seen.has(journal.asset), 'asset set');
    seen.add(journal.asset);
    assertJournal(journal.operationId === first.operationId &&
      journal.sourceType === first.sourceType && journal.sourceId === first.sourceId &&
      journal.sourceVersion === first.sourceVersion && journal.policyVersion === first.policyVersion &&
      journal.idempotencyKeyHash === first.idempotencyKeyHash && journal.intentHash === first.intentHash,
    'operation binding');
  }
}

/** Validates the shape and replay binding only; this does not authorize writes or transitions. */
export function validateLedgerOperationRecord(record: LedgerOperationRecord): void {
  assertJournal(record && typeof record === 'object', 'operation record');
  assertJournal(ID_PART.test(record.actorUid) && ID_PART.test(record.requestId), 'operation actor/request ID');
  assertJournal(record.id === `${record.actorUid}_${record.requestId}` && OPERATION_ID.test(record.operationId),
    'operation identity');
  assertJournal(typeof record.operationType === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(record.operationType),
    'operation type');
  assertJournal(Array.isArray(record.expectedAssets) && record.expectedAssets.length >= 1 &&
    record.expectedAssets.length <= 2 && new Set(record.expectedAssets).size === record.expectedAssets.length &&
    record.expectedAssets.every((asset) => asset === 'COIN' || asset === 'NPR_PAISA'), 'operation asset set');
  assertJournal(SHA256.test(record.intentHash), 'operation intent hash');
  assertJournal(['IN_PROGRESS', 'COMMITTED', 'UNKNOWN', 'REJECTED'].includes(record.status), 'operation status');
  assertJournal(Array.isArray(record.resultJournalIds) && record.resultJournalIds.length <= record.expectedAssets.length &&
    new Set(record.resultJournalIds).size === record.resultJournalIds.length, 'operation results');
  for (const id of record.resultJournalIds) {
    assertJournal(record.expectedAssets.some((asset) => id === `${record.operationId}_${asset}`), 'operation result journal');
  }
  assertJournal(record.status !== 'COMMITTED' || record.resultJournalIds.length === record.expectedAssets.length,
    'committed operation results');
  assertJournal(record.status !== 'REJECTED' || record.resultJournalIds.length === 0, 'rejected operation results');
  assertJournal(Number.isSafeInteger(record.version) && record.version >= 1, 'operation version');
  assertJournal(Number.isSafeInteger(record.createdAtMillis) && record.createdAtMillis >= 0 &&
    Number.isSafeInteger(record.updatedAtMillis) && record.updatedAtMillis >= record.createdAtMillis,
  'operation timestamps');
}

/** Throws when a stable actor/request key is replayed with a different normalized intent. */
export function assertSameLedgerOperationIntent(
  stored: LedgerOperationRecord,
  incoming: LedgerOperationRecord
): void {
  validateLedgerOperationRecord(stored);
  validateLedgerOperationRecord(incoming);
  assertJournal(stored.id === incoming.id && stored.actorUid === incoming.actorUid &&
    stored.requestId === incoming.requestId && stored.operationId === incoming.operationId &&
    stored.operationType === incoming.operationType && stored.intentHash === incoming.intentHash &&
    stored.expectedAssets.length === incoming.expectedAssets.length &&
    stored.expectedAssets.every((asset) => incoming.expectedAssets.includes(asset)), 'idempotency intent conflict');
}

/** Classifies a same-intent replay; UNKNOWN is reconciliation-only and never authorizes retry. */
export function resolveLedgerOperationReplay(
  stored: LedgerOperationRecord,
  incoming: LedgerOperationRecord
): LedgerOperationReplayDecision {
  assertSameLedgerOperationIntent(stored, incoming);
  switch (stored.status) {
    case 'COMMITTED':
      return { action: 'RETURN_COMMITTED', resultJournalIds: stored.resultJournalIds };
    case 'REJECTED':
      return { action: 'RETURN_REJECTION' };
    case 'IN_PROGRESS':
      return { action: 'WAIT' };
    case 'UNKNOWN':
      return { action: 'RECONCILE_UNKNOWN' };
  }
}

/**
 * Plans oldest-first lot consumption without mutating lots or proving source eligibility.
 * A request that needs more than maxLots is returned whole as CONSOLIDATION_REQUIRED;
 * partial allocations are never returned for a failed plan.
 */
export function planLedgerLotAllocation(
  lots: readonly LedgerLotCandidate[],
  amount: number,
  maxLots = 20
): LedgerLotAllocationPlan {
  assertJournal(Array.isArray(lots), 'lot list');
  assertJournal(Number.isSafeInteger(amount) && amount > 0, 'lot allocation amount');
  assertJournal(Number.isSafeInteger(maxLots) && maxLots >= 1 && maxLots <= 20, 'lot allocation cap');

  const ids = new Set<string>();
  for (const lot of lots) {
    assertJournal(lot && typeof lot === 'object', 'lot');
    assertJournal(typeof lot.id === 'string' && ACCOUNT_KEY.test(lot.id), 'lot ID');
    assertJournal(!ids.has(lot.id), 'duplicate lot ID');
    ids.add(lot.id);
    assertJournal(Number.isSafeInteger(lot.availableAmount) && lot.availableAmount >= 0, 'lot amount');
    assertJournal(typeof lot.eligible === 'boolean', 'lot eligibility');
    assertJournal(Number.isSafeInteger(lot.createdAtMillis) && lot.createdAtMillis >= 0, 'lot creation time');
  }

  const candidates = lots
    .filter((lot) => lot.eligible && lot.availableAmount > 0)
    .slice()
    .sort((left, right) => left.createdAtMillis - right.createdAtMillis ||
      (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  let eligibleTotal = 0n;
  for (const lot of candidates) eligibleTotal += BigInt(lot.availableAmount);
  if (eligibleTotal < BigInt(amount)) return { status: 'INSUFFICIENT', allocations: [] };

  const allocations: { lotId: string; amount: number }[] = [];
  let remaining = amount;
  for (const lot of candidates) {
    if (allocations.length === maxLots) return { status: 'CONSOLIDATION_REQUIRED', allocations: [] };
    const allocated = Math.min(remaining, lot.availableAmount);
    allocations.push({ lotId: lot.id, amount: allocated });
    remaining -= allocated;
    if (remaining === 0) return { status: 'READY', allocations };
  }
  return { status: 'INSUFFICIENT', allocations: [] };
}
