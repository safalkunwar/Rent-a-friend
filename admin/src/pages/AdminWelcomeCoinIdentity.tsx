import React, { useCallback, useEffect, useState } from 'react';
import { getBlob, ref } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db, app, storage } from '../firebase';
import { useAdminAuth } from '../contexts/AdminAuthContext';

type IdentityCase = {
  id: string;
  uid: string;
  status: string;
  documentType: string;
  evidence?: { idPath?: string; selfiePath?: string };
  reviewedBy?: string;
  submittedAt?: { toDate?: () => Date };
};

const statusQueryValues = ['PENDING', 'APPEAL_PENDING', 'ESCALATION_PENDING'];

function usePrivateObjectUrl(path: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (path && storage) {
      getBlob(ref(storage, path)).then(blob => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }).catch(() => setUrl(null));
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return url;
}

function EvidencePreview({ label, path }: { label: string; path?: string }) {
  const url = usePrivateObjectUrl(path);
  if (!path) return <p className="text-xs text-red-400">{label} evidence missing</p>;
  if (!url) return <p className="text-xs text-gray-400">Loading private {label.toLowerCase()} evidence…</p>;
  return path.toLowerCase().endsWith('.pdf')
    ? <a className="text-xs text-primary-action underline" href={url} target="_blank" rel="noreferrer">Open {label} PDF</a>
    : <img className="max-h-72 max-w-full rounded-lg border border-border-token object-contain" src={url} alt={`Submitted ${label.toLowerCase()} evidence`} />;
}

export function AdminWelcomeCoinIdentity() {
  const { session, hasPermission } = useAdminAuth();
  const [cases, setCases] = useState<IdentityCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [documentNumbers, setDocumentNumbers] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(query(
        collection(db, 'welcome_coin_identity_cases'),
        where('status', 'in', statusQueryValues),
        limit(100),
      ));
      setCases(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as IdentityCase)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Identity review queue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const act = async (identityCase: IdentityCase, action: 'APPROVE' | 'REJECT' | 'ESCALATE') => {
    if (!app) return;
    setBusyUid(identityCase.uid);
    setError(null);
    setMessage(null);
    try {
      const callable = httpsCallable(getFunctions(app, 'us-central1'), 'reviewWelcomeCoinIdentityCase');
      const payload: Record<string, string> = { uid: identityCase.uid, action };
      if (action === 'APPROVE') payload.documentNumber = documentNumbers[identityCase.uid] ?? '';
      await callable(payload);
      setDocumentNumbers(previous => ({ ...previous, [identityCase.uid]: '' }));
      setMessage(`Case updated: ${action.toLowerCase()}.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Identity review action failed.');
    } finally {
      setBusyUid(null);
    }
  };

  if (!hasPermission('kyc.read')) {
    return <p role="alert" className="rounded-xl border border-red-500/30 p-4 text-sm text-red-300">You do not have permission to view identity cases.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">
        Government ID and selfie are sensitive evidence. Review only assigned case work, do not download or copy evidence, and do not enter the document number in notes. Approval stores only a server-keyed fingerprint; the number is not written to Firestore.
      </p>
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Welcome-Coin identity cases</h2>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="rounded-lg border border-border-token px-3 py-2 text-xs disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      {!loading && cases.length === 0 && <p className="rounded-xl border border-border-token p-5 text-sm text-text-secondary">No pending identity cases.</p>}
      <div className="space-y-4">
        {cases.map(identityCase => {
          const escalation = identityCase.status === 'ESCALATION_PENDING';
          const canSeniorReview = session?.role === 'super_admin' && escalation;
          const canNormalReview = session?.role === 'kyc_reviewer' && !escalation;
          const canDecide = canSeniorReview || canNormalReview;
          return (
            <article key={identityCase.uid} className="space-y-4 rounded-2xl border border-border-token bg-surface p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Claimant account: {identityCase.uid}</p>
                  <p className="mt-1 text-xs text-text-secondary">{identityCase.documentType.replaceAll('_', ' ')} · {identityCase.status}</p>
                  <p className="mt-1 text-[11px] text-text-muted">Submitted {identityCase.submittedAt?.toDate?.().toLocaleString('en-NP') ?? 'time unavailable'}</p>
                </div>
                <span className="rounded-full border border-border-token px-2 py-1 text-[10px] uppercase">{identityCase.status}</span>
              </header>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><p className="text-xs font-semibold">Government ID</p><EvidencePreview label="Government ID" path={identityCase.evidence?.idPath} /></div>
                <div className="space-y-2"><p className="text-xs font-semibold">Fresh selfie</p><EvidencePreview label="Selfie" path={identityCase.evidence?.selfiePath} /></div>
              </div>
              {canDecide ? (
                <div className="space-y-3 border-t border-border-token pt-4">
                  {identityCase.status !== 'ESCALATION_PENDING' && (
                    <label className="block text-xs text-text-secondary">
                      Document number as shown on the ID (used only to derive the person key; not saved)
                      <input type="password" autoComplete="off" value={documentNumbers[identityCase.uid] ?? ''} onChange={event => setDocumentNumbers(previous => ({ ...previous, [identityCase.uid]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-border-token bg-background px-3 py-2 text-sm" />
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {identityCase.status !== 'ESCALATION_PENDING' && <button type="button" disabled={busyUid === identityCase.uid || !documentNumbers[identityCase.uid]?.trim()} onClick={() => void act(identityCase, 'APPROVE')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button>}
                    <button type="button" disabled={busyUid === identityCase.uid} onClick={() => void act(identityCase, 'REJECT')} className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50">Reject</button>
                    {identityCase.status !== 'ESCALATION_PENDING' && <button type="button" disabled={busyUid === identityCase.uid} onClick={() => void act(identityCase, 'ESCALATE')} className="rounded-lg border border-border-token px-3 py-2 text-xs font-semibold disabled:opacity-50">Escalate</button>}
                  </div>
                </div>
              ) : <p className="border-t border-border-token pt-3 text-xs text-text-secondary">This case is outside the current role’s decision scope.</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
