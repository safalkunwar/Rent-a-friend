import React, { useState, useEffect } from 'react';
import { Heart, MessageSquare, Share2, AlertTriangle, Bookmark, Send, Trash2, Edit3, Image as ImageIcon, Sparkles, Filter, X, Upload, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { useCommunityPosts } from '../../hooks/useFirestoreData';
import { socialRepository, Comment } from '../../repositories/SocialRepository';
import { CommunityPost } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { ExpandableText } from './ExpandableText';
import { uploadImageToStorage } from '../../services/storage';
import { firestore } from '../../services/firestore';
import { ReportModal } from '../modals/ReportModal';

export const CommunityFeed: React.FC = () => {
  const { currentUser, createPost, likePost, unlikePost, createComment, deleteComment, checkUserLikedPost, openAuthModal, signInAnonymously } = useAppContext();
  const { posts, loading } = useCommunityPosts();
  const { showToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Post States
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('Adventure');
  const [newPostImageURL, setNewPostImageURL] = useState('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [postUploadError, setPostUploadError] = useState<string | null>(null);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Likes & Comments States
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [editingComment, setEditingComment] = useState<{ id: string; postId: string; text: string } | null>(null);

  const categories = ['All', 'Adventure', 'Food', 'Culture', 'Shopping', 'Nightlife'];

  const getCurrentUserId = () => currentUser?.id || 'guest';
  const getCurrentUserName = () => currentUser?.name || 'Anonymous Traveler';
  const getCurrentUserAvatar = () => currentUser?.avatar || '';
  const isAnonymous = currentUser?.role === 'guest';

  // Sync likes and posts
  useEffect(() => {
    if (!posts) return;
    const initialLikes: Record<string, number> = {};
    posts.forEach(post => {
      initialLikes[post.id] = post.likesCount || 0;
      setCommentCounts(prev => (prev[post.id] === undefined ? { ...prev, [post.id]: post.commentsCount || 0 } : prev));
      const userId = getCurrentUserId();
      if (userId !== 'guest') {
        checkUserLikedPost(post.id).then(liked => {
          setLikedPosts(prev => ({ ...prev, [post.id]: liked }));
        });
      }
    });
    setLikesCount(initialLikes);
  }, [posts, currentUser, checkUserLikedPost]);

  // Real-time listener for open comments section
  useEffect(() => {
    if (!selectedPostForComments) return;
    const postId = selectedPostForComments;
    setLoadingComments(prev => ({ ...prev, [postId]: true }));

    const unsubscribe = firestore.subscribe<Comment>('comments', {
      where: [{ field: 'postId', operator: '==', value: postId }],
      orderByField: 'createdAt',
      orderDirection: 'asc'
    }, (fetchedComments) => {
      setComments(prev => ({ ...prev, [postId]: fetchedComments }));
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    });

    return () => {
      unsubscribe();
    };
  }, [selectedPostForComments]);

  const handleToggleLike = async (postId: string) => {
    if (!currentUser) {
      showToast('Please sign in to like community adventures!', 'info');
      openAuthModal();
      return;
    }

    const isLiked = likedPosts[postId];

    // Optimistic UI update
    setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
    setLikesCount(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? -1 : 1))
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
        [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? 1 : -1))
      }));
      showToast('Error updating like. Try again.', 'error');
    }
  };

  const handleSavePost = (postId: string) => {
    const isSaved = !savedPosts[postId];
    setSavedPosts(prev => ({ ...prev, [postId]: isSaved }));
    showToast(isSaved ? 'Post saved to bookmarks!' : 'Removed from bookmarks', 'success');
  };

  const handleSharePost = (post: CommunityPost) => {
    const shareText = `Check out "${post.title}" by ${post.userName || 'SATHI Traveler'} on SATHI: ${post.content}`;
    navigator.clipboard.writeText(shareText);
    showToast('Post content copied to clipboard! Ready to share.', 'success');
  };

  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  const handleReportPost = (postId: string) => {
    setReportingPostId(postId);
  };

  const handleDeletePost = async (postId: string) => {
    if (!currentUser) return;
    try {
      await socialRepository.deletePost(postId);
      showToast('Co-experience post deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete post.', 'error');
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setPostUploadError('Please select a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPostUploadError('Image size must be less than 10MB.');
      return;
    }

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      showToast('Title and content are required.', 'error');
      return;
    }

    setSubmittingPost(true);
    setPostUploadError(null);

    try {
      let finalImageUrl = newPostImageURL.trim();

      // Upload file to Firebase Storage if selected
      if (selectedImageFile) {
        finalImageUrl = await uploadImageToStorage(selectedImageFile, {
          folder: 'posts',
          maxSizeMB: 10,
          onProgress: (p) => setUploadProgress(p)
        });
      }

      const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.name || 'User') + '&background=C8A25E&color=0F1113';

      await createPost({
        userId: currentUser.id,
        title: newPostTitle,
        content: newPostContent,
        category: newPostCategory,
        imageUrl: finalImageUrl || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
        status: 'published',
        userAvatar: currentUser.avatar || defaultAvatar,
        userName: currentUser.name || 'Anonymous Traveler',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        reportsCount: 0,
        location: currentUser.location || 'Kathmandu, Nepal'
      });

      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImageURL('');
      setSelectedImageFile(null);
      setImagePreview(null);
      setShowCreateModal(false);
      showToast('Your co-experience story is published live!', 'success');
    } catch (err: any) {
      console.error('[CommunityFeed] Error creating post:', err);
      setPostUploadError(err.message || 'Error publishing post. Try again.');
      showToast('Error publishing post.', 'error');
    } finally {
      setSubmittingPost(false);
      setUploadProgress(null);
    }
  };

  const toggleCommentsSection = (postId: string) => {
    if (selectedPostForComments === postId) {
      setSelectedPostForComments(null);
    } else {
      setSelectedPostForComments(postId);
    }
  };

  const handleCreateComment = async (postId: string) => {
    if (!currentUser) {
      showToast('Please sign in to comment.', 'info');
      openAuthModal();
      return;
    }

    const text = newCommentText[postId]?.trim();
    if (!text) return;

    try {
      const defaultAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.name || 'User') + '&background=C8A25E&color=0F1113';

      await createComment({
        postId,
        userId: currentUser.id,
        userName: currentUser.name || 'Anonymous Traveler',
        userAvatar: currentUser.avatar || defaultAvatar,
        text
      });

      setNewCommentText(prev => ({ ...prev, [postId]: '' }));
      setCommentCounts(prev => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
      showToast('Comment posted successfully!', 'success');
    } catch (err) {
      showToast('Failed to post comment.', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!currentUser) return;
    try {
      await deleteComment(commentId, postId);
      setCommentCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] ?? 1) - 1) }));
      if (editingComment?.id === commentId) setEditingComment(null);
      showToast('Comment deleted', 'success');
    } catch (err) {
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleSaveEditedComment = async () => {
    if (!editingComment || !editingComment.text.trim()) return;
    try {
      await socialRepository.editComment(editingComment.id, editingComment.text.trim());
      setComments(prev => ({
        ...prev,
        [editingComment.postId]: (prev[editingComment.postId] || []).map(c =>
          c.id === editingComment.id ? { ...c, text: editingComment.text.trim(), updatedAt: new Date().toISOString() } : c
        ),
      }));
      setEditingComment(null);
      showToast('Comment updated', 'success');
    } catch (err) {
      showToast('Failed to update comment', 'error');
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
                  ? 'bg-primary-action text-background border-primary-action shadow-md shadow-primary-action/20' 
                  : 'bg-surface-elevated text-text-secondary border-border-token/50 hover:border-white/10 hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            if (!currentUser) {
              openAuthModal();
            } else {
              setShowCreateModal(true);
            }
          }}
          className="flex items-center gap-2 bg-primary-action/10 border border-primary-action text-primary-action hover:bg-primary-action hover:text-background px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all uppercase"
        >
          <Sparkles className="w-3.5 h-3.5" /> Share Co-Experience
        </button>
        {!currentUser && (
          <button
            onClick={async () => {
              try {
                await signInAnonymously();
                showToast('Welcome! You can now share and interact as a guest.', 'success');
              } catch (err) {
                showToast('Failed to continue as guest. Please try again.', 'error');
              }
            }}
            className="flex items-center gap-2 bg-surface-elevated border border-border-token text-text-secondary hover:text-text-primary px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all"
          >
            Continue as Guest
          </button>
        )}
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-text-secondary">
          <span className="inline-block animate-pulse">Syncing feed with real-time Firestore database...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="py-12 text-center border border-border-token/40 rounded-[32px] bg-surface px-6 space-y-2">
          <p className="text-sm font-semibold text-text-primary">No Community Moments yet</p>
          <p className="text-xs text-text-secondary">Be the first to share your Nepal experience.</p>
          <button
            onClick={() => currentUser ? setShowCreateModal(true) : openAuthModal()}
            className="mt-3 px-4 py-2 bg-primary-action text-background font-extrabold text-xs rounded-xl inline-flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" /> Share Your Adventure
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, idx) => {
            const isLiked = likedPosts[post.id] || false;
            const currentLikes = likesCount[post.id] || 0;
            const isSaved = savedPosts[post.id] || false;
            const showComments = selectedPostForComments === post.id;
            const currentCommentsList = comments[post.id] || [];
            const isAuthor = currentUser && currentUser.id === post.userId;

            return (
              <div 
                key={`${post.id || 'post'}-${idx}`} 
                className="rounded-[32px] overflow-hidden border border-border-token/40 bg-surface hover:border-primary-action/30 transition-all duration-300 flex flex-col h-full shadow-lg"
              >
                {/* Header info */}
                <div className="p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2.5 text-left">
                    <SafeImage 
                      src={post.userAvatar} 
                      alt={post.userName} 
                      fallbackType="avatar"
                      textForInitials={post.userName}
                      className="w-8 h-8 rounded-full border border-primary-action/50 object-cover" 
                    />
                    <div>
                      <h4 className="text-xs font-black text-text-primary leading-tight">{post.userName}</h4>
                      <p className="text-[10px] text-text-secondary flex items-center gap-1 mt-0.5">
                        <Filter className="w-2.5 h-2.5 text-primary-action" /> {post.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-text-muted font-bold">{post.location || 'Nepal'}</span>
                    {isAuthor && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-text-secondary hover:text-red-500 transition-colors p-1"
                        title="Delete Post"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main image */}
                {post.imageUrl && (
                  <div className="aspect-[16/10] overflow-hidden bg-surface-elevated relative">
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
                  <h3 className="text-sm font-extrabold text-text-primary leading-snug line-clamp-1 mb-2">{post.title}</h3>
                  <ExpandableText
                    text={post.content}
                    lines={1}
                    className="text-xs text-text-primary/70 font-light leading-relaxed mb-3"
                    buttonClassName="text-[11px] font-bold text-primary-action hover:underline"
                  />

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-border-token/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-1 text-[11px] font-black transition-all ${
                            isLiked ? 'text-red-500 scale-105' : 'text-text-secondary hover:text-red-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                          {currentLikes > 0 && <span>{currentLikes}</span>}
                        </button>

                        <button
                          onClick={() => toggleCommentsSection(post.id)}
                          className={`flex items-center gap-1 text-[11px] font-black transition-all ${
                            showComments ? 'text-primary-action' : 'text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          {(commentCounts[post.id] ?? post.commentsCount ?? 0) > 0 && (
                            <span>{commentCounts[post.id] ?? post.commentsCount}</span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSavePost(post.id)}
                          className={`text-text-secondary hover:text-text-primary transition-all ${
                            isSaved ? 'text-primary-action' : ''
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={() => handleSharePost(post)}
                          className="text-text-secondary hover:text-text-primary transition-all"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleReportPost(post.id)}
                          className="text-text-secondary hover:text-red-500 transition-all"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                </div>

                {/* Real-time Comments Box */}
                {showComments && (
                  <div className="bg-background border-t border-border-token/40 p-3 text-left space-y-3">
                    <div className="max-h-48 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                      {loadingComments[post.id] ? (
                        <p className="text-[10px] text-text-secondary animate-pulse">Loading comments from Firestore...</p>
                      ) : currentCommentsList.length === 0 ? (
                        <p className="text-[10px] text-text-muted italic py-1">Be the first to comment.</p>
                      ) : (
                        currentCommentsList.map((comm, idx) => (
                          <div key={`${comm.id || 'comm'}-${idx}`} className="flex gap-2 items-start text-xs bg-surface p-2 rounded-xl">
                            <SafeImage src={comm.userAvatar} className="w-5 h-5 rounded-full object-cover mt-0.5" alt={comm.userName} fallbackType="avatar" textForInitials={comm.userName} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-text-primary text-[10px]">{comm.userName}</span>
                                {currentUser && currentUser.id === comm.userId && (
                                  <div className="flex items-center gap-1.5">
                                    {editingComment?.id === comm.id ? (
                                      <>
                                        <button onClick={() => void handleSaveEditedComment()} className="text-primary-action hover:text-text-primary" title="Save">
                                          <Send className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setEditingComment(null)} className="text-text-muted hover:text-red-500" title="Cancel">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => setEditingComment({ id: comm.id, postId: post.id, text: comm.text })}
                                          className="text-text-muted hover:text-primary-action"
                                          title="Edit comment"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => void handleDeleteComment(comm.id, post.id)} className="text-text-muted hover:text-red-500" title="Delete comment">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              {editingComment?.id === comm.id ? (
                                <input
                                  autoFocus
                                  value={editingComment.text}
                                  onChange={(e) => setEditingComment(prev => prev ? { ...prev, text: e.target.value } : prev)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleSaveEditedComment();
                                    if (e.key === 'Escape') setEditingComment(null);
                                  }}
                                  className="w-full mt-1 bg-surface-elevated text-text-primary border border-primary-action/50 rounded-lg px-2 py-1 text-[10px] focus:outline-none"
                                />
                              ) : (
                                <p className="text-text-secondary font-light text-[10px] mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{comm.text}</p>
                              )}
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
                           placeholder="Write a comment..."
                           value={newCommentText[post.id] || ''}
                           onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                           onKeyDown={(e) => e.key === 'Enter' && handleCreateComment(post.id)}
                           className="flex-1 bg-surface-elevated text-text-primary border border-border-token/40 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-primary-action"
                         />
                         <button
                           onClick={() => handleCreateComment(post.id)}
                           className="w-7 h-7 rounded-full bg-primary-action flex items-center justify-center text-background active:scale-95 transition-transform shrink-0"
                         >
                           <Send className="w-3.5 h-3.5" />
                         </button>
                       </div>
                     ) : (
                       <button
                         onClick={openAuthModal}
                         className="w-full text-left py-1 text-[10px] text-primary-action font-bold hover:underline"
                       >
                         Sign in to leave a comment
                       </button>
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
          <div className="bg-surface border border-border-token rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 border-b border-border-token flex justify-between items-center bg-background">
              <h3 className="text-md font-extrabold text-text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-action" /> Share SATHI Co-Experience
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary hover:text-text-primary transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePostSubmit} className="p-5 space-y-4 text-left">
              {postUploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{postUploadError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Adventure Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Hidden Waterfalls in Shivapuri Hills"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-primary-action"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Category</label>
                  <select
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action"
                  >
                    <option value="Adventure">Adventure</option>
                    <option value="Food">Food</option>
                    <option value="Culture">Culture</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Nightlife">Nightlife</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Upload Image (Firebase Storage)</label>
                  <label className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border-token/60 rounded-xl text-xs font-bold text-primary-action cursor-pointer hover:bg-surface-hover">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">{selectedImageFile ? selectedImageFile.name : 'Select Photo File'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Image Preview or URL Option */}
              {imagePreview ? (
                <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-black/40 border border-border-token">
                  <img src={imagePreview} alt="Post preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-text-primary rounded-full p-1 hover:bg-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">Or Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={newPostImageURL}
                    onChange={(e) => setNewPostImageURL(e.target.value)}
                    className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-action"
                  />
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-text-secondary font-bold">
                    <span>Uploading photo to Firebase Storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-action transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">What did you co-experience?</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell your SATHI companion experience in detail..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full bg-surface-elevated text-text-primary border border-border-token/60 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary-action resize-none"
                />
              </div>

              <div className="pt-3 border-t border-border-token/40 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-surface-elevated border border-border-token/60 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="px-5 py-2 bg-primary-action hover:bg-primary-action-hover disabled:bg-primary-action/40 text-background font-black rounded-xl text-xs uppercase tracking-wide transition-all shadow-md"
                >
                  {submittingPost ? 'Publishing...' : 'Publish Adventure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {reportingPostId && (
        <ReportModal
          isOpen={!!reportingPostId}
          onClose={() => setReportingPostId(null)}
          targetType="post"
          targetId={reportingPostId}
          targetName={posts.find(p => p.id === reportingPostId)?.title}
        />
      )}
    </div>
  );
};
