import React, { useState } from 'react';
import { ExperienceStory, CommunityPost } from '../../types';
import { SafeImage } from '../ui/SafeImage';
import { ExpandableText } from './ExpandableText';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, MapPin } from 'lucide-react';

interface SocialPostCardProps {
  post: ExperienceStory | CommunityPost;
  type: 'story' | 'post';
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  onComment?: (id: string) => void;
  onShare?: (id: string) => void;
  onSave?: (id: string) => void;
  onViewProfile?: (userId: string) => void;
  onOpenMediaViewer?: (images: string[], index: number) => void;
  initialLiked?: boolean;
}

export const SocialPostCard: React.FC<SocialPostCardProps> = ({
  post,
  type,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onSave,
  onViewProfile,
  onOpenMediaViewer,
  initialLiked = false,
}) => {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(false);

  const isStory = type === 'story';
  const storyPost = isStory ? (post as ExperienceStory) : null;
  const communityPost = !isStory ? (post as CommunityPost) : null;

  const images = isStory
    ? [post.imageUrl].filter(Boolean) as string[]
    : communityPost?.imageUrl
      ? [communityPost.imageUrl].filter(Boolean) as string[]
      : [];

  const userName = isStory ? storyPost!.userName : communityPost!.userName;
  const userAvatar = isStory ? storyPost!.userAvatar : communityPost!.userAvatar;
  const timestamp = isStory ? storyPost!.createdAt : communityPost!.createdAt;
  const likes = isStory ? storyPost!.likes || 0 : communityPost!.likesCount || 0;
  const comments = isStory ? storyPost!.comments || 0 : communityPost!.commentsCount || 0;
  const caption = isStory ? storyPost!.caption : communityPost!.content;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !liked;
    setLiked(nextLiked);
    if (nextLiked) {
      onLike?.(post.id);
    } else {
      onUnlike?.(post.id);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    onSave?.(post.id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: caption, url });
      } catch {
        await navigator.clipboard.writeText(url);
        onShare?.(post.id);
      }
    } else {
      await navigator.clipboard.writeText(url);
      onShare?.(post.id);
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
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile?.(post.userId || '')}>
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
        <button className="p-2 text-text-secondary hover:text-text-primary transition-colors">
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
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${liked ? 'text-red-500' : 'text-text-secondary hover:text-red-500'}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              <span>{likes}</span>
            </button>
            <button
              onClick={() => onComment?.(post.id)}
              className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary-action transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{comments}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-primary-action transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleSave}
            className={`p-2 transition-colors ${saved ? 'text-primary-action' : 'text-text-secondary hover:text-primary-action'}`}
          >
            <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  );
};
