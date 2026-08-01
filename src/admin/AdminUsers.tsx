import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, UserCircle, Trash2 } from 'lucide-react';
import { firestore } from '../services/firestore';
import { User } from '../types';
import { auditService } from '../services/audit';

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState<string>('');

  useEffect(() => {
    const unsubscribe = firestore.subscribe<User>('users', {}, (items) => {
      setUsers(items);
    });
    return () => unsubscribe();
  }, []);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    await firestore.updateDocument(`users/${userId}`, { role });
    await auditService.log({
      action: 'update_user_role',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'user',
      targetId: userId,
      details: { role },
    });
  };

  const handleBulkRoleChange = async () => {
    if (!bulkRole || selectedIds.length === 0) return;
    await Promise.all(selectedIds.map(id => firestore.updateDocument(`users/${id}`, { role: bulkRole })));
    await auditService.log({
      action: 'bulk_update_user_role',
      actorId: 'admin',
      actorName: 'Admin',
      targetType: 'user',
      details: { role: bulkRole, count: selectedIds.length },
    });
    setSelectedIds([]);
    setBulkRole('');
  };

  return (
    <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-[#222] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1a1a1a]">
        <h3 className="font-semibold text-sm">All Users</h3>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} className="bg-[#222] border border-[#333] text-white text-xs rounded-lg px-3 py-1.5 outline-none">
                <option value="">Bulk role...</option>
                <option value="customer">Customer</option>
                <option value="companion">Companion</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={handleBulkRoleChange} className="px-3 py-1.5 bg-[#C8A25E] text-[#0F1113] text-xs font-bold rounded-lg hover:bg-[#B69150] transition-colors">Apply</button>
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 bg-[#222] text-gray-300 border border-[#333] text-xs rounded-lg hover:text-white transition-colors">Cancel</button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[#222] px-3 py-1.5 rounded-lg border border-[#333]">
            <Search className="w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-white outline-none w-32 md:w-auto" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No users found.</p>}
        {filtered.map(user => (
          <div key={user.id} className="p-4 bg-[#1a1a1a] rounded-xl border border-[#222] flex items-center justify-between hover:border-[#C8A25E]/50 transition-colors">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedIds.includes(user.id)}
                onChange={() => toggleSelect(user.id)}
                className="w-4 h-4 rounded border-[#333] bg-[#222] text-[#C8A25E] focus:ring-[#C8A25E]"
              />
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-[#222]" />
              <div>
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])} className="bg-[#222] border border-[#333] text-white text-xs rounded-lg px-3 py-1.5 outline-none">
                <option value="customer">Customer</option>
                <option value="companion">Companion</option>
                <option value="admin">Admin</option>
              </select>
              {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-[#C8A25E]" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
