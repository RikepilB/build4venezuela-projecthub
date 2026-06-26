import Fuse from "fuse.js";
import type { Project } from "./types";
import { normalize } from "./text";

// The MVP "already exists?" engine — fuzzy keyword match over the seed set.
// P2 swaps the body for pgvector embeddings; this signature stays the same so
// the search page and the submit-form dedup nudge don't change.

export type MatchStrength = "strong" | "possible";

export interface SearchHit {
  project: Project;
  score: number; // Fuse score: 0 = perfect, 1 = no match
  strength: MatchStrength;
}

const FUSE_OPTIONS = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.45,
  minMatchCharLength: 2,
  keys: [
    { name: "name", weight: 0.4 },
    { name: "categories", weight: 0.25 },
    { name: "stack", weight: 0.2 },
    { name: "summary", weight: 0.15 },
  ],
};

export function searchProjects(projects: Project[], query: string): SearchHit[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const fuse = new Fuse(projects, FUSE_OPTIONS);
  return fuse.search(q).map((r) => {
    const score = r.score ?? 1;
    return {
      project: r.item,
      score,
      strength: score < 0.25 ? "strong" : "possible",
    };
  });
}
