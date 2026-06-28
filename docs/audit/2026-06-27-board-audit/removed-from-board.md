# Board curation — removed entries (2026-06-27)

Record of project entries removed from the board during the 2026-06-27 catalog
cleanup, so the removals are auditable even though the entries no longer ship in
production. Removed external repos are added to `data/external-denylist.json` so a
re-run of `scripts/discover-github-repos.mjs` will not resurrect them.

**Reason codes:** `dead` (demo and/or repo returns 404 / gone) · `duplicate` (same
product or repo as an entry that was kept) · `off-topic` (no Venezuela-relief signal;
keyword false-positive) · `placeholder` (scaffold / no relief content) · `meta`
(this hub or its parent program, not a relief tool).

Net effect: board **134 → 109** entries · denylist **66 → 85**.

## Removed

| Slug | Source | Reason | Note |
|---|---|---|---|
| `vzla-help` | projects | dead | demo `www.vzla.help` 404, no repo |
| `reporte-ve` | projects | duplicate | same app as `mission-ve` ("Reporte VE"); kept `mission-ve` |
| `idea-mapa-de-necesidades-vs-recursos-resqlink` | ideas | duplicate | points at the live project `resqlink` |
| `idea-bot-de-whatsapp-para-busqueda-de-personas` | ideas | duplicate | overlaps project `whatsapp-relief-bot` |
| `idea-generador-de-fichas-de-desaparecido` | ideas | duplicate | overlaps project `fichas-busqueda-rrss` |
| `idea-deduplicacion-automatica-de-reportes` | ideas | duplicate | overlaps project `vzla-dedup` |
| `idea-mvp-de-seguridad-antidisturbios-para-evitar-robos-o-maleantes` | ideas | duplicate | near-identical to the other security idea |
| `gh-jaimeirazabal1-evalua-ve` | external | dead | demo + repo both 404 |
| `gh-alechuma64-terremoto-2026` | external | dead | repo 404 |
| `gh-figueroaj1981-encontrando-nuestra-familia` | external | dead | repo 404 |
| `gh-kevinesaa-centraliza-ayuda-venezuela` | external | duplicate | of the live project `centraliza-ayuda` (same owner/repo) |
| `gh-rikepilb-build4venezuela-projecthub` | external | meta | a stale beta deploy of this hub itself |
| `gh-muqeet-ahmed-smit-assignment-08-newspage` | external | off-topic | a CSS coursework page, no Venezuela/relief |
| `gh-vibemill-apps-unsalvaged-preface-0955` | external | placeholder | Vercel auto-name shell, no relief content |
| `gh-wd7512-venezuela-earthquake-ml` | external | off-topic | generic earthquake-ML, no demo, no VE specificity |
| `gh-parthsieee3-venezuela-earthquake-analytics` | external | off-topic | generic analytics template |
| `gh-abateg-venezuela-earthquake` | external | off-topic | generic, no demo |
| `gh-akdoganhilal-ai-disaster-relief-system` | external | off-topic | generic disaster-relief template |
| `gh-arpi-git29-realtime-earthquake-prediction-and-relief-coordination` | external | off-topic | generic prediction template |
| `gh-ozancandirek-aegisfrontend` | external | off-topic | generic frontend, no VE specificity |
| `gh-ceylindilekkarabulut-emergencycoordination` | external | off-topic | generic coordination template |
| `gh-mohammodsaifazam-venezuelaearthquake2026` | external | off-topic | no demo, no relief content |
| `gh-yashildoll1-venezuela-earthquake-2026-devastating-tremors-leave-caracas-in-shock` | external | off-topic | clickbait-headline repo name, no tool |
| `gh-carlos29blanco-antes-y-despu-s-del-terremotos-de-venezuela-24-jun-2026` | external | duplicate | of the same author's `gh-carlos29blanco-antesdespuesterremotosvenezuela2026` |
| `gh-crafter-station-build4venezuela` | external | meta | the hackathon umbrella (already a landing hub), not a board project |

## Edited

| Slug | Change |
|---|---|
| `mission-ve` | renamed **"Mission VE" → "Reporte VE"**; `demo_url` → `https://ve.crafter.run` (absorbs the deleted `reporte-ve` identity; repo + votes kept) |

## Kept despite flags (intentional)

- **Missing-persons / PII entries** stay **link-out only** by policy (no scrape, no merge):
  e.g. `iFoundYou`, `desaparecidos-terremoto-venezuela`, `venezuela-te-busca`,
  `gh-duvet05-venezuela-earthquake-outreach-dataset`, scraper repos.
- **Live, on-topic externals** with a working demo were kept even where they overlap others.

## Follow-ups (not in this change)

Pipeline hardening to stop the rot at the source — see the audit report §6. Done here:
- Importer now requires a Venezuela signal per repo + dropped the no-`venezuela` query
  (`scripts/discover-github-repos.mjs`).
- Liveness checker added (`scripts/check-links.mjs`) — wire into a weekly cron.

Deferred (touch the live submit/validation path — need their own tests):
dedup-on-submit (block exact `repo_url`/`demo_url` collisions), Zod `reviewed` quarantine
for importer-sourced entries, and a schema-level PII gate for `missing-persons`.
