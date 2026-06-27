import { resourceRepository } from "@/lib/repository";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/resources — verified relief resources (link-out directory). Curated seed
// only; missing-persons / PII registries are never included here by design.
export async function GET() {
  try {
    const resources = await resourceRepository.list();
    return ok(resources, { meta: { count: resources.length } });
  } catch (err) {
    console.error("[api] GET /api/v1/resources failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
