import { useMemo } from 'react';
import { Companion } from '../types';

interface CategoryGroup {
  category: string;
  emoji: string;
  companions: Companion[];
}

const CATEGORY_EMOJIS: Record<string, string> = {
  'Hiking Partner': '🥾',
  'Travel Companion': '✈️',
  'Coffee Buddy': '☕',
  'Photography Guide': '📷',
  'Food Explorer': '🍜',
  'Cultural Guide': '🏛️',
  'Local Host': '✨',
  'Tour Operator': '🗺️',
  'Cycling Guide': '🚴',
  'Yoga Instructor': '🧘',
  'Bird Watching Guide': '🦅',
  'Heritage Walk Guide': '🚶',
  'Adventure Companion': '🎯',
  'Festival Guide': '🎉',
  'Language Exchange Partner': '🗣️',
  'Museum Guide': '🏛️',
  'Shopping Buddy': '🛍️',
  'Study Partner': '📚',
  'Nightlife': '🌙',
  'Photography Walk': '📷',
  'Local Companion': '✨',
};

const ORDER_PREF = [
  'Hiking Partner',
  'Travel Companion',
  'Coffee Buddy',
  'Food Explorer',
  'Photography Walk',
  'Language Exchange Partner',
  'Museum Guide',
  'Shopping Buddy',
  'Study Partner',
  'Nightlife',
  'Local Companion',
];

export function useCompanionCategories(companions: Companion[]): CategoryGroup[] {
  return useMemo(() => {
    const map: Record<string, Companion[]> = {};
    companions.forEach(c => {
      const primaryCat = c.interests[0] || 'Local Companion';
      if (!map[primaryCat]) {
        map[primaryCat] = [];
      }
      map[primaryCat].push(c);
    });

    const activeCats = Object.keys(map).filter(cat => map[cat].length > 0);
    const sorted = [
      ...ORDER_PREF.filter(cat => activeCats.includes(cat)),
      ...activeCats.filter(cat => !ORDER_PREF.includes(cat))
    ];

    return sorted.map(cat => ({
      category: cat,
      emoji: CATEGORY_EMOJIS[cat] || '✨',
      companions: map[cat],
    }));
  }, [companions]);
}
