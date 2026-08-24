import { useMemo, useRef } from 'react';
import { Companion, Activity, Event, ExperienceStory, CommunityPost } from '../types';
import { generateDiscoveryFeed, type FeedItem } from '../services/feedGenerator';
import { stabilizeFeed } from '../services/feedStabilizer';
import { useAppContext } from '../context/AppContext';

const idsKey = (items: { id: string }[]): string => items.map(i => i.id).join(',');

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

  const companionsKey = idsKey(companions);
  const activitiesKey = idsKey(activities);
  const eventsKey = idsKey(events);
  const storiesKey = idsKey(stories);
  const postsKey = idsKey(posts);

  const stabilizedRef = useRef<FeedItem[]>([]);

  return useMemo(() => {
    const regenerated = generateDiscoveryFeed(companions, activities, events, stories, posts, {
      userLocation,
      userInterests,
      maxItems: Math.max(60, companions.length + activities.length + events.length + stories.length + posts.length),
      categoriesPerFeed: 16,
      itemsPerCategory: 24,
    });
    const stable = stabilizeFeed(stabilizedRef.current, regenerated);
    stabilizedRef.current = stable;
    return stable;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companionsKey, activitiesKey, eventsKey, storiesKey, postsKey, userLocation, JSON.stringify(userInterests ?? null)]);
}
