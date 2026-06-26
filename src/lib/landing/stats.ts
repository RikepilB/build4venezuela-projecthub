import type { Project, Builder } from "../types";
import { isEcosystemProject } from "../ecosystem";

// Headline numbers for the landing page. Computed from the live repository reads so
// the page shows real counts, not fixtures. Ecosystem (live, no-repo) sites are
// counted separately from buildable board projects — they're a different call to action.
export interface LandingStats {
  projects: number; // buildable projects on the board (have/seek a repo)
  builders: number; // people in the roster ready to help
  live: number; // ecosystem sites you can use right now
  needs: number; // board projects with at least one open ask
}

function hasOpenNeed(p: Project): boolean {
  return (
    p.needs.contributors.length > 0 ||
    p.needs.api_credits.length > 0 ||
    p.needs.sponsors.length > 0
  );
}

export function landingStats(projects: Project[], builders: Builder[]): LandingStats {
  const board = projects.filter((p) => !isEcosystemProject(p));
  return {
    projects: board.length,
    builders: builders.length,
    live: projects.length - board.length,
    needs: board.filter(hasOpenNeed).length,
  };
}

// Top buildable projects for the landing strip. The input is already ranked by the
// repository (votes → priority → stars → lifecycle); we drop ecosystem sites (those
// live on /ecosystem) and keep the first n, preserving that order.
export function featuredProjects(projects: Project[], n = 3): Project[] {
  return projects.filter((p) => !isEcosystemProject(p)).slice(0, n);
}
