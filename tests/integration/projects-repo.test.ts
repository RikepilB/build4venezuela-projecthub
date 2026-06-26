import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeProject } from "../fixtures/projects";

// Mock the FS/data seam and the vote store so repo logic is tested in isolation.
vi.mock("@/lib/data-files", () => ({
  loadProjects: vi.fn(),
  appendInternalProject: vi.fn(),
}));
vi.mock("@/lib/votes/votes-store", () => ({ bumpVote: vi.fn() }));

import { applyFilter, jsonProjectRepository } from "@/lib/repository/projects.repo";
import { loadProjects, appendInternalProject } from "@/lib/data-files";
import { bumpVote } from "@/lib/votes/votes-store";

beforeEach(() => vi.clearAllMocks());

describe("applyFilter", () => {
  const p1 = makeProject({
    slug: "p1",
    categories: ["coordination"],
    stack: ["Next.js"],
    languages: ["es"],
    status: "live",
    needs: { contributors: ["React dev"], api_credits: [], sponsors: [] },
    complexity: "high",
    priority: "high",
  });
  const p2 = makeProject({
    slug: "p2",
    categories: ["health"],
    stack: ["Python"],
    languages: ["en"],
    status: "wip",
    complexity: "low",
    priority: "low",
  });
  const all = [p1, p2];

  it("returns everything with no filter", () => {
    expect(applyFilter(all).map((p) => p.slug)).toEqual(["p1", "p2"]);
  });

  it("filters by each dimension", () => {
    expect(applyFilter(all, { category: "coordination" }).map((p) => p.slug)).toEqual(["p1"]);
    expect(applyFilter(all, { stack: "next.js" }).map((p) => p.slug)).toEqual(["p1"]); // case-insensitive
    expect(applyFilter(all, { language: "en" }).map((p) => p.slug)).toEqual(["p2"]);
    expect(applyFilter(all, { status: "live" }).map((p) => p.slug)).toEqual(["p1"]);
    expect(applyFilter(all, { need: "contributors" }).map((p) => p.slug)).toEqual(["p1"]);
    expect(applyFilter(all, { complexity: "high" }).map((p) => p.slug)).toEqual(["p1"]);
    expect(applyFilter(all, { priority: "low" }).map((p) => p.slug)).toEqual(["p2"]);
  });

  it("ANDs combined filters", () => {
    expect(applyFilter(all, { category: "coordination", status: "wip" })).toEqual([]);
    expect(applyFilter(all, { category: "coordination", status: "live" }).map((p) => p.slug)).toEqual([
      "p1",
    ]);
  });

  it("does not throw on an unknown need key (defends the board from a bogus ?need= URL)", () => {
    expect(() => applyFilter(all, { need: "bogus" as never })).not.toThrow();
    expect(applyFilter(all, { need: "bogus" as never })).toEqual([]);
  });
});

describe("jsonProjectRepository", () => {
  it("list() returns a ranked, filtered view", async () => {
    vi.mocked(loadProjects).mockResolvedValue([
      makeProject({ slug: "a", votes: 1 }),
      makeProject({ slug: "b", votes: 9 }),
    ]);
    expect((await jsonProjectRepository.list()).map((p) => p.slug)).toEqual(["b", "a"]);

    vi.mocked(loadProjects).mockResolvedValue([
      makeProject({ slug: "a", status: "live" }),
      makeProject({ slug: "b", status: "wip" }),
    ]);
    expect((await jsonProjectRepository.list({ status: "live" })).map((p) => p.slug)).toEqual(["a"]);
  });

  it("getBySlug() finds or returns null", async () => {
    vi.mocked(loadProjects).mockResolvedValue([makeProject({ slug: "x" })]);
    expect((await jsonProjectRepository.getBySlug("x"))?.slug).toBe("x");
    expect(await jsonProjectRepository.getBySlug("nope")).toBeNull();
  });

  it("create() suffixes a colliding slug and persists", async () => {
    vi.mocked(loadProjects).mockResolvedValue([makeProject({ slug: "relief-map" })]);
    vi.mocked(appendInternalProject).mockResolvedValue(undefined);
    const created = await jsonProjectRepository.create({
      name: "Relief Map",
      summary: "A map of relief centers in Venezuela.",
      stack: [],
      languages: ["es"],
      categories: ["coordination"],
      status: "wip",
      needs: { contributors: [], api_credits: [], sponsors: [] },
      owner: "me",
      votes: 0,
    });
    expect(created.slug).toBe("relief-map-2");
    expect(created.source).toBe("internal");
    expect(appendInternalProject).toHaveBeenCalledOnce();
  });

  it("vote() delegates to the votes store", async () => {
    vi.mocked(bumpVote).mockResolvedValue(7);
    expect(await jsonProjectRepository.vote("x")).toBe(7);
    expect(bumpVote).toHaveBeenCalledWith("x");
  });

  it("search() matches by name", async () => {
    vi.mocked(loadProjects).mockResolvedValue([makeProject({ slug: "relief-map", name: "Relief Map" })]);
    const hits = await jsonProjectRepository.search("Relief Map");
    expect(hits[0]?.project.slug).toBe("relief-map");
  });
});
