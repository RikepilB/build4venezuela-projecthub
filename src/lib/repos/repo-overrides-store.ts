import { promises as fs } from "node:fs";
import path from "node:path";
import { redis } from "../redis/client";

// A user-attached repo for a project that shipped without one ("add the repo from
// the board"). Stored OUT of the seed files so it persists on Vercel's read-only FS:
// Upstash Redis (one key per slug) when configured, else data/repo-overrides.json in
// dev. Overlaid onto projects in loadProjects. Mirrors votes-store.
export interface RepoOverride {
  url: string;
  contributors?: number; // GitHub contributor count, cached at attach time
  fetched_at: string;
}

const key = (slug: string) => `repo:${slug}`;
const FILE = path.join(process.cwd(), "data", "repo-overrides.json");

async function readFile(): Promise<Record<string, RepoOverride>> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, RepoOverride>) : {};
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error("[repo-overrides] read:", err);
    return {};
  }
}

async function writeFile(map: Record<string, RepoOverride>): Promise<void> {
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  await fs.rename(tmp, FILE);
}

function coerce(value: unknown): RepoOverride | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  return typeof o.url === "string" && o.url
    ? { url: o.url, contributors: typeof o.contributors === "number" ? o.contributors : undefined, fetched_at: String(o.fetched_at ?? "") }
    : null;
}

// Read overrides for the given slugs (the board/detail already loaded). Redis MGET =
// one round trip; falls back to the JSON map on any miss.
export async function readRepoOverrides(slugs: string[]): Promise<Record<string, RepoOverride>> {
  if (redis.enabled && slugs.length) {
    const vals = await redis.mget(slugs.map(key));
    if (vals) {
      const out: Record<string, RepoOverride> = {};
      slugs.forEach((slug, i) => {
        const raw = vals[i];
        if (typeof raw === "string" && raw) {
          try {
            const ov = coerce(JSON.parse(raw));
            if (ov) out[slug] = ov;
          } catch {
            // skip a corrupt value rather than fail the whole board read
          }
        }
      });
      return out;
    }
  }
  return readFile();
}

export async function setRepoOverride(slug: string, override: RepoOverride): Promise<void> {
  if (redis.enabled) {
    const ok = await redis.set(key(slug), JSON.stringify(override));
    if (ok) return;
  }
  const map = await readFile();
  await writeFile({ ...map, [slug]: override });
}
