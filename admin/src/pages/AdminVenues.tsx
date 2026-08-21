import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, Hotel } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { useToast } from '../components/ui/Toast';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

interface VenueFormData {
  id: string;
  name: string;
  cityId: string;
  location: string;
  rating: number;
  priceRange: string;
  amenities?: string[];
  cuisine?: string;
  type?: string;
  imageUrl?: string;
}

const emptyForm: VenueFormData = {
  id: '',
  name: '',
  cityId: '',
  location: '',
  rating: 0,
  priceRange: '$$',
  amenities: [],
  cuisine: '',
  type: '',
  imageUrl: '',
};

type VenueType = 'hotels' | 'restaurants' | 'cafes';

export function AdminVenues({ type }: { type: VenueType }) {
  const { showToast } = useToast();
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<VenueFormData>(emptyForm);

  const collectionName = type;
  const title = type === 'hotels' ? 'Hotels' : type === 'restaurants' ? 'Restaurants' : 'Cafes';

  useEffect(() => {
    const load = async () => {
      let data: any[] = [];
      if (type === 'hotels') data = await adminRepository.listHotels(100);
      else if (type === 'restaurants') data = await adminRepository.listRestaurants(100);
      else data = await adminRepository.listCafes(100);
      setItems(data);
      setLoading(false);
    };
    load();
  }, [type]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(item => 
      (item.name || '').toLowerCase().includes(q) || 
      (item.location || '').toLowerCase().includes(q) ||
      (item.cityId || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const openCreateForm = () => {
    setEditingItem(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (item: any) => {
    setEditingItem(item);
    setFormData({
      id: item.id || '',
      name: item.name || '',
      cityId: item.cityId || '',
      location: item.location || '',
      rating: item.rating || 0,
      priceRange: item.priceRange || '$$',
      amenities: item.amenities || [],
      cuisine: item.cuisine || '',
      type: item.type || '',
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

    if (!adminRateLimiter.checkAction(`${type}_save`, adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(`${type}_save`, editingItem?.id || formData.id, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      const data = {
        ...formData,
        rating: Number(formData.rating),
        updatedAt: new Date().toISOString(),
        ...(editingItem ? {} : { createdAt: new Date().toISOString() }),
      };

      if (editingItem) {
        if (type === 'hotels') await adminRepository.updateHotel(editingItem.id, data);
        else if (type === 'restaurants') await adminRepository.updateRestaurant(editingItem.id, data);
        else await adminRepository.updateCafe(editingItem.id, data);
        showToast(`${title} updated successfully`, 'success');
      } else {
        if (type === 'hotels') await adminRepository.createHotel(data);
        else if (type === 'restaurants') await adminRepository.createRestaurant(data);
        else await adminRepository.createCafe(data);
        showToast(`${title} created successfully`, 'success');
      }

      await idempotencyService.set(idempotencyKey, `${type}_save`, editingItem?.id || formData.id, { success: true });

      await auditService.log({
        action: editingItem ? `${type}_update` : `${type}_create`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: type,
        targetId: editingItem?.id || formData.id,
        details: { name: formData.name },
      });

      const reload = type === 'hotels' ? adminRepository.listHotels(100) : type === 'restaurants' ? adminRepository.listRestaurants(100) : adminRepository.listCafes(100);
      const updated = await reload;
      setItems(updated);
      setShowForm(false);
      setEditingItem(null);
      setFormData(emptyForm);
    } catch (err: any) {
      console.error(`Failed to save ${type}:`, err);
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

    if (!adminRateLimiter.checkAction(`${type}_delete`, adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(`${type}_delete`, id, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      if (type === 'hotels') await adminRepository.deleteHotel(id);
      else if (type === 'restaurants') await adminRepository.deleteRestaurant(id);
      else await adminRepository.deleteCafe(id);
      
      await idempotencyService.set(idempotencyKey, `${type}_delete`, id, { success: true });

      await auditService.log({
        action: `${type}_delete`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: type,
        targetId: id,
        details: {},
      });

      setItems(prev => prev.filter(item => item.id !== id));
      showToast(`${title} deleted`, 'success');
    } catch (err: any) {
      console.error(`Failed to delete ${type}:`, err);
      showToast(`Failed to delete ${title.toLowerCase()}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
        <h3 className="font-semibold text-sm">{title} ({items.length})</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
            />
          </div>
          {hasPerm('content.write') && (
            <button onClick={openCreateForm} className="flex items-center gap-1 px-3 py-1.5 bg-primary-action text-background text-xs font-bold rounded-lg hover:bg-primary-action-hover transition-colors">
              <Plus className="w-3 h-3" /> New
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading {title.toLowerCase()}...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No {title.toLowerCase()} found.</p>}

        {filtered.length > 0 && (
          <div className="divide-y divide-border-token">
            {filtered.map((item, idx) => (
              <div key={item.id || `${type}-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-border-token" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.location} • {item.cityId} • {item.priceRange}</p>
                    {item.cuisine && <p className="text-xs text-gray-500">{item.cuisine}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-yellow-500">{item.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPerm('content.write') && (
                    <>
                      <button onClick={() => openEditForm(item)} disabled={processing} className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors disabled:opacity-50" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => executeDelete(item.id)} disabled={processing} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => { setShowForm(false); setEditingItem(null); setFormData(emptyForm); }}>
          <div className="bg-background border border-border-token rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-token flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary">{editingItem ? 'Edit' : 'New'} {title}</h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); setFormData(emptyForm); }} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Name</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">City ID</label>
                  <input type="text" value={formData.cityId} onChange={(e) => setFormData({ ...formData, cityId: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Rating</label>
                  <input type="number" step="0.1" min="0" max="5" value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Price Range</label>
                  <input type="text" value={formData.priceRange} onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
              </div>
              {type === 'restaurants' && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Cuisine</label>
                  <input type="text" value={formData.cuisine} onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
                </div>
              )}
              {type === 'cafes' && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Type</label>
                  <input type="text" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action" />
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
