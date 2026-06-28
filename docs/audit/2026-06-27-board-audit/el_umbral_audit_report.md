# El Umbral — Project Board Audit

**Date:** 2026-06-27
**Auditor:** automated local audit (4-agent consensus) + HTTP liveness + Chrome render-confirm
**Corpus:** 134 board entries — **53** curated projects · **29** ideas · **52** external (GitHub-discovery)
**Method:** ground-truth from `data/*.seed.json` (no scraping — full data already local, so zero
hallucination risk), 113 unique URLs HTTP-checked, ambiguous cases confirmed in Chrome.
**Debate transcript:** see `agent_tracking_log.txt` in this folder.

> ⚠️ **Do not publish/commit as-is.** This report names individual contributors' projects for
> removal. It is an internal triage aid. Human review required before any deletion; this repo is
> public (MIT), so do not push this file without redacting or deciding it's safe.

---

## 1 · Executive summary

The board is **healthy at the core, noisy at the edges.** The 53 curated projects are almost all
live and on-topic; the rot is concentrated in the **52 auto-imported external repos** (keyword
false-positives, dead repos, foreign/generic templates) and a handful of **duplicates** that split
votes and mislead searchers.

**Link health:** 113 URLs checked → **4 confirmed dead**, 1 false alarm (bot-blocked but live),
~107 live. Dead-link rate is low (~3.5%), but each dead link on a crisis board is high-cost.

**Headline findings**
- **4 fully-dead entries** (404 demo *and* no/dead repo): `vzla-help`, `gh-jaimeirazabal1-evalua-ve`,
  `gh-alechuma64-terremoto-2026`, `gh-figueroaj1981-encontrando-nuestra-familia`.
- **1 vote-splitting duplicate:** `mission-ve` and `reporte-ve` are the **same app** ("Reporte VE",
  identical page title) at two URLs — votes 8 vs 1 for one product. Merge.
- **2 redundant rows of already-curated projects:** `idea-…-resqlink` (an "idea" pointing at the
  live `resqlink`) and `gh-kevinesaa-centraliza-ayuda-venezuela` (external dup of the live
  `centraliza-ayuda`).
- **El Umbral lists itself:** `gh-rikepilb-build4venezuela-projecthub` → an old beta deploy of *this*
  app ("El Umbral · Build4Venezuela").
- **Importer keyword leak:** `smit-css-assignment-08` ("Assignment 08 - News Article Page", a CSS
  homework) and a cluster of foreign/generic earthquake-ML templates entered via the query
  `"earthquake relief coordination"` (no "venezuela" token). See §5.
- **PII watch:** `gh-duvet05-venezuela-earthquake-outreach-dataset` ("Dataset de contactos publicos")
  plus two scraper repos — must stay **link-out only**, never merged (hard-stop).

**Net recommendation:** ~**8 deletions + 1 merge** immediately; ~**12–15 re-classify/evaluate**;
the rest keep. Board shrinks from 134 → ~125 with materially higher signal.

---

## 2 · Delete / Redundant

Remove from the seed; add slugs to `data/external-denylist.json` so a re-import can't resurrect them.

### Dead (no live surface, no recoverable artifact)
| Slug | Source | Why |
|---|---|---|
| `vzla-help` | projects | demo `www.vzla.help` → **404**, no repo. Nothing to re-point to. |
| `gh-jaimeirazabal1-evalua-ve` | external | demo **404** *and* repo **404**. Fully gone. |
| `gh-alechuma64-terremoto-2026` | external | repo **404** (deleted), no demo. |
| `gh-figueroaj1981-encontrando-nuestra-familia` | external | repo **404** (deleted), no demo. On-mission name, but no artifact survives. |

### Duplicates / redundant
| Slug | Source | Why | Action |
|---|---|---|---|
| `reporte-ve` | projects | Same product as `mission-ve` — identical title "Reporte VE · Mapa ciudadano". | **Merge** into `mission-ve` (keep repo + 8 votes; rename to "Reporte VE"; demo → `ve.crafter.run`). Delete this row. |
| `idea-mapa-de-necesidades-vs-recursos-resqlink` | ideas | Carries the *exact* demo+repo of the live `resqlink`. A planning "idea" for shipped work misleads searchers. | Delete (or convert to a pointer at `resqlink`). |
| `gh-kevinesaa-centraliza-ayuda-venezuela` | external | Same owner/repo as the live `centraliza-ayuda` (which also has a working demo). | Delete the external dup; keep curated row. |
| `gh-rikepilb-build4venezuela-projecthub` | external | **El Umbral itself** (old beta deploy). Self-listing + stale URL. | Delete. If self-reference is wanted, use a footer link to `elumbralvzla.org`, not a project card. |

### Off-topic / junk (importer false-positives)
| Slug | Source | Why |
|---|---|---|
| `gh-muqeet-ahmed-smit-assignment-08-newspage` | external | "Assignment 08 - News Article Page" — a CSS coursework. No Venezuela, no relief. |
| `gh-vibemill-apps-unsalvaged-preface-0955` | external | "Vibe Mill app" — Vercel auto-name placeholder shell, no relief content. |
| `gh-yashildoll1-…devastating-tremors-leave-caracas-in-shock…` | external | Repo name is an SEO/clickbait headline; content-farm shape, no demo. |

---

## 3 · Evaluate Further (needs a human call)

Not deleting — these need one human decision (reclassify, merge, or confirm with the author).

- **Foreign / generic earthquake-ML & relief-template cluster** → most belong on **`/reference`**
  (global prior art), not the active VE board: `gh-wd7512-venezuela-earthquake-ml`,
  `gh-parthsieee3-venezuela-earthquake-analytics`, `gh-abateg-venezuela-earthquake`,
  `gh-akdoganhilal-ai-disaster-relief-system`,
  `gh-arpi-git29-realtime-earthquake-prediction-and-relief-coordination`,
  `gh-ozancandirek-aegisfrontend`, `gh-ceylindilekkarabulut-emergencycoordination`,
  `gh-mohammodsaifazam-venezuelaearthquake2026`. Delete the pure templates with no VE specificity
  and no demo; move the genuine tools to `/reference`.
- **Same-author internal dup:** `gh-carlos29blanco-antesdespuesterremotosvenezuela2026` **and**
  `gh-carlos29blanco-antes-y-despu-s-del-terremotos-de-venezuela-24-jun-2026` — keep one, confirm
  whether the other is a front/back split.
- **Umbrella mis-placed as a project:** `gh-crafter-station-build4venezuela` (`build4venezuela.com`)
  — already a landing hub + board callout; remove the duplicate project card.
- **Repo-only infra pieces (no demo):** `gh-venezuela-war-room-api`, `gh-sosvenezuela-core` — backend
  fragments; confirm they're part of a fronted project or drop.
- **Ideas backlog (29):** directional dedupe — convert ideas that overlap a built project into
  "join this" pointers, keep the genuinely-unbuilt ones as open invitations:
  - `idea-bot-de-whatsapp-para-busqueda` ↔ project `whatsapp-relief-bot`
  - `idea-generador-de-fichas-de-desaparecido` ↔ project `fichas-busqueda-rrss`
  - `idea-deduplicacion-automatica-de-reportes` ↔ project `vzla-dedup`
  - `idea-scraper-rag-unificado` + `idea-construir-una-fuente-…-rag` ↔ project `build4venezuela-rag`
  - `idea-seguridad-…` + `idea-mvp-de-seguridad-antidisturbios-…` — two near-identical security
    ideas → merge into one.
  - Genuinely open (keep): SMS/USSD gateway, mesh sync, OSINT situational-awareness, blood-donation.

### PII / link-out flag (hard-stop — never scrape, merge, or host)
- `gh-duvet05-venezuela-earthquake-outreach-dataset` — "Dataset de contactos publicos". **Link-out
  only**; escalate for a consent/lawfulness check before featuring.
- `gh-wilbellis-scraper-venezuela`, `gh-fxckcode-ficha-desaparecido` — scrapers of personal data.
- **All missing-persons entries** stay link-out only by policy.

---

## 4 · Keep

### 4a · Highly relevant & important (gold standard)
Ranked by traction (votes) + criticality. These should anchor the board's default view.

| Project | Signal | Why it's gold |
|---|---|---|
| **iFoundYou** | 31 votes · repo | Top-voted; missing-persons locator. |
| **Reencuentros Terremotos Venezuela** | 15 votes | Reunification — the highest-stakes need. |
| **VZLA_DEDUP** | 14 votes | Deduplicates missing-persons reports — fixes the noise everyone else suffers. |
| **BuscaChat** | 11 votes · repo | Conversational missing-persons search. |
| **Mission VE → "Reporte VE"** | 8 votes · repo · live | Citizen services map; crafter-station. (Absorbs `reporte-ve`.) |
| **ResQLink** | live · repo | "Respuesta Humanitaria en Tiempo Real" — needs↔resources map, well-built. |
| **SismoAyuda VE** | live | Post-quake **structural safety** assessment — life-safety. |
| **Confía** | live · repo | Anti-scam **donation verification** — the trust layer. |
| **Cenital** | live | Hospital availability. |
| **buscofamiliar.com** | live | Polished patient/person locator. |
| **CaribeLLM** | live · 2 votes | Distributed inference infra — an enabler for the others. |

### 4b · Keep (overlapping but useful) — live + on-topic, distinct angle
All HTTP-200 with relief-relevant titles (render-confirmed where noted):

- **Curated projects (live):** apoyo-venezuela, reporta-venezuela, miranda-conecta, venezuela-unida,
  ayuda-venezuela-talos, achylo-pay, personas-encontradas-bot, red-apoyo-venezuela, sos-patitas,
  sosvenezuela, directorio-sismo, centraliza-ayuda, 24junve-status, grego-app, rescue-map-venezuela,
  te-encontramos, entre-panas, avapre-redh, crafter-station, venezuela-te-necesita,
  desaparecidos-terremoto-venezuela *(Chrome-confirmed live; bot-blocks fetch)*, venezuela-te-busca,
  sos-yummy-rides, welove-foundation, donar-seguro, vzla-x-arg, terrave.
- **External (live demo, on-topic):** `gh-z1code-sosvenezuela2026`, `gh-renasarenas-vzla-sismo-feed`,
  `gh-lpenalozamalave-ux-venezuela-edificios`, `gh-celestinosalim-venezuela-ayuda`,
  `gh-nochinxx-venezuela-earthquake-map` (SismoVenezuela), `gh-yin-renlong-…-copernicus-dashboard`,
  `gh-georiv-listas-venezuela` *(Chrome-confirmed OCR upload tool; only a missing `<title>`)*,
  `gh-jenapidev-sismo-hospitales`, `gh-chrizzfps-mano-amiga-ve`.

**Minor fix:** `listas-venezuela.vercel.app` and a couple of Vercel deploys render with an empty
`<title>` — cosmetic, worth a nudge to the authors but not a board issue.

---

## 5 · Ecosystem cross-reference

- **Board vs `/ecosystem` partition.** `isEcosystemProject = (no repo + has demo)`; the board shows
  `!isEcosystemProject || isShippedLive`. So the no-repo live sites (e.g. `venezuela-te-necesita`,
  `vzla-help`) surface on `/ecosystem`; the 24 shipped-live (progress 100) appear on **both**. This
  is by design — but it means a **dead no-repo demo (like `vzla-help`) silently rots on `/ecosystem`**
  where the board filter wouldn't even flag it. Deleting dead entries fixes both surfaces at once.
- **Production vs board self-listing.** The live hub is `elumbralvzla.org`; the board's
  `gh-rikepilb-…-projecthub` points at the stale `projecthub-beta-blond.vercel.app`. Remove (§2).
- **Crafter Station orbit.** `crafter-station` (the collective's homepage), `mission-ve`/`reporte-ve`,
  and `gh-crafter-station-build4venezuela` (the hackathon) are three facets of one team/umbrella.
  Keep the relief tool (Reporte VE), keep the hub link in the landing band, and drop the duplicate
  project cards for the company page + umbrella.
- **Reference vs board.** The foreign earthquake-ML cluster (§3) is global prior art — it belongs on
  `/reference`, which exists precisely for "study/reuse before you build," not the active relief board.

---

## 6 · Strategic suggestions — fix the submission pipeline (prevent the rot)

Grounded in `src/actions/submit-project.ts`, `src/lib/schemas.ts`, and
`scripts/discover-github-repos.mjs`.

**1. Tighten the GitHub importer's relevance net (root cause of most junk).**
The query list in `discover-github-repos.mjs` includes `"earthquake relief coordination"` with **no
`venezuela` token** — that single query pulled in the SMIT CSS homework and the foreign ML templates.
Require a Venezuela signal on every result (name/description/topics must contain
`venezuela|vzla|caracas|sismo|terremoto`), and reject results whose only match is a generic
disaster/earthquake keyword. The denylist (currently 67 slugs, hand-maintained) is a *reactive* patch
for a *too-wide* net — narrow the net so the denylist stops growing.

**2. Liveness gate at import + a periodic health cron.**
`evalua-ve`, `vzla-help`, and two deleted repos prove entries rot silently. HEAD/GET each `demo_url`
and `repo_url` at import; on `404`/dead, set the entry to a `needs-review` state instead of showing it
as live. Re-run weekly. (The 113-URL checker in this audit is ~40 lines — promote it to
`scripts/check-links.mjs`.)

**3. Dedupe on submit — extend the existing Fuse.js nudge to a hard guard.**
`src/lib/search.ts` already fuzzy-matches on `/projects/new`. Add an **exact-collision block**: if a
submitted `demo_url` or `repo_url` already exists (normalized), refuse or offer "this exists — join
it." That alone would have stopped `reporte-ve` vs `mission-ve`, the `resqlink` idea, and the
`centraliza-ayuda` external dup.

**4. Strengthen `ProjectInputSchema` (Zod) at the boundary.**
- Require **at least one of** `repo_url` / `demo_url` (`.refine(p => p.repo_url || p.demo_url)`) — kills
  data-less rows.
- Reject the importer's auto-summary template (`/ — Venezuela relief open-source project\.$/`) and bump
  the summary `min` so "thin" entries can't pass.
- Add a `reviewed: boolean` (default `false`) and **quarantine importer-sourced entries** until a human
  flips it — curated submissions can stay auto-published; bulk discovery shouldn't.

**5. Schema-level PII gate.**
When `categories` includes `missing-persons` (or a new `personal-data` flag), enforce **link-out only**:
disallow ingesting/merging contact datasets, and surface a visible "link-out, not hosted here" badge.
Encodes the existing hard-stop in the type system instead of relying on reviewer memory.

---

*Artifacts in this folder: `el_umbral_audit_report.md` (this file) · `agent_tracking_log.txt`
(full 4-agent debate transcript).*
