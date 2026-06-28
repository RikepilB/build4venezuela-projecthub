import { describe, it, expect } from "vitest";
import { normalizeAvailability, normalizeTimezone, normalizeBuilderStatus, normalizeSeniority } from "@/lib/builders/normalize";
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
    expect(normalizeTimezone("")).toBe("");
    expect(normalizeTimezone("Caracas")).toBe("Caracas");
    expect(normalizeTimezone("UTC-5")).toBe("UTC-5");
  });
});

describe("normalizeBuilderStatus", () => {
  it("folds confirmado/confirmed to one bucket", () => {
    expect(normalizeBuilderStatus("✅ Confirmado")).toBe("confirmed");
    expect(normalizeBuilderStatus("✅ Confirmed")).toBe("confirmed");
  });

  it("folds buscando/looking to one bucket", () => {
    expect(normalizeBuilderStatus("🔍 Buscando")).toBe("looking");
    expect(normalizeBuilderStatus("🔍 Looking for a team")).toBe("looking");
    expect(normalizeBuilderStatus("buscando")).toBe("looking");
  });

  it("empty stays empty", () => {
    expect(normalizeBuilderStatus("")).toBe("");
    expect(normalizeBuilderStatus("   ")).toBe("");
  });

  it("unknown values become empty", () => {
    expect(normalizeBuilderStatus("Something else")).toBe("");
  });
});

describe("normalizeSeniority", () => {
  it("detects senior", () => {
    expect(normalizeSeniority("FrontEnd Senior")).toBe("senior");
    expect(normalizeSeniority("Senior Backend Developer")).toBe("senior");
  });

  it("detects semi-senior", () => {
    expect(normalizeSeniority("Backend y IA Developer Semi Senior")).toBe("semi-senior");
    expect(normalizeSeniority("Developer Semi Senior")).toBe("semi-senior");
  });

  it("detects junior", () => {
    expect(normalizeSeniority("Junior Developer")).toBe("junior");
    expect(normalizeSeniority("Jr Developer")).toBe("junior");
    expect(normalizeSeniority("Trainee")).toBe("junior");
  });

  it("detects lead / architect", () => {
    expect(normalizeSeniority("Tech Lead")).toBe("lead");
    expect(normalizeSeniority("Software Architect")).toBe("lead");
  });

  it("empty returns empty", () => {
    expect(normalizeSeniority("")).toBe("");
    expect(normalizeSeniority("Developer")).toBe("");
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

  it("includes role, status, and seniority options", () => {
    const builders = [
      makeBuilder({ id: "a", role: "Fullstack", status: "confirmed", seniority: "senior" }),
      makeBuilder({ id: "b", role: "Backend", status: "looking", seniority: "junior" }),
    ];
    const opts = builderFilterOptions(builders);
    expect(opts.role).toEqual(["Backend", "Fullstack"]);
    expect(opts.status).toEqual(["confirmed", "looking"]);
    expect(opts.seniority).toEqual(["junior", "senior"]);
  });

  it("drops empty role/status/seniority from the options", () => {
    const builders = [
      makeBuilder({ id: "a", role: "Fullstack", status: "confirmed", seniority: "senior" }),
      makeBuilder({ id: "b", role: "", status: "", seniority: "" }),
    ];
    const opts = builderFilterOptions(builders);
    expect(opts.role).toEqual(["Fullstack"]);
    expect(opts.status).toEqual(["confirmed"]);
    expect(opts.seniority).toEqual(["senior"]);
  });
});

describe("applyBuilderFilter", () => {
  const ft = makeBuilder({ id: "ft", availability: "Full-time", timezone: "UTC-5", stack: ["Next.js"], role: "Fullstack", status: "confirmed", seniority: "senior" });
  const pt = makeBuilder({ id: "pt", availability: "Part-time", timezone: "UTC-4", stack: ["Python"], role: "Backend", status: "looking", seniority: "junior" });
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

  it("filters by role", () => {
    expect(applyBuilderFilter(all, { role: "Fullstack" }).map((b) => b.id)).toEqual(["ft"]);
    expect(applyBuilderFilter(all, { role: "Backend" }).map((b) => b.id)).toEqual(["pt"]);
  });

  it("filters by status", () => {
    expect(applyBuilderFilter(all, { status: "confirmed" }).map((b) => b.id)).toEqual(["ft"]);
    expect(applyBuilderFilter(all, { status: "looking" }).map((b) => b.id)).toEqual(["pt"]);
  });

  it("filters by seniority", () => {
    expect(applyBuilderFilter(all, { seniority: "senior" }).map((b) => b.id)).toEqual(["ft"]);
    expect(applyBuilderFilter(all, { seniority: "junior" }).map((b) => b.id)).toEqual(["pt"]);
  });

  it("ANDs combined filters", () => {
    expect(applyBuilderFilter(all, { availability: "Full-time", timezone: "UTC-4" })).toEqual([]);
    expect(applyBuilderFilter(all, { availability: "Full-time", timezone: "UTC-5" }).map((b) => b.id)).toEqual([
      "ft",
    ]);
  });
});
