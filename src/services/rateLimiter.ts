const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export const rateLimiter = {
  check(key: string, maxRequests = DEFAULT_MAX_REQUESTS): boolean {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || now > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
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
