import React, { useState, useMemo } from 'react';
import { Search, ShieldCheck, UserX, UserCheck, Ban, Unlock, AlertTriangle } from 'lucide-react';
import { AdminUserRow } from '../types';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminPagination } from '../hooks/useAdminPagination';
import { useAdminAuth } from '../hooks/useAdmin';
import { VirtualizedTable } from '../components/VirtualizedTable';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

const PAGE_SIZE = 50;
const ROW_HEIGHT = 72;

type UserAction = 'warn' | 'restrict' | 'suspend' | 'restore' | 'ban' | 'unban';

export function AdminUsers() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<UserAction | ''>('');
  const [processing, setProcessing] = useState(false);

  const { items: users, loading, hasMore, nextPage, error } = useAdminPagination<AdminUserRow>(
    async ({ startAfter, limitCount }) => {
      const result = await adminRepository.listUsers(limitCount, startAfter);
      return { items: result.items as AdminUserRow[], lastVisible: result.lastVisible, hasMore: result.hasMore };
    },
    PAGE_SIZE
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const executeAction = async (action: UserAction, targetIds: string[]) => {
    if (!adminUser || !hasPerm('users.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(action, adminUser.uid)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    setProcessing(true);
    try {
      for (const userId of targetIds) {
        const idempotencyKey = idempotencyService.generateKey(action, userId, adminUser.uid);
        const existing = await idempotencyService.get(idempotencyKey);
        if (existing) {
          continue;
        }

        await adminRepository.updateUserRole(userId, action);
        await idempotencyService.set(idempotencyKey, action, userId, { success: true });

        await auditService.log({
          action: `user_${action}`,
          actorId: adminUser.uid,
          actorName: adminUser.displayName || 'Admin',
          targetType: 'user',
          targetId: userId,
          details: { action, count: targetIds.length },
        });
      }
      setSelectedIds([]);
      setBulkAction('');
    } catch (err: any) {
      console.error(`Failed to ${action} users:`, err);
      alert(`Failed to ${action} users: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;
    await executeAction(bulkAction, selectedIds);
  };

  const handleSingleAction = async (userId: string, action: UserAction) => {
    await executeAction(action, [userId]);
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">All Users</h3>
          {selectedIds.length > 0 && (
            <span className="text-xs bg-primary-action/20 text-primary-action px-2 py-0.5 rounded-full">
              {selectedIds.length} selected
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && hasPerm('users.write') && (
            <div className="flex items-center gap-2">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value as UserAction)} className="bg-surface-elevated border border-border-token text-text-primary text-xs rounded-lg px-3 py-1.5 outline-none">
                <option value="">Bulk action...</option>
                <option value="warn">Warn</option>
                <option value="restrict">Restrict</option>
                <option value="suspend">Suspend</option>
                <option value="restore">Restore</option>
                <option value="ban">Ban</option>
                <option value="unban">Unban</option>
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
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && users.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Loading users...</p>
        )}
        {error && (
          <p className="text-red-500 text-sm text-center py-8">{error}</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No users found.</p>
        )}

        {filtered.length > 0 && (
          <VirtualizedTable
            items={filtered}
            rowHeight={ROW_HEIGHT}
            containerHeight={Math.min(600, filtered.length * ROW_HEIGHT)}
            renderRow={(user) => (
              <div className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors border-b border-border-token/50">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(user.id)}
                    onChange={() => toggleSelect(user.id)}
                    className="w-4 h-4 rounded border-border-token bg-surface-elevated text-primary-action focus:ring-primary-action"
                  />
                  <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-border-token" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                  {hasPerm('users.write') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSingleAction(user.id, 'suspend')}
                        className="p-1.5 text-yellow-400 hover:text-yellow-300 rounded-lg hover:bg-yellow-500/10 transition-colors"
                        title="Suspend"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSingleAction(user.id, 'ban')}
                        className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Ban"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSingleAction(user.id, 'restore')}
                        className="p-1.5 text-green-400 hover:text-green-300 rounded-lg hover:bg-green-500/10 transition-colors"
                        title="Restore"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
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
