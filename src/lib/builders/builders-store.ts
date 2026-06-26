import { redis } from "../redis/client";
import { loadCustomBuildersFile, appendCustomBuilderFile } from "../data-files";
import { BuilderSchema } from "../schemas";
import type { Builder } from "../types";

// Single seam for self-registered builders ("add yourself"). Kept SEPARATE from the
// imported roster (builders.json), which import-builders.mjs overwrites wholesale —
// so a re-import can't wipe a self-add. Upstash Redis list on Vercel; JSON file
// locally. Mirrors votes-store / memberships-store.
const KEY = "builders:custom";

function parseRows(rows: string[]): Builder[] {
  const out: Builder[] = [];
  for (const row of rows) {
    try {
      const parsed = BuilderSchema.safeParse(JSON.parse(row));
      if (parsed.success) out.push(parsed.data);
    } catch {
      // Skip a single corrupt element rather than blank the whole roster.
    }
  }
  return out;
}

export async function readCustomBuilders(): Promise<Builder[]> {
  if (redis.enabled) {
    const rows = await redis.lrange(KEY);
    if (rows) return parseRows(rows);
  }
  return loadCustomBuildersFile();
}

export async function appendCustomBuilder(builder: Builder): Promise<void> {
  if (redis.enabled) {
    const next = await redis.rpush(KEY, JSON.stringify(builder));
    if (next !== null) return;
  }
  await appendCustomBuilderFile(builder);
}
