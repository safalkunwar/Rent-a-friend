import { useState, useEffect } from 'react';
import { firestore } from '../services/firestore';
import { Companion, ExperienceStory, Activity, Event, Partner, CommunityPost } from '../types';
import { offlineStorage } from '../services/storage';
import { db } from '../firebase';
import { COMPANIONS, STORIES, ACTIVITIES, EVENTS } from '../data';

// Helper to guarantee list entries are unique by their ID
const deduplicateById = <T extends { id: string }>(arr: T[]): T[] => {
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const useCompanions = () => {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<Companion>('companions');
      if (cached.length > 0) {
        setCompanions(deduplicateById(cached));
        setLoading(false);
      } else if (!db) {
        // Fallback to static data if no Firebase and cache is empty
        await offlineStorage.cacheCollection('companions', COMPANIONS);
        setCompanions(deduplicateById(COMPANIONS));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Companion>('companions', {}, async (items) => {
        if (items.length > 0) {
          const uniqueItems = deduplicateById(items);
          setCompanions(uniqueItems);
          await offlineStorage.cacheCollection('companions', uniqueItems);
        } else {
          // If Firestore is empty but we have zero cached items, seed the cache with our static data
          const cached = await offlineStorage.getCachedCollection<Companion>('companions');
          if (cached.length === 0) {
            await offlineStorage.cacheCollection('companions', COMPANIONS);
            setCompanions(deduplicateById(COMPANIONS));
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  return { companions, loading };
};

export const useStories = () => {
  const [stories, setStories] = useState<ExperienceStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<ExperienceStory>('stories');
      if (cached.length > 0) {
        setStories(deduplicateById(cached));
        setLoading(false);
      } else if (!db) {
        // Fallback to static data if no Firebase and cache is empty
        await offlineStorage.cacheCollection('stories', STORIES);
        setStories(deduplicateById(STORIES));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<ExperienceStory>('stories', {}, async (items) => {
        if (items.length > 0) {
          const uniqueItems = deduplicateById(items);
          setStories(uniqueItems);
          await offlineStorage.cacheCollection('stories', uniqueItems);
        } else {
          const cached = await offlineStorage.getCachedCollection<ExperienceStory>('stories');
          if (cached.length === 0) {
            await offlineStorage.cacheCollection('stories', STORIES);
            setStories(deduplicateById(STORIES));
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  return { stories, loading };
};

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<Activity>('activities');
      if (cached.length > 0) {
        setActivities(deduplicateById(cached));
        setLoading(false);
      } else if (!db) {
        // Fallback to static data if no Firebase and cache is empty
        await offlineStorage.cacheCollection('activities', ACTIVITIES);
        setActivities(deduplicateById(ACTIVITIES));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Activity>('activities', {}, async (items) => {
        if (items.length > 0) {
          const uniqueItems = deduplicateById(items);
          setActivities(uniqueItems);
          await offlineStorage.cacheCollection('activities', uniqueItems);
        } else {
          const cached = await offlineStorage.getCachedCollection<Activity>('activities');
          if (cached.length === 0) {
            await offlineStorage.cacheCollection('activities', ACTIVITIES);
            setActivities(deduplicateById(ACTIVITIES));
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  return { activities, loading };
};

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<Event>('events');
      if (cached.length > 0) {
        setEvents(deduplicateById(cached));
        setLoading(false);
      } else if (!db) {
        // Fallback to static data if no Firebase and cache is empty
        await offlineStorage.cacheCollection('events', EVENTS);
        setEvents(deduplicateById(EVENTS));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Event>('events', {}, async (items) => {
        if (items.length > 0) {
          const uniqueItems = deduplicateById(items);
          setEvents(uniqueItems);
          await offlineStorage.cacheCollection('events', uniqueItems);
        } else {
          const cached = await offlineStorage.getCachedCollection<Event>('events');
          if (cached.length === 0) {
            await offlineStorage.cacheCollection('events', EVENTS);
            setEvents(deduplicateById(EVENTS));
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  return { events, loading };
};

export const usePartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackPartners: Partner[] = [
    { id: "p1", name: "Chiya Ghar", disc: "10% Off SATHI", loc: "Kathmandu" },
    { id: "p2", name: "Himalayan Coffee", disc: "15% Companion Offer", loc: "Pokhara" },
    { id: "p3", name: "The Everest Resort", disc: "NPR 1,500 Booking Credit", loc: "Nagarkot" },
    { id: "p4", name: "Sarangkot Adventures", disc: "Discounted Trek Gear", loc: "Pokhara" }
  ];

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<Partner>('partners');
      if (cached.length > 0) {
        setPartners(deduplicateById(cached));
        setLoading(false);
      } else if (!db) {
        await offlineStorage.cacheCollection('partners', fallbackPartners);
        setPartners(deduplicateById(fallbackPartners));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Partner>('partners', {}, async (items) => {
        if (items.length > 0) {
          const uniqueItems = deduplicateById(items);
          setPartners(uniqueItems);
          await offlineStorage.cacheCollection('partners', uniqueItems);
        } else {
          const cached = await offlineStorage.getCachedCollection<Partner>('partners');
          if (cached.length === 0) {
            await offlineStorage.cacheCollection('partners', fallbackPartners);
            setPartners(deduplicateById(fallbackPartners));
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  return { partners, loading };
};

export const useCommunityPosts = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fallbackPosts: CommunityPost[] = [
    {
      id: "cp1",
      userId: "u-demo-1",
      title: "Unforgettable trekking around Annapurna Circuit!",
      content: "Big shoutout to my amazing companion Rajan for guiding me to the best tea spots and hidden views.",
      category: "Trekking",
      tags: ["trekking", "annapurna"],
      status: "published"
    },
    {
      id: "cp2",
      userId: "u-demo-2",
      title: "Best momos in town!",
      content: "Priya took me to the most incredible local street food spots in Patan. Absolute heaven!",
      category: "Food Explorer",
      tags: ["food", "momo", "patan"],
      status: "published"
    }
  ];

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<CommunityPost>('community_posts');
      if (cached.length > 0) {
        setPosts(deduplicateById(cached));
        setLoading(false);
      } else if (!db) {
        await offlineStorage.cacheCollection('community_posts', fallbackPosts);
        setPosts(deduplicateById(fallbackPosts));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<CommunityPost>('community_posts', {
        where: [{ field: 'status', operator: '==', value: 'published' }],
        orderByField: 'createdAt',
        orderDirection: 'desc'
      }, async (items) => {
        if (items.length > 0) {
          const uniqueItems = deduplicateById(items);
          setPosts(uniqueItems);
          await offlineStorage.cacheCollection('community_posts', uniqueItems);
        } else {
          const cached = await offlineStorage.getCachedCollection<CommunityPost>('community_posts');
          if (cached.length === 0) {
            await offlineStorage.cacheCollection('community_posts', fallbackPosts);
            setPosts(deduplicateById(fallbackPosts));
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, []);

  return { posts, loading };
};
