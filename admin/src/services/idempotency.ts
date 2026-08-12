const IDEMPOTENCY_KEY_PREFIX = 'sathi_admin_idempotency_';

interface IdempotencyRecord {
  key: string;
  action: string;
  targetId: string;
  result: unknown;
  timestamp: string;
}

export const idempotencyService = {
  generateKey(action: string, targetId: string, actorId: string): string {
    return `${IDEMPOTENCY_KEY_PREFIX}${actorId}:${action}:${targetId}`;
  },

  async get(key: string): Promise<IdempotencyRecord | null> {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as IdempotencyRecord;
    } catch {
      return null;
    }
  },

  async set(key: string, action: string, targetId: string, result: unknown): Promise<void> {
    try {
      const record: IdempotencyRecord = {
        key,
        action,
        targetId,
        result,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      // ignore storage errors
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(IDEMPOTENCY_KEY_PREFIX));
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  },
};
