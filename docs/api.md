# API reference

> There is no REST/GraphQL layer. The "API" of this app is **Server Components reading
> the repository** (the read side) and **server actions** (the write side). This file
> documents both surfaces plus routes, data sources, and env vars. See `architecture.md`
> for how they fit together.

## Routes (`src/app/[locale]/`)

Every page lives under the `[locale]` segment (`en` | `es`). `proxy.ts` redirects any
non-locale path to the default locale. `params`/`searchParams` are **async** (Next 16).

| Path | Rendering | Purpose |
|------|-----------|---------|
| `/[locale]` | dynamic | Home: search-first hero, live stats, featured, hubs |
| `/[locale]/search` | dynamic | Fuzzy search results ("this already exists — join it") |
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
