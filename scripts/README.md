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
- **Does NOT scrape missing-persons registries** (PII). Those are hand-seeded link-out
  cards in `data/projects.seed.json` (`source: "initiative"`), gated on owner consent.
