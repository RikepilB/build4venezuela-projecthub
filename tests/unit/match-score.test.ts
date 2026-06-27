import { describe, it, expect } from "vitest";
import {
  matchProjectsForBuilder,
  matchBuildersForProject,
  matchProjectsForOffer,
} from "@/lib/match/score";
import { makeProject } from "../fixtures/projects";
import { makeBuilder } from "../fixtures/builders";

describe("matchProjectsForBuilder", () => {
  it("matches on stack overlap and on contributor-need tokens", () => {
    const byStack = makeProject({
      slug: "by-stack",
      stack: ["React"],
      needs: { contributors: ["anyone"], api_credits: [], sponsors: [] },
    });
    const byNeed = makeProject({
      slug: "by-need",
      stack: [],
      needs: { contributors: ["React dev"], api_credits: [], sponsors: [] },
    });
    const out = matchProjectsForBuilder({ stack: ["React"] }, [byStack, byNeed]);
    expect(out.map((m) => m.project.slug).sort()).toEqual(["by-need", "by-stack"]);
    // stack overlap (×3) outweighs a single need-token hit (×2)
    expect(out[0].project.slug).toBe("by-stack");
  });

  it("requires a real skill connection — priority alone never matches", () => {
    const unrelated = makeProject({
      slug: "unrelated",
      stack: ["Python"],
      priority: "high",
      needs: { contributors: ["Rust dev"], api_credits: [], sponsors: [] },
    });
    expect(matchProjectsForBuilder({ stack: ["React"] }, [unrelated])).toEqual([]);
  });

  it("breaks skill-tie by priority", () => {
    const base = { stack: ["React"], needs: { contributors: ["x"], api_credits: [], sponsors: [] } };
    const low = makeProject({ slug: "low", ...base, priority: "low" });
    const high = makeProject({ slug: "high", ...base, priority: "high" });
    const out = matchProjectsForBuilder({ stack: ["React"] }, [low, high]);
    expect(out.map((m) => m.project.slug)).toEqual(["high", "low"]);
  });

  it("excludes shipped projects and projects not seeking contributors", () => {
    const live = makeProject({
      slug: "live",
      status: "live",
      stack: ["React"],
      needs: { contributors: ["React dev"], api_credits: [], sponsors: [] },
    });
    const noAsk = makeProject({ slug: "no-ask", stack: ["React"], needs: { contributors: [], api_credits: [], sponsors: [] } });
    expect(matchProjectsForBuilder({ stack: ["React"] }, [live, noAsk])).toEqual([]);
  });

  it("adds a short-handed reason when the team is small", () => {
    const p = makeProject({
      slug: "p",
      stack: ["React"],
      needs: { contributors: ["React dev", "QA"], api_credits: [], sponsors: [] },
    });
    const [match] = matchProjectsForBuilder({ stack: ["React"] }, [p], new Map([["p", 1]]));
    expect(match.reasons).toContainEqual({ kind: "shortHanded", spots: 2 });
    // a crowded team drops the short-handed reason
    const [crowded] = matchProjectsForBuilder({ stack: ["React"] }, [p], new Map([["p", 9]]));
    expect(crowded.reasons.some((r) => r.kind === "shortHanded")).toBe(false);
  });

  it("returns nothing for an empty profile", () => {
    const p = makeProject({ stack: ["React"], needs: { contributors: ["React dev"], api_credits: [], sponsors: [] } });
    expect(matchProjectsForBuilder({ stack: [] }, [p])).toEqual([]);
  });

  it("matches stack across case/punctuation variants and surfaces the display tag", () => {
    const p = makeProject({
      slug: "p",
      stack: ["Next.js"],
      needs: { contributors: ["x"], api_credits: [], sponsors: [] },
    });
    const [match] = matchProjectsForBuilder({ stack: ["next js"] }, [p]);
    expect(match.reasons).toContainEqual({ kind: "stack", tags: ["Next.js"] });
  });
});

describe("matchBuildersForProject", () => {
  const project = makeProject({
    stack: ["React", "Next.js"],
    needs: { contributors: ["React dev", "ES translator"], api_credits: [], sponsors: [] },
  });

  it("reports how many of the project's asks a builder covers", () => {
    const b = makeBuilder({ id: "b", stack: ["React"] });
    const [match] = matchBuildersForProject(project, [b]);
    expect(match.reasons).toContainEqual({ kind: "needsCovered", covered: 1, total: 2 });
  });

  it("ranks more skill overlap first, even against better availability", () => {
    const strong = makeBuilder({ id: "strong", stack: ["React", "Next.js"], availability: "Flexible" });
    const weak = makeBuilder({ id: "weak", stack: ["React"], availability: "Full-time" });
    const out = matchBuildersForProject(project, [strong, weak]);
    expect(out.map((m) => m.builder.id)).toEqual(["strong", "weak"]);
  });

  it("drops builders with no skill connection", () => {
    const off = makeBuilder({ id: "off", stack: ["Figma"], role: "designer" });
    expect(matchBuildersForProject(project, [off])).toEqual([]);
  });

  it("breaks an equal-skill tie by availability", () => {
    const ft = makeBuilder({ id: "ft", stack: ["React"], availability: "Full-time" });
    const flex = makeBuilder({ id: "flex", stack: ["React"], availability: "Flexible" });
    const out = matchBuildersForProject(project, [flex, ft]);
    expect(out.map((m) => m.builder.id)).toEqual(["ft", "flex"]);
  });
});

describe("matchProjectsForOffer", () => {
  it("matches a free-text offer against api_credits and sponsors asks", () => {
    const sms = makeProject({
      slug: "sms",
      priority: "low",
      needs: { contributors: [], api_credits: [], sponsors: ["SMS gateway"] },
    });
    const ai = makeProject({
      slug: "ai",
      priority: "low",
      needs: { contributors: [], api_credits: ["OpenAI credits"], sponsors: [] },
    });
    expect(matchProjectsForOffer("SMS", [sms, ai]).map((m) => m.project.slug)).toEqual(["sms"]);
    const [hit] = matchProjectsForOffer("openai", [ai]);
    expect(hit.matched).toEqual(["OpenAI credits"]);
  });

  it("ranks by matched count, then priority, then votes", () => {
    const one = makeProject({ slug: "one", priority: "high", votes: 1, needs: { contributors: [], api_credits: [], sponsors: ["hosting"] } });
    const two = makeProject({ slug: "two", priority: "low", votes: 0, needs: { contributors: [], api_credits: ["hosting credits"], sponsors: ["hosting partner"] } });
    expect(matchProjectsForOffer("hosting", [one, two]).map((m) => m.project.slug)).toEqual(["two", "one"]);
  });

  it("ignores shipped projects, empty offers, and projects with no money asks", () => {
    const live = makeProject({ slug: "live", status: "live", needs: { contributors: [], api_credits: [], sponsors: ["hosting"] } });
    const noPool = makeProject({ slug: "no-pool", needs: { contributors: ["React dev"], api_credits: [], sponsors: [] } });
    expect(matchProjectsForOffer("hosting", [live, noPool])).toEqual([]);
    expect(matchProjectsForOffer("   ", [makeProject({ needs: { contributors: [], api_credits: [], sponsors: ["hosting"] } })])).toEqual([]);
  });
});
