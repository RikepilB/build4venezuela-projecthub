import {
  projectRepository,
  builderRepository,
  resourceRepository,
  communityRepository,
  referenceRepository,
} from "@/lib/repository";
import { ok, fail, preflight, CACHE_NO_STORE } from "@/lib/api/response";

// GET /api/v1/stats — live aggregate counts for badges / dashboards. no-store: votes
// and rosters change at runtime, so always recompute from a fresh read.
export async function GET() {
  try {
    const [projects, builders, resources, communities, reference] = await Promise.all([
      projectRepository.list(),
      builderRepository.list(),
      resourceRepository.list(),
      communityRepository.list(),
      referenceRepository.list(),
    ]);

    const byStatus = projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});
    const totalVotes = projects.reduce((sum, p) => sum + (p.votes ?? 0), 0);
    const openNeeds = projects.filter(
      (p) =>
        p.needs.contributors.length + p.needs.api_credits.length + p.needs.sponsors.length > 0,
    ).length;

    return ok(
      {
        projects: projects.length,
        builders: builders.length,
        resources: resources.length,
        communities: communities.length,
        reference: reference.length,
        live: byStatus.live ?? 0,
        openNeeds,
        totalVotes,
        byStatus,
      },
      { cache: CACHE_NO_STORE },
    );
  } catch (err) {
    console.error("[api] GET /api/v1/stats failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
