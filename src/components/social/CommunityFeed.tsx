import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, AlertTriangle, Bookmark, Send, Trash2, Edit3, Image as ImageIcon, Sparkles, Filter, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { useCommunityPosts } from '../../hooks/useFirestoreData';
import { socialRepository, Comment } from '../../repositories/SocialRepository';
import { CommunityPost } from '../../types';
import { SafeImage } from '../ui/SafeImage';

export const CommunityFeed: React.FC = () => {
  const { currentUser, createPost, likePost, unlikePost, createComment, deleteComment, checkUserLikedPost } = useAppContext();
  const { posts, loading } = useCommunityPosts();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create Post States
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('Adventure');
  const [newPostImage, setNewPostImage] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);

  // Likes & Comments States
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  const categories = ['All', 'Adventure', 'Food', 'Culture', 'Shopping', 'Nightlife'];

  // Sync likes and posts
  useEffect(() => {
    if (!posts) return;
    const initialLikes: Record<string, number> = {};
    posts.forEach(post => {
      initialLikes[post.id] = post.likesCount || 0;
      if (currentUser) {
        checkUserLikedPost(post.id).then(liked => {
          setLikedPosts(prev => ({ ...prev, [post.id]: liked }));
        });
      }
    });
    setLikesCount(initialLikes);
  }, [posts, currentUser, checkUserLikedPost]);

  const handleToggleLike = async (postId: string) => {
    if (!currentUser) {
      showToast('Please sign in to like community adventures!', 'info');
      return;
    }

    const isLiked = likedPosts[postId];
    
    // Optimistic UI update
    setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
    setLikesCount(prev => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1)
    }));

    try {
      if (isLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (err) {
      // Revert optimistic UI if failed
      setLikedPosts(prev => ({ ...prev, [postId]: isLiked }));
      setLikesCount(prev => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (isLiked ? 1 : -1)
      }));
      showToast('Error liking post. Try again.', 'error');
    }
  };

  const handleSavePost = (postId: string) => {
    setSavedPosts(prev => {
      const saved = !prev[postId];
      showToast(saved ? 'Post saved to bookmarks!' : 'Removed from bookmarks', 'success');
      return { ...prev, [postId]: saved };
    });
  };

  const handleSharePost = (post: CommunityPost) => {
    const shareText = `Check out "${post.title}" by ${post.userName || 'SATHI Traveler'} on SATHI: ${post.content}`;
    navigator.clipboard.writeText(shareText);
    showToast('Post content copied to clipboard! Ready to share.', 'success');
  };

  const handleReportPost = (postId: string) => {
    showToast('Thank you for keeping SATHI safe. Our safety moderators will review this post within 1 hour.', 'success');
  };

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newPostTitle.trim() || !newPostContent.trim()) {
      showToast('Title and content are required.', 'error');
      return;
    }

    setSubmittingPost(true);
    try {
      const defaultAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150';
      await createPost({
        userId: currentUser.id,
        title: newPostTitle,
        content: newPostContent,
        category: newPostCategory,
        imageUrl: newPostImage || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
        status: 'published',
        userAvatar: currentUser.avatar || defaultAvatar,
        userName: currentUser.name || 'Traveler',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        reportsCount: 0,
        location: currentUser.location || 'Kathmandu, Nepal'
      });

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImage('');
      setShowCreateModal(false);
      showToast('Your co-experience story is published live!', 'success');
    } catch (err) {
      showToast('Error posting. Please check internet connection.', 'error');
    } finally {
      setSubmittingPost(false);
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const fetchedComments = await socialRepository.getComments(postId);
      setComments(prev => ({ ...prev, [postId]: fetchedComments }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleCommentsSection = (postId: string) => {
    if (selectedPostForComments === postId) {
      setSelectedPostForComments(null);
    } else {
      setSelectedPostForComments(postId);
      loadComments(postId);
    }
  };

  const handleCreateComment = async (postId: string) => {
    const text = newCommentText[postId]?.trim();
    if (!text || !currentUser) return;

    try {
      await createComment({
        postId,
        userId: currentUser.id,
        userName: currentUser.name || 'Anonymous',
        userAvatar: currentUser.avatar || 'https://ui-avatars.com/api/?name=User&background=random',
        text
      });

      setNewCommentText(prev => ({ ...prev, [postId]: '' }));
      showToast('Comment posted successfully!', 'success');
      loadComments(postId);
    } catch (err) {
      showToast('Failed to post comment.', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    try {
      await deleteComment(commentId, postId);
      showToast('Comment deleted', 'success');
      loadComments(postId);
    } catch (err) {
      showToast('Failed to delete comment', 'error');
    }
  };

  const filteredPosts = posts?.filter(post => {
    if (activeCategory === 'All') return true;
    return post.category.toLowerCase() === activeCategory.toLowerCase();
  }) || [];

  return (
    <div className="space-y-6" id="community-feed-section">
      {/* Category selector + Create Post CTA */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                activeCategory === cat 
                  ? 'bg-[#C8A25E] text-[#0F1113] border-[#C8A25E] shadow-md shadow-[#C8A25E]/20' 
                  : 'bg-[#1E2124] text-[#8E9299] border-[#2A2D31]/50 hover:border-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {currentUser && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#C8A25E]/10 border border-[#C8A25E] text-[#C8A25E] hover:bg-[#C8A25E] hover:text-[#0F1113] px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" /> Share Co-Experience
          </button>
        )}
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#8E9299]">
          <span className="inline-block animate-pulse">Syncing feed with real-time Firestore database...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-12 text-center border border-[#2A2D31]/40 rounded-[32px] bg-[#17191C] px-6">
          <p className="text-sm font-semibold text-white">No co-experiences found in {activeCategory}.</p>
          <p className="text-xs text-[#8E9299] mt-1">Be the first to share an adventure!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const isLiked = likedPosts[post.id] || false;
            const currentLikes = likesCount[post.id] || 0;
            const isSaved = savedPosts[post.id] || false;
            const showComments = selectedPostForComments === post.id;

            return (
              <div 
                key={post.id} 
                className="rounded-[32px] overflow-hidden border border-[#2A2D31]/40 bg-[#17191C] hover:border-[#C8A25E]/30 transition-all duration-300 flex flex-col h-full shadow-lg"
              >
                {/* Header info */}
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2.5 text-left">
                    <SafeImage 
                      src={post.userAvatar} 
                      alt={post.userName} 
                      fallbackType="avatar"
                      textForInitials={post.userName}
                      className="w-8 h-8 rounded-full border border-[#C8A25E]/50 object-cover" 
                    />
                    <div>
                      <h4 className="text-xs font-black text-white leading-tight">{post.userName}</h4>
                      <p className="text-[10px] text-[#8E9299] flex items-center gap-1 mt-0.5">
                        <Filter className="w-2.5 h-2.5 text-[#C8A25E]" /> {post.category}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] text-[#5A5E66] font-bold">Kathmandu</span>
                </div>

                {/* Main image */}
                {post.imageUrl && (
                  <div className="aspect-[16/10] overflow-hidden bg-[#1E2124] relative">
                    <SafeImage 
                      src={post.imageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                      fallbackType="thumbnail"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col text-left">
                  <h3 className="text-sm font-extrabold text-white leading-snug line-clamp-1 mb-2">{post.title}</h3>
                  <p className="text-xs text-white/70 font-light leading-relaxed mb-4 flex-1 line-clamp-3">
                    {post.content}
                  </p>

                  {/* Actions Row */}
                  <div className="pt-3 border-t border-[#2A2D31]/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1 text-[11px] font-black transition-all ${
                          isLiked ? 'text-red-500 scale-105' : 'text-[#8E9299] hover:text-red-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                        {currentLikes > 0 && <span>{currentLikes}</span>}
                      </button>

                      <button 
                        onClick={() => toggleCommentsSection(post.id)}
                        className={`flex items-center gap-1 text-[11px] font-black transition-all ${
                          showComments ? 'text-[#C8A25E]' : 'text-[#8E9299] hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {(comments[post.id]?.length || post.commentsCount || 0) > 0 && (
                          <span>{comments[post.id]?.length || post.commentsCount || 0}</span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleSavePost(post.id)}
                        className={`text-[#8E9299] hover:text-white transition-all ${
                          isSaved ? 'text-[#C8A25E]' : ''
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>

                      <button 
                        onClick={() => handleSharePost(post)}
                        className="text-[#8E9299] hover:text-white transition-all"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={() => handleReportPost(post.id)}
                        className="text-[#8E9299] hover:text-red-500 transition-all"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real-time Comments Box */}
                {showComments && (
                  <div className="bg-[#101214] border-t border-[#2A2D31]/40 p-3 text-left space-y-3">
                    <div className="max-h-40 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                      {loadingComments[post.id] ? (
                        <p className="text-[10px] text-[#8E9299] animate-pulse">Loading comments...</p>
                      ) : !comments[post.id] || comments[post.id].length === 0 ? (
                        <p className="text-[10px] text-[#5A5E66] italic">No comments yet. Write a friendly response!</p>
                      ) : (
                        comments[post.id].map(comm => (
                          <div key={comm.id} className="flex gap-2 items-start text-xs bg-[#17191C] p-2 rounded-xl">
                            <SafeImage src={comm.userAvatar} className="w-5 h-5 rounded-full object-cover mt-0.5" alt={comm.userName} fallbackType="avatar" textForInitials={comm.userName} />
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-extrabold text-white text-[10px]">{comm.userName}</span>
                                {currentUser && currentUser.id === comm.userId && (
                                  <button onClick={() => handleDeleteComment(comm.id, post.id)} className="text-[#5A5E66] hover:text-red-500">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-[#8E9299] font-light text-[10px] mt-0.5 leading-relaxed">{comm.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Input */}
                    {currentUser ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Add comment..."
                          value={newCommentText[post.id] || ''}
                          onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateComment(post.id)}
                          className="flex-1 bg-[#1E2124] text-white border border-[#2A2D31]/40 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-[#C8A25E]"
                        />
                        <button 
                          onClick={() => handleCreateComment(post.id)}
                          className="w-7 h-7 rounded-full bg-[#C8A25E] flex items-center justify-center text-[#0F1113] active:scale-95 transition-transform"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[9px] text-[#5A5E66]">Sign in to join the conversation.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE POST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#17191C] border border-[#2A2D31] rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-[#2A2D31] flex justify-between items-center bg-[#101214]">
              <h3 className="text-md font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C8A25E]" /> Share SATHI Experience
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-[#8E9299] hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePostSubmit} className="p-5 space-y-4 text-left">
              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1.5">Adventure Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Hidden Waterfalls in Shivapuri Hills"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full bg-[#1E2124] text-white border border-[#2A2D31]/60 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#C8A25E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1.5">Category</label>
                  <select
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="w-full bg-[#1E2124] text-white border border-[#2A2D31]/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C8A25E]"
                  >
                    <option value="Adventure">Adventure</option>
                    <option value="Food">Food</option>
                    <option value="Culture">Culture</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Nightlife">Nightlife</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1.5">Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newPostImage}
                    onChange={(e) => setNewPostImage(e.target.value)}
                    className="w-full bg-[#1E2124] text-white border border-[#2A2D31]/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C8A25E]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#8E9299] uppercase tracking-wider block mb-1.5">What did you co-experience?</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell your SATHI companion experience. Be descriptive and keep it authentic..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full bg-[#1E2124] text-white border border-[#2A2D31]/60 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#C8A25E] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#2A2D31]/40 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#1E2124] border border-[#2A2D31]/60 rounded-xl text-xs font-bold text-[#8E9299] hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="px-5 py-2 bg-[#C8A25E] hover:bg-[#B69150] disabled:bg-[#C8A25E]/40 text-[#0F1113] font-black rounded-xl text-xs uppercase tracking-wide transition-all shadow-md"
                >
                  {submittingPost ? 'Publishing...' : 'Publish Adventure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
