import { describe, it, expect } from "vitest";
import { rankProjects } from "@/lib/repository/projects.repo";
import type { Project } from "@/lib/types";

// A fully-typed baseline; tests override only the fields rankProjects reads
// (votes → priority → stars → status).
const BASE: Project = {
  id: "base",
  slug: "base",
  name: "Base project",
  summary: "A baseline project used for ranking tests.",
  stack: [],
  languages: ["en"],
  categories: ["mapping"],
  status: "planning",
  needs: { contributors: [], api_credits: [], sponsors: [] },
  owner: "owner",
  source: "internal",
  votes: 0,
};

function mk(id: string, fields: Partial<Project>): Project {
  return { ...BASE, id, slug: id, ...fields };
}

describe("rankProjects", () => {
  it("orders by votes first (desc)", () => {
    const out = rankProjects([mk("a", { votes: 1 }), mk("b", { votes: 5 }), mk("c", { votes: 3 })]);
    expect(out.map((p) => p.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks vote ties by priority (high > medium > low > none)", () => {
    const out = rankProjects([
      mk("none", { votes: 2 }),
      mk("low", { votes: 2, priority: "low" }),
      mk("high", { votes: 2, priority: "high" }),
      mk("med", { votes: 2, priority: "medium" }),
    ]);
    expect(out.map((p) => p.id)).toEqual(["high", "med", "low", "none"]);
  });

  it("breaks vote+priority ties by stars (desc)", () => {
    const out = rankProjects([
      mk("s10", { priority: "high", stars: 10 }),
      mk("s99", { priority: "high", stars: 99 }),
      mk("s50", { priority: "high", stars: 50 }),
    ]);
    expect(out.map((p) => p.id)).toEqual(["s99", "s50", "s10"]);
  });

  it("breaks remaining ties by status lifecycle (live > mvp > testing > wip > planning)", () => {
    const out = rankProjects([
      mk("planning", { status: "planning" }),
      mk("live", { status: "live" }),
      mk("wip", { status: "wip" }),
      mk("mvp", { status: "mvp" }),
      mk("testing", { status: "testing" }),
    ]);
    expect(out.map((p) => p.id)).toEqual(["live", "mvp", "testing", "wip", "planning"]);
  });

  it("treats missing votes/priority/stars as lowest and does not mutate input order", () => {
    const input = [mk("x", {}), mk("y", { votes: 1 })];
    const before = input.map((p) => p.id);
    const out = rankProjects(input);
    expect(out.map((p) => p.id)).toEqual(["y", "x"]);
    expect(input.map((p) => p.id)).toEqual(before); // immutable: input untouched
  });
});
