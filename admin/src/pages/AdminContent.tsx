import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { AdminContentRow } from '../types';
import { useToast } from '../components/ui/Toast';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

export function AdminContent() {
  const { showToast } = useToast();
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [activities, setActivities] = useState<AdminContentRow[]>([]);
  const [events, setEvents] = useState<AdminContentRow[]>([]);
  const [tab, setTab] = useState<'activities' | 'events'>('activities');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [acts, evts] = await Promise.all([
        adminRepository.listActivities(100),
        adminRepository.listEvents(100),
      ]);
      setActivities(acts as AdminContentRow[]);
      setEvents(evts as AdminContentRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (tab === 'activities') {
      return activities.filter(a => (a.title || '').toLowerCase().includes(q));
    }
    return events.filter(e => (e.title || '').toLowerCase().includes(q));
  }, [activities, events, search, tab]);

  const executeDelete = async (id: string) => {
    if (!adminUser || !hasPerm('content.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction('content_delete', adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey('content_delete', id, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      await adminRepository.deleteContentItem(tab === 'activities' ? 'activities' : 'events', id);
      await idempotencyService.set(idempotencyKey, 'content_delete', id, { success: true });

      await auditService.log({
        action: 'content_delete',
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'content',
        targetId: id,
        details: { collection: tab },
      });

      if (tab === 'activities') {
        setActivities(prev => prev.filter(a => a.id !== id));
      } else {
        setEvents(prev => prev.filter(e => e.id !== id));
      }
      showToast('Item deleted', 'success');
    } catch (err: any) {
      console.error('Failed to delete content:', err);
      showToast('Failed to delete item', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-background border border-border-token p-1 rounded-xl w-fit">
        <button onClick={() => setTab('activities')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'activities' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Activities</button>
        <button onClick={() => setTab('events')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'events' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Events</button>
      </div>

      <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
          <h3 className="font-semibold text-sm capitalize">{tab}</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
              <Search className="w-4 h-4 text-gray-500" />
              <input type="text" placeholder={`Search ${tab}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto" />
            </div>
            {hasPerm('content.write') && (
              <button onClick={() => showToast('Create feature coming soon', 'info')} className="flex items-center gap-1 px-3 py-1.5 bg-primary-action text-background text-xs font-bold rounded-lg hover:bg-primary-action-hover transition-colors">
                <Plus className="w-3 h-3" /> New
              </button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No {tab} found.</p>}
          {filtered.map((item, idx) => (
            <div key={`${item.id || tab}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token flex items-center justify-between hover:border-primary-action/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-text-primary">{item.title}</p>
                <p className="text-xs text-text-secondary">{tab === 'activities' ? `${(item as AdminContentRow).duration} • NPR ${(item as AdminContentRow).avgPrice}/hr` : `${item.date} • ${item.location}`}</p>
              </div>
              <div className="flex items-center gap-2">
                {hasPerm('content.read') && (
                  <button className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors"><Eye className="w-4 h-4" /></button>
                )}
                {hasPerm('content.write') && (
                  <>
                    <button onClick={() => showToast('Edit feature coming soon', 'info')} className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => executeDelete(item.id)} disabled={processing} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
