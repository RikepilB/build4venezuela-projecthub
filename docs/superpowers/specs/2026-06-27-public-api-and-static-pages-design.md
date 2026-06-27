# Public API + static pages (Approach A) — design

**Date:** 2026-06-27 · **Status:** Phase 1 shipped & verified; Phase 2 deferred (see below).

## Goal

Expose ProjectHub's catalog as a **public, read-only REST API** so other relief tools can
reuse the data, and serve the in-app catalog from cacheable HTML with **live vote counts**
overlaid client-side — "instant-static + live overlay". No new datastore: a thin HTTP face
over the existing repository seam (`src/lib/repository`), which keeps the P1 Supabase swap
free.

## Locked decisions

- **Scope:** full read-only catalog — all six resources (projects, builders, resources,
  communities, reference) + `/search` + `/taxonomy` + `/stats` + live `/votes` + a
  discovery index. Eleven `GET` endpoints under a versioned `/api/v1`.
- **Contract:** one `{ success, data, error, meta }` envelope; `Access-Control-Allow-Origin: *`
  on every response (no credentials → wildcard is safe); `OPTIONS` → `204`.
- **Caching:** catalog → `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
  (CDN edge cache shields the origin); `/stats` + `/votes` → `no-store`.
- **Read-only:** GET only. Every mutation (vote/submit/join/attach) stays a server action —
  no public write surface.
- **Validation:** query params validated at the boundary, reusing the board's enum guard —
  unknown enum values are dropped, never cast (`?status=nope` can't throw).
- **Rate limiting:** only `/votes` is un-cached/origin-hitting, so it carries a per-IP
  fixed-window cap (60/min) via the Redis seam; **fails open** when Redis is off. Catalog
  routes need none (edge cache shields them).

## API surface

| Path | Cache | Returns |
|------|-------|---------|
| `GET /api/v1` | catalog | Discovery index |
| `GET /api/v1/projects` (+ filter query) | catalog | Ranked `Project[]` |
| `GET /api/v1/projects/{slug}` | catalog | `Project` or `404 not_found` |
| `GET /api/v1/search?q=` | catalog | `SearchHit[]` |
| `GET /api/v1/{builders,resources,communities,reference}` | catalog | Curated list |
| `GET /api/v1/taxonomy` | catalog | Controlled vocabularies |
| `GET /api/v1/stats` | no-store | Aggregate counts |
| `GET /api/v1/votes` | no-store | Live `{ slug: count }` (per-IP capped) |

`/projects` filters: `category`, `stack`, `language`, `status`, `need`, `priority`,
`complexity`. Error strings: `not_found`, `rate_limited`, `internal_error`.

## Rendering model

- **Live vote overlay (shipped).** The board wraps its grid in `LiveVotesProvider`
  (`src/components/votes/LiveVotes.tsx`), which fetches `/api/v1/votes` after hydration and
  on tab focus, and overlays the current counts on each card. It is **not optimistic** —
  the number always comes from the server (the same store the page reads), so a
  cache-stale count is replaced with the current one, never double-counted. Falls back to
  the server-rendered prop when there is no provider or the fetch fails.
- **Static-prerendered board/builders with client-side filtering (deferred).** The full
  Approach A would render the board statically and move filtering to the browser. This was
  **not done** this pass because the board/builders filter flow is URL-based and covered by
  e2e tests (`board.spec.ts`), and moving it client-side would change the filter URL/SEO
  contract and rewrite those tests for marginal gain (votes already overlay live; the HTML
  shell is already cacheable). Tracked as the next step.

## Files

- `src/lib/api/response.ts` — envelope + CORS + cache header helpers (`ok`, `fail`, `preflight`).
- `src/lib/api/query.ts` — `projectFilterFromQuery` boundary validation.
- `src/lib/ratelimit/limiter.ts` — `rateLimit` (fail-open) + `clientIp`.
- `src/lib/redis/client.ts` — added `expire` (TTL for limiter keys).
- `src/app/api/v1/**/route.ts` — 11 route handlers.
- `src/components/votes/LiveVotes.tsx` — overlay provider + hooks.
- `src/components/board/VoteButton.tsx` + `src/app/[locale]/board/page.tsx` — overlay wiring.

## Testing

- **Unit:** envelope shape/status/headers; query validation (valid kept, bogus dropped);
  rate limiter (fail-open, cap, TTL-once) + `clientIp` parsing.
- **Integration:** every route handler — envelope, status, cache header, count meta, filter
  passthrough, 404, 429, 500 (mocked repository, no fs/Redis).
- **E2E (`tests/e2e/api.spec.ts`):** all endpoints over HTTP against the production build;
  the board fetches the live `/votes` map.

Verified 2026-06-27: tsc · eslint · vitest 145/145 · `next build` · live HTTP smoke ·
Playwright api spec 9/9.
