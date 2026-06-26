import { describe, it, expect } from "vitest";
import { normalizeAvailability, normalizeTimezone } from "@/lib/builders/normalize";
import { stackKey, builderFilterOptions, applyBuilderFilter } from "@/lib/builders/filter";
import { makeBuilder } from "../fixtures/builders";

describe("normalizeAvailability", () => {
  it("folds every full-time spelling to one bucket", () => {
    for (const v of ["Full-time hackathon", "Full-time hackathon (weekend)", "full time hackaton", "Fulltime"]) {
      expect(normalizeAvailability(v)).toBe("Full-time");
    }
  });

  it("folds every part-time spelling (incl. the 'Par-time' typo) to one bucket", () => {
    for (const v of ["Part-time", "Part-Time", "Part time", "Part- time", "Part-time (night)", "Par-time (night)"]) {
      expect(normalizeAvailability(v)).toBe("Part-time");
    }
  });

  it("empty stays empty; an unknown answer is kept as typed", () => {
    expect(normalizeAvailability("")).toBe("");
    expect(normalizeAvailability("   ")).toBe("");
    expect(normalizeAvailability("Mornings only")).toBe("Mornings only");
  });

  it("is idempotent", () => {
    expect(normalizeAvailability("Full-time")).toBe("Full-time");
    expect(normalizeAvailability("Part-time")).toBe("Part-time");
  });
});

describe("normalizeTimezone", () => {
  it("collapses the four UTC-5 spellings", () => {
    for (const v of ["GMT-5", "GMT5", "GTM-5", "COT (UTC-5)"]) {
      expect(normalizeTimezone(v)).toBe("UTC-5");
    }
  });

  it("collapses the UTC-6 spellings and keeps the explicit + sign", () => {
    for (const v of ["GMT-6", "UTC -6", "GMT6"]) expect(normalizeTimezone(v)).toBe("UTC-6");
    expect(normalizeTimezone("CEST (UTC+2)")).toBe("UTC+2");
    expect(normalizeTimezone("ART/BRT (UTC-3)")).toBe("UTC-3");
  });

  it("empty stays empty; an unrecognized zone is kept as typed; is idempotent", () => {
    expect(normalizeTimezone("")).toBe("");
    expect(normalizeTimezone("Caracas")).toBe("Caracas");
    expect(normalizeTimezone("UTC-5")).toBe("UTC-5");
  });
});

describe("stackKey", () => {
  it("collapses case, spacing and punctuation variants", () => {
    expect(stackKey("Next.js")).toBe(stackKey("Next js"));
    expect(stackKey("SQL")).toBe(stackKey("Sql"));
    expect(stackKey("Sql")).toBe(stackKey("sql"));
    expect(stackKey("FastAPI")).toBe(stackKey("FastApi"));
  });

  it("keeps genuinely different tags apart", () => {
    expect(stackKey("React")).not.toBe(stackKey("Python"));
  });
});

describe("builderFilterOptions", () => {
  it("dedupes stack tags by canonical key, one display label each", () => {
    const builders = [
      makeBuilder({ id: "a", stack: ["Next.js", "SQL"] }),
      makeBuilder({ id: "b", stack: ["Next js", "sql", "React"] }),
    ];
    const opts = builderFilterOptions(builders);
    // Three distinct technologies, not five.
    expect(opts.stack).toHaveLength(3);
    expect(opts.stack.filter((s) => stackKey(s) === stackKey("Next.js"))).toHaveLength(1);
  });

  it("drops empty availability/timezone from the options", () => {
    const builders = [
      makeBuilder({ id: "a", availability: "Full-time", timezone: "UTC-5" }),
      makeBuilder({ id: "b", availability: "", timezone: "" }),
    ];
    const opts = builderFilterOptions(builders);
    expect(opts.availability).toEqual(["Full-time"]);
    expect(opts.timezone).toEqual(["UTC-5"]);
  });
});

describe("applyBuilderFilter", () => {
  const ft = makeBuilder({ id: "ft", availability: "Full-time", timezone: "UTC-5", stack: ["Next.js"] });
  const pt = makeBuilder({ id: "pt", availability: "Part-time", timezone: "UTC-4", stack: ["Python"] });
  const all = [ft, pt];

  it("returns everyone with no filter", () => {
    expect(applyBuilderFilter(all, {}).map((b) => b.id)).toEqual(["ft", "pt"]);
  });

  it("filters by each dimension", () => {
    expect(applyBuilderFilter(all, { availability: "Part-time" }).map((b) => b.id)).toEqual(["pt"]);
    expect(applyBuilderFilter(all, { timezone: "UTC-5" }).map((b) => b.id)).toEqual(["ft"]);
  });

  it("matches stack across case/punctuation variants", () => {
    // The dropdown might offer "Next js"; the builder typed "Next.js" — still a match.
    expect(applyBuilderFilter(all, { stack: "Next js" }).map((b) => b.id)).toEqual(["ft"]);
  });

  it("ANDs combined filters", () => {
    expect(applyBuilderFilter(all, { availability: "Full-time", timezone: "UTC-4" })).toEqual([]);
    expect(applyBuilderFilter(all, { availability: "Full-time", timezone: "UTC-5" }).map((b) => b.id)).toEqual([
      "ft",
    ]);
  });
});
