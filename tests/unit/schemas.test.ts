import { describe, it, expect } from "vitest";
import {
  ProjectSchema,
  ProjectInputSchema,
  BuilderSchema,
} from "@/lib/schemas";

const baseProject = {
  id: "x",
  slug: "x",
  name: "Relief Map",
  summary: "A map of relief centers in Venezuela.",
  stack: ["Next.js"],
  languages: ["es"],
  categories: ["coordination"],
  status: "wip",
  needs: { contributors: [], api_credits: [], sponsors: [] },
  owner: "alice",
};

describe("ProjectSchema", () => {
  it("accepts a valid project and applies defaults", () => {
    const p = ProjectSchema.parse(baseProject);
    expect(p.votes).toBe(0); // votes default
    expect(p.source).toBe("internal"); // source default
  });

  it("rejects non-https repo_url (http:// and bare string)", () => {
    expect(ProjectSchema.safeParse({ ...baseProject, repo_url: "http://x.com" }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...baseProject, repo_url: "not a url" }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...baseProject, repo_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("accepts an https repo_url", () => {
    expect(ProjectSchema.safeParse({ ...baseProject, repo_url: "https://github.com/a/b" }).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(ProjectSchema.safeParse({ ...baseProject, status: "archived" }).success).toBe(false);
  });

  it("requires at least one language and category", () => {
    expect(ProjectSchema.safeParse({ ...baseProject, languages: [] }).success).toBe(false);
    expect(ProjectSchema.safeParse({ ...baseProject, categories: [] }).success).toBe(false);
  });
});

describe("ProjectInputSchema", () => {
  it("omits id/slug/created_at/source", () => {
    const keys = Object.keys(ProjectInputSchema.shape);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("slug");
    expect(keys).not.toContain("created_at");
    expect(keys).not.toContain("source");
    expect(keys).toContain("name");
  });

  it("validates the shape the form posts (no id/slug needed)", () => {
    const input = {
      name: "Relief Map",
      summary: "A map of relief centers in Venezuela.",
      stack: ["Next.js"],
      languages: ["es"],
      categories: ["coordination"],
      status: "wip",
      needs: { contributors: [], api_credits: [], sponsors: [] },
      owner: "alice",
    };
    expect(ProjectInputSchema.safeParse(input).success).toBe(true);
  });
});

describe("BuilderSchema", () => {
  it("applies string defaults for optional fields", () => {
    const b = BuilderSchema.parse({ id: "ada", alias: "Ada" });
    expect(b.role).toBe("");
    expect(b.stack).toEqual([]);
    expect(b.availability).toBe("");
  });

  it("requires linkedin_url to be https when present", () => {
    expect(BuilderSchema.safeParse({ id: "a", alias: "A", linkedin_url: "http://x" }).success).toBe(false);
    expect(
      BuilderSchema.safeParse({ id: "a", alias: "A", linkedin_url: "https://linkedin.com/in/ada" }).success,
    ).toBe(true);
  });
});
