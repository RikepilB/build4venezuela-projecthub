import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeProject } from "../fixtures/projects";

// Mock the limiter so both the allowed and the capped branch are exercised, and the
// repository so the handler is isolated.
vi.mock("@/lib/ratelimit/limiter", () => ({
  rateLimit: vi.fn(),
  clientIp: vi.fn(() => "1.2.3.4"),
}));
vi.mock("@/lib/repository", () => ({ projectRepository: { list: vi.fn() } }));

import { GET as votesGET } from "@/app/api/v1/votes/route";
import { rateLimit } from "@/lib/ratelimit/limiter";
import { projectRepository } from "@/lib/repository";

const req = () => new Request("http://localhost/api/v1/votes");
beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/votes", () => {
  it("returns the live { slug: count } map, no-store, with a remaining header", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ ok: true, limit: 60, remaining: 59, resetSeconds: 60 });
    vi.mocked(projectRepository.list).mockResolvedValue([
      makeProject({ slug: "a", votes: 4 }),
      makeProject({ slug: "b", votes: 0 }),
    ]);
    const res = await votesGET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("59");
    await expect(res.json()).resolves.toMatchObject({ success: true, data: { a: 4, b: 0 } });
  });

  it("returns 429 with Retry-After when the per-IP cap is exceeded, without reading data", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ ok: false, limit: 60, remaining: 0, resetSeconds: 60 });
    const res = await votesGET(req());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    await expect(res.json()).resolves.toMatchObject({ success: false, error: "rate_limited" });
    expect(projectRepository.list).not.toHaveBeenCalled();
  });

  it("returns a 500 envelope when the repo fails", async () => {
    vi.mocked(rateLimit).mockResolvedValue({ ok: true, limit: 60, remaining: 59, resetSeconds: 60 });
    vi.mocked(projectRepository.list).mockRejectedValue(new Error("io"));
    const res = await votesGET(req());
    expect(res.status).toBe(500);
  });
});
