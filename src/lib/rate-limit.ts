/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for a single-instance demo. On a multi-instance deployment this
 * should be swapped for a shared store (e.g. Upstash Redis) — the call sites
 * won't need to change.
 */

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow forever.
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    if (bucket.timestamps.length === 0) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * @param key    unique key, e.g. `login:203.0.113.4` or `otp:user@example.com`
 * @param limit  max attempts inside the window
 * @param windowMs window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep(windowMs);
  const now = Date.now();
  const bucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: limit - bucket.timestamps.length, retryAfterSeconds: 0 };
}
