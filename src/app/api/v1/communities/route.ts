import { communityRepository } from "@/lib/repository";
import { ok, fail, preflight } from "@/lib/api/response";

// GET /api/v1/communities — curated public coordination spaces (Discord / WhatsApp /
// Telegram / web). Link-out directory; all entries are already-public invite URLs.
export async function GET() {
  try {
    const communities = await communityRepository.list();
    return ok(communities, { meta: { count: communities.length } });
  } catch (err) {
    console.error("[api] GET /api/v1/communities failed:", err);
    return fail("internal_error", 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
