import { sponsorRepository } from "@/lib/repository";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/sponsors — organizations backing the relief effort, shown in the landing
// marquee. Link-out directory; all entries are already-public org URLs.
export async function GET() {
  try {
    const sponsors = await sponsorRepository.list();
    return ok(sponsors, { meta: { count: sponsors.length } });
  } catch (err) {
    console.error("[api] GET /api/v1/sponsors failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
