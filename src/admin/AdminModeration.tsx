import React, { useState, useEffect } from 'react';
import { Search, Trash2, ShieldAlert, MessageSquare, FileText } from 'lucide-react';
import { adminRepository } from './AdminRepository';

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  status: string;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  postId: string;
  createdAt: string;
}

export function AdminModeration() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tab, setTab] = useState<'posts' | 'comments'>('posts');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [postsData, commentsData] = await Promise.all([
        adminRepository.listCommunityPosts(100),
        adminRepository.listComments(100),
      ]);
      setPosts(postsData as Post[]);
      setComments(commentsData as Comment[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = tab === 'posts'
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.author.toLowerCase().includes(search.toLowerCase()))
    : comments.filter(c => c.content.toLowerCase().includes(search.toLowerCase()) || c.author.toLowerCase().includes(search.toLowerCase()));

  const handleRemovePost = async (postId: string) => {
    await adminRepository.removeCommunityPost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleRemoveComment = async (commentId: string) => {
    await adminRepository.removeComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
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
          <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border-token">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-text-primary outline-none w-32 md:w-auto"
            />
          </div>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {loading && <p className="text-gray-500 text-sm text-center py-8">Loading...</p>}
          {!loading && filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No {tab} found.</p>}
          {filtered.map((item, idx) => (
            <div key={`${item.id || tab}-${idx}`} className="p-4 bg-surface rounded-xl border border-border-token flex items-center justify-between hover:border-primary-action/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {tab === 'posts' ? (item as Post).title : (item as Comment).content}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  by {item.author} • {new Date(item.createdAt).toLocaleDateString()}
                  {tab === 'posts' && ` • ${(item as Post).status}`}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button className="p-1.5 rounded-lg text-primary-action hover:bg-primary-action/10 transition-colors">
                  {tab === 'posts' ? <FileText className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => tab === 'posts' ? handleRemovePost(item.id) : handleRemoveComment(item.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
