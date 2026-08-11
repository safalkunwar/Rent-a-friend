export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  allowedUsers?: string[];
}

const FEATURE_FLAGS_KEY = 'sathi_feature_flags';

export const featureFlags = {
  getFlag(key: string): FeatureFlag | null {
    const flags = this.getAllFlags();
    return flags[key] || null;
  },

  isEnabled(key: string): boolean {
    const flag = this.getFlag(key);
    if (!flag) return false;
    if (flag.allowedUsers && flag.allowedUsers.length > 0) {
      return false;
    }
    return flag.enabled;
  },

  getAllFlags(): Record<string, FeatureFlag> {
    if (typeof window === 'undefined') return {};
    try {
      const data = localStorage.getItem(FEATURE_FLAGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setFlag(key: string, flag: FeatureFlag): void {
    const flags = this.getAllFlags();
    flags[key] = flag;
    this.saveFlags(flags);
  },

  enableFlag(key: string, description?: string): void {
    this.setFlag(key, {
      key,
      enabled: true,
      description,
      rolloutPercentage: 100,
    });
  },

  disableFlag(key: string): void {
    this.setFlag(key, {
      key,
      enabled: false,
    });
  },

  saveFlags(flags: Record<string, FeatureFlag>): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
    } catch (e) {
      console.warn('[FeatureFlags] Failed to save flags:', e);
    }
  },
};
