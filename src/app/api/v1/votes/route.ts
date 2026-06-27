import { projectRepository } from "@/lib/repository";
import { ok, fail, preflight, CACHE_NO_STORE } from "@/lib/api/response";
import { rateLimit, clientIp } from "@/lib/ratelimit/limiter";

// GET /api/v1/votes — the live { slug: count } map that powers the client vote overlay.
// no-store (counts change constantly), so this is the only un-cached, origin-hitting
// endpoint — hence the per-IP cap below. Counts come from the repository, which overlays
// the server-authoritative tallies, so the overlay can never introduce a double-count.
const LIMIT = 60; // requests per IP
const WINDOW = 60; // seconds

export async function GET(req: Request) {
  try {
    const rl = await rateLimit(`votes:${clientIp(req)}`, LIMIT, WINDOW);
    if (!rl.ok) {
      return fail("rate_limited", 429, { "Retry-After": String(rl.resetSeconds) });
    }

    const projects = await projectRepository.list();
    const votes = projects.reduce<Record<string, number>>((acc, p) => {
      acc[p.slug] = p.votes ?? 0;
      return acc;
    }, {});

    return ok(votes, {
      cache: CACHE_NO_STORE,
      meta: { count: Object.keys(votes).length },
      headers: { "X-RateLimit-Remaining": String(rl.remaining) },
    });
  } catch (err) {
    console.error("[api] GET /api/v1/votes failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
