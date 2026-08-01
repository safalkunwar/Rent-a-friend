/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: ThemeMode;
  language: string;
  pushNotifications: boolean;
  bookingUpdates: boolean;
  messages: boolean;
  promotions: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  sidebarState: 'open' | 'closed';
  filters: {
    category: string;
    city: string;
    sortBy: string;
  };
  mapPreference: {
    showGuideMarkers: boolean;
    zoomLevel: number;
  };
  companionView: 'grid' | 'list';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  language: 'en',
  pushNotifications: true,
  bookingUpdates: true,
  messages: true,
  promotions: false,
  emailNotifications: true,
  smsNotifications: false,
  sidebarState: 'open',
  filters: {
    category: 'All',
    city: 'All',
    sortBy: 'recommended',
  },
  mapPreference: {
    showGuideMarkers: true,
    zoomLevel: 14,
  },
  companionView: 'grid',
};

const STORAGE_KEY = 'sathi_user_preferences';

export function getStoredPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored);
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      filters: {
        ...DEFAULT_PREFERENCES.filters,
        ...(parsed.filters || {}),
      },
      mapPreference: {
        ...DEFAULT_PREFERENCES.mapPreference,
        ...(parsed.mapPreference || {}),
      },
    };
  } catch (err) {
    console.error('[SATHI] Failed to read preferences:', err);
    return DEFAULT_PREFERENCES;
  }
}

export function saveStoredPreferences(prefs: Partial<UserPreferences>): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const current = getStoredPreferences();
    const updated = {
      ...current,
      ...prefs,
      filters: prefs.filters ? { ...current.filters, ...prefs.filters } : current.filters,
      mapPreference: prefs.mapPreference ? { ...current.mapPreference, ...prefs.mapPreference } : current.mapPreference,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('[SATHI] Failed to save preferences:', err);
    return DEFAULT_PREFERENCES;
  }
}

export function applyThemeMode(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  
  root.classList.remove('theme-light', 'theme-dark');
  
  let activeTheme = theme;
  if (theme === 'system') {
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    activeTheme = systemPrefersLight ? 'light' : 'dark';
  }
  
  if (activeTheme === 'light') {
    root.classList.add('theme-light');
  } else {
    // default dark mode (nothing to add as SATHI defaults to dark CSS classes)
  }
}

// Watch for system theme changes if 'system' is selected
let systemThemeCleanup: (() => void) | null = null;

export function setupSystemThemeWatcher(onChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  if (systemThemeCleanup) {
    systemThemeCleanup();
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  const listener = () => {
    onChange();
  };

  // Support older and newer browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', listener);
    systemThemeCleanup = () => mediaQuery.removeEventListener('change', listener);
  } else {
    mediaQuery.addListener(listener);
    systemThemeCleanup = () => mediaQuery.removeListener(listener);
  }

  return systemThemeCleanup;
}
