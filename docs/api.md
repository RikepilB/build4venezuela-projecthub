# API reference

> Three surfaces: a **public read-only REST API** (`/api/v1`) for external consumers,
> **Server Components reading the repository** (the in-app read path), and **server
> actions** (the write side). All three go through the same repository seam. This file
> documents each plus routes, data sources, and env vars. See `architecture.md` for how
> they fit together.

## Public REST API (`/api/v1`)

A versioned, read-only HTTP face over the repository seam, for dashboards, bots, and
other relief tools that want the catalog as data. **GET only** — every mutation stays a
server action (vote/submit/join/attach), so there is no public write surface to abuse.

**Envelope.** Every response is the same shape (`src/lib/api/response.ts`, matching
`ApiResponse<T>` in `.claude/rules/typescript/patterns.md`):

```jsonc
{ "success": true,  "data": <payload>, "error": null,        "meta": { "count": 42 } }
{ "success": false, "data": null,      "error": "not_found"  }
```

**CORS.** `Access-Control-Allow-Origin: *` on every response (no cookies/credentials, so
a wildcard is safe — there is no per-user state to leak). `OPTIONS` preflight → `204`.

**Caching.** Catalog endpoints send `Cache-Control: public, s-maxage=300,
stale-while-revalidate=600` — the CDN edge cache absorbs the load and shields the origin.
Live endpoints (`/stats`, `/votes`) send `no-store`.

**Rate limiting.** Only `/votes` is un-cached and origin-hitting, so it carries a
per-IP fixed-window cap (60 req/min) via the Redis seam (`src/lib/ratelimit/limiter.ts`).
It **fails open** when Redis is unconfigured (dev/offline) — the limiter being down never
blocks a read. Over the cap → `429` with `Retry-After`. Catalog routes need no cap (the
edge cache shields them).

| Method | Path | Query | Cache | Returns |
|--------|------|-------|-------|---------|
| GET | `/api/v1` | — | catalog | Discovery index (endpoint list) |
| GET | `/api/v1/projects` | `category`, `stack`, `language`, `status`, `need`, `priority`, `complexity` | catalog | Ranked `Project[]` (votes→priority→stars→lifecycle) |
| GET | `/api/v1/projects/{slug}` | — | catalog | One `Project`, or `404` `not_found` |
| GET | `/api/v1/search` | `q` | catalog | `SearchHit[]` (fuse.js; `<2` chars → `[]`) |
| GET | `/api/v1/builders` | — | catalog | `Builder[]` (roster + self-adds) |
| GET | `/api/v1/resources` | — | catalog | `Resource[]` (verified, link-out) |
| GET | `/api/v1/communities` | — | catalog | `Community[]` (link-out) |
| GET | `/api/v1/reference` | — | catalog | `ReferenceProject[]` (prior art) |
| GET | `/api/v1/sponsors` | — | catalog | `Sponsor[]` (backers, link-out) |
| GET | `/api/v1/taxonomy` | — | catalog | `{categories, statuses, needTypes, complexities, priorities, stacks}` |
| GET | `/api/v1/stats` | — | no-store | Aggregate counts (`projects`, `live`, `totalVotes`, `byStatus`, …) |
| GET | `/api/v1/votes` | — | no-store | Live `{ slug: count }` map (per-IP capped) |

Query params are **validated at the boundary** (`src/lib/api/query.ts`): a bogus enum
(`?status=nope`) is *dropped*, never cast, so it can't throw — exactly the guard the board
page uses, so the API and the UI filter identically. `category`/`stack` are free text (a
non-matching value just yields no results). Error strings: `not_found` (404),
`rate_limited` (429), `internal_error` (500).

**Live vote overlay.** Because catalog HTML can be CDN-cached, the board's cards fetch
`/api/v1/votes` client-side (`src/components/votes/LiveVotes.tsx`) and overlay the current
counts. This is **not optimistic** — the number comes from the server (the same store the
page reads), so it can only replace a stale count with the current one, never double-count.

```bash
curl https://elumbralvzla.org/api/v1/projects?status=live
curl https://elumbralvzla.org/api/v1/stats
```

## Routes (`src/app/[locale]/`)

Every page lives under the `[locale]` segment (`en` | `es`). `proxy.ts` redirects any
non-locale path to the default locale. `params`/`searchParams` are **async** (Next 16).

| Path | Rendering | Purpose |
|------|-----------|---------|
| `/[locale]` | dynamic | Home: search-first hero, live stats, featured, hubs |
| `/[locale]/search` | dynamic | Fuzzy search results ("this already exists — join it") |
| `/[locale]/match` | dynamic | Builder/sponsor matching: find projects that need your skills or offer |
| `/[locale]/board` | dynamic | Filterable project radar |
| `/[locale]/projects/[slug]` | dynamic | Project detail: needs, team, repo/demo, join |
| `/[locale]/projects/new` | dynamic | Publish-a-project form |
| `/[locale]/builders` | dynamic | Talent roster + "add yourself" |
| `/[locale]/ecosystem` | SSG | Live relief tools (link-out) |
| `/[locale]/resources` | SSG | Verified resources directory (link-out) |
| `/[locale]/communities` | SSG | Coordination spaces (link-out) |
| `/[locale]/reference` | SSG | Open-source prior art (link-out) |

## Server actions (`src/actions/`)

All are `"use server"`, use the React `useActionState` signature
`(prevState, formData) => Promise<State>`, run a hidden-field **honeypot** check, and
**validate input with Zod at the boundary**. Return a typed state; never throw to the
client. State types live alongside each action in `*-types.ts`.

| Action | Export | Input (FormData) | Returns | Side effects |
|--------|--------|------------------|---------|--------------|
| `vote-project.ts` | `upvoteProject` | `slug` | `{ ok }` | `projectRepository.vote`; revalidate board + project. Server-authoritative — no client `+1`. |
| `join-project.ts` | `joinProject` | `project_slug`, `name`, `role?` | `{ ok, error?, fieldErrors? }` | `membershipRepository.join`; revalidate project + builders |
| `submit-project.ts` | `submitProject` | `name`, `summary`, `owner`, `repo_url?`, `demo_url?`, `stack`, `languages[]`, `categories[]`, `status`, `priority?`, `complexity?`, `use_case?`, `progress?`, `need_*` | redirects to new project, or `{ ok:false, error, fieldErrors? }` | `projectRepository.create`; revalidate board |
| `submit-builder.ts` | `submitBuilder` | `alias`, `role`, `stack`, `linkedin_url?`, `availability`, `timezone`, `status` | `{ ok, error?, fieldErrors? }` | `builderRepository.create`; revalidate builders |
| `attach-repo.ts` | `attachRepo` | `slug`, `repo_url` | `{ ok, error?, fieldErrors? }` | validates https + `github.com` only, fetches contributor count, `setRepoOverride`; revalidate board + project |

Error codes returned in `state.error`: `spam` (honeypot), `validation`,
`invalid_repo`, `save_failed` (read-only FS / store write failed).

## Repository (`src/lib/repository/`)

The read/write seam. Routes and actions depend on these interfaces, never on
`data-files.ts` directly. Each entity exports an interface, a `jsonXxxRepository` impl,
and a singleton in `index.ts`. P1 swaps impls behind the same interface
(`DATA_BACKEND=supabase`).

```ts
interface ProjectRepository {
  list(filter?: ProjectFilter): Promise<Project[]>;   // ranked: votes→priority→stars→lifecycle
  getBySlug(slug: string): Promise<Project | null>;
  search(query: string): Promise<SearchHit[]>;        // fuse.js
  create(input: ProjectInput): Promise<Project>;      // slugifies, validates, appends
  vote(slug: string): Promise<number>;                // returns new count
}
interface BuilderRepository      { list(): Promise<Builder[]>; create(input: BuilderInput): Promise<Builder>; }
interface MembershipRepository   { join(input: MembershipInput): Promise<Membership>; list(...): Promise<Membership[]>; }
// resources / communities / reference: read-only list() (curated seed, link-out only)
```

Helpers exported from `projects.repo.ts`: `applyFilter` (pure) and `rankProjects` (pure)
so the board derives its filtered view from one already-ranked read.

## Data sources (`data/`)

**Committed seed** (safe to fork): `projects.seed.json`, `ideas.seed.json`,
`external-projects.seed.json`, `resources.seed.json`, `resources.extra.json`
(hand-curated, importer never touches), `communities.seed.json`, `reference.seed.json`,
`taxonomy.json`.

**Gitignored runtime** (regenerated locally; Redis-backed on Vercel): `builders.json`
(imported roster PII), `builders-custom.json` (self-adds), `votes.json`,
`repo-overrides.json`, `memberships.json`.

Importers in `scripts/` populate seed/roster: `import-builders.mjs`,
`import-platforms.mjs`, `import-ideas.mjs`, `discover-github-repos.mjs`
(`npm run data:*`). `GITHUB_TOKEN` is read from env in scripts, never logged.

## Environment variables

| Var | Default | Effect |
|-----|---------|--------|
| `DATA_BACKEND` | `json` | Repository impl selector (`supabase` = P1, not yet implemented) |
| `BUILDERS_SOURCE` | auto | `remote` forces live-sheet roster, `local` forces JSON; on Vercel remote is default |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | unset | Enables Redis-backed runtime stores; unset → JSON-file fallback |
| `GITHUB_TOKEN` | unset | Raises GitHub API rate limit for `scripts/` + contributor counts |
| `VERCEL` | set by Vercel | Switches roster/stores toward remote/Redis |

See `.env.example` for the full list. Secrets live in `.env.local` only, never committed.
