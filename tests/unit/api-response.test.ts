import { describe, it, expect } from "vitest";
import { ok, fail, preflight, CACHE_CATALOG, CACHE_NO_STORE } from "@/lib/api/response";

// The public-API envelope contract: shape, status, CORS, and cache headers. External
// consumers parse exactly one shape, so these are the load-bearing guarantees.
describe("api response envelope", () => {
  it("ok() → 200, success envelope, catalog cache, open CORS", async () => {
    const res = ok({ hello: "world" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe(CACHE_CATALOG);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    await expect(res.json()).resolves.toEqual({
      success: true,
      data: { hello: "world" },
      error: null,
    });
  });

  it("ok() passes meta through and honors a cache override", async () => {
    const res = ok([1, 2, 3], { meta: { count: 3 }, cache: CACHE_NO_STORE });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json.meta).toEqual({ count: 3 });
    expect(json.data).toEqual([1, 2, 3]);
  });

  it("ok() merges extra headers (e.g. rate-limit)", () => {
    const res = ok({}, { headers: { "X-RateLimit-Remaining": "59" } });
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("59");
  });

  it("fail() → given status, error envelope, never cached", async () => {
    const res = fail("not_found", 404);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    await expect(res.json()).resolves.toEqual({ success: false, data: null, error: "not_found" });
  });

  it("fail() defaults to 400 and forwards extra headers", () => {
    const res = fail("rate_limited", 429, { "Retry-After": "60" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("preflight() → 204 with CORS, no body", async () => {
    const res = preflight();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await res.text()).toBe("");
  });
});
