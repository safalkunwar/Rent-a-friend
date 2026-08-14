import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

type StoryAction = 'hide' | 'restore' | 'remove';

export function AdminStories() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await adminRepository.listStories(100);
      setStories(data);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return stories;
    const q = search.toLowerCase();
    return stories.filter(s => 
      (s.userName || '').toLowerCase().includes(q) || 
      (s.caption || '').toLowerCase().includes(q) ||
      (s.id || '').toLowerCase().includes(q)
    );
  }, [stories, search]);

  const executeAction = async (storyId: string, action: StoryAction) => {
    if (!adminUser || !hasPerm('community.moderate')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(`story_${action}`, adminUser.uid, 20)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(`story_${action}`, storyId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      if (action === 'remove') {
        await adminRepository.deleteStory(storyId);
        setStories(prev => prev.filter(s => s.id !== storyId));
      } else {
        const newStatus = action === 'hide' ? 'hidden' : 'published';
        await adminRepository.updateStory(storyId, { status: newStatus });
        setStories(prev => prev.map(s => s.id === storyId ? { ...s, status: newStatus } : s));
      }

      await idempotencyService.set(idempotencyKey, `story_${action}`, storyId, { success: true });

      await auditService.log({
        action: `story_${action}`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: 'story',
        targetId: storyId,
        details: { action },
      });
    } catch (err: any) {
      console.error(`Failed to ${action} story:`, err);
      alert(`Failed to ${action} story: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'hidden': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'removed': return 'bg-red-500/10 text-red-500 border-red-500/30';
      default: return 'bg-surface-elevated text-text-secondary border-border-token';
    }
  };

  return (
    <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
      <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
        <h3 className="font-semibold text-sm">Stories ({stories.length})</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search stories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-gray-500 text-sm text-center py-8">Loading stories...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No stories found.</p>}

        {filtered.length > 0 && (
          <div className="divide-y divide-border-token">
            {filtered.map((story, idx) => (
              <div key={story.id || `story-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <img src={story.userAvatar} alt={story.userName} className="w-8 h-8 rounded-full object-cover border border-border-token" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{story.caption || 'No caption'}</p>
                    <p className="text-xs text-gray-400">by {story.userName} • {story.createdAt ? new Date(story.createdAt).toLocaleDateString() : ''}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(story.status)}`}>
                    {story.status || 'published'}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPerm('community.moderate') && (
                    <>
                      {(story.status !== 'hidden' && story.status !== 'removed') && (
                        <button onClick={() => executeAction(story.id, 'hide')} disabled={processing} className="p-1.5 rounded-lg text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors disabled:opacity-50" title="Hide">
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      {story.status === 'hidden' && (
                        <button onClick={() => executeAction(story.id, 'restore')} disabled={processing} className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors disabled:opacity-50" title="Restore">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => executeAction(story.id, 'remove')} disabled={processing} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Remove">
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
    </div>
  );
}
