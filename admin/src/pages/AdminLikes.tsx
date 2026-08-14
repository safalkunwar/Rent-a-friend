import React, { useState, useEffect, useMemo } from 'react';
import { Search, Heart, MessageCircle, AlertTriangle } from 'lucide-react';
import { adminRepository } from '../repositories/AdminRepository';
import { useAdminAuth } from '../hooks/useAdmin';

type LikeType = 'post_likes' | 'story_likes';

export function AdminLikes() {
  const { hasPerm } = useAdminAuth();
  const [postLikes, setPostLikes] = useState<any[]>([]);
  const [storyLikes, setStoryLikes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LikeType>('post_likes');

  useEffect(() => {
    const load = async () => {
      const [posts, stories] = await Promise.all([
        adminRepository.listLikes(200),
        adminRepository.listStoryLikes(200),
      ]);
      setPostLikes(posts);
      setStoryLikes(stories);
      setLoading(false);
    };
    load();
  }, []);

  const currentLikes = tab === 'post_likes' ? postLikes : storyLikes;

  const filtered = useMemo(() => {
    if (!search.trim()) return currentLikes;
    const q = search.toLowerCase();
    return currentLikes.filter(like => 
      (like.userId || '').toLowerCase().includes(q) || 
      (like.postId || '').toLowerCase().includes(q) ||
      (like.storyId || '').toLowerCase().includes(q)
    );
  }, [currentLikes, search]);

  const totalPostLikes = postLikes.length;
  const totalStoryLikes = storyLikes.length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Post Likes</p>
              <p className="text-2xl font-bold text-white">{totalPostLikes}</p>
            </div>
          </div>
        </div>
        <div className="bg-background border border-border-token rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <Heart className="w-5 h-5 text-pink-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Story Likes</p>
              <p className="text-2xl font-bold text-white">{totalStoryLikes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Likes Table */}
      <div className="bg-background border border-border-token rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
        <div className="px-5 py-4 border-b border-border-token flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('post_likes')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'post_likes' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Post Likes</button>
            <button onClick={() => setTab('story_likes')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'story_likes' ? 'bg-primary-action/10 text-primary-action' : 'text-text-secondary hover:text-text-primary'}`}>Story Likes</button>
          </div>
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={`Search ${tab === 'post_likes' ? 'post likes' : 'story likes'}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading likes...</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No likes found.</p>}

          {filtered.length > 0 && (
            <div className="divide-y divide-border-token">
              {filtered.map((like, idx) => (
                <div key={like.id || `like-${idx}`} className="px-5 py-3 flex items-center justify-between hover:bg-surface-elevated/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <Heart className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {like.userId} liked {tab === 'post_likes' ? 'post' : 'story'} <span className="font-mono text-gray-400">{tab === 'post_likes' ? like.postId : like.storyId}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {like.createdAt ? new Date(like.createdAt).toLocaleString() : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {hasPerm('community.read') && (
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider">Like</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
