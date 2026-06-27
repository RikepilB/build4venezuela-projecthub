import { loadReferenceProjects } from "../data-files";
import type { ReferenceProject } from "../types";

export interface ReferenceRepository {
  list(): Promise<ReferenceProject[]>;
}

// JSON-backed reference-projects repository. Same seam as projects/resources — P1 swaps
// the impl (Supabase) behind this interface. Reference projects are read-only in the app.
export const jsonReferenceRepository: ReferenceRepository = {
  async list() {
    return loadReferenceProjects();
  },
};
