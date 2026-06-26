// Discover existing open-source Venezuela-relief repos via the GitHub Search API
// and seed them onto the board. Run: node scripts/discover-github-repos.mjs
//   $env:GITHUB_TOKEN = (gh auth token)   # optional but recommended (30 vs 10 req/min)
// Safe-scrape path only: public OSS repos. Does NOT touch missing-persons
// registries (PII — link-out cards are hand-seeded in projects.seed.json).
import { z } from "zod";
import { writeFile, rename } from "node:fs/promises";
import path from "node:path";

// OSS / relief queries only. Public open-source repos — NEVER missing-persons
// registries or other PII sources (those stay hand-seeded link-out cards).
const QUERIES = [
  "venezuela terremoto",
  "venezuela earthquake",
  "desaparecidos venezuela",
  "centros de acopio venezuela",
  "build4venezuela",
  "topic:venezuela topic:earthquake",
  "topic:venezuela topic:disaster-relief",
  "topic:humanitarian venezuela",
  "venezuela ayuda humanitaria",
  "earthquake relief coordination",
];
const OUT = path.join(process.cwd(), "data", "external-projects.seed.json");
const TOKEN = process.env.GITHUB_TOKEN;
const MAX = 100;

const httpsUrl = z.string().url().refine((u) => u.startsWith("https://"));
const ProjectSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(2).max(120),
  summary: z.string().min(10).max(600),
  repo_url: httpsUrl.optional(),
  demo_url: httpsUrl.optional(),
  stack: z.array(z.string().min(1).max(40)).max(30).default([]),
  languages: z.array(z.enum(["en", "es"])).min(1),
  categories: z.array(z.string().min(1).max(40)).min(1).max(10),
  status: z.enum(["live", "wip", "planning"]),
  needs: z.object({
    contributors: z.array(z.string()).default([]),
    api_credits: z.array(z.string()).default([]),
    sponsors: z.array(z.string()).default([]),
  }),
  owner: z.string().min(1).max(80),
  source: z.enum(["internal", "external", "initiative"]),
  stars: z.number().int().nonnegative().optional(),
  complexity: z.enum(["low", "medium", "high"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers() {
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "build4venezuela-projecthub",
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

// Honor rate limits: back off on 403/429 using Retry-After / X-RateLimit-Reset.
async function fetchSearch(q, attempt = 0) {
  // sort=stars: rank by community validation (mature relief repos first), not recency.
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=50`;
  const res = await fetch(url, { headers: headers() });
  if ((res.status === 403 || res.status === 429) && attempt < 3) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const waitMs = retryAfter
      ? retryAfter * 1000
      : reset
        ? Math.max(0, reset * 1000 - Date.now()) + 1000
        : 2000 * 2 ** attempt;
    console.warn(`[discover] rate-limited on "${q}", backing off ${Math.round(waitMs / 1000)}s`);
    await sleep(Math.min(waitMs, 60000));
    return fetchSearch(q, attempt + 1);
  }
  if (!res.ok) throw new Error(`GitHub search failed: ${res.status} ${res.statusText}`);
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (remaining !== null) console.log(`[discover] "${q}" ok · rate remaining ${remaining}`);
  return res.json();
}

function toProject(repo) {
  const name = String(repo.name ?? "").slice(0, 120);
  const desc = String(repo.description ?? "").trim();
  const summary = desc.length >= 10 ? desc.slice(0, 600) : `${name} — Venezuela relief open-source project.`;
  const stack = [repo.language, ...(repo.topics ?? [])].filter(Boolean).slice(0, 8).map(String);
  const stars = Number.isFinite(repo.stargazers_count) ? repo.stargazers_count : 0;
  // Rough effort signal from repo size (KB); a community signal from stars.
  const size = Number(repo.size ?? 0);
  const complexity = size > 50000 ? "high" : size > 5000 ? "medium" : "low";
  const priority = stars >= 20 ? "high" : stars >= 5 ? "medium" : "low";
  return {
    id: `gh-${slugify(repo.full_name)}`,
    slug: `gh-${slugify(repo.full_name)}`,
    name,
    summary,
    repo_url: typeof repo.html_url === "string" ? repo.html_url : undefined,
    demo_url: repo.homepage && String(repo.homepage).startsWith("https://") ? repo.homepage : undefined,
    stack,
    languages: ["es"],
    categories: ["coordination"],
    status: repo.homepage ? "live" : "wip",
    needs: { contributors: [], api_credits: [], sponsors: [] },
    owner: String(repo.owner?.login ?? "unknown"),
    source: "external",
    stars,
    complexity,
    priority,
  };
}

async function main() {
  if (!TOKEN) {
    console.warn("[discover] no GITHUB_TOKEN set — low rate limit (10 req/min). Set $env:GITHUB_TOKEN = (gh auth token).");
  }
  const byName = new Map();
  for (const q of QUERIES) {
    const json = await fetchSearch(q);
    for (const repo of json.items ?? []) {
      if (!byName.has(repo.full_name)) byName.set(repo.full_name, repo);
    }
    await sleep(2000); // stay well under the per-minute search cap
  }

  const projects = [];
  for (const repo of byName.values()) {
    const parsed = ProjectSchema.safeParse(toProject(repo));
    if (parsed.success) projects.push(parsed.data);
    if (projects.length >= MAX) break;
  }

  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  await rename(tmp, OUT);
  console.log(`[discover] wrote ${projects.length} external repos → ${OUT}`);
}

main().catch((err) => {
  console.error("[discover] failed:", err.message);
  process.exit(1);
});
