import { test, expect } from "@playwright/test";

// The public read-only /api/v1 surface, exercised over HTTP against the production
// build: envelope + status + CORS + cache headers, end-to-end. All read-only, so it is
// safe to run on both browser projects (no votes.json write race like vote.spec.ts).
test.describe("Public API /api/v1", () => {
  test("index lists endpoints with the standard envelope + open CORS", async ({ request }) => {
    const res = await request.get("/api/v1");
    expect(res.status()).toBe(200);
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.endpoints.projects).toBe("/api/v1/projects");
  });

  test("projects: ranked list with count meta and the catalog cache header", async ({ request }) => {
    const res = await request.get("/api/v1/projects");
    expect(res.status()).toBe(200);
    expect(res.headers()["cache-control"]).toContain("s-maxage=300");
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.meta.count).toBe(json.data.length);
  });

  test("projects: ?status=live filters server-side", async ({ request }) => {
    const json = await (await request.get("/api/v1/projects?status=live")).json();
    for (const p of json.data) expect(p.status).toBe("live");
  });

  test("project detail: 200 for a real slug, 404 envelope for a bogus one", async ({ request }) => {
    const list = await (await request.get("/api/v1/projects")).json();
    const slug = list.data[0].slug as string;

    const found = await request.get(`/api/v1/projects/${slug}`);
    expect(found.status()).toBe(200);
    expect((await found.json()).data.slug).toBe(slug);

    const missing = await request.get("/api/v1/projects/this-slug-does-not-exist-xyz");
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toMatchObject({ success: false, error: "not_found" });
  });

  test("search echoes the query and returns an array", async ({ request }) => {
    const res = await request.get("/api/v1/search?q=venezuela");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.meta.query).toBe("venezuela");
    expect(Array.isArray(json.data)).toBe(true);
  });

  test("curated list + taxonomy endpoints respond with envelopes", async ({ request }) => {
    for (const path of [
      "/api/v1/builders",
      "/api/v1/resources",
      "/api/v1/communities",
      "/api/v1/reference",
      "/api/v1/taxonomy",
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect((await res.json()).success, path).toBe(true);
    }
  });

  test("stats and votes are live (no-store)", async ({ request }) => {
    const stats = await request.get("/api/v1/stats");
    expect(stats.headers()["cache-control"]).toBe("no-store");
    expect((await stats.json()).data.projects).toBeGreaterThan(0);

    const votes = await request.get("/api/v1/votes");
    expect(votes.headers()["cache-control"]).toBe("no-store");
    expect((await votes.json()).success).toBe(true);
  });

  test("OPTIONS preflight returns 204 with CORS methods", async ({ request }) => {
    const res = await request.fetch("/api/v1/projects", { method: "OPTIONS" });
    expect(res.status()).toBe(204);
    expect(res.headers()["access-control-allow-methods"]).toContain("GET");
  });
});

test.describe("Live vote overlay", () => {
  test("the board fetches the live votes map after load", async ({ page }) => {
    const votesResponse = page.waitForResponse(
      (r) => r.url().includes("/api/v1/votes") && r.status() === 200,
    );
    await page.goto("/en/board?view=all");
    const res = await votesResponse;
    expect((await res.json()).success).toBe(true);
  });
});
