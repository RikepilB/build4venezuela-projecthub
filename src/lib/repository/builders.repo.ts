import { loadBuilders, appendBuilder } from "../data-files";
import { fetchRemoteBuilders } from "../sheet/builders-csv";
import { BuilderSchema } from "../schemas";
import { slugify } from "../slug";
import type { Builder, BuilderInput } from "../types";

export interface BuilderRepository {
  list(): Promise<Builder[]>;
  create(input: BuilderInput): Promise<Builder>;
}

// Builders come from the hackathon Google Sheet via scripts/import-builders.mjs
// → data/builders.json, plus self-registrations from the "add yourself" form.
// With BUILDERS_SOURCE=remote the roster is fetched live (ISR-cached) so it stays
// in sync with the sheet; on any fetch failure we fall back to the committed JSON
// (offline-safe demo).
export const jsonBuilderRepository: BuilderRepository = {
  async list() {
    // Live-sync from the sheet when explicitly asked, OR by default on Vercel
    // (where the gitignored builders.json isn't deployed). Local dev uses the
    // committed JSON unless BUILDERS_SOURCE=remote. Set BUILDERS_SOURCE=local to
    // force the file even on Vercel.
    const wantRemote =
      process.env.BUILDERS_SOURCE === "remote" ||
      (!!process.env.VERCEL && process.env.BUILDERS_SOURCE !== "local");
    if (wantRemote) {
      try {
        const remote = await fetchRemoteBuilders();
        if (remote.length > 0) return remote;
      } catch (err) {
        console.error("[builders] remote sheet fetch failed, using local copy:", err);
      }
    }
    return loadBuilders();
  },

  async create(input) {
    const existing = await loadBuilders();
    const taken = new Set(existing.map((b) => b.id));
    const base = slugify(input.alias) || "builder";
    let id = base;
    let n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;

    // Re-validate the assembled record (defense in depth — the action validated input).
    const builder = BuilderSchema.parse({ ...input, id });
    await appendBuilder(builder);
    return builder;
  },
};
