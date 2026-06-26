import { describe, it, expect } from "vitest";
import { clampPercent } from "@/lib/progress";

describe("clampPercent", () => {
  it("passes through in-range values", () => {
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(50)).toBe(50);
    expect(clampPercent(100)).toBe(100);
  });

  it("clamps values outside 0–100", () => {
    expect(clampPercent(-20)).toBe(0);
    expect(clampPercent(250)).toBe(100);
  });

  it("rounds to the nearest integer", () => {
    expect(clampPercent(33.4)).toBe(33);
    expect(clampPercent(66.6)).toBe(67);
  });
});
