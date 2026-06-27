import { z } from "zod";
import { Complexity, Locale, NeedType, Priority, ProjectStatus } from "../schemas";
import type { ProjectFilter } from "../types";

// Read a query param only when it is a valid member of the given Zod enum, else
// undefined. The URL is untrusted input: an unknown value is DROPPED, never cast —
// matters most for `need`, which indexes p.needs (a bogus ?need= would otherwise throw
// in applyFilter). Mirrors the board page's guard so the API and the UI filter identically.
function parseEnum<S extends z.ZodTypeAny>(schema: S, v: string | null): z.infer<S> | undefined {
  if (!v) return undefined;
  const r = schema.safeParse(v);
  return r.success ? r.data : undefined;
}

function freeText(params: URLSearchParams, key: string): string | undefined {
  const v = params.get(key);
  return v && v.trim() ? v.trim() : undefined;
}

// Build a ProjectFilter from request query params. `category` and `stack` are free
// taxonomy text (a non-matching value just yields no results — safe on garbage);
// the rest are validated against their Zod enums.
export function projectFilterFromQuery(params: URLSearchParams): ProjectFilter {
  return {
    category: freeText(params, "category"),
    stack: freeText(params, "stack"),
    language: parseEnum(Locale, params.get("language")),
    status: parseEnum(ProjectStatus, params.get("status")),
    need: parseEnum(NeedType, params.get("need")),
    priority: parseEnum(Priority, params.get("priority")),
    complexity: parseEnum(Complexity, params.get("complexity")),
  };
}
