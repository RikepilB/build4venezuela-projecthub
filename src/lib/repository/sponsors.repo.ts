import { loadSponsors } from "../data-files";
import type { Sponsor } from "../types";

export interface SponsorRepository {
  list(): Promise<Sponsor[]>;
}

// JSON-backed sponsors repository. Same seam as communities/reference — P1 swaps the
// impl (Supabase) behind this interface. Sponsors are read-only in the app.
export const jsonSponsorRepository: SponsorRepository = {
  async list() {
    return loadSponsors();
  },
};
