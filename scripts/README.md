# Data importers

Plain Node ESM scripts that populate `../data/*.json`. Run manually from the app root.

## `import-builders.mjs` → `data/builders.json`
Fetches the hackathon participants Google Sheet (public CSV export) and maps it to
the `Builder` shape. No auth needed.

```powershell
npm run data:builders
```

- Header matching is fuzzy (`Nombre / Alias`, `Stack/Skills`, …) so a column rename
  won't silently break it.
- Rows with no alias are skipped; invalid LinkedIn values are dropped (not URL-faked).
- Writes via temp-then-rename, so a failed fetch never clobbers a good file.
- The committed `data/builders.json` is the offline-safe demo source.

## `discover-github-repos.mjs` → `data/external-projects.seed.json`
Queries the GitHub Search API for Venezuela-relief OSS repos and seeds them on the board
as `source: "external"`.

```powershell
$env:GITHUB_TOKEN = (gh auth token)   # optional, raises rate limit 10 → 30 req/min
npm run data:github
```

- Backs off on 403/429 honoring `Retry-After` / `X-RateLimit-Reset`; sleeps ~2s between queries.
- Run manually/occasionally — never on every build/request.
- Categories are derived from each repo's name/description/topics (multi-category), not
  hardcoded — so the board's category filter actually partitions the external repos.
- **Does NOT scrape missing-persons registries** (PII). Those are hand-seeded link-out
  cards in `data/projects.seed.json` (`source: "initiative"`), gated on owner consent.

## `import-ideas.mjs` → `data/ideas.seed.json`
Imports the hackathon "ideas" tab (Capa / Idea / Problema / Stack / Responsable / Impacto /
Dificultad) from the team Google Sheet (public CSV export by gid).

```powershell
npm run data:ideas
```

- Cleans messy cells: collapses multi-line names, strips bidi/zero-width chars, pulls a
  single name out of bullet/phone/handle owner cells, lifts pasted demo/repo URLs into
  `demo_url`/`repo_url`, defaults unrated impact to `medium`.
- Skips ideas already hand-curated in `data/projects.seed.json` (no duplicate cards).

## `import-platforms.mjs` → `data/resources.seed.json`
Imports the **"Plataformas activas"** tab (verified relief platforms & resources) — the
source for the app's `/resources` directory. Fetches by sheet **name** via the gviz endpoint
(survives tab reordering — no gid to keep in sync).

```powershell
npm run data:platforms
```

- Maps the emoji-prefixed `Tipo` to a resource type (search / donation / official / …),
  splits the URL column into a real link vs. a phone/account `contact`, parses `Idioma`.
- Hand-curated extras that aren't in the sheet go in `data/resources.extra.json` (never
  overwritten by this importer, so manual adds survive a re-sync).
