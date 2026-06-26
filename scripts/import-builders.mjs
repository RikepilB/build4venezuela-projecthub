// Import the hackathon participants roster (a public Google Sheet) into
// data/builders.json. Run: node scripts/import-builders.mjs
// Public sheet → no auth. The Next app re-validates on read, but we validate
// here too so a bad row never lands in the committed file.
import { z } from "zod";
import { writeFile, rename } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const SHEET_ID = "1izXHF-aZOOu7VvfmbpH8TmVCFbjqwm2eqnpJN2ODrCo";
// Pin the roster tab ("⚡ ARMADO DE EQUIPO"). The default CSV export returns the
// workbook's FIRST tab (a "roles we need" table) — not the roster — so without a
// gid this importer silently writes zero builders. gid is stable per-tab.
const SHEET_GID = process.env.BUILDERS_SHEET_GID ?? "939217674";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const OUT = path.join(process.cwd(), "data", "builders.json");

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"));

const BuilderSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1).max(120),
  role: z.string().max(160).default(""),
  stack: z.array(z.string().min(1).max(40)).max(40).default([]),
  linkedin_url: httpsUrl.optional(),
  availability: z.string().max(120).default(""),
  timezone: z.string().max(60).default(""),
  status: z.string().max(60).default(""),
});

const norm = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const slug = (s) =>
  norm(s).slice(0, 60) || "builder";

// Split a "skills" cell into tags. Some people type a whole sentence here, which
// would blow the schema's 40-char per-tag bound and drop the entire person — so
// clamp each tag to 40 chars rather than lose a real builder over a long label.
const splitTags = (s) =>
  String(s)
    .split(/[/,;|]+/)
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean);

// Resolve a cell by fuzzy header match (handles "Nombre / Alias", "Stack/Skills", …).
function pick(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const key = keys.find((k) => norm(k).includes(cand));
    if (key) return String(row[key] ?? "").trim();
  }
  return "";
}

function toHttps(raw) {
  const v = String(raw).trim();
  if (!v) return undefined;
  if (v.startsWith("https://")) return v;
  if (v.startsWith("http://")) return `https://${v.slice(7)}`;
  // bare handle/domain like "ainarataborda.com" → only promote if it looks like a domain
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`;
  return undefined; // a bare @handle is not a URL → drop
}

async function main() {
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
  }
  const csv = await res.text();

  // The sheet has banner rows before the real header. Find the header row
  // (the one naming the columns) and parse from there.
  const lines = csv.split(/\r?\n/);
  const headerIdx = lines.findIndex(
    (l) => /nombre/i.test(l) && /(alias|stack|rol)/i.test(l),
  );
  const body = lines.slice(headerIdx >= 0 ? headerIdx : 0).join("\n");

  const { data, errors } = Papa.parse(body, { header: true, skipEmptyLines: true });
  if (errors.length) console.warn(`[import-builders] ${errors.length} CSV parse warning(s)`);

  const builders = [];
  let dropped = 0;
  data.forEach((row, i) => {
    const alias = pick(row, ["nombrealias", "nombre", "alias"]);
    if (!alias) {
      dropped++;
      return;
    }
    const candidate = {
      id: slug(alias) || String(i + 1),
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
    else dropped++;
  });

  // Dedupe ids so the app's keys stay unique.
  const seen = new Set();
  for (const b of builders) {
    let id = b.id;
    let n = 2;
    while (seen.has(id)) id = `${b.id}-${n++}`;
    b.id = id;
    seen.add(id);
  }

  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, `${JSON.stringify(builders, null, 2)}\n`, "utf8");
  await rename(tmp, OUT);
  console.log(`[import-builders] wrote ${builders.length} builders (dropped ${dropped}) → ${OUT}`);
}

main().catch((err) => {
  // Fail without clobbering an existing good builders.json.
  console.error("[import-builders] failed:", err.message);
  process.exit(1);
});
