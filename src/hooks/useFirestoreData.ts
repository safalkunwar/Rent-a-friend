import { useState, useEffect } from 'react';
import { firestore } from '../services/firestore';
import { Companion, ExperienceStory, Activity, Event, Partner, CommunityPost } from '../types';
import { offlineStorage } from '../services/storage';
import { db } from '../firebase';

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
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Companion>('companions', { limitCount: 30 }, async (items) => {
        const uniqueItems = deduplicateById(items);
        setCompanions(uniqueItems);
        await offlineStorage.cacheCollection('companions', uniqueItems);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
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
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<ExperienceStory>('stories', {
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: 20
      }, async (items) => {
        const uniqueItems = deduplicateById(items);
        setStories(uniqueItems);
        await offlineStorage.cacheCollection('stories', uniqueItems);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
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
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Activity>('activities', { limitCount: 20 }, async (items) => {
        const uniqueItems = deduplicateById(items);
        setActivities(uniqueItems);
        await offlineStorage.cacheCollection('activities', uniqueItems);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
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
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Event>('events', { limitCount: 20 }, async (items) => {
        const uniqueItems = deduplicateById(items);
        setEvents(uniqueItems);
        await offlineStorage.cacheCollection('events', uniqueItems);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  return { events, loading };
};

export const usePartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<Partner>('partners');
      if (cached.length > 0) {
        setPartners(deduplicateById(cached));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<Partner>('partners', { limitCount: 20 }, async (items) => {
        const uniqueItems = deduplicateById(items);
        setPartners(uniqueItems);
        await offlineStorage.cacheCollection('partners', uniqueItems);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  return { partners, loading };
};

export const useCommunityPosts = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFromCache = async () => {
      const cached = await offlineStorage.getCachedCollection<CommunityPost>('community_posts');
      if (cached.length > 0) {
        setPosts(deduplicateById(cached));
        setLoading(false);
      }
    };

    loadFromCache();

    if (db) {
      const unsubscribe = firestore.subscribe<CommunityPost>('community_posts', {
        where: [{ field: 'status', operator: '==', value: 'published' }],
        orderByField: 'createdAt',
        orderDirection: 'desc',
        limitCount: 20
      }, async (items) => {
        const uniqueItems = deduplicateById(items);
        setPosts(uniqueItems);
        await offlineStorage.cacheCollection('community_posts', uniqueItems);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  return { posts, loading };
};
