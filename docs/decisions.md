# Decisions (ADR log)

> One entry per significant decision. Newest on top. Append-only.

## Template
```
### <YYYY-MM-DD> — <decision title>
- **Context:** why this came up
- **Decision:** what we chose
- **Alternatives:** what we rejected and why
- **Consequences:** what this commits us to
```

### 2026-06-27 — Public read-only `/api/v1` + live vote overlay (Approach A)
- **Context:** External relief tools / dashboards / bots wanted the catalog as data, but
  the app only exposed Server Components + server actions. We also wanted catalog pages to
  be CDN-cacheable without showing stale vote counts.
- **Decision:** Ship a versioned, **read-only** REST API (`/api/v1`) as a thin HTTP face
  over the existing repository seam: 11 GET endpoints (projects, project, search, builders,
  resources, communities, reference, taxonomy, stats, votes, index), all returning one
  `{success,data,error,meta}` envelope with open CORS. Catalog routes set
  `s-maxage=300, SWR`; `/stats`+`/votes` set `no-store`. Only `/votes` (un-cached) gets a
  per-IP cap via the Redis seam (fail-open). Query params validated at the boundary, reusing
  the board's enum guard. A client **live vote overlay** fetches `/votes` and overlays
  counts on the (cacheable) board — server-authoritative, never an optimistic `+1`.
- **Alternatives:** (a) No API — keep in-app only: rejected, blocks external reuse. (b)
  GraphQL: rejected as overkill for a flat catalog. (c) Public write endpoints: rejected —
  writes stay server actions (honeypot + Zod), no public write surface to abuse. (d) Make
  the whole board statically prerendered with **client-side filtering** (the other half of
  Approach A): deferred — it would rewrite the working, tested URL-based filter flow
  (board.spec) and change the filter URL/SEO contract; tracked as the next step.
- **Consequences:** Reads now have a stable public contract that gets the P1 Supabase swap
  for free (handlers depend only on the repository interface). New small modules
  (`lib/api/`, `lib/ratelimit/`) and the `app/api/v1/` tree. Edge cache is the load shield;
  the per-IP cap only guards `/votes`. The static-filtering board refactor remains open.
