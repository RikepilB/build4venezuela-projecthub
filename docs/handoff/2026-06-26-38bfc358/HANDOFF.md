# Session — 2026-06-26 — test · deploy · post

## Goal
Fully test the current ProjectHub build locally, deploy to Vercel prod, and post the
work to the GitHub repo. (Continuation of the optimization + Ecosystem-split session.)

## What was done (concrete one-liners)
- Verified local: `npx tsc --noEmit` clean, `vitest` **57/57** (11 files), `npm run build` clean (15 routes incl `/en/ecosystem` + `/es/ecosystem` SSG).
- Runtime smoke (prod server on :3100): 11 routes all HTTP 200; confirmed ecosystem split — 4 named live sites on `/ecosystem`, **0 leak to the board**.
- Data partition confirmed: 67 projects → 6 ecosystem (no repo + demo_url, off board) / 43 repo on board / 18 repo-less ideas on board; 29 builders.
- Deployed prod: `vercel deploy --prod` → `dpl_GLbgxSvCShmVunFkkEUM8zXhbKrA` READY, aliased https://projecthub-beta-blond.vercel.app; re-verified live routes 200 + split holds.
- Posted to GitHub: branch `test/vitest-suite-and-env-docs` → PR **#8** → squash-merged to `main` (`2d50653`), CI green (build 35s · Vercel · preview), branch deleted, local main synced.
- Pre-push secret/PII audit: `data/builders.json` (PII), `votes.json`, `memberships.json`, `.env.local`, `.mcp.json` all gitignored + excluded; `.env.example` placeholders only; stray `nul` + auto-snapshots not staged.

## Files changed
- Committed in PR #8: `.env.example`, `tests/fixtures/projects.ts`, `tests/integration/{projects-repo,submit-builder,submit-project,vote-project}.test.ts`, `tests/unit/{builders-csv,schemas,text,votes-store}.test.ts`.
- Handoff docs (this file + father `## Current state`).

## Failed attempts
- None. (Env reported "not a git repo" but `.git` existed; verified remote = `RikepilB/build4venezuela-projecthub`.)

## Next steps
- **Provision Upstash** for durable votes: set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel settings (code already routes through the Redis-or-JSON seam; JSON fallback loses votes per deploy).
- Optional: re-run `npm run data:github` (script updated to `sort=stars`/MAX 100; needs `GITHUB_TOKEN` + network).
- Repo hygiene: handoff session notes (snapshots, modified father) remain local/uncommitted by design.

## Files in this folder
- `HANDOFF.md` — this digest
- `snapshot-201348.md` — PreCompact auto-snapshot

---

## Continuation — 2026-06-27 — repo-link feature + API/perf design

(Same session folder `38bfc358`, continued across compactions well past the PR #8 work above.)

### What was done
- **PR #14 (`88e5a49`)** merged + live: shared client `FilterForm`, landing `force-dynamic` stats sync,
  `nul`/Turbopack lint-hook guard. (Co-authored with a parallel session; reviewed + shipped here.)
- **PR #15 (`d5d7361`)** merged + live: header GitHub icon + footer "Contribute" link → public repo.
  `PROJECTHUB_REPO_URL` in `src/lib/links.ts`; tokens-only inline Octocat SVG matching the lang-switcher
  button; EN `nav.repo`/`footer.contribute` + ES parity (compiler-enforced). tsc/eslint clean, vitest **84/84**,
  `next build` 17 routes clean; CodeRabbit pass; verified live EN+ES.
- **API + perf brainstorm (design only, no code):** mapped current architecture — no API routes; Server
  Component → repository → `data/*.json` (~114KB); only `/[locale]` is `force-dynamic`; board/builders render
  dynamic per-request with 2 Redis round-trips each. User decided: read-only public API + instant-static + live
  overlay. Recommended **Approach A** — votes/stats → `/api/v1` client overlay makes pages static + Redis-free,
  same endpoints serve as the public contract. Pending user approval before design doc → spec → writing-plans.

### Files changed (this continuation)
- PR #15: `src/lib/links.ts`, `src/components/layout/{Header,Footer}.tsx`, `src/lib/i18n/{en,es}.ts`.
- PR #14: `.claude/settings.json`, `.gitignore`, new `src/components/ui/FilterForm.tsx`,
  `src/components/board/FilterBar.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/builders/page.tsx`.
- API/perf work: none yet (brainstorm stage).

### Next steps
- Await Approach-A approval → write `docs/superpowers/specs/2026-06-27-public-api-and-instant-pages-design.md`
  → spec self-review → writing-plans skill.
- Still open (user): provision `UPSTASH_REDIS_REST_URL` + `_TOKEN` in Vercel for durable votes/memberships/self-adds.
