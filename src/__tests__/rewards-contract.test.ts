import { describe, expect, it } from 'vitest';
import {
  createQualifiedCoinRewardId,
  MAX_REFERRAL_DEPTH,
  validateQualifiedCoinReward,
  validateReferralAttribution,
  type QualifiedCoinReward,
  type ReferralAttributionCandidate,
} from '../../shared/contracts/rewards';

const attribution = (overrides: Partial<ReferralAttributionCandidate> = {}): ReferralAttributionCandidate => ({
  inviteeUid: 'invitee',
  inviteeSignupOrdinal: 30,
  parentUid: 'parent',
  parentSignupOrdinal: 20,
  ancestors: [
    { uid: 'parent', signupOrdinal: 20 },
    { uid: 'grandparent', signupOrdinal: 10 },
  ],
  ...overrides,
});

const reward = (overrides: Partial<QualifiedCoinReward> = {}): QualifiedCoinReward => ({
  beneficiaryUid: 'beneficiary',
  sourceKind: 'COMPLETED_BOOKING',
  sourceId: 'booking-1',
  sourceVersion: 1,
  rewardKind: 'DIRECT_QUALIFICATION',
  level: 1,
  amountCoins: 10,
  fundingRef: 'approved-budget-1',
  policyVersion: 1,
  status: 'PENDING',
  ...overrides,
});

describe('bounded referral attribution contract', () => {
  it('accepts a parent-first, strictly older bounded ancestry snapshot', () => {
    expect(() => validateReferralAttribution(attribution())).not.toThrow();
  });

  it('rejects self-referrals, duplicate/cyclic ancestors, and an unbound direct parent', () => {
    expect(() => validateReferralAttribution(attribution({
      inviteeUid: 'parent',
    }))).toThrow('invitee cycle');
    expect(() => validateReferralAttribution(attribution({
      ancestors: [{ uid: 'parent', signupOrdinal: 20 }, { uid: 'parent', signupOrdinal: 10 }],
    }))).toThrow('duplicate/cyclic ancestor');
    expect(() => validateReferralAttribution(attribution({
      ancestors: [{ uid: 'other-parent', signupOrdinal: 20 }],
    }))).toThrow('direct parent binding');
  });

  it('rejects future/equal parent ordinals, unordered ancestors, and depth beyond five', () => {
    expect(() => validateReferralAttribution(attribution({ parentSignupOrdinal: 30 })))
      .toThrow('parent must predate invitee');
    expect(() => validateReferralAttribution(attribution({
      ancestors: [{ uid: 'parent', signupOrdinal: 20 }, { uid: 'grandparent', signupOrdinal: 25 }],
    }))).toThrow('ancestor order');
    expect(() => validateReferralAttribution(attribution({
      ancestors: Array.from({ length: MAX_REFERRAL_DEPTH + 1 }, (_, index) => ({
        uid: index === 0 ? 'parent' : `ancestor-${index}`,
        signupOrdinal: 20 - index,
      })),
    }))).toThrow('ancestor depth');
  });
});

describe('qualified Coin reward contract', () => {
  it('accepts a bounded whole-Coin reward envelope', () => {
    expect(() => validateQualifiedCoinReward(reward())).not.toThrow();
  });

  it.each([
    [{ amountCoins: 1.5 }, 'whole Coin amount'],
    [{ amountCoins: 0 }, 'whole Coin amount'],
    [{ level: 6 }, 'reward level'],
    [{ fundingRef: '' }, 'funding reference'],
    [{ status: 'UNKNOWN' as QualifiedCoinReward['status'] }, 'reward status'],
  ])('rejects invalid reward fields %o', (overrides, message) => {
    expect(() => validateQualifiedCoinReward(reward(overrides))).toThrow(message);
  });

  it('creates a deterministic source-beneficiary-kind ID independent of mutable policy metadata', async () => {
    const id = await createQualifiedCoinRewardId('COMPLETED_BOOKING', 'booking-1', 'beneficiary', 'DIRECT');
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    await expect(createQualifiedCoinRewardId('COMPLETED_BOOKING', 'booking-1', 'beneficiary', 'DIRECT'))
      .resolves.toBe(id);
    await expect(createQualifiedCoinRewardId('COMPLETED_BOOKING', 'booking-1', 'other-user', 'DIRECT'))
      .resolves.not.toBe(id);
    await expect(createQualifiedCoinRewardId('COMPLETED_BOOKING', 'booking-1', 'beneficiary', 'REFERRAL'))
      .resolves.not.toBe(id);
  });
});
