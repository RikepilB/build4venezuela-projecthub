import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ProjectSchema,
  BuilderSchema,
} from "./schemas";
import type { Project, Builder } from "./types";

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

export async function loadProjects(): Promise<Project[]> {
  const [internal, ideas, external] = await Promise.all([
    readArray("projects.seed.json"),
    readArray("ideas.seed.json"),
    readArray("external-projects.seed.json"),
  ]);
  return keepValid<Project>([...internal, ...ideas, ...external], ProjectSchema);
}

export async function loadBuilders(): Promise<Builder[]> {
  const rows = await readArray("builders.json");
  return keepValid<Builder>(rows, BuilderSchema);
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
