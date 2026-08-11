import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Search, FileText, StickyNote } from 'lucide-react';
import { AdminCompanionRow, AdminGuideApplication } from './types';
import { adminRepository } from './AdminRepository';

export function AdminGuides() {
  const [selectedGuide, setSelectedGuide] = useState<AdminGuideApplication | null>(null);
  const [guides, setGuides] = useState<AdminCompanionRow[]>([]);
  const [applications, setApplications] = useState<AdminGuideApplication[]>([]);
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [companionsData, appsData] = await Promise.all([
        adminRepository.listCompanions(100),
        adminRepository.listGuideApplications(100),
      ]);
      setGuides(companionsData as AdminCompanionRow[]);
      setApplications(appsData as AdminGuideApplication[]);
      setLoading(false);
    };
    load();
  }, []);

  const handleApprove = async (app: AdminGuideApplication) => {
    await adminRepository.approveGuideApplication(app.id, app.companionId);
    setSelectedGuide(null);
    setAdminNote('');
  };

  const handleReject = async (app: AdminGuideApplication) => {
    await adminRepository.rejectGuideApplication(app.id);
    setSelectedGuide(null);
    setAdminNote('');
  };

  return (
    <div className="space-y-6">
      {/* Pending Guides */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center">
          <h3 className="font-semibold text-sm">Pending Guide Applications</h3>
        </div>

        <div className="divide-y divide-border-token">
          {loading && <p className="text-gray-500 text-sm text-center py-4">Loading applications...</p>}
          {!loading && applications.filter(a => a.status === 'pending').length === 0 && <p className="text-gray-500 text-sm text-center py-4">No pending applications.</p>}
          {applications.filter(a => a.status === 'pending').map((app, idx) => (
            <div key={`${app.id || 'app'}-${idx}`} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-elevated/30 transition-colors">
              <div>
                <p className="text-sm font-semibold">{app.name}</p>
                <p className="text-xs text-gray-400 mt-1">{app.email} • {app.location}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedGuide(app)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-surface-elevated text-gray-300 border border-border-token rounded-lg text-xs font-medium hover:text-text-primary hover:border-primary-action transition-colors"
                >
                  <Search className="w-3 h-3" /> Review KYC
                </button>
                <button onClick={() => handleApprove(app)} className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors">
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button onClick={() => handleReject(app)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Guides */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden mt-8">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center">
          <h3 className="font-semibold text-sm">Active Guides ({guides.length})</h3>
        </div>
        <div className="divide-y divide-border-token">
          {guides.map((guide, idx) => (
            <div key={`${guide.id || 'guide'}-${idx}`} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-elevated/30 transition-colors opacity-80">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">{guide.name} {guide.isVerified && <ShieldAlert className="w-3 h-3 text-green-500" />}</p>
                <p className="text-xs text-gray-400 mt-1">{guide.location} • {guide.isVerified ? 'Verified' : 'Unverified'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 px-3 py-1.5 bg-surface-elevated text-gray-300 border border-border-token rounded-lg text-xs font-medium hover:text-text-primary hover:border-primary-action transition-colors">
                  Edit
                </button>
                <button className="px-3 py-1.5 rounded-lg text-red-500 text-xs border border-red-500/20 hover:bg-red-500/10 transition-colors">
                  Suspend
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KYC Review Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border-token flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                KYC Review: {selectedGuide.name}
              </h2>
              <button onClick={() => setSelectedGuide(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Basic Info</h4>
                <div className="bg-surface border border-border-token rounded-xl p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Name:</span><span className="text-sm">{selectedGuide.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Email:</span><span className="text-sm">{selectedGuide.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Location:</span><span className="text-sm">{selectedGuide.location}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400 text-sm">Applied:</span><span className="text-sm">{selectedGuide.appliedDate}</span></div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Documents</h4>
                <div className="bg-surface border border-border-token rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary-action" />
                    <div>
                      <p className="text-sm font-medium">Citizenship/Passport</p>
                      <p className="text-xs text-gray-500">doc_front_back.pdf</p>
                    </div>
                  </div>
                  <button className="text-xs text-primary-action font-medium border border-primary-action/50 px-3 py-1.5 rounded-lg hover:bg-primary-action/10">View</button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Admin Notes</h4>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add notes about this application..."
                  className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => handleReject(selectedGuide)}
                  className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500/20 transition-colors uppercase tracking-wider text-sm border border-red-500/20"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedGuide)}
                  className="flex-1 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors uppercase tracking-wider text-sm"
                >
                  Approve Guide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
