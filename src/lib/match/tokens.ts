import { normalize } from "@/lib/text";

// Token matching for FREE-TEXT needs. Stack tags are folded whole-tag by stackKey
// (see builders/filter), but a contributor ask like "React dev" or a sponsor ask like
// "SMS gateway" is a phrase — so we compare at the word level: "React dev" ↔ a skill
// "react" overlaps on the token "react". normalize() strips accents + lowercases so
// EN/ES and diacritic variants land on the same token.

// "Next.js / React dev" → ["next", "js", "react", "dev"]. Drop 1-char noise.
export function tokenize(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

// Flatten several phrases (e.g. a builder's stack tags + role) into one unique token set.
export function uniqueTokens(parts: string[]): string[] {
  const set = new Set<string>();
  for (const p of parts) for (const t of tokenize(p)) set.add(t);
  return [...set];
}

// How many DISTINCT tokens of `a` also appear in `b`. 0 = no connection.
export function overlapCount(a: string[], b: string[]): number {
  const inB = new Set(b);
  const counted = new Set<string>();
  let n = 0;
  for (const t of a) {
    if (inB.has(t) && !counted.has(t)) {
      counted.add(t);
      n++;
    }
  }
  return n;
}
