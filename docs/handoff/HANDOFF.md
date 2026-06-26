# projecthub — Handoff (father)

**Read this first.** Whole-project handoff. Freshest state on top, then an append-only
index of every session folder. Nothing here is ever deleted — full prose lives in each
session's own `HANDOFF.md`; this file is the map.

## How this works (tree of context)

```
docs/handoff/
  HANDOFF.md                  ← this file (father): rolling current state + session index
  .current-session            ← pointer: active session folder name (used by the hooks)
  _meta/TEMPLATE.md           ← per-session template
  <YYYY-MM-DD>-<name>/        ← one immutable folder per session
    HANDOFF.md                ← session digest: goal · done · files · failed · next
    transcript.md             ← optional full /export archive
```

**Rules:** append, never overwrite. Only the father's `## Current state` is replaced each
session. Solved tasks → one concrete one-liner (file / PR / command).

---

## Current state — P0 MVP built + verified (2026-06-26)

Next.js 16 + TS + Tailwind v4, **local-first JSON** behind a repository seam (`src/lib/repository`,
one-file swap to Supabase at P1). Bilingual EN/ES (`[locale]` is root layout; `src/proxy.ts`
redirects `/`). Pages: home/search/board/projects-new/[slug]/builders. Fuzzy "already exists?"
search (Fuse.js) reused as a pre-publish nudge. Submit = Zod-validated Server Action that appends
to `data/projects.seed.json` (works in `next dev`; read-only host = the P1 Supabase trigger).

**Data (all live):** board = **60 projects** = 7 hand-seed + 13 sheet ideas
(`scripts/import-ideas.mjs`, tab gid 1187241395) + 40 GitHub repos (`scripts/discover-github-repos.mjs`).
Builders = **17** from the participants sheet (`scripts/import-builders.mjs`). Run via
`npm run data:builders | data:ideas | data:github`.

**Verified:** `npm run build` clean (13 routes); browser E2E submit→detail; XSS query escaped;
security headers live; dev console 0 issues. **Gaps:** no tests, no CI, no auth/rate-limit (P1).
Stack note: npm (not pnpm), schemas in `src/lib/schemas.ts` (not `src/schemas/`). Commits: omit
`Co-Authored-By: Claude` per the adopted ScoutLane rule.

---

## Session index (append-only, newest first)

- 2026-06-26 — [projecthub-p0-mvp](2026-06-26-projecthub-p0-mvp/HANDOFF.md) — scaffold + P0 MVP + 3 data importers + ScoutLane security pass; build green, E2E verified.

<!-- compact-handoff:auto-snapshot -->
