import { describe, it, expect } from "vitest";
import { isEcosystemProject, isLaunchedProject, ecosystemListing } from "@/lib/ecosystem";
import { makeProject } from "../fixtures/projects";

// Repo-less live site → the original ecosystem case.
const site = makeProject({ id: "s", slug: "s", demo_url: "https://s.example" });
// Buildable project with a repo, a live demo, and >50% progress → "launched".
const launched = makeProject({
  id: "l",
  slug: "l",
  repo_url: "https://github.com/x/l",
  demo_url: "https://l.example",
  progress: 70,
});
// Auto-imported external repo: status live, a demo, but NO progress → must stay OUT.
const extern = makeProject({
  id: "e",
  slug: "e",
  repo_url: "https://github.com/x/e",
  demo_url: "https://e.example",
  status: "live",
  source: "external",
});
// Early buildable idea (no demo) → board only.
const idea = makeProject({ id: "i", slug: "i", repo_url: "https://github.com/x/i", progress: 90 });

describe("isLaunchedProject", () => {
  it("is true for a repo+demo project past 50% built", () => {
    expect(isLaunchedProject(launched)).toBe(true);
  });
  it("requires a live demo (progress alone is not enough)", () => {
    expect(isLaunchedProject(idea)).toBe(false); // 90% but no demo to visit
  });
  it("ignores status:'live' when there is no curated progress (keeps imports out)", () => {
    expect(isLaunchedProject(extern)).toBe(false);
  });
  it("excludes exactly 50% (strictly greater than)", () => {
    expect(isLaunchedProject({ ...launched, progress: 50 })).toBe(false);
  });
});

describe("ecosystemListing", () => {
  it("includes repo-less sites and launched projects, preserving order", () => {
    const out = ecosystemListing([site, launched, extern, idea]);
    expect(out.map((p) => p.id)).toEqual(["s", "l"]);
  });
  it("a launched project is NOT an ecosystem-only project (still belongs on the board)", () => {
    expect(isEcosystemProject(launched)).toBe(false);
  });
});
