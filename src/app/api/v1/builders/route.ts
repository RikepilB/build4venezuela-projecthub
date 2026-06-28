import { builderRepository } from "@/lib/repository";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/builders — the public talent roster (imported sheet + self-adds, deduped).
// Builder records carry no private contact fields beyond an optional public LinkedIn URL.
export async function GET() {
  try {
    const builders = await builderRepository.list();
    return ok(builders, { meta: { count: builders.length } });
  } catch (err) {
    console.error("[api] GET /api/v1/builders failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
