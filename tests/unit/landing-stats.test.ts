import { describe, it, expect } from "vitest";
import { landingStats, featuredProjects } from "@/lib/landing/stats";
import { makeProject } from "../fixtures/projects";
import { makeBuilder } from "../fixtures/builders";

// Ecosystem = live site, no repo (isEcosystemProject = !repo_url && demo_url).
const board = makeProject({ id: "b", slug: "b", repo_url: "https://github.com/x/b" });
const idea = makeProject({ id: "i", slug: "i", needs: { contributors: ["Builder"], api_credits: [], sponsors: [] } }); // no repo, no demo, but has a need → stays board
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
    expect(stats.needs).toBe(2); // `idea` + `needy` each have an open ask
  });

  it("is all zeros on empty input", () => {
    expect(landingStats([], [])).toEqual({ projects: 0, builders: 0, live: 0, needs: 0 });
  });

  it("counts a launched project (repo + demo + >50%) as BOTH a board project and live", () => {
    // e.g. Mission VE: has a repo (stays buildable on the board) and a live demo at
    // 70% built (also surfaced on /ecosystem) → it shows on both surfaces.
    const launched = makeProject({
      id: "m",
      slug: "m",
      repo_url: "https://github.com/x/m",
      demo_url: "https://m.example",
      progress: 70,
    });
    const stats = landingStats([board, idea, live, launched], []);
    expect(stats.projects).toBe(3); // board + idea + launched (launched has a repo → board)
    expect(stats.live).toBe(2); // ecosystem site + launched (launched is also live)
  });

  it("does NOT count a repo+demo project at exactly 50% or with no progress as live", () => {
    const half = makeProject({ id: "h", slug: "h", repo_url: "https://github.com/x/h", demo_url: "https://h.example", progress: 50 });
    const noProg = makeProject({ id: "p", slug: "p", repo_url: "https://github.com/x/p", demo_url: "https://p.example" });
    expect(landingStats([half, noProg], []).live).toBe(0);
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
