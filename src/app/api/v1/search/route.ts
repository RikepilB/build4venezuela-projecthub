import { projectRepository } from "@/lib/repository";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/search?q= — the same fuzzy "already exists?" engine the UI uses
// (fuse.js). Returns SearchHit[] (project + score + strength). A missing or <2-char
// query yields an empty list, matching searchProjects().
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    const hits = await projectRepository.search(q);
    return ok(hits, { meta: { count: hits.length, query: q } });
  } catch (err) {
    console.error("[api] GET /api/v1/search failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
