import type { Builder } from "../types";

// Builders-page filter. availability and timezone arrive already canonicalized from
// the repository (see builders/normalize), so they match exactly; stack stays as the
// person typed it (it's shown on the card) and is compared/deduped by a canonical key
// instead — so "Next.js", "Next js" and "NEXTJS" are one option that matches all three.
export interface BuilderFilter {
  availability?: string;
  timezone?: string;
  stack?: string;
}

// Fold a stack tag to a match key: accent-strip, lowercase, drop every non-alphanumeric.
export function stackKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

// Collapse stack tags by canonical key; keep the first label (alphabetically) as the
// display option, so the choice shown is deterministic ("Next.js" over "Next js").
function dedupeStack(tags: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const t of [...tags].filter(Boolean).sort((a, b) => a.localeCompare(b))) {
    const k = stackKey(t);
    if (k && !byKey.has(k)) byKey.set(k, t);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

// The three dropdowns' options, derived from the (already-normalized) roster so the bar
// never offers a typo-variant that matches no one.
export function builderFilterOptions(builders: Builder[]): {
  availability: string[];
  timezone: string[];
  stack: string[];
} {
  return {
    availability: uniqueSorted(builders.map((b) => b.availability)),
    timezone: uniqueSorted(builders.map((b) => b.timezone)),
    stack: dedupeStack(builders.flatMap((b) => b.stack)),
  };
}

// Pure, order-preserving. Empty/absent fields don't constrain; stack matches by key.
export function applyBuilderFilter(builders: Builder[], f: BuilderFilter): Builder[] {
  const wantStack = f.stack ? stackKey(f.stack) : "";
  return builders.filter((b) => {
    if (f.availability && b.availability !== f.availability) return false;
    if (f.timezone && b.timezone !== f.timezone) return false;
    if (wantStack && !b.stack.some((s) => stackKey(s) === wantStack)) return false;
    return true;
  });
}
