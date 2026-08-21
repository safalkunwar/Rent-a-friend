import React, { useState, useEffect, useMemo } from 'react';
import { Search, Trash2, ShieldAlert, MessageSquare, FileText, Eye, EyeOff } from 'lucide-react';
import { AdminPostRow, AdminCommentRow } from '../types';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';
import { auditService } from '../services/audit';
import { idempotencyService } from '../services/idempotency';
import { adminRateLimiter } from '../services/rateLimiter';

type ModerationTarget = 'post' | 'comment';
type ModerationAction = 'hide' | 'remove' | 'restore';

export function AdminModeration() {
  const { user: adminUser, hasPerm } = useAdminAuth();
  const [posts, setPosts] = useState<AdminPostRow[]>([]);
  const [comments, setComments] = useState<AdminCommentRow[]>([]);
  const [tab, setTab] = useState<'posts' | 'comments'>('posts');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [postsData, commentsData] = await Promise.all([
        adminRepository.listCommunityPosts(100),
        adminRepository.listComments(100),
      ]);
      setPosts(postsData as AdminPostRow[]);
      setComments(commentsData as AdminCommentRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (tab === 'posts') {
      return posts.filter(p => (p.title || '').toLowerCase().includes(q) || (p.author || '').toLowerCase().includes(q));
    }
    return comments.filter(c => (c.content || '').toLowerCase().includes(q) || (c.author || '').toLowerCase().includes(q));
  }, [posts, comments, search, tab]);

  const executeModerationAction = async (targetType: ModerationTarget, targetId: string, action: ModerationAction) => {
    if (!adminUser || !hasPerm('community.moderate')) {
      alert('Insufficient permissions');
      return;
    }

    if (!adminRateLimiter.checkAction(`moderate_${action}`, adminUser.uid, 20)) {
      alert('Rate limit exceeded. Please wait before retrying.');
      return;
    }

    const idempotencyKey = idempotencyService.generateKey(`moderate_${action}`, targetId, adminUser.uid);
    const existing = await idempotencyService.get(idempotencyKey);
    if (existing) {
      alert('This action has already been processed.');
      return;
    }

    setProcessing(true);
    try {
      if (targetType === 'post') {
        if (action === 'remove') {
          await adminRepository.removeCommunityPost(targetId);
          setPosts(prev => prev.filter(p => p.id !== targetId));
        } else {
          const newStatus = action === 'hide' ? 'hidden' : 'published';
          await adminRepository.updateDocument(`community_posts/${targetId}`, { status: newStatus, updatedAt: new Date().toISOString() });
          setPosts(prev => prev.map(p => p.id === targetId ? { ...p, status: newStatus } : p));
        }
      } else {
        if (action === 'remove') {
          await adminRepository.removeComment(targetId);
          setComments(prev => prev.filter(c => c.id !== targetId));
        } else {
          const newStatus = action === 'hide' ? 'hidden' : 'published';
          await adminRepository.updateDocument(`comments/${targetId}`, { status: newStatus, updatedAt: new Date().toISOString() });
          setComments(prev => prev.map(c => c.id === targetId ? { ...c, status: newStatus } : c));
        }
      }

      await idempotencyService.set(idempotencyKey, `moderate_${action}`, targetId, { success: true });

      await auditService.log({
        action: `moderate_${action}`,
        actorId: adminUser.uid,
        actorName: adminUser.displayName || 'Admin',
        targetType: targetType,
        targetId,
        details: { action, targetType },
      });
    } catch (err: any) {
      console.error(`Failed to ${action} ${targetType}:`, err);
      alert(`Failed to ${action} ${targetType}: ${err.message || 'Unknown error'}`);
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
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-background border border-border-token p-1 rounded-xl w-fit">
        <button onClick={() => setTab('posts')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'posts' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Community Posts</button>
        <button onClick={() => setTab('comments')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'comments' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Comments</button>
      </div>

      <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
        <div className="px-5 py-4 border-b border-border-token flex justify-between items-center bg-surface">
          <h3 className="font-semibold text-sm capitalize">{tab === 'posts' ? 'Community Posts' : 'Comments'}</h3>
          {hasPerm('community.moderate') && (
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Moderator</span>
          )}
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No {tab} found.</p>}
          {filtered.map((item, idx) => (
            <div key={`${item.id || tab}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token flex items-center justify-between hover:border-primary-action/50 transition-colors">
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-text-primary truncate">
                   {tab === 'posts' ? (item as AdminPostRow).title : (item as AdminCommentRow).content}
                 </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-400">
                    by {item.author} • {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor((item as any).status)}`}>
                    {(item as any).status || 'published'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {hasPerm('community.moderate') && (
                  <>
                    {(item as any).status !== 'hidden' && (item as any).status !== 'removed' && (
                      <button onClick={() => executeModerationAction(tab === 'posts' ? 'post' : 'comment', item.id, 'hide')} disabled={processing} className="p-1.5 rounded-lg text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition-colors disabled:opacity-50" title="Hide">
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                    {(item as any).status === 'hidden' && (
                      <button onClick={() => executeModerationAction(tab === 'posts' ? 'post' : 'comment', item.id, 'restore')} disabled={processing} className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors disabled:opacity-50" title="Restore">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => executeModerationAction(tab === 'posts' ? 'post' : 'comment', item.id, 'remove')} disabled={processing} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
