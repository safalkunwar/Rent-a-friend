import React, { useMemo, useRef, useState } from 'react';
import { Companion, Activity, Event, ExperienceStory, CommunityPost } from '../../types';
import { generateDiscoveryFeed, type FeedItem } from '../../services/feedGenerator';
import { CompanionCard } from '../companions/CompanionCard';
import { SocialPostCard } from '../social/SocialPostCard';
import { SafeImage } from '../ui/SafeImage';
import { Heart, MapPin, Star, ArrowRight, ChevronRight, Search } from 'lucide-react';

interface DiscoveryFeedProps {
  companions: Companion[];
  activities: Activity[];
  events: Event[];
  stories: ExperienceStory[];
  posts: CommunityPost[];
  currentUser: { avatar?: string; location?: string; interests?: string[] } | null;
  favorites: string[];
  onToggleFavorite: (companionId: string) => void;
  onViewCompanion: (companion: Companion) => void;
  onShowToast: (message: string, type?: string) => void;
  onNavigateExplore: (category?: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenFilterDrawer: () => void;
  onCreateStory: () => void;
  onViewStory: (story: ExperienceStory) => void;
}

const BATCH_SIZE = 8;

const CATEGORY_EMOJIS: Record<string, string> = {
  'Hiking Partner': '🥾',
  'Travel Companion': '✈️',
  'Coffee Buddy': '☕',
  'Photography Guide': '📷',
  'Food Explorer': '🍜',
  'Cultural Guide': '🏛️',
  'Local Host': '✨',
  'Tour Operator': '🗺️',
  'Cycling Guide': '🚴',
  'Yoga Instructor': '🧘',
  'Bird Watching Guide': '🦅',
  'Heritage Walk Guide': '🚶',
  'Adventure Companion': '🎯',
  'Festival Guide': '🎉',
  'Language Exchange Partner': '🗣️',
};

export const DiscoveryFeed: React.FC<DiscoveryFeedProps> = React.memo(({
  companions,
  activities,
  events,
  stories,
  posts,
  currentUser,
  favorites,
  onToggleFavorite,
  onViewCompanion,
  onShowToast,
  onNavigateExplore,
  searchQuery,
  onSearchChange,
  onOpenFilterDrawer,
  onCreateStory,
  onViewStory,
}) => {
  const [visibleCount, setVisibleCount] = React.useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const feedItems = useMemo(() => {
    return generateDiscoveryFeed(companions, activities, events, stories, posts, {
      userLocation: currentUser?.location,
      userInterests: currentUser?.interests,
      savedCompanionIds: favorites,
      maxItems: 60,
    });
  }, [companions, activities, events, stories, posts, currentUser?.location, currentUser?.interests, favorites]);

  const visibleItems = useMemo(() => feedItems.slice(0, visibleCount), [feedItems, visibleCount]);

  React.useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [feedItems]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < feedItems.length) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, feedItems.length));
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, feedItems.length]);

  React.useEffect(() => {
    const saved = sessionStorage.getItem('discoveryFeedScroll');
    if (saved) {
      window.scrollTo(0, parseInt(saved, 10));
      sessionStorage.removeItem('discoveryFeedScroll');
    }
    return () => {
      sessionStorage.setItem('discoveryFeedScroll', String(window.scrollY));
    };
  }, []);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxImages(null);
    setLightboxIndex(null as any);
  };

  const nextImage = () => {
    if (lightboxImages && lightboxIndex < lightboxImages.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const prevImage = () => {
    if (lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  // Group consecutive companion items by category for context headers
  const renderFeed = () => {
    const elements: React.ReactNode[] = [];
    let companionBuffer: { item: FeedItem; idx: number }[] = [];
    let currentCategory: string | null = null;

    const flushCompanionBuffer = () => {
      if (companionBuffer.length === 0) return;
      
      const category = (companionBuffer[0].item as any).category || 'Companions';
      const emoji = CATEGORY_EMOJIS[category] || '✨';
      
      elements.push(
        <div key={`companion-group-${category}-${companionBuffer[0].idx}`} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label={category}>{emoji}</span>
              <h3 className="text-lg font-bold text-text-primary tracking-tight">{category}</h3>
              <span className="text-[10px] bg-surface-elevated text-text-secondary px-2 py-0.5 rounded-full border border-white/5">
                {companionBuffer.length} {companionBuffer.length === 1 ? 'guide' : 'guides'}
              </span>
            </div>
            <button
              onClick={() => onNavigateExplore(category)}
              className="text-xs font-bold text-primary-action hover:underline flex items-center gap-1"
            >
              View More <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x snap-mandatory">
            {companionBuffer.map(({ item, idx }) => (
              <div key={`${item.data.id}-${idx}`}>
                <CompanionCard
                  companion={item.data as Companion}
                  isFav={favorites.includes(item.data.id)}
                  onToggleFavorite={onToggleFavorite}
                  onViewCompanion={onViewCompanion}
                  onShowToast={onShowToast}
                  layout="default"
                />
              </div>
            ))}
          </div>
        </div>
      );
      companionBuffer = [];
    };

    visibleItems.forEach((item, idx) => {
      if (item.type === 'companion') {
        const cat = item.category || null;
        if (currentCategory && cat !== currentCategory && companionBuffer.length > 0) {
          flushCompanionBuffer();
        }
        currentCategory = cat;
        companionBuffer.push({ item, idx });
      } else {
        flushCompanionBuffer();
        currentCategory = null;
        
        if (item.type === 'story') {
          elements.push(
            <div key={`${item.data.id}-${idx}`} className="max-w-2xl mx-auto">
              <SocialPostCard
                post={item.data as ExperienceStory}
                type="story"
                onLike={(id) => onShowToast('Liked!', 'success')}
                onComment={(id) => onShowToast('Comments coming soon', 'info')}
                onShare={(id) => onShowToast('Shared!', 'success')}
                onSave={(id) => onShowToast('Saved!', 'success')}
                onViewProfile={(userId) => onShowToast('View profile coming soon', 'info')}
                onOpenMediaViewer={openLightbox}
              />
            </div>
          );
        } else if (item.type === 'post') {
          elements.push(
            <div key={`${item.data.id}-${idx}`} className="max-w-2xl mx-auto">
              <SocialPostCard
                post={item.data as CommunityPost}
                type="post"
                onLike={(id) => onShowToast('Liked!', 'success')}
                onComment={(id) => onShowToast('Comments coming soon', 'info')}
                onShare={(id) => onShowToast('Shared!', 'success')}
                onSave={(id) => onShowToast('Saved!', 'success')}
                onViewProfile={(userId) => onShowToast('View profile coming soon', 'info')}
                onOpenMediaViewer={openLightbox}
              />
            </div>
          );
        } else if (item.type === 'activity') {
          elements.push(
            <div key={`${item.data.id}-${idx}`} className="max-w-2xl mx-auto">
              <div
                onClick={() => onNavigateExplore((item.data as Activity).category || 'All')}
                className="bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-lg flex flex-col cursor-pointer hover:border-primary-action/30 transition-all"
              >
                <div className="relative h-48 bg-surface-elevated">
                  <SafeImage src={(item.data as Activity).imageUrl || (item.data as Activity).image} className="w-full h-full object-cover" alt={(item.data as Activity).title} />
                  <span className="absolute top-3 left-3 bg-primary-action text-background text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {(item.data as Activity).category || 'EXPERIENCE'}
                  </span>
                </div>
                <div className="p-4 space-y-2 text-left">
                  <h4 className="text-sm font-bold text-text-primary">{(item.data as Activity).title}</h4>
                  <p className="text-xs text-text-secondary flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary-action" />
                    {(item.data as Activity).location || 'Nepal'} • {(item.data as Activity).duration}
                  </p>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-sm font-black text-primary-action">NPR {(item.data as Activity).avgPrice || (item.data as Activity).price || '1,500'}</span>
                    <div className="flex items-center gap-0.5 text-xs text-primary-action font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      <span>4.8</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        } else if (item.type === 'event') {
          elements.push(
            <div key={`${item.data.id}-${idx}`} className="max-w-2xl mx-auto">
              <div
                onClick={() => onShowToast(`Event: ${(item.data as Event).title} • spots left: ${(item.data as Event).spots}`, 'info')}
                className="bg-surface border border-white/5 rounded-2xl p-4 flex gap-4 cursor-pointer active:scale-98 transition-all"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-elevated shrink-0">
                  <SafeImage src={(item.data as Event).imageUrl} className="w-full h-full object-cover" alt={(item.data as Event).title} fallbackType="thumbnail" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-text-primary truncate leading-tight">{(item.data as Event).title}</h4>
                    <p className="text-xs text-text-secondary mt-1 truncate font-light flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary-action" />
                      {(item.data as Event).location}
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-primary-action font-bold font-mono">{(item.data as Event).date}</span>
                    <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{(item.data as Event).spots} Left</span>
                  </div>
                </div>
              </div>
            </div>
          );
        }
      }
    });

    flushCompanionBuffer();
    return elements;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 bg-background border-b border-white/5 h-[62px] sticky top-0 z-20">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary-action flex items-center justify-center font-bold text-background text-base">S</div>
          <span className="text-lg font-black tracking-tight text-text-primary hidden sm:inline">SATHI</span>
        </div>
        
        <div className="flex-1 relative flex items-center">
          <Search className="w-4 h-4 text-primary-action absolute left-3" />
          <input
            type="text"
            placeholder="Search companions, experiences, events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-9 pr-9 bg-surface-elevated/60 backdrop-blur-md rounded-full border border-white/10 text-xs text-text-primary focus:outline-none focus:border-primary-action transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-text-secondary hover:text-primary-action transition-colors text-xs font-bold"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <img
            src={currentUser?.avatar || "https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?q=80&w=300&auto=format&fit=crop"}
            className="w-9 h-9 rounded-full object-cover border-2 border-primary-action cursor-pointer"
            alt="Profile"
          />
        </div>
      </div>

      {/* Stories */}
      <div className="px-4">
        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x">
          <div
            onClick={onCreateStory}
            className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 snap-start"
          >
            <div className="relative w-[68px] h-[68px] rounded-full border-2 border-dashed border-primary-action/60 flex items-center justify-center bg-surface">
              <span className="text-lg font-bold text-primary-action">+</span>
            </div>
            <span className="text-[10px] text-text-secondary font-bold">Your Story</span>
          </div>
          {stories.map((st, i) => (
            <div
              key={`${st.id}-${i}`}
              onClick={() => onViewStory(st)}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 snap-start"
            >
              <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-[#C8A25E] via-pink-600 to-purple-600">
                <div className="p-[1.5px] rounded-full bg-background">
                  <SafeImage
                    src={st.userAvatar}
                    alt={st.userName}
                    fallbackType="avatar"
                    textForInitials={st.userName}
                    className="w-[60px] h-[60px] rounded-full object-cover"
                  />
                </div>
                <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              </div>
              <span className="text-[10px] text-text-primary font-bold truncate max-w-[65px]">{st.userName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Continuous Mixed Discovery Feed */}
      <div className="px-4 space-y-8">
        {renderFeed()}
      </div>

      {/* Progressive loading sentinel */}
      {visibleCount < feedItems.length && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <div className="w-8 h-8 rounded-full border-2 border-t-primary-action border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
      )}

      {/* Become a Companion */}
      <div className="px-4 py-1 pb-6">
        <div className="relative rounded-[24px] overflow-hidden min-h-[160px] border border-white/5 flex flex-col justify-end p-5 text-left bg-surface">
          <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover brightness-[0.4]" alt="Become a Companion" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
          <div className="relative z-10 space-y-2.5">
            <h3 className="text-sm font-extrabold text-text-primary leading-tight">Become a SATHI Companion</h3>
            <p className="text-[10px] text-gray-300 leading-relaxed max-w-[240px]">Share your favorite local spots, guide travelers, and earn up to <span className="text-text-primary font-bold">NPR 15,000/week</span> on your own schedule.</p>
            <button
              onClick={onCreateStory}
              className="w-max px-4 py-2 bg-primary-action hover:bg-primary-action-hover active:scale-95 text-background rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>

      {/* Media Lightbox */}
      {lightboxImages && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          
          <img
            src={lightboxImages[lightboxIndex]}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {lightboxImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === lightboxIndex ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

DiscoveryFeed.displayName = 'DiscoveryFeed';
