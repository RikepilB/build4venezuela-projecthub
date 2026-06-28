import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { redis } from "../redis/client";

// A user-attached repo for a project that shipped without one ("add the repo from
// the board"). Stored OUT of the seed files so it persists on Vercel's read-only FS:
// Upstash Redis (one key per slug) when configured, else data/repo-overrides.json in
// dev (or /tmp/repo-overrides.json as a last resort on Vercel without Redis).
// Overlaid onto projects in loadProjects. Mirrors votes-store.
export interface RepoOverride {
  url: string;
  contributors?: number; // GitHub contributor count, cached at attach time
  fetched_at: string;
}

const key = (slug: string) => `repo:${slug}`;
const FILE = path.join(process.cwd(), "data", "repo-overrides.json");
const TMPFILE = path.join(os.tmpdir(), "repo-overrides.json");

// In-memory cache so the same serverless instance always sees its own writes
// (ISR revalidation, refresh, navigation).  Lost on cold start / different
// instance — Redis is the only cross-instance durable backend.
const memoryCache = new Map<string, RepoOverride>();

async function readFile(): Promise<Record<string, RepoOverride>> {
  for (const p of [FILE, TMPFILE]) {
    try {
      const raw = await fs.readFile(p, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, RepoOverride>) : {};
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error(`[repo-overrides] read ${p}:`, err);
    }
  }
  return {};
}

async function writeFile(map: Record<string, RepoOverride>): Promise<boolean> {
  for (const p of [FILE, TMPFILE]) {
    try {
      await fs.writeFile(p, `${JSON.stringify(map, null, 2)}\n`, "utf8");
      return true;
    } catch {
      // try next fallback
    }
  }
  return false;
}

function coerce(value: unknown): RepoOverride | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  return typeof o.url === "string" && o.url
    ? { url: o.url, contributors: typeof o.contributors === "number" ? o.contributors : undefined, fetched_at: String(o.fetched_at ?? "") }
    : null;
}

// Read overrides for the given slugs (the board/detail already loaded).  Checks
// the in-memory cache first (same-instance writes are immediately visible), then
// Redis MGET (one round trip), then the JSON map.
export async function readRepoOverrides(slugs: string[]): Promise<Record<string, RepoOverride>> {
  const out: Record<string, RepoOverride> = {};
  const uncached: string[] = [];

  for (const slug of slugs) {
    if (memoryCache.has(slug)) {
      out[slug] = memoryCache.get(slug)!;
    } else {
      uncached.push(slug);
    }
  }
  if (uncached.length === 0) return out;

  if (redis.enabled && uncached.length) {
    const vals = await redis.mget(uncached.map(key));
    if (vals) {
      uncached.forEach((slug, i) => {
        const raw = vals[i];
        if (typeof raw === "string" && raw) {
          try {
            const ov = coerce(JSON.parse(raw));
            if (ov) {
              out[slug] = ov;
              memoryCache.set(slug, ov);
            }
          } catch {
            // skip a corrupt value rather than fail the whole board read
          }
        }
      });
      return out;
    }
  }

  const fileMap = await readFile();
  for (const slug of uncached) {
    if (fileMap[slug]) {
      out[slug] = fileMap[slug];
      memoryCache.set(slug, fileMap[slug]);
    }
  }
  return out;
}

export async function setRepoOverride(slug: string, override: RepoOverride): Promise<boolean> {
  memoryCache.set(slug, override);
  if (redis.enabled) {
    const ok = await redis.set(key(slug), JSON.stringify(override));
    if (ok) return true;
  }
  const map = await readFile();
  return writeFile({ ...map, [slug]: override });
}
