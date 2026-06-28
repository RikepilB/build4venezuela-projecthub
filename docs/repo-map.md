# Repo map (worktree index)

> What every tracked directory and file is, so you can fork, run, and find your way
> around fast. Pair with `architecture.md` (how it fits) and `api.md` (the surfaces).

## Fork & run

```bash
git clone <your-fork> && cd projecthub
npm install
cp .env.example .env.local      # optional; the app runs with zero config on seed data
npm run dev                     # http://localhost:3000  → redirects to /en
```

Other scripts: `npm run build` · `npm start` · `npm run lint` · `npm test` (vitest)
· `npm run data:*` (refresh seed/roster from sources, needs network + optional `GITHUB_TOKEN`).

Runs with no environment at all (seed JSON, JSON-file stores). Redis + tokens are only
needed for durable runtime state on a serverless deploy.

## Top level

| Path | What it is |
|------|------------|
| `src/` | All application code (see below) |
| `data/` | Committed seed JSON + `taxonomy.json` (runtime files are gitignored) |
| `scripts/` | Node importers that build seed/roster from sheets + GitHub |
| `tests/` | Vitest unit/integration suites (+ Playwright E2E when present) |
| `docs/` | This index, `architecture.md`, `api.md`, `decisions.md` |
| `public/` | Static assets served as-is |
| `README.md` · `CONTRIBUTING.md` · `SECURITY.md` · `LICENSE` | Project + OSS docs (MIT) |
| `AGENTS.md` | Agent/contributor operating notes (`.claude/` agent config is local-only, gitignored) |
| `.env.example` | Documented env vars (copy to `.env.local`) |
| `next.config.ts` · `tsconfig.json` · `postcss.config.mjs` · `eslint.config.mjs` · `vitest.config.ts` | Tooling config |

## `src/`

| Path | What it is |
|------|------------|
| `proxy.ts` | Next 16 locale redirect (not a security boundary) |
| `app/[locale]/` | All routes; `layout.tsx` is the root layout (renders `<html>`) |
| `app/[locale]/{board,builders,communities,ecosystem,reference,resources,search}/` | Page per surface (`page.tsx`, some with `loading.tsx`) |
| `app/[locale]/projects/[slug]/` · `projects/new/` | Project detail + publish form |
| `app/api/v1/` | Public read-only REST API (route handlers per resource → repository, GET only) |
| `app/globals.css` | Tailwind import + token→utility mapping |
| `app/icon.svg` · `app/favicon.ico` | El Umbral doorway mark + fallback favicon |
| `actions/` | `"use server"` mutations + their `*-types.ts` state types |
| `components/board/` | Project card, filters, vote button, radar stats, need badges |
| `components/builders/` · `project/` · `communities/` · `ecosystem/` · `reference/` · `resources/` | Feature-grouped presentational + form components |
| `components/layout/` | `Header`, `MobileNav`, `Footer`, `SkipLink` |
| `components/search/` | `SearchBox`, `ExistingMatches` |
| `components/votes/` | `LiveVotes` — client live-vote overlay (fetches `/api/v1/votes`) |
| `components/ui/` | Shared primitives: badges, tags, progress bar, skeleton, external link, empty state |
| `lib/repository/` | The data seam: interface + JSON impl per entity, `index.ts` selector |
| `lib/api/` | Public-API envelope + CORS/cache headers (`response.ts`) + boundary query validation (`query.ts`) |
| `lib/ratelimit/` | Per-IP fixed-window limiter over the Redis seam (fails open) |
| `lib/data-files.ts` | Server-only JSON read/write behind the repository |
| `lib/schemas.ts` | **Zod — single source of truth** for every shape |
| `lib/types.ts` | `z.infer`'d types |
| `lib/taxonomy.ts` · `data/taxonomy.json` | Categories/stacks/statuses vocabulary |
| `lib/{votes,builders,memberships,repos}/` | Runtime stores (Redis-or-JSON fallback) |
| `lib/redis/client.ts` | Upstash REST client (no-op when unset) |
| `lib/i18n/` | `en.ts`/`es.ts` dictionaries, `config.ts`, `href.ts` |
| `lib/search.ts` | fuse.js fuzzy search over projects |
| `lib/github/` · `lib/sheet/` | External fetchers: repo stats; roster CSV (resilient fetch) |
| `lib/landing/stats.ts` · `lib/ecosystem.ts` · `lib/progress.ts` · `lib/slug.ts` · `lib/text.ts` · `lib/links.ts` | Derived stats, helpers, URL constants |
| `styles/tokens.css` | **The only re-skin layer** (colors, radius) |

## Not in the repo (runtime / local only)

Generated or machine-local, gitignored on purpose: `data/builders*.json`,
`data/votes.json`, `data/repo-overrides.json`, `data/memberships.json` (runtime state /
PII), `.env*` (except `.env.example`), `.next/`, `node_modules/`,
`CLAUDE.local.md`, `.claude/settings.local.json`, `.mcp.json`. Regenerate data with
`npm run data:*`.
