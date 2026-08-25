import React from 'react';
import { CommunityPost, ExperienceStory } from '../../types';
import { SocialPostCard } from './SocialPostCard';
import { useAppContext } from '../../context/AppContext';

interface FeedSocialCardProps {
  onOpenMediaViewer?: (images: string[], index: number) => void;
  onToast?: (message: string, type?: string) => void;
}

export const FeedStoryCard: React.FC<FeedSocialCardProps & { story: ExperienceStory }> = ({ story, onOpenMediaViewer, onToast }) => {
  const { currentUser, likeStory, unlikeStory, checkUserLikedStory, createComment, deleteComment, openAuthModal } = useAppContext();
  const currentUserId = currentUser?.id;
  const toast = onToast ?? ((message: string) => console.log(message));

  const handleLike = async (id: string) => {
    if (!currentUserId) {
      openAuthModal();
      return;
    }
    try {
      const liked = await checkUserLikedStory(id);
      if (liked) await unlikeStory(id);
      else await likeStory(id);
    } catch {
      toast('Failed to sync like with Firebase. Try again.', 'error');
    }
  };

  const handleUnlike = async (id: string) => {
    if (!currentUserId) return;
    try {
      await unlikeStory(id);
    } catch {
      toast('Failed to sync unlike with Firebase. Try again.', 'error');
    }
  };

  const handleComment = async (postId: string) => {
    if (!currentUserId) {
      openAuthModal();
      return;
    }
    const text = window.prompt('Enter your comment:');
    if (!text || !text.trim()) return;
    try {
      await createComment({
        postId,
        userId: currentUserId,
        userName: currentUser?.name || 'User',
        userAvatar: currentUser?.avatar || '',
        text: text.trim(),
      });
      toast('Comment posted!', 'success');
    } catch {
      toast('Failed to post comment. Try again.', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <SocialPostCard
        post={story}
        type="story"
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
  const { currentUser, likePost, unlikePost, checkUserLikedPost, createComment, openAuthModal } = useAppContext();
  const currentUserId = currentUser?.id;
  const toast = onToast ?? ((message: string) => console.log(message));

  const handleLike = async (id: string) => {
    if (!currentUserId) {
      openAuthModal();
      return;
    }
    try {
      const liked = await checkUserLikedPost(id);
      if (liked) await unlikePost(id);
      else await likePost(id);
    } catch {
      toast('Failed to sync like with Firebase. Try again.', 'error');
    }
  };

  const handleComment = async (postId: string) => {
    if (!currentUserId) {
      openAuthModal();
      return;
    }
    const text = window.prompt('Enter your comment:');
    if (!text || !text.trim()) return;
    try {
      await createComment({
        postId,
        userId: currentUserId,
        userName: currentUser?.name || 'User',
        userAvatar: currentUser?.avatar || '',
        text: text.trim(),
      });
      toast('Comment posted!', 'success');
    } catch {
      toast('Failed to post comment. Try again.', 'error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <SocialPostCard
        post={post}
        type="post"
        onLike={handleLike}
        onUnlike={(id) => { if (currentUserId) unlikePost(id).catch(() => toast('Failed to sync. Try again.', 'error')); }}
        onComment={handleComment}
        onShare={() => toast('Shared!', 'success')}
        onSave={() => toast('Saved!', 'success')}
        onViewProfile={() => toast('View profile coming soon', 'info')}
        onOpenMediaViewer={onOpenMediaViewer}
      />
    </div>
  );
};
