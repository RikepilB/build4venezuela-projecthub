// Canonical buckets for the roster's free-text fields. The hackathon sheet collects
// availability and timezone as open text, so the same answer arrives a dozen ways
// ("Full-time hackathon", "Fulltime", "full time hackaton"; "GMT-5", "GMT5", "GTM-5",
// "COT (UTC-5)"). The builders filter does an exact match, so without folding these
// to a canonical label every typo becomes its own dropdown option that matches almost
// no one. Applied at the repository read seam (see builders.repo) so every source —
// live sheet, committed JSON, self-adds — is grouped the same way. Both functions are
// idempotent: a value that is already canonical passes through unchanged.

// Availability → "Full-time" | "Part-time" | "Flexible" | "" | (unrecognized, as-is).
// Order matters: a "Part-time (night)" must bucket as Part-time, not Flexible.
export function normalizeAvailability(raw: string): string {
  const s = raw.toLowerCase();
  if (!s.trim()) return "";
  if (/par-?t|parcial|medio/.test(s)) return "Part-time"; // "part", "par-time" (typo), ES
  if (/full|completo/.test(s)) return "Full-time";
  if (/flex|weekend|fin de semana|noche|night/.test(s)) return "Flexible";
  return raw.trim(); // keep an unknown answer as its own option rather than lose it
}

// Timezone → "UTC", "UTC-5", "UTC+2", … extracted from any GMT/UTC/GTM spelling. The
// roster is Latin-America-heavy, so a bare unsigned offset ("GMT5") is read as west of
// UTC (negative), matching the people who wrote "GMT-5".
export function normalizeTimezone(raw: string): string {
  if (!raw.trim()) return "";
  const m = raw.toUpperCase().match(/(?:UTC|GMT|GTM)\s*([+-])?\s*(\d{1,2})/);
  if (m) {
    const n = parseInt(m[2], 10);
    if (n === 0) return "UTC";
    return `UTC${m[1] === "+" ? "+" : "-"}${n}`;
  }
  return raw.trim(); // no recognizable offset → keep as typed
}
