// A simple fixed-window rate limiter kept in memory, per server instance.
// Enough to stop one visitor from using up the free AI quota on a demo site.
// With several serverless instances each keeps its own counts, so a real
// production app would store these in Redis (e.g. Upstash) instead.

type Window = { count: number; resetsAt: number };

const windows = new Map<string, Window>();

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export const checkRateLimit = (
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult => {
  const current = windows.get(key);

  if (!current || now >= current.resetsAt) {
    windows.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetsAt - now) / 1000) };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
};
