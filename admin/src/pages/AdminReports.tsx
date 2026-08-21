import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, AlertTriangle, Eye, Flag, MessageSquare, ShieldAlert, CalendarDays, Users, UserCheck } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';
import { AdminReportRow } from '../types';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 80;

type ReportStatus = 'open' | 'triaged' | 'under_review' | 'escalated' | 'resolved' | 'dismissed';
type ReportType = 'user' | 'companion' | 'post' | 'comment' | 'message' | 'booking' | 'safety' | 'other';

export function AdminReports() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await adminRepository.listReports(PAGE_SIZE);
        setReports(data as AdminReportRow[]);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = reports;
    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter(r => r.targetType === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => 
        (r.id || '').toLowerCase().includes(q) ||
        (r.targetId || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [reports, search, statusFilter, typeFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const executeReportAction = async (reportId: string, action: string) => {
    if (!adminUser || !hasPerm('content.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(action, adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(action, reportId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      await adminRepository.updateReportStatus(reportId, action);
      await idempotencyService.set(idempotencyKey, action, reportId, { success: true });

      await auditService.log({
        action: `report_${action}`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'report',
        targetId: reportId,
        details: { action },
      });

      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: action } : r));
    } catch (err: any) {
      console.error(`Failed to ${action} report:`, err);
      alert(`Failed to ${action} report: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'triaged': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'under_review': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'escalated': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'dismissed': return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user': return <Users className="w-3.5 h-3.5" />;
      case 'companion': return <UserCheck className="w-3.5 h-3.5" />;
      case 'post': return <Flag className="w-3.5 h-3.5" />;
      case 'comment': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'safety': return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'booking': return <CalendarDays className="w-3.5 h-3.5" />;
      default: return <AlertTriangle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">Reports Center</h3>
          {reports.filter(r => r.status === 'open').length > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
              {reports.filter(r => r.status === 'open').length} open
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-elevated px-2 py-1.5 rounded-lg border border-border-token">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as ReportStatus | 'all'); setPage(1); }} className="bg-transparent text-xs text-text-primary outline-none">
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="triaged">Triaged</option>
              <option value="under_review">Under Review</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search reports..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading reports...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No reports found.</p>}

        {!loading && paginated.length > 0 && (
          <div className="divide-y divide-border-token">
            {paginated.map((report, idx) => (
              <div key={`${report.id || 'r'}-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-500">{report.id}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-[10px] text-gray-500 capitalize flex items-center gap-1">
                      {getTypeIcon(report.targetType)} {report.targetType}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary truncate">{report.reason || 'No reason provided'}</p>
                  <p className="text-xs text-gray-500 mt-1">Target: {report.targetId} • {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : ''}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPerm('content.write') && report.status !== 'resolved' && report.status !== 'dismissed' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => executeReportAction(report.id, 'resolved')}
                        disabled={processing}
                        className="px-2 py-1 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10 transition-colors text-xs disabled:opacity-50"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => executeReportAction(report.id, 'dismissed')}
                        disabled={processing}
                        className="px-2 py-1 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-500/10 transition-colors text-xs disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-4 border-t border-border-token flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading} className="px-4 py-2 bg-surface-elevated text-text-secondary border border-border-token text-xs rounded-lg hover:text-text-primary transition-colors disabled:opacity-50">
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="px-4 py-2 bg-surface-elevated text-text-secondary border border-border-token text-xs rounded-lg hover:text-text-primary transition-colors disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
