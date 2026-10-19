import { getFunctions, httpsCallable } from 'firebase/functions';
import { deleteObject, ref, uploadBytes } from 'firebase/storage';
import { app, auth, storage } from '../firebase';

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
  | { status: 'NOT_CONFIGURED' | 'INELIGIBLE' | 'IDENTITY_REVIEW_REQUIRED' | 'NOT_FUNDED' | 'CAP_REACHED' | 'WALLET_BLOCKED' };

export type WelcomeCoinIdentityStatus = {
  status: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DUPLICATE' | 'APPEAL_PENDING' | 'ESCALATION_PENDING';
  appealDeadlineMillis: number | null;
};

export type WelcomeCoinIdentityDocumentType = 'NEPALI_CITIZENSHIP_CERTIFICATE' | 'NATIONAL_ID' | 'PASSPORT';

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
  const inactiveStatuses = ['NOT_CONFIGURED', 'INELIGIBLE', 'IDENTITY_REVIEW_REQUIRED', 'NOT_FUNDED', 'CAP_REACHED', 'WALLET_BLOCKED'];
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

function identityFunctionsClient() {
  if (!app) throw new Error('Identity review is unavailable on this connection.');
  return getFunctions(app, 'us-central1');
}

function requireIdentityUploadServices() {
  if (!auth?.currentUser || !storage) throw new Error('Sign in to submit identity evidence.');
  return { uid: auth.currentUser.uid, service: storage };
}

export async function submitWelcomeCoinIdentityEvidence(
  documentType: WelcomeCoinIdentityDocumentType,
  idFile: File,
  selfieFile: File,
): Promise<void> {
  const { uid, service } = requireIdentityUploadServices();
  const idTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!idTypes.includes(idFile.type) || idFile.size <= 0 || idFile.size > 5 * 1024 * 1024) {
    throw new Error('Government ID must be a JPEG, PNG, or PDF no larger than 5 MB.');
  }
  if (!['image/jpeg', 'image/png'].includes(selfieFile.type) || selfieFile.size <= 0 || selfieFile.size > 5 * 1024 * 1024) {
    throw new Error('The fresh selfie must be a JPEG or PNG no larger than 5 MB.');
  }
  const folder = `kyc/${uid}/welcome-coins`;
  const idExtension = idFile.type === 'application/pdf' ? 'pdf' : idFile.type === 'image/png' ? 'png' : 'jpg';
  const selfieExtension = selfieFile.type === 'image/png' ? 'png' : 'jpg';
  const idPath = `${folder}/${crypto.randomUUID()}.${idExtension}`;
  const selfiePath = `${folder}/${crypto.randomUUID()}.${selfieExtension}`;
  let submissionStarted = false;
  try {
    await Promise.all([
      uploadBytes(ref(service, idPath), idFile, { contentType: idFile.type, customMetadata: { ownerUid: uid, category: 'kyc' } }),
      uploadBytes(ref(service, selfiePath), selfieFile, { contentType: selfieFile.type, customMetadata: { ownerUid: uid, category: 'kyc' } }),
    ]);
    const callable = httpsCallable(identityFunctionsClient(), 'submitWelcomeCoinIdentityCase');
    submissionStarted = true;
    await callable({ documentType, idPath, selfiePath });
  } catch (error) {
    // Once submission starts, a lost response can mean the case was committed.
    // Preserve the referenced evidence; clean up only when upload failed first.
    if (!submissionStarted) {
      await Promise.allSettled([deleteObject(ref(service, idPath)), deleteObject(ref(service, selfiePath))]);
    }
    throw error;
  }
}

export async function getWelcomeCoinIdentityStatus(): Promise<WelcomeCoinIdentityStatus> {
  if (!auth?.currentUser) throw new Error('Sign in to view identity review status.');
  const callable = httpsCallable<void, unknown>(identityFunctionsClient(), 'getWelcomeCoinIdentityStatus');
  const response = await callable();
  const data = response.data as Record<string, unknown>;
  const statuses = ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE', 'APPEAL_PENDING', 'ESCALATION_PENDING'];
  if (!statuses.includes(String(data.status)) ||
      !(data.appealDeadlineMillis === null || (Number.isSafeInteger(data.appealDeadlineMillis) && Number(data.appealDeadlineMillis) >= 0))) {
    throw new Error('Identity review status could not be verified.');
  }
  return { status: data.status as WelcomeCoinIdentityStatus['status'], appealDeadlineMillis: data.appealDeadlineMillis as number | null };
}

export async function appealWelcomeCoinIdentityCase(): Promise<void> {
  if (!auth?.currentUser) throw new Error('Sign in to appeal this decision.');
  const callable = httpsCallable<void, unknown>(identityFunctionsClient(), 'appealWelcomeCoinIdentityCase');
  await callable();
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
