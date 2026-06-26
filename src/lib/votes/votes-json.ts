import { promises as fs } from "node:fs";
import path from "node:path";

// Local JSON vote store (slug → count). The fallback when Upstash Redis isn't
// configured — works in dev; throws on a read-only FS (Vercel), which is exactly
// why the Redis path exists (see votes-store.ts). Temp-then-rename so a crash
// mid-write can't corrupt the file.
const VOTES_FILE = path.join(process.cwd(), "data", "votes.json");

export async function readVotesFile(): Promise<Record<string, number>> {
  try {
    const raw = await fs.readFile(VOTES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch (err) {
    // Missing file is normal before the first vote; anything else is logged.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") console.error("[votes] votes.json:", err);
    return {};
  }
}

export async function bumpVoteFile(slug: string): Promise<number> {
  const votes = await readVotesFile();
  const next = (votes[slug] ?? 0) + 1;
  const tmp = `${VOTES_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify({ ...votes, [slug]: next }, null, 2)}\n`, "utf8");
  await fs.rename(tmp, VOTES_FILE);
  return next;
}
