import type { Builder, Project } from "@/lib/types";

// ── Match: connect supply (builders, sponsors) to demand (project needs) ────────
// The scoring layer (score.ts) is pure and deterministic in P0. These types are the
// stable contract a P2 semantic/AI matcher must keep — swap the scoring body, not the
// shapes. See the header note in score.ts (mirrors the supabase.repo swap in
// projects.repo.ts).

// What a visitor declares about themselves on /match (no auth, no persistence). All
// optional-ish: an empty profile yields no matches rather than throwing.
export interface MatchProfile {
  stack: string[];
  timezone?: string; // display/tiebreak only — projects carry no timezone
  availability?: string; // canonical bucket ("Full-time" | "Part-time" | "Flexible")
}

// A localized-at-the-edge reason: the lib emits structured facts, the UI renders the
// words (so no English leaks into scoring, and ES/EN stay in the dictionaries).
export type MatchReason =
  | { kind: "stack"; tags: string[] } // shared technologies (display labels)
  | { kind: "need"; need: string } // a contributor ask this skill answers
  | { kind: "priority" } // project is high impact / urgency
  | { kind: "shortHanded"; spots: number } // open asks + small team → you move the needle
  | { kind: "needsCovered"; covered: number; total: number }; // builder ↔ project: X/Y asks

export interface ProjectMatch {
  project: Project;
  score: number;
  reasons: MatchReason[];
}

export interface BuilderMatch {
  builder: Builder;
  score: number;
  reasons: MatchReason[];
}

export interface OfferMatch {
  project: Project;
  score: number; // = number of needs the offer matched
  matched: string[]; // the exact need strings the offer answers
}
