import { redis } from "../redis/client";
import { readVotesFile, bumpVoteFile } from "./votes-json";

// Single seam for vote persistence. Uses Upstash Redis when configured (durable on
// Vercel's read-only FS); otherwise the local JSON file (dev / offline demo). The
// caller never knows which backend served the count, so the repository stays clean.
const voteKey = (slug: string) => `vote:${slug}`;

// Read counts for the given slugs. Redis MGET = one round trip (only the slugs the
// board already loaded); else the local JSON map. Falls back to JSON on any Redis miss.
export async function readVotes(slugs: string[]): Promise<Record<string, number>> {
  if (redis.enabled && slugs.length) {
    const counts = await redis.mget(slugs.map(voteKey));
    if (counts) {
      const out: Record<string, number> = {};
      slugs.forEach((slug, i) => {
        const n = Number(counts[i]);
        if (Number.isFinite(n) && n > 0) out[slug] = n;
      });
      return out;
    }
  }
  return readVotesFile();
}

// Increment one project's vote. Redis INCR is atomic (no read-modify-write race) and
// Vercel-safe; else the local JSON temp-then-rename. Returns the new count.
export async function bumpVote(slug: string): Promise<number> {
  if (redis.enabled) {
    const next = await redis.incr(voteKey(slug));
    if (next !== null) return next;
  }
  return bumpVoteFile(slug);
}
