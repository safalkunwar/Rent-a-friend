import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Eye, X } from 'lucide-react';
import { AdminContentRow } from '../types';
import { useToast } from '../components/ui/Toast';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

interface ContentFormData {
  title: string;
  description: string;
  location: string;
  category: string;
  date: string;
  time: string;
  avgPrice: number;
  duration: string;
  spots: number;
  imageUrl: string;
}

const emptyForm: ContentFormData = {
  title: '',
  description: '',
  location: '',
  category: '',
  date: '',
  time: '',
  avgPrice: 0,
  duration: '',
  spots: 5,
  imageUrl: '',
};

export function AdminContent() {
  const { showToast } = useToast();
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [activities, setActivities] = useState<AdminContentRow[]>([]);
  const [events, setEvents] = useState<AdminContentRow[]>([]);
  const [tab, setTab] = useState<'activities' | 'events'>('activities');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<ContentFormData>(emptyForm);

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

  const openCreateForm = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      location: item.location || '',
      category: item.category || '',
      date: item.date || '',
      time: item.time || '',
      avgPrice: item.avgPrice || 0,
      duration: item.duration || '',
      spots: item.spots || 5,
      imageUrl: item.imageUrl || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !hasPerm('content.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction('content_save', adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey('content_save', editingItem?.id || 'new', adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      const collection = tab === 'activities' ? 'activities' : 'events';
      const data = {
        ...formData,
        updatedAt: new Date().toISOString(),
        ...(editingItem ? {} : { createdAt: new Date().toISOString() }),
      };

      if (editingItem) {
        await adminRepository.updateDocument(`${collection}/${editingItem.id}`, data);
        showToast('Item updated successfully', 'success');
      } else {
        const id = `${tab === 'activities' ? 'a' : 'e'}${Date.now()}`;
        await adminRepository.setDocument(`${collection}/${id}`, { id, ...data });
        showToast('Item created successfully', 'success');
      }

      await idempotencyService.set(idempotencyKey, 'content_save', editingItem?.id || 'new', { success: true });

      await auditService.log({
        action: editingItem ? 'content_update' : 'content_create',
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'content',
        targetId: editingItem?.id || 'new',
        details: { collection: tab, title: formData.title },
      });

      const [acts, evts] = await Promise.all([
        adminRepository.listActivities(100),
        adminRepository.listEvents(100),
      ]);
      setActivities(acts as AdminContentRow[]);
      setEvents(evts as AdminContentRow[]);
      setShowForm(false);
      setEditingItem(null);
      setFormData(emptyForm);
    } catch (err: any) {
      console.error('Failed to save content:', err);
      showToast(`Failed to save: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

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
              <button onClick={openCreateForm} className="flex items-center gap-1 px-3 py-1.5 bg-primary-action text-background text-xs font-bold rounded-lg hover:bg-primary-action-hover transition-colors">
                <Plus className="w-3 h-3" /> New
              </button>
            )}
          </div>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No {tab} found.</p>}
          {filtered.map((item, idx) => (
            <div key={item.id || `${tab}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token flex items-center justify-between hover:border-primary-action/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-text-primary">{item.title}</p>
                <p className="text-xs text-text-secondary">{tab === 'activities' ? `${item.duration || ''} • NPR ${item.avgPrice || 0}/hr` : `${item.date || ''} • ${item.location || ''}`}</p>
              </div>
              <div className="flex items-center gap-2">
                {hasPerm('content.read') && (
                  <button className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors"><Eye className="w-4 h-4" /></button>
                )}
                {hasPerm('content.write') && (
                  <>
                    <button onClick={() => openEditForm(item)} disabled={processing} className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors disabled:opacity-50"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => executeDelete(item.id)} disabled={processing} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingItem(null); setFormData(emptyForm); }}>
          <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-token flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary">{editingItem ? 'Edit' : 'New'} {tab === 'activities' ? 'Activity' : 'Event'}</h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); setFormData(emptyForm); }} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Title</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Category</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Time</label>
                  <input type="text" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} placeholder="e.g. 10:00 AM" className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
              </div>
              {tab === 'activities' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Price (NPR)</label>
                    <input type="number" value={formData.avgPrice} onChange={(e) => setFormData({ ...formData, avgPrice: Number(e.target.value) })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Duration</label>
                    <input type="text" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="e.g. 2 hours" className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                  </div>
                </div>
              )}
              {tab === 'events' && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Spots</label>
                  <input type="number" value={formData.spots} onChange={(e) => setFormData({ ...formData, spots: Number(e.target.value) })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Image URL</label>
                <input type="text" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setFormData(emptyForm); }} className="flex-1 py-3 bg-surface-elevated text-text-secondary rounded-xl font-bold hover:bg-border-token transition-colors uppercase tracking-wider text-sm border border-border-token">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors uppercase tracking-wider text-sm disabled:opacity-50">{processing ? 'Saving...' : editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}