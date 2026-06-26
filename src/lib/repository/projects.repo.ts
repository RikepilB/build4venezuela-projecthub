import { randomUUID } from "node:crypto";
import { loadProjects, appendInternalProject } from "../data-files";
import { bumpVote } from "../votes/votes-store";
import { searchProjects, type SearchHit } from "../search";
import { slugify } from "../slug";
import { ProjectSchema } from "../schemas";
import type { Project, ProjectFilter, ProjectInput } from "../types";

export interface ProjectRepository {
  list(filter?: ProjectFilter): Promise<Project[]>;
  getBySlug(slug: string): Promise<Project | null>;
  search(query: string): Promise<SearchHit[]>;
  create(input: ProjectInput): Promise<Project>;
  vote(slug: string): Promise<number>;
}

// Exported so the board can derive its filtered view from an already-loaded, already-
// ranked list (one read) instead of calling list() twice. Pure — preserves order.
export function applyFilter(projects: Project[], f?: ProjectFilter): Project[] {
  if (!f) return projects;
  return projects.filter((p) => {
    if (f.category && !p.categories.includes(f.category)) return false;
    if (f.stack && !p.stack.some((s) => s.toLowerCase() === f.stack?.toLowerCase())) return false;
    if (f.language && !p.languages.includes(f.language)) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.need && (p.needs[f.need] ?? []).length === 0) return false; // ?? [] = defense vs an unknown need key
    if (f.complexity && p.complexity !== f.complexity) return false;
    if (f.priority && p.priority !== f.priority) return false;
    return true;
  });
}

// Radar ordering: community votes first (what the team wants to focus on), then
// priority, then stars, then lifecycle — so the board reads as a ranked signal.
const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };
const STATUS_WEIGHT: Record<string, number> = { live: 4, mvp: 3, testing: 2, wip: 1, planning: 0 };
export function rankProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => {
    const v = (b.votes ?? 0) - (a.votes ?? 0);
    if (v !== 0) return v;
    const p = (PRIORITY_WEIGHT[b.priority ?? ""] ?? 0) - (PRIORITY_WEIGHT[a.priority ?? ""] ?? 0);
    if (p !== 0) return p;
    const s = (b.stars ?? 0) - (a.stars ?? 0);
    if (s !== 0) return s;
    return (STATUS_WEIGHT[b.status] ?? 0) - (STATUS_WEIGHT[a.status] ?? 0);
  });
}

// JSON-backed implementation. The only file P1 changes to go durable: drop in
// supabase.repo.ts with the same interface and switch in ./index.ts.
export const jsonProjectRepository: ProjectRepository = {
  async list(filter) {
    const projects = await loadProjects();
    return rankProjects(applyFilter(projects, filter));
  },

  async getBySlug(slug) {
    const projects = await loadProjects();
    return projects.find((p) => p.slug === slug) ?? null;
  },

  async search(query) {
    const projects = await loadProjects();
    return searchProjects(projects, query);
  },

  async create(input) {
    const existing = await loadProjects();
    const taken = new Set(existing.map((p) => p.slug));
    const base = slugify(input.name) || randomUUID().slice(0, 8);
    let slug = base;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;

    // Re-validate the assembled record (defense in depth — the action already
    // validated the input).
    const project = ProjectSchema.parse({
      ...input,
      id: randomUUID(),
      slug,
      source: "internal",
      created_at: new Date().toISOString(),
    });
    await appendInternalProject(project);
    return project;
  },

  async vote(slug) {
    return bumpVote(slug);
  },
};
