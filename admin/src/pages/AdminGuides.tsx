import React, { useEffect, useMemo, useState } from 'react';
import { AdminCompanionRow, AdminGuideApplication } from '../types';
import { adminRepository } from '../repositories/AdminRepository';

/** Historical guideApplications are not the canonical companion review workflow. */
export function AdminGuides() {
  const [guides, setGuides] = useState<AdminCompanionRow[]>([]);
  const [applications, setApplications] = useState<AdminGuideApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([adminRepository.listCompanions(100), adminRepository.listGuideApplications(100)])
      .then(([companions, guideApplications]) => {
        if (!active) return;
        setGuides(companions as AdminCompanionRow[]);
        setApplications(guideApplications as AdminGuideApplication[]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const pendingApplications = useMemo(
    () => applications.filter(application => application.status === 'pending'),
    [applications]
  );

  return (
    <div className="space-y-6">
      <p className="bg-surface border border-border-token rounded-xl px-5 py-4 text-sm text-text-secondary">
        This is a read-only view of historical guide records. Their status and companion verification flags do not establish KYC approval or Guide eligibility. Review decisions require the canonical application workflow and verified evidence.
      </p>
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-token">
          <h3 className="font-semibold text-sm">Pending legacy Guide Applications ({pendingApplications.length})</h3>
        </div>
        <div className="divide-y divide-border-token">
          {loading && <p className="text-gray-500 text-sm text-center py-4">Loading applications...</p>}
          {!loading && pendingApplications.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No pending applications.</p>}
          {pendingApplications.map(application => (
            <div key={application.id} className="p-5">
              <p className="text-sm font-semibold">{application.name}</p>
              <p className="text-xs text-gray-400 mt-1">{application.location} • Applied: {application.appliedDate || 'Unknown'}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-token">
          <h3 className="font-semibold text-sm">Historical Companion Profiles ({guides.length})</h3>
        </div>
        <div className="divide-y divide-border-token">
          {guides.map(guide => (
            <div key={guide.id} className="p-5">
              <p className="text-sm font-semibold">{guide.name}</p>
              <p className="text-xs text-gray-400 mt-1">{guide.location} • Legacy verification flag: {guide.isVerified ? 'set' : 'unset'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
