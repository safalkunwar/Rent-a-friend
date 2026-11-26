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

export interface CompanionMatch {
  companion: Companion;
  score: number;
  reasons: string[];
}

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const interestKey = (value: string) => {
  const item = normalized(value).replace(/\b(partner|guide|companion|buddy|explorer|instructor)\b/g, '').replace(/\s+/g, ' ').trim();
  if (/\b(travel|exploration)\b/.test(item)) return 'travel';
  if (/\b(food|cafe|cafes|coffee|restaurant)\b/.test(item)) return 'food';
  if (/\b(hik|hiking|outdoors?)\b/.test(item)) return 'outdoors';
  if (/\b(culture|cultural|local experiences)\b/.test(item)) return 'culture';
  return item;
};
const preferenceValues = (value: unknown) => typeof value === 'string'
  ? value.split(/[,;|]/).map(item => item.trim()).filter(Boolean)
  : searchStrings(value);
const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const expandAvailability = (values: string[]) => new Set(values.flatMap(value => {
  const item = normalized(value);
  if (item === 'weekends') return ['saturday', 'sunday'];
  if (item === 'weekdays') return dayNames.slice(0, 5);
  if (item === 'flexible') return dayNames;
  return [item];
}));

/**
 * Explainable, local-only ranking over fields the user or companion chose to share.
 * It does not use age, gender, identity evidence, contact details, or exact coordinates.
 */
export function rankCompanions(companions: Companion[], viewer?: {
  interests?: unknown;
  languages?: unknown;
  location?: unknown;
  availability?: unknown;
} | null): CompanionMatch[] {
  const interests = new Set(searchStrings(viewer?.interests).map(interestKey).filter(Boolean));
  const languages = new Set(preferenceValues(viewer?.languages).map(normalized).filter(Boolean));
  const availability = expandAvailability(preferenceValues(viewer?.availability).filter(Boolean));
  const city = searchText(viewer?.location).trim();

  return companions.map(companion => {
    const sharedInterests = [...new Set(searchStrings(companion.interests)
      .filter(value => interests.has(interestKey(value))))];
    const sharedLanguages = [...new Set(searchStrings(companion.languages).filter(value => languages.has(normalized(value))))];
    const sharedAvailability = [...expandAvailability(searchStrings(companion.availableDays))]
      .filter(value => availability.has(value));
    const sameCity = Boolean(city && normalized(companion.location || '') === normalized(city));
    const score = Math.min(sharedInterests.length, 3) * 4 + Math.min(sharedLanguages.length, 2) * 2 +
      (sharedAvailability.length ? 1 : 0) + (sameCity ? 1 : 0);
    const reasons: string[] = [];
    if (sharedInterests.length) reasons.push(`You both enjoy ${sharedInterests.slice(0, 2).join(' and ')}`);
    if (sharedLanguages.length) reasons.push(`You both speak ${sharedLanguages.slice(0, 2).join(' and ')}`);
    if (sharedAvailability.length) reasons.push('Your available days overlap');
    if (sameCity) reasons.push(`You are both in ${companion.location}`);
    return { companion, score, reasons };
  }).sort((a, b) => b.score - a.score || a.companion.id.localeCompare(b.companion.id));
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
      && (filters.maxRate === Infinity || (numeric(c.hourlyRate) && c.hourlyRate <= filters.maxRate))
      && (filters.minRating === 0 || (numeric(c.rating) && c.rating >= filters.minRating))
      && (!filters.savedOnly || filters.favorites.includes(c.id));
  }).sort((a, b) => {
    if (filters.sort === 'priceAsc') return a.hourlyRate - b.hourlyRate;
    if (filters.sort === 'priceDesc') return b.hourlyRate - a.hourlyRate;
    if (filters.sort === 'rating') return (numeric(b.rating) ? b.rating : -1) - (numeric(a.rating) ? a.rating : -1);
    return a.id.localeCompare(b.id);
  });
}

export function homeSourceError(sources: Record<string, unknown>): string | null {
  const failed = Object.keys(sources).filter(name => Boolean(sources[name]));
  return failed.length ? `Could not load: ${failed.join(', ')}. Loaded content remains available.` : null;
}
