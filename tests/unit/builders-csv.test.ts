import { describe, it, expect } from "vitest";
import { parseBuildersCsv } from "@/lib/sheet/builders-csv";

// A sheet export with a banner row above the header, fuzzy Spanish headers, a
// duplicate alias (id collision), a bare-domain LinkedIn (needs https://), and an
// empty-alias row (must be skipped).
const CSV = [
  "Hackathon Solidario — Roster",
  "Nombre/Alias,Rol principal,Stack-Skills,Perfil LinkedIn,Disponibilidad,Zona Horaria,Estado",
  "Ada,Frontend,React/Next.js,linkedin.com/in/ada,Full-time,GMT-4,Activo",
  "Ada,Backend,Node,https://linkedin.com/in/ada2,Part-time,GMT-5,Activo",
  ",NoAlias,Python,,,,",
].join("\n");

describe("parseBuildersCsv", () => {
  const out = parseBuildersCsv(CSV);

  it("detects the header beneath a banner row and skips empty-alias rows", () => {
    expect(out).toHaveLength(2); // the two Adas; empty-alias row dropped
    expect(out.map((b) => b.alias)).toEqual(["Ada", "Ada"]);
  });

  it("dedupes colliding ids with a -n suffix", () => {
    expect(out.map((b) => b.id)).toEqual(["ada", "ada-2"]);
  });

  it("splits the stack/skills cell on /,;| delimiters", () => {
    expect(out[0].stack).toEqual(["React", "Next.js"]);
  });

  it("upgrades a bare-domain LinkedIn to https:// and keeps an existing https one", () => {
    expect(out[0].linkedin_url).toBe("https://linkedin.com/in/ada");
    expect(out[1].linkedin_url).toBe("https://linkedin.com/in/ada2");
  });

  it("returns [] when there are no data rows", () => {
    expect(parseBuildersCsv("Nombre/Alias,Rol,Stack\n")).toEqual([]);
  });
});
