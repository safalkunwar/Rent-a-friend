import { useMemo } from 'react';
import { Companion, Activity, Event, ExperienceStory, CommunityPost } from '../types';
import { generateDiscoveryFeed, type FeedItem } from '../services/feedGenerator';
import { useAppContext } from '../context/AppContext';

export function useDiscoveryFeed(
  companions: Companion[],
  activities: Activity[],
  events: Event[],
  stories: ExperienceStory[],
  posts: CommunityPost[]
): FeedItem[] {
  const { currentUser, favorites } = useAppContext();

  return useMemo(() => {
    const userLocation = currentUser?.location;
    const userInterests = (currentUser as any)?.interests;
    return generateDiscoveryFeed(companions, activities, events, stories, posts, {
      userLocation,
      userInterests,
      savedCompanionIds: favorites,
      maxItems: 60,
    });
  }, [companions, activities, events, stories, posts, currentUser?.location, (currentUser as any)?.interests, favorites]);
}
