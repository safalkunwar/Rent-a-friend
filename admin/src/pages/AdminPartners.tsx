import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, Eye } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

export function AdminPartners() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [partners, setPartners] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await adminRepository.listPartners(100);
      setPartners(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return partners;
    const q = search.toLowerCase();
    return partners.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.loc || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }, [partners, search]);

  const executeDelete = async (partnerId: string) => {
    if (!adminUser || !hasPerm('content.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction('partner_delete', adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey('partner_delete', partnerId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      await adminRepository.deletePartner(partnerId);
      await idempotencyService.set(idempotencyKey, 'partner_delete', partnerId, { success: true });

      await auditService.log({
        action: 'partner_delete',
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'partner',
        targetId: partnerId,
        details: {},
      });

      setPartners(prev => prev.filter(p => p.id !== partnerId));
    } catch (err: any) {
      console.error('Failed to delete partner:', err);
      alert(`Failed to delete partner: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
        <h3 className="font-semibold text-sm">Partners ({partners.length})</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search partners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading partners...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No partners found.</p>}

        {filtered.length > 0 && (
          <div className="divide-y divide-border-token">
            {filtered.map((partner, idx) => (
              <div key={partner.id || `partner-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {partner.imageUrl && (
                    <img src={partner.imageUrl} alt={partner.name} className="w-10 h-10 rounded-lg object-cover border border-border-token" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{partner.name}</p>
                    <p className="text-xs text-gray-400">{partner.loc} • {partner.category}</p>
                    <p className="text-xs text-gray-500 truncate">{partner.disc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPerm('content.write') && (
                    <button onClick={() => executeDelete(partner.id)} disabled={processing} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
