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

## Current state — communities + reference + sheet data refresh (shipping) · PR #14/#15 done (2026-06-27)

**Live (public, EN+ES):** https://projecthub-beta-blond.vercel.app — both locales 200.

**Shipping now (this turn):** the parallel **data-update** session's completed, verified feature set —
new `/communities` + `/reference` surfaces, +13 Sheet projects, −11 junk external repos, +9 resources,
the ecosystem `isLaunchedProject` rule (Mission VE on board+ecosystem; the ~74 auto-imported "live" repos
stay out), and a landing "Crisis response hubs" section (Build4Venezuela + VZLA Response Hub). Re-verified
HERE before ship: tsc clean · eslint clean · **vitest 92/92** · `next build` clean (21 routes,
`/communities` + `/reference` SSG ×2 locales). To `main` + Vercel via PR (branch
`feat/communities-reference-data`). Full digest: `docs/handoff/2026-06-27-data-update/HANDOFF.md`.

**Two PRs already shipped earlier this session:**
- **PR #14 (`88e5a49`)** — shared client `FilterForm` + landing `force-dynamic` stats sync + `nul`/Turbopack
  lint-hook guard. (Full detail in the demoted *Prior* section directly below.)
- **PR #15 (`d5d7361`)** — header GitHub icon + footer "contribute" link to the public repo
  (`PROJECTHUB_REPO_URL` in `src/lib/links.ts`; tokens-only inline Octocat SVG matching the lang-switcher;
  EN `nav.repo`/`footer.contribute` + ES parity). All checks green incl CodeRabbit; verified live both locales.

**In flight — design/brainstorm only, NO code yet:** "APIs + make it fast/light/instant". Decided with the user:
read-only **public `/api/v1`** + **instant-static pages with a client vote/stats overlay**. The convergence: move
votes+stats to `GET /api/v1/{votes,stats}` (client-fetched) → project/builder renders become pure-static,
CDN-cacheable, Redis-free; the same volatile endpoints are the public contract's live tier. Recommended
**Approach A ("Overlay")**. Two cheap wins folded in: (1) stop loading the 64KB `external-projects.seed.json` on
board/landing (read+Zod'd only to filter out via `isEcosystemProject`); (2) `"use cache"` the seed load+validation
(bust on deploy). Memberships stay OUT of the public API; writes stay internal Server Actions. **Awaiting user
approval of Approach A** before writing the design doc (`docs/superpowers/specs/…`) → spec → writing-plans.

**Architecture facts (verified this session):** no API routes exist yet; all data flows Server Component →
`src/lib/repository` → `data/*.json` (~114KB total; `external-projects` 64KB is the whale). Only `/[locale]` is
`force-dynamic`; board/builders render dynamic per-request (no `revalidate`), re-reading + re-Zod-validating JSON +
2 Redis round-trips (`readVotes` + `readRepoOverrides`) each load. `next.config.ts` already has `reactCompiler: true`
+ baseline security headers (CSP `connect-src 'self'` — same-origin overlay fetch is fine).

---

### Prior — filter reliability + perceived-perf + landing-stats sync (2026-06-26, shipped `88e5a49` / PR #14)

**Live (public, EN+ES):** https://projecthub-beta-blond.vercel.app — both locales return 200.
Committed `86564af` on `fix/filter-reliability` (6 source/config files); shipping to `main` + Vercel
via PR this session. tsc/eslint clean, vitest **84/84**, `next build` clean (17 routes).

**"Filter still not working" → two real causes fixed (not a filter-logic bug):**
1. **Intermittent board 500.** The `.claude/settings.json` lint hook ran `cmd /c pnpm lint … 2>nul`
   unquoted; the POSIX hook shell (not cmd.exe) parsed `2>nul` and dropped a literal `nul` file in
   the repo root → Turbopack panicked on the Windows reserved device name (`os error 1`) → `/board`
   500'd at random. Fix: quote the payload `cmd /c "…2>nul…"` so cmd.exe owns the redirect (+ a
   `.gitignore` net for `/nul`,`/,`). Proved old form recreates `nul`, new form doesn't.
2. **Felt frozen 2–4s.** Native `<form method="get">` did a full-document reload that bypasses
   `loading.tsx`, so nothing rendered during Turbopack's dev recompile. Replaced board+builders bars
   with a shared **client** `FilterForm` (`src/components/ui/FilterForm.tsx`): auto-applies on
   dropdown change via the Next router (client RSC nav → instant skeleton, clean `?status=wip` URLs,
   preserves other active filters), native form + Filters button kept as no-JS fallback. Filters were
   verified logically correct all along (board cat/status/need + combined 109→56→20, bogus→empty;
   builders availability/stack; EN+ES).

**Landing stats desync (57 vs 49) fixed:** `/[locale]` was statically prerendered (`● SSG`) so its
builder count froze at build time while `/builders` (dynamic) was live. Added
`export const dynamic = "force-dynamic"` to `src/app/[locale]/page.tsx`. Proved live sync: appended a
builder → landing AND builders both 38→39 with no rebuild, then restored 38.

**Perf/redis/lazy — measured, not guessed:** prod board 30–240ms, builders 48–102ms (the 2–4s was
pure dev Turbopack compile, no prod bug). Redis layer correct (batched MGET, fails soft to JSON).
Builders already lazy-loads `AddBuilderForm`; no other worthwhile candidate. `tsc`/`eslint` clean,
`vitest` **84/84**, clean `next build`.

⚠️ **Next session must start fresh:** the OLD lint hook is still loaded in the session that made the
fix, so `nul` can still reappear on edits until `settings.json` is reloaded by a new session.

---

### Prior — board param hardening + resources section headers, deployed (2026-06-26)

**Live (public, EN+ES):** https://projecthub-beta-blond.vercel.app — both locales return 200.

**Board filter hardening + resources headers — PR #13 (`3f174c0`), live & verified:** testing the
board filters surfaced a latent crash — an invalid `?need=` URL value (`?need=foo`, `?need=<script>`)
was cast straight to `NeedType` and indexed `p.needs[need]` in `applyFilter` → `undefined.length`
threw; the dynamic route had already streamed its headers, so visitors got a **200 + client-side
error boundary** instead of the board. Fix: validate the enum params (status/need/priority/complexity/
language) against their Zod schemas **at the board boundary** (unknown → dropped, not cast) + a
defensive `?? []` in `applyFilter` + a regression test. **The dropdown filters themselves were already
correct** — options are taxonomy ids derived from present data (no empty/typo options), status counts
partition exactly (planning 18 + wip 56 + live 35 = 109), AND-combine works (coordination 74 + live 35
→ 28). Also restyled `/resources` section headers (small muted-gray → `text-xl`/`2xl` extrabold white
+ 2px rule + count chip, wider gaps) so each type reads as its own clear section. `vitest` **84/84**
(+1), tsc/eslint/`next build` clean; verified live: `?need=bogus`/`<script>` now render the full board,
`?need=contributors` still narrows (38), resources headers bold across all 8 sections.

**Landing page — shipped in PR #12 (`b51c6fd`), live & verified:** rebuilt `/[locale]` home from a
bare search header into a real landing page — search-first hero + dual CTA (Browse · Publish), a
**live stats bar** read straight from the repositories (server component: 109 projects · 38 builders ·
8 live tools · 7 open needs), a **featured** strip of the top-3 ranked projects (reuses `ProjectCard`
+ team counts), how-it-works, builders + ecosystem teasers, and a yellow final-CTA band. New pure
helpers `lib/landing/stats.ts` (`landingStats` / `featuredProjects`) + 5 unit tests; EN+ES `landing.*`
i18n (parity enforced by `typeof en`); **tokens-only** styling, no hardcoded colors. `vitest`
**83/83** (+5), tsc/eslint/`next build` (17 routes) all clean; verified via the prerendered `en.html`/
`es.html` AND live production (markers + real numbers, both locales). NOTE: a **parallel session**
committed this bundled with its own **verified-resources** feature (`/resources` route,
`resources.repo.ts`, `import-platforms.mjs`) into PR #12 → squash-merged to `main` → Vercel
auto-deployed. The landing work above is mine + verified; the resources feature built clean in the
same tree but was authored/owned by that session.

---

### Prior — builders filters fixed + deployed (2026-06-26)

**Live (public, EN+ES):** https://projecthub-beta-blond.vercel.app — the team-scoped
`*-rikepilbs-projects.vercel.app` URLs are behind Vercel Authentication (SSO); this `beta-blond`
alias is the open one to share.

**Builders filters — PR #11 → `main` (`49f0ad1`) → Vercel success, verified live:** the roster's
`availability`/`timezone` are free text from the sheet, so the exact-match filter offered one
dropdown option per typo (`Full-time hackathon`/`Fulltime`/`full time hackaton`; `GMT-5`/`GMT5`/
`GTM-5`/`COT (UTC-5)`), each matching almost no one — picking Part-time hit 8/18, GMT-5 hit 14/21.
Stack split too (`normalize()` only lowercased → `Next.js` ≠ `Next js`). Fix: new
`lib/builders/normalize.ts` folds availability→`Full-time`/`Part-time`/`Flexible` + timezone→`UTC±N`
**at the repository read seam** (covers live sheet, JSON, self-adds; idempotent); new
`lib/builders/filter.ts` (`stackKey`/`builderFilterOptions`/`applyBuilderFilter`) folds stack by
canonical key; `builders/page.tsx` thinned onto it. **Projects unchanged — already filter on clean
taxonomy ids** (69 projects, 0 missing/off-taxonomy). Live prod: Part-time 8→18 (40-roster: 17),
UTC-5 14→22, `Next.js`==`Next js` (7); dropdowns now 2 availability + 6 timezone buckets, no typos.
`vitest` **78/78** (+15), tsc/eslint/build clean.

---

### Prior — board attach-repo/counts/vote + builders-0 fix, deployed (2026-06-26)

**Board update — PR #10 → `main` (`0546a40`) → Vercel deploy success, verified live:**
- **Attach a repo** to a project with none: detail-page `AddRepoForm` (cards w/o a repo link to it);
  validated https+github.com only (rejects javascript:/data:/host-spoof). Persisted in a new
  **repo-override store** (`lib/repos/repo-overrides-store.ts`, `repo:<slug>` Redis key / JSON
  fallback) overlaid in `loadProjects` → survives Vercel + re-imports.
- **Counts on cards/detail:** 👥 people-assigned (memberships) + 🛠 GitHub contributor count
  (cached at attach via `lib/github/repo-stats.ts`, Link-header page-count trick; `GITHUB_TOKEN`
  optional, never logged). New `ProjectSchema.contributors`, `redis.set`, People/ContributorsBadge.
- **Upvote** already on every card (Redis-backed) — left as-is.
- 63 tests (added `parseGithubRepo` boundary tests); build/lint clean.

**Prior this session — builders-0 bug FIXED (PR #9, `5bcc0b7`):** roster moved off the Sheet's
first tab; pinned `gid=939217674` in live fetch + importer (`BUILDERS_SHEET_GID`), clamped skill tags
to 40 chars (recovered 6 dropped builders). Memberships + self-added builders → same Redis seam as
votes. **Builders page now 40** (was 0).

**Builders-0 root cause + fix (PR #9):** the roster moved off the Sheet's FIRST tab, and both the
live fetch (`sheet/builders-csv.ts`) and `scripts/import-builders.mjs` requested the CSV export with
no `gid` → got the wrong tab (a "roles we need" table, no `Nombre` col) → 0 builders; on Vercel the
gitignored `builders.json` isn't deployed so the live fetch is the only source. Fix: pin roster
`gid=939217674` ("ARMADO DE EQUIPO"), overridable via `BUILDERS_SHEET_GID`; clamp each skill tag to
40 chars at the parse boundary (6 real builders were dropped for a >40-char "skill" sentence).

**Also shipped (PR #9):** memberships + self-added builders now persist via the **same Upstash Redis
seam as votes** (`memberships/memberships-store.ts`, `builders/builders-store.ts`, `redis/client.ts`
+`rpush`/`lrange`). Self-adds live in a SEPARATE store (`builders-custom.json` / Redis `builders:custom`)
so re-running the importer can't wipe them; merged onto the roster deduped by id.

**Verified this turn:** `next build` clean (15 routes) · `eslint` clean · `vitest` **58/58** (added a
tag-clamp regression) · local prod-server smoke (custom self-add merges to 39, membership renders on
team) · live prod smoke: 10 routes 200, 40 builders, join form + honeypot present, ecosystem
(WeLove/Donar Seguro) live. `data/builders.json` re-imported to 38 locally (gitignored).

**Still open (user action):** set `UPSTASH_REDIS_REST_URL`/`_TOKEN` in Vercel settings — enables
durable **votes + memberships + self-adds** (all route through the Redis-or-JSON seam; JSON fallback
is read-only on Vercel so those WRITES are lost per deploy without it). The roster (sheet-sourced) and
all reads work regardless. Optional: confirm whether the team-URL SSO protection should stay on.

Next.js 16 + TS + Tailwind v4, local-first JSON behind a repository seam. Pages:
home/search/**board**(hackathon repos)/**ecosystem**(existing live sites)/builders/projects-new/[slug].

---

### Prior — optimization pass + Ecosystem split (2026-06-26)

- **This turn — optimization audit plan (`wf_3bd8588a-4a4`) implemented:**
- **React.cache()** on `loadProjects`/`loadBuilders`; board does ONE ranked read + in-memory
  `applyFilter` (no double `list()`).
- **Redis votes** behind the seam: `lib/redis/client.ts` (Upstash REST, fail-soft) + `lib/votes/
  votes-store.ts` + `votes-json.ts`; `projects.repo.vote()` + the loadProjects vote overlay route
  through it. Falls back to JSON locally; durable on Vercel once `UPSTASH_REDIS_REST_URL`/`_TOKEN` set.
- **Tests:** vitest 57/57 green — schemas/text/slug/rank/progress/builders-csv/votes-store +
  integration (projects-repo, submit-project, submit-builder, vote-project).
- `loading.tsx` skeletons (board/builders/search/[slug]/ecosystem) + `ui/Skeleton`; resilient sheet
  fetch (`sheet/resilient-fetch.ts`, 429/Retry-After backoff); GitHub discovery `sort=stars` + more
  queries + MAX 100; lazy-load `AddBuilderForm`; `.env.example` documents Upstash + Vercel builders
  caveat. mcpPlan = no app-level MCP needed (dev-workflow only). Fonts left intact (all weights used).

**Ecosystem split:** projects with a live site but no repo (`!repo_url && demo_url`, 4: Venezuela Te
Necesita, Desaparecidos Terremoto VE, Venezuela Te Busca, SOS Yummy Rides) moved off the board to
`/ecosystem` (`SiteThumb` favicon + name + synopsis + Visit↗). Board = 43 repo projects; 18 repo-less
ideas stay on the board. Missing-persons sites = link-out cards only (no scrape).

**Data:** builders refreshed to **29** (live sheet). **Verified:** `npm run build` clean (15 routes),
`tsc` clean, 57 tests pass.

**Concurrency note:** a parallel session is building team-membership (`join-project` action,
`membershipRepository`, `ProjectTeam`/`JoinProjectForm`, `data/memberships.json`); I added the 6
`detail.*` team i18n keys to unblock the shared build. Don't clobber their files.

**Next:** redeploy once the team feature lands + sessions settle (one clean `vercel deploy --prod`);
provision Upstash for durable votes; repo hygiene (untrack harness files) → single commit + push
(confirm before pushing to public `main`).

---

## Session index (append-only, newest first)

- 2026-06-27 — [38bfc358 (cont.)](2026-06-26-38bfc358/HANDOFF.md) — cont. past PR #8: PR #14 (`88e5a49`) FilterForm/force-dynamic/nul-guard + PR #15 (`d5d7361`) header+footer repo link, both merged+live; then API+perf design brainstorm (read-only `/api/v1` + static+vote-overlay, Approach A pending approval).
- 2026-06-26 — [190568c7](2026-06-26-190568c7/HANDOFF.md) — filter reliability (`nul`/Turbopack hook fix) + client `FilterForm` auto-submit + landing `force-dynamic` stats sync; 84 tests, shipped `86564af` → PR.
- 2026-06-26 — [38bfc358](2026-06-26-38bfc358/HANDOFF.md) — test · deploy · post: tsc/57 tests/build green, prod redeploy (`dpl_GLbg…`), PR #8 squash-merged to main, CI green.
- 2026-06-26 — [projecthub-p0-mvp](2026-06-26-projecthub-p0-mvp/HANDOFF.md) — scaffold + P0 MVP + 3 data importers + ScoutLane security pass; build green, E2E verified.

<!-- compact-handoff:auto-snapshot -->
<!-- Latest auto-snapshot: docs/handoff/2026-06-26-190568c7/snapshot-052712.md -->
## Latest auto snapshot — 2026-06-27T05:27:12.140Z
- Session folder: `docs/handoff/2026-06-26-190568c7/`
- Snapshot file: `docs/handoff/2026-06-26-190568c7/snapshot-052712.md`
- Branch: main
