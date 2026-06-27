import { projectRepository } from "@/lib/repository";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/projects/{slug} — one project by slug, with runtime state (votes,
// attached repo) already overlaid by the repository. 404 envelope when not found.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const project = await projectRepository.getBySlug(slug);
    if (!project) return fail("not_found", 404);
    return ok(project);
  } catch (err) {
    console.error("[api] GET /api/v1/projects/[slug] failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
