import { useCallback, useEffect, useState } from 'react';
import { Coins, Clock3, Gift, LockKeyhole, RefreshCw, Wallet } from 'lucide-react';
import {
  appealWelcomeCoinIdentityCase,
  claimWelcomeCoins,
  getWelcomeCoinIdentityStatus,
  loadCoinWallet,
  submitWelcomeCoinIdentityEvidence,
  type CoinWalletSnapshot,
  type WelcomeCoinIdentityDocumentType,
  type WelcomeCoinIdentityStatus,
} from '../../services/coinWallet';
import { welcomeCoinIdentityUiEnabled } from '../../services/releaseGates';

const unavailableFeatures = [
  { icon: Gift, title: 'Earn Coins', detail: 'Funded reward sources are not active.' },
  { icon: LockKeyhole, title: 'Use Coins', detail: 'Profile unlock pricing and spending are not active.' },
  { icon: Wallet, title: 'Cash redemption', detail: 'Cash redemption is turned off.' },
];

const claimMessages: Record<string, string> = {
  NOT_CONFIGURED: 'Welcome Coins are not active for this account.',
  INELIGIBLE: 'This account does not meet the current welcome Coin eligibility rules.',
  IDENTITY_REVIEW_REQUIRED: 'Submit your government ID and a fresh selfie for Admin review before claiming welcome Coins.',
  NOT_FUNDED: 'Welcome Coins are temporarily unavailable because campaign funding is not ready.',
  CAP_REACHED: 'The funded welcome Coin allocation has been fully claimed.',
  WALLET_BLOCKED: 'This wallet is temporarily unavailable. Contact SATHI support if this continues.',
};

export function CoinWalletPanel() {
  const [wallet, setWallet] = useState<CoinWalletSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const refreshWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWallet(await loadCoinWallet());
    } catch (cause) {
      setWallet(null);
      setError(cause instanceof Error ? cause.message : 'Your Coin wallet could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  const checkWelcomeCoins = async () => {
    setClaiming(true);
    setClaimMessage(null);
    setError(null);
    try {
      const result = await claimWelcomeCoins();
      if (result.status === 'GRANTED' || result.status === 'ALREADY_GRANTED') {
        setClaimMessage(result.status === 'GRANTED'
          ? `${result.amountCoins.toLocaleString()} welcome Coins were added to your wallet.`
          : 'Your welcome Coins are already in your wallet.');
        await refreshWallet();
      } else {
        setClaimMessage(claimMessages[result.status]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Welcome Coin eligibility could not be checked.');
    } finally {
      setClaiming(false);
    }
  };

  const hasWallet = wallet?.status === 'ACTIVE';
  const balanceLabel = loading
    ? 'Loading…'
    : hasWallet
      ? `${wallet.availableCoins.toLocaleString()} Coins`
      : wallet?.status === 'NO_WALLET'
        ? 'No Coins yet'
        : wallet?.status === 'WALLET_UNAVAILABLE'
          ? 'Temporarily unavailable'
          : 'Not available';

  return (
    <section aria-labelledby="coin-wallet-title" className="space-y-5">
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-action/10 text-primary-action">
          <Coins aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h4 id="coin-wallet-title" className="text-sm font-bold text-text-primary">SATHI Coins</h4>
          <p className="text-xs text-text-secondary">Your platform wallet</p>
        </div>
      </header>

      <div className="rounded-2xl border border-border-token/40 bg-surface-elevated/50 p-5 text-center">
        <p className="text-xs font-semibold text-text-secondary">Available balance</p>
        <p aria-live="polite" className="mt-2 text-lg font-bold text-text-primary">{balanceLabel}</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-text-secondary">
          {hasWallet
            ? `${wallet.reservedCoins.toLocaleString()} Coins are reserved. This balance comes from SATHI's server ledger.`
            : wallet?.status === 'NO_WALLET'
              ? 'No Coins have been issued to this account. Check whether a funded welcome grant is available.'
              : 'A verified wallet balance is shown only after SATHI confirms it from the server ledger.'}
        </p>
        {error && <p role="alert" className="mt-3 text-xs text-text-secondary">{error}</p>}
        {claimMessage && <p role="status" className="mt-3 text-xs text-text-secondary">{claimMessage}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => void checkWelcomeCoins()}
            disabled={claiming || loading}
            className="inline-flex items-center gap-2 rounded-full bg-primary-action px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {claiming ? <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Gift aria-hidden="true" className="h-3.5 w-3.5" />}
            {claiming ? 'Checking…' : 'Check welcome Coins'}
          </button>
          {error && (
            <button
              type="button"
              onClick={() => void refreshWallet()}
              disabled={loading}
              className="rounded-full border border-border-token/50 px-4 py-2 text-xs font-semibold text-text-primary disabled:opacity-60"
            >
              Retry wallet
            </button>
          )}
        </div>
      </div>

      {welcomeCoinIdentityUiEnabled && <WelcomeCoinIdentityReview />}

      <div className="rounded-2xl border border-border-token/40 bg-surface/60 p-4">
        <p className="text-xs font-bold text-text-primary">Reference value</p>
        <p className="mt-1 text-sm font-semibold text-primary-action">10 Coins = NPR 1</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
          This is the planned display conversion, not a promise that Coins can currently be bought,
          transferred, spent, or exchanged for cash. Coins cannot be sent to another person.
        </p>
      </div>

      {hasWallet && (
        <div className="rounded-2xl border border-border-token/40 bg-surface/60 p-4">
          <h5 className="text-xs font-bold text-text-primary">Recent activity</h5>
          {wallet.entries.length === 0 ? (
            <p className="mt-3 text-xs text-text-secondary">No wallet activity yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border-token/30">
              {wallet.entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-text-primary">{entry.label}</p>
                    <p className="text-[11px] text-text-secondary">
                      {entry.createdAtMillis === null ? entry.purpose : new Date(entry.createdAtMillis).toLocaleDateString('en-NP')}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-text-primary">
                    {entry.deltaCoins > 0 ? '+' : ''}{entry.deltaCoins.toLocaleString()} Coins
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="rounded-2xl border border-border-token/40 bg-surface/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-primary">Add Coins</p>
              <p className="mt-0.5 text-[11px] text-text-secondary">Purchases are unavailable until an approved payment provider and funded policy are active.</p>
            </div>
            <span className="rounded-full border border-border-token/50 px-4 py-2 text-xs font-semibold text-text-muted">Unavailable</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border-token/40 bg-surface/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-text-primary">Exchange Coins</p>
              <p className="mt-0.5 text-[11px] text-text-secondary">Spending is unavailable until the approved profile-unlock and partner-offer paths are released.</p>
            </div>
            <span className="rounded-full border border-border-token/50 px-4 py-2 text-xs font-semibold text-text-muted">Unavailable</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {unavailableFeatures.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-border-token/40 bg-surface/40 p-3">
              <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <div>
                <p className="text-xs font-semibold text-text-primary">{title}</p>
                <p className="mt-0.5 text-[11px] text-text-secondary">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="flex items-center justify-center gap-2 text-[11px] text-text-muted">
        <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
        Wallet activity appears here after the server confirms it.
      </p>

    </section>
  );
}

const ID_DOCUMENT_TYPES: { value: WelcomeCoinIdentityDocumentType; label: string }[] = [
  { value: 'NEPALI_CITIZENSHIP_CERTIFICATE', label: 'Nepali citizenship certificate' },
  { value: 'NATIONAL_ID', label: 'National ID' },
  { value: 'PASSPORT', label: 'Passport' },
];

const identityStatusLabels: Record<WelcomeCoinIdentityStatus['status'], string> = {
  NOT_SUBMITTED: 'Identity review is required before a welcome grant can be claimed.',
  PENDING: 'Your identity evidence is waiting for Admin review.',
  VERIFIED: 'Your identity review is approved. You can check welcome-Coin eligibility above.',
  REJECTED: 'Your identity review was not approved. You can appeal within the displayed period.',
  DUPLICATE: 'This document needs independent review. You can appeal within the displayed period.',
  APPEAL_PENDING: 'Your appeal is waiting for an independent reviewer.',
  ESCALATION_PENDING: 'Your case has been escalated for senior review.',
};

function WelcomeCoinIdentityReview() {
  const [identity, setIdentity] = useState<WelcomeCoinIdentityStatus | null>(null);
  const [documentType, setDocumentType] = useState<WelcomeCoinIdentityDocumentType>('NEPALI_CITIZENSHIP_CERTIFICATE');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIdentity(await getWelcomeCoinIdentityStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Identity review status could not be loaded.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const submit = async () => {
    if (!idFile || !selfieFile) {
      setError('Choose both your government ID and a fresh selfie.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await submitWelcomeCoinIdentityEvidence(documentType, idFile, selfieFile);
      setMessage('Your identity evidence was submitted for Admin review.');
      setIdFile(null);
      setSelfieFile(null);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Identity evidence could not be submitted.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const appeal = async () => {
    setBusy(true);
    setError(null);
    try {
      await appealWelcomeCoinIdentityCase();
      setMessage('Your appeal was submitted for independent review.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your appeal could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  const appealable = identity?.status === 'REJECTED' || identity?.status === 'DUPLICATE';
  return (
    <section aria-labelledby="welcome-identity-title" className="space-y-3 rounded-2xl border border-border-token/40 bg-surface/60 p-4">
      <div>
        <h5 id="welcome-identity-title" className="text-xs font-bold text-text-primary">Welcome-Coin identity review</h5>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          Submit a Nepali citizenship certificate, National ID, or passport and a fresh selfie. Admin reviews your evidence; profile completion is not required.
        </p>
      </div>
      {identity && <p role="status" className="text-xs text-text-secondary">{identityStatusLabels[identity.status]}</p>}
      {identity?.appealDeadlineMillis && appealable && (
        <p className="text-xs text-text-secondary">Appeal by {new Date(identity.appealDeadlineMillis).toLocaleDateString('en-NP')}.</p>
      )}
      {identity?.status === 'NOT_SUBMITTED' && (
        <div className="space-y-3">
          <label className="block text-xs text-text-primary">
            Government ID type
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value as WelcomeCoinIdentityDocumentType)} className="mt-1 block w-full rounded-xl border border-border-token/50 bg-surface px-3 py-2">
              {ID_DOCUMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </label>
          <label className="block text-xs text-text-primary">
            ID image or PDF (max 5 MB)
            <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setIdFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" />
          </label>
          <label className="block text-xs text-text-primary">
            Fresh selfie (JPEG or PNG, max 5 MB)
              <input type="file" accept="image/jpeg,image/png" capture="user" onChange={(event) => setSelfieFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" />
          </label>
          <button type="button" onClick={() => void submit()} disabled={busy} className="rounded-full bg-primary-action px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {busy ? 'Submitting…' : 'Submit for Admin review'}
          </button>
        </div>
      )}
      {appealable && (
        <button type="button" onClick={() => void appeal()} disabled={busy || !identity.appealDeadlineMillis || Date.now() > identity.appealDeadlineMillis} className="rounded-full border border-border-token/50 px-4 py-2 text-xs font-semibold text-text-primary disabled:opacity-60">
          {busy ? 'Submitting…' : 'Request independent review'}
        </button>
      )}
      {message && <p role="status" className="text-xs text-text-secondary">{message}</p>}
      {error && <p role="alert" className="text-xs text-text-secondary">{error}</p>}
    </section>
  );
}
