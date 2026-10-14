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

export type AddCoinsResult =
  | { status: 'FEATURE_DISABLED' | 'PROFILE_INCOMPLETE' | 'PROVIDER_UNAVAILABLE' }
  | { status: 'INITIATED'; transactionId: string; amountCoins: number; paymentUrl: string };

export type ExchangeCoinsResult =
  | { status: 'FEATURE_DISABLED' | 'PROFILE_INCOMPLETE' | 'NOT_APPROVED' | 'INSUFFICIENT_COINS' }
  | { status: 'INITIATED'; transactionId: string; amountCoins: number; exchangeRate: string };

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

export async function addCoins(amountCoins: number): Promise<AddCoinsResult> {
  if (!auth?.currentUser) throw new Error('Sign in to add Coins.');
  if (!Number.isSafeInteger(amountCoins) || amountCoins <= 0) {
    throw new Error('Invalid Coin amount.');
  }
  const callable = httpsCallable<{ amountCoins: number }, unknown>(functionsClient(), 'addCoins');
  const response = await callable({ amountCoins });
  const data = response.data as Record<string, unknown>;
  const disabledStatuses = ['FEATURE_DISABLED', 'PROFILE_INCOMPLETE', 'PROVIDER_UNAVAILABLE'];
  if (disabledStatuses.includes(String(data.status))) {
    return { status: data.status as AddCoinsResult['status'] } as AddCoinsResult;
  }
  if (data.status === 'INITIATED' && typeof data.transactionId === 'string' && isCoinCount(data.amountCoins) && typeof data.paymentUrl === 'string') {
    return {
      status: 'INITIATED',
      transactionId: data.transactionId,
      amountCoins: data.amountCoins,
      paymentUrl: data.paymentUrl,
    };
  }
  throw new Error('The add Coins result could not be verified.');
}

export async function exchangeCoins(amountCoins: number): Promise<ExchangeCoinsResult> {
  if (!auth?.currentUser) throw new Error('Sign in to exchange Coins.');
  if (!Number.isSafeInteger(amountCoins) || amountCoins <= 0) {
    throw new Error('Invalid Coin amount.');
  }
  const callable = httpsCallable<{ amountCoins: number }, unknown>(functionsClient(), 'exchangeCoins');
  const response = await callable({ amountCoins });
  const data = response.data as Record<string, unknown>;
  const disabledStatuses = ['FEATURE_DISABLED', 'PROFILE_INCOMPLETE', 'NOT_APPROVED', 'INSUFFICIENT_COINS'];
  if (disabledStatuses.includes(String(data.status))) {
    return { status: data.status as ExchangeCoinsResult['status'] } as ExchangeCoinsResult;
  }
  if (data.status === 'INITIATED' && typeof data.transactionId === 'string' && isCoinCount(data.amountCoins) && typeof data.exchangeRate === 'string') {
    return {
      status: 'INITIATED',
      transactionId: data.transactionId,
      amountCoins: data.amountCoins,
      exchangeRate: data.exchangeRate,
    };
  }
  throw new Error('The exchange Coins result could not be verified.');
}
