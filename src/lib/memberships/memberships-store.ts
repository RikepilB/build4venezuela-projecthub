import { redis } from "../redis/client";
import { loadMemberships, appendMembership } from "../data-files";
import { MembershipSchema } from "../schemas";
import type { Membership } from "../types";

// Single seam for membership persistence ("who joined which project"). Uses an
// Upstash Redis list when configured (durable on Vercel's read-only FS); otherwise
// the local JSON file (dev / offline demo). Mirrors votes-store. Each list element
// is one JSON-encoded Membership; a corrupt element is skipped, never fatal.
const KEY = "memberships";

function parseRows(rows: string[]): Membership[] {
  const out: Membership[] = [];
  for (const row of rows) {
    try {
      const parsed = MembershipSchema.safeParse(JSON.parse(row));
      if (parsed.success) out.push(parsed.data);
    } catch {
      // Skip a single corrupt element rather than blank the whole team list.
    }
  }
  return out;
}

export async function readMembershipsStore(): Promise<Membership[]> {
  if (redis.enabled) {
    const rows = await redis.lrange(KEY);
    if (rows) return parseRows(rows);
  }
  return loadMemberships();
}

export async function appendMembershipStore(membership: Membership): Promise<void> {
  if (redis.enabled) {
    const next = await redis.rpush(KEY, JSON.stringify(membership));
    if (next !== null) return;
  }
  await appendMembership(membership);
}
