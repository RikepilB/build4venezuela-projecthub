import { referenceRepository } from "@/lib/repository";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/reference — curated open-source disaster-relief prior art (global), grouped
// by capability. Link-out directory of repos worth reusing before building from scratch.
export async function GET() {
  try {
    const reference = await referenceRepository.list();
    return ok(reference, { meta: { count: reference.length } });
  } catch (err) {
    console.error("[api] GET /api/v1/reference failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
