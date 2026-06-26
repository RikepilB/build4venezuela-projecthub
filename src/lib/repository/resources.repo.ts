import { loadResources } from "../data-files";
import type { Resource } from "../types";

export interface ResourceRepository {
  list(): Promise<Resource[]>;
}

// JSON-backed verified-resources repository. Same seam as projects/builders — P1 swaps
// the impl (Supabase) behind this interface. Resources are read-only in the app.
export const jsonResourceRepository: ResourceRepository = {
  async list() {
    return loadResources();
  },
};
