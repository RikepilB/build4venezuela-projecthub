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
