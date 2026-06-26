# Session — 2026-06-26 — projecthub-p0-mvp

## Goal
Build the Build4Venezuela "ProjectHub" P0 MVP: search-before-you-build hub. Search an idea →
join existing repo or publish your own (stack + needs). Wire two data sources (web scrape +
hackathon Google Sheet). Then apply ScoutLane's architecture/security rules where relevant.

## What was done (concrete one-liners)
- Scaffolded Next.js 16 app (`create-next-app`, folder `projecthub` — npm forbids caps) + AI-native skeleton via `/project-scaffold`.
- Data layer: Zod single-source `src/lib/schemas.ts`; JSON repository seam `src/lib/repository/` (one-file swap to Supabase later); seed `data/projects.seed.json`.
- MVP pages (EN/ES, `[locale]` is root layout + `src/proxy.ts` redirect): home/search/board/projects-new/[slug]/builders.
- Fuzzy "already exists?" search `src/lib/search.ts` (Fuse.js), reused as pre-publish nudge.
- Submit Server Action `src/actions/submit-project.ts` (Zod-validated → repo.create → redirect); fixed "use server can only export async" by moving state to `src/actions/submit-types.ts`.
- Tokens-only re-skin layer `src/styles/tokens.css` → Tailwind v4 `@theme` in `globals.css`.
- Importer `scripts/import-builders.mjs` → `data/builders.json` (**17 builders** from sheet default tab; handles banner rows + fuzzy headers).
- Importer `scripts/discover-github-repos.mjs` → `data/external-projects.seed.json` (**40 real VE-relief repos**; 403/429 backoff).
- Importer `scripts/import-ideas.mjs` (sheet tab `gid=1187241395`) → `data/ideas.seed.json` (**13 candidate projects**); merged into `loadProjects()`. Board total = **60**.
- Security pass (ScoutLane rules): headers in `next.config.ts` (CSP/HSTS/nosniff/frame DENY), `SECURITY.md` (evidence/risk/gaps), proxy "not an auth boundary" note; fixed CSP blocking React dev `eval()` → `unsafe-eval` dev-only.
- Verified: `npm run build` clean (13 routes); browser E2E submit → wrote seed + redirected to detail; XSS query escaped; headers live; console 0 issues.

## Files changed
- `src/lib/{schemas,types,search,text,slug,data-files,taxonomy}.ts`, `src/lib/repository/*`, `src/lib/i18n/*`
- `src/app/[locale]/**`, `src/proxy.ts`, `src/actions/*`, `src/components/**`, `src/styles/tokens.css`, `src/app/globals.css`
- `scripts/import-builders.mjs`, `scripts/discover-github-repos.mjs`, `scripts/import-ideas.mjs`, `scripts/README.md`
- `data/{projects.seed,external-projects.seed,ideas.seed,builders,taxonomy}.json`
- `next.config.ts`, `package.json`, `README.md`, `CLAUDE.md`, `.env.example`, `SECURITY.md`

## Failed attempts
- `create-next-app "ProjectHub"` → npm rejects capitals; used `projecthub`.
- First submit → 500 "use server file can only export async functions" (exported `initialSubmitState` object); fixed via `submit-types.ts`.
- Builders import first run → 0 rows (header on row 3 under banner); fixed with header-row detection.
- CSP first version blocked React dev `eval()`; fixed with dev-only `unsafe-eval`.
- Git Bash `find`/`cat` crashed (msys add_item error) on the OneDrive path — used PowerShell + dedicated tools instead.

## Next steps
- Add tests (Vitest for submit action + search + importers; Playwright E2E) — biggest gap.
- Wire CI: lint + typecheck + Gitleaks + Semgrep (`.github/workflows/ci.yml`).
- P1: Supabase impl behind the repository interface + GitHub OAuth + Vercel deploy (trigger = shared URL); then nonce CSP + inbound rate limit.

## Files in this folder
- `HANDOFF.md` — this digest
- `transcript.md` — full `/export` (pending; user must run it)
