import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { useToast } from '../components/ui/Toast';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

interface CityFormData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
}

const emptyForm: CityFormData = {
  id: '',
  name: '',
  lat: 0,
  lng: 0,
  country: 'Nepal',
};

export function AdminCities() {
  const { showToast } = useToast();
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [cities, setCities] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<CityFormData>(emptyForm);

  useEffect(() => {
    const load = async () => {
      const data = await adminRepository.listCities(100);
      setCities(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return cities;
    const q = search.toLowerCase();
    return cities.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.country || '').toLowerCase().includes(q)
    );
  }, [cities, search]);

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
      lat: item.lat || 0,
      lng: item.lng || 0,
      country: item.country || 'Nepal',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || !hasPerm('content.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!formData.id.trim()) {
      alert('City ID is required');
      return;
    }

    if (!adminRateLimiter.checkAction('city_save', adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey('city_save', editingItem?.id || formData.id, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      const data = {
        id: formData.id,
        name: formData.name,
        lat: Number(formData.lat),
        lng: Number(formData.lng),
        country: formData.country,
        updatedAt: new Date().toISOString(),
      };

      if (editingItem) {
        await adminRepository.updateCity(editingItem.id, data);
        showToast('City updated successfully', 'success');
      } else {
        await adminRepository.createCity(data);
        showToast('City created successfully', 'success');
      }

      await idempotencyService.set(idempotencyKey, 'city_save', editingItem?.id || formData.id, { success: true });

      await auditService.log({
        action: editingItem ? 'city_update' : 'city_create',
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'city',
        targetId: editingItem?.id || formData.id,
        details: { name: formData.name },
      });

      const updated = await adminRepository.listCities(100);
      setCities(updated);
      setShowForm(false);
      setEditingItem(null);
      setFormData(emptyForm);
    } catch (err: any) {
      console.error('Failed to save city:', err);
      showToast(`Failed to save: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const executeDelete = async (cityId: string) => {
    if (!adminUser || !hasPerm('content.write')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction('city_delete', adminUser.uid, 10)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey('city_delete', cityId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      await adminRepository.deleteCity(cityId);
      await idempotencyService.set(idempotencyKey, 'city_delete', cityId, { success: true });

      await auditService.log({
        action: 'city_delete',
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'city',
        targetId: cityId,
        details: {},
      });

      setCities(prev => prev.filter(c => c.id !== cityId));
      showToast('City deleted', 'success');
    } catch (err: any) {
      console.error('Failed to delete city:', err);
      showToast('Failed to delete city', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
        <h3 className="font-semibold text-sm">Cities ({cities.length})</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search cities..."
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
        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading cities...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No cities found.</p>}

        {filtered.length > 0 && (
          <div className="divide-y divide-border-token">
            {filtered.map((city, idx) => (
              <div key={city.id || `city-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2 bg-surface-elevated rounded-lg">
                    <MapPin className="w-4 h-4 text-primary-action" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{city.name}</p>
                    <p className="text-xs text-gray-400">{city.country} • {city.lat?.toFixed(4)}, {city.lng?.toFixed(4)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPerm('content.read') && (
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Location</span>
                  )}
                  {hasPerm('content.write') && (
                    <>
                      <button onClick={() => openEditForm(city)} disabled={processing} className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors disabled:opacity-50" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => executeDelete(city.id)} disabled={processing} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Delete">
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
              <h2 className="text-xl font-bold text-text-primary">{editingItem ? 'Edit' : 'New'} City</h2>
              <button onClick={() => { setShowForm(false); setEditingItem(null); setFormData(emptyForm); }} className="text-text-secondary hover:text-text-primary transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">City ID</label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  required
                  disabled={!!editingItem}
                  className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">City Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full bg-surface border border-border-token rounded-xl p-3 text-sm text-text-primary outline-none focus:border-primary-action"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => { setShowForm(false); setEditingItem(null); setFormData(emptyForm); }} className="flex-1 py-3 bg-surface-elevated text-text-secondary rounded-xl font-bold hover:bg-border-token transition-colors uppercase tracking-wider text-sm border border-border-token">
                  Cancel
                </button>
                <button type="submit" disabled={processing} className="flex-1 py-3 bg-primary-action text-background rounded-xl font-bold hover:bg-primary-action-hover transition-colors uppercase tracking-wider text-sm disabled:opacity-50">
                  {processing ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
