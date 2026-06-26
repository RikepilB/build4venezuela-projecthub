import { describe, it, expect } from "vitest";
import { normalize, splitTags } from "@/lib/text";

describe("normalize", () => {
  it("folds diacritics and lowercases", () => {
    expect(normalize("CAFÉ")).toBe("cafe");
    expect(normalize("Terremoto")).toBe("terremoto");
  });

  it("folds combining marks", () => {
    expect(normalize("café")).toBe("cafe"); // e + combining acute
  });

  it("trims surrounding whitespace", () => {
    expect(normalize("  Hola  ")).toBe("hola");
  });
});

describe("splitTags", () => {
  it("splits on /,;| delimiters and trims", () => {
    expect(splitTags("Next.js / React, Node;Python|Go")).toEqual([
      "Next.js",
      "React",
      "Node",
      "Python",
      "Go",
    ]);
  });

  it("drops empty segments", () => {
    expect(splitTags("A,,B")).toEqual(["A", "B"]);
    expect(splitTags("   ")).toEqual([]);
  });
});
