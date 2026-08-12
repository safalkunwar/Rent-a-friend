import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, ShieldAlert, Eye, Ban, Unlock, UserX, UserCheck } from 'lucide-react';
import { AdminCompanionRow } from '../types';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminPagination } from '../hooks/useAdminPagination';
import { useAdminAuth } from '../hooks/useAdmin';
import { VirtualizedTable } from '../components/VirtualizedTable';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 72;

type CompanionAction = 'verify' | 'unverify' | 'suspend' | 'restore' | 'ban';

export function AdminCompanions() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<CompanionAction | ''>('');
  const [processing, setProcessing] = useState(false);

  const { items: companions, loading, hasMore, nextPage } = useAdminPagination<AdminCompanionRow>(
    async ({ startAfter, limitCount }) => {
      const result = await adminRepository.listCompanions(limitCount);
      return { items: result as AdminCompanionRow[], lastVisible: result[result.length - 1] || null, hasMore: result.length >= limitCount };
    },
    PAGE_SIZE
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return companions;
    const q = search.toLowerCase();
    return companions.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.location || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [companions, search]);

  const executeAction = async (action: CompanionAction, targetIds: string[]) => {
    if (!adminUser || !hasPerm('companions.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(action, adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    setProcessing(true);
    try {
      for (const companionId of targetIds) {
        const idempotencyKey = idempotencyService.generateKey(action, companionId, adminUser.uid);
        const existing = await idempotencyService.get(idempotencyKey);
        if (existing) continue;

        if (action === 'verify') {
          await adminRepository.toggleCompanionVerification(companionId, false);
        } else if (action === 'unverify') {
          await adminRepository.toggleCompanionVerification(companionId, true);
        } else {
          await adminRepository.updateDocument(`companions/${companionId}`, { status: action, updatedAt: new Date().toISOString() });
        }

        await idempotencyService.set(idempotencyKey, action, companionId, { success: true });

        await auditService.log({
          action: `companion_${action}`,
          actorId: adminUser.uid,
          actorName: adminUser.displayName || 'Admin',
          targetType: 'companion',
          targetId: companionId,
          details: { action, count: targetIds.length },
        });
      }
      setSelectedIds([]);
      setBulkAction('');
    } catch (err: any) {
      console.error(`Failed to ${action} companions:`, err);
      alert(`Failed to ${action} companions: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    await executeAction(bulkAction, selectedIds);
  };

  const handleSingleAction = async (companionId: string, action: CompanionAction) => {
    await executeAction(action, [companionId]);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'suspended': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'banned': return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
      default: return 'bg-surface-elevated text-text-secondary border-border-token';
    }
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">All Companions</h3>
          {selectedIds.length > 0 && (
            <span className="text-xs bg-primary-action/20 text-primary-action px-2 py-0.5 rounded-full">
              {selectedIds.length} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && hasPerm('companions.write') && (
            <div className="flex items-center gap-2">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as CompanionAction)} className="bg-surface-elevated border border-border-token text-text-primary text-xs rounded-lg px-3 py-1.5 outline-none">
                <option value="">Bulk action...</option>
                <option value="verify">Verify</option>
                <option value="unverify">Unverify</option>
                <option value="suspend">Suspend</option>
                <option value="restore">Restore</option>
                <option value="ban">Ban</option>
              </select>
              <button onClick={handleBulkAction} disabled={processing} className="px-3 py-1.5 bg-primary-action text-background text-xs font-bold rounded-lg hover:bg-primary-action-hover transition-colors disabled:opacity-50">
                {processing ? 'Processing...' : 'Apply'}
              </button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-surface-elevated text-text-secondary border border-border-token text-xs rounded-lg hover:text-text-primary transition-colors">
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search companions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && companions.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Loading companions...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No companions found.</p>
        )}

        {filtered.length > 0 && (
          <VirtualizedTable
            items={filtered}
            rowHeight={ROW_HEIGHT}
            containerHeight={Math.min(600, filtered.length * ROW_HEIGHT)}
            renderRow={(companion) => (
              <div className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors border-b border-border-token/50">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(companion.id)}
                    onChange={() => setSelectedIds(prev => prev.includes(companion.id) ? prev.filter(x => x !== companion.id) : [...prev, companion.id])}
                    className="w-4 h-4 rounded border-border-token bg-surface-elevated text-primary-action focus:ring-primary-action"
                  />
                  <img src={companion.imageUrl} alt={companion.name} className="w-10 h-10 rounded-full object-cover border border-border-token" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{companion.name} • {companion.location}</p>
                    <p className="text-xs text-gray-400">NPR {companion.hourlyRate}/hr • {companion.languages?.join(', ') || ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(companion.status)}`}>
                    {companion.status || 'active'}
                  </span>
                  {hasPerm('companions.write') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSingleAction(companion.id, companion.isVerified ? 'unverify' : 'verify')}
                        disabled={processing}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${companion.isVerified ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10' : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'}`}
                        title={companion.isVerified ? 'Unverify' : 'Verify'}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSingleAction(companion.id, companion.status === 'suspended' || companion.status === 'banned' ? 'restore' : 'suspend')}
                        disabled={processing}
                        className="p-1.5 text-yellow-400 hover:text-yellow-300 rounded-lg hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                        title="Suspend/Restore"
                      >
                        {companion.status === 'suspended' || companion.status === 'banned' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleSingleAction(companion.id, companion.status === 'banned' ? 'restore' : 'ban')}
                        disabled={processing}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${companion.status === 'banned' ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'}`}
                        title={companion.status === 'banned' ? 'Unban' : 'Ban'}
                      >
                        {companion.status === 'banned' ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          />
        )}
      </div>

      {hasMore && (
        <div className="p-4 border-t border-border-token flex justify-center">
          <button onClick={nextPage} disabled={loading} className="px-6 py-2 bg-primary-action text-background text-xs font-bold rounded-lg hover:bg-primary-action-hover transition-colors disabled:opacity-50">
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
