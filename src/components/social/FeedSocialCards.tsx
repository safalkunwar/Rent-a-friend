import React, { useEffect, useMemo, useState } from 'react';
import { CommunityPost, ExperienceStory } from '../../types';
import { SocialPostCard } from './SocialPostCard';
import { CommentsPanel } from './CommentsPanel';
import { useAppContext } from '../../context/AppContext';

interface FeedSocialCardProps {
  onOpenMediaViewer?: (images: string[], index: number) => void;
  onToast?: (message: string, type?: string) => void;
}

export const FeedStoryCard: React.FC<FeedSocialCardProps & { story: ExperienceStory }> = ({ story, onOpenMediaViewer, onToast }) => {
  const { currentUser, likeStory, unlikeStory, checkUserLikedStory, createComment, deleteComment, openAuthModal } = useAppContext();
  const currentUserId = currentUser?.id;
  const toast = onToast ?? ((message: string) => console.log(message));
  const [likedByMe, setLikedByMe] = useState(false);

  useEffect(() => {
    let active = true;
    if (!currentUserId) return;
    checkUserLikedStory(story.id).then(liked => {
      if (active) setLikedByMe(liked);
    });
    return () => { active = false; };
  }, [currentUserId, story.id, checkUserLikedStory]);

  const handleLike = async (id: string) => {
    if (!currentUserId) {
      openAuthModal();
      return;
    }
    try {
      const liked = await checkUserLikedStory(id);
      setLikedByMe(!liked);
      if (liked) await unlikeStory(id);
      else await likeStory(id);
    } catch {
      setLikedByMe(prev => !prev);
      toast('Failed to sync like with Firebase. Try again.', 'error');
    }
  };

  const handleUnlike = async (id: string) => {
    if (!currentUserId) return;
    try {
      await unlikeStory(id);
      setLikedByMe(false);
    } catch {
      toast('Failed to sync unlike with Firebase. Try again.', 'error');
    }
  };

  const handleComment = async (postId: string): Promise<boolean> => {
    if (!currentUserId) {
      openAuthModal();
      return false;
    }
    const text = window.prompt('Enter your comment:');
    if (!text || !text.trim()) return false;
    try {
      await createComment({
        postId,
        userId: currentUserId,
        userName: currentUser?.name || 'User',
        userAvatar: currentUser?.avatar || '',
        text: text.trim(),
      });
      toast('Comment posted!', 'success');
      return true;
    } catch {
      toast('Failed to post comment. Try again.', 'error');
      return false;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <SocialPostCard
        post={story}
        type="story"
        initialLiked={likedByMe}
        onLike={handleLike}
        onUnlike={handleUnlike}
        onComment={handleComment}
        onShare={() => toast('Shared!', 'success')}
        onSave={() => toast('Saved!', 'success')}
        onViewProfile={() => toast('View profile coming soon', 'info')}
        onOpenMediaViewer={onOpenMediaViewer}
      />
    </div>
  );
};

export const FeedPostCard: React.FC<FeedSocialCardProps & { post: CommunityPost }> = ({ post, onOpenMediaViewer, onToast }) => {
  const { currentUser, likePost, unlikePost, checkUserLikedPost, openAuthModal } = useAppContext();
  const currentUserId = currentUser?.id;
  const toast = onToast ?? ((message: string) => console.log(message));
  const [likedByMe, setLikedByMe] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [liveComments, setLiveComments] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (!currentUserId) return;
    checkUserLikedPost(post.id).then(liked => {
      if (active) setLikedByMe(liked);
    });
    return () => { active = false; };
  }, [currentUserId, post.id, checkUserLikedPost]);

  const handleLike = async (id: string) => {
    if (!currentUserId) {
      openAuthModal();
      return;
    }
    try {
      const liked = await checkUserLikedPost(id);
      setLikedByMe(!liked);
      if (liked) await unlikePost(id);
      else await likePost(id);
    } catch {
      setLikedByMe(prev => !prev);
      toast('Failed to sync like with Firebase. Try again.', 'error');
    }
  };

  const handleUnlike = async (id: string) => {
    if (!currentUserId) return;
    try {
      await unlikePost(id);
      setLikedByMe(false);
    } catch {
      toast('Failed to sync unlike with Firebase. Try again.', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <SocialPostCard
        post={liveComments !== null ? { ...post, commentsCount: liveComments } : post}
        type="post"
        initialLiked={likedByMe}
        onLike={handleLike}
        onUnlike={handleUnlike}
        onToggleComments={() => setPanelOpen(value => !value)}
        onShare={() => toast('Shared!', 'success')}
        onSave={() => toast('Saved!', 'success')}
        onViewProfile={() => toast('View profile coming soon', 'info')}
        onOpenMediaViewer={onOpenMediaViewer}
      />
      {panelOpen && (
        <CommentsPanel
          postId={post.id}
          onClose={() => setPanelOpen(false)}
          onCountChange={setLiveComments}
        />
      )}
    </div>
  );
};
