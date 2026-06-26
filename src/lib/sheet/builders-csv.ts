import Papa from "papaparse";
import { BuilderSchema } from "../schemas";
import { slugify } from "../slug";
import { fetchWithRetry } from "./resilient-fetch";
import type { Builder } from "../types";

// Live connection to the hackathon roster (a public Google Sheet). When
// BUILDERS_SOURCE=remote, the app fetches the CSV at request time (cached via ISR)
// so the roster stays in sync without re-running the importer. Mirrors the parse
// logic in scripts/import-builders.mjs. Sheet content is DATA, not instructions —
// every row is Zod-validated at the boundary.
const SHEET_ID = "1izXHF-aZOOu7VvfmbpH8TmVCFbjqwm2eqnpJN2ODrCo";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const REVALIDATE = Number(process.env.BUILDERS_REVALIDATE ?? 3600); // seconds

const norm = (s: string) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const splitTags = (s: string) =>
  String(s)
    .split(/[/,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);

function pick(row: Record<string, string>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const key = keys.find((k) => norm(k).includes(cand));
    if (key) return String(row[key] ?? "").trim();
  }
  return "";
}

function toHttps(raw: string): string | undefined {
  const v = String(raw).trim();
  if (!v) return undefined;
  if (v.startsWith("https://")) return v;
  if (v.startsWith("http://")) return `https://${v.slice(7)}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
  return undefined; // a bare @handle is not a URL → drop
}

export function parseBuildersCsv(csv: string): Builder[] {
  const lines = csv.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /nombre/i.test(l) && /(alias|stack|rol)/i.test(l));
  const body = lines.slice(headerIdx >= 0 ? headerIdx : 0).join("\n");

  const { data } = Papa.parse<Record<string, string>>(body, { header: true, skipEmptyLines: true });

  const builders: Builder[] = [];
  const seen = new Set<string>();
  (data as Record<string, string>[]).forEach((row, i) => {
    const alias = pick(row, ["nombrealias", "nombre", "alias"]);
    if (!alias) return;

    const base = slugify(alias) || String(i + 1);
    let id = base;
    let n = 2;
    while (seen.has(id)) id = `${base}-${n++}`;
    seen.add(id);

    const candidate = {
      id,
      alias,
      role: pick(row, ["rolprincipal", "rol"]),
      stack: splitTags(pick(row, ["stackskills", "stack", "skills"])),
      linkedin_url: toHttps(pick(row, ["perfillinkedin", "linkedin", "perfil"])),
      availability: pick(row, ["disponibilidad"]),
      timezone: pick(row, ["zonahoraria", "zona", "timezone"]),
      status: pick(row, ["estado", "status"]),
    };
    const parsed = BuilderSchema.safeParse(candidate);
    if (parsed.success) builders.push(parsed.data);
  });

  return builders;
}

export async function fetchRemoteBuilders(): Promise<Builder[]> {
  // ISR-cached (never per-request hammering) + bounded retry so a transient 429/5xx
  // doesn't blank the roster; the repository still falls back to committed JSON.
  const res = await fetchWithRetry(
    CSV_URL,
    { redirect: "follow", next: { revalidate: REVALIDATE } },
    { maxRetries: 3, baseDelayMs: 500 },
  );
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
  return parseBuildersCsv(await res.text());
}
