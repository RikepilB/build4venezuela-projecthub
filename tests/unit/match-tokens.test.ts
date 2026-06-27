import { describe, it, expect } from "vitest";
import { tokenize, uniqueTokens, overlapCount } from "@/lib/match/tokens";

describe("tokenize", () => {
  it("splits on punctuation/space and lowercases", () => {
    expect(tokenize("Next.js / React dev")).toEqual(["next", "js", "react", "dev"]);
  });

  it("strips accents so EN/ES land on the same token", () => {
    expect(tokenize("Traducción ES")).toEqual(["traduccion", "es"]);
  });

  it("drops 1-char noise and empties", () => {
    expect(tokenize("C / Go, a")).toEqual(["go"]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("uniqueTokens", () => {
  it("flattens several phrases into one deduped set", () => {
    expect(uniqueTokens(["React dev", "react", "Node.js"])).toEqual(["react", "dev", "node", "js"]);
  });
});

describe("overlapCount", () => {
  it("counts distinct shared tokens only", () => {
    expect(overlapCount(["react", "node", "react"], ["react", "python"])).toBe(1);
    expect(overlapCount(["a"], ["b"])).toBe(0);
    expect(overlapCount([], ["react"])).toBe(0);
  });
});
