# Architecture

> System patterns, module boundaries, and trade-offs. Authoritative reference for
> anyone forking or contributing. See `api.md` for the action/repository surface and
> `repo-map.md` for the directory index.

## Overview

El Umbral (Build4Venezuela's "search before you build" hub) is a **Next.js 16 App
Router** app. Server Components are the default; pages read data directly through the
repository layer and render on the server. The only client components are the small
interactive islands (search box, forms, vote button, mobile nav).

- **Language / types:** TypeScript (strict). **Zod is the single source of truth** for
  every data shape (`src/lib/schemas.ts`); the TypeScript types in `src/lib/types.ts`
  are `z.infer`'d from those schemas, never hand-written.
- **Styling:** Tailwind v4. All color/shape lives in **design tokens**
  (`src/styles/tokens.css`, mapped to Tailwind utilities in `src/app/globals.css`).
  Components never hardcode a color, so the whole app re-themes from one file.
- **i18n:** custom dictionaries (`src/lib/i18n/{en,es}.ts`). The `[locale]` route
  segment is the root layout; `Dictionary = typeof en` keeps `es` structurally in sync.
- **Data:** committed seed JSON in `data/` behind a repository seam, with runtime
  state (votes, self-adds, attached repos, memberships) in pluggable stores
  (Redis on Vercel, JSON locally).

## Modules & boundaries

```
src/
  proxy.ts              Locale redirect (Next 16 "proxy", formerly middleware). NOT a
                        security boundary — auth/ownership must live in the data layer.
  app/[locale]/         Routes. Server Components read repositories and render.
  app/api/v1/           Public read-only REST API. Route handlers call the SAME
                        repository seam and wrap results in the shared envelope. GET only.
  components/           Presentational + small client islands, grouped by feature
                        (incl. votes/LiveVotes.tsx — the client live-vote overlay).
  actions/              "use server" mutations (the write side). Zod-validate input,
                        call a repository/store, revalidatePath.
  lib/
    repository/         THE SEAM. Interface + JSON impl per entity. The one place P1
                        swaps to Supabase (drop in *.repo.ts with the same interface,
                        switch in index.ts via DATA_BACKEND).
    api/                Public-API plumbing: envelope + CORS/cache headers (response.ts),
                        boundary query validation (query.ts). Pages/actions don't use it.
    ratelimit/          Per-IP fixed-window limiter over the Redis seam; FAILS OPEN.
    data-files.ts       Server-only JSON read/write (seed files), behind the repository.
    schemas.ts          Zod schemas — single source of truth for every shape.
    types.ts            z.infer'd types.
    {votes,builders,memberships,repos}/  Runtime stores: Redis-or-JSON fallback.
    redis/client.ts     Upstash REST client (no-op when env unset → JSON fallback).
    i18n/               Dictionaries, locale config, locale-aware href helpers.
    match/              Pure scoring + token matching for builder/sponsor fit (P0 deterministic, P2 AI swap seam).
    search.ts           Fuzzy search (fuse.js) over projects.
    github/, sheet/     External fetchers (repo stats; Google-Sheet roster CSV).
  styles/tokens.css     The only re-skin layer.
data/                   Committed seed (*.seed.json, taxonomy.json) + gitignored runtime.
scripts/                Node importers (sheet → seed JSON). Run manually / in CI.
```

**Dependency rule:** routes, actions, **and the `/api/v1` route handlers** depend on the
**repository interface**, never on `data-files.ts` or a store directly for reads. The
repository is the only seam that knows whether data comes from JSON or (P1) Supabase — so
the public API gets the P1 Supabase swap for free, with no handler changes.

## Data flow

**Read (the common path):**

1. Request hits `proxy.ts` → non-locale paths redirect to `/{defaultLocale}`.
2. `[locale]/layout.tsx` (root layout) resolves the dictionary and renders chrome.
3. A Server Component awaits a repository method, e.g. `projectRepository.list()`.
4. The JSON repository calls `loadProjects()` (`data-files.ts`), which reads the seed
   files, **validates each record individually** with Zod (one bad row can't blank the
   board), then **overlays runtime state** — votes and attached-repo overrides — keyed
   by slug so they apply across all sources without rewriting seed.
5. `loadProjects` is wrapped in `React.cache`, so every repository call in one render
   shares a single set of file reads. Votes are read fresh each request so a new upvote
   is never masked by a stale cache.
6. Results are ranked (`rankProjects`: votes → priority → stars → lifecycle) and rendered.

**Write (server actions):**

1. A client form posts to a `"use server"` action in `src/actions/`.
2. The action runs a **honeypot** check, then **validates at the boundary** with the
   matching `*InputSchema` (Zod). External input is data, never trusted.
3. On success it calls a repository/store method (which re-validates — defense in depth),
   then `revalidatePath(...)` for the affected routes (and `redirect` for submit).
4. Persistence is **best-effort and crash-safe**: file writes use temp-then-rename; a
   read-only FS (deployed serverless without Redis) throws and the action returns a
   typed `{ ok: false, error }` the UI surfaces — it never crashes the request.

**Public API (`/api/v1`, read):**

1. A `GET` hits a route handler in `app/api/v1/`. Query params are validated at the
   boundary (`lib/api/query.ts`) — unknown enum values are dropped, never cast.
2. The handler awaits the **same repository method** a page would (`projectRepository.list`,
   etc.), then wraps the result in the shared envelope (`lib/api/response.ts`) with CORS
   and a `Cache-Control` header — `s-maxage` for the catalog, `no-store` for `/stats`+`/votes`.
3. The CDN edge cache serves the catalog from the header, shielding the origin. Only the
   un-cached `/votes` carries a per-IP cap (`lib/ratelimit/limiter.ts`, fail-open).
4. **Live vote overlay:** because catalog HTML is cacheable, the board's cards fetch the
   `/votes` map client-side and overlay it (server-authoritative, never an optimistic `+1`).

## Trade-offs & constraints

- **Public API is read-only.** `/api/v1` is GET-only; every mutation stays a server action,
  so there is no public write surface. Open CORS (`*`) is safe because no response carries
  per-user state or credentials. The CDN edge cache (not a per-request rate limit) is the
  primary shield; only the un-cached `/votes` is per-IP capped, and that limiter fails open.
- **JSON now, Supabase in P1.** The repository interface is the contract; `DATA_BACKEND`
  selects the impl (`json` default). Keeping reads behind the seam is why no component
  imports `data-files.ts`.
- **Vercel has a read-only filesystem.** Anything that must persist at runtime (votes,
  self-registered builders, attached repos, memberships) goes through a store that uses
  **Upstash Redis when configured, JSON file locally**. Seed data stays in git; runtime
  state never does.
- **No PII auto-publish.** Missing-persons / people-search data is link-out only; the
  importers never scrape or auto-merge those sites. Roster PII (names, LinkedIn) lives in
  gitignored `data/builders*.json`, regenerated locally.
- **Votes are server-authoritative.** The client marks "voted" only after a confirmed
  write; there is no optimistic `+1` (it would double-count after `revalidatePath`).
- **`proxy.ts` is not a security boundary** (cf. CVE-2025-29927) — it only rewrites
  locale prefixes. Any future auth/ownership checks belong in actions + repository.
- **Styling = tokens only.** No hardcoded colors in components; `tokens.css` is the
  single re-skin layer (current theme: "El Umbral" — dusk surfaces, one amber accent).
- **Hackathon-open, no auth.** Join / submit / attach-repo are intentionally
  unauthenticated; honeypot + Zod + slug validation are the only gates by design.
