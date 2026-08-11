import { firestore } from './firestore';
import { Companion, Activity, Event } from '../types';

export interface SearchResult<T> {
  items: T[];
  total: number;
}

export interface SearchFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const searchService = {
  async searchCompanions(query: string, filters: SearchFilters = {}, limitCount = 20): Promise<SearchResult<Companion>> {
    const whereCond: any[] = [];
    if (filters.location) {
      whereCond.push({ field: 'location', operator: '==', value: filters.location });
    }
    if (filters.minPrice !== undefined) {
      whereCond.push({ field: 'hourlyRate', operator: '>=', value: filters.minPrice });
    }
    if (filters.maxPrice !== undefined) {
      whereCond.push({ field: 'hourlyRate', operator: '<=', value: filters.maxPrice });
    }

    const items = await firestore.getDocuments<Companion>('companions', {
      where: whereCond,
      orderByField: 'rating',
      orderDirection: 'desc',
      limitCount,
    });

    const lowerQuery = query.toLowerCase();
    const filtered = items.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.location.toLowerCase().includes(lowerQuery) ||
      c.languages.some(l => l.toLowerCase().includes(lowerQuery)) ||
      c.interests.some(i => i.toLowerCase().includes(lowerQuery))
    );

    return { items: filtered, total: filtered.length };
  },

  async searchActivities(query: string, filters: SearchFilters = {}, limitCount = 20): Promise<SearchResult<Activity>> {
    const whereCond: any[] = [];
    if (filters.location) {
      whereCond.push({ field: 'location', operator: '==', value: filters.location });
    }
    if (filters.minPrice !== undefined) {
      whereCond.push({ field: 'avgPrice', operator: '>=', value: filters.minPrice });
    }
    if (filters.maxPrice !== undefined) {
      whereCond.push({ field: 'avgPrice', operator: '<=', value: filters.maxPrice });
    }
    if (filters.category) {
      whereCond.push({ field: 'category', operator: '==', value: filters.category });
    }

    const items = await firestore.getDocuments<Activity>('activities', {
      where: whereCond,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limitCount,
    });

    const lowerQuery = query.toLowerCase();
    const filtered = items.filter(a =>
      a.title.toLowerCase().includes(lowerQuery) ||
      a.location.toLowerCase().includes(lowerQuery) ||
      a.description?.toLowerCase().includes(lowerQuery)
    );

    return { items: filtered, total: filtered.length };
  },

  async searchEvents(query: string, filters: SearchFilters = {}, limitCount = 20): Promise<SearchResult<Event>> {
    const whereCond: any[] = [];
    if (filters.location) {
      whereCond.push({ field: 'location', operator: '==', value: filters.location });
    }
    if (filters.dateFrom) {
      whereCond.push({ field: 'date', operator: '>=', value: filters.dateFrom });
    }
    if (filters.dateTo) {
      whereCond.push({ field: 'date', operator: '<=', value: filters.dateTo });
    }

    const items = await firestore.getDocuments<Event>('events', {
      where: whereCond,
      orderByField: 'date',
      orderDirection: 'asc',
      limitCount,
    });

    const lowerQuery = query.toLowerCase();
    const filtered = items.filter(e =>
      e.title.toLowerCase().includes(lowerQuery) ||
      e.location.toLowerCase().includes(lowerQuery) ||
      e.description?.toLowerCase().includes(lowerQuery)
    );

    return { items: filtered, total: filtered.length };
  },
};
