import { loadBuilders } from "../data-files";
import type { Builder } from "../types";

export interface BuilderRepository {
  list(): Promise<Builder[]>;
}

// Builders come from the hackathon Google Sheet via scripts/import-builders.mjs
// → data/builders.json. Read-only in P0.
export const jsonBuilderRepository: BuilderRepository = {
  async list() {
    return loadBuilders();
  },
};
