import { describe, it, expect } from "vitest";
import { landingStats, featuredProjects } from "@/lib/landing/stats";
import { makeProject } from "../fixtures/projects";
import { makeBuilder } from "../fixtures/builders";

// Ecosystem = live site, no repo (isEcosystemProject = !repo_url && demo_url).
const board = makeProject({ id: "b", slug: "b", repo_url: "https://github.com/x/b" });
const idea = makeProject({ id: "i", slug: "i" }); // no repo, no demo → still board (buildable)
const live = makeProject({ id: "l", slug: "l", demo_url: "https://live.example" }); // ecosystem
const needy = makeProject({
  id: "n",
  slug: "n",
  repo_url: "https://github.com/x/n",
  needs: { contributors: ["React dev"], api_credits: [], sponsors: [] },
});

describe("landingStats", () => {
  it("counts buildable projects, builders, live sites and open needs separately", () => {
    const stats = landingStats([board, idea, live, needy], [makeBuilder({ id: "a" }), makeBuilder({ id: "c" })]);
    expect(stats.projects).toBe(3); // board + idea + needy (live excluded)
    expect(stats.live).toBe(1); // only the ecosystem site
    expect(stats.builders).toBe(2);
    expect(stats.needs).toBe(1); // only `needy` has an open ask
  });

  it("is all zeros on empty input", () => {
    expect(landingStats([], [])).toEqual({ projects: 0, builders: 0, live: 0, needs: 0 });
  });
});

describe("featuredProjects", () => {
  it("excludes ecosystem sites and preserves the (pre-ranked) order", () => {
    const out = featuredProjects([live, board, needy], 5);
    expect(out.map((p) => p.id)).toEqual(["b", "n"]);
  });

  it("caps at n", () => {
    expect(featuredProjects([board, idea, needy], 2).map((p) => p.id)).toEqual(["b", "i"]);
  });

  it("defaults to the top 3", () => {
    const many = ["a", "b", "c", "d"].map((id) =>
      makeProject({ id, slug: id, repo_url: `https://github.com/x/${id}` }),
    );
    expect(featuredProjects(many)).toHaveLength(3);
  });
});
