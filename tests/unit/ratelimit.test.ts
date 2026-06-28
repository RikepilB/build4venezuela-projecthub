import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable mock so each test toggles redis.enabled and scripts incr/expire results.
vi.mock("@/lib/redis/client", () => ({
  redis: { enabled: false, incr: vi.fn(), expire: vi.fn() },
}));

import { redis } from "@/lib/redis/client";
import { rateLimit, clientIp } from "@/lib/ratelimit/limiter";

beforeEach(() => {
  vi.clearAllMocks();
  (redis as { enabled: boolean }).enabled = false;
});

describe("rateLimit", () => {
  it("fails open (allows) when Redis is disabled — never blocks on a missing backend", async () => {
    const r = await rateLimit("votes:ip", 1, 60);
    expect(r.ok).toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it("fails open when Redis errors (incr returns null)", async () => {
    (redis as { enabled: boolean }).enabled = true;
    vi.mocked(redis.incr).mockResolvedValue(null);
    const r = await rateLimit("votes:ip", 1, 60);
    expect(r.ok).toBe(true);
  });

  it("allows up to the limit then blocks, arming the TTL once", async () => {
    (redis as { enabled: boolean }).enabled = true;
    vi.mocked(redis.expire).mockResolvedValue(true);
    vi.mocked(redis.incr)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);

    const r1 = await rateLimit("votes:ip", 3, 60);
    expect(r1).toMatchObject({ ok: true, remaining: 2 });
    const r2 = await rateLimit("votes:ip", 3, 60);
    expect(r2).toMatchObject({ ok: true, remaining: 1 });
    const r3 = await rateLimit("votes:ip", 3, 60);
    expect(r3).toMatchObject({ ok: true, remaining: 0 });
    const r4 = await rateLimit("votes:ip", 3, 60);
    expect(r4).toMatchObject({ ok: false, remaining: 0 });

    // TTL armed only on the first hit of the window (count === 1).
    expect(redis.expire).toHaveBeenCalledTimes(1);
  });
});

describe("clientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("degrades to a shared 'unknown' bucket when no IP header is present", () => {
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
