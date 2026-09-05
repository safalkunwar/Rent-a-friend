import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { companionApplicationRepository } from '../../repositories/CompanionApplicationRepository';
import type { CompanionApplication } from '../../types';
import { CompanionApplicationModal } from '../companions/CompanionApplicationModal';

interface CompanionApplicationCardProps {
  userId: string;
  role?: string;
  userName?: string;
  onToast: (message: string, type?: string) => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  NOT_APPLIED: { label: 'Not applied', className: 'bg-surface-elevated text-text-secondary border-border-token' },
  PENDING: { label: 'Submitted — awaiting review', className: 'bg-warning/10 border-warning/50 text-warning' },
  UNDER_REVIEW: { label: 'Under review', className: 'bg-primary-action/10 border-primary-action/40 text-primary-action' },
  CHANGES_REQUIRED: { label: 'Changes required', className: 'bg-danger/10 border-danger/50 text-danger' },
  APPROVED: { label: 'Approved — Companion active', className: 'bg-success/10 border-success/50 text-success' },
  REJECTED: { label: 'Rejected', className: 'bg-danger/10 border-danger/50 text-danger' },
};

export const CompanionApplicationCard: React.FC<CompanionApplicationCardProps> = ({ userId, role, userName = '', onToast }) => {
  const [applications, setApplications] = useState<CompanionApplication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    companionApplicationRepository
      .listMine(userId)
      .then(apps => active && setApplications(apps))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId, showForm]);

  if (role === 'companion') {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/5 p-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-success shrink-0" />
        <p className="text-xs text-text-secondary">
          <span className="font-bold text-success">Verified Companion.</span> Your professional profile is live.
        </p>
      </div>
    );
  }

  const latest = applications.find(a => a.status !== 'DRAFT') || applications[0];
  const statusKey = latest?.status ?? (applications.length > 0 ? 'PENDING' : 'NOT_APPLIED');
  const badge = STATUS_LABELS[statusKey] || STATUS_LABELS.NOT_APPLIED;

  const completenessFields = [userName.trim().length > 1];
  void completenessFields;

  return (
    <>
      <div className="rounded-2xl border border-border-token/60 bg-surface-elevated/40 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary-action" /> Become a SATHI Companion
            </h3>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">
              Earn by sharing your city. Submit an application — our team reviews every companion manually.
            </p>
          </div>
        </div>

        {!loading && (
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold ${badge.className}`}>
              {badge.label}
            </span>
            {(statusKey === 'CHANGES_REQUIRED' || statusKey === 'REJECTED') && (
              <button
                onClick={() => setShowForm(true)}
                className="px-3 py-1.5 rounded-xl bg-primary-action text-background text-[11px] font-black uppercase tracking-wide"
              >
                Update Application
              </button>
            )}
            {statusKey === 'NOT_APPLIED' && (
              <button
                onClick={() => setShowForm(true)}
                className="px-3 py-1.5 rounded-xl bg-primary-action text-background text-[11px] font-black uppercase tracking-wide"
              >
                Apply Now
              </button>
            )}
          </div>
        )}

        {latest?.requestedChanges && (
          <p className="text-[11px] bg-warning/10 border border-warning/30 text-warning rounded-lg p-2 leading-relaxed">
            <span className="font-bold">Reviewer note:</span> {latest.requestedChanges}
          </p>
        )}
        {latest?.rejectionReason && (
          <p className="text-[11px] bg-danger/10 border border-danger/30 text-danger rounded-lg p-2 leading-relaxed">
            <span className="font-bold">Reason:</span> {latest.rejectionReason}
          </p>
        )}
      </div>

      {showForm && (
        <CompanionApplicationModal
          onClose={() => setShowForm(false)}
          onSubmitted={() => onToast('Application submitted for review.', 'success')}
        />
      )}
    </>
  );
};
