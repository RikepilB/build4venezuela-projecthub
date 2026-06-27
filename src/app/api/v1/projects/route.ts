import { projectRepository } from "@/lib/repository";
import { projectFilterFromQuery } from "@/lib/api/query";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/projects — the ranked catalog (votes → priority → stars → lifecycle),
// with optional filters: ?category, ?stack, ?language, ?status, ?need, ?priority,
// ?complexity. Unknown enum values are dropped at the boundary (see api/query.ts).
export async function GET(req: Request) {
  try {
    const filter = projectFilterFromQuery(new URL(req.url).searchParams);
    const projects = await projectRepository.list(filter);
    return ok(projects, { meta: { count: projects.length } });
  } catch (err) {
    console.error("[api] GET /api/v1/projects failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
