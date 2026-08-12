import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import { AdminCompanionRow } from '../types';
import { adminRepository } from '../repositories/AdminRepository';

export function AdminCompanions() {
  const [companions, setCompanions] = useState<AdminCompanionRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await adminRepository.listCompanions(100);
      setCompanions(data as AdminCompanionRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = companions.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()));

  const toggleVerification = async (companionId: string, isVerified: boolean) => {
    await adminRepository.toggleCompanionVerification(companionId, isVerified);
    setCompanions(prev => prev.map(c => c.id === companionId ? { ...c, isVerified: !isVerified } : c));
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
        <h3 className="font-semibold text-sm">All Companions</h3>
        <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
          <Search className="w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search companions..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto" />
        </div>
      </div>
      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading companions...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No companions found.</p>}
        {filtered.map((companion, idx) => (
          <div key={`${companion.id || 'c'}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token flex items-center justify-between hover:border-primary-action/50 transition-colors">
            <div className="flex items-center gap-4">
              <img src={companion.imageUrl} alt={companion.name} className="w-10 h-10 rounded-full object-cover border border-border-token" />
              <div>
                <p className="text-sm font-medium text-white">{companion.name} • {companion.location}</p>
                <p className="text-xs text-gray-400">NPR {companion.hourlyRate}/hr • {companion.languages.join(', ')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleVerification(companion.id, companion.isVerified)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${companion.isVerified ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-surface-elevated text-text-secondary border-border-token hover:text-white'}`}>
                <ShieldCheck className="w-3 h-3" /> {companion.isVerified ? 'Verified' : 'Verify'}
              </button>
              <button className="px-3 py-1.5 rounded-lg text-red-500 text-xs border border-red-500/20 hover:bg-red-500/10 transition-colors">
                <ShieldAlert className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
