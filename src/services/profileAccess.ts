import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '../firebase';

export interface ProfileUnlockRequest {
  providerUid: string;
  requestId: string;
}

export type ProfileUnlockResult =
  | { status: 'FEATURE_DISABLED' | 'NOT_CONFIGURED' | 'INELIGIBLE' | 'BLOCKED' |
      'INSUFFICIENT_COINS' | 'CONSOLIDATION_REQUIRED' | 'WALLET_UNAVAILABLE' }
  | { status: 'FREE_GRANTED' | 'COINS_GRANTED' | 'ALREADY_GRANTED';
      unlockId: string; chargedCoins: number; policyVersion: number };

export function createProfileUnlockRequest(providerUid: string): ProfileUnlockRequest {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(providerUid)) {
    throw new Error('Choose a valid profile before requesting access.');
  }
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('A secure profile request could not be created on this device.');
  }
  return { providerUid, requestId: crypto.randomUUID() };
}

/** Submits a server-authoritative entitlement request; clients never provide actor, price, or quota. */
export async function requestProfileUnlock(request: ProfileUnlockRequest): Promise<ProfileUnlockResult> {
  if (!auth?.currentUser) throw new Error('Sign in to open this profile.');
  if (!app) throw new Error('Profile access is unavailable on this connection.');
  if (!request || !/^[A-Za-z0-9_-]{1,128}$/.test(request.providerUid) ||
      !/^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/.test(request.requestId)) {
    throw new Error('The profile access request could not be verified.');
  }

  const callable = httpsCallable<ProfileUnlockRequest, unknown>(
    getFunctions(app, 'us-central1'), 'requestCompanionProfileUnlock',
  );
  const response = await callable(request);
  const data = response.data as Record<string, unknown>;
  const inactive = [
    'FEATURE_DISABLED', 'NOT_CONFIGURED', 'INELIGIBLE', 'BLOCKED', 'INSUFFICIENT_COINS',
    'CONSOLIDATION_REQUIRED', 'WALLET_UNAVAILABLE',
  ];
  if (inactive.includes(String(data.status))) {
    return { status: data.status as ProfileUnlockResult['status'] } as ProfileUnlockResult;
  }
  if (['FREE_GRANTED', 'COINS_GRANTED', 'ALREADY_GRANTED'].includes(String(data.status)) &&
      typeof data.unlockId === 'string' && Number.isSafeInteger(data.chargedCoins) &&
      Number(data.chargedCoins) >= 0 && Number.isSafeInteger(data.policyVersion) &&
      Number(data.policyVersion) > 0) {
    return {
      status: data.status as 'FREE_GRANTED' | 'COINS_GRANTED' | 'ALREADY_GRANTED',
      unlockId: data.unlockId,
      chargedCoins: Number(data.chargedCoins),
      policyVersion: Number(data.policyVersion),
    };
  }
  throw new Error('The profile access result could not be verified.');
}
