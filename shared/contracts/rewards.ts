/** Pure Phase 8 validation; inputs must still be loaded and authorized by trusted backend code. */
export const MAX_REFERRAL_DEPTH = 5;

export interface ReferralAncestor {
  uid: string;
  signupOrdinal: number;
}

export interface ReferralAttributionCandidate {
  inviteeUid: string;
  inviteeSignupOrdinal: number;
  parentUid: string;
  parentSignupOrdinal: number;
  /** Nearest ancestor first, including the direct parent. */
  ancestors: readonly ReferralAncestor[];
}

export type CoinRewardStatus = 'PENDING' | 'HELD' | 'VESTED' | 'POSTED' | 'REJECTED' | 'REVERSED';

export interface QualifiedCoinReward {
  beneficiaryUid: string;
  sourceKind: string;
  sourceId: string;
  sourceVersion: number;
  rewardKind: string;
  level: number;
  amountCoins: number;
  fundingRef: string;
  policyVersion: number;
  status: CoinRewardStatus;
}

const UID = /^[A-Za-z0-9_-]{1,128}$/;
const SOURCE_KIND = /^[A-Z][A-Z0-9_]{0,79}$/;
const SOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;
const REWARD_KIND = /^[A-Z][A-Z0-9_]{0,79}$/;

function assertValid(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid Coin reward contract: ${message}`);
}

/**
 * Validates a bounded ancestry snapshot. The backend must obtain UIDs and immutable signup ordinals
 * from trusted records; this helper cannot establish account ownership or referral eligibility.
 */
export function validateReferralAttribution(candidate: ReferralAttributionCandidate): void {
  assertValid(candidate && typeof candidate === 'object', 'attribution');
  assertValid(UID.test(candidate.inviteeUid) && UID.test(candidate.parentUid), 'invitee/parent UID');
  assertValid(Number.isSafeInteger(candidate.inviteeSignupOrdinal) && candidate.inviteeSignupOrdinal >= 0,
    'invitee signup ordinal');
  assertValid(Number.isSafeInteger(candidate.parentSignupOrdinal) && candidate.parentSignupOrdinal >= 0,
    'parent signup ordinal');
  assertValid(candidate.parentSignupOrdinal < candidate.inviteeSignupOrdinal, 'parent must predate invitee');
  assertValid(Array.isArray(candidate.ancestors) && candidate.ancestors.length >= 1 &&
    candidate.ancestors.length <= MAX_REFERRAL_DEPTH, 'ancestor depth');
  assertValid(candidate.ancestors[0].uid === candidate.parentUid &&
    candidate.ancestors[0].signupOrdinal === candidate.parentSignupOrdinal, 'direct parent binding');

  const seen = new Set<string>();
  let newerOrdinal = candidate.inviteeSignupOrdinal;
  for (const ancestor of candidate.ancestors) {
    assertValid(ancestor && typeof ancestor === 'object' && UID.test(ancestor.uid), 'ancestor UID');
    assertValid(!seen.has(ancestor.uid), 'duplicate/cyclic ancestor');
    assertValid(ancestor.uid !== candidate.inviteeUid, 'invitee cycle');
    assertValid(Number.isSafeInteger(ancestor.signupOrdinal) && ancestor.signupOrdinal >= 0,
      'ancestor signup ordinal');
    assertValid(ancestor.signupOrdinal < newerOrdinal, 'ancestor order must predate the next account');
    seen.add(ancestor.uid);
    newerOrdinal = ancestor.signupOrdinal;
  }
}

/** Validates a persisted reward envelope; does not authorize funding or a wallet posting. */
export function validateQualifiedCoinReward(reward: QualifiedCoinReward): void {
  assertValid(reward && typeof reward === 'object', 'reward');
  assertValid(UID.test(reward.beneficiaryUid), 'beneficiary UID');
  assertValid(SOURCE_KIND.test(reward.sourceKind), 'source kind');
  assertValid(SOURCE_ID.test(reward.sourceId), 'source ID');
  assertValid(Number.isSafeInteger(reward.sourceVersion) && reward.sourceVersion >= 1, 'source version');
  assertValid(REWARD_KIND.test(reward.rewardKind), 'reward kind');
  assertValid(Number.isSafeInteger(reward.level) && reward.level >= 1 && reward.level <= MAX_REFERRAL_DEPTH,
    'reward level');
  assertValid(Number.isSafeInteger(reward.amountCoins) && reward.amountCoins > 0, 'whole Coin amount');
  assertValid(typeof reward.fundingRef === 'string' && reward.fundingRef.trim().length > 0 &&
    reward.fundingRef.length <= 160, 'funding reference');
  assertValid(Number.isSafeInteger(reward.policyVersion) && reward.policyVersion >= 1, 'policy version');
  assertValid(['PENDING', 'HELD', 'VESTED', 'POSTED', 'REJECTED', 'REVERSED'].includes(reward.status),
    'reward status');
}

/**
 * Stable deduplication ID for one economic source, beneficiary, and reward kind.
 * Policy/source versions and referral level are intentionally excluded so replay or reclassification
 * cannot mint a second reward for the same beneficiary and activity.
 */
export async function createQualifiedCoinRewardId(
  sourceKind: string,
  sourceId: string,
  beneficiaryUid: string,
  rewardKind: string
): Promise<string> {
  assertValid(SOURCE_KIND.test(sourceKind), 'source kind');
  assertValid(SOURCE_ID.test(sourceId), 'source ID');
  assertValid(UID.test(beneficiaryUid), 'beneficiary UID');
  assertValid(REWARD_KIND.test(rewardKind), 'reward kind');
  if (!globalThis.crypto?.subtle) throw new Error('Secure SHA-256 is unavailable in this runtime');

  const fields = [sourceKind, sourceId, beneficiaryUid, rewardKind];
  const canonical = fields.map((field) => `${field.length}:${field}`).join('|');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
