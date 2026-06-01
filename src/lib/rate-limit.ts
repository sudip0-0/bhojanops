// Simple in-memory sliding-window rate limiter.
//
// State is per-process, so a multi-instance deployment would need a shared store
// (e.g. Redis). For single-node dev / seed-scale usage this is enough to slow
// down credential-stuffing and accidental password-spraying.
//
// Usage:
//   const limiter = rateLimit({ name: "login", windowMs: 15 * 60_000, max: 10 });
//   const r = limiter.hit(key);
//   if (!r.allowed) return { ok: false, retryAfterMs: r.retryAfterMs };

export type RateLimitOptions = {
  name: string;
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type Bucket = { hits: number[] };

const STORE = new Map<string, Bucket>();

function bucketKey(name: string, key: string) {
  return `${name}::${key}`;
}

function bucketFor(name: string, key: string): Bucket {
  const k = bucketKey(name, key);
  let b = STORE.get(k);
  if (!b) {
    b = { hits: [] };
    STORE.set(k, b);
  }
  return b;
}

function trim(now: number, bucket: Bucket, windowMs: number) {
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
}

export function rateLimit(opts: RateLimitOptions) {
  const { name, windowMs, max } = opts;
  return {
    hit(key: string, now: number = Date.now()): RateLimitResult {
      const bucket = bucketFor(name, key);
      trim(now, bucket, windowMs);
      if (bucket.hits.length >= max) {
        const oldest = bucket.hits[0]!;
        const retryAfterMs = Math.max(0, oldest + windowMs - now);
        return { allowed: false, remaining: 0, retryAfterMs };
      }
      bucket.hits.push(now);
      return { allowed: true, remaining: max - bucket.hits.length, retryAfterMs: 0 };
    },
    reset(key?: string) {
      if (key === undefined) {
        for (const k of Array.from(STORE.keys())) {
          if (k.startsWith(`${name}::`)) STORE.delete(k);
        }
      } else {
        STORE.delete(bucketKey(name, key));
      }
    },
  };
}

export const loginLimiter = rateLimit({ name: "login", windowMs: 15 * 60_000, max: 10 });
export const passwordResetLimiter = rateLimit({ name: "password-reset", windowMs: 60 * 60_000, max: 5 });
