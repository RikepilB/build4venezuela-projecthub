# Session — 2026-06-27 — data update + new surfaces (communities / reference / hubs)

## Goal
"Update the data: add projects, show launched/>50% in ecosystem too, add Mission VE to
ecosystem, add communities + a reference list, improve resources, reference the hackathon
+ VZLA Response Hub on the landing, remove duplicate/irrelevant projects not in the Sheet,
test filters." Source of truth: the team Google Sheet (local export `hackaton_solidario_equipo (3).xlsx`).

## What was done (all verified: tsc clean · 92/92 vitest · clean `next build` · lint clean)
- **Ecosystem inclusion rule** (`src/lib/ecosystem.ts`): added `isLaunchedProject` (demo + progress>50)
  and `ecosystemListing` (repo-less sites ∪ launched). `/ecosystem` + landing "live" stat now use it.
  Mission VE (repo+demo, 70%) shows on the board AND ecosystem; gating on progress>50 keeps the ~74
  auto-imported external "live" repos out. Board partition + counts unchanged. New tests added.
- **Projects +13** (`data/projects.seed.json`, 15→28): the registered projects from the Sheet's
  "Proyectos iniciados" + "Ideas" tabs (ResQLink, Confía, TerraVE, SismoAyudaVE, RefugioVE, RSH,
  Red Cayapa, Voces Unidas, DañoListo, VeriVe, Acompañamiento, Fichas RRSS, VZLA_DEDUP). Phone numbers
  stripped (PII); PII-sensitive ones carry the link-out/human-review guard.
- **Cleanup −11** (`data/external-projects.seed.json`, 85→74): removed junk/non-VZ/duplicates
  (CSS homework, prayer/SEO pages, astrology dashboard, Turkey AFAD/Aegis, two dup pairs). Genuine VZ
  relief repos kept (gutting them would kill the discovery board). Stricter "Sheet-only" pass offered.
- **Resources +9** (`data/resources.extra.json`): vetted links from the Sheet's URLS tab
  (hospital lookups, structural-damage reporting, donation funds, VZLA Response Hub). https-only,
  tracking params stripped. The 16 "Plataformas activas" were already in `resources.seed.json`.
- **Communities** (NEW surface `/communities`): schema + `data/communities.seed.json` (6 public
  Discord/Telegram/web entry points) + repo + page + card + nav + i18n. Per-project WhatsApp invite
  links deliberately excluded (semi-private).
- **Reference** (NEW surface `/reference`): schema + `data/reference.seed.json` (24 curated global
  OSS relief tools from the crisis-tech directory, grouped by capability) + repo + page + card + nav + i18n.
- **Landing "Crisis response hubs" section**: cards for Build4Venezuela + VZLA Response Hub
  (`https://www.vzlaresponsehub.org`, added to `src/lib/links.ts`). Both en+es.
- **Filters**: unchanged; their unit tests are part of the green suite; prior session verified E2E in prod.

## Files changed
- src/lib/ecosystem.ts, src/lib/landing/stats.ts, src/app/[locale]/ecosystem/page.tsx, src/app/[locale]/page.tsx
- src/lib/schemas.ts, src/lib/types.ts, src/lib/data-files.ts, src/lib/links.ts
- src/lib/repository/{index,communities.repo,reference.repo}.ts
- src/app/[locale]/{communities,reference}/page.tsx
- src/components/{communities/CommunityCard,reference/ReferenceCard}.tsx
- src/components/layout/Header.tsx, src/lib/i18n/{en,es}.ts
- data/{projects.seed,external-projects.seed,resources.extra,communities.seed,reference.seed}.json
- tests/unit/{ecosystem.test,landing-stats.test}.ts

## Not done / boundaries
- **Lifecycle grouping (ideas/iniciados/lanzados)** — DEFERRED. Maps to status planning→wip→testing→
  mvp→live; the board already filters by status. A grouped board view is a UX restructure worth its own
  focused pass (don't regress the verified filter/RadarStats flow).
- **Google Sheet write** — user will connect a Sheets integration first; not done. Alternative: generate
  paste-ready rows.
- **Missing-persons X scraper + PII cleanup** — REFUSED (repo hard stop: "No PII auto-publish /
  missing-persons link-out only"). Listed such projects as link-outs; did not build/run a scraper.

## Next steps
- Decide on lifecycle grouping (greenlight the board restructure or keep status filter).
- Uncommitted — branch → PR when ready (not on main).
- Surface counts now: 119 projects (109 board · 13 ecosystem · 3 launched-on-both), 26 resources,
  6 communities, 24 reference tools.
