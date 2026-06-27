import { categories, statuses, needTypes, complexities, priorities, stacks } from "@/lib/taxonomy";
import { ok, preflight } from "@/lib/api/response";

// GET /api/v1/taxonomy — the controlled vocabularies that power filters: the valid
// values for ?category, ?status, ?need, ?priority, ?complexity and the known ?stack list.
// Static seed, safe to cache like the catalog.
export async function GET() {
  return ok({ categories, statuses, needTypes, complexities, priorities, stacks });
}

export async function OPTIONS() {
  return preflight();
}
