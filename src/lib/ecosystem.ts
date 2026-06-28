import type { Project } from "./types";

// "Ecosystem" = an existing relief project you can VISIT and use right now — a live
// site/page with no open repo to contribute code to. These are kept off the hackathon
// board (which is for collaborate-on-code projects) and shown on their own page.
// A repo-less *idea* (no demo either) stays on the board as a buildable candidate.
export function isEcosystemProject(p: Project): boolean {
  return !p.repo_url && !!p.demo_url;
}

// "Launched" = a buildable project (it HAS a repo, so it stays on the board) that is
// already far enough along to use: it ships a live URL and is past the halfway build
// mark. These are *also* surfaced on /ecosystem so people can use them now — e.g.
// Mission VE (repo + demo, 70% built) appears on both the board and the ecosystem.
//
// Gating on `progress > 50` is deliberate: only human-curated entries set a progress,
// so the ~40 auto-imported external repos (no progress, many flagged status:"live")
// never flood the ecosystem page. `status` alone is NOT used here for that reason.
export function isLaunchedProject(p: Project): boolean {
  return !!p.demo_url && (p.progress ?? 0) > 50;
}

// "Shipped" = a tracked project that is finished and live: status "live" AND progress
// at 100%. These are the build4venezuela.com/projects entries we surface as done. Unlike
// the repo-less *initiatives* (status "live", no progress), shipped projects ARE shown on
// the board too (clearly badged), so builders see what's already complete — the whole
// "search before you build" point. Gating on progress===100 keeps the existing initiative
// sites (no progress) off the board, exactly as before.
export function isShippedLive(p: Project): boolean {
  return p.status === "live" && p.progress === 100;
}

// The /ecosystem display set: the repo-less relief sites PLUS the launched buildable
// projects, preserving the input's ranked order. A project may appear here and on the
// board simultaneously (that's the point — "show the launched ones in the ecosystem too").
export function ecosystemListing(projects: Project[]): Project[] {
  return projects.filter((p) => isEcosystemProject(p) || isLaunchedProject(p));
}

// The board display set: buildable projects (have/seek a repo) PLUS shipped/live ones.
// Repo-less *initiative* sites stay off the board (they live only on /ecosystem); a
// shipped project (progress 100) is the deliberate exception so "done" work is visible
// on the board. Centralized here so the board page and the landing "projects" stat agree.
export function boardListing(projects: Project[]): Project[] {
  return projects.filter((p) => !isEcosystemProject(p) || isShippedLive(p));
}

// Split a ranked project list into the two surfaces, preserving order. Note: this is a
// strict partition on isEcosystemProject only (board = the complement); the /ecosystem
// page itself uses ecosystemListing(), which is a superset. Kept for callers that need
// the mutually-exclusive split.
export function partitionProjects(projects: Project[]): {
  board: Project[];
  ecosystem: Project[];
} {
  const board: Project[] = [];
  const ecosystem: Project[] = [];
  for (const p of projects) (isEcosystemProject(p) ? ecosystem : board).push(p);
  return { board, ecosystem };
}
