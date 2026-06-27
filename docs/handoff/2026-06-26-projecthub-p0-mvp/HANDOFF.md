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

## Continued — feature expansion + live Vercel deploy (2026-06-26, later)
- **Live:** https://projecthub-beta-blond.vercel.app (Vercel prod, public, EN+ES) via `vercel deploy --prod` (CLI authed as rikepilb; deploys local source, no git push).
- Schema +optional fields: `complexity`, `priority`, `use_case`, `stars`, `progress`, `votes`; status enum now `planning→wip→testing→mvp→live`.
- **Votes** (Reddit-style ▲): `data/votes.json` map merged in `loadProjects`; `bumpVote` + `repository.vote` + `src/actions/vote-project.ts` + `VoteButton` (useSyncExternalStore guard). Sort ranks votes→priority→stars→status.
- **Radar**: `RadarStats` strip + `BoardCallout` (single top message+link, replaces per-card publish CTA).
- **Card redesign**: `ProjectThumb` (token-gradient + category glyph), vote rail, links = Page · Repo · View details; `ExternalLink` (↗ + accent + underline).
- **Builder self-signup**: `BuilderInputSchema`, `builderRepository.create`, `appendBuilder`, `src/actions/submit-builder*.ts`, `AddBuilderForm` on /builders.
- **Live sheet sync**: `src/lib/sheet/builders-csv.ts` (`fetchRemoteBuilders`, ISR); `BUILDERS_SOURCE=remote` OR auto on Vercel (so gitignored PII file isn't deployed).
- **Submit form**: quick-add stack chips (max 10) + priority/complexity/use_case/progress fields.
- **Data refreshed**: ideas→14 (now emit priority/complexity/use_case), builders→22 (live sheet), github→40 (now with `stars`+priority+complexity). New hand-seed projects: build4venezuelaRAG, Mission VE, Reencuentros Terremotos VE, Búsqueda colaborativa.
- `npm run build` clean both times; redeployed; verified board/locales HTTP 200 + new content live.

## In progress / next (this continuation)
- **Optimization audit workflow** running: `wf_3bd8588a-4a4` (perf/caching-redis/scraper-api/testing → ranked plan). Implement its output next.
- **Redis (Upstash)** for persistent votes/submissions — Vercel FS is read-only so votes don't persist yet (writes fail-soft, logged). Needs user creds `UPSTASH_REDIS_REST_URL`/`_TOKEN`.
- Test suite (vitest + Playwright smoke); lazy-load/loading.tsx; dedupe board double `list()` read.
- Repo hygiene: untrack harness files + one commit + push (confirm before pushing to public `main`).

## Continued — optimization pass + Ecosystem split (2026-06-26, later)
- **Optimization audit (`wf_3bd8588a-4a4`) implemented:** `React.cache()` on `loadProjects`/
  `loadBuilders`; board single ranked read + in-memory `applyFilter` (exported). Redis votes behind
  the seam (`lib/redis/client.ts` Upstash REST fail-soft, `lib/votes/votes-store.ts` + `votes-json.ts`);
  `projects.repo.vote()` + vote overlay route through it; JSON fallback locally, durable on Vercel with
  `UPSTASH_REDIS_REST_URL`/`_TOKEN`. `loading.tsx` per segment + `ui/Skeleton`. `sheet/resilient-fetch.ts`
  (429/Retry-After backoff) wired into `builders-csv`. GitHub discovery `sort=stars` + queries + MAX 100.
  `AddBuilderForm` lazy-loaded. `.env.example` documents Upstash + Vercel builders caveat. Fonts kept
  (all weights used). mcpPlan = no app-level MCP.
- **Tests:** vitest **57/57** — unit (schemas/text/slug/rank/progress/builders-csv/votes-store) +
  integration (projects-repo applyFilter/list/create/vote, submit-project, submit-builder, vote-project).
- **Ecosystem page** (`/ecosystem`): `!repo_url && demo_url` (4 live sites incl. missing-persons
  link-out) moved off the board; `SiteThumb` (favicon+glyph), `EcosystemCard`, nav + i18n + loading.
  Board = 43 repos; 18 repo-less ideas stay on board.
- **Builders refreshed → 29** from live sheet (`npm run data:builders`).
- **Verified:** `tsc` clean, `npm run build` clean (15 routes), 57 tests green.
- **Parallel session** building team-membership (`join-project`, `membershipRepository`, `ProjectTeam`/
  `JoinProjectForm`, `memberships.json`); I added the `detail.*` team i18n keys to unblock the build.
  Deploy HELD until that lands + the tree is stable, then one clean `vercel deploy --prod`.

## Files in this folder
- `HANDOFF.md` — this digest
- `transcript.md` — full `/export` (pending; user must run it)
