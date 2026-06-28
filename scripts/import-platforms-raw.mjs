// Import the "Plataformas Raw" tab — the team's full crisis-platform DB (~90 rows) — into
// data/resources.raw.json, the bulk-discovery layer behind the /resources directory.
// Distinct from import-platforms.mjs, which syncs the curated "Plataformas activas" tab
// into resources.seed.json. Both feed loadResources; seed/extra win over raw on dedup.
//
// Fetches by sheet NAME via the gviz endpoint (survives tab reordering — no gid pin).
// Run: node scripts/import-platforms-raw.mjs   (npm run data:platforms-raw)
// Columns: Categoria | Nombre | URL | Que hace | API / Datos abiertos | GitHub | Contacto
//
// HARD RULES (see CLAUDE.md):
//  - PII: the "Contacto (X / email)" column is DROPPED entirely. Personal emails/phones are
//    never published; summaries are scrubbed of any email/phone pattern as defense-in-depth.
//  - Link-out only: missing-persons / patient platforms are listed as plain link-out cards,
//    never scraped or merged. We only store name + URL + functional blurb.
//  - Net-new only: rows whose host already appears in resources.seed.json / resources.extra.json
//    are skipped, so this file stays the long tail and never double-lists a curated entry.
import { z } from "zod";
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const SHEET_ID = "1izXHF-aZOOu7VvfmbpH8TmVCFbjqwm2eqnpJN2ODrCo";
const TAB = "Plataformas Raw";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB)}`;
const DATA_DIR = path.join(process.cwd(), "data");
const OUT = path.join(DATA_DIR, "resources.raw.json");

const httpsUrl = z.string().url().refine((u) => u.startsWith("https://"));
const ResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(160),
  type: z.enum(["search", "dev", "resources", "donation", "official", "psychosocial", "finance", "telecom", "other"]),
  url: httpsUrl.optional(),
  contact: z.string().min(1).max(160).optional(),
  summary: z.string().max(600).default(""),
  languages: z.array(z.enum(["en", "es"])).default([]),
  verified_source: z.string().max(120).default(""),
  active: z.boolean().default(true),
});

const collapse = (s) => String(s).replace(/\s+/g, " ").trim();
const stripControls = (s) => String(s).replace(/[​-‏‪-‮⁠-⁯﻿️]/g, "");
const norm = (s) => stripControls(String(s)).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

// Strip annotation tags the team appends to names ("(NUEVO)", "(TOP)") so ids line up with
// the curated files and the same platform never appears twice.
const cleanName = (s) => collapse(stripControls(s).replace(/\s*\((?:NUEVO|TOP)\)\s*/gi, " "));

// Raw category labels → the app's ResourceType. Order matters (first match wins).
function mapTypeRaw(cat) {
  const t = norm(cat);
  if (/satelital|internet|telecom/.test(t)) return "telecom";
  if (/donaci|fondo/.test(t)) return "donation";
  if (/dano|estructural|ingenier|habitab|edificio|mapa/.test(t)) return "other";
  if (/mascota|animal/.test(t)) return "other";
  if (/acopio|refugio|logistica|insumo|suministro|aliment/.test(t)) return "resources";
  if (/desaparec|nino|acompan|hospital|paciente|salud|localizad|busqueda|buscar|persona/.test(t)) return "search";
  if (/bot|dedup|scraper/.test(t)) return "dev";
  if (/agregador|coordinaci|portal|hub|voluntariado/.test(t)) return "resources";
  return "other";
}

// Defense-in-depth: remove any email/phone that slipped into a free-text field.
const scrubPII = (s) =>
  collapse(
    String(s)
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "")
      .replace(/\+?\d[\d\s().-]{7,}\d/g, ""),
  );

async function readJsonArray(file) {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
  } catch {
    return [];
  }
}

const host = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

async function main() {
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
  const csv = await res.text();

  const { data: rows } = Papa.parse(csv, { header: false, skipEmptyLines: true });
  const headerIdx = rows.findIndex(
    (r) => r.some((c) => /categor/i.test(c)) && r.some((c) => /url/i.test(c)),
  );
  if (headerIdx < 0) throw new Error('raw header row ("Categoria … URL …") not found');

  // Hosts already covered by the curated files → skip them so raw is pure long tail.
  const curated = [...(await readJsonArray("resources.seed.json")), ...(await readJsonArray("resources.extra.json"))];
  const coveredHosts = new Set(curated.map((r) => host(r.url)).filter(Boolean));

  const out = [];
  const seenIds = new Set();
  const seenHosts = new Set();
  let dropped = 0;
  let skippedCovered = 0;

  for (const r of rows.slice(headerIdx + 1)) {
    const name = cleanName(r[1] ?? "");
    const urlCell = collapse(stripControls(r[2] ?? ""));
    if (name.length < 2) {
      dropped++;
      continue;
    }
    // Resources are link-out: a row with no usable https URL is useless here.
    const url = /^https:\/\/\S+$/i.test(urlCell) ? urlCell : undefined;
    if (!url) {
      dropped++;
      continue;
    }
    const h = host(url);
    if (coveredHosts.has(h) || seenHosts.has(h)) {
      skippedCovered++;
      continue;
    }

    const cat = collapse(stripControls(r[0] ?? ""));
    const que = scrubPII(stripControls(r[3] ?? ""));
    const apiCell = norm(r[4] ?? "");
    const ghCell = norm(r[5] ?? "");
    const apiSignal = /\bsi\b|\bs[ií]\b|api|dataset|datos abiertos|consume|dashboard/.test(apiCell);
    const ghSignal = /github\.com|\brepo\b/.test(ghCell);

    const parts = [que].filter(Boolean);
    if (apiSignal) parts.push("API / datos abiertos");
    if (ghSignal) parts.push("código abierto");
    parts.push("Solo enlace");
    const summary = parts.join(" · ").slice(0, 600);

    let slug = `res-${slugify(name)}`;
    let n = 2;
    while (seenIds.has(slug)) slug = `res-${slugify(name)}-${n++}`;
    seenIds.add(slug);
    seenHosts.add(h);

    const candidate = {
      id: slug,
      name: name.slice(0, 160),
      type: mapTypeRaw(cat),
      url,
      summary,
      languages: ["es"],
      verified_source: "Ecosistema Startups Venezuela",
      active: true,
    };
    const parsed = ResourceSchema.safeParse(candidate);
    if (parsed.success) out.push(parsed.data);
    else dropped++;
  }

  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  await rename(tmp, OUT);
  console.log(
    `[import-platforms-raw] wrote ${out.length} net-new resources (dropped ${dropped}, skipped ${skippedCovered} already-curated) → ${OUT}`,
  );
}

main().catch((err) => {
  console.error("[import-platforms-raw] failed:", err.message);
  process.exit(1);
});
