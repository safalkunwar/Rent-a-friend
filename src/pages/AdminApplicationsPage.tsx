import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Search, Check, X, PenLine } from 'lucide-react';
import { AdminGuard } from '../components/guards/AdminGuard';
import { companionApplicationRepository, type ApplicationReviewAction } from '../repositories/CompanionApplicationRepository';
import type { CompanionApplication, CompanionApplicationStatus } from '../types';
import { requireUid } from '../services/identity';
import { PrivateKycPreview } from '../components/companions/PrivateKycPreview';

const STATUS_TABS: Array<CompanionApplicationStatus | 'ALL'> = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'CHANGES_REQUIRED',
  'APPROVED',
  'REJECTED',
  'ALL',
];

const AdminApplicationsPageInner: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<CompanionApplicationStatus | 'ALL'>('SUBMITTED');
  const [search, setSearch] = useState('');
  const [applications, setApplications] = useState<CompanionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ app: CompanionApplication; action: Exclude<ApplicationReviewAction, never> } | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [busy, setBusy] = useState(false);

  // Server-side status filter; search narrows the current page client-side.
  useEffect(() => {
    let active = true;
    setLoading(true);
    companionApplicationRepository
      .adminList(statusFilter)
      .then(apps => active && setApplications(apps))
      .catch(() => active && setApplications([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(a =>
      a.id.toLowerCase().includes(q) ||
      a.userId.toLowerCase().includes(q) ||
      (a.applicationData?.displayName || '').toLowerCase().includes(q) ||
      (a.kyc?.legalFullName || '').toLowerCase().includes(q)
    );
  }, [applications, search]);

  const runReview = async () => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      await companionApplicationRepository.review(actionTarget.action, actionTarget.app.id, {
        id: requireUid(),
        role: 'reviewer',
      }, {
        reason: reasonInput.trim() || undefined,
        requestedChanges: reasonInput.trim() || undefined,
      });
      setApplications(prev => prev.filter(a => a.id !== actionTarget.app.id));
      setActionTarget(null);
      setReasonInput('');
    } catch (err) {
      console.error('[AdminApplications] review failed:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 h-[62px] bg-background border-b border-white/5">
        <h1 className="flex items-center gap-2 text-sm font-black">
          <ShieldCheck className="w-4 h-4 text-primary-action" /> Companion Applications
        </h1>
        <button onClick={() => navigate('/')} className="text-xs text-text-secondary hover:text-text-primary">Exit</button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${statusFilter === tab ? 'bg-primary-action text-background border-primary-action' : 'border-border-token/50 text-text-secondary hover:text-text-primary'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search id / user / name"
              aria-label="Search applications"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-elevated border border-border-token/60 text-xs focus:outline-none focus:border-primary-action"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-text-secondary animate-pulse py-8 text-center">Loading applications…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-xs text-text-secondary">No applications in this view.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map(app => (
              <div key={app.id} className="bg-surface border border-border-token/50 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{app.applicationData?.displayName || app.kyc?.legalFullName || app.id}</p>
                    <p className="text-[10px] text-text-muted font-mono truncate">{app.userId} · {app.id}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full border border-border-token bg-surface-elevated font-bold shrink-0">{app.status}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div><span className="block text-text-muted">City</span>{app.applicationData?.location || '—'}</div>
                  <div><span className="block text-text-muted">Rate</span>NPR {app.applicationData?.hourlyRate ?? '—'}</div>
                  <div><span className="block text-text-muted">Categories</span>{(app.applicationData?.categories || []).join(', ') || '—'}</div>
                  <div><span className="block text-text-muted">KYC Doc</span>{app.kyc?.documentType || '—'} ••••{String(app.kyc?.documentNumberMasked || '').slice(-4)}</div>
                </div>
                {app.kyc?.documentFileUrl && <PrivateKycPreview path={app.kyc.documentFileUrl} />}
                {app.applicationData?.bio && (
                  <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">{app.applicationData.bio}</p>
                )}

                {['SUBMITTED', 'UNDER_REVIEW'].includes(app.status) && (
                  <div className="pt-2 border-t border-border-token/40 flex flex-wrap gap-2">
                    <button onClick={() => setActionTarget({ app, action: 'approve' })} className="px-3 py-1.5 rounded-xl bg-success/15 text-success border border-success/40 text-[11px] font-black flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Approve</button>
                    <button onClick={() => setActionTarget({ app, action: 'request_changes' })} className="px-3 py-1.5 rounded-xl bg-warning/10 text-warning border border-warning/40 text-[11px] font-black flex items-center gap-1"><PenLine className="w-3.5 h-3.5" /> Request Changes</button>
                    <button onClick={() => setActionTarget({ app, action: 'reject' })} className="px-3 py-1.5 rounded-xl bg-danger/10 text-danger border border-danger/40 text-[11px] font-black flex items-center gap-1"><X className="w-3.5 h-3.5" /> Reject</button>
                  </div>
                )}
                {app.rejectionReason && <p className="text-[10px] text-danger">Reason: {app.rejectionReason}</p>}
                {app.requestedChanges && <p className="text-[10px] text-warning">Changes requested: {app.requestedChanges}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review action modal */}
      {actionTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="bg-surface border border-border-token rounded-2xl w-full max-w-md p-5 space-y-4">
            <h2 className="text-base font-extrabold capitalize">
              {actionTarget.action === 'approve' ? 'Approve' : actionTarget.action === 'reject' ? 'Reject' : 'Request Changes'} — {actionTarget.app.applicationData?.displayName || actionTarget.app.id}
            </h2>
            {actionTarget.action !== 'approve' && (
              <>
                <label htmlFor="review-reason" className="block text-[10px] uppercase tracking-wider font-bold text-text-secondary">
                  {actionTarget.action === 'reject' ? 'Rejection reason *' : 'Requested changes *'}
                </label>
                <textarea
                  id="review-reason"
                  rows={3}
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  placeholder="e.g., Identity document photo is unclear."
                  className="w-full bg-surface-elevated border border-border-token rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action resize-none"
                />
              </>
            )}
            {actionTarget.action === 'approve' && (
              <p className="text-xs text-text-secondary leading-relaxed">
                Approving will verify KYC, activate the user's public companion profile, and log this action to the audit trail.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => { setActionTarget(null); setReasonInput(''); }} disabled={busy} className="px-4 py-2 rounded-xl border border-border-token text-xs font-bold text-text-secondary hover:text-text-primary">
                Cancel
              </button>
              <button
                onClick={() => void runReview()}
                disabled={busy || (actionTarget.action !== 'approve' && !reasonInput.trim())}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wide disabled:opacity-40 ${actionTarget.action === 'approve' ? 'bg-success text-background' : 'bg-primary-action text-background'}`}
              >
                {busy ? 'Working…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminApplicationsPage: React.FC = () => (
  <AdminGuard requiredPermission="companions.verify">
    <AdminApplicationsPageInner />
  </AdminGuard>
);
