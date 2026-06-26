// Import the hackathon "IDEAS PARA EL HACKATHON" table (a specific sheet tab)
// into data/ideas.seed.json so the team's candidate projects seed the board.
// Run: node scripts/import-ideas.mjs
// Columns: Capa | Idea / Proyecto | Problema que resuelve | Stack sugerido |
//          Responsable ideal | Impacto | Dificultad
import { z } from "zod";
import { writeFile, rename } from "node:fs/promises";
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
});

const norm = (s) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

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
  // Drop phone numbers / handles → keep a name. Fallback "open".
  const name = String(raw)
    .replace(/\+?\d[\d\s().-]{5,}/g, "")
    .replace(/[@#].*$/g, "")
    .trim();
  return name.length >= 2 ? name.slice(0, 80) : "open";
}

const stripEmoji = (s) =>
  String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu, "").trim();

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
  for (const row of data) {
    const idea = pick(row, ["ideaproyecto", "idea"]);
    if (!idea || idea.length < 2) {
      dropped++;
      continue;
    }
    const capa = stripEmoji(pick(row, ["capa"]));
    const problema = pick(row, ["problemaqueresuelve", "problema"]);
    const impacto = stripEmoji(pick(row, ["impacto"]));
    const dificultad = stripEmoji(pick(row, ["dificultad"]));
    const stackText = pick(row, ["stacksugerido", "stack"]);

    let summary = problema.length >= 10 ? problema : `${idea} — idea para el hackathon solidario.`;
    const meta = [capa && `Capa: ${capa}`, impacto && `Impacto: ${impacto}`, dificultad && `Dificultad: ${dificultad}`]
      .filter(Boolean)
      .join(" · ");
    if (meta && summary.length + meta.length + 4 <= 600) summary = `${summary}  [${meta}]`;

    const candidate = {
      id: `idea-${slugify(idea)}`,
      slug: `idea-${slugify(idea)}`,
      name: idea.slice(0, 120),
      summary: summary.slice(0, 600),
      stack: extractTech(stackText),
      languages: ["es"],
      categories: [deriveCategory(capa, idea)],
      status: "planning",
      needs: { contributors: [], api_credits: [], sponsors: [] },
      owner: cleanOwner(pick(row, ["responsableideal", "responsable"])),
      source: "internal",
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
