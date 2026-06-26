import type { Project } from "./types";

// "Ecosystem" = an existing relief project you can VISIT and use right now — a live
// site/page with no open repo to contribute code to. These are kept off the hackathon
// board (which is for collaborate-on-code projects) and shown on their own page.
// A repo-less *idea* (no demo either) stays on the board as a buildable candidate.
export function isEcosystemProject(p: Project): boolean {
  return !p.repo_url && !!p.demo_url;
}

// Split a ranked project list into the two surfaces, preserving order.
export function partitionProjects(projects: Project[]): {
  board: Project[];
  ecosystem: Project[];
} {
  const board: Project[] = [];
  const ecosystem: Project[] = [];
  for (const p of projects) (isEcosystemProject(p) ? ecosystem : board).push(p);
  return { board, ecosystem };
}
