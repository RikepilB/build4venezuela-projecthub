# Build4Venezuela · ProjectHub

**Search before you build.** A project-discovery hub for the Build4Venezuela hackathon
(post-earthquake relief). Search your idea → if it already exists, join the repo and
contribute; if not, publish it with your tech stack and what you need (contributors,
API credits, sponsors). A Builders directory (imported from the hackathon roster) shows
who is available to help.

## Run it

```powershell
npm install
npm run dev            # http://localhost:3000  → redirects to /en
```

Bilingual: `/en` and `/es`. Build for production with `npm run build`.

## Data sources

Local-first: all data lives in `data/*.json` behind a typed repository seam
(`src/lib/repository`). No database required for the P0 MVP.

| File | Source | Refresh |
|------|--------|---------|
| `data/projects.seed.json` | Hand-seeded known relief initiatives + internal projects | edit by hand |
| `data/builders.json` | Hackathon participants Google Sheet | `npm run data:builders` |
| `data/external-projects.seed.json` | GitHub repo discovery | `$env:GITHUB_TOKEN = (gh auth token); npm run data:github` |

See [`scripts/README.md`](scripts/README.md). Submissions via the form append to
`projects.seed.json` (works in `next dev`; a read-only host like Vercel is the trigger to
move to Supabase — see Phases).

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
See `.claude/rules/common/coding-rules.md`.
