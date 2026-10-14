import { describe, expect, it } from 'vitest';
import { planFundedRewardBudget, type FundedRewardCampaignPolicy } from '../../shared/contracts/rewardPolicy';

const campaign = (overrides: Partial<FundedRewardCampaignPolicy> = {}): FundedRewardCampaignPolicy => ({
  campaignId: 'community-2026',
  policyVersion: 1,
  fundingRef: 'finance-approved-fund',
  budgetNprPaisa: 100_000,
  allocations: [{
    sourceKind: 'COMPLETED_BOOKING',
    rewardKind: 'ACTIVITY_BONUS',
    recipient: 'ACTIVITY_OWNER',
    amountCoins: 10,
    maxGrantCount: 500,
    maxGrantsPerBeneficiary: 5,
  }],
  ...overrides,
});

describe('funded reward policy contract', () => {
  it('computes the maximum liability exactly in whole Coins and NPR paisa', () => {
    expect(planFundedRewardBudget(campaign())).toEqual({
      maximumGrantCount: 500,
      maximumCoins: 5_000,
      maximumNprPaisa: 50_000,
      maximumCoinsPerBeneficiary: 50,
      maximumNprPaisaPerBeneficiary: 500,
      unallocatedNprPaisa: 50_000,
    });
  });

  it('adds beneficiary exposure across independent reward allocations', () => {
    const allocation = campaign().allocations[0];
    const plan = planFundedRewardBudget(campaign({ allocations: [allocation, {
      ...allocation,
      sourceKind: 'COMPLETED_EVENT',
      amountCoins: 20,
      maxGrantCount: 100,
      maxGrantsPerBeneficiary: 2,
    }] }));
    expect(plan.maximumCoinsPerBeneficiary).toBe(90);
    expect(plan.maximumNprPaisaPerBeneficiary).toBe(900);
  });

  it('accepts a schedule exactly equal to its approved NPR budget', () => {
    expect(planFundedRewardBudget(campaign({ budgetNprPaisa: 50_000 })).unallocatedNprPaisa).toBe(0);
  });

  it('rejects a maximum liability above the budget', () => {
    expect(() => planFundedRewardBudget(campaign({ budgetNprPaisa: 49_990 })))
      .toThrow(/exceed NPR budget/);
  });

  it('rejects an unbounded or inconsistent grant cap', () => {
    expect(() => planFundedRewardBudget(campaign({
      allocations: [{ ...campaign().allocations[0], maxGrantCount: Number.MAX_SAFE_INTEGER,
        maxGrantsPerBeneficiary: Number.MAX_SAFE_INTEGER }],
    }))).toThrow(/exceed NPR budget/);
    expect(() => planFundedRewardBudget(campaign({
      allocations: [{ ...campaign().allocations[0], maxGrantsPerBeneficiary: 501 }],
    }))).toThrow(/per-beneficiary grant cap/);
  });

  it('rejects duplicate policy rows that could hide a repeated allocation', () => {
    const allocation = campaign().allocations[0];
    expect(() => planFundedRewardBudget(campaign({ allocations: [allocation, allocation] })))
      .toThrow(/duplicate source\/reward\/recipient/);
  });

  it('permits only direct referral rewards, never a multilevel recipient', () => {
    expect(() => planFundedRewardBudget(campaign({ allocations: [{
      ...campaign().allocations[0], recipient: 'ANCESTOR_LEVEL_2' as never,
    }] }))).toThrow(/direct referrer/);
    expect(planFundedRewardBudget(campaign({ allocations: [{
      ...campaign().allocations[0], recipient: 'DIRECT_REFERRER',
    }] })).maximumGrantCount).toBe(500);
  });

  it('rejects unsafe aggregate integer arithmetic', () => {
    expect(() => planFundedRewardBudget(campaign({
      budgetNprPaisa: Number.MAX_SAFE_INTEGER,
      allocations: [{ ...campaign().allocations[0], amountCoins: Number.MAX_SAFE_INTEGER, maxGrantCount: 2,
        maxGrantsPerBeneficiary: 1 }],
    }))).toThrow(/exceed NPR budget/);
  });
});
