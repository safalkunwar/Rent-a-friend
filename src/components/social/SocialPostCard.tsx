import React, { useState } from 'react';
import { ExperienceStory, CommunityPost } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { ExpandableText } from './ExpandableText';
import { postUrl } from '../../services/deepLinks';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, MapPin } from 'lucide-react';

interface SocialPostCardProps {
  post: ExperienceStory | CommunityPost;
  type: 'story' | 'post';
  reaction: { liked: boolean; count: number; busy: boolean; error: string | null; setLiked: (liked: boolean) => Promise<boolean>; refresh: () => Promise<void> };
  onFeedback?: (message: string, type?: string) => void;
  onOpenMediaViewer?: (images: string[], index: number) => void;
  onToggleComments?: () => void;
}

export const SocialPostCard: React.FC<SocialPostCardProps> = ({
  post,
  type,
  reaction,
  onFeedback,
  onOpenMediaViewer,
  onToggleComments,
}) => {
  const { liked, count: likes } = reaction;
  const [shareError, setShareError] = useState<string | null>(null);

  const isStory = type === 'story';
  const storyPost = isStory ? (post as ExperienceStory) : null;
  const communityPost = !isStory ? (post as CommunityPost) : null;

  const comments = (isStory ? (storyPost!.commentsCount ?? storyPost!.comments) : communityPost!.commentsCount) || 0;

  const images = isStory
    ? [post.imageUrl].filter(Boolean) as string[]
    : communityPost?.imageUrl
      ? [communityPost.imageUrl].filter(Boolean) as string[]
      : [];

  const userName = isStory ? storyPost!.userName : communityPost!.userName;
  const userAvatar = isStory ? storyPost!.userAvatar : communityPost!.userAvatar;
  const timestamp = isStory ? storyPost!.createdAt : communityPost!.createdAt;
  const caption = isStory ? storyPost!.caption : communityPost!.content;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    void reaction.setLiked(!liked);
  };

  const handleCommentClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleComments) {
      onToggleComments();
      return;
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShareError(null);
    if (isStory) return; // /post/:id cannot resolve a Story document.
    const url = postUrl(post.id);
    if (navigator.share) {
      try {
        await navigator.share({ title: caption, url });
        return;
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      onFeedback?.('Post link copied.', 'success');
    } catch {
      setShareError('Could not copy the post link. Try sharing from your browser.');
    }
  };

  const openViewer = (index: number) => {
    if (images.length > 0) {
      onOpenMediaViewer?.(images, index);
    }
  };

  const renderMediaGallery = () => {
    if (images.length === 0) return null;

    if (images.length === 1) {
      return (
        <div className="relative aspect-[4/3] w-full bg-surface-elevated cursor-pointer" onClick={() => openViewer(0)}>
          <SafeImage src={images[0]} className="w-full h-full object-cover" alt={caption} />
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5 w-full">
          {images.slice(0, 2).map((img, idx) => (
            <div key={idx} className="relative aspect-square bg-surface-elevated cursor-pointer" onClick={() => openViewer(idx)}>
              <SafeImage src={img} className="w-full h-full object-cover" alt={caption} />
            </div>
          ))}
        </div>
      );
    }

    if (images.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-0.5 w-full">
          <div className="relative aspect-square bg-surface-elevated cursor-pointer" onClick={() => openViewer(0)}>
            <SafeImage src={images[0]} className="w-full h-full object-cover" alt={caption} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="relative flex-1 bg-surface-elevated cursor-pointer" onClick={() => openViewer(1)}>
              <SafeImage src={images[1]} className="w-full h-full object-cover" alt={caption} />
            </div>
            <div className="relative flex-1 bg-surface-elevated cursor-pointer" onClick={() => openViewer(2)}>
              <SafeImage src={images[2]} className="w-full h-full object-cover" alt={caption} />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-0.5 w-full">
        {images.slice(0, 4).map((img, idx) => (
          <div key={idx} className="relative aspect-square bg-surface-elevated cursor-pointer" onClick={() => openViewer(idx)}>
            <SafeImage src={img} className="w-full h-full object-cover" alt={caption} />
            {idx === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-bold text-lg">+{images.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <article className="bg-surface border border-white/5 rounded-3xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SafeImage
              src={userAvatar}
              alt={userName}
              fallbackType="avatar"
              textForInitials={userName}
              className="w-10 h-10 rounded-full object-cover border-2 border-primary-action"
            />
            {isStory && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-surface rounded-full" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-text-primary">{userName}</h4>
            <p className="text-[10px] text-text-secondary">
              {timestamp ? new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            </p>
          </div>
        </div>
        <button disabled aria-label="More options unavailable" title="More options unavailable" className="p-2 text-text-secondary hover:text-text-primary transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Media Gallery */}
      {renderMediaGallery()}

      {/* Content */}
      <div className="p-4 space-y-3">
        <ExpandableText
          text={caption}
          lines={1}
          className="text-sm text-text-primary leading-relaxed"
          buttonClassName="text-xs font-bold text-primary-action hover:underline"
        />

        {/* Location */}
        {!isStory && communityPost?.location && (
          <div className="flex items-center gap-1 text-[10px] text-text-secondary">
            <MapPin className="w-3 h-3 text-primary-action" />
            <span>{communityPost.location}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={reaction.busy || !!reaction.error}
              aria-label={liked ? 'Unlike' : 'Like'}
              aria-pressed={liked}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${liked ? 'text-red-500' : 'text-text-secondary hover:text-red-500'}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span>{likes}</span>
            </button>
            <button
              onClick={(e) => void handleCommentClick(e)}
              disabled={!onToggleComments}
              aria-label={onToggleComments ? 'Comments' : 'Story comments unavailable'}
              title={onToggleComments ? 'Comments' : 'Story comments unavailable'}
              className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary-action transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{comments}</span>
            </button>
            <button
              onClick={handleShare}
              disabled={isStory}
              aria-label={isStory ? 'Story sharing unavailable' : 'Share post'}
              title={isStory ? 'Story sharing unavailable' : 'Share post'}
              className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary-action transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
          <button
            disabled
            aria-label="Saving posts is unavailable"
            title="Saving posts is unavailable"
            className="p-2 text-text-secondary"
          >
            <Bookmark className="w-5 h-5" />
          </button>
        </div>
        {reaction.error && <p role="alert" className="text-xs text-text-secondary">{reaction.error} <button disabled={reaction.busy} onClick={() => { void reaction.refresh(); }} className="text-primary-action">Refresh likes</button></p>}
        {shareError && <p role="alert" className="text-xs text-text-secondary">{shareError}</p>}
      </div>
    </article>
  );
};
