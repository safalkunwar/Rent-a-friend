import { useMemo, useRef } from 'react';
import { Companion, Activity, Event, ExperienceStory, CommunityPost } from '../types';
import { generateDiscoveryFeed, mulberry32, type FeedItem } from '../services/feedGenerator';
import { stabilizeFeed } from '../services/feedStabilizer';
import { useAppContext } from '../context/AppContext';

export function useDiscoveryFeed(
  companions: Companion[],
  activities: Activity[],
  events: Event[],
  stories: ExperienceStory[],
  posts: CommunityPost[]
): FeedItem[] {
  const { currentUser } = useAppContext();

  const userLocation = currentUser?.location;
  const userInterests = (currentUser as any)?.interests;

  const sessionRef = useRef({ uid: currentUser?.id, seed: (Math.random() * 4294967296) >>> 0 });

  const stabilizedRef = useRef<FeedItem[]>([]);

  return useMemo(() => {
    if (sessionRef.current.uid !== currentUser?.id) {
      sessionRef.current = { uid: currentUser?.id, seed: (Math.random() * 4294967296) >>> 0 };
      stabilizedRef.current = [];
    }
    const regenerated = generateDiscoveryFeed(companions, activities, events, stories, posts, {
      userLocation,
      userInterests,
      maxItems: Math.max(60, companions.length + activities.length + events.length + stories.length + posts.length),
      categoriesPerFeed: 16,
      itemsPerCategory: 24,
      rng: mulberry32(sessionRef.current.seed),
    });
    // Ranking caps may omit a still-live item. Only absence from its actual
    // source window removes it; updated payloads replace data in place.
    const available: FeedItem[] = [
      ...companions.map(data => ({ type: 'companion' as const, data, section: '', category: data.interests?.[0] || 'Local Companion' })),
      ...activities.map(data => ({ type: 'activity' as const, data, section: '', category: data.category })),
      ...events.map(data => ({ type: 'event' as const, data, section: '', category: data.category })),
      ...stories.map(data => ({ type: 'story' as const, data, section: '' })),
      ...posts.map(data => ({ type: 'post' as const, data, section: '' })),
    ];
    const stable = stabilizeFeed(stabilizedRef.current, regenerated, available);
    stabilizedRef.current = stable;
    return stable;
  }, [companions, activities, events, stories, posts, currentUser?.id, userLocation, JSON.stringify(userInterests ?? null)]);
}
