import { ImageResponse } from "next/og";

// Brand-level share card — Open Graph + Twitter, auto-wired by the file convention
// (Next adds both og:image and twitter:image with absolute URLs via metadataBase).
// Lives at the app root (outside [locale]) so it applies to every route, and has no
// dynamic params, so it's generated ONCE at build → zero per-request cost when shared.
//
// Colors are hex equivalents of the OKLCH design tokens in styles/tokens.css: Satori
// (the next/og engine) does not render oklch(), so the tokens can't be reused directly.
export const alt = "El Umbral · Build4Venezuela — Search before you build, then enter.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Prebuild one image per locale (the card itself is bilingual, so they're identical)
// — keeps the route static under the dynamic [locale] segment: no per-request render.
export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "es" }];
}

const BG = "#15131b"; // --umbral-dusk-950
const BG2 = "#1b1825"; // dusk, a touch lighter — diagonal depth
const IVORY = "#f3f0e8"; // --umbral-ivory
const AMBER = "#e9a64a"; // --umbral-amber-500 (the threshold light)
const MUTED = "#a8a4b2"; // --umbral-dusk-400
const BORDER = "#383540"; // --umbral-dusk-700

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${BG} 0%, ${BG2} 100%)`,
          padding: "72px 80px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* the threshold light — warm amber spilling through the doorway, left edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 16,
            height: "100%",
            background: `linear-gradient(180deg, ${AMBER} 0%, rgba(233,166,74,0.12) 100%)`,
          }}
        />

        <div style={{ display: "flex", color: AMBER, fontSize: 26, letterSpacing: 8, fontWeight: 600 }}>
          BUILD4VENEZUELA
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", color: IVORY, fontSize: 136, fontWeight: 700, lineHeight: 1 }}>
            El Umbral
          </div>
          <div style={{ display: "flex", color: MUTED, fontSize: 38, marginTop: 28 }}>
            Search before you build · Busca antes de construir
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: "flex", color: IVORY, fontSize: 28 }}>
            A search-first hub for Venezuela relief projects
          </div>
          <div style={{ display: "flex", color: AMBER, fontSize: 28, fontWeight: 600 }}>
            elumbralvzla.org
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
