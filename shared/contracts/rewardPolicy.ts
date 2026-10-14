import { coinsToNprPaisa } from './money';

/** Pure campaign budget contract. It does not prove that funding exists or approve activation. */
export interface FundedRewardAllocation {
  sourceKind: string;
  rewardKind: string;
  /** ACTIVITY_OWNER rewards the qualified actor; DIRECT_REFERRER is capped at the direct parent. */
  recipient: 'ACTIVITY_OWNER' | 'DIRECT_REFERRER';
  amountCoins: number;
  /** Maximum grants across the entire campaign, including retries/replays. */
  maxGrantCount: number;
  /** Explicit anti-concentration cap; must not exceed maxGrantCount. */
  maxGrantsPerBeneficiary: number;
}

export interface FundedRewardCampaignPolicy {
  campaignId: string;
  policyVersion: number;
  fundingRef: string;
  /** Finance-approved ceiling, represented in integer NPR paisa. */
  budgetNprPaisa: number;
  allocations: readonly FundedRewardAllocation[];
}

export interface RewardBudgetPlan {
  maximumGrantCount: number;
  maximumCoins: number;
  maximumNprPaisa: number;
  maximumCoinsPerBeneficiary: number;
  maximumNprPaisaPerBeneficiary: number;
  unallocatedNprPaisa: number;
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const KIND = /^[A-Z][A-Z0-9_]{0,79}$/;
const MAX_ALLOCATIONS = 100;

function assertPolicy(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid funded reward policy: ${message}`);
}

/**
 * Validates a finite, earn-only campaign schedule and returns its worst-case liability.
 * Budget and allocation facts still need trusted finance approval and a funded backend record.
 */
export function planFundedRewardBudget(policy: FundedRewardCampaignPolicy): RewardBudgetPlan {
  assertPolicy(policy && typeof policy === 'object', 'record');
  assertPolicy(SAFE_ID.test(policy.campaignId), 'campaign ID');
  assertPolicy(Number.isSafeInteger(policy.policyVersion) && policy.policyVersion >= 1, 'policy version');
  assertPolicy(SAFE_ID.test(policy.fundingRef), 'funding reference');
  assertPolicy(Number.isSafeInteger(policy.budgetNprPaisa) && policy.budgetNprPaisa > 0,
    'positive whole-paisa budget');
  assertPolicy(Array.isArray(policy.allocations) && policy.allocations.length >= 1 &&
    policy.allocations.length <= MAX_ALLOCATIONS, 'allocation count');

  const seen = new Set<string>();
  let totalCoins = 0n;
  let totalGrants = 0n;
  let maximumCoinsPerBeneficiary = 0n;
  for (const allocation of policy.allocations) {
    assertPolicy(allocation && typeof allocation === 'object', 'allocation');
    assertPolicy(KIND.test(allocation.sourceKind), 'source kind');
    assertPolicy(KIND.test(allocation.rewardKind), 'reward kind');
    assertPolicy(allocation.recipient === 'ACTIVITY_OWNER' || allocation.recipient === 'DIRECT_REFERRER',
      'recipient; referral rewards may only target the direct referrer');
    assertPolicy(Number.isSafeInteger(allocation.amountCoins) && allocation.amountCoins > 0, 'whole-Coin amount');
    assertPolicy(Number.isSafeInteger(allocation.maxGrantCount) && allocation.maxGrantCount > 0,
      'finite campaign grant cap');
    assertPolicy(Number.isSafeInteger(allocation.maxGrantsPerBeneficiary) &&
      allocation.maxGrantsPerBeneficiary > 0 &&
      allocation.maxGrantsPerBeneficiary <= allocation.maxGrantCount, 'per-beneficiary grant cap');

    const key = `${allocation.sourceKind}:${allocation.rewardKind}:${allocation.recipient}`;
    assertPolicy(!seen.has(key), 'duplicate source/reward/recipient allocation');
    seen.add(key);
    totalCoins += BigInt(allocation.amountCoins) * BigInt(allocation.maxGrantCount);
    totalGrants += BigInt(allocation.maxGrantCount);
    maximumCoinsPerBeneficiary += BigInt(allocation.amountCoins) *
      BigInt(allocation.maxGrantsPerBeneficiary);
  }

  const totalPaisa = totalCoins * 10n;
  assertPolicy(totalPaisa <= BigInt(policy.budgetNprPaisa), 'maximum scheduled rewards exceed NPR budget');
  assertPolicy(totalCoins <= BigInt(Number.MAX_SAFE_INTEGER) &&
    maximumCoinsPerBeneficiary <= BigInt(Number.MAX_SAFE_INTEGER) &&
    totalGrants <= BigInt(Number.MAX_SAFE_INTEGER), 'aggregate exceeds safe integer range');

  return {
    maximumGrantCount: Number(totalGrants),
    maximumCoins: Number(totalCoins),
    maximumNprPaisa: coinsToNprPaisa(Number(totalCoins)),
    maximumCoinsPerBeneficiary: Number(maximumCoinsPerBeneficiary),
    maximumNprPaisaPerBeneficiary: coinsToNprPaisa(Number(maximumCoinsPerBeneficiary)),
    unallocatedNprPaisa: policy.budgetNprPaisa - Number(totalPaisa),
  };
}
