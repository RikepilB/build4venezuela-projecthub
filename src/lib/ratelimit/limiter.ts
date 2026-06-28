import { redis } from "../redis/client";

// Lightweight per-IP fixed-window rate limiter for the one un-cached, origin-hitting
// endpoint (/api/v1/votes). Backed by the Redis seam; FAILS OPEN whenever the backend
// is unavailable (Redis off in dev/offline, or any Redis error) so the API never blocks
// a legitimate read because the limiter itself is down. Catalog endpoints don't need
// this — the CDN edge cache (s-maxage) shields them from load instead.

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

function allow(limit: number, windowSec: number): RateLimitResult {
  return { ok: true, limit, remaining: limit, resetSeconds: windowSec };
}

// Increment the caller's counter for the current window and report whether they are
// under `limit`. Fixed window keyed by wall-clock bucket so keys self-expire (EXPIRE)
// and can never accumulate. `id` should already include the scope (e.g. "votes:1.2.3.4").
export async function rateLimit(
  id: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (!redis.enabled) return allow(limit, windowSec); // no backend → fail open

  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${id}:${bucket}`;
  const count = await redis.incr(key);
  if (count === null) return allow(limit, windowSec); // Redis error → fail open
  if (count === 1) await redis.expire(key, windowSec + 1); // first hit arms the TTL

  const remaining = Math.max(0, limit - count);
  return { ok: count <= limit, limit, remaining, resetSeconds: windowSec };
}

// Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). Takes the
// first hop; falls back to x-real-ip, then a shared "unknown" bucket so a missing
// header degrades to a shared cap rather than crashing.
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
