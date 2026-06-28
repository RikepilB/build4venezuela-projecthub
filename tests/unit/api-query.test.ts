import { describe, it, expect } from "vitest";
import { projectFilterFromQuery } from "@/lib/api/query";

// The boundary guard for ?filter params. Valid enum members pass; unknown values are
// DROPPED (never cast) so a hostile ?need=../etc can't reach applyFilter and throw.
describe("projectFilterFromQuery", () => {
  it("keeps every valid filter", () => {
    const f = projectFilterFromQuery(
      new URLSearchParams(
        "category=shelter&stack=React&language=es&status=live&need=contributors&priority=high&complexity=low",
      ),
    );
    expect(f).toEqual({
      category: "shelter",
      stack: "React",
      language: "es",
      status: "live",
      need: "contributors",
      priority: "high",
      complexity: "low",
    });
  });

  it("drops bogus enum values but keeps free-text category/stack", () => {
    const f = projectFilterFromQuery(
      new URLSearchParams(
        "category=anything&stack=Whatever&language=xx&status=nope&need=../etc&priority=zzz&complexity=qqq",
      ),
    );
    expect(f).toEqual({
      category: "anything",
      stack: "Whatever",
      language: undefined,
      status: undefined,
      need: undefined,
      priority: undefined,
      complexity: undefined,
    });
  });

  it("returns all-undefined for empty params", () => {
    const f = projectFilterFromQuery(new URLSearchParams(""));
    expect(Object.values(f).every((v) => v === undefined)).toBe(true);
  });

  it("treats blank/whitespace values as absent", () => {
    const f = projectFilterFromQuery(new URLSearchParams("category=%20%20&stack="));
    expect(f.category).toBeUndefined();
    expect(f.stack).toBeUndefined();
  });
});
