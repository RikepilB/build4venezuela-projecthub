import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeProject } from "../fixtures/projects";

// Mock the repository seam (the routes' only dependency) so handlers are tested in
// isolation — no filesystem, no Redis. taxonomy is a static seed import, also mocked.
vi.mock("@/lib/repository", () => ({
  projectRepository: { list: vi.fn(), getBySlug: vi.fn(), search: vi.fn() },
  builderRepository: { list: vi.fn() },
  resourceRepository: { list: vi.fn() },
  communityRepository: { list: vi.fn() },
  referenceRepository: { list: vi.fn() },
}));
vi.mock("@/lib/taxonomy", () => ({
  categories: [{ id: "shelter", en: "Shelter", es: "Refugios" }],
  statuses: [{ id: "live", en: "Live", es: "En vivo" }],
  needTypes: [],
  complexities: [],
  priorities: [],
  stacks: ["React", "Next.js"],
}));

import { GET as indexGET } from "@/app/api/v1/route";
import { GET as projectsGET } from "@/app/api/v1/projects/route";
import { GET as projectGET } from "@/app/api/v1/projects/[slug]/route";
import { GET as searchGET } from "@/app/api/v1/search/route";
import { GET as buildersGET } from "@/app/api/v1/builders/route";
import { GET as resourcesGET } from "@/app/api/v1/resources/route";
import { GET as communitiesGET } from "@/app/api/v1/communities/route";
import { GET as referenceGET } from "@/app/api/v1/reference/route";
import { GET as taxonomyGET } from "@/app/api/v1/taxonomy/route";
import { GET as statsGET } from "@/app/api/v1/stats/route";
import {
  projectRepository,
  builderRepository,
  resourceRepository,
  communityRepository,
  referenceRepository,
} from "@/lib/repository";

const req = (url: string) => new Request(`http://localhost${url}`);
beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1 (index)", () => {
  it("returns the discovery index", async () => {
    const res = await indexGET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.version).toBe("v1");
    expect(json.data.endpoints.projects).toBe("/api/v1/projects");
  });
});

describe("GET /api/v1/projects", () => {
  it("returns the ranked list with a count meta and the catalog cache header", async () => {
    vi.mocked(projectRepository.list).mockResolvedValue([
      makeProject({ slug: "a" }),
      makeProject({ slug: "b" }),
    ]);
    const res = await projectsGET(req("/api/v1/projects"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.meta.count).toBe(2);
  });

  it("forwards validated filters and drops bogus enums", async () => {
    vi.mocked(projectRepository.list).mockResolvedValue([]);
    await projectsGET(req("/api/v1/projects?status=live&need=bogus&category=shelter"));
    expect(projectRepository.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: "live", need: undefined, category: "shelter" }),
    );
  });

  it("returns a 500 envelope (not a throw) when the repo fails", async () => {
    vi.mocked(projectRepository.list).mockRejectedValue(new Error("boom"));
    const res = await projectsGET(req("/api/v1/projects"));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ success: false, data: null, error: "internal_error" });
  });
});

describe("GET /api/v1/projects/[slug]", () => {
  it("returns the project when found", async () => {
    vi.mocked(projectRepository.getBySlug).mockResolvedValue(makeProject({ slug: "relief-map" }));
    const res = await projectGET(req("/api/v1/projects/relief-map"), {
      params: Promise.resolve({ slug: "relief-map" }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true, data: { slug: "relief-map" } });
  });

  it("returns a 404 envelope when missing", async () => {
    vi.mocked(projectRepository.getBySlug).mockResolvedValue(null);
    const res = await projectGET(req("/api/v1/projects/nope"), {
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ success: false, error: "not_found" });
  });
});

describe("GET /api/v1/search", () => {
  it("returns hits with the query echoed in meta", async () => {
    vi.mocked(projectRepository.search).mockResolvedValue([
      { project: makeProject(), score: 0.1, strength: "strong" },
    ]);
    const res = await searchGET(req("/api/v1/search?q=map"));
    const json = await res.json();
    expect(projectRepository.search).toHaveBeenCalledWith("map");
    expect(json.meta).toMatchObject({ count: 1, query: "map" });
  });

  it("treats a missing q as an empty query", async () => {
    vi.mocked(projectRepository.search).mockResolvedValue([]);
    await searchGET(req("/api/v1/search"));
    expect(projectRepository.search).toHaveBeenCalledWith("");
  });
});

describe("curated list endpoints", () => {
  it("GET /api/v1/builders", async () => {
    vi.mocked(builderRepository.list).mockResolvedValue([
      { id: "b", alias: "A", role: "", stack: [], availability: "", timezone: "", status: "" },
    ]);
    const res = await buildersGET();
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
    await expect(res.json()).resolves.toMatchObject({ success: true, meta: { count: 1 } });
  });

  it("GET /api/v1/resources", async () => {
    vi.mocked(resourceRepository.list).mockResolvedValue([]);
    await expect((await resourcesGET()).json()).resolves.toMatchObject({ success: true, meta: { count: 0 } });
  });

  it("GET /api/v1/communities", async () => {
    vi.mocked(communityRepository.list).mockResolvedValue([]);
    await expect((await communitiesGET()).json()).resolves.toMatchObject({ success: true });
  });

  it("GET /api/v1/reference", async () => {
    vi.mocked(referenceRepository.list).mockResolvedValue([]);
    await expect((await referenceGET()).json()).resolves.toMatchObject({ success: true });
  });

  it("surfaces a repo failure as a 500 envelope", async () => {
    vi.mocked(resourceRepository.list).mockRejectedValue(new Error("io"));
    const res = await resourcesGET();
    expect(res.status).toBe(500);
  });
});

describe("GET /api/v1/taxonomy", () => {
  it("returns the controlled vocabularies, cacheable like the catalog", async () => {
    const res = await taxonomyGET();
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
    const json = await res.json();
    expect(json.data.categories[0].id).toBe("shelter");
    expect(json.data.stacks).toContain("React");
  });
});

describe("GET /api/v1/stats", () => {
  it("aggregates counts and is never cached", async () => {
    vi.mocked(projectRepository.list).mockResolvedValue([
      makeProject({ status: "live", votes: 3, needs: { contributors: ["x"], api_credits: [], sponsors: [] } }),
      makeProject({ status: "wip", votes: 2 }),
    ]);
    vi.mocked(builderRepository.list).mockResolvedValue([]);
    vi.mocked(resourceRepository.list).mockResolvedValue([]);
    vi.mocked(communityRepository.list).mockResolvedValue([]);
    vi.mocked(referenceRepository.list).mockResolvedValue([]);
    const res = await statsGET();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const json = await res.json();
    expect(json.data).toMatchObject({
      projects: 2,
      live: 1,
      totalVotes: 5,
      openNeeds: 1,
      byStatus: { live: 1, wip: 1 },
    });
  });
});
