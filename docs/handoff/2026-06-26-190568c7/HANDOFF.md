# Session — 2026-06-26 — 190568c7 (filter reliability + perf + landing-stats sync)

## Goal
"make sure the filters work perfectly, no mistakes" → then "test and optimize all the
app, timings, lazy load, redis; filter is still not working, fix" → then "make sure the
landing page stats are up to date and synchronized (saw 57 builders but landing said 49);
verify data is correct and, if dynamic, that it changes correctly."

## What was done (concrete one-liners)
- **Root-caused the intermittent board 500 / "filter not working":** the `.claude/settings.json`
  PostToolUse lint hook ran `cmd /c pnpm lint --silent 2>nul ...` unquoted; the outer POSIX
  hook shell (not cmd.exe) parsed `2>nul` and dropped a literal `nul` file in the repo root →
  Turbopack panicked reading the Windows reserved device name (`os error 1`) → `/[locale]/board`
  500'd at random. **Fix:** quoted the payload `cmd /c "...2>nul..."` so cmd.exe owns the redirect.
  Proved old form recreates `nul`, new form does not.
- **Perceived-freeze fix:** the filter bars were native `<form method="get">` → full-document
  reload that bypasses `loading.tsx`, so the page froze with no feedback during Turbopack's dev
  recompile. Replaced with a shared **client** `FilterForm` that auto-applies on dropdown change
  via the Next router (client RSC nav → instant skeleton, clean URLs, preserves other active
  filters), keeping the native form + Filters button as a no-JS pre-hydration fallback.
- **Verified the filters were never logically broken** end-to-end in prod: board
  category/status/need + combined (109→56→20) + bogus→empty; builders availability/stack; both
  EN+ES locales; auto-submit + filter-preservation + clean `?status=wip` URLs proven on /en.
- **Landing stats desync fixed:** `/[locale]` was statically prerendered (`● SSG`) so its builder
  count froze at build time while `/builders` (dynamic) showed live → 57 vs 49 on Vercel. Added
  `export const dynamic = "force-dynamic"` to the landing. Proved live sync: appended a builder →
  landing AND builders both 38→39 with no rebuild, then restored to 38.
- **Measured real timings (not guessed):** prod board 30–240ms, builders 48–102ms — the 2–4s was
  purely dev Turbopack compile, no prod perf bug. Redis layer reviewed (batched MGET, fails soft
  to JSON) — correct, nothing to fix. Builders already lazy-loads `AddBuilderForm`; no other
  worthwhile lazy candidate.
- **Gate checks:** `tsc` clean · `eslint` clean · `vitest` 84/84 · clean `next build` (rm -rf .next).

## Files changed
- `.claude/settings.json` — quoted the lint-hook `cmd /c` payload so `2>nul` is parsed by cmd.exe,
  stopping the repo-root `nul` file that crashed Turbopack.
- `.gitignore` — safety-net ignores for stray `/nul` and `/,` shell-redirect artifacts.
- `src/components/ui/FilterForm.tsx` — **new** shared client filter form (router auto-submit on
  change, preserves active filters, clean URLs, native no-JS fallback).
- `src/components/board/FilterBar.tsx` — now a thin Server Component computing the present-only
  option lists, delegating to `FilterForm` (heavy `projects` array stays server-side).
- `src/app/[locale]/builders/page.tsx` — uses shared `FilterForm` (dropped ~60 lines of inline form).
- `src/app/[locale]/page.tsx` — `export const dynamic = "force-dynamic"` so landing stats render
  live and stay in sync with the dynamic board/builders pages.
- `data/builders.json` — (gitignored) temporarily 38→39→38 during the live-sync proof; restored.

## Failed attempts
- Browser-automation noise (NOT product bugs): native-`<select>` keyboard via CDP is flaky (worked
  on /en, intermittently no-op on /es); React-19 `__reactFiber$`/`__reactProps$` detection was
  unreliable (reported 41 fibers then 0 for the same code); a synthetic `dispatchEvent('change')`
  did not trigger React 19's onChange on either locale; `getBoundingClientRect()` once returned
  0×0 for a visibly-rendered select. Ground truth came from real interaction + served HTML:
  auto-submit confirmed on /en (clean client-nav URLs), and /es confirmed via served HTML
  (`action="/es/board"` + `?status=wip`→56) since the component is byte-identical across locales.

## Next steps
- **Start a NEW Claude Code session** before more edits — the running session still has the OLD
  lint hook loaded, so `nul` can still reappear on edits until the fixed `settings.json` is reloaded.
- Not committed (user didn't ask). When ready: branch → PR for the 6 source/config files above.
- Optional: confirm the same filter UX on the deployed Vercel build (force-dynamic landing + client
  FilterForm) after deploy.

## Files in this folder
- `HANDOFF.md` — this file (curated digest)
- `transcript.md` — full `/export` of the session (raw archive; user must run `/export`)
