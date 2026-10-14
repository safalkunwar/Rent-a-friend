import type { Companion, User } from '../types';
import { searchStrings } from './discoverySearch';

export interface HomePerson {
  companion: Companion;
  reason: string | null;
  matchedInterest: string | null;
}

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** Rank only the bounded source window. A profile is not promoted as a verified service mode. */
export function rankHomePeople(companions: Companion[], user?: Pick<User, 'interests' | 'location'> | null, limit = 4): HomePerson[] {
  const interests = [...new Set(searchStrings(user?.interests).map(normalized).filter(Boolean))];
  const location = typeof user?.location === 'string' ? normalized(user.location) : '';
  const seenPeople = new Set<string>();
  return companions.flatMap(companion => {
    if (!companion?.id || seenPeople.has(companion.userId || companion.id)) return [];
    seenPeople.add(companion.userId || companion.id);
    const tags = searchStrings(companion.interests);
    const matched = tags.filter((tag, index) => interests.includes(normalized(tag)) && tags.findIndex(other => normalized(other) === normalized(tag)) === index);
    const sameArea = !!location && normalized(companion.location || '') === location;
    const score = (interests.length ? 0.75 * matched.length / interests.length : 0) + (sameArea ? 0.25 : 0);
    const reason = matched.length ? `You both like ${matched[0]}` : sameArea ? `Also in ${companion.location}` : null;
    return [{ companion, reason, matchedInterest: matched[0] ?? null, score }];
  }).sort((a, b) => b.score - a.score || a.companion.id.localeCompare(b.companion.id))
    .slice(0, Math.max(0, limit))
    .map(({ companion, reason, matchedInterest }) => ({ companion, reason, matchedInterest }));
}

export function hasHomeInterestMatch(people: HomePerson[]): boolean {
  return people.some(person => person.matchedInterest !== null);
}
