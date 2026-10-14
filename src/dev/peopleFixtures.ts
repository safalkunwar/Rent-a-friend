import type { Companion } from '../types';

export type TestMode = 'free_friend' | 'local_host' | 'guide';
export type TestState = 'ready' | 'review_pending' | 'unavailable';
export interface TestCompanion extends Companion {
  fixture: true;
  mode: TestMode;
  testState: TestState;
  agency?: string;
}

export const MODE_LABELS: Record<TestMode, string> = { free_friend: 'Free Friend', local_host: 'Local Host', guide: 'Guide' };
export const TEST_CATEGORIES = ['Coffee Buddy', 'Hiking Partner', 'Food Explorer', 'Cultural Guide'];
const names = ['Asha', 'Bikash', 'Chandra', 'Deepa', 'Eshan', 'Falguni'];
const places = ['Kathmandu', 'Pokhara', 'Patan'];

/** Design fixtures only: no Auth UID, reviews, identity claims or backend writes. */
export const PEOPLE_FIXTURES: TestCompanion[] = TEST_CATEGORIES.flatMap((category, categoryIndex) =>
  names.map((name, index) => {
    const mode: TestMode = index % 3 === 0 ? 'free_friend' : index % 3 === 1 ? 'local_host' : 'guide';
    return {
      id: `ui-fixture-${categoryIndex}-${index}`, fixture: true, mode,
      name: `${name} ${['K', 'P', 'R', 'S'][categoryIndex]} · Test`, age: 24 + index,
      gender: 'Not specified', location: places[index % places.length],
      bio: `A fictional ${category.toLowerCase()} profile for testing SATHI's discovery layout. No real person or availability is represented.`,
      hourlyRate: mode === 'free_friend' ? 0 : mode === 'local_host' ? 700 + categoryIndex * 100 : 1200 + categoryIndex * 100,
      rating: 0, reviewsCount: 0, isVerified: false, imageUrl: '',
      languages: index % 2 ? ['Nepali', 'English'] : ['Nepali'], interests: [category],
      testState: index === 4 ? 'review_pending' : index === 5 ? 'unavailable' : 'ready',
      ...(mode === 'guide' ? { agency: 'Himalayan Routes · Fictional agency' } : {}),
    };
  })
);

export function filterTestPeople({ mode = 'all', query = '', category = 'All', state = 'all' }: {
  mode?: TestMode | 'all'; query?: string; category?: string; state?: TestState | 'all';
}) {
  const needle = query.trim().toLowerCase();
  return PEOPLE_FIXTURES.filter(person => (mode === 'all' || person.mode === mode)
    && (category === 'All' || person.interests[0] === category)
    && (state === 'all' || person.testState === state)
    && (!needle || [person.name, person.location, ...person.interests, ...person.languages].some(value => value.toLowerCase().includes(needle))));
}
