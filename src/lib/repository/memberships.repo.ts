import { loadMemberships, appendMembership } from "../data-files";
import { MembershipSchema } from "../schemas";
import type { Membership, MembershipInput } from "../types";

export interface MembershipRepository {
  list(): Promise<Membership[]>;
  forProject(slug: string): Promise<Membership[]>;
  join(input: MembershipInput): Promise<Membership>;
}

// Who's building what. Names are runtime PII → data/memberships.json (gitignored,
// like builders.json). Same JSON seam as the rest; P1 swaps this for Supabase.
export const jsonMembershipRepository: MembershipRepository = {
  async list() {
    return loadMemberships();
  },

  async forProject(slug) {
    const all = await loadMemberships();
    return all.filter((m) => m.project_slug === slug);
  },

  async join(input) {
    const existing = await loadMemberships();
    // Idempotent: the same name on the same project returns the existing row
    // instead of creating a duplicate (no auth means no other identity key).
    const dupe = existing.find(
      (m) =>
        m.project_slug === input.project_slug &&
        m.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
    );
    if (dupe) return dupe;

    const membership = MembershipSchema.parse({ ...input, created_at: new Date().toISOString() });
    await appendMembership(membership);
    return membership;
  },
};
