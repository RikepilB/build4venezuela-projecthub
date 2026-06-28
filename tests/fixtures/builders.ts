import type { Builder } from "@/lib/types";

// Factory for a valid Builder — override only the fields a test cares about.
export function makeBuilder(o: Partial<Builder> = {}): Builder {
  return {
    id: "id",
    alias: "Alias",
    role: "",
    stack: [],
    availability: "",
    timezone: "",
    status: "",
    seniority: "",
    ...o,
  };
}
