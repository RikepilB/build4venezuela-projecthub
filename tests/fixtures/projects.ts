import type { Project } from "@/lib/types";

// Factory for a valid Project — override only the fields a test cares about.
export function makeProject(o: Partial<Project> = {}): Project {
  return {
    id: "id",
    slug: "slug",
    name: "Name",
    summary: "A summary long enough to pass validation here.",
    stack: [],
    languages: ["es"],
    categories: ["coordination"],
    status: "wip",
    needs: { contributors: [], api_credits: [], sponsors: [] },
    owner: "owner",
    source: "internal",
    votes: 0,
    ...o,
  };
}
