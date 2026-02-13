import { Redis } from "@upstash/redis";

// ── Result type (unchanged — used by all callers) ───────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

// ── Redis client (lazy singleton) ───────────────────────────────────
// When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set,
// rate limiting uses Redis (survives deploys, works across instances).
// When they are missing, the in-memory fallback is used automatically
// so local dev works without any Redis setup.

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// ── Redis-backed sliding window ─────────────────────────────────────

async function redisRateLimit(
  client: Redis,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowKey = `ratelimit:${key}`;
  const cutoff = now - windowMs;

  // Atomic pipeline: remove old entries, add current, count, get oldest
  const pipe = client.pipeline();
  pipe.zremrangebyscore(windowKey, 0, cutoff);
  pipe.zadd(windowKey, { score: now, member: `${now}:${Math.random()}` });
  pipe.zcard(windowKey);
  pipe.zrange(windowKey, 0, 0);
  pipe.pexpire(windowKey, windowMs);

  const results = await pipe.exec();

  // results[2] = zcard count after add
  const count = results[2] as number;

  if (count > maxRequests) {
    // Over limit — remove the entry we just added and deny
    await client.zremrangebyscore(windowKey, now, now);

    // Get the oldest timestamp to compute reset time
    const oldest = results[3] as string[];
    const oldestTs = oldest.length > 0 ? Number(oldest[0].split(":")[0]) : now;

    return {
      allowed: false,
      remaining: 0,
      resetMs: oldestTs + windowMs - now,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - count,
    resetMs: windowMs,
  };
}

// ── In-memory fallback (for local dev without Redis) ────────────────

interface MemEntry {
  timestamps: number[];
}

const memStore = new Map<string, MemEntry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function memCleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, entry] of memStore) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) memStore.delete(key);
  }
}

function memRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  memCleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = memStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memStore.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldest + windowMs - now,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetMs: windowMs,
  };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Rate-limit a key (e.g. `email:1.2.3.4`).
 *
 * Uses Redis when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
 * are set; falls back to in-memory for local development.
 */
export async function rateLimit(
  key: string,
  { maxRequests = 5, windowMs = 10 * 60 * 1000 } = {}
): Promise<RateLimitResult> {
  const client = getRedis();

  if (client) {
    try {
      return await redisRateLimit(client, key, maxRequests, windowMs);
    } catch {
      // If Redis fails, fall through to in-memory so the app stays up.
      // In production, this should trigger an alert.
    }
  }

  // Fallback: in-memory limiter (local dev, or Redis failure)
  return memRateLimit(key, maxRequests, windowMs);
}
