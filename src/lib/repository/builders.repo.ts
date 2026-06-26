import { loadBuilders } from "../data-files";
import { readCustomBuilders, appendCustomBuilder } from "../builders/builders-store";
import { fetchRemoteBuilders } from "../sheet/builders-csv";
import { BuilderSchema } from "../schemas";
import { slugify } from "../slug";
import type { Builder, BuilderInput } from "../types";

export interface BuilderRepository {
  list(): Promise<Builder[]>;
  create(input: BuilderInput): Promise<Builder>;
}

// The imported roster: live sheet when asked (or by default on Vercel, where the
// gitignored builders.json isn't deployed), else the committed JSON. Self-adds are
// merged on top by list() — they live in a separate store so a re-import can't wipe them.
async function loadRoster(): Promise<Builder[]> {
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
}

// Imported roster + self-adds, deduped by id (roster wins). A self-add only shows
// if it isn't already on the sheet.
async function listBuilders(): Promise<Builder[]> {
  const [roster, custom] = await Promise.all([loadRoster(), readCustomBuilders()]);
  const ids = new Set(roster.map((b) => b.id));
  return [...roster, ...custom.filter((b) => !ids.has(b.id))];
}

// Builders come from the hackathon Google Sheet via scripts/import-builders.mjs
// → data/builders.json (or the live sheet), plus self-registrations from the "add
// yourself" form (Redis on Vercel / data/builders-custom.json locally).
export const jsonBuilderRepository: BuilderRepository = {
  async list() {
    return listBuilders();
  },

  async create(input) {
    const existing = await listBuilders();
    const taken = new Set(existing.map((b) => b.id));
    const base = slugify(input.alias) || "builder";
    let id = base;
    let n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;

    // Re-validate the assembled record (defense in depth — the action validated input).
    const builder = BuilderSchema.parse({ ...input, id });
    await appendCustomBuilder(builder);
    return builder;
  },
};
