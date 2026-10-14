import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '../firebase';

export interface CoinStatementEntry {
  id: string;
  deltaCoins: number;
  direction: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'RELEASE';
  purpose: string;
  label: string;
  createdAtMillis: number | null;
}

export type CoinWalletSnapshot =
  | { status: 'NO_WALLET'; entries: [] }
  | { status: 'WALLET_UNAVAILABLE'; entries: [] }
  | {
      status: 'ACTIVE';
      availableCoins: number;
      reservedCoins: number;
      entries: CoinStatementEntry[];
    };

export type WelcomeCoinClaimResult =
  | { status: 'GRANTED' | 'ALREADY_GRANTED'; rewardId: string; amountCoins: number }
  | { status: 'NOT_CONFIGURED' | 'INELIGIBLE' | 'NOT_FUNDED' | 'CAP_REACHED' | 'WALLET_BLOCKED' };

function functionsClient() {
  if (!app) throw new Error('SATHI Coins are unavailable on this connection.');
  return getFunctions(app, 'us-central1');
}

function isCoinCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export async function loadCoinWallet(): Promise<CoinWalletSnapshot> {
  if (!auth?.currentUser) throw new Error('Sign in to view your Coin wallet.');
  const callable = httpsCallable<void, unknown>(functionsClient(), 'getCoinWallet');
  const response = await callable();
  const data = response.data as Record<string, unknown>;
  if (data.status === 'NO_WALLET' || data.status === 'WALLET_UNAVAILABLE') {
    return { status: data.status, entries: [] };
  }
  if (data.status !== 'ACTIVE' || !isCoinCount(data.availableCoins) ||
      !isCoinCount(data.reservedCoins) || !Array.isArray(data.entries)) {
    throw new Error('The Coin wallet response could not be verified.');
  }
  const entries = data.entries.flatMap((entry): CoinStatementEntry[] => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || !Number.isSafeInteger(item.deltaCoins) ||
        !['CREDIT', 'DEBIT', 'RESERVE', 'RELEASE'].includes(String(item.direction)) ||
        typeof item.purpose !== 'string' || typeof item.label !== 'string' ||
        !(item.createdAtMillis === null || isCoinCount(item.createdAtMillis))) return [];
    return [{
      id: item.id,
      deltaCoins: item.deltaCoins as number,
      direction: item.direction as CoinStatementEntry['direction'],
      purpose: item.purpose,
      label: item.label,
      createdAtMillis: item.createdAtMillis as number | null,
    }];
  });
  return {
    status: 'ACTIVE',
    availableCoins: data.availableCoins,
    reservedCoins: data.reservedCoins,
    entries,
  };
}

export async function claimWelcomeCoins(): Promise<WelcomeCoinClaimResult> {
  if (!auth?.currentUser) throw new Error('Sign in to check welcome Coin eligibility.');
  const callable = httpsCallable<void, unknown>(functionsClient(), 'claimWelcomeCoins');
  const response = await callable();
  const data = response.data as Record<string, unknown>;
  const inactiveStatuses = ['NOT_CONFIGURED', 'INELIGIBLE', 'NOT_FUNDED', 'CAP_REACHED', 'WALLET_BLOCKED'];
  if (inactiveStatuses.includes(String(data.status))) {
    return { status: data.status as WelcomeCoinClaimResult['status'] } as WelcomeCoinClaimResult;
  }
  if ((data.status === 'GRANTED' || data.status === 'ALREADY_GRANTED') &&
      typeof data.rewardId === 'string' && isCoinCount(data.amountCoins) && data.amountCoins > 0) {
    return {
      status: data.status,
      rewardId: data.rewardId,
      amountCoins: data.amountCoins,
    };
  }
  throw new Error('The welcome Coin result could not be verified.');
}
