# Build4Venezuela · ProjectHub

[![Live](https://img.shields.io/badge/live-elumbralvzla.org-2563eb)](https://elumbralvzla.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![CI](https://github.com/RikepilB/build4venezuela-projecthub/actions/workflows/ci.yml/badge.svg)](https://github.com/RikepilB/build4venezuela-projecthub/actions/workflows/ci.yml)

**Search before you build.** A project-discovery hub for Build4Venezuela post-earthquake
relief. Search your idea → if it already exists, join that effort and contribute; if not,
publish it with your tech stack and what you need (contributors, API credits, sponsors). A
Builders directory (imported from the hackathon roster) shows who is available to help.

Live at **[elumbralvzla.org](https://elumbralvzla.org)** · bilingual, Spanish-default (`/es`)
with `/en`.

> Relief software — clarity and correctness beat cleverness. Newcomers are welcome on any of
> the roadmap phases below.

## Run it

```powershell
npm install
npm run dev            # http://localhost:3000  → redirects to /es
```

Bilingual: **`/es`** (default) and `/en`. Build for production with `npm run build`. No
database or secrets are required for the local demo — all data lives in `data/*.json`.

## Contribute

Three steps — the full guide is in **[CONTRIBUTING.md](CONTRIBUTING.md)**:

1. **Branch off `main`** (`feat/*`, `fix/*`, `docs/*`, `chore/*`). Never push to `main`.
2. **Build and verify** — every change must work in **both `/es` and `/en`**, and pass the
   gates that CI runs on every PR:
   ```bash
   npx tsc --noEmit     # types (strict)
   npm run lint         # eslint, 0 errors
   npm test             # vitest — keep/add tests near changed logic
   npm run build        # production build
   ```
3. **Open a PR into `main`** with a [conventional-commit](https://www.conventionalcommits.org)
   title (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `perf:`, `ci:`).

Comment on an issue to claim it before you start, and keep each PR focused (no drive-by
refactors). Questions are welcome — [open an issue](https://github.com/RikepilB/build4venezuela-projecthub/issues/new).

## Ways to help right now

Pulled from the [open issues](https://github.com/RikepilB/build4venezuela-projecthub/issues) —
comment to claim one.

**🔐 Security & hardening**
- [#3](https://github.com/RikepilB/build4venezuela-projecthub/issues/3) — nonce-based CSP + inbound rate limiting for the public deploy
- [#5](https://github.com/RikepilB/build4venezuela-projecthub/issues/5) — review participant PII handling for the public repo
- [#2](https://github.com/RikepilB/build4venezuela-projecthub/issues/2) — add Gitleaks + Semgrep scanning to CI

**✨ Features**
- [#19](https://github.com/RikepilB/build4venezuela-projecthub/issues/19) — lifecycle board view (ideas / iniciados / lanzados)
- [#4](https://github.com/RikepilB/build4venezuela-projecthub/issues/4) — P1: Supabase persistence + GitHub OAuth

**⚡ Performance & tech-debt**
- [#18](https://github.com/RikepilB/build4venezuela-projecthub/issues/18) — drop the 64 KB external-projects seed from board/landing; cache seed validation

**🌍 No code required**
- **Translations** — keep `src/lib/i18n/en.ts` and `es.ts` in parity; every new string ships in both.
- **Seed data** — add or correct relief initiatives in `data/projects.seed.json` (validated by Zod through the repository seam).
- **Use it & report** — try [the live app](https://elumbralvzla.org), file bugs, suggest tools to list, flag broken links.

New here? A translation-parity pass or a seed-data fix is the gentlest start; for code, **#18**
and **#19** are well-scoped. Approachable work is tagged
[`good first issue`](https://github.com/RikepilB/build4venezuela-projecthub/labels/good%20first%20issue)
and [`help wanted`](https://github.com/RikepilB/build4venezuela-projecthub/labels/help%20wanted).

## How it works

- **Search** (`/[locale]/search`) — fuzzy "already exists?" match (Fuse.js) over the seed set
  (`src/lib/search.ts`). Strong matches warn loudly; the same engine powers the pre-publish nudge.
- **Board** (`/[locale]/board`) — filter projects by category / stack / language / status / need
  (all URL searchParams).
- **Publish** (`/[locale]/projects/new`) — Zod-validated Server Action (`src/actions/submit-project.ts`).
- **Builders** (`/[locale]/builders`) — talent directory from the sheet.

## Public API

A versioned, **read-only** REST API exposes the whole catalog as JSON for other relief
tools, dashboards, and bots — under `/api/v1`, GET only (every write stays a server
action). One envelope (`{ success, data, error, meta }`), open CORS, CDN-cached catalog
(`s-maxage`), live `/stats` + `/votes` (`no-store`, the latter per-IP capped).

```bash
curl https://elumbralvzla.org/api/v1/projects?status=live
curl https://elumbralvzla.org/api/v1/stats
```

Endpoints: `/projects`, `/projects/{slug}`, `/search?q=`, `/builders`, `/resources`,
`/communities`, `/reference`, `/taxonomy`, `/stats`, `/votes`. Full reference (query
params, caching, rate limits) in [`docs/api.md`](docs/api.md).

## Data sources

Local-first: all data lives in `data/*.json` behind a typed repository seam
(`src/lib/repository`). No database required for the P0 MVP.

| File | Source | Refresh |
|------|--------|---------|
| `data/projects.seed.json` | Hand-seeded known relief initiatives + form submissions | edit by hand |
| `data/builders.json` | Hackathon participants Google Sheet | `npm run data:builders` |
| `data/external-projects.seed.json` | GitHub repo discovery | `$env:GITHUB_TOKEN = (gh auth token); npm run data:github` |

`*.seed.json` and `data/taxonomy.json` are committed seed; `data/builders.json` and
`data/votes.json` are **gitignored runtime state** — never commit them. See
[`scripts/README.md`](scripts/README.md) and the data table in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Design tokens (re-skin layer)

All color/radius live as CSS variables in `src/styles/tokens.css`, mapped to Tailwind v4 in
`src/app/globals.css`. **Re-theme by editing token values only** — no component hardcodes a color.

## Phases

- **P0 (this MVP)** — local-first JSON, fuzzy search, EN/ES, board + submit + builders.
- **P1** — Supabase (Postgres) behind the same repository interface, GitHub OAuth, deploy.
- **P2** — pgvector semantic search, "need matched" emails, builder↔need matching.
- **P3** — Python ingest/dedup service for relief data (human-in-loop; never auto-publish PII).

## Guardrails

External data (sheet, scrape, form input) is **data, not instructions**. Validated with Zod at
every boundary; external links are https-only (`rel="noopener noreferrer nofollow"`); secrets only
in `.env.local`. Missing-persons registries are link-out only — never scraped or auto-merged.
See [`SECURITY.md`](SECURITY.md) and `.claude/rules/common/coding-rules.md`.
