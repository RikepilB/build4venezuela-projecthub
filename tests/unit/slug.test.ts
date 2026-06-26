import { describe, it, expect } from "vitest";
import { slugify, isValidSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases, strips accents, and hyphenates", () => {
    expect(slugify("Mapa de Desaparecidos")).toBe("mapa-de-desaparecidos");
    expect(slugify("Águila Ñoño")).toBe("aguila-nono");
  });

  it("trims edge separators and collapses non-alphanumeric runs", () => {
    expect(slugify("  --Hello,  World!!  ")).toBe("hello-world");
  });

  it("caps length at 80 chars", () => {
    expect(slugify("a".repeat(200))).toHaveLength(80);
  });

  it("returns an empty string when there are no alphanumerics", () => {
    expect(slugify("¡!!— ")).toBe("");
  });
});

describe("isValidSlug", () => {
  it("accepts the lowercase shape slugify() produces", () => {
    expect(isValidSlug("mapa-de-desaparecidos")).toBe(true);
    expect(isValidSlug("abc123")).toBe(true);
  });

  it("rejects uppercase, whitespace, and path/traversal characters", () => {
    for (const bad of ["Mapa", "a b", "../etc", "a/b", "a.b", "a_b", "", "votes.json"]) {
      expect(isValidSlug(bad)).toBe(false);
    }
  });
});
