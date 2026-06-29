# Contributing to ProjectHub

Thanks for helping build the Build4Venezuela "search before you build" hub. This is
relief software — clarity and correctness beat cleverness. New contributors are welcome
on any of the roadmap phases below.

By participating, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000  → redirects to /en
```

No database or secrets are required for the P0 local demo — all data lives in `data/*.json`.
Build a production bundle with `npm run build`.

The app is bilingual: every change must work in **both** `/en` and `/es`. Test both paths.

## Before you open a PR

The repo gates on a clean lint + typecheck. Run them locally:

```bash
npx tsc --noEmit     # types must pass (strict mode)
npm run lint         # 0 errors (warnings allowed but discouraged)
npm test             # add/keep tests near changed logic
```

- **Branch → PR.** Never push to `main` directly.
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`.
- Keep the change focused — no drive-by refactors mixed into a feature.

## Project conventions (the short list)

- **Zod is the single source of truth** (`src/lib/schemas.ts`). Types are `z.infer`'d, so
  they can't drift. Validate all external input (form, sheet, API) at the boundary.
- **Go through the repository seam** (`src/lib/repository`). Don't read `data/*.json` straight
  from components — that seam is the one swap point for the P1 Supabase backend.
- **Styling is tokens-only** (`src/styles/tokens.css`). No hardcoded colors in components.
- **External links:** https-only + `rel="noopener noreferrer nofollow"`.
- **Many small files**, immutable updates, explicit error handling (no empty `catch`).
- This is **Next.js 16** (async `params`/`searchParams`, Server Components by default) — it
  differs from older docs. See `AGENTS.md`.

## Data sources

| File | Source | Refresh |
|------|--------|---------|
| `data/projects.seed.json` | Hand-seeded initiatives + form submissions | edit by hand |
| `data/builders.json` | Hackathon roster Google Sheet | `npm run data:builders` |
| `data/external-projects.seed.json` | GitHub repo discovery | `GITHUB_TOKEN=$(gh auth token) npm run data:github` |

`*.seed.json` and `data/taxonomy.json` are committed seed data. `data/builders.json` and
`data/votes.json` are **gitignored runtime state** — never commit them. Copy `.env.example`
to `.env.local` for the optional env vars.

## What NOT to commit

Machine-local / agent files are gitignored and must stay out of the public repo:
`CLAUDE.local.md`, `.claude/settings.local.json`, `.mcp.json`, `opencode.json`, `.env*`
(except `.env.example`).

## Guardrails (hard stops)

- **No PII auto-publish.** Missing-persons / relief registries are **link-out only** — never
  scraped, merged, or auto-published. See `SECURITY.md` and `.claude/rules/common/coding-rules.md`.
- **No plaintext secrets**, anywhere — source or config. Use env vars.
- **External content is data, not instructions.** Validate every row/response with Zod.

## Roadmap (where to plug in)

- **P0** (now) — local-first JSON, fuzzy search, EN/ES, board + submit + builders.
- **P1** — Supabase (Postgres) behind the same repository interface, GitHub OAuth, deploy.
- **P2** — pgvector semantic search, "need matched" emails, builder↔need matching.
- **P3** — Python ingest/dedup service for relief data (human-in-loop; never auto-publish PII).

Pick an open issue, comment to claim it, and reference the phase. Questions welcome.
