import type { Companion } from '../types';

// Firestore casts are not runtime validation. Search must tolerate legacy fields
// without converting objects/numbers into searchable profile claims.
export const searchText = (value: unknown): string => typeof value === 'string' ? value.toLowerCase() : '';
export const searchStrings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((entry): entry is string => typeof entry === 'string') : [];

interface CompanionFilters {
  query: string;
  category: string;
  city: string;
  language: string;
  maxRate: number;
  minRating: number;
  savedOnly: boolean;
  favorites: readonly string[];
  sort: 'recommended' | 'priceAsc' | 'priceDesc' | 'rating';
}

export function filterCompanions(companions: Companion[], filters: CompanionFilters): Companion[] {
  const q = searchText(filters.query).trim();
  const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  return companions.filter(c => {
    const interests = searchStrings(c.interests), languages = searchStrings(c.languages);
    const matchesSearch = !q || [c.location, c.name, c.bio, ...interests, ...languages].some(v => searchText(v).includes(q));
    return matchesSearch
      && (filters.category === 'All' || interests.some(v => searchText(v) === searchText(filters.category)) || searchText(c.bio).includes(searchText(filters.category)))
      && (filters.city === 'All' || searchText(c.location) === searchText(filters.city))
      && (filters.language === 'All' || languages.some(v => searchText(v) === searchText(filters.language)))
      // Unknown prices must not masquerade as zero-priced companions.
      && numeric(c.hourlyRate) && c.hourlyRate <= filters.maxRate
      && (filters.minRating === 0 || (numeric(c.rating) && c.rating >= filters.minRating))
      && (!filters.savedOnly || filters.favorites.includes(c.id));
  }).sort((a, b) => {
    if (filters.sort === 'priceAsc') return a.hourlyRate - b.hourlyRate;
    if (filters.sort === 'priceDesc') return b.hourlyRate - a.hourlyRate;
    if (filters.sort === 'rating') return (numeric(b.rating) ? b.rating : -1) - (numeric(a.rating) ? a.rating : -1);
    return 0;
  });
}

export function homeSourceError(sources: Record<string, unknown>): string | null {
  const failed = Object.keys(sources).filter(name => Boolean(sources[name]));
  return failed.length ? `Could not load: ${failed.join(', ')}. Loaded content remains available.` : null;
}
