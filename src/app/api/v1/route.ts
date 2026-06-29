import { ok, preflight } from "@/lib/api/response";

// GET /api/v1 — discovery index. Lists the public endpoints so a consumer can find the
// surface without reading the docs. Read-only, cacheable, open CORS.
export async function GET() {
  return ok({
    name: "ProjectHub public API",
    version: "v1",
    description: "Read-only public catalog for the Build4Venezuela relief project hub.",
    docs: "https://github.com/RikepilB/build4venezuela-projecthub/blob/main/docs/api.md",
    endpoints: {
      projects: "/api/v1/projects",
      project: "/api/v1/projects/{slug}",
      search: "/api/v1/search?q={query}",
      builders: "/api/v1/builders",
      resources: "/api/v1/resources",
      communities: "/api/v1/communities",
      reference: "/api/v1/reference",
      sponsors: "/api/v1/sponsors",
      taxonomy: "/api/v1/taxonomy",
      stats: "/api/v1/stats",
      votes: "/api/v1/votes",
    },
  });
}

export async function OPTIONS() {
  return preflight();
}
