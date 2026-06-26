// Import the hackathon "IDEAS PARA EL HACKATHON" table (a specific sheet tab)
// into data/ideas.seed.json so the team's candidate projects seed the board.
// Run: node scripts/import-ideas.mjs
// Columns: Capa | Idea / Proyecto | Problema que resuelve | Stack sugerido |
//          Responsable ideal | Impacto | Dificultad
import { z } from "zod";
import { writeFile, rename, readFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";

const SHEET_ID = "1izXHF-aZOOu7VvfmbpH8TmVCFbjqwm2eqnpJN2ODrCo";
const GID = "1187241395";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
const OUT = path.join(process.cwd(), "data", "ideas.seed.json");

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
  complexity: z.enum(["low", "medium", "high"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  use_case: z.string().min(1).max(280).optional(),
});

// Map the sheet's Spanish Impacto/Dificultad cells to structured ranks.
function mapPriority(impacto) {
  const t = norm(impacto);
  if (/muyalto|alto|alta/.test(t)) return "high";
  if (/medio|media/.test(t)) return "medium";
  if (/bajo|baja/.test(t)) return "low";
  return undefined;
}
function mapComplexity(dificultad) {
  const t = norm(dificultad);
  if (/dificil|alto|alta|hard/.test(t)) return "high";
  if (/medio|media|medium/.test(t)) return "medium";
  if (/facil|bajo|baja|easy|low/.test(t)) return "low";
  return undefined;
}

const norm = (s) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Collapse runs of whitespace (incl. the sheet's literal newlines inside a cell) to
// single spaces, so a multi-line cell doesn't become a newline-laden name/summary.
const collapse = (s) => String(s).replace(/\s+/g, " ").trim();

// Strip zero-width / bidi / variation-selector format chars that ride along in
// copy-pasted sheet cells (e.g. bidi marks wrapping phone numbers, U+FE0F after an emoji).
const stripControls = (s) =>
  String(s).replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFE0F]/g, "");

const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

function pick(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const key = keys.find((k) => norm(k).includes(cand));
    if (key) return String(row[key] ?? "").trim();
  }
  return "";
}

// Known tech tokens — extracted with word boundaries so "Go" won't match "Google".
const TECH = [
  "Next.js", "React", "HTML", "CSS", "Golang", "Go", "Node.js", "Node", "Python",
  "FastAPI", "Firebase", "Supabase", "Twilio", "WhatsApp", "Mapbox", "Leaflet",
  "Chart.js", "Recharts", "Claude API", "Claude", "Pgvector", "IndexedDB",
  "Service Workers", "PWA", "Swagger", "Bluetooth", "WiFi Direct", "WiFi",
  "USSD", "SMS", "RestAPI", "REST", "API", "Canvas", "Lovable", "Kanban", "LoRa",
];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function extractTech(text) {
  const found = [];
  const seen = new Set();
  for (const t of TECH) {
    const re = new RegExp(`\\b${escapeRe(t)}\\b`, "i");
    if (re.test(text) && !seen.has(t.toLowerCase())) {
      // Skip a shorter token already covered by a longer one (Node vs Node.js).
      if (found.some((f) => f.toLowerCase().includes(t.toLowerCase()))) continue;
      found.push(t);
      seen.add(t.toLowerCase());
    }
  }
  return found.slice(0, 8);
}

function deriveCategory(capa, idea) {
  const t = norm(`${capa} ${idea}`);
  if (/(desaparecid|busqueda|buscar|ficha)/.test(t)) return "missing-persons";
  if (/(mapa|dashboard|necesidad|recurso)/.test(t)) return "needs-map";
  if (/(dedup|duplicad)/.test(t)) return "tracking";
  return "coordination";
}

function cleanOwner(raw) {
  // Sheet "Responsable" cells are messy: bullet lists, several names, phone numbers,
  // URLs, invitation text, bidi marks. Take the first plausible name; else "open".
  const cleaned = stripControls(String(raw))
    .replace(/https?:\/\/\S+/gi, " ") // URLs
    .replace(/\+?\d[\d\s().-]{5,}/g, " ") // phone numbers
    .replace(/[@#]\S*/g, " ") // social handles
    .replace(/\([^)]*\)?/g, " "); // (parentheticals, even unbalanced "(")
  const first = cleaned
    .split(/[\n;,:*•·]| {2,}| - /)
    .map((s) => collapse(s))
    .find((s) => /\p{L}{2,}/u.test(s));
  if (!first) return "open";
  // Cut trailing invitation noise ("…únete al grupo"), then trim non-letter edges.
  const name = collapse(first.split(/\b(?:whatsapp|telegram|unete|únete|grupo|discord)\b/iu)[0])
    .replace(/^[^\p{L}]+/u, "")
    .replace(/[^\p{L}.]+$/u, "");
  return name.length >= 2 ? name.slice(0, 80) : "open";
}

const stripEmoji = (s) =>
  collapse(stripControls(String(s)).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, ""));

async function main() {
  const res = await fetch(CSV_URL, { redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
  const csv = await res.text();

  const lines = csv.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => /capa/i.test(l) && /idea/i.test(l));
  if (headerIdx < 0) throw new Error("ideas header row (Capa,Idea…) not found");
  const body = lines.slice(headerIdx).join("\n");

  const { data } = Papa.parse(body, { header: true, skipEmptyLines: true });

  const projects = [];
  let dropped = 0;

  // Skip ideas already hand-curated in projects.seed.json so the importer never
  // creates a duplicate card (e.g. the sheet's long multi-line "Reencuentros…" row).
  let curatedNames = [];
  try {
    const seed = JSON.parse(await readFile(path.join(process.cwd(), "data", "projects.seed.json"), "utf8"));
    curatedNames = (Array.isArray(seed) ? seed : []).map((p) => norm(p.name)).filter(Boolean);
  } catch {
    /* projects.seed.json optional — no dedup if absent */
  }
  const isCurated = (name) => {
    const n = norm(name);
    return n.length > 0 && curatedNames.some((c) => n === c || n.startsWith(c) || c.startsWith(n));
  };

  for (const row of data) {
    const rawIdea = collapse(stripControls(pick(row, ["ideaproyecto", "idea"])));
    if (!rawIdea || rawIdea.length < 2) {
      dropped++;
      continue;
    }
    if (isCurated(rawIdea)) {
      dropped++;
      continue;
    }
    const capa = stripEmoji(pick(row, ["capa"]));
    const problema = collapse(stripControls(pick(row, ["problemaqueresuelve", "problema"])));
    const impacto = stripEmoji(pick(row, ["impacto"]));
    const dificultad = stripEmoji(pick(row, ["dificultad"]));
    const stackText = pick(row, ["stacksugerido", "stack"]);

    // People paste their demo/repo into the idea cell — lift those into structured
    // fields and keep the card title clean.
    const urls = (rawIdea.match(/https?:\/\/\S+/gi) || []).map((u) => u.replace(/[)\].,]+$/, ""));
    const repo_url = urls.find((u) => /^https:\/\/github\.com/i.test(u));
    const demo_url = urls.find((u) => u.startsWith("https://") && u !== repo_url);
    const name = collapse(rawIdea.replace(/https?:\/\/\S+/gi, "").replace(/\bRepo:/gi, "")).slice(0, 120);

    const summary = problema.length >= 10 ? problema : `${name} — idea para el hackathon solidario.`;

    const candidate = {
      id: `idea-${slugify(name)}`,
      slug: `idea-${slugify(name)}`,
      name,
      summary: summary.slice(0, 600),
      repo_url,
      demo_url,
      stack: extractTech(stackText),
      languages: ["es"],
      categories: [deriveCategory(capa, name)],
      // A pasted demo/repo means it's further along than a raw idea.
      status: demo_url ? "live" : repo_url ? "wip" : "planning",
      needs: { contributors: [], api_credits: [], sponsors: [] },
      owner: cleanOwner(pick(row, ["responsableideal", "responsable"])),
      source: "internal",
      // Impacto drives priority; an unrated-but-listed idea is at least medium so it
      // isn't stuck priority-less and invisible in the high-priority default view.
      priority: mapPriority(impacto) ?? "medium",
      complexity: mapComplexity(dificultad),
      // The sheet has no use-case column — Capa is a layer label, not a use case.
      use_case: undefined,
    };
    const parsed = ProjectSchema.safeParse(candidate);
    if (parsed.success) projects.push(parsed.data);
    else dropped++;
  }

  // Dedupe slugs.
  const seen = new Set();
  for (const p of projects) {
    let s = p.slug;
    let n = 2;
    while (seen.has(s)) s = `${p.slug}-${n++}`;
    p.slug = s;
    p.id = s;
    seen.add(s);
  }

  const tmp = `${OUT}.tmp`;
  await writeFile(tmp, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  await rename(tmp, OUT);
  console.log(`[import-ideas] wrote ${projects.length} ideas (dropped ${dropped}) → ${OUT}`);
}

main().catch((err) => {
  console.error("[import-ideas] failed:", err.message);
  process.exit(1);
});
