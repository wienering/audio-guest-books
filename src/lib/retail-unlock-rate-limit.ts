const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RetailUnlockRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

/** 5 attempts per IP per 10 minutes per event */
export function takeRetailUnlockRateLimit(
  ip: string,
  eventId: string
): RetailUnlockRateLimitResult {
  const key = `${ip}:unlock:${eventId}`;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
    return { ok: true };
  }
  b.count += 1;
  if (b.count > MAX_ATTEMPTS) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}
