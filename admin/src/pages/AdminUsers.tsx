import React, { useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { AdminUserRow } from '../types';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminPagination } from '../hooks/useAdminPagination';

const PAGE_SIZE = 20;

export function AdminUsers() {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState<string>('');

  const { items: users, loading, hasMore, nextPage, error } = useAdminPagination<AdminUserRow>(
    async ({ startAfter, limitCount }) => {
      const result = await adminRepository.listUsers(limitCount, startAfter);
      return { items: result.items as AdminUserRow[], lastVisible: result.lastVisible, hasMore: result.hasMore };
    },
    PAGE_SIZE
  );

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await adminRepository.updateUserRole(userId, role);
  };

  const handleBulkRoleChange = async () => {
    if (!bulkRole || selectedIds.length === 0) return;
    await adminRepository.bulkUpdateUserRole(selectedIds, bulkRole);
    setSelectedIds([]);
    setBulkRole('');
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
        <h3 className="font-semibold text-sm">All Users</h3>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className="bg-surface-elevated border border-border-token text-text-primary text-xs rounded-lg px-3 py-1.5 outline-none">
                <option value="">Bulk role...</option>
                <option value="customer">Customer</option>
                <option value="companion">Companion</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleBulkRoleChange} className="px-3 py-1.5 bg-primary-action text-background text-xs font-bold rounded-lg hover:bg-primary-action-hover transition-colors">Apply</button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-surface-elevated text-text-secondary border border-border-token text-xs rounded-lg hover:text-text-primary transition-colors">Cancel</button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {loading && users.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Loading users...</p>}
        {error && <p className="text-red-500 text-sm text-center py-8">{error}</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No users found.</p>}
        {filtered.map((user, idx) => (
          <div key={`${user.id || 'u'}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token flex items-center justify-between hover:border-primary-action/50 transition-colors">
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
              <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} className="bg-surface-elevated border border-border-token text-text-primary text-xs rounded-lg px-3 py-1.5 outline-none">
                <option value="customer">Customer</option>
                <option value="companion">Companion</option>
                <option value="admin">Admin</option>
              </select>
              {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-primary-action" />}
            </div>
          </div>
        ))}
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