import { randomUUID } from "node:crypto";
import { loadProjects, appendInternalProject } from "../data-files";
import { searchProjects, type SearchHit } from "../search";
import { slugify } from "../slug";
import { ProjectSchema } from "../schemas";
import type { Project, ProjectFilter, ProjectInput } from "../types";

export interface ProjectRepository {
  list(filter?: ProjectFilter): Promise<Project[]>;
  getBySlug(slug: string): Promise<Project | null>;
  search(query: string): Promise<SearchHit[]>;
  create(input: ProjectInput): Promise<Project>;
}

function applyFilter(projects: Project[], f?: ProjectFilter): Project[] {
  if (!f) return projects;
  return projects.filter((p) => {
    if (f.category && !p.categories.includes(f.category)) return false;
    if (f.stack && !p.stack.some((s) => s.toLowerCase() === f.stack?.toLowerCase())) return false;
    if (f.language && !p.languages.includes(f.language)) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.need && p.needs[f.need].length === 0) return false;
    return true;
  });
}

// JSON-backed implementation. The only file P1 changes to go durable: drop in
// supabase.repo.ts with the same interface and switch in ./index.ts.
export const jsonProjectRepository: ProjectRepository = {
  async list(filter) {
    const projects = await loadProjects();
    return applyFilter(projects, filter);
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
};
