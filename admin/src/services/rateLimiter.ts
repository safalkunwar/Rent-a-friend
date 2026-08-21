const WINDOW_MS = 60_000;
const DEFAULT_MAX = 30;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
}

export const rateLimiter = {
  check(key: string, maxRequests = DEFAULT_MAX, windowMs = WINDOW_MS): boolean {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || now > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (existing.count >= maxRequests) {
      return false;
    }

    existing.count += 1;
    return true;
  },

  reset(key: string) {
    buckets.delete(key);
  },

  clearAll() {
    buckets.clear();
  },
};

export const adminRateLimiter = {
  checkAction(action: string, actorId: string, maxRequests = 10): boolean {
    const key = `admin:${action}:${actorId}`;
    return rateLimiter.check(key, maxRequests, 60_000);
  },

  checkSearch(actorId: string): boolean {
    return rateLimiter.check(`admin:search:${actorId}`, 60, 60_000);
  },

  checkExport(actorId: string): boolean {
    return rateLimiter.check(`admin:export:${actorId}`, 5, 60_000);
  },

  clearAll() {
    rateLimiter.clearAll();
  },
};
