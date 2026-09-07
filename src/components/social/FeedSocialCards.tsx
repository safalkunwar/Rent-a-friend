import React, { useState } from 'react';
import { CommunityPost, ExperienceStory } from '../../types';
import { SocialPostCard } from './SocialPostCard';
import { CommentsPanel } from './CommentsPanel';
import { useFeedReaction } from '../../hooks/useFeedReaction';
import { useNavigate } from 'react-router-dom';

interface FeedSocialCardProps {
  onOpenMediaViewer?: (images: string[], index: number) => void;
  onToast?: (message: string, type?: string) => void;
}

export const FeedStoryCard: React.FC<FeedSocialCardProps & { story: ExperienceStory }> = ({ story, onOpenMediaViewer, onToast }) => {
  const navigate = useNavigate();
  const reaction = useFeedReaction('story', story.id, story.likesCount ?? story.likes ?? 0);
  return (
    <div className="max-w-2xl mx-auto">
      <SocialPostCard post={story} type="story" reaction={reaction}
        onToggleComments={() => navigate(`/story/${story.id}?comments=1`)}
        onOpenMediaViewer={() => navigate(`/story/${story.id}`)} onFeedback={onToast} />
    </div>
  );
};

export const FeedPostCard: React.FC<FeedSocialCardProps & { post: CommunityPost }> = ({ post, onOpenMediaViewer, onToast }) => {
  const reaction = useFeedReaction('post', post.id, post.likesCount ?? 0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [liveComments, setLiveComments] = useState<number | null>(null);
  return (
    <div className="max-w-2xl mx-auto">
      <SocialPostCard
        post={liveComments !== null ? { ...post, commentsCount: liveComments } : post}
        type="post" reaction={reaction}
        onToggleComments={() => setPanelOpen(value => !value)}
        onOpenMediaViewer={onOpenMediaViewer} onFeedback={onToast}
      />
      {panelOpen && <CommentsPanel postId={post.id} onClose={() => setPanelOpen(false)} onCountChange={setLiveComments} />}
    </div>
  );
};
