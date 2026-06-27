import type { Builder, Project } from "@/lib/types";
import { stackKey } from "@/lib/builders/filter";
import { tokenize, uniqueTokens, overlapCount } from "./tokens";
import type { MatchProfile, ProjectMatch, BuilderMatch, OfferMatch, MatchReason } from "./types";

// ── Match scoring (P0: deterministic, pure, no I/O, no network, no secrets) ─────
// THE AI SWAP SEAM. P2 replaces the bodies below with pgvector / embedding similarity
// behind these exact signatures and the MatchReason contract (types.ts) — callers and
// UI don't change. Same idea as "drop in supabase.repo.ts" in projects.repo.ts.

// Mirrors the board's PRIORITY_WEIGHT (projects.repo.ts) so Match ranks the way the
// radar does — a real skill match on a high-priority project floats up.
const PRIORITY_WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };
// Canonical availability buckets from builders/normalize → recruitability weight.
const AVAILABILITY_WEIGHT: Record<string, number> = { "Full-time": 3, "Part-time": 2, Flexible: 1 };

const MAX_RESULTS = 12;
const SHORT_HANDED_TEAM = 2; // ≤2 people on it + open asks → your help moves the needle

function stackKeySet(tags: string[]): Set<string> {
  return new Set(tags.map(stackKey).filter(Boolean));
}

// The display tags of `tags` whose canonical key is in `other` — deduped by key, so
// "Next.js" and "Next js" surface once. Order follows `tags`.
function sharedStack(tags: string[], other: Set<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const k = stackKey(t);
    if (k && other.has(k) && !seen.has(k)) {
      seen.add(k);
      out.push(t);
    }
  }
  return out;
}

// BUILDER → PROJECTS · "Your fit". Candidates are projects actively recruiting
// contributors and not already shipped. A project only matches on a real SKILL link
// (stack overlap or a contributor-need token hit); priority/short-handed only re-rank
// matches, they never create one — so high-priority projects don't match everyone.
export function matchProjectsForBuilder(
  profile: MatchProfile,
  projects: Project[],
  teamCountBySlug: Map<string, number> = new Map(),
): ProjectMatch[] {
  const profileKeys = stackKeySet(profile.stack);
  const profileTokens = uniqueTokens(profile.stack);
  if (profileKeys.size === 0 && profileTokens.length === 0) return [];

  const matches: ProjectMatch[] = [];
  for (const p of projects) {
    if (p.status === "live") continue; // shipped — not recruiting builders
    if (p.needs.contributors.length === 0) continue; // not asking for contributors

    const reasons: MatchReason[] = [];
    let score = 0;

    // 1 · stack overlap (project.stack ∩ profile.stack) — strongest signal.
    const shared = sharedStack(p.stack, profileKeys);
    if (shared.length > 0) {
      score += shared.length * 3;
      reasons.push({ kind: "stack", tags: shared });
    }

    // 2 · contributor-need token match ("React dev" ↔ profile token "react").
    const matchedNeeds: string[] = [];
    for (const need of p.needs.contributors) {
      if (overlapCount(profileTokens, tokenize(need)) > 0) matchedNeeds.push(need);
    }
    if (matchedNeeds.length > 0) {
      score += matchedNeeds.length * 2;
      for (const need of matchedNeeds) reasons.push({ kind: "need", need });
    }

    if (score === 0) continue; // no skill connection → not a match

    // 3 · priority lifts a real match up the list.
    const pw = PRIORITY_WEIGHT[p.priority ?? ""] ?? 0;
    score += pw;
    if (p.priority === "high") reasons.push({ kind: "priority" });

    // 4 · short-handed: open asks + a small team → high leverage.
    if ((teamCountBySlug.get(p.slug) ?? 0) <= SHORT_HANDED_TEAM) {
      score += 1;
      reasons.push({ kind: "shortHanded", spots: p.needs.contributors.length });
    }

    matches.push({ project: p, score, reasons });
  }
  // Stable sort: score desc, ties keep the caller's order (already board-ranked).
  return matches.sort((a, b) => b.score - a.score).slice(0, MAX_RESULTS);
}

// PROJECT → BUILDERS · "Recruit". Roster builders whose stack/role answer this
// project's stack + open contributor asks. `score` is the SKILL score only; a full-timer
// is more recruitable, so availability is a pure secondary sort key — it re-ranks skill
// ties, it never out-ranks an extra shared skill.
export function matchBuildersForProject(project: Project, builders: Builder[]): BuilderMatch[] {
  const projectKeys = stackKeySet(project.stack);
  const needs = project.needs.contributors;
  const totalNeeds = needs.length;

  const matches: BuilderMatch[] = [];
  for (const b of builders) {
    const reasons: MatchReason[] = [];
    let score = 0;

    const shared = sharedStack(b.stack, projectKeys);
    if (shared.length > 0) {
      score += shared.length * 3;
      reasons.push({ kind: "stack", tags: shared });
    }

    const builderTokens = uniqueTokens([...b.stack, b.role]);
    let covered = 0;
    for (const need of needs) {
      if (overlapCount(builderTokens, tokenize(need)) > 0) {
        covered++;
        reasons.push({ kind: "need", need });
      }
    }
    if (covered > 0) score += covered * 2;

    if (score === 0) continue; // no skill connection → not a match

    if (totalNeeds > 0) reasons.push({ kind: "needsCovered", covered, total: totalNeeds });
    matches.push({ builder: b, score, reasons });
  }
  // Skill score first; availability (Full-time > Part-time > Flexible) breaks ties.
  return matches
    .sort(
      (a, b) =>
        b.score - a.score ||
        (AVAILABILITY_WEIGHT[b.builder.availability] ?? 0) - (AVAILABILITY_WEIGHT[a.builder.availability] ?? 0),
    )
    .slice(0, MAX_RESULTS);
}

// SPONSOR → PROJECTS · "Where your offer lands". Match a free-text offer ("SMS credits",
// "hosting") against projects' api_credits + sponsors asks. Rank by how many asks it
// answers, then priority, then community votes (the board's tiebreak shape).
export function matchProjectsForOffer(offer: string, projects: Project[]): OfferMatch[] {
  const offerTokens = tokenize(offer);
  if (offerTokens.length === 0) return [];

  const matches: OfferMatch[] = [];
  for (const p of projects) {
    if (p.status === "live") continue;
    const pool = [...p.needs.api_credits, ...p.needs.sponsors];
    if (pool.length === 0) continue;

    const matched: string[] = [];
    for (const need of pool) {
      if (overlapCount(offerTokens, tokenize(need)) > 0) matched.push(need);
    }
    if (matched.length === 0) continue;

    matches.push({ project: p, score: matched.length, matched });
  }
  return matches
    .sort(
      (a, b) =>
        b.matched.length - a.matched.length ||
        (PRIORITY_WEIGHT[b.project.priority ?? ""] ?? 0) - (PRIORITY_WEIGHT[a.project.priority ?? ""] ?? 0) ||
        (b.project.votes ?? 0) - (a.project.votes ?? 0),
    )
    .slice(0, MAX_RESULTS);
}
