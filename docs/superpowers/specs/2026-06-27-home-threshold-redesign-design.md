# Home "threshold" redesign — design

**Date:** 2026-06-27 · **Status:** Built & verified (tsc · eslint · next build · vitest 145/145)
· **Scope:** re-skin + re-compose of `src/app/[locale]/page.tsx` only. No new routes, no new
data, no plumbing changes.

## Goal

Elevate the live home (`/`, the most-shared URL) from understated-brutalist to a
distinctive, launch-worthy **"threshold"** landing — without leaving the locked El Umbral
brand or losing the page's job as the working tool's search-first entry point.

## Locked decisions (from brainstorming)

- **Elevate the existing `/`** — it stays the entry point; this replaces its visuals, not its
  routes/data/i18n wiring. No separate marketing page.
- **Hero:** atmospheric, **search stays prominent** (no longer autofocused, so the hero reads
  first). Headline + framed search + Match/Browse CTAs.
- **Tone:** **restrained-cinematic** — depth + one orchestrated load reveal. Gravitas + hope
  for the Venezuela crisis-relief context. Never flashy.
- **Hero metaphor:** **amber glow doorway** — a soft amber radial bleed (light through an
  unseen door) over grain + dusk, with a framed search box as the doorway. Pure CSS.
- **Brand:** dusk-violet OKLCH surfaces + one warm amber accent. **Tokens only — zero
  hardcoded color.** No pure black/white.

## Concept — "Cross the threshold"

The page is a descent from the unlit room into structured light. The hero is the dark
threshold lit by amber from the doorway; each section below is more resolved/structured; the
final CTA inverts the page to a full amber band — you've crossed into the light.

## Section plan (current → elevated)

| Section | Now | Elevated |
|---|---|---|
| **Hero** | flat search + 3 buttons, top of normal flow | full-bleed (~min-h 82vh), `threshold-glow` + `grain`, hairline frame, **framed search** ("doorway"), staggered reveal, quiet scroll cue |
| **Live stats** | flat 4-card grid | luminous band — amber numerals, hairline dividers, faint top edge-glow; still real counts |
| **What is El Umbral** | small muted ¶ | wide editorial breath — larger lead, generous negative space |
| **How it works** | 3 plain cards | threshold progression — 3 steps strung on a hairline with amber step markers |
| **Featured** | `ProjectCard` grid | unchanged cards (reuse), elevated section header only |
| **Crisis hubs / Builders / Ecosystem** | flat bordered cards | depth restyle — `surface-2` elevation, hairline, amber link accents |
| **Final CTA** | amber band | strengthen as the "into the light" payoff (kept amber; tighter type, clearer CTAs) |

## Hero detail (amber glow doorway)

```
full-bleed section, min-h ~82vh, dusk-950 base
 ├─ layer 0: .grain (neutral noise overlay, ~4% opacity)
 ├─ layer 1: .threshold-glow (amber radial bleed, upper / off-center)
 └─ content (centered column, max-w-3xl), each child .rise with staggered delay:
     1. eyebrow  → appName "EL UMBRAL"
     2. h1       → dict.home.title (font-display = Fraunces serif; text-4xl→6xl, text-balance,
                   tight leading; italic permitted on the "threshold" word for literary weight)
     3. p        → dict.home.subtitle (muted, mono)
     4. doorway  → bordered/glowing frame wrapping <SearchBox autoFocus={false}/>
     5. row      → Match (amber filled) · Browse (outline)   [same links as today]
     6. cue      → quiet "↓ enter" (new copy: home.scrollCue)
```

- **Full-bleed breakout:** `<main>` is `max-w-6xl px-4 py-8`, so the hero spans the viewport via
  a `bleed` utility (below) and pulls up `-mt-8` to cancel main's top padding and meet the
  header; **inner** hero content re-constrains to a centered `max-w-3xl` column with its own
  `px-4`. Requires `overflow-x: clip` on `<main>` (one class in `layout.tsx`) so the 100vw
  width never introduces a horizontal scrollbar.
- **Doorway frame:** a `rounded-token` container around `SearchBox`, `border-border` + an inset
  amber ring via `box-shadow: inset 0 0 0 1px var(--b4v-glow-strong), 0 0 40px -8px var(--b4v-glow)`
  (amber var only — tokens-clean); frames the input as the lit opening. `SearchBox` keeps its
  API; only `autoFocus` flips to `false`.
- **CTAs:** reuse the existing `/match` and `/board` links + dict copy verbatim (no new
  destinations). Drop the third (publish) CTA out of the hero → it already lives in the final
  CTA band, keeping the hero to two clear choices.

## New atmosphere infra (tokens-only)

**`src/styles/tokens.css`** — add semantic glow tokens (amber primitive at low alpha):
```css
--b4v-glow:        oklch(80% 0.13 78 / 0.14);
--b4v-glow-strong: oklch(80% 0.13 78 / 0.22);
```

**`src/app/globals.css`** — add tokenized utilities + one keyframe:
```css
@utility threshold-glow {            /* light through the doorway */
  background:
    radial-gradient(58% 48% at 70% 0%,  var(--b4v-glow-strong), transparent 70%),
    radial-gradient(85% 60% at 50% -8%, var(--b4v-glow),        transparent 75%);
}
@utility grain {                     /* neutral luminance noise — no color */
  background-image: url("data:image/svg+xml,...feTurbulence fractalNoise...");
  opacity: 0.045;
  mix-blend-mode: soft-light;
}
@keyframes umbral-rise { from { opacity: 0; transform: translateY(0.5rem) }
                          to   { opacity: 1; transform: none } }
@utility rise { animation: umbral-rise .6s cubic-bezier(.2,.7,.2,1) both }
@media (prefers-reduced-motion: reduce) {
  .rise { animation: none }          /* render final state, no movement */
}
@utility bleed {                     /* hero spans viewport, out of max-w-6xl */
  width: 100vw; margin-inline: calc(50% - 50vw);
}
```
- `layout.tsx`: add `overflow-x-clip` to `<main>` so `bleed`'s 100vw can't cause a horizontal
  scrollbar (one class; safe site-wide).
- Glow = amber var only. Grain = neutral noise (luminance, not a brand color) → tokens rule
  intact. Stagger via inline `style={{ animationDelay }}` on each hero child (static, no JS).

## Constraints / non-goals

- **Server component stays server**; `export const dynamic = "force-dynamic"` stays (live
  counts). Motion is **CSS-only** — no Motion lib, no new client component.
- **i18n parity:** only new key is `home.scrollCue` → add to `en.ts` **and** `es.ts`
  (en: "enter" / es: "cruzar el umbral", final copy TBD). All other copy reused as-is.
- **a11y:** search reachable + labeled (unchanged); logical focus order; reveal never traps
  focus; reduced-motion path verified; amber-ink-on-amber and ivory-on-dusk contrast checked.
- **Perf:** no images added; glow/grain are GPU-cheap CSS; inline SVG noise is tiny.
- **Non-goals:** no new sections of content, no copy rewrite, no route/data/schema change, no
  `ProjectCard` change, no touching the concurrent session's in-flight `.claude`/docs work.

## Files touched

- `src/app/[locale]/page.tsx` — recompose hero + restyle sections (bulk of the work).
- `src/styles/tokens.css` — 2 glow tokens.
- `src/app/globals.css` — `threshold-glow`, `grain`, `rise`, `bleed` utilities + keyframe.
- `src/app/[locale]/layout.tsx` — `overflow-x-clip` on `<main>` (one class, enables `bleed`).
- `src/lib/i18n/en.ts`, `src/lib/i18n/es.ts` — `home.scrollCue` (parity).

## Verification

- `tsc` clean · `eslint` clean · existing `tests/e2e` (home/nav) still green.
- Manual: light/dark unaffected (dark-only app); reduced-motion on → no animation, final state
  shown; mobile (sm) hero not cramped; search submits to `/[locale]/search?q=`; Lighthouse/
  perf not regressed (no CLS from the reveal — reserve space).
- Visual check against the brand: one accent only, no hardcoded color in the diff
  (`grep` the diff for hex/rgb/oklch literals in `.tsx` → must be none).
