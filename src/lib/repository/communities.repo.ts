import { loadCommunities } from "../data-files";
import type { Community } from "../types";

export interface CommunityRepository {
  list(): Promise<Community[]>;
}

// JSON-backed communities repository. Same seam as projects/resources — P1 swaps the
// impl (Supabase) behind this interface. Communities are read-only in the app.
export const jsonCommunityRepository: CommunityRepository = {
  async list() {
    return loadCommunities();
  },
};
