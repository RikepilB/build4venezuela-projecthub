// Import the "Plataformas activas" tab (verified relief platforms & resources) into
// data/resources.seed.json — the source for the app's /resources directory.
// Fetches by sheet NAME via the gviz endpoint (survives tab reordering — no gid pin).
// Run: node scripts/import-platforms.mjs   (npm run data:platforms)
// Columns: Tipo | Nombre / Plataforma | URL | Descripción | Estado | Idioma | Fuente verificada
import { z } from "zod";
import { writeFile, rename } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const SHEET_ID = "1izXHF-aZOOu7VvfmbpH8TmVCFbjqwm2eqnpJN2ODrCo";
const TAB = "Plataformas activas";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB)}`;
const OUT = path.join(process.cwd(), "data", "resources.seed.json");

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
const stripControls = (s) => String(s).replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFE0F]/g, "");
const norm = (s) => stripControls(String(s)).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const slugify = (s) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);

// "🔍 Búsqueda personas" → "search", etc. Tipo cells are emoji-prefixed Spanish labels.
function mapType(tipo) {
  const t = norm(tipo);
  if (/busqueda|persona|desaparec/.test(t)) return "search";
  if (/tech|dev|github|codigo/.test(t)) return "dev";
  if (/recurso/.test(t)) return "resources";
  if (/donaci|fondo/.test(t)) return "donation";
  if (/organismo|oficial|onu|oms/.test(t)) return "official";
  if (/psico|apoyo|salud mental/.test(t)) return "psychosocial";
  if (/finanz|remesa|banco|cripto/.test(t)) return "finance";
  if (/telecom|telefon|comunicacion/.test(t)) return "telecom";
  return "other";
}

function mapLanguages(idioma) {
  const t = norm(idioma);
  const out = [];
  if (/es/.test(t)) out.push("es");
  if (/en/.test(t)) out.push("en");
  return out.length ? out : ["es"];
}

async function main() {
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
  const csv = await res.text();

  // Parse headerless, then find the real header row ("Tipo … URL …") past the title preamble.
  const { data: rows } = Papa.parse(csv, { header: false, skipEmptyLines: true });
  const headerIdx = rows.findIndex(
    (r) => r.some((c) => /tipo/i.test(c)) && r.some((c) => /url/i.test(c)),
  );
  if (headerIdx < 0) throw new Error('resources header row ("Tipo … URL …") not found');

  const resources = [];
  let dropped = 0;
  const seen = new Set();
  for (const r of rows.slice(headerIdx + 1)) {
    const tipo = collapse(stripControls(r[0] ?? ""));
    const name = collapse(stripControls(r[1] ?? ""));
    const urlCell = collapse(stripControls(r[2] ?? ""));
    const desc = collapse(stripControls(r[3] ?? ""));
    const idioma = r[5] ?? "";
    const fuente = collapse(stripControls(r[6] ?? ""));
    if (name.length < 2) {
      dropped++;
      continue;
    }
    // URL column may hold a real link, a phone/account, or "—". Split accordingly.
    const url = /^https:\/\/\S+$/i.test(urlCell) ? urlCell : undefined;
    const contact = !url && urlCell && urlCell !== "—" ? urlCell.slice(0, 160) : undefined;

    let slug = `res-${slugify(name)}`;
    let n = 2;
    while (seen.has(slug)) slug = `res-${slugify(name)}-${n++}`;
    seen.add(slug);

    const candidate = {
      id: slug,
      name: name.slice(0, 160),
      type: mapType(tipo),
      url,
      contact,
      summary: desc.slice(0, 600),
      languages: mapLanguages(idioma),
      verified_source: fuente.slice(0, 120),
      active: !/inactiv|cerrad|caíd|caid/i.test(norm(r[4] ?? "")),
    };
    const parsed = ResourceSchema.safeParse(candidate);
    if (parsed.success) resources.push(parsed.data);
    else dropped++;
  }

  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, `${JSON.stringify(resources, null, 2)}\n`, "utf8");
  await rename(tmp, OUT);
  console.log(`[import-platforms] wrote ${resources.length} resources (dropped ${dropped}) → ${OUT}`);
}

main().catch((err) => {
  console.error("[import-platforms] failed:", err.message);
  process.exit(1);
});
