const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RetailRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/**
 * Simple in-memory fixed window per IP per logical route. Resets per Stage 11
 * can move to Redis or edge.
 */
export function takeRetailRateLimit(
  ip: string,
  routeKey: string
): RetailRateLimitResult {
  const key = `${ip}:${routeKey}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
    return { ok: true };
  }
  b.count += 1;
  if (b.count > MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}
