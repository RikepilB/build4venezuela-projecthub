import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ProjectSchema,
  BuilderSchema,
  MembershipSchema,
} from "./schemas";
import { readVotes } from "./votes/votes-store";
import { readRepoOverrides } from "./repos/repo-overrides-store";
import type { Project, Builder, Membership } from "./types";

// Server-only JSON data access. The repository layer (src/lib/repository) is the
// public seam; this module just reads/writes the local files. P1 replaces the
// repository impls with Supabase and this file is no longer on the read path.

const DATA_DIR = path.join(process.cwd(), "data");

async function readArray(file: string): Promise<unknown[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // Missing/unreadable (e.g. importer not run yet) → empty set, logged server-side.
    console.error(`[data] could not read ${file}:`, err);
    return [];
  }
}

// Validate each record individually so one malformed entry can't blank the board.
function keepValid<T>(rows: unknown[], schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }): T[] {
  const out: T[] = [];
  for (const row of rows) {
    const r = schema.safeParse(row);
    if (r.success && r.data !== undefined) out.push(r.data);
    else console.error("[data] dropped invalid record");
  }
  return out;
}

// Memoized per request (React.cache): all repository methods that call loadProjects
// in one render share a single set of file reads. Votes are overlaid from the
// votes-store (Redis on Vercel, JSON locally) — read fresh each request so a new
// upvote is never masked by a stale cache.
export const loadProjects = cache(async (): Promise<Project[]> => {
  const [internal, ideas, external] = await Promise.all([
    readArray("projects.seed.json"),
    readArray("ideas.seed.json"),
    readArray("external-projects.seed.json"),
  ]);
  const projects = keepValid<Project>([...internal, ...ideas, ...external], ProjectSchema);
  // Community upvotes AND user-attached repos live in separate stores keyed by slug so
  // they apply across all sources (internal/ideas/external) without rewriting seed —
  // and persist on Vercel's read-only FS (Redis). Overlaid here on every read.
  const slugs = projects.map((p) => p.slug);
  const [votes, repoOverrides] = await Promise.all([readVotes(slugs), readRepoOverrides(slugs)]);
  return projects.map((p) => {
    const ov = repoOverrides[p.slug];
    return {
      ...p,
      votes: votes[p.slug] ?? p.votes ?? 0,
      repo_url: ov?.url ?? p.repo_url,
      contributors: ov?.contributors ?? p.contributors,
    };
  });
});

export const loadBuilders = cache(async (): Promise<Builder[]> => {
  const rows = await readArray("builders.json");
  return keepValid<Builder>(rows, BuilderSchema);
});

// Self-registered builders ("add yourself") live in a SEPARATE file from the imported
// roster: scripts/import-builders.mjs overwrites builders.json wholesale, so keeping
// self-adds here means a re-import can't wipe them. The Redis path (builders-store)
// is preferred on Vercel; this file is the dev/offline fallback.
export const loadCustomBuildersFile = cache(async (): Promise<Builder[]> => {
  const rows = await readArray("builders-custom.json");
  return keepValid<Builder>(rows, BuilderSchema);
});

// Append a self-registered builder to the custom file. Temp-then-rename so a crash
// can't corrupt it. Throws on a read-only FS (Vercel) — the store falls back from here
// to Redis, not the other way around, so callers should prefer the store.
export async function appendCustomBuilderFile(builder: Builder): Promise<void> {
  const file = path.join(DATA_DIR, "builders-custom.json");
  const existing = await readArray("builders-custom.json");
  const next = [...existing, builder];
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

// Append a newly-submitted internal project. Temp-then-rename so a crash mid-write
// can't corrupt the file. On a read-only FS (e.g. Vercel serverless) this throws;
// the caller turns that into a user-facing "demo persists locally only" message.
export async function appendInternalProject(project: Project): Promise<void> {
  const file = path.join(DATA_DIR, "projects.seed.json");
  const existing = await readArray("projects.seed.json");
  const next = [...existing, project];
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}

// Team memberships ("who joined which project"). Gitignored runtime PII, like
// builders.json. Read fresh per request (cache memoizes within one render).
export const loadMemberships = cache(async (): Promise<Membership[]> => {
  const rows = await readArray("memberships.json");
  return keepValid<Membership>(rows, MembershipSchema);
});

// Append a team membership. Temp-then-rename so a crash can't corrupt the file.
// Throws on a read-only FS — the join action surfaces it.
export async function appendMembership(membership: Membership): Promise<void> {
  const file = path.join(DATA_DIR, "memberships.json");
  const existing = await readArray("memberships.json");
  const next = [...existing, membership];
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await fs.rename(tmp, file);
}
