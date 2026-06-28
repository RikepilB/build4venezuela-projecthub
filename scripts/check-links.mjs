// Liveness check for every demo_url / repo_url across the seed data.
// Run: node scripts/check-links.mjs   (add --json for machine output)
//
// Catches the rot the 2026-06-27 board audit found: dead deploys (404) and
// deleted repos that otherwise sit on the board pointing at nothing. Wire into a
// weekly cron; a non-zero exit means at least one link is dead and needs review.
//
// Note: status 0 = network error (DNS fail / connection reset). Some live sites
// behind a WAF reset non-browser TLS, so 0 is a "verify in a browser" signal, not
// a definitive dead — only 4xx/5xx are treated as hard failures for the exit code.
import { readFile } from "node:fs/promises";
import path from "node:path";

const SEEDS = ["projects.seed.json", "ideas.seed.json", "external-projects.seed.json"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const POOL = 10;
const TIMEOUT_MS = 15000;
const asJson = process.argv.includes("--json");

async function loadUrls() {
  const urls = new Map(); // url -> [slugs that use it]
  for (const file of SEEDS) {
    const raw = await readFile(path.join(process.cwd(), "data", file), "utf8");
    for (const p of JSON.parse(raw)) {
      for (const u of [p.demo_url, p.repo_url]) {
        if (!u) continue;
        if (!urls.has(u)) urls.set(u, []);
        urls.get(u).push(p.slug ?? p.id);
      }
    }
  }
  return urls;
}

async function check(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    clearTimeout(t);
    return { url, status: res.status, ok: res.ok, finalUrl: res.url };
  } catch (e) {
    clearTimeout(t);
    return { url, status: 0, ok: false, err: String(e.cause?.code || e.name || e.message).slice(0, 60) };
  }
}

async function main() {
  const urlMap = await loadUrls();
  const list = [...urlMap.keys()];
  const results = [];
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const r = await check(list[i++]);
      r.slugs = urlMap.get(r.url);
      results.push(r);
    }
  }
  await Promise.all(Array.from({ length: POOL }, worker));

  const dead = results.filter((r) => r.status >= 400); // hard failures only
  const networkErr = results.filter((r) => r.status === 0); // verify-in-browser

  if (asJson) {
    console.log(JSON.stringify({ checked: results.length, dead, networkErr }, null, 2));
  } else {
    console.log(`Checked ${results.length} URLs · ${dead.length} dead (4xx/5xx) · ${networkErr.length} network-error`);
    for (const r of dead) console.log(`  DEAD  ${r.status}  ${r.url}  [${r.slugs.join(", ")}]`);
    for (const r of networkErr) console.log(`  ERR   ${r.err}  ${r.url}  [${r.slugs.join(", ")}]  (verify in browser)`);
  }
  process.exit(dead.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[check-links] failed:", err.message);
  process.exit(2);
});
